// แท็บคำถามทั้งหมด: สรุปทุกข้อของบทบาทที่เลือก (คืน HTML string ไม่แตะ DOM)
window.App = window.App || {};
App.adminViews = App.adminViews || {};

(function () {
  const ui = App.ui;
  const S = App.adminStats;
  const BAR_MAX = 160;
  const TOP_N = 3;

  function T() { return App.data.admin; }
  function fill(s, vars) { return s.replace(/\{(\w+)\}/g, function (_, k) { return vars[k]; }); }
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function get(o, k) { return own(o, k) ? o[k] : 0; }
  function sum(o) { return Object.keys(o || {}).reduce(function (a, k) { return a + o[k]; }, 0); }
  function note(text) { return '<p class="mt-2 text-[12.5px] text-muted">' + ui.esc(text) + '</p>'; }
  function fmt(x) { return x === null || x === undefined ? T().blank : String(x); }

  // [[ป้าย, จำนวน, ข้อความท้ายแท่ง]] → แท่งแนวนอน (แสดงทุกแถวรวมแถวที่เป็น 0)
  function optBars(rows) {
    const max = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([0])) || 1;
    return '<ul class="space-y-2">' + rows.map(function (r) {
      const w = Math.round((r[1] / max) * BAR_MAX);
      return '<li class="flex items-center text-[13px]">' +
        '<span class="w-[42%] shrink-0 pr-3 sm:w-[220px]">' + ui.esc(r[0]) + '</span>' +
        '<span class="h-[13px] shrink-0 rounded-sm bg-blood" style="width:' + w + 'px;max-width:35%"></span>' +
        '<span class="ml-2 tabular-nums">' + ui.esc(r[2]) + '</span></li>';
    }).join('') + '</ul>';
  }

  function countRows(opts, counts, of) {
    return opts.map(function (o) {
      const label = typeof o === 'object' ? o.label : o;
      const key = String(typeof o === 'object' ? o.value : o);
      const n = get(counts, key);
      return [label, n, n + ' (' + S.pct(n, of) + ')'];
    });
  }

  function choice(item, r) {
    const t = T();
    const counts = own(r.q, item.key) ? r.q[item.key] : {};
    const answered = sum(counts);
    let html = '';
    if (item.type === 'multi') {
      html = optBars(countRows(item.options, counts, r.n)) + note(t.multiNote);
    } else {
      html = optBars(countRows(item.options, counts, answered));
      if (item.type === 'scale') html += note(t.mean + ' ' + fmt(S.freqStats(counts).mean));
    }
    if (item.optional) html += note(fill(t.answeredOf, { n: answered, m: r.n }));
    return html;
  }

  function rank(item, r) {
    const t = T();
    const points = {};
    (r.rank || []).forEach(function (p) { points[p[0]] = p[1]; });
    const rows = item.options.map(function (o) { return [o, get(points, o), get(r.rank1, o)]; })
      .sort(function (a, b) { return b[1] - a[1] || b[2] - a[2]; });
    const max = Math.max.apply(null, rows.map(function (x) { return x[1]; }).concat([0])) || 1;
    return '<table class="w-full text-[13px]"><thead><tr class="text-left text-muted">' +
      '<th scope="col" class="pb-1 font-medium">' + ui.esc(t.option) + '</th>' +
      '<th scope="col" class="pb-1 font-medium">' + ui.esc(t.points) + '</th>' +
      '<th scope="col" class="pb-1 text-right font-medium">' + ui.esc(t.rank1) + '</th></tr></thead><tbody>' +
      rows.map(function (x) {
        return '<tr><th scope="row" class="py-1 pr-3 text-left font-normal">' + ui.esc(x[0]) + '</th>' +
          '<td class="py-1"><span class="inline-block h-[13px] rounded-sm bg-blood align-middle" style="width:' + Math.round((x[1] / max) * 120) + 'px"></span>' +
          '<span class="ml-2 tabular-nums">' + x[1] + '</span></td>' +
          '<td class="py-1 text-right tabular-nums">' + x[2] + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function number(item, r) {
    const t = T();
    const freq = own(r.num, item.key) ? r.num[item.key] : {};
    const st = S.freqStats(freq);
    if (!st.n) return note(t.empty);
    const line = [[t.mean, st.mean], [t.median, st.median], [t.min, st.min], [t.max, st.max]]
      .map(function (p) { return ui.esc(p[0] + ' ' + fmt(p[1])); }).join(' · ');
    return '<p class="mb-2 text-[13px]">' + line + '</p>' +
      optBars(S.bins(freq).map(function (b) { return [b[0], b[1], String(b[1])]; }));
  }

  function textarea(item, r) {
    const t = T();
    return '<p class="flex items-center gap-3 text-[13px]"><span>' + ui.esc(fill(t.commentsN, { n: get(r.text, item.key) })) + '</span>' +
      '<button type="button" class="rounded-full border border-line px-3 py-1 text-[13px] hover:border-blood/40" ' +
      ui.attrs({ action: 'gocomments', key: item.key }) + '>' + ui.esc(t.view) + '</button></p>';
  }

  function head(cols) {
    return '<thead><tr class="text-left text-muted">' + cols.map(function (c, i) {
      return '<th scope="col" class="pb-1 pr-3 font-medium' + (i ? ' text-right' : '') + '">' + ui.esc(c) + '</th>';
    }).join('') + '</tr></thead>';
  }

  function cell(v, left) { return '<td class="py-1 pr-3 tabular-nums' + (left ? '' : ' text-right') + '">' + ui.esc(String(v)) + '</td>'; }

  function bodyTable(r) {
    const t = T();
    const rows = App.data.body.regions.map(function (reg) {
      const m = own(r.msd, reg.id) ? r.msd[reg.id] : { n: 0, y: 0, w: 0, avg: null };
      return '<tr><th scope="row" class="py-1 pr-3 text-left font-normal">' + ui.esc(reg.id) + '</th>' +
        cell(m.n) + cell(m.y) + cell(m.w) + cell(fmt(m.avg)) + '</tr>';
    }).join('');
    return '<div class="overflow-x-auto"><table class="w-full text-[13px]">' +
      head([t.colRegion, t.colPeople, t.colYear, t.colWeek, t.colSev]) + '<tbody>' + rows + '</tbody></table></div>' +
      note(fill(t.noMsdN, { n: r.noMsd }));
  }

  function top(list) {
    return (list || []).slice(0, TOP_N).map(function (p) { return p[0] + ' (' + p[1] + ')'; }).join(', ') || T().blank;
  }

  function busTable(r) {
    const t = T();
    const ids = Object.keys(r.heat).sort(function (a, b) { return r.heat[b].count - r.heat[a].count || (a < b ? -1 : 1); });
    const rows = ids.map(function (id) {
      const area = App.data.findArea(id);
      const z = own(r.zones, id) ? r.zones[id] : { t: [], p: [] };
      return '<tr><th scope="row" class="py-1 pr-3 text-left font-normal">' + ui.esc(area ? area.label : id) + '</th>' +
        cell(r.heat[id].count) + cell(fmt(r.heat[id].avg)) + cell(top(z.t), true) +
        cell(area && area.kind === 'chair' ? top(z.p) : t.blank, true) + '</tr>';
    }).join('');
    return (ids.length
      ? '<div class="overflow-x-auto"><table class="w-full text-[13px]">' +
        head([t.colPoint, t.colPeople, t.colSevAvg, t.colTypes, t.colParts]) + '<tbody>' + rows + '</tbody></table></div>'
      : note(t.empty)) +
      note(fill(t.noMapN, { n: r.noMap }));
  }

  function item(it, r) {
    let inner;
    if (it.type === 'pills' || it.type === 'scale' || it.type === 'multi') inner = choice(it, r);
    else if (it.type === 'rank') inner = rank(it, r);
    else if (it.type === 'number') inner = number(it, r);
    else if (it.type === 'textarea') inner = textarea(it, r);
    else return '';
    return '<div class="border-t border-line pt-3 first:border-t-0 first:pt-0">' +
      '<h3 class="mb-2 text-[14px] font-semibold">' + ui.esc(it.label) + '</h3>' + inner + '</div>';
  }

  function roleTabs(role) {
    const t = T();
    return '<div class="mb-4 flex gap-2">' + ['staff', 'donor'].map(function (k) {
      return ui.pill(ui.esc(k === 'staff' ? t.staffTab : t.donorTab), k === role, { action: 'qrole', value: k });
    }).join('') + '</div>';
  }

  function questions(summary, role) {
    const t = T();
    const r = summary[role];
    let body;
    if (!r.n) {
      body = App.adminViews.emptyNote();
    } else {
      body = '<div class="space-y-4">' + App.data.sections[role].map(function (sec) {
        let inner = '';
        if (sec.component === 'bodyMap') inner += bodyTable(r);
        if (sec.component === 'busMap') inner += busTable(r);
        inner += sec.items.map(function (it) { return item(it, r); }).join('');
        return ui.card(ui.cardTitle(sec.title) + '<div class="space-y-4">' + inner + '</div>');
      }).join('') + '</div>';
    }
    return '<h2 class="mb-3 text-[17px] font-bold">' + ui.esc(t.tabs.questions) + '</h2>' + roleTabs(role) + body;
  }

  App.adminViews.questions = questions;
})();
