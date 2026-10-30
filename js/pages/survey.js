// แบบสอบถามทีละส่วน (ชุดคำถามขึ้นกับ role: staff | donor)
window.App = window.App || {};
App.pages = App.pages || {};

(function () {
  const ui = App.ui;

  function item(q) {
    const a = App.state.answers;
    switch (q.type) {
      case 'pills':
        return ui.field(q.label, ui.pillGroup(q.options.map(function (o) {
          return ui.pill(ui.esc(o), a[q.key] === o, { action: 'pick', key: q.key, value: o });
        }).join('')), q.large);

      case 'scale':
        return ui.field(q.label, ui.pillGroup(q.options.map(function (o) {
          const label = '<span class="mr-1.5 text-[17px] leading-none" aria-hidden="true">' + o.emoji + '</span>' + ui.esc(o.label);
          return ui.pill(label, a[q.key] === o.value, { action: 'scale', key: q.key, value: o.value }, 'inline-flex items-center');
        }).join('')));

      case 'multi': {
        const list = a[q.key] || [];
        const full = q.max && list.length >= q.max;
        return ui.field(q.label, ui.pillGroup(q.options.map(function (o) {
          const on = list.indexOf(o) >= 0;
          const data = { action: 'multi', key: q.key, value: o };
          if (q.max) data.max = q.max;
          if (q.only) data.only = q.only;
          return ui.pill(ui.esc(o), on, data, !on && full ? 'opacity-50' : '');
        }).join('')));
      }

      case 'rank': {
        const list = a[q.key] || [];
        return ui.field(q.label, ui.pillGroup(q.options.map(function (o) {
          const n = list.indexOf(o) + 1;
          const num = n ? '<span class="mr-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-bold text-blood">' + n + '</span>' : '';
          return ui.pill(num + ui.esc(o), n > 0, { action: 'rank', key: q.key, value: o, max: q.max }, 'inline-flex items-center');
        }).join('')));
      }

      case 'number':
        return ui.field(q.label, ui.input('number', { key: q.key }, a[q.key], '', ''));

      case 'textarea':
        return ui.field(q.label, ui.textarea({ key: q.key }, a[q.key]));
    }
    return '';
  }

  function component(sec) {
    const s = App.state;
    if (sec.component === 'bodyMap') {
      return App.bodyMap.render({ mode: 'input', selected: s.msd }) + App.bodyMap.details(s.msd);
    }
    if (sec.component === 'busMap') {
      return App.busMap.render({ mode: 'input', entries: s.map, openId: s.openZone }) +
        (s.openZone ? App.busMap.form(s.openZone, s.map[s.openZone]) : '') +
        App.busMap.savedList(s.map);
    }
    return '';
  }

  App.pages.survey = {
    render: function () {
      const sections = App.data.sections[App.state.role];
      const step = App.state.step;
      const sec = sections[step];
      const last = step === sections.length - 1;
      const pct = (step / sections.length) * 100;
      const nav = App.data.nav;

      const progress = '<div class="mb-4 h-1.5 overflow-hidden rounded-full bg-track" role="progressbar" aria-valuemin="0" aria-valuemax="' + sections.length + '" aria-valuenow="' + step + '">' +
        '<div class="h-full rounded-full bg-blood transition-[width] duration-300" style="width:' + pct + '%"></div></div>';

      const body = ui.cardTitle(sec.title) +
        (sec.note ? ui.callout(sec.note) : '') +
        component(sec) +
        (sec.items.length ? '<div class="' + (sec.component ? 'mt-5 ' : '') + 'space-y-5">' + sec.items.map(item).join('') + '</div>' : '');

      return progress + ui.card(body) +
        '<div class="mt-4 flex items-center justify-between">' +
        ui.secondaryButton(nav.back, { action: 'back' }) +
        ui.primaryButton(last ? nav.submit : nav.next, { action: last ? 'submit' : 'next' }) +
        '</div>';
    }
  };
})();
