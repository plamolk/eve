// ผังรถ Blood Collection Area — วาดเป็น SVG ทั้งหมด (ตามแบบ indi.pdf)
// mode 'input'   : แตะโซน/เก้าอี้เพื่อบันทึกจุดปัญหา (Part D) — วงกลม = คะแนนความรุนแรง
// mode 'summary' : heatmap — วงกลม = จำนวนผู้ระบุ, สีเข้ม = คะแนนเฉลี่ยสูง
window.App = window.App || {};

(function () {
  const RED = '#b83227';
  const CHAIR_BLUE = '#5b9bd8';
  const SERIF = "Georgia,'Times New Roman',serif";
  const esc = function (s) { return App.ui.esc(s); };

  // ---------- helpers ----------
  function rect(x, y, w, h, rx, attrs) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '" ' + (attrs || '') + '/>';
  }
  function circle(cx, cy, r, attrs) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" ' + (attrs || '') + '/>';
  }
  function text(x, y, str, attrs) {
    return '<text x="' + x + '" y="' + y + '" ' + (attrs || '') + '>' + esc(str) + '</text>';
  }

  // หมุดตัวเลขสี (ใช้ทั้งบนผังและในการ์ด)
  function pinBadge(n, cx, cy, r) {
    const c = App.data.bus.colors[n];
    return circle(cx, cy, r, 'fill="' + c.fill + '" stroke="' + c.ring + '" stroke-width="3.5"') +
      text(cx, cy + r * 0.42, n, 'text-anchor="middle" font-family="' + SERIF + '" font-size="' + Math.round(r * 1.2) + '" fill="#fff"');
  }

  // ป้ายคะแนน/จำนวน บนจุดที่ตอบแล้ว
  function scoreBadge(cx, cy, value) {
    return '<g class="score" pointer-events="none">' +
      circle(cx, cy, 13, 'fill="#fff" stroke="' + RED + '" stroke-width="2.4"') +
      text(cx, cy + 5, value, 'text-anchor="middle" font-size="14" font-weight="700" fill="' + RED + '"') +
      '</g>';
  }

  function defs() {
    return '<defs>' +
      '<linearGradient id="bm-bg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#ec7564"/><stop offset=".2" stop-color="#e2393a"/><stop offset=".6" stop-color="#d8262c"/><stop offset="1" stop-color="#97192b"/></linearGradient>' +
      '<linearGradient id="bm-gloss" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".14"/></linearGradient>' +
      '<linearGradient id="bm-cushion" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#fff" stop-opacity=".62"/><stop offset=".55" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>' +
      '<linearGradient id="bm-cushion-b" x1="0" y1="1" x2="0" y2="0">' +
      '<stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset=".45" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity=".62"/></linearGradient>' +
      '<linearGradient id="bm-drop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5a52"/><stop offset="1" stop-color="#c8102e"/></linearGradient>' +
      '<linearGradient id="bm-screen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d5ca"/><stop offset=".45" stop-color="#d77a66"/><stop offset="1" stop-color="#b63a2a"/></linearGradient>' +
      '<linearGradient id="bm-mixer" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f24545"/><stop offset="1" stop-color="#c41818"/></linearGradient>' +
      '<linearGradient id="bm-card" gradientUnits="userSpaceOnUse" x1="0" y1="467" x2="0" y2="560">' +
      '<stop offset="0" stop-color="#f9cfda"/><stop offset=".55" stop-color="#f6c3cc"/><stop offset="1" stop-color="#ec9497"/></linearGradient>' +
      '<filter id="bm-lift" x="-10%" y="-40%" width="120%" height="180%"><feDropShadow dx="0" dy="-3" stdDeviation="5" flood-color="#9c2a35" flood-opacity=".35"/></filter>' +
      '<clipPath id="bm-clip"><rect width="1072" height="642" rx="14"/></clipPath>' +
      '</defs>';
  }

  // ---------- ส่วนประกอบคงที่ ----------
  function backdrop(b, hint) {
    let s = rect(0, 0, 1072, 642, 0, 'fill="url(#bm-bg)"');
    // หน้ารถ / ท้ายรถ
    s += '<polygon points="25,52 34,46.5 34,57.5" fill="#fff"/>' + text(46, 59, 'หน้ารถ', 'font-size="19" fill="#fff"');
    s += '<polygon points="1048,52 1039,46.5 1039,57.5" fill="#fff"/>' + text(1031, 59, 'ท้ายรถ', 'text-anchor="end" font-size="19" fill="#fff"');
    // เส้นหมุด (วาดก่อนตัวรถ)
    b.pins.forEach(function (p) {
      const c = b.colors[p.n].fill;
      const y1 = p.cy < p.from ? p.cy + 21 : p.from;
      const y2 = p.cy < p.from ? p.from : p.cy - 21;
      s += '<line x1="' + p.cx + '" y1="' + y1 + '" x2="' + p.cx + '" y2="' + y2 + '" stroke="' + c + '" stroke-width="4"/>';
    });
    // ตัวรถ
    s += rect(24.5, 73, 1025, 289, 34, 'fill="#fff" stroke="#6d7f2b" stroke-width="2"');
    // ถาดแถวเก้าอี้
    b.trays.forEach(function (t) {
      s += rect(t.x, t.y, t.w, t.h, 12, 'fill="#dcecf8" stroke="#7b9cc4" stroke-width="1.3" stroke-dasharray="5 4"');
    });
    b.pins.forEach(function (p) { s += pinBadge(p.n, p.cx, p.cy, 21); });

    // การ์ดคำอธิบาย
    b.cards.forEach(function (c) {
      s += rect(c.x, 467, c.w, 240, 47, 'fill="url(#bm-card)"');
      s += cardRow(c.x, 510.5, c.top);
      s += rect(c.x, 547.5, c.w, 160, 47, 'fill="' + (c.bottom ? '#f8ccd8' : '#fff') + '" filter="url(#bm-lift)"');
      if (c.bottom) s += cardRow(c.x, 594.5, c.bottom);
    });
    if (hint) {
      const h = b.hintBox;
      s += '<text font-size="17" fill="#1d1919">' + b.hint.map(function (line, i) {
        return '<tspan x="' + h.x + '" y="' + (h.y + i * h.lineHeight) + '">' + esc(line) + '</tspan>';
      }).join('') + '</text>';
    }
    return s;
  }

  function cardRow(x, cy, row) {
    return pinBadge(row[0], x + 50, cy, 21) +
      text(x + 85, cy - 5, row[1], 'font-size="14.5" font-weight="600" fill="#4a1f2a"') +
      text(x + 85, cy + 14.5, row[2], 'font-size="14" fill="#5a3a44"');
  }

  // ---------- รายละเอียดในแต่ละโซน ----------
  const decor = {
    Z6: function () {
      return circle(96, 178.5, 20.5, 'fill="#fff" stroke="#bdbd98" stroke-width="1.5"') +
        circle(96, 178.5, 4.5, 'fill="#b3b388"') +
        rect(132, 153.5, 34, 50, 8, 'fill="#fff" stroke="#c5c5a8" stroke-width="1.5"');
    },
    Z7: function () { return ''; },
    Z2: function () {
      const st = 'fill="#fff" stroke="#9a88bd" stroke-width="1.5"';
      return rect(206, 93.5, 101, 55, 7, st) + rect(307.5, 93.5, 61, 55, 7, st) + rect(369, 93.5, 131, 55, 7, st) +
        circle(338, 107.5, 4, 'fill="#9a88bd"') +
        rect(321, 115.5, 34, 22.5, 6, 'fill="#d4c9e9" stroke="#9a88bd" stroke-width="1.3"') +
        rect(508, 102.5, 41, 40.5, 7, st) + rect(556, 97.5, 48, 49, 7, st) +
        '<path d="M580 109.5 C576 116 571 121.5 571 127.5 A9 9 0 0 0 589 127.5 C589 121.5 584 116 580 109.5 Z" fill="url(#bm-drop)"/>';
    },
    Z5: function (set) {
      const ink = set ? '#fff' : '#4a2533';
      return '<line x1="213" y1="250.5" x2="972" y2="250.5" stroke="' + (set ? '#fff' : '#a87a8e') + '" stroke-opacity=".8" stroke-width="1.3" stroke-dasharray="6 5"/>' +
        circle(232, 218.5, 23, 'fill="#f6dbe5"') + circle(232, 218.5, 19, 'fill="#a97b8f"') +
        text(232, 227, '5', 'text-anchor="middle" font-family="' + SERIF + '" font-size="24" fill="#fff"') +
        '<text x="272" y="228" fill="' + ink + '"><tspan font-size="19" font-weight="700">ทางเดิน</tspan><tspan dx="12" font-size="15">Aisle</tspan></text>';
    },
    Z3: function () {
      const st = 'fill="#fff" stroke="#c4594a" stroke-width="1.5"';
      return rect(203.5, 287, 77.5, 55, 7, st) + rect(281.5, 287, 45.5, 55, 7, st) + rect(327.5, 287, 173, 55, 7, st) +
        rect(358, 298.5, 40, 27.5, 4, 'fill="url(#bm-screen)"') + rect(374, 326.5, 8, 4, 1, 'fill="#d0604c"') +
        rect(430.5, 298.5, 27.5, 27.5, 7, 'fill="#fff" stroke="#c4594a" stroke-width="1.2"') +
        rect(465, 299.5, 20, 26.5, 5, 'fill="#fff" stroke="#c4594a" stroke-width="1.2"');
    },
    Z4: function () {
      return circle(543.5, 315, 20.5, 'fill="#fff" stroke="#b6b265" stroke-width="1.5"') +
        circle(543.5, 315, 14, 'fill="none" stroke="#cfcb94" stroke-width="1.2"') +
        '<line x1="540.5" y1="318.5" x2="549" y2="308.5" stroke="#e0302a" stroke-width="2" stroke-linecap="round"/>' +
        rect(573.5, 294.5, 47.5, 41.5, 7, 'fill="#fff" stroke="#b6b265" stroke-width="1.5"') +
        rect(581, 302, 32, 17, 4, 'fill="url(#bm-mixer)"') +
        rect(587, 325, 21, 4.5, 2.2, 'fill="#b3ad5a"');
    }
  };

  // หมายเลข ⑥ ⑦ ในโซนหน้ารถ
  function zoneMark(a) {
    return circle(a.mark.cx, a.mark.cy, 13, 'fill="#6d5f86"') +
      text(a.mark.cx, a.mark.cy + 5.5, a.id.slice(1), 'text-anchor="middle" font-size="16" font-weight="600" fill="#fff"');
  }

  function zone(a, st) {
    const set = !!st.color;
    const fill = set ? st.color : a.fill;
    const stroke = set ? 'stroke="' + RED + '" stroke-width="2"' : 'stroke="' + a.stroke + '" stroke-width="1.3" stroke-dasharray="5 4"';
    return rect(a.x, a.y, a.w, a.h, 12, 'class="frame" fill="' + fill + '" ' + stroke) +
      decor[a.id](set) + (a.mark ? zoneMark(a) : '');
  }

  // เก้าอี้: วาดแบบแถว A แล้วกลับหัวสำหรับแถว B
  function chair(a, st) {
    const base = st.color || CHAIR_BLUE;
    const dark = st.color ? '#8e2218' : '#4a7fb6';
    const flip = a.row === 'B';
    let g = rect(-6, 19.5, 7, 33, 3, 'fill="' + base + '"') + rect(-6, 19.5, 7, 33, 3, 'fill="#000" fill-opacity=".18"') +
      rect(43, 19.5, 7, 33, 3, 'fill="' + base + '"') + rect(43, 19.5, 7, 33, 3, 'fill="#000" fill-opacity=".18"') +
      rect(0, 0, 44, 59, 11, 'fill="' + base + '"') + rect(0, 0, 44, 59, 11, 'fill="url(#bm-gloss)"') +
      rect(9, 6, 26, 10, 5, 'fill="' + base + '"') + rect(9, 6, 26, 10, 5, 'fill="#fff" fill-opacity=".35"') +
      rect(5, 23.5, 34, 28.5, 7, 'fill="' + base + '"') + rect(5, 23.5, 34, 28.5, 7, 'fill="url(#' + (flip ? 'bm-cushion-b' : 'bm-cushion') + ')"') +
      rect(52, 19, 21, 20.5, 4, 'fill="#fff" stroke="' + (st.color ? RED : '#5a7aa8') + '" stroke-width="1.3"');
    // กลับหัวเฉพาะรูปทรง ตัวอักษรยังอ่านตรง
    const shape = flip ? '<g transform="translate(0 59) scale(1 -1)">' + g + '</g>' : g;
    const labelY = flip ? 59 - 37.75 + 6 : 37.75 + 6;
    return '<g transform="translate(' + a.cx + ' ' + a.cy + ')">' + shape +
      text(22, labelY, a.label, 'text-anchor="middle" font-family="' + SERIF + '" font-size="17" font-weight="700" fill="#fff" stroke="' + dark + '" stroke-width=".6" paint-order="stroke"') +
      '</g>';
  }

  function area(a, st) {
    const inner = a.kind === 'chair' ? chair(a, st) : zone(a, st);
    const ring = rect(a.x - 5, a.y - 5, a.w + 10, a.h + 10, 15, 'class="ring" fill="none" stroke="' + RED + '" stroke-width="3"');
    const bx = a.kind === 'chair' ? a.cx + 46 : a.x + a.w - 12;
    const by = a.kind === 'chair' ? (a.row === 'A' ? a.cy + 4 : a.cy + 55) : a.y + 12;
    const badge = st.badge != null ? scoreBadge(bx, by, st.badge) : '';
    const cls = 'area' + (st.interactive ? ' hit' : '') + (st.color ? ' is-set' : '') + (st.open ? ' is-open' : '');
    const body = '<title>' + esc(a.title) + '</title><g class="lift">' + inner + '</g>' + ring + badge;
    if (st.interactive) {
      return '<g class="' + cls + '" role="button" tabindex="0" aria-pressed="' + !!st.open + '" aria-label="' + esc(a.title) + '" data-action="zone" data-id="' + a.id + '">' + body + '</g>';
    }
    return '<g class="' + cls + '">' + body + '</g>';
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
      // วาดโซนก่อน เก้าอี้ทีหลัง (ป้ายคะแนนอยู่บนสุด) และโซนที่เปิดอยู่วาดท้ายสุด
      const list = b.areas.slice().sort(function (x, y) {
        return (x.id === opts.openId) - (y.id === opts.openId);
      });
      const areas = list.map(function (a) { return area(a, areaState(a, opts)); }).join('');
      return '<div>' +
        '<svg viewBox="' + b.viewBox + '" class="bus-svg block w-full" role="group" aria-label="ผังพื้นที่เจาะเก็บโลหิตบนรถ Blood Collection Area" font-family="inherit">' +
        defs() + '<g clip-path="url(#bm-clip)">' + backdrop(b, opts.mode !== 'summary') + areas + '</g>' +
        '</svg>' +
        App.busMap.legend() +
        '</div>';
    },

    legend: function () {
      const b = App.data.bus;
      const items = b.legend.map(function (id) { return App.data.findArea(id).title; });
      return '<ul class="mt-3 grid grid-cols-1 gap-x-6 text-[12.5px] leading-[1.75] sm:grid-cols-2">' +
        items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') +
        '<li class="sm:col-span-2">' + esc(b.tableNote) + '</li>' +
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
        ? saved.map(function (k) { return App.data.findArea(k).label + ' (' + entries[k].sev + ')'; }).join(', ')
        : f.savedEmpty;
      return '<p class="mt-4 text-[13px] text-muted">' + f.savedLabel + ' ' + App.ui.esc(text) + '</p>';
    }
  };
})();
