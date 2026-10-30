// หน้าขอบคุณ + JSON คำตอบ
window.App = window.App || {};
App.pages = App.pages || {};

App.pages.thanks = {
  render: function () {
    const d = App.data.thanks;
    const ui = App.ui;
    return ui.pageTitle(d.title) +
      ui.card(
        '<p class="text-[15px]">' + ui.esc(d.body) + '</p>' +
        '<div class="mt-4 flex flex-wrap gap-2">' +
        ui.primaryButton(d.copy, { action: 'copy' }) +
        ui.secondaryButton(d.restart, { action: 'restart' }) +
        '</div>' +
        '<pre id="answer-json" class="mt-4 whitespace-pre-wrap break-all rounded-lg bg-cream p-3 font-mono text-[12px] leading-relaxed">' + ui.esc(App.store.toJSON()) + '</pre>'
      );
  }
};
