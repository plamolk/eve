/**
 * ทางสำรองของแบบสอบถาม: รับคำตอบเมื่อ Worker/D1 ใช้ไม่ได้ เก็บในแท็บ "pending"
 * แล้วซิงก์กลับ D1 ทุกชั่วโมงผ่าน POST /api/import
 * วิธีติดตั้ง: tools/apps-script/README.md
 *
 * คอลัมน์ของแท็บ pending: received | cid | role | data | via | synced
 */

var MAX_DATA_CHARS = 13824;
var SYNC_BATCH = 40;
var UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
var SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function deps_() {
  var store = PropertiesService.getScriptProperties();
  return {
    props: store.getProperties(),
    setProp: function (k, v) { store.setProperty(k, v); },
    sheet: SpreadsheetApp.getActiveSpreadsheet().getSheetByName('pending'),
    now: new Date(),
    today: function (d) { return Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd'); },
    mail: function (subject, body) { MailApp.sendEmail(Session.getEffectiveUser().getEmail(), subject, body); },
    lock: LockService.getScriptLock(),
    fetch: function (url, opts) { return UrlFetchApp.fetch(url, opts); }
  };
}

// รับคำตอบ (Apps Script อ่าน header ไม่ได้ จึงส่ง token มาใน body)
function doPost(e) {
  var result;
  try {
    result = handle_(JSON.parse(e.postData.contents), deps_());
  } catch (err) {
    result = { ok: false, error: 'invalid' };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function authorized_(p, d) {
  if (p.auth === 'worker') return !!d.props.SHEETS_TOKEN && p.key === d.props.SHEETS_TOKEN;
  if (p.auth !== 'turnstile' || typeof p.token !== 'string') return false;
  var res = d.fetch(SITEVERIFY, {
    method: 'post',
    payload: { secret: d.props.TURNSTILE_SECRET, response: p.token },
    muteHttpExceptions: true
  });
  var j = JSON.parse(res.getContentText());
  return j.success === true && j.action === 'submit' && j.hostname === d.props.ALLOWED_HOSTNAME;
}

function handle_(p, d) {
  if (!p || typeof p !== 'object') return { ok: false, error: 'invalid' };
  if (!authorized_(p, d)) return { ok: false, error: 'auth' };
  var data = p.data;
  if (!data || (data.role !== 'staff' && data.role !== 'donor')) return { ok: false, error: 'invalid' };
  if (typeof p.cid !== 'string' || !UUID_V4.test(p.cid)) return { ok: false, error: 'invalid' };
  var json = JSON.stringify(data);
  if (json.length > MAX_DATA_CHARS) return { ok: false, error: 'invalid' };

  d.lock.waitLock(10000);
  try {
    var last = d.sheet.getLastRow();
    var cids = last > 1 ? d.sheet.getRange(2, 2, last - 1, 1).getValues() : [];
    for (var i = 0; i < cids.length; i++) {
      if (cids[i][0] === p.cid) return { ok: true }; // ส่งซ้ำ: มีอยู่แล้ว
    }
    d.sheet.appendRow([d.now.toISOString(), p.cid, data.role, json, p.auth === 'worker' ? 'worker' : 'browser', '']);
  } finally {
    d.lock.releaseLock();
  }

  var today = d.today(d.now);
  if (d.props.LAST_ALERT_DAY !== today) {
    d.mail('แบบสอบถาม: มีคำตอบเข้าทางสำรอง',
      'มีคำตอบถูกเก็บใน Google Sheet (แท็บ pending) เพราะระบบหลักใกล้เต็มโควตาหรือใช้งานไม่ได้\n' +
      'คำตอบจะถูกซิงก์กลับฐานข้อมูลเองทุกชั่วโมง ตรวจโควตาในแดชบอร์ด Cloudflare ตาม docs/operations.md');
    d.setProp('LAST_ALERT_DAY', today);
    d.props.LAST_ALERT_DAY = today;
  }
  return { ok: true };
}

// ตั้ง trigger แบบ time-driven ทุกชั่วโมงให้ฟังก์ชันนี้
function syncToWorker() {
  return syncBatch_(deps_());
}

function syncBatch_(d) {
  var last = d.sheet.getLastRow();
  if (last < 2) return { sent: 0, accepted: 0 };
  var values = d.sheet.getRange(2, 1, last - 1, 6).getValues();
  var pending = [];
  for (var i = 0; i < values.length && pending.length < SYNC_BATCH; i++) {
    if (values[i][5] === '') pending.push({ row: i + 2, received: values[i][0], cid: values[i][1], data: values[i][3] });
  }
  if (!pending.length) return { sent: 0, accepted: 0 };

  var items = [];
  var sending = [];
  pending.forEach(function (p) {
    var data;
    try {
      data = JSON.parse(p.data);
    } catch (err) {
      d.sheet.getRange(p.row, 6).setValue('rejected:parse'); // ข้ามแถวที่อ่านไม่ได้ ไม่ให้ค้างทุกรอบ
      return;
    }
    items.push({ cid: p.cid, data: data, received: Math.floor(new Date(p.received).getTime() / 1000) });
    sending.push(p);
  });
  if (!items.length) return { sent: 0, accepted: 0 };
  var res = d.fetch(d.props.WORKER_URL + '/api/import', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + d.props.IMPORT_TOKEN },
    payload: JSON.stringify({ items: items }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return { sent: items.length, accepted: 0 }; // ลองใหม่ชั่วโมงหน้า

  var body = JSON.parse(res.getContentText());
  var accepted = body.accepted || [];
  var rejected = {};
  (body.rejected || []).forEach(function (r) { rejected[r.cid] = r.field; });
  var stamp = d.now.toISOString();
  var marked = 0;
  sending.forEach(function (p) {
    if (accepted.indexOf(p.cid) >= 0) {
      d.sheet.getRange(p.row, 6).setValue(stamp);
      marked++;
    } else if (Object.prototype.hasOwnProperty.call(rejected, p.cid)) {
      // server ไม่รับ: ทำเครื่องหมายไว้ ไม่ส่งซ้ำ (ยังอยู่ใน Sheet ให้ตรวจเอง)
      d.sheet.getRange(p.row, 6).setValue('rejected:' + rejected[p.cid]);
    }
  });
  return { sent: items.length, accepted: marked };
}
