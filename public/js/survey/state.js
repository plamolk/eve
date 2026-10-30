// สถานะของแอปและคำตอบ
window.App = window.App || {};

(function () {
  function fresh() {
    return {
      screen: 'survey', // survey | thanks
      step: 0,         // index ของส่วน A–F
      role: null,
      answers: {},
      msd: {},         // Part C: { ชื่อส่วน: { y, w, s } }
      map: {},         // Part D: { zoneId: { t, p, sev, n, tmp } }
      openZone: null   // zone ที่เปิดฟอร์มอยู่ใน Part D
    };
  }

  function isEmpty(v) {
    return v === '' || v === null || v === undefined || (Array.isArray(v) && v.length === 0);
  }

  App.state = fresh();

  App.store = {
    reset: function () {
      App.state = fresh();
    },

    setAnswer: function (key, value) {
      if (isEmpty(value)) delete App.state.answers[key];
      else App.state.answers[key] = value;
    },

    // pills แบบเลือกข้อเดียว: กดซ้ำเพื่อยกเลิก
    toggleSingle: function (key, value) {
      const cur = App.state.answers[key];
      App.store.setAnswer(key, cur === value ? '' : value);
    },

    // เลือกได้หลายข้อ: max = จำนวนสูงสุด, only = ตัวเลือกที่ล้างข้ออื่น (เช่น "ไม่มี")
    toggleMulti: function (key, value, max, only) {
      let list = (App.state.answers[key] || []).slice();
      const i = list.indexOf(value);
      if (i >= 0) list.splice(i, 1);
      else if (only && value === only) list = [value];
      else {
        if (only) list = list.filter(function (v) { return v !== only; });
        if (!max || list.length < max) list.push(value);
      }
      App.store.setAnswer(key, list);
    },

    // Part F: กดตามลำดับ กดซ้ำเพื่อเอาออก
    toggleRank: function (key, value, max) {
      const list = (App.state.answers[key] || []).slice();
      const i = list.indexOf(value);
      if (i >= 0) list.splice(i, 1);
      else if (list.length < max) list.push(value);
      App.store.setAnswer(key, list);
    },

    // Part C
    toggleRegion: function (id) {
      const d = App.data.msd;
      if (App.state.msd[id]) delete App.state.msd[id];
      else App.state.msd[id] = { y: d.year.default, w: d.week.default, s: d.sev.default };
    },
    setRegionField: function (id, field, value) {
      if (App.state.msd[id]) App.state.msd[id][field] = value;
    },

    // Part D — สร้าง entry แบบร่าง (tmp:1) เมื่อเริ่มแก้ไขครั้งแรก
    zoneEntry: function (id, create) {
      let e = App.state.map[id];
      if (!e && create) {
        const area = App.data.findArea(id);
        e = { t: [] };
        if (area.kind === 'chair') e.p = [];
        e.sev = App.data.zoneForm.severity.default;
        e.n = '';
        e.tmp = 1;
        App.state.map[id] = e;
      }
      return e;
    },
    toggleZoneList: function (id, field, value) {
      const e = App.store.zoneEntry(id, true);
      const i = e[field].indexOf(value);
      if (i >= 0) e[field].splice(i, 1);
      else e[field].push(value);
    },
    setZoneField: function (id, field, value) {
      App.store.zoneEntry(id, true)[field] = value;
    },
    saveZone: function (id) {
      const e = App.store.zoneEntry(id, true);
      delete e.tmp;
      App.state.openZone = null;
    },
    removeZone: function (id) {
      delete App.state.map[id];
      App.state.openZone = null;
    },

    toJSON: function () {
      const s = App.state;
      return JSON.stringify({ role: s.role, answers: s.answers, msd: s.msd, map: s.map });
    }
  };
})();
