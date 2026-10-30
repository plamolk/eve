// แบบสอบถาม: render ทีละส่วน และรับการคลิก/พิมพ์ทั้งหมด (event delegation)
// บทบาทมาจาก ?role= และโหลดชุดคำถามของบทบาทนั้นเท่านั้น
window.App = window.App || {};

(function () {
  const root = document.getElementById('app');
  const ui = App.ui;


  function item(q) {
    const a = App.state.answers;
    switch (q.type) {
      case 'pills':
        return ui.field(q.label, ui.pillGroup(q.options.map(function (o) {
          return ui.pill(ui.esc(o), a[q.key] === o, { action: 'pick', key: q.key, value: o });
        }).join('')), q.large);

      case 'scale':
        return ui.field(q.label, ui.pillGroup(q.options.map(function (o) {
          const label = '<span class="mr-1.5 text-[17px] leading-none" aria-hidden="true">' + o.emoji + '</span>' + ui.esc(o.label);
          return ui.pill(label, a[q.key] === o.value, { action: 'scale', key: q.key, value: o.value }, 'inline-flex items-center');
        }).join('')));

      case 'multi': {
        const list = a[q.key] || [];
        const full = q.max && list.length >= q.max;
        return ui.field(q.label, ui.pillGroup(q.options.map(function (o) {
          const on = list.indexOf(o) >= 0;
          const data = { action: 'multi', key: q.key, value: o };
          if (q.max) data.max = q.max;
          if (q.only) data.only = q.only;
          return ui.pill(ui.esc(o), on, data, !on && full ? 'opacity-50' : '');
        }).join('')));
      }

      case 'rank': {
        const list = a[q.key] || [];
        return ui.field(q.label, ui.pillGroup(q.options.map(function (o) {
          const n = list.indexOf(o) + 1;
          const num = n ? '<span class="mr-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-bold text-blood">' + n + '</span>' : '';
          return ui.pill(num + ui.esc(o), n > 0, { action: 'rank', key: q.key, value: o, max: q.max }, 'inline-flex items-center');
        }).join('')));
      }

      case 'number':
        return ui.field(q.label, ui.input('number', { key: q.key }, a[q.key], '', ''));

      case 'textarea':
        return ui.field(q.label, ui.textarea({ key: q.key }, a[q.key]));
    }
    return '';
  }

  function component(sec) {
    const s = App.state;
    if (sec.component === 'bodyMap') {
      return App.bodyMap.render({ mode: 'input', selected: s.msd }) + App.bodyMap.details(s.msd);
    }
    if (sec.component === 'busMap') {
      return App.busMap.render({ mode: 'input', entries: s.map, openId: s.openZone }) +
        (s.openZone ? App.busMap.form(s.openZone, s.map[s.openZone]) : '') +
        App.busMap.savedList(s.map);
    }
    return '';
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

    return progress + ui.card(body) +
      '<div class="mt-4 flex items-center justify-between">' +
      ui.secondaryButton(nav.back, { action: 'back' }) +
      ui.primaryButton(last ? nav.submit : nav.next, { action: last ? 'submit' : 'next' }) +
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
    const key = focusKey(document.activeElement);
    root.innerHTML = App.state.screen === 'thanks' ? App.pages.thanks.render() : renderSurvey();
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

  function go(screen, step) {
    App.state.screen = screen;
    if (step !== undefined) App.state.step = step;
    App.state.openZone = null;
    render({ top: true });
  }

  let toastTimer;
  function toast(text) {
    const box = document.getElementById('toast');
    box.firstElementChild.textContent = text;
    box.classList.remove('opacity-0');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.classList.add('opacity-0'); }, 2200);
  }

  function copyAnswers(btn) {
    const text = App.store.toJSON();
    const done = function () {
      const original = btn.textContent;
      btn.textContent = App.data.thanks.copied;
      setTimeout(function () { btn.textContent = original; }, 1500);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
    function fallback() {
      // เปิดไฟล์ตรง ๆ (file://) บางเบราว์เซอร์ไม่อนุญาต clipboard API
      const pre = document.getElementById('answer-json');
      const range = document.createRange();
      range.selectNodeContents(pre);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      try { document.execCommand('copy'); done(); } catch (e) { /* ข้อความถูกเลือกไว้ให้กดคัดลอกเอง */ }
    }
  }

  // ---------- actions ----------
  const S = function () { return App.state; };
  const actions = {
    back: function () {
      if (S().step === 0) location.href = 'index.html';
      else go('survey', S().step - 1);
    },
    next: function () { go('survey', S().step + 1); },
    submit: function () { go('thanks'); },
    restart: function () { location.href = 'index.html'; },
    copy: function (d, el) { copyAnswers(el); },

    pick: function (d) { App.store.toggleSingle(d.key, d.value); render(); },
    scale: function (d) { App.store.toggleSingle(d.key, Number(d.value)); render(); },
    multi: function (d) { App.store.toggleMulti(d.key, d.value, Number(d.max) || 0, d.only); render(); },
    rank: function (d) { App.store.toggleRank(d.key, d.value, Number(d.max)); render(); },
    body: function (d) { App.store.toggleRegion(d.id); render(); },

    zone: function (d) {
      S().openZone = d.id;
      render();
      const form = document.getElementById('zone-form');
      if (form) {
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        form.scrollIntoView({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' });
      }
    },
    zlist: function (d) { App.store.toggleZoneList(S().openZone, d.field, d.value); render(); },
    zsev: function (d) { App.store.setZoneField(S().openZone, 'sev', Number(d.value)); render(); },
    zsave: function () { App.store.saveZone(S().openZone); render(); },
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
      render({ top: true });
    });
  }

  App.survey = { ROLE_SCRIPTS: ROLE_SCRIPTS, boot: boot };
  boot();
})();
