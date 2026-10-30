// ผังพื้นที่เจาะเก็บโลหิตบนรถ (วาดใหม่เป็น SVG ตามแบบ indi.pdf)
// พิกัดทั้งหมดอยู่ใน viewBox 1072 × 642
// x, y, w, h = กรอบของโซน (ใช้ทั้งวาดและเป็นพื้นที่กด)
window.App = window.App || {};
App.data = App.data || {};

(function () {
  const zones = [
    { id: 'Z6', kind: 'zone', label: '⑥ หน้ารถ (บน)', title: '⑥ พื้นที่ด้านหน้ารถ (ซ้ายบน) · Front area, upper', x: 53, y: 85.5, w: 136.5, h: 186.5, fill: '#f4f4e1', stroke: '#c5c5a8', mark: { cx: 120, cy: 241 } },
    { id: 'Z7', kind: 'zone', label: '⑦ หน้ารถ (ล่าง)', title: '⑦ พื้นที่ด้านหน้ารถ (ซ้ายล่าง) · Front area, lower', x: 53, y: 279.5, w: 136.5, h: 71.5, fill: '#f4f4e1', stroke: '#c5c5a8', mark: { cx: 120, cy: 315 } },
    { id: 'Z2', kind: 'zone', label: '② เคาน์เตอร์ข้าง', title: '② เคาน์เตอร์ด้านข้าง อ่างล้างมือ ตู้เก็บ · Side Counter, Sink & Storage', x: 196, y: 85.5, w: 418.5, h: 71.5, fill: '#d4c9e9', stroke: '#9a88bd' },
    { id: 'Z5', kind: 'zone', label: '⑤ ทางเดิน', title: '⑤ ทางเดินภายในรถ · Aisle', x: 196, y: 163.5, w: 815, h: 108.5, fill: '#f8cfdb', stroke: '#b98a9b' },
    { id: 'Z3', kind: 'zone', label: '③ เคาน์เตอร์พยาบาล', title: '③ เคาน์เตอร์พยาบาล / จุดเตรียมอุปกรณ์ · Nurse Counter & Preparation', x: 196, y: 279.5, w: 312.5, h: 70, fill: '#f4927b', stroke: '#e06d55' },
    { id: 'Z4', kind: 'zone', label: '④ ชั่ง/ผสมเลือด', title: '④ เครื่องชั่งและผสมเลือด · Blood Mixer & Scale', x: 515.5, y: 279.5, w: 113, h: 71.5, fill: '#f6f3a9', stroke: '#c4c070' }
  ];

  // ① เก้าอี้บริจาค 8 ตัว — cx = ขอบซ้ายของตัวเก้าอี้, cy = ขอบบน
  // แถว B วาดกลับหัว (พนักศีรษะอยู่ด้านล่าง) ตามแบบ
  const CHAIR_X = [652, 744.5, 837, 929.5];
  const chairs = [];
  ['A', 'B'].forEach(function (row) {
    CHAIR_X.forEach(function (cx, i) {
      const id = row + (i + 1);
      const cy = row === 'A' ? 91 : 285;
      chairs.push({
        id: id,
        kind: 'chair',
        row: row,
        label: id,
        title: '① เก้าอี้ ' + id + ' (รวมโต๊ะข้าง) · Donor Chair ' + id,
        cx: cx,
        cy: cy,
        // กรอบรวมที่วางแขนและโต๊ะข้าง
        x: cx - 6, y: cy, w: 79, h: 59
      });
    });
  });

  App.data.bus = {
    viewBox: '0 0 1072 642',
    areas: zones.concat(chairs),
    // ถาดพื้นหลังของแถวเก้าอี้ (กดไม่ได้ — กดที่เก้าอี้แต่ละตัว)
    trays: [
      { x: 637, y: 85.5, w: 374, h: 71.5 },
      { x: 637, y: 279.5, w: 374, h: 71.5 }
    ],
    // หมุดหมายเลขบนผัง: from = จุดที่เส้นแตะโซน
    pins: [
      { n: 2, cx: 405.5, cy: 33, from: 85.5 },
      { n: 1, cx: 823.5, cy: 33, from: 85.5 },
      { n: 3, cx: 348, cy: 402, from: 349.5 },
      { n: 4, cx: 573.5, cy: 402, from: 351 }
    ],
    colors: {
      1: { fill: '#7aa7c9', ring: '#d8ecf6' },
      2: { fill: '#9b92c6', ring: '#d4cdee' },
      3: { fill: '#d9604c', ring: '#f7a58f' },
      4: { fill: '#a19c22', ring: '#f3f09a' },
      5: { fill: '#a97b8f', ring: '#f4cfdc' }
    },
    // การ์ดคำอธิบายด้านล่างของผัง
    cards: [
      { x: 23.5, w: 318, top: [1, 'เก้าอี้บริจาคโลหิต (A1–A4, B1–B4)', 'Donor Chairs · 8 chairs'], bottom: [4, 'เครื่องชั่งและผสมเลือด', 'Blood Mixer & Scale'] },
      { x: 365, w: 317.5, top: [2, 'เคาน์เตอร์ด้านข้าง อ่างล้างมือ ตู้เก็บ', 'Side Counter, Sink & Storage'], bottom: [5, 'ทางเดินภายในรถ', 'Aisle'] },
      { x: 704, w: 345, top: [3, 'เคาน์เตอร์พยาบาล / จุดเตรียมอุปกรณ์', 'Nurse Counter & Preparation'], bottom: null }
    ],
    // ข้อความในการ์ดขาวมุมขวาล่าง (เฉพาะโหมดตอบแบบสอบถาม)
    hint: ['แตะโซนหรือเก้าอี้บนผัง', 'ที่เจอปัญหาเพื่อตอบ', 'สีแดง = จุดที่ตอบแล้ว'],
    hintBox: { x: 728, y: 582, lineHeight: 23 },
    // คำอธิบายใต้ผัง (โซน 1–5 อยู่ในการ์ดบนผังแล้ว)
    legend: ['Z6', 'Z7'],
    tableNote: '▢ ข้างเก้าอี้ = โต๊ะข้าง/ที่วางอุปกรณ์ (นับรวมกับเก้าอี้ตัวนั้น)'
  };

  App.data.findArea = function (id) {
    return App.data.bus.areas.find(function (a) { return a.id === id; });
  };
})();
