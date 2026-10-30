// หน้าตัวอย่างสรุปผล (ข้อมูลจำลอง)
window.App = window.App || {};
App.pages = App.pages || {};

(function () {
  const BAR_MAX = 190; // px ของแท่งที่ยาวที่สุด

  function bars(rows) {
    const ui = App.ui;
    const max = Math.max.apply(null, rows.map(function (r) { return r[1]; }));
    return '<ul class="space-y-2.5">' + rows.map(function (r) {
      const w = Math.round((r[1] / max) * BAR_MAX);
      return '<li class="flex items-center text-[13px]">' +
        '<span class="w-[42%] shrink-0 pr-3 sm:w-[205px]">' + ui.esc(r[0]) + '</span>' +
        '<span class="h-[15px] rounded-sm bg-blood" style="width:' + w + 'px;max-width:45%"></span>' +
        '<span class="ml-2">' + r[1] + '</span></li>';
    }).join('') + '</ul>';
  }

  App.pages.summary = {
    render: function () {
      const d = App.data.mockSummary;
      const ui = App.ui;
      return ui.pageTitle(d.title) +
        '<p class="mb-4 text-[13px] text-muted">' + ui.esc(d.warning) + '</p>' +
        '<div class="space-y-4">' +
        ui.card(ui.cardTitle(d.heatTitle) + App.busMap.render({ mode: 'summary', heat: d.heat })) +
        ui.card(ui.cardTitle(d.bodyTitle) + App.bodyMap.render({ mode: 'summary', counts: d.body })) +
        ui.card(ui.cardTitle(d.rankTitle) + bars(d.rank)) +
        '</div>' +
        '<div class="mt-4">' + ui.secondaryButton(d.home, { action: 'home' }).replace('text-[15px] font-medium', 'text-sm font-semibold') + '</div>';
    }
  };
})();
