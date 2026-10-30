// ผังรถ Blood Collection Area
// mode 'input'   : แตะโซน/เก้าอี้เพื่อบันทึกจุดปัญหา (Part D) — วงกลม = คะแนนความรุนแรง
// mode 'summary' : heatmap — วงกลม = จำนวนผู้ระบุ, สีเข้ม = คะแนนเฉลี่ยสูง
window.App = window.App || {};

(function () {
  const GRID = '#8f889c';

  function badge(cx, cy, value) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="12" fill="#fff" stroke="#b83227" stroke-width="1.6"/>' +
      '<text x="' + cx + '" y="' + (cy + 4.3) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#b83227">' + value + '</text>';
  }

  function area(a, state) {
    const chair = a.kind === 'chair';
    const fill = state.color || a.fill;
    const stroke = state.open ? 'stroke="#b83227" stroke-width="2.5"' : 'stroke="' + GRID + '" stroke-width="1.2" stroke-dasharray="4 3"';
    let g = '<rect class="shape" x="' + a.x + '" y="' + a.y + '" width="' + a.w + '" height="' + a.h + '" rx="' + (chair ? 12 : 8) + '" fill="' + fill + '" ' + stroke + '/>';
    if (chair) {
      g += '<rect x="' + (a.x + a.w + 1) + '" y="' + (a.y + (a.h - 20) / 2) + '" width="13" height="20" rx="2" fill="#fff" stroke="' + GRID + '" stroke-width="1.2"/>';
    }
    g += '<text x="' + (a.x + a.w / 2) + '" y="' + (a.y + a.h / 2 + 5) + '" text-anchor="middle" font-size="' + (chair ? 15 : 14) + '" fill="#2b2222" pointer-events="none">' + App.ui.esc(a.label) + '</text>';
    if (state.badge != null) {
      g += badge(chair ? a.x + a.w + 6 : a.x + a.w - 6, a.y + 2, state.badge);
    }
    if (state.interactive) {
      return '<g class="hit" role="button" tabindex="0" aria-label="' + App.ui.esc(a.title) + '" data-action="zone" data-id="' + a.id + '"><title>' + App.ui.esc(a.title) + '</title>' + g + '</g>';
    }
    return '<g>' + g + '</g>';
  }

  function areaState(a, opts) {
    if (opts.mode === 'summary') {
      const h = (opts.heat || {})[a.id];
      if (!h) return {};
      return { color: App.ui.heat((h.avg - 2) / 2.5), badge: h.count };
    }
    const e = (opts.entries || {})[a.id];
    const st = { interactive: true, open: opts.openId === a.id };
    if (e && !e.tmp) {
      st.color = App.ui.heat((e.sev - 1) / 4);
      st.badge = e.sev;
    }
    return st;
  }

  App.busMap = {
    render: function (opts) {
      const b = App.data.bus;
      const o = b.outline;
      const areas = b.areas.map(function (a) { return area(a, areaState(a, opts)); }).join('');
      return '<div>' +
        '<div class="mb-1 flex justify-between px-1 text-[12px] text-muted"><span>' + b.front + '</span><span>' + b.rear + '</span></div>' +
        '<svg viewBox="' + b.viewBox + '" class="block w-full" role="img" aria-label="ผังพื้นที่เจาะเก็บโลหิตบนรถ">' +
        '<rect x="' + o.x + '" y="' + o.y + '" width="' + o.w + '" height="' + o.h + '" rx="' + o.rx + '" fill="#fff" stroke="#6b6380" stroke-width="1.6"/>' +
        areas +
        '</svg>' +
        App.busMap.legend() +
        '</div>';
    },

    legend: function () {
      const b = App.data.bus;
      const items = b.legendOrder.map(function (id) { return App.data.findArea(id).title; }).concat([b.tableNote]);
      return '<ul class="mt-4 grid grid-cols-1 gap-x-6 text-[12.5px] leading-[1.75] sm:grid-cols-2">' +
        items.map(function (t) { return '<li>' + App.ui.esc(t) + '</li>'; }).join('') +
        '</ul>';
    },

    // ฟอร์มบันทึกจุด (เปิดเมื่อแตะโซน/เก้าอี้)
    form: function (id, entry) {
      const ui = App.ui;
      const f = App.data.zoneForm;
      const a = App.data.findArea(id);
      const e = entry || { t: [], p: [], sev: f.severity.default, n: '' };

      function multi(field, cfg) {
        return ui.field(cfg.label, ui.pillGroup(cfg.options.map(function (o) {
          return ui.pill(ui.esc(o), (e[field] || []).indexOf(o) >= 0, { action: 'zlist', field: field, value: o });
        }).join('')));
      }

      let html = '<p class="font-semibold">' + ui.esc(a.title) + '</p>';
      html += multi('t', f.types);
      if (a.kind === 'chair') html += multi('p', f.parts);
      html += ui.field(f.severity.label, ui.pillGroup(f.severity.options.map(function (o) {
        return ui.pill(o.label, e.sev === o.value, { action: 'zsev', value: o.value });
      }).join('')));
      html += ui.field(f.note, ui.input('text', { zfield: 'n' }, e.n));
      html += '<div class="flex flex-wrap gap-2">' +
        ui.primaryButton(f.save, { action: 'zsave' }) +
        ui.secondaryButton(f.remove, { action: 'zdel' }) +
        '</div>';

      return '<div class="mt-4 space-y-4 rounded-xl border border-blood/70 p-4" id="zone-form">' + html + '</div>';
    },

    savedList: function (entries) {
      const f = App.data.zoneForm;
      const saved = Object.keys(entries).filter(function (k) { return !entries[k].tmp; });
      const text = saved.length
        ? saved.map(function (k) { return App.data.findArea(k).label.replace(' →', '') + ' (' + entries[k].sev + ')'; }).join(', ')
        : f.savedEmpty;
      return '<p class="mt-4 text-[13px] text-muted">' + f.savedLabel + ' ' + App.ui.esc(text) + '</p>';
    }
  };
})();
