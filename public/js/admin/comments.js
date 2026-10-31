// แท็บความคิดเห็น: ข้อความยาวทุกข้อ + หมายเหตุจุดบนผัง (คืน HTML string ไม่แตะ DOM)
window.App = window.App || {};
App.adminViews = App.adminViews || {};

(function () {
  const ui = App.ui;
  const S = App.adminStats;

  function T() { return App.data.admin; }
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }

  // ข้อความยาวตามลำดับในแบบสอบถาม (เจ้าหน้าที่ → ผู้บริจาค) แล้วต่อด้วยหมายเหตุจุดบนผัง
  function commentKeys() {
    const out = [];
    ['staff', 'donor'].forEach(function (role) {
      App.data.sections[role].forEach(function (sec) {
        sec.items.forEach(function (it) {
          if (it.type === 'textarea') out.push({ key: it.key, role: role, label: it.label });
        });
      });
    });
    out.push({ key: 'map', role: null, label: T().mapNotes });
    return out;
  }

  function count(k, summary) {
    if (k.key === 'map') return summary.staff.notes + summary.donor.notes;
    const r = summary[k.role];
    return own(r.text, k.key) ? r.text[k.key] : 0;
  }

  function keyList(state, summary) {
    const t = T();
    return '<ul class="space-y-1.5">' + commentKeys().map(function (k) {
      const on = k.key === state.key;
      const role = k.role ? (k.role === 'staff' ? t.staffTab : t.donorTab) : t.staffTab + '/' + t.donorTab;
      return '<li><button type="button" class="flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2 text-left text-[13px] transition-colors ' +
        (on ? 'border-blood bg-blood/5 font-semibold' : 'border-line bg-white hover:border-blood/40') + '" aria-pressed="' + on + '" ' +
        ui.attrs({ action: 'ckey', key: k.key }) + '>' +
        '<span>' + ui.esc(k.label) + '<span class="block text-[12px] font-normal text-muted">' + ui.esc(role) + '</span></span>' +
        '<span class="shrink-0 tabular-nums" data-count>' + count(k, summary) + '</span></button></li>';
    }).join('') + '</ul>';
  }

  function searchForm(state) {
    const t = T();
    return '<form id="csearch" class="mb-3 flex flex-wrap gap-2" role="search">' +
      '<input type="search" name="q" maxlength="100" value="' + ui.esc(state.q) + '" aria-label="' + ui.esc(t.search) + '" ' +
      'class="h-10 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-[14px] outline-none focus:border-blood/50">' +
      '<button type="submit" class="rounded-lg bg-blood px-4 text-[14px] font-semibold text-white hover:bg-blood-dark">' + ui.esc(t.search) + '</button>' +
      '<button type="button" class="rounded-lg border border-line bg-white px-4 text-[14px] hover:border-blood/40" ' + ui.attrs({ action: 'cclear' }) + '>' + ui.esc(t.clear) + '</button>' +
      '</form>';
  }

  function item(it) {
    const t = T();
    const meta = [it.role === 'donor' ? t.donorTab : t.staffTab, S.bangkokTime(it.created)];
    if (it.zone) {
      const area = App.data.findArea(it.zone);
      meta.push(area ? area.label : it.zone);
    }
    return '<li class="rounded-xl border border-line bg-white p-3">' +
      '<p class="whitespace-pre-wrap break-words text-[14px] leading-relaxed">' + ui.esc(it.text) + '</p>' +
      '<p class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">' +
      '<span>' + ui.esc(meta.join(' · ')) + '</span>' +
      '<button type="button" class="font-medium text-blood underline underline-offset-2" ' + ui.attrs({ action: 'person', id: it.id }) + '>' + ui.esc(t.seePerson) + '</button>' +
      '</p></li>';
  }

  function results(state) {
    const t = T();
    if (state.error) return '<p class="text-[13px] font-medium text-blood" role="alert">' + ui.esc(t.error) + '</p>';
    if (!state.items.length) return state.loading ? '' : '<p class="text-[13px] text-muted">' + ui.esc(t.noComments) + '</p>';
    return '<ul class="space-y-2">' + state.items.map(item).join('') + '</ul>' +
      (state.next !== null && state.next !== undefined
        ? '<div class="mt-3">' + ui.secondaryButton(t.loadMore, { action: 'cmore' }) + '</div>'
        : '');
  }

  function comments(state, summary) {
    const t = T();
    const k = commentKeys().filter(function (x) { return x.key === state.key; })[0];
    return '<h2 class="mb-3 text-[17px] font-bold">' + ui.esc(t.tabs.comments) + '</h2>' +
      '<div class="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">' +
      '<div>' + keyList(state, summary) + '</div>' +
      '<div>' + (k ? '<h3 class="mb-2 text-[14px] font-semibold">' + ui.esc(k.label) + '</h3>' : '') +
      searchForm(state) + results(state) + '</div>' +
      '</div>';
  }

  App.adminViews.commentKeys = commentKeys;
  App.adminViews.comments = comments;
})();
