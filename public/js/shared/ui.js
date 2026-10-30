// ชิ้นส่วน UI ที่ใช้ซ้ำ (คืนค่าเป็น HTML string)
window.App = window.App || {};

(function () {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // data-* attributes จาก object
  function attrs(obj) {
    return Object.keys(obj || {}).map(function (k) {
      return 'data-' + k + '="' + esc(obj[k]) + '"';
    }).join(' ');
  }

  const PILL = 'rounded-full border px-4 py-2.5 text-sm leading-tight transition-colors';
  const PILL_ON = 'border-blood bg-blood text-white';
  const PILL_OFF = 'border-line bg-white text-ink hover:border-blood/40';

  App.ui = {
    esc: esc,
    attrs: attrs,

    pill: function (label, selected, data, extra) {
      return '<button type="button" class="' + PILL + ' ' + (selected ? PILL_ON : PILL_OFF) + ' ' + (extra || '') + '" aria-pressed="' + !!selected + '" ' + attrs(data) + '>' + label + '</button>';
    },

    pillGroup: function (html) {
      return '<div class="flex flex-wrap gap-2">' + html + '</div>';
    },

    label: function (text, large) {
      return '<p class="mb-2 font-semibold ' + (large ? 'text-[17px]' : 'text-[15px]') + '">' + esc(text) + '</p>';
    },

    // error = ข้อความเตือนเมื่อยังไม่ได้ตอบ (ไม่มี error → HTML เหมือนเดิม)
    field: function (labelText, inner, large, error) {
      if (!error) return '<div>' + App.ui.label(labelText, large) + inner + '</div>';
      return '<div class="rounded-lg p-2 ring-2 ring-blood" data-missing>' + App.ui.label(labelText, large) + inner + App.ui.fieldError(error) + '</div>';
    },

    fieldError: function (text) {
      return '<p class="mt-2 text-[13px] font-medium text-blood" role="alert">' + esc(text) + '</p>';
    },

    input: function (type, data, value, extra) {
      return '<input type="' + type + '" class="h-11 w-full rounded-lg border border-line bg-cream px-3 text-[15px] outline-none focus:border-blood/50 focus:bg-white ' + (extra || '') + '" value="' + esc(value) + '" ' + attrs(data) + '>';
    },

    textarea: function (data, value) {
      return '<textarea rows="2" class="block min-h-[72px] w-full rounded-lg border border-line bg-cream px-3 py-2 text-[15px] outline-none focus:border-blood/50 focus:bg-white" ' + attrs(data) + '>' + esc(value) + '</textarea>';
    },

    card: function (inner, extra) {
      return '<section class="rounded-xl border border-line bg-white p-4 ' + (extra || '') + '">' + inner + '</section>';
    },

    cardTitle: function (text) {
      return '<h2 class="mb-4 text-[17px] font-bold text-blood">' + esc(text) + '</h2>';
    },

    pageTitle: function (text) {
      return '<h1 class="mb-4 text-xl font-bold">' + esc(text) + '</h1>';
    },

    callout: function (text) {
      return '<p class="mb-4 rounded-r-md border-l-[3px] border-blood bg-cream px-3 py-2 text-[13.5px] leading-relaxed">' + esc(text) + '</p>';
    },

    primaryButton: function (label, data) {
      return '<button type="button" class="rounded-lg bg-blood px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-blood-dark" ' + attrs(data) + '>' + esc(label) + '</button>';
    },

    secondaryButton: function (label, data) {
      return '<button type="button" class="rounded-full border border-line bg-white px-4 py-3 text-[15px] font-medium transition-colors hover:border-blood/40" ' + attrs(data) + '>' + esc(label) + '</button>';
    },

    // สีแดงไล่ระดับ t = 0..1 (อ่อน → เข้ม)
    heat: function (t) {
      t = Math.max(0, Math.min(1, t));
      const a = [226, 154, 144];
      const b = [184, 50, 39];
      const c = a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); });
      return 'rgb(' + c.join(',') + ')';
    }
  };
})();
