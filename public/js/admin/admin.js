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
  option: 'ตัวเลือก',
  points: 'คะแนนรวม',
  colRegion: 'ส่วนร่างกาย',
  colPeople: 'จำนวนคน',
  colYear: '12 เดือน "ใช่"',
  colWeek: '7 วัน "ใช่"',
  colSev: 'ความรุนแรงเฉลี่ย (0–10)',
  colPoint: 'จุด',
  colSevAvg: 'ความรุนแรงเฉลี่ย',
  colTypes: 'ประเภทปัญหา 3 อันดับแรก',
  colParts: 'ส่วนของเก้าอี้ 3 อันดับแรก',
  colId: 'ลำดับ',
  colTime: 'เวลา',
  colRole: 'บทบาท',
  colSrc: 'ช่องทาง',
  colType: 'ประเภท',
  colPart: 'ส่วนของเก้าอี้',
  colSevOne: 'ความรุนแรง',
  colNote: 'หมายเหตุ',
  notFound: 'ไม่พบคำตอบนี้',
  noPain: 'ไม่มีอาการปวดเมื่อย',
  noProblem: 'ไม่พบปัญหา',
  blank: '—'
};

(function () {
  const t = App.data.admin;
  const ui = App.ui;
  const api = App.adminApi;
  const V = App.adminViews;
  const TABS = ['overview', 'questions', 'comments', 'people'];
  const PAGE = 50;

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
    comments: { key: null, q: '', items: [], next: null, loading: false, error: false, loaded: false, ticket: 0 },
    people: { role: '', rows: null, next: null, stack: [], cur: undefined, detail: undefined, loading: false, error: false, loaded: false, ticket: 0, dticket: 0 }
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

  function tabView() {
    if (state.tab === 'overview') return V.overview(state.summary, state.heatTab);
    if (state.tab === 'questions') return V.questions(state.summary, state.qRole);
    if (state.tab === 'comments') return V.comments(state.comments, state.summary);
    const p = state.people;
    if (p.detail === 'loading') return '';
    if (p.detail === 'error') return V.person(null, true);
    if (p.detail !== undefined) return V.person(p.detail);
    return V.peopleList(p);
  }

  function render() {
    show(ui.pageTitle(t.title) + toolbar() + '<p id="status" class="mb-3 text-[13px] text-muted" role="status"></p>' + tabBar() + '<div id="view">' + tabView() + '</div>');
  }

  function status(text) {
    const el = document.getElementById('status');
    if (el) el.textContent = text;
    else show('<p class="text-[13px] text-muted" role="status">' + ui.esc(text) + '</p>');
  }

  // ทิ้งผลที่กำลังโหลดค้าง และให้รายการความคิดเห็น/รายคนโหลดใหม่ (หลัง 401 และเมื่อกดอัปเดต)
  function resetLists() {
    const c = state.comments;
    const p = state.people;
    c.ticket += 1;
    c.loading = false;
    c.loaded = false;
    p.ticket += 1;
    p.dticket += 1;
    p.loading = false;
    p.loaded = false;
    p.stack = [];
    p.cur = undefined;
    if (p.detail === 'loading') p.detail = undefined;
  }

  function loadCurrent() {
    if (state.tab === 'comments' && !state.comments.loaded) loadComments(false);
    if (state.tab === 'people' && !state.people.loaded) loadPeople(undefined);
  }

  function failed(e) {
    if (e && e.auth) {
      state.summary = null;
      resetLists();
      state.people.detail = undefined;
      show(loginView());
      return;
    }
    show(loginView(t.error));
  }

  async function refresh() {
    try {
      state.summary = await api.summaryAll(function (n) { status(fill(t.loading, { n: n })); });
      resetLists();
      render();
      loadCurrent();
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

  // ---------- ความคิดเห็น ----------
  async function loadComments(more) {
    const c = state.comments;
    const k = V.commentKeys().filter(function (x) { return x.key === c.key; })[0];
    if (!k) return;
    const ticket = ++c.ticket; // คำตอบที่มาช้ากว่าการกดครั้งใหม่จะถูกทิ้ง
    c.loading = true;
    c.error = false;
    if (!more) { c.items = []; c.next = null; }
    render();
    try {
      const page = await api.comments({ key: c.key, role: k.role || undefined, q: c.q, before: more ? c.next : undefined, limit: PAGE });
      if (ticket !== c.ticket) return;
      c.items = more ? c.items.concat(page.items) : page.items;
      c.next = page.next;
      c.loaded = true;
    } catch (e) {
      if (ticket !== c.ticket) return;
      if (e.auth) { c.loading = false; failed(e); return; }
      c.error = true;
    }
    c.loading = false;
    if (state.tab === 'comments') render();
  }

  function openComments(key) {
    const c = state.comments;
    state.tab = 'comments';
    c.key = key || c.key || V.commentKeys()[0].key;
    c.q = '';
    loadComments(false);
  }

  // ---------- รายคน ----------
  // move: 'older' / 'newer' ปรับ stack เมื่อโหลดสำเร็จเท่านั้น
  async function loadPeople(before, move) {
    const p = state.people;
    const ticket = ++p.ticket;
    const prev = p.cur;
    p.loading = true;
    p.error = false;
    try {
      const page = await api.responses({ before: before, role: p.role, limit: PAGE });
      if (ticket !== p.ticket) return;
      if (move === 'older') p.stack.push(prev);
      if (move === 'newer') p.stack.pop();
      p.rows = page.rows;
      p.next = page.next;
      p.cur = before;
      p.loaded = true;
    } catch (e) {
      if (ticket !== p.ticket) return;
      if (e.auth) { p.loading = false; failed(e); return; }
      p.error = true;
    }
    p.loading = false;
    if (state.tab === 'people') render();
  }

  function listPeople() {
    const p = state.people;
    state.tab = 'people';
    p.dticket += 1; // คำตอบรายคนที่ยังโหลดไม่เสร็จจะไม่พากลับเข้าหน้ารายละเอียด
    p.detail = undefined;
    render();
    if (!p.loaded) loadPeople(undefined);
  }

  async function openPerson(id) {
    const p = state.people;
    const ticket = ++p.dticket; // แยกจาก p.ticket ของรายการ เพื่อไม่ให้การเปิดคนตัดการโหลดหน้ารายการ
    state.tab = 'people';
    p.detail = 'loading';
    render();
    try {
      const res = await api.response(id);
      if (ticket !== p.dticket) return;
      p.detail = res.row;
    } catch (e) {
      if (ticket !== p.dticket) return;
      if (e.auth) { failed(e); return; }
      p.detail = e.status === 404 ? null : 'error'; // 404 → "ไม่พบคำตอบนี้", อื่น ๆ → โหลดไม่สำเร็จ
    }
    if (state.tab === 'people') render();
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
    if (a === 'tab') {
      if (el.dataset.value === 'comments' && !state.comments.loaded) {
        state.tab = 'comments';
        if (!state.comments.key) state.comments.key = V.commentKeys()[0].key;
        return loadComments(false);
      }
      if (el.dataset.value === 'people') return listPeople();
      state.tab = el.dataset.value;
      render();
    }
    if (a === 'heattab') { state.heatTab = el.dataset.value; render(); }
    if (a === 'qrole') { state.qRole = el.dataset.value; render(); }
    if (a === 'gocomments' || a === 'ckey') openComments(el.dataset.key);
    if (a === 'cclear') { state.comments.q = ''; loadComments(false); }
    if (a === 'cmore' && !state.comments.loading) loadComments(true);
    if (a === 'person') openPerson(el.dataset.id);
    if (a === 'peopleback') listPeople();
    if (a === 'prole') { state.people.role = el.dataset.value; state.people.stack = []; loadPeople(undefined); }
    if (a === 'polder' && state.people.next !== null && !state.people.loading) loadPeople(state.people.next, 'older');
    if (a === 'pnewer' && state.people.stack.length && !state.people.loading) loadPeople(state.people.stack[state.people.stack.length - 1], 'newer');
    if (a === 'refresh') refresh();
    if (a === 'csv') downloadCSV();
    if (a === 'logout') api.call('POST', '/api/admin/logout').catch(function () {}).then(function () { state.summary = null; show(loginView()); });
  }

  function boot() {
    root = document.getElementById('app');
    root.addEventListener('submit', function (ev) {
      if (ev.target.id === 'login') {
        ev.preventDefault();
        login(document.getElementById('pw').value);
      }
      if (ev.target.id === 'csearch') {
        ev.preventDefault();
        state.comments.q = ev.target.elements.q.value.trim();
        loadComments(false);
      }
    });
    root.addEventListener('click', function (ev) {
      const el = ev.target.closest('[data-action]');
      if (el) onClick(el);
    });
    refresh();
  }

  App.admin = { toCSV: toCSV, boot: boot };
})();
