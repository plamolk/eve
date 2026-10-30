// หน้าแรก
window.App = window.App || {};
App.pages = App.pages || {};

App.pages.intro = {
  render: function () {
    const d = App.data.intro;
    const ui = App.ui;
    const roles = d.roles.map(function (r) {
      return ui.pill(r.label, false, { action: 'role', value: r.value });
    }).join('');

    return '<h1 class="mb-4 text-xl font-bold">🩸 ' + ui.esc(d.title) + '</h1>' +
      ui.card(
        '<p class="text-[15px] leading-relaxed">' + ui.esc(d.lead) + '</p>' +
        '<p class="mt-3 text-[13px] text-muted">' + ui.esc(d.note) + '</p>' +
        '<div class="mt-4">' + ui.label(d.roleLabel) + ui.pillGroup(roles) + '</div>' +
        '<p class="mt-4 text-[13px] text-muted">' + ui.esc(d.consent) + '</p>'
      ) +
      '<div class="mt-4">' + ui.secondaryButton(d.summaryButton, { action: 'summary' }).replace('text-[15px] font-medium', 'text-sm font-semibold') + '</div>';
  }
};
