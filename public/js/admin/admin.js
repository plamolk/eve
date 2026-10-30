// หน้าสรุปผลจากข้อมูลจริง (อ่านผลสรุปจาก cache ผ่าน /api/admin/*)
// ไฟล์นี้ไม่แตะ DOM ตอนโหลด — admin.html เรียก App.admin.boot()
window.App = window.App || {};
App.data = App.data || {};

App.data.admin = {
  title: 'สรุปผล',
  heatTitle: 'Heatmap จุดปัญหาบนผัง (ตัวเลข = จำนวนผู้ระบุ, สีเข้ม = คะแนนเฉลี่ยสูง)',
  bodyTitle: 'ตำแหน่งอาการปวดเมื่อย (จำนวนคน)',
  rankTitle: 'อันดับสิ่งที่อยากให้แก้ก่อน (คะแนนรวม)',
  staffTab: 'เจ้าหน้าที่',
  donorTab: 'ผู้บริจาค',
  empty: 'ยังไม่มีข้อมูล',
  more: 'มีข้อมูลใหม่อีก กดอัปเดต',
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
  count: 'คำตอบ'
};

(function () {
  const BAR_MAX = 190; // px ของแท่งที่ยาวที่สุด
  const t = App.data.admin;
  const ui = App.ui;

  function emptyNote() {
    return '<p class="text-[13px] text-muted">' + ui.esc(t.empty) + '</p>';
  }

  function bars(rows) {
    if (!rows || !rows.length) return emptyNote();
    const max = Math.max.apply(null, rows.map(function (r) { return r[1]; })) || 1;
    return '<ul class="space-y-2.5">' + rows.map(function (r) {
      const w = Math.round((r[1] / max) * BAR_MAX);
      return '<li class="flex items-center text-[13px]">' +
        '<span class="w-[42%] shrink-0 pr-3 sm:w-[205px]">' + ui.esc(r[0]) + '</span>' +
        '<span class="h-[15px] rounded-sm bg-blood" style="width:' + w + 'px;max-width:45%"></span>' +
        '<span class="ml-2">' + r[1] + '</span></li>';
    }).join('') + '</ul>';
  }

  function bangkok(sec) {
    return new Date(sec * 1000).toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' });
  }

  function pct(n, of) {
    return (Math.round((n / of) * 10000) / 100) + '%';
  }

  function quotaCard(u) {
    const row = function (label, n, of) {
      return '<li class="flex justify-between"><span>' + ui.esc(label) + '</span><span>' + n.toLocaleString('en-US') + ' / ' + of.toLocaleString('en-US') + ' (' + pct(n, of) + ')</span></li>';
    };
    return ui.card(ui.cardTitle(t.quotaTitle) +
      '<ul class="space-y-1 text-[13px]">' + row(t.quotaWrite, u.rw, u.limits.rw) + row(t.quotaRead, u.rr, u.limits.rr) + '</ul>' +
      '<p class="mt-2 text-[12px] text-muted">' + ui.esc(t.quotaNote) + '</p>');
  }

  function tabs(active) {
    return '<div class="mb-4 flex gap-2">' + ['staff', 'donor'].map(function (r) {
      return ui.pill(ui.esc(r === 'staff' ? t.staffTab : t.donorTab), r === active, { action: 'tab', value: r });
    }).join('') + '</div>';
  }

  function view(s, tab) {
    const r = s[tab];
    const none = !r.n;
    let cards = ui.card(ui.cardTitle(t.heatTitle) + (none ? emptyNote() : App.busMap.render({ mode: 'summary', heat: r.heat })));
    if (tab === 'staff') {
      cards += ui.card(ui.cardTitle(t.bodyTitle) + (none ? emptyNote() : App.bodyMap.render({ mode: 'summary', counts: r.body })));
      cards += ui.card(ui.cardTitle(t.rankTitle) + (none ? emptyNote() : bars(r.rank)));
    }
    const head = '<p class="mb-4 text-[13px] text-muted">' +
      ui.esc(t.staffTab) + ' ' + s.staff.n + ' ' + ui.esc(t.count) + ' · ' + ui.esc(t.donorTab) + ' ' + s.donor.n + ' ' + ui.esc(t.count) +
      (s.updated ? ' · ' + ui.esc(t.updated) + ' ' + bangkok(s.updated) : '') + '</p>';
    return ui.pageTitle(t.title) + head +
      (s.more ? ui.callout(t.more) : '') +
      tabs(tab) +
      '<div class="space-y-4">' + cards + quotaCard(s.usage) + '</div>' +
      '<div class="mt-4 flex flex-wrap gap-2">' +
      ui.primaryButton(t.refresh, { action: 'refresh' }) +
      ui.secondaryButton(t.csv, { action: 'csv' }) +
      ui.secondaryButton(t.logout, { action: 'logout' }) +
      '</div>';
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
  let summary = null;
  let tab = 'staff';

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

  async function call(method, url, body) {
    const r = await fetch(url, {
      method: method,
      credentials: 'same-origin',
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    });
    // อ่าน body ให้จบเสมอ (ถ้าไม่อ่าน เบราว์เซอร์จะค้างการเชื่อมต่อของคำตอบ 401 ไว้)
    const text = await r.text();
    if (r.status === 401) throw Object.assign(new Error('auth'), { auth: true });
    if (!r.ok) throw new Error('http ' + r.status);
    return text ? JSON.parse(text) : null;
  }

  function failed(e) {
    if (e.auth) { summary = null; show(loginView()); return; }
    show(loginView(t.error));
  }

  async function refresh() {
    try {
      summary = await call('GET', '/api/admin/summary');
      show(view(summary, tab));
    } catch (e) {
      failed(e);
    }
  }

  async function downloadCSV() {
    try {
      let rows = [];
      let after = 0;
      for (let i = 0; i < 1000; i++) {
        const page = await call('GET', '/api/admin/responses?after=' + after + '&limit=200');
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
    if (r.status === 204) return refresh();
    show(loginView(r.status === 429 ? t.rate : t.wrong));
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
      if (!el) return;
      const a = el.dataset.action;
      if (a === 'tab') { tab = el.dataset.value; show(view(summary, tab)); }
      if (a === 'refresh') refresh();
      if (a === 'csv') downloadCSV();
      if (a === 'logout') call('POST', '/api/admin/logout').catch(function () {}).then(function () { summary = null; show(loginView()); });
    });
    refresh();
  }

  App.admin = { bars: bars, view: view, toCSV: toCSV, boot: boot };
})();
