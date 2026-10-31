// แท็บรายคน: รายการคำตอบ (ใหม่สุดก่อน) และคำตอบเต็มของแต่ละคน (คืน HTML string ไม่แตะ DOM)
window.App = window.App || {};
App.adminViews = App.adminViews || {};

(function () {
  const ui = App.ui;
  const S = App.adminStats;

  function T() { return App.data.admin; }
  function own(o, k) { return !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k); }
  function roleName(r) { return r === 'donor' ? T().donorTab : T().staffTab; }
  function srcName(src) { return src === 1 ? T().fallback : T().direct; }
  function heading(text) { return '<h2 class="mb-3 text-[17px] font-bold">' + ui.esc(text) + '</h2>'; }
  function muted(text) { return '<p class="text-[13px] text-muted">' + ui.esc(text) + '</p>'; }
  function backButton() { return ui.secondaryButton(T().back, { action: 'peopleback' }); }

  function navButton(label, action, disabled) {
    return '<button type="button" class="rounded-full border border-line bg-white px-4 py-2 text-[14px] transition-colors hover:border-blood/40 disabled:cursor-not-allowed disabled:opacity-40" ' +
      ui.attrs({ action: action }) + (disabled ? ' disabled' : '') + '>' + ui.esc(label) + '</button>';
  }

  function peopleList(state) {
    const t = T();
    const filters = '<div class="mb-4 flex flex-wrap gap-2">' + [['', t.all], ['staff', t.staffTab], ['donor', t.donorTab]].map(function (f) {
      return ui.pill(ui.esc(f[1]), (state.role || '') === f[0], { action: 'prole', value: f[0] });
    }).join('') + '</div>';
    let body;
    if (state.error) body = '<p class="text-[13px] font-medium text-blood" role="alert">' + ui.esc(t.error) + '</p>';
    else if (!state.rows) body = '';
    else if (!state.rows.length) body = muted(t.empty);
    else {
      body = '<div class="overflow-x-auto rounded-xl border border-line bg-white"><table class="w-full text-[13.5px]">' +
        '<thead><tr class="border-b border-line text-left text-muted">' +
        [t.colId, t.colTime, t.colRole, t.colSrc].map(function (c) { return '<th scope="col" class="px-3 py-2 font-medium">' + ui.esc(c) + '</th>'; }).join('') +
        '</tr></thead><tbody>' + state.rows.map(function (r) {
          return '<tr class="cursor-pointer border-b border-line last:border-b-0 hover:bg-cream" ' + ui.attrs({ action: 'person', id: r.id }) + '>' +
            '<td class="px-3 py-2"><button type="button" class="font-semibold text-blood underline underline-offset-2" ' + ui.attrs({ action: 'person', id: r.id }) + '>#' + ui.esc(r.id) + '</button></td>' +
            '<td class="px-3 py-2 tabular-nums">' + ui.esc(S.bangkokTime(r.created)) + '</td>' +
            '<td class="px-3 py-2">' + ui.esc(roleName(r.role)) + '</td>' +
            '<td class="px-3 py-2">' + ui.esc(srcName(r.src)) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    const nav = '<div class="mt-3 flex gap-2">' +
      navButton(t.newer, 'pnewer', !(state.stack && state.stack.length)) +
      navButton(t.older, 'polder', state.next === null || state.next === undefined) + '</div>';
    return heading(t.tabs.people) + filters + body + nav;
  }

  // ---------- คำตอบเต็มของ 1 คน ----------
  function answer(item, v) {
    const t = T();
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) return ui.esc(t.blank);
    if (item.type === 'scale') {
      const opt = item.options.filter(function (o) { return o.value === v; })[0];
      return ui.esc(opt ? opt.label : v);
    }
    if (item.type === 'multi' || item.type === 'rank') {
      if (!Array.isArray(v)) return ui.esc(v);
      const tag = item.type === 'rank' ? 'ol' : 'ul';
      return '<' + tag + ' class="' + (tag === 'ol' ? 'list-decimal' : 'list-disc') + ' space-y-0.5 pl-5">' +
        v.map(function (x) { return '<li>' + ui.esc(x) + '</li>'; }).join('') + '</' + tag + '>';
    }
    if (item.type === 'textarea') return '<span class="whitespace-pre-wrap break-words">' + ui.esc(v) + '</span>';
    return ui.esc(v);
  }

  function table(cols, rows, minW) {
    return '<div class="overflow-x-auto"><table class="w-full text-[13px] ' + (minW || '') + '"><thead><tr class="text-left text-muted">' +
      cols.map(function (c) { return '<th scope="col" class="pb-1 pr-3 font-medium">' + ui.esc(c) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.map(function (r) {
        return '<tr><th scope="row" class="py-1 pr-3 text-left font-normal">' + ui.esc(r[0]) + '</th>' +
          r.slice(1).map(function (c) { return '<td class="py-1 pr-3 align-top">' + ui.esc(c) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function bodyPart(data) {
    const t = T();
    const msd = own(data, 'msd') ? data.msd : {};
    const rows = App.data.body.regions.filter(function (reg) { return own(msd, reg.id); }).map(function (reg) {
      const e = msd[reg.id] || {};
      return [reg.id, e.y || t.blank, e.w || t.blank, e.s === undefined ? t.blank : e.s];
    });
    if (!rows.length) return muted(t.noPain);
    return table([t.colRegion, App.data.msd.year.label, App.data.msd.week.label, t.colSevOne], rows);
  }

  function busPart(data) {
    const t = T();
    const map = own(data, 'map') ? data.map : {};
    const rows = Object.keys(map).map(function (id) {
      const e = map[id] || {};
      const area = App.data.findArea(id);
      const list = function (a) { return Array.isArray(a) && a.length ? a.join(', ') : t.blank; };
      return [area ? area.label : id, list(e.t), list(e.p), e.sev === undefined ? t.blank : e.sev, e.n || t.blank];
    });
    if (!rows.length) return muted(t.noProblem);
    return table([t.colPoint, t.colType, t.colPart, t.colSevOne, t.colNote], rows, 'min-w-[600px]'); // กว้างพอให้อ่านได้ บนมือถือเลื่อนแนวนอน
  }

  function person(row) {
    const t = T();
    if (!row) return heading(t.tabs.people) + '<p class="mb-4 text-[14px]">' + ui.esc(t.notFound) + '</p>' + backButton();
    const data = row.data || {};
    const answers = own(data, 'answers') ? data.answers : {};
    const sections = App.data.sections[row.role] || [];
    const head = '<div class="mb-4 flex flex-wrap items-center justify-between gap-3">' +
      '<p class="text-[14px]"><span class="font-semibold">#' + ui.esc(row.id) + '</span> · ' + ui.esc(S.bangkokTime(row.created)) +
      ' · ' + ui.esc(roleName(row.role)) + ' · ' + ui.esc(srcName(row.src)) + '</p>' + backButton() + '</div>';
    const cards = sections.map(function (sec) {
      let inner = '';
      if (sec.component === 'bodyMap') inner += bodyPart(data);
      if (sec.component === 'busMap') inner += busPart(data);
      if (sec.items.length) {
        inner += '<dl class="space-y-3">' + sec.items.map(function (it) {
          return '<div><dt class="text-[13px] text-muted">' + ui.esc(it.label) + '</dt>' +
            '<dd class="mt-0.5 text-[14px]">' + answer(it, own(answers, it.key) ? answers[it.key] : undefined) + '</dd></div>';
        }).join('') + '</dl>';
      }
      return ui.card(ui.cardTitle(sec.title) + '<div class="space-y-3">' + inner + '</div>');
    }).join('');
    return heading(t.tabs.people) + head + '<div class="space-y-4">' + cards + '</div>';
  }

  App.adminViews.peopleList = peopleList;
  App.adminViews.person = person;
})();
