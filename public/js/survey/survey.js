// แบบสอบถาม: render ทีละส่วน และรับการคลิก/พิมพ์ทั้งหมด (event delegation)
// บทบาทมาจาก ?role= และโหลดชุดคำถามของบทบาทนั้นเท่านั้น
window.App = window.App || {};

(function () {
  const root = document.getElementById('app');
  const ui = App.ui;


  function item(q) {
    const a = App.state.answers;
    const m = App.state.missing;
    const err = m && m.key === q.key ? m.message : '';
    switch (q.type) {
      case 'pills':
        return ui.field(q.label, ui.pillGroup(q.options.map(function (o) {
          return ui.pill(ui.esc(o), a[q.key] === o, { action: 'pick', key: q.key, value: o });
        }).join('')), q.large, err);

      case 'scale':
        return ui.field(q.label, ui.pillGroup(q.options.map(function (o) {
          const label = '<span class="mr-1.5 text-[17px] leading-none" aria-hidden="true">' + o.emoji + '</span>' + ui.esc(o.label);
          return ui.pill(label, a[q.key] === o.value, { action: 'scale', key: q.key, value: o.value }, 'inline-flex items-center');
        }).join('')), false, err);

      case 'multi': {
        const list = a[q.key] || [];
        const full = q.max && list.length >= q.max;
        return ui.field(q.label, ui.pillGroup(q.options.map(function (o) {
          const on = list.indexOf(o) >= 0;
          const data = { action: 'multi', key: q.key, value: o };
          if (q.max) data.max = q.max;
          if (q.only) data.only = q.only;
          return ui.pill(ui.esc(o), on, data, !on && full ? 'opacity-50' : '');
        }).join('')), false, err);
      }

      case 'rank': {
        const list = a[q.key] || [];
        return ui.field(q.label, ui.pillGroup(q.options.map(function (o) {
          const n = list.indexOf(o) + 1;
          const num = n ? '<span class="mr-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-bold text-blood">' + n + '</span>' : '';
          return ui.pill(num + ui.esc(o), n > 0, { action: 'rank', key: q.key, value: o, max: q.max }, 'inline-flex items-center');
        }).join('')), false, err);
      }

      case 'number':
        return ui.field(q.label, ui.input('number', { key: q.key }, a[q.key], '', ''), false, err);

      case 'textarea':
        return ui.field(q.label, ui.textarea({ key: q.key }, a[q.key]), false, err);
    }
    return '';
  }

  // ข้อความเตือนใต้แผนภาพ/ผัง เมื่อ key ที่ขาดอยู่ในส่วนนี้ (msd, msd.<ส่วน>, map, map.<จุด>)
  function componentError(prefix) {
    const m = App.state.missing;
    if (!m || (m.key !== prefix && m.key.indexOf(prefix + '.') !== 0)) return '';
    return '<div data-missing>' + ui.fieldError(m.message) + '</div>';
  }

  function noneButton(kind) {
    const t = App.data.submit;
    const on = !!App.state.answers[kind === 'msd' ? 'noMsd' : 'noMap'];
    return '<div class="mt-4">' + ui.pill(ui.esc(kind === 'msd' ? t.noMsd : t.noMap), on, { action: 'none', kind: kind }) + '</div>';
  }

  function component(sec) {
    const s = App.state;
    if (sec.component === 'bodyMap') {
      return App.bodyMap.render({ mode: 'input', selected: s.msd }) + App.bodyMap.details(s.msd) +
        noneButton('msd') + componentError('msd');
    }
    if (sec.component === 'busMap') {
      return App.busMap.render({ mode: 'input', entries: s.map, openId: s.openZone }) +
        (s.openZone ? App.busMap.form(s.openZone, s.map[s.openZone]) : '') +
        (s.openZone && s.zoneError ? ui.fieldError(App.data.submit.needType) : '') +
        App.busMap.savedList(s.map) + noneButton('map') + componentError('map');
    }
    return '';
  }

  // ผลการส่งที่ไม่สำเร็จ (ไม่มีปุ่มคัดลอก คำตอบเก็บเป็นร่างในเครื่อง)
  function sendNotice(code) {
    const t = App.data.submit;
    const retry = code === 'unavailable' || code === 'noTurnstile';
    return '<div class="mt-4 rounded-xl border border-blood/70 bg-white p-4" role="alert" data-missing>' +
      '<p class="text-[15px] font-semibold text-blood">' + ui.esc(t[code]) + '</p>' +
      (retry ? '<div class="mt-3">' + ui.primaryButton(t.retry, { action: 'submit' }) + '</div>' : '') +
      '</div>';
  }

  function draftBanner() {
    const t = App.data.submit;
    return '<div class="mb-4 rounded-xl border border-blood/70 bg-white p-4" role="status">' +
      '<p class="text-[15px] font-semibold">' + ui.esc(t.draft) + '</p>' +
      '<div class="mt-3 flex flex-wrap gap-2">' +
      ui.primaryButton(t.draftResume, { action: 'draftresume' }) +
      ui.secondaryButton(t.draftDiscard, { action: 'draftdiscard' }) +
      '</div></div>';
  }

  // กล่องเตือนจุดบนผังที่ยังไม่ได้กด "บันทึกจุดนี้"
  function tmpNotice(ids) {
    const t = App.data.submit;
    const names = ids.map(function (id) { return App.data.findArea(id).label; }).join(', ');
    return '<div class="mt-4 rounded-xl border border-blood/70 bg-white p-4" role="alert" data-missing>' +
      '<p class="text-[15px] font-semibold">' + ui.esc(t.tmpTitle.replace('{n}', ids.length)) + '</p>' +
      '<p class="mt-1 text-[13px] text-muted">' + ui.esc(names) + '</p>' +
      '<div class="mt-3 flex flex-wrap gap-2">' +
      ui.primaryButton(t.tmpSave, { action: 'tmpsave' }) +
      ui.secondaryButton(t.tmpDrop, { action: 'tmpdrop' }) +
      ui.secondaryButton(t.tmpBack, { action: 'tmpback' }) +
      '</div></div>';
  }

  function renderSurvey() {
    const sections = App.data.sections[App.state.role];
    const step = App.state.step;
    const sec = sections[step];
    const last = step === sections.length - 1;
    const pct = (step / sections.length) * 100;
    const nav = App.data.nav;

    const progress = '<div class="mb-4 h-1.5 overflow-hidden rounded-full bg-track" role="progressbar" aria-valuemin="0" aria-valuemax="' + sections.length + '" aria-valuenow="' + step + '">' +
      '<div class="h-full rounded-full bg-blood transition-[width] duration-300" style="width:' + pct + '%"></div></div>';

    const body = ui.cardTitle(sec.title) +
      (sec.note ? ui.callout(sec.note) : '') +
      component(sec) +
      (sec.items.length ? '<div class="' + (sec.component ? 'mt-5 ' : '') + 'space-y-5">' + sec.items.map(item).join('') + '</div>' : '');

    const n = App.state.notice;
    const notice = !n ? '' : n.kind === 'tmp' ? tmpNotice(n.ids) : n.kind === 'send' ? sendNotice(n.code) : '';
    const banner = n && n.kind === 'draft' ? draftBanner() : '';

    return banner + progress + ui.card(body) + notice +
      '<div class="mt-4 flex items-center justify-between">' +
      ui.secondaryButton(nav.back, { action: 'back' }) +
      (last && App.state.sending
      ? ui.primaryButton(App.data.submit.sending, { action: 'submit' }, true)
      : ui.primaryButton(last ? nav.submit : nav.next, { action: last ? 'submit' : 'next' })) +
      '</div>';
  }

  // ---------- render ----------
  function focusKey(el) {
    if (!el || el === document.body || !root.contains(el)) return null;
    const d = el.dataset || {};
    return ['action', 'key', 'value', 'id', 'field', 'msd', 'zfield'].map(function (k) { return d[k] || ''; }).join('|');
  }

  function render(opts) {
    opts = opts || {};
    const st = App.state;
    if (st.missing && !st.missing.fromServer) {
      const p = App.submit.checkStep(st, st.step);
      if (!p || p.key !== st.missing.key) st.missing = null;
    }
    const key = focusKey(document.activeElement);
    root.innerHTML = renderSurvey();
    if (opts.top) {
      window.scrollTo(0, 0);
      return;
    }
    if (key) {
      const match = Array.prototype.find.call(root.querySelectorAll('[data-action],[data-key],[data-msd],[data-zfield]'), function (el) {
        return focusKey(el) === key;
      });
      if (match) match.focus({ preventScroll: true });
    }
  }

  function scrollToMissing() {
    const el = root.querySelector('[data-missing]');
    if (!el) return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
  }

  // ตรวจส่วนปัจจุบัน: คืน true ถ้าไปต่อได้ ถ้าไม่ได้จะแสดงสิ่งที่ขาดแล้วเลื่อนไปหา
  function stepReady() {
    const st = App.state;
    // จุดที่ยังไม่ได้บันทึกเตือนก่อน เพราะบอกได้ตรงกว่าว่าต้องทำอะไร
    const sec = App.data.sections[st.role][st.step];
    const pending = sec.component === 'busMap' ? App.submit.pendingZones(st.map) : [];
    if (pending.length) {
      st.missing = null;
      st.notice = { kind: 'tmp', ids: pending };
      st.openZone = null;
      render();
      scrollToMissing();
      return false;
    }
    const p = App.submit.checkStep(st, st.step);
    if (p) {
      st.missing = p;
      st.notice = null;
      render();
      scrollToMissing();
      return false;
    }
    return true;
  }

  function finishStep() {
    const st = App.state;
    if (st.step < App.data.sections[st.role].length - 1) {
      go(st.step + 1);
      return;
    }
    const p = App.submit.checkAll(st);
    if (p) {
      go(p.step);
      st.missing = p;
      render();
      scrollToMissing();
      return;
    }
    sendAnswers();
  }

  // field ของ server → key ที่ใช้ไฮไลต์ (ข้อคำถาม, msd.<ส่วน>, map.<จุด>)
  function keyForField(field) {
    const p = String(field).split('.');
    if (p[0] === 'answers') return p[1] === 'noMap' ? 'map' : p[1] === 'noMsd' ? 'msd' : p[1];
    return p.slice(0, 2).join('.');
  }

  function sendAnswers() {
    const st = App.state;
    if (st.sending) return;
    st.sending = true;
    st.notice = null;
    render();
    App.submit.send(st, function (code, field) {
      if (code === 'ok') {
        location.replace('thanks.html');
        return;
      }
      st.sending = false;
      const step = code === 'invalid' ? App.submit.stepForField(st, field) : null;
      if (step !== null) {
        // server ชี้ข้อที่ผิด: พาไปส่วนนั้นแล้วไฮไลต์
        go(step);
        st.missing = { step: step, key: keyForField(field), message: App.data.submit.invalid, fromServer: true };
        render();
        scrollToMissing();
        return;
      }
      st.notice = { kind: 'send', code: code };
      render();
      scrollToMissing();
    });
  }

  function go(step) {
    App.state.missing = null;
    App.state.notice = null;
    App.state.zoneError = false;
    App.state.step = step;
    App.state.openZone = null;
    render({ top: true });
  }

  // ---------- actions ----------
  const S = function () { return App.state; };
  const actions = {
    back: function () {
      if (S().step === 0) location.href = 'index.html';
      else go(S().step - 1);
    },
    next: function () { if (stepReady()) finishStep(); },
    submit: function () { if (stepReady()) finishStep(); },
    tmpsave: function () {
      S().map = App.submit.resolveTmp(S().map, 'save');
      S().notice = null;
      if (S().map && Object.keys(S().map).some(function (k) { return !S().map[k].tmp; })) delete S().answers.noMap;
      actions.next();
    },
    tmpdrop: function () {
      S().map = App.submit.resolveTmp(S().map, 'drop');
      S().notice = null;
      actions.next();
    },
    tmpback: function () {
      const ids = App.submit.pendingZones(S().map);
      S().notice = null;
      actions.zone({ id: ids[0] });
    },
    none: function (d) {
      const key = d.kind === 'msd' ? 'noMsd' : 'noMap';
      App.store.setNone(d.kind, !S().answers[key]);
      render();
    },
    draftresume: function () {
      App.store.restore(S().notice.draft);
      go(App.state.step);
    },
    draftdiscard: function () {
      App.draft.clear();
      S().notice = null;
      render();
    },

    pick: function (d) { App.store.toggleSingle(d.key, d.value); render(); },
    scale: function (d) { App.store.toggleSingle(d.key, Number(d.value)); render(); },
    multi: function (d) { App.store.toggleMulti(d.key, d.value, Number(d.max) || 0, d.only); render(); },
    rank: function (d) { App.store.toggleRank(d.key, d.value, Number(d.max)); render(); },
    body: function (d) { App.store.toggleRegion(d.id); render(); },

    zone: function (d) {
      S().openZone = d.id;
      S().zoneError = false;
      render();
      const form = document.getElementById('zone-form');
      if (form) {
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        form.scrollIntoView({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' });
      }
    },
    zlist: function (d) { App.store.toggleZoneList(S().openZone, d.field, d.value); render(); },
    zsev: function (d) { App.store.setZoneField(S().openZone, 'sev', Number(d.value)); render(); },
    zsave: function () {
      const e = App.store.zoneEntry(S().openZone, false);
      if (!e || !e.t.length) {
        S().zoneError = true;
        render();
        return;
      }
      S().zoneError = false;
      App.store.saveZone(S().openZone);
      render();
    },
    zdel: function () { App.store.removeZone(S().openZone); render(); }
  };

  root.addEventListener('click', function (ev) {
    const el = ev.target.closest('[data-action]');
    if (!el || !root.contains(el)) return;
    const fn = actions[el.dataset.action];
    if (fn) fn(el.dataset, el);
  });

  // โซนบนผังและจุดบนร่างกายเป็น SVG: รองรับ Enter / Space
  root.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const el = ev.target.closest('g[data-action]');
    if (!el) return;
    ev.preventDefault();
    actions[el.dataset.action](el.dataset, el);
  });

  // ---------- typing (ไม่ render ใหม่ เพื่อไม่ให้เคอร์เซอร์หลุด) ----------
  root.addEventListener('input', function (ev) {
    const el = ev.target;
    const d = el.dataset;
    if (d.key !== undefined && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      App.store.setAnswer(d.key, el.value);
    } else if (d.zfield) {
      App.store.setZoneField(S().openZone, d.zfield, el.value);
    }
  });

  root.addEventListener('change', function (ev) {
    const el = ev.target;
    const d = el.dataset;
    if (d.msd) {
      const v = d.msd === 's' ? (el.value === '' ? '' : Number(el.value)) : el.value;
      App.store.setRegionField(d.id, d.msd, v);
    }
  });

  // ---------- boot ----------
  const ROLE_SCRIPTS = {
    staff: ['js/data/staff.js', 'js/data/body-regions.js', 'js/components/body-map.js'],
    donor: ['js/data/donor.js']
  };

  function loadScripts(list, done) {
    if (!list.length) return done();
    const el = document.createElement('script');
    el.src = list[0];
    el.async = false;
    el.onload = function () { loadScripts(list.slice(1), done); };
    document.head.appendChild(el);
  }

  function boot() {
    const role = new URLSearchParams(location.search).get('role');
    if (!ROLE_SCRIPTS[role]) {
      location.replace('index.html');
      return;
    }
    loadScripts(ROLE_SCRIPTS[role], function () {
      App.store.reset();
      App.state.role = role;
      const d = App.draft.load();
      if (d && d.v === 1 && d.role === role) App.state.notice = { kind: 'draft', draft: d };
      render({ top: true });
    });
  }

  App.survey = { ROLE_SCRIPTS: ROLE_SCRIPTS, boot: boot };
  boot();
})();
