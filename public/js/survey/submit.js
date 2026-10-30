// ตรวจคำตอบก่อนไปส่วนถัดไป/ก่อนส่ง และเตรียม data ที่จะส่ง (ไม่แตะ DOM)
window.App = window.App || {};

(function () {
  const DATA_MAX_BYTES = 13824;
  const NUMBER_MAX = 9999;
  const TEXT_MAX = 2000;
  const NOTE_MAX = 500;
  const NUMBER_RE = /^\d+(\.\d+)?$/;

  function isEmpty(v) {
    return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
  }

  function problem(step, key, name) {
    return { step: step, key: key, message: App.data.submit[name] };
  }

  function checkItem(q, v) {
    if (isEmpty(v) || (q.type === 'textarea' && String(v).trim() === '')) {
      return q.optional ? null : 'required';
    }
    if (q.type === 'rank' && v.length < q.max) return 'rankAll';
    if (q.type === 'number') {
      const s = String(v);
      if (s.length > 8 || !NUMBER_RE.test(s) || Number(s) > NUMBER_MAX) return 'number';
    }
    if (q.type === 'textarea' && String(v).length > TEXT_MAX) return 'tooLong';
    return null;
  }

  function checkBody(state, step) {
    const ids = Object.keys(state.msd);
    if (!ids.length) return state.answers.noMsd ? null : problem(step, 'msd', 'needMsd');
    for (const id of ids) {
      const s = state.msd[id].s;
      if (typeof s !== 'number' || !isFinite(s) || s < 0 || s > 10) return problem(step, 'msd.' + id, 'severity');
    }
    return null;
  }

  function checkBus(state, step) {
    const saved = Object.keys(state.map).filter(function (id) { return !state.map[id].tmp; });
    if (!saved.length && !state.answers.noMap) return problem(step, 'map', 'needMap');
    for (const id of saved) {
      if (String(state.map[id].n || '').length > NOTE_MAX) return problem(step, 'map.' + id, 'tooLong');
    }
    return null;
  }

  function checkStep(state, step) {
    const sec = App.data.sections[state.role][step];
    if (sec.component === 'bodyMap') {
      const p = checkBody(state, step);
      if (p) return p;
    }
    if (sec.component === 'busMap') {
      const p = checkBus(state, step);
      if (p) return p;
    }
    for (const q of sec.items) {
      const name = checkItem(q, state.answers[q.key]);
      if (name) return problem(step, q.key, name);
    }
    return null;
  }

  function buildData(state) {
    return JSON.parse(JSON.stringify({ role: state.role, answers: state.answers, msd: state.msd, map: state.map }));
  }

  function checkAll(state) {
    const sections = App.data.sections[state.role];
    for (let i = 0; i < sections.length; i++) {
      const p = checkStep(state, i);
      if (p) return p;
    }
    const bytes = new TextEncoder().encode(JSON.stringify(buildData(state))).length;
    if (bytes > DATA_MAX_BYTES) return problem(sections.length - 1, '', 'tooLarge');
    return null;
  }

  function pendingZones(map) {
    return Object.keys(map).filter(function (id) { return map[id].tmp; });
  }

  // save = บันทึกจุด tmp ที่เลือกประเภทแล้ว (จุดที่ยังไม่มีประเภทยังเป็น tmp) / drop = ทิ้งจุด tmp ทั้งหมด
  function resolveTmp(map, mode) {
    const out = {};
    Object.keys(map).forEach(function (id) {
      const e = JSON.parse(JSON.stringify(map[id]));
      if (e.tmp) {
        if (mode === 'drop') return;
        if (e.t && e.t.length) delete e.tmp;
      }
      out[id] = e;
    });
    return out;
  }

  // ---------- ส่งคำตอบ ----------

  // ผลจาก /api/submit → ok | turnstile | rate | invalid | down (down = Worker ใช้ไม่ได้ ให้ไปทางสำรอง)
  function classify(res) {
    const j = res.json;
    if ((res.status === 201 || res.status === 202) && j && j.ok) return 'ok';
    if (res.status === 403 && j && j.error === 'turnstile') return 'turnstile';
    if (res.status === 429 && j && j.error === 'rate') return 'rate';
    if ((res.status === 400 || res.status === 413) && j) return 'invalid';
    return 'down';
  }

  // ร่างสำรองในเบราว์เซอร์ (ใช้เฉพาะตอนส่งไม่สำเร็จ ลบเมื่อส่งสำเร็จ)
  const DRAFT_KEY = 'eve-draft';
  const draft = {
    save: function (d) {
      try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) { /* เก็บไม่ได้ก็ทำงานต่อ */ }
    },
    load: function () {
      try {
        const raw = window.localStorage.getItem(DRAFT_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    clear: function () {
      try { window.localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
    }
  };

  // Turnstile แบบ execute: ขอ token ตอนกดส่ง (token มีอายุ 300 วินาที)
  let widget = null;
  let waiting = null;
  function token() {
    return new Promise(function (resolve, reject) {
      const ts = window.turnstile;
      if (!ts) return reject(new Error('turnstile unavailable'));
      const timer = setTimeout(function () { waiting = null; reject(new Error('turnstile timeout')); }, 30000);
      waiting = {
        ok: function (t) { clearTimeout(timer); waiting = null; resolve(t); },
        fail: function () { clearTimeout(timer); waiting = null; reject(new Error('turnstile error')); }
      };
      try {
        if (widget === null) {
          widget = ts.render('#ts', {
            sitekey: App.config.turnstileSiteKey,
            execution: 'execute',
            action: 'submit',
            appearance: 'interaction-only',
            callback: function (t) { if (waiting) waiting.ok(t); },
            'error-callback': function () { if (waiting) waiting.fail(); }
          });
        } else {
          ts.reset(widget);
        }
        ts.execute(widget);
      } catch (e) {
        waiting.fail();
      }
    });
  }

  async function post(url, body, contentType) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': contentType }, body: JSON.stringify(body) });
      let json = null;
      try { json = await r.json(); } catch (e) { json = null; }
      return { status: r.status, json: json };
    } catch (e) {
      return null; // network error
    }
  }

  // ทางสำรอง: ส่งตรงไป Apps Script (Apps Script ตรวจ Turnstile เอง)
  async function sendToSheets(cid, data) {
    let t;
    try { t = await token(); } catch (e) { return false; }
    const res = await post(App.config.sheetsUrl, { auth: 'turnstile', token: t, cid: cid, data: data }, 'text/plain;charset=utf-8');
    return !!(res && res.json && res.json.ok === true);
  }

  // ส่งคำตอบ (เรียกหลังผ่าน checkAll แล้ว) และรายงานผลผ่าน onDone(code) — code: ok | turnstile | rate | invalid | unavailable | noTurnstile
  async function send(state, onDone) {
    const data = buildData(state);
    draft.save({ v: 1, cid: state.cid, role: state.role, step: state.step, answers: state.answers, msd: state.msd, map: state.map });
    let t;
    try {
      t = await token();
    } catch (e) {
      return onDone('noTurnstile');
    }
    const hp = document.getElementById('hp');
    const res = await post('/api/submit', { v: 1, cid: state.cid, token: t, hp: hp ? hp.value : '', data: data }, 'application/json');
    let kind = res ? classify(res) : 'down';
    if (kind === 'down') kind = (await sendToSheets(state.cid, data)) ? 'ok' : 'unavailable';
    if (kind === 'ok') draft.clear();
    onDone(kind);
  }

  App.draft = draft;

  App.submit = {
    checkStep: checkStep,
    checkAll: checkAll,
    buildData: buildData,
    pendingZones: pendingZones,
    resolveTmp: resolveTmp,
    classify: classify,
    token: token,
    send: send
  };
})();
