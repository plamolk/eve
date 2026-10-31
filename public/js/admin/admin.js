// โครงหน้าแอดมิน: ข้อความ, เข้าสู่ระบบ, แท็บ, state และ CSV (มุมมองแต่ละแท็บอยู่ใน overview.js ฯลฯ)
// ไฟล์นี้ไม่แตะ DOM ตอนโหลด — admin.html เรียก App.admin.boot()
window.App = window.App || {};
App.data = App.data || {};

App.data.admin = {
  title: 'สรุปผล',
  tabs: { overview: 'ภาพรวม', questions: 'คำถามทั้งหมด', comments: 'ความคิดเห็น', people: 'รายคน' },
  heatTitle: 'Heatmap จุดปัญหาบนผัง (ตัวเลข = จำนวนผู้ระบุ, สีเข้ม = คะแนนเฉลี่ยสูง)',
  bodyTitle: 'ตำแหน่งอาการปวดเมื่อย (จำนวนคน)',
  rankTitle: 'อันดับสิ่งที่อยากให้แก้ก่อน (คะแนนรวม)',
  dailyTitle: 'จำนวนคำตอบรายวัน',
  staffTab: 'เจ้าหน้าที่',
  donorTab: 'ผู้บริจาค',
  statTotal: 'คำตอบทั้งหมด',
  statToday: 'วันนี้',
  statSrc1: 'เข้าทางสำรอง',
  empty: 'ยังไม่มีข้อมูล',
  more: 'มีข้อมูลใหม่อีก กดอัปเดต',
  loading: 'กำลังรวมข้อมูล… {n}',
  refresh: 'อัปเดต',
  csv: 'ดาวน์โหลด CSV',
  logout: 'ออกจากระบบ',
  login: 'เข้าสู่ระบบ',
  password: 'รหัสผ่าน',
  wrong: 'รหัสผ่านไม่ถูกต้อง',
  rate: 'ลองหลายครั้งเกินไป รอ 1 นาทีแล้วลองใหม่',
  error: 'โหลดข้อมูลไม่สำเร็จ ลองกดอัปเดตอีกครั้ง',
  quotaTitle: 'โควตาวันนี้',
  quotaNote: 'นับเฉพาะคำขอของระบบนี้ ดูยอดจริงในแดชบอร์ด Cloudflare',
  quotaWrite: 'แถวที่เขียน',
  quotaRead: 'แถวที่อ่าน',
  updated: 'อัปเดตล่าสุด',
  count: 'คำตอบ',
  mean: 'ค่าเฉลี่ย',
  median: 'มัธยฐาน',
  min: 'ต่ำสุด',
  max: 'สูงสุด',
  rank1: 'อันดับ 1 (คน)',
  multiNote: 'เลือกได้หลายข้อ ผลรวมเกิน 100% ได้',
  answeredOf: 'ตอบ {n} จาก {m} คน',
  commentsN: '{n} ความคิดเห็น',
  noMsdN: 'ไม่มีอาการ {n} คน',
  noMapN: 'ไม่พบปัญหา {n} คน',
  mapNotes: 'หมายเหตุจุดบนผัง',
  search: 'ค้นหา',
  clear: 'ล้าง',
  loadMore: 'โหลดเพิ่ม',
  noComments: 'ไม่พบความคิดเห็น',
  seePerson: 'ดูคำตอบทั้งหมดของคนนี้',
  direct: 'ตรง',
  fallback: 'ทางสำรอง',
  all: 'ทั้งหมด',
  newer: 'ใหม่กว่า',
  older: 'เก่ากว่า',
  back: 'กลับไปรายการ',
  view: 'ดู',
  blank: '—',
  wip: 'กำลังพัฒนา'
};

(function () {
  const t = App.data.admin;
  const ui = App.ui;
  const api = App.adminApi;
  const V = App.adminViews;
  const TABS = ['overview', 'questions', 'comments', 'people'];

  function bangkok(sec) {
    return new Date(sec * 1000).toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' });
  }

  // ---------- CSV ----------
  function cell(v) {
    if (v === undefined || v === null) return '';
    let s = Array.isArray(v) ? v.join(' | ') : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // กัน Excel ตีความเป็นสูตร
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCSV(rows) {
    const cols = [];
    const seen = {};
    function add(c) { if (!seen[c]) { seen[c] = true; cols.push(c); } }
    rows.forEach(function (r) {
      Object.keys(r.data.answers || {}).forEach(function (k) { add('answers.' + k); });
    });
    rows.forEach(function (r) {
      Object.keys(r.data.msd || {}).forEach(function (k) { ['y', 'w', 's'].forEach(function (f) { add('msd.' + k + '.' + f); }); });
    });
    rows.forEach(function (r) {
      Object.keys(r.data.map || {}).forEach(function (k) { ['t', 'p', 'sev', 'n'].forEach(function (f) { add('map.' + k + '.' + f); }); });
    });
    function pick(d, col) {
      const parts = col.split('.');
      let v = d;
      for (const p of parts) v = v == null ? undefined : v[p];
      return v;
    }
    const header = ['id', 'created', 'role', 'src', 'cid'].concat(cols, ['json']);
    const lines = [header.map(cell).join(',')].concat(rows.map(function (r) {
      return [r.id, bangkok(r.created), r.role, r.src, r.cid]
        .concat(cols.map(function (c) { return pick(r.data, c); }), [JSON.stringify(r.data)])
        .map(cell).join(',');
    }));
    return '﻿' + lines.join('\r\n') + '\r\n';
  }

  // ---------- DOM ----------
  let root;
  const state = {
    summary: null,
    tab: 'overview',
    heatTab: 'staff',
    qRole: 'staff',
    comments: { key: null, q: '', items: [], next: null, loading: false, error: false },
    people: { role: '', rows: null, next: null, stack: [], detail: undefined }
  };

  function loginView(message) {
    return ui.pageTitle(t.title) + ui.card(
      '<form id="login" class="space-y-3">' +
      '<label class="block text-[15px] font-semibold" for="pw">' + ui.esc(t.password) + '</label>' +
      '<input id="pw" type="password" autocomplete="current-password" class="h-11 w-full rounded-lg border border-line bg-cream px-3 text-[15px] outline-none focus:border-blood/50 focus:bg-white">' +
      (message ? '<p class="text-[13px] font-medium text-blood" role="alert">' + ui.esc(message) + '</p>' : '') +
      '<button type="submit" class="rounded-lg bg-blood px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-blood-dark">' + ui.esc(t.login) + '</button>' +
      '</form>');
  }

  function show(html) { root.innerHTML = html; }

  function fill(s, vars) {
    return s.replace(/\{(\w+)\}/g, function (_, k) { return vars[k]; });
  }

  function tabBar() {
    return '<div class="mb-4 flex flex-wrap gap-2" role="group">' + TABS.map(function (k) {
      return ui.pill(ui.esc(t.tabs[k]), state.tab === k, { action: 'tab', value: k });
    }).join('') + '</div>';
  }

  function toolbar() {
    return '<div class="mb-4 flex flex-wrap gap-2">' +
      ui.primaryButton(t.refresh, { action: 'refresh' }) +
      ui.secondaryButton(t.csv, { action: 'csv' }) +
      ui.secondaryButton(t.logout, { action: 'logout' }) +
      '</div>';
  }

  function placeholder(key) {
    return '<h2 class="mb-3 text-[17px] font-bold">' + ui.esc(t.tabs[key]) + '</h2><p class="text-[13px] text-muted">' + ui.esc(t.wip) + '</p>';
  }

  function tabView() {
    if (state.tab === 'overview') return V.overview(state.summary, state.heatTab);
    return placeholder(state.tab);
  }

  function render() {
    show(ui.pageTitle(t.title) + toolbar() + '<p id="status" class="mb-3 text-[13px] text-muted" role="status"></p>' + tabBar() + '<div id="view">' + tabView() + '</div>');
  }

  function status(text) {
    const el = document.getElementById('status');
    if (el) el.textContent = text;
    else show('<p class="text-[13px] text-muted" role="status">' + ui.esc(text) + '</p>');
  }

  function failed(e) {
    if (e && e.auth) { state.summary = null; show(loginView()); return; }
    show(loginView(t.error));
  }

  async function refresh() {
    try {
      state.summary = await api.summaryAll(function (n) { status(fill(t.loading, { n: n })); });
      render();
    } catch (e) {
      failed(e);
    }
  }

  async function downloadCSV() {
    try {
      let rows = [];
      let after = 0;
      for (let i = 0; i < 1000; i++) {
        const page = await api.call('GET', '/api/admin/responses?after=' + after + '&limit=200');
        rows = rows.concat(page.rows);
        if (page.next === null) break;
        after = page.next;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8' }));
      a.download = 'survey-' + new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }).replace(/-/g, '') + '.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      failed(e);
    }
  }

  async function login(password) {
    const r = await fetch('/api/admin/login', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: password })
    });
    await r.text();
    if (r.status === 204) return refresh();
    show(loginView(r.status === 429 ? t.rate : t.wrong));
  }

  function onClick(el) {
    const a = el.dataset.action;
    if (a === 'tab') { state.tab = el.dataset.value; render(); }
    if (a === 'heattab') { state.heatTab = el.dataset.value; render(); }
    if (a === 'refresh') refresh();
    if (a === 'csv') downloadCSV();
    if (a === 'logout') api.call('POST', '/api/admin/logout').catch(function () {}).then(function () { state.summary = null; show(loginView()); });
  }

  function boot() {
    root = document.getElementById('app');
    root.addEventListener('submit', function (ev) {
      if (ev.target.id !== 'login') return;
      ev.preventDefault();
      login(document.getElementById('pw').value);
    });
    root.addEventListener('click', function (ev) {
      const el = ev.target.closest('[data-action]');
      if (el) onClick(el);
    });
    refresh();
  }

  App.admin = { toCSV: toCSV, boot: boot };
})();
