// ผังพื้นที่เจาะเก็บโลหิตบนรถ (พิกัดใน viewBox 810 × 265)
window.App = window.App || {};
App.data = App.data || {};

(function () {
  const zones = [
    { id: 'Z5', kind: 'zone', label: '⑤ ประตู/บันได', title: '⑤ ประตู / ขั้นบันได · Door & Steps', x: 31, y: 28, w: 100, h: 214, fill: '#e5e1c0' },
    { id: 'Z1', kind: 'zone', label: '① เคาน์เตอร์ข้าง', title: '① เคาน์เตอร์ด้านข้าง อ่างล้างมือ ตู้เก็บ · Side Counter, Sink & Storage', x: 140, y: 28, w: 252, h: 62, fill: '#d6cee9' },
    { id: 'Z3', kind: 'zone', label: '③ ทางเดิน Aisle →', title: '③ ทางเดินภายใน · Aisle', x: 140, y: 102, w: 655, h: 70, fill: '#f3d3d6' },
    { id: 'Z2', kind: 'zone', label: '② เคาน์เตอร์พยาบาล', title: '② เคาน์เตอร์พยาบาล / จุดเตรียมอุปกรณ์ · Nurse Counter & Preparation', x: 140, y: 182, w: 214, h: 60, fill: '#f2c3b4' },
    { id: 'Z4', kind: 'zone', label: '④ ชั่ง/ผสมเลือด', title: '④ เครื่องชั่งและผสมเลือด · Blood Mixer & Scale', x: 365, y: 182, w: 125, h: 60, fill: '#f8efb8' }
  ];

  const chairs = [];
  ['A', 'B'].forEach(function (row) {
    for (let i = 1; i <= 4; i++) {
      const id = row + i;
      chairs.push({
        id: id,
        kind: 'chair',
        label: id,
        title: 'เก้าอี้ ' + id + ' (รวมโต๊ะข้าง) · Chair ' + id,
        x: 506 + (i - 1) * 73,
        y: row === 'A' ? 28 : 182,
        w: 48,
        h: row === 'A' ? 62 : 60,
        fill: '#c9daef'
      });
    }
  });

  App.data.bus = {
    viewBox: '0 0 810 265',
    outline: { x: 10, y: 7, w: 790, h: 250, rx: 34 },
    front: '◄ หน้ารถ Front',
    rear: 'ท้ายรถ Rear ►',
    areas: zones.concat(chairs),
    // ลำดับคำอธิบายใต้ผังตามคลิป (2 คอลัมน์ เรียงซ้าย→ขวา)
    legendOrder: ['Z1', 'Z2', 'Z4', 'Z3', 'Z5', 'A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'],
    tableNote: '▢ ข้างเก้าอี้ = โต๊ะข้าง/ที่วางอุปกรณ์'
  };

  App.data.findArea = function (id) {
    return App.data.bus.areas.find(function (a) { return a.id === id; });
  };
})();
