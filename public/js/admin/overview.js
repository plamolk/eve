// แท็บภาพรวมของหน้าแอดมิน (คืน HTML string ไม่แตะ DOM)
window.App = window.App || {};
App.adminViews = App.adminViews || {};

(function () {
  const ui = App.ui;
  const S = App.adminStats;
  const BAR_MAX = 190; // px ของแท่งที่ยาวที่สุด
  // กราฟรายวัน: ความกว้างต่อวันคงที่ (เกินกล่องเมื่อไหร่ก็เลื่อนแนวนอน)
  const SLOT = 22;
  const BAR = 16;
  const GAP = 2; // ช่องว่างสีพื้นระหว่างส่วนของแท่งซ้อน
  const PLOT = 140;
  const TOP = 18;
  const AXIS = 22;
  const MIN_SLOTS = 7;
  const PAD = 14; // ระยะซ้ายขวา ไม่ให้ป้ายวันที่ถูกตัด

  function T() { return App.data.admin; }

  function emptyNote() {
    return '<p class="text-[13px] text-muted">' + ui.esc(T().empty) + '</p>';
  }

  function bars(rows) {
    if (!rows || !rows.length) return emptyNote();
    const max = Math.max.apply(null, rows.map(function (r) { return r[1]; })) || 1;
    return '<ul class="space-y-2.5">' + rows.map(function (r) {
      const w = Math.round((r[1] / max) * BAR_MAX);
      return '<li class="flex items-center text-[13px]">' +
        '<span class="w-[42%] shrink-0 pr-3 sm:w-[205px]">' + ui.esc(r[0]) + '</span>' +
        '<span class="h-[15px] rounded-sm bg-blood" style="width:' + w + 'px;max-width:45%"></span>' +
        '<span class="ml-2">' + r[1] + '</span></li>';
    }).join('') + '</ul>';
  }

  function quotaPct(n, of) {
    return (Math.round((n / of) * 10000) / 100) + '%';
  }

  function quotaCard(u) {
    const t = T();
    const row = function (label, n, of) {
      return '<li class="flex justify-between"><span>' + ui.esc(label) + '</span><span>' + n.toLocaleString('en-US') + ' / ' + of.toLocaleString('en-US') + ' (' + quotaPct(n, of) + ')</span></li>';
    };
    return ui.card(ui.cardTitle(t.quotaTitle) +
      '<ul class="space-y-1 text-[13px]">' + row(t.quotaWrite, u.rw, u.limits.rw) + row(t.quotaRead, u.rr, u.limits.rr) + '</ul>' +
      '<p class="mt-2 text-[12px] text-muted">' + ui.esc(t.quotaNote) + '</p>');
  }

  function tile(key, label, value, small) {
    return '<div class="rounded-xl border border-line bg-white px-3 py-3" data-stat="' + key + '">' +
      '<p class="text-[12.5px] text-muted">' + ui.esc(label) + '</p>' +
      '<p class="mt-1 font-bold tabular-nums ' + (small ? 'text-[15px]' : 'text-2xl') + '" data-value>' + ui.esc(String(value)) + '</p></div>';
  }

  function dayCount(days, d) {
    const hit = days.filter(function (x) { return x[0] === d; })[0];
    return hit ? hit[1] : 0;
  }

  function tiles(s) {
    const t = T();
    const today = S.bangkokDate(Math.floor(Date.now() / 1000));
    return '<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">' +
      tile('total', t.statTotal, s.staff.n + s.donor.n) +
      tile('staff', t.staffTab, s.staff.n) +
      tile('donor', t.donorTab, s.donor.n) +
      tile('today', t.statToday, dayCount(s.staff.days, today) + dayCount(s.donor.days, today)) +
      tile('src1', t.statSrc1, s.staff.src1 + s.donor.src1) +
      tile('updated', t.updated, s.updated ? S.bangkokTime(s.updated) : t.blank, true) +
      '</div>';
  }

  function legend() {
    const t = T();
    const item = function (cls, label) {
      return '<span class="inline-flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-sm ' + cls + '"></span>' + ui.esc(label) + '</span>';
    };
    return '<div class="mb-2 flex gap-4 text-[12.5px]">' + item('bg-blood', t.staffTab) + item('bg-donor', t.donorTab) + '</div>';
  }

  function dailyChart(s) {
    const t = T();
    const days = S.fillDays(s.staff.days, s.donor.days);
    if (!days.length) return ui.card(ui.cardTitle(t.dailyTitle) + emptyNote());
    const n = days.length;
    const W = Math.max(n, MIN_SLOTS) * SLOT + 2 * PAD;
    const H = TOP + PLOT + AXIS;
    const base = TOP + PLOT;
    const max = Math.max.apply(null, days.map(function (d) { return d[1] + d[2]; })) || 1;
    const every = n <= 14 ? 1 : 7;
    const marks = days.map(function (d, i) {
      const x = PAD + i * SLOT + (SLOT - BAR) / 2;
      const hs = (d[1] / max) * PLOT;
      const hd = (d[2] / max) * PLOT;
      const yS = base - hs;
      const yD = yS - (hs > 0 && hd > 0 ? GAP : 0) - hd;
      const total = d[1] + d[2];
      const label = d[0].slice(8, 10) + '/' + d[0].slice(5, 7);
      const showAxis = i % every === 0;
      return '<g><title>' + ui.esc(d[0] + ' · ' + t.staffTab + ' ' + d[1] + ' · ' + t.donorTab + ' ' + d[2]) + '</title>' +
        '<rect class="fill-blood" x="' + x + '" y="' + yS.toFixed(1) + '" width="' + BAR + '" height="' + hs.toFixed(1) + '"></rect>' +
        '<rect class="fill-donor" x="' + x + '" y="' + yD.toFixed(1) + '" width="' + BAR + '" height="' + hd.toFixed(1) + '"></rect>' +
        (total ? '<text x="' + (x + BAR / 2) + '" y="' + (yD - 4).toFixed(1) + '" text-anchor="middle" class="fill-ink text-[11px]">' + total + '</text>' : '') +
        (showAxis ? '<text x="' + (x + BAR / 2) + '" y="' + (base + 15) + '" text-anchor="middle" class="fill-muted text-[10.5px]">' + label + '</text>' : '') +
        '</g>';
    }).join('');
    const svg = '<svg role="img" aria-label="' + ui.esc(t.dailyTitle) + '" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" class="block">' +
      '<line x1="0" x2="' + W + '" y1="' + base + '" y2="' + base + '" class="stroke-line" stroke-width="1"></line>' + marks + '</svg>';
    return ui.card(ui.cardTitle(t.dailyTitle) + legend() + '<div class="overflow-x-auto">' + svg + '</div>');
  }

  function heatTabs(active) {
    const t = T();
    return '<div class="mb-4 flex gap-2">' + ['staff', 'donor'].map(function (r) {
      return ui.pill(ui.esc(r === 'staff' ? t.staffTab : t.donorTab), r === active, { action: 'heattab', value: r });
    }).join('') + '</div>';
  }

  function overview(s, heatTab) {
    const t = T();
    const r = s[heatTab];
    const staff = s.staff;
    const heat = ui.card(ui.cardTitle(t.heatTitle) + heatTabs(heatTab) +
      (r.n ? App.busMap.render({ mode: 'summary', heat: r.heat }) : emptyNote()));
    const body = ui.card(ui.cardTitle(t.bodyTitle) + (staff.n ? App.bodyMap.render({ mode: 'summary', counts: staff.body }) : emptyNote()));
    const rank = ui.card(ui.cardTitle(t.rankTitle) + (staff.n ? bars(staff.rank) : emptyNote()));
    return '<h2 class="mb-3 text-[17px] font-bold">' + ui.esc(t.tabs.overview) + '</h2>' +
      (s.more ? ui.callout(t.more) : '') +
      '<div class="space-y-4">' + tiles(s) + dailyChart(s) + heat + body + rank + quotaCard(s.usage) + '</div>';
  }

  App.adminViews.bars = bars;
  App.adminViews.emptyNote = emptyNote;
  App.adminViews.overview = overview;
})();
