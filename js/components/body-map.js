// แผนภาพร่างกาย ด้านหน้า/หลัง
// mode 'input'   : แตะเพื่อเลือก/ยกเลิก (Part C)
// mode 'summary' : แสดงจำนวนคนในวงกลม (หน้าสรุปผล)
window.App = window.App || {};

(function () {
  const STROKE = '#5d5470';

  function figure() {
    const s = 'fill="none" stroke="' + STROKE + '" stroke-width="1.9" stroke-linecap="round"';
    return (
      // ด้านหน้า
      '<circle cx="354" cy="238" r="18" ' + s + '/>' +
      '<rect x="330" y="284" width="48" height="114" rx="12" ' + s + '/>' +
      '<path d="M326 300 Q311 350 298 402 M382 300 Q397 350 410 402" ' + s + '/>' +
      '<path d="M337 398 V524 M371 398 V524 M354 405 V524" ' + s + '/>' +
      // ด้านหลัง
      '<circle cx="546" cy="238" r="18" ' + s + '/>' +
      '<rect x="522" y="284" width="48" height="114" rx="14" ' + s + '/>' +
      '<path d="M516 292 Q500 342 490 404 M576 292 Q592 342 602 404" ' + s + '/>' +
      '<path d="M528 398 V524 M564 398 V524 M546 405 V524" ' + s + '/>'
    );
  }

  function labels() {
    return App.data.body.views.map(function (v) {
      return '<text x="' + v.cx + '" y="546" text-anchor="middle" font-size="13" font-weight="600" fill="#1d1919">' + v.label + '</text>';
    }).join('');
  }

  function dashed(c) {
    return '<circle class="shape" cx="' + c.cx + '" cy="' + c.cy + '" r="' + c.r + '" fill="#ffffff" fill-opacity="0.01" stroke="#7d768a" stroke-width="1.3" stroke-dasharray="3 3"/>';
  }

  function filled(c, color) {
    return '<circle class="shape" cx="' + c.cx + '" cy="' + c.cy + '" r="' + c.r + '" fill="' + color + '" stroke="' + color + '" stroke-width="1"/>';
  }

  function regionsInput(selected) {
    return App.data.body.regions.map(function (reg) {
      const on = !!selected[reg.id];
      const shapes = reg.circles.map(function (c) {
        return on ? filled(c, '#b83227') : dashed(c);
      }).join('');
      return '<g class="hit" role="button" tabindex="0" aria-pressed="' + on + '" aria-label="' + reg.id + '" data-action="body" data-id="' + reg.id + '"><title>' + reg.id + '</title>' + shapes + '</g>';
    }).join('');
  }

  function regionsSummary(counts) {
    const max = Math.max.apply(null, Object.values(counts).concat([1]));
    return App.data.body.regions.map(function (reg) {
      const n = counts[reg.id] || 0;
      return reg.circles.map(function (c) {
        if (!n) return dashed(c);
        const fs = c.r >= 16 ? 11 : 10;
        return filled(c, App.ui.heat(n / max)) +
          '<text x="' + c.cx + '" y="' + (c.cy + fs * 0.36) + '" text-anchor="middle" font-size="' + fs + '" font-weight="700" fill="#fff">' + n + '</text>';
      }).join('');
    }).join('');
  }

  App.bodyMap = {
    render: function (opts) {
      const inner = opts.mode === 'summary' ? regionsSummary(opts.counts || {}) : regionsInput(opts.selected || {});
      return '<div class="flex justify-center">' +
        '<svg viewBox="' + App.data.body.viewBox + '" class="w-full max-w-[330px]" role="img" aria-label="แผนภาพร่างกายด้านหน้าและด้านหลัง">' +
        figure() + inner + labels() +
        '</svg></div>';
    },

    // แถวรายละเอียดใต้แผนภาพ (Part C)
    details: function (msd) {
      const d = App.data.msd;
      const ui = App.ui;
      const rows = App.data.body.regions.filter(function (r) { return msd[r.id]; }).map(function (r) {
        const v = msd[r.id];
        function select(field, cfg) {
          return '<label class="flex flex-col text-[12px] text-muted">' + cfg.label +
            '<select class="msd-select mt-0.5 text-ink" data-msd="' + field + '" data-id="' + r.id + '">' +
            cfg.options.map(function (o) { return '<option' + (o === v[field] ? ' selected' : '') + '>' + o + '</option>'; }).join('') +
            '</select></label>';
        }
        return '<div class="flex flex-wrap items-end justify-between gap-3 py-1.5">' +
          '<span class="pb-1 text-[13px] font-medium">' + ui.esc(r.id) + '</span>' +
          '<div class="flex items-end gap-2">' +
          select('y', d.year) + select('w', d.week) +
          '<label class="flex flex-col text-[12px] text-muted">' + d.sev.label +
          '<input type="number" min="' + d.sev.min + '" max="' + d.sev.max + '" value="' + ui.esc(v.s) + '" class="mt-0.5 h-10 w-[4.5rem] rounded-lg border border-line bg-cream px-2 text-[14px] text-ink outline-none focus:border-blood/50" data-msd="s" data-id="' + r.id + '">' +
          '</label></div></div>';
      }).join('');
      return rows ? '<div class="mt-3">' + rows + '</div>' : '';
    }
  };
})();
