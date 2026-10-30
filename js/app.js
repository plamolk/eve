// สลับหน้าจอและรับการคลิก/พิมพ์ทั้งหมด (event delegation)
window.App = window.App || {};

(function () {
  const root = document.getElementById('app');

  // ---------- render ----------
  function focusKey(el) {
    if (!el || el === document.body || !root.contains(el)) return null;
    const d = el.dataset || {};
    return ['action', 'key', 'value', 'id', 'field', 'msd', 'zfield'].map(function (k) { return d[k] || ''; }).join('|');
  }

  function render(opts) {
    opts = opts || {};
    const key = focusKey(document.activeElement);
    root.innerHTML = App.pages[App.state.screen].render();
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
    role: function (d) {
      if (d.value === 'staff') {
        S().role = 'staff';
        go('survey', 0);
      } else {
        toast(App.data.intro.donorUnavailable);
      }
    },
    summary: function () { go('summary'); },
    home: function () { go('intro'); },
    back: function () {
      if (S().step === 0) go('intro');
      else go('survey', S().step - 1);
    },
    next: function () { go('survey', S().step + 1); },
    submit: function () { go('thanks'); },
    restart: function () { App.store.reset(); go('intro'); },
    copy: function (d, el) { copyAnswers(el); },

    pick: function (d) { App.store.toggleSingle(d.key, d.value); render(); },
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

  render({ top: true });
})();
