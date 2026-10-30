// จุดบนแผนภาพร่างกาย 9 ส่วนตาม Nordic Questionnaire
// จุดที่มีซ้าย/ขวานับเป็นส่วนเดียวกัน (ในหน้าสรุปผลของคลิป ทั้งคู่แสดงตัวเลขเท่ากันเสมอ)
window.App = window.App || {};
App.data = App.data || {};

App.data.body = {
  viewBox: '270 212 360 340',
  views: [
    { id: 'front', label: 'ด้านหน้า', cx: 354 },
    { id: 'back', label: 'ด้านหลัง', cx: 546 }
  ],
  regions: [
    { id: 'คอ', circles: [{ cx: 354, cy: 270, r: 12 }] },
    { id: 'ไหล่', circles: [{ cx: 318, cy: 296, r: 13 }, { cx: 390, cy: 296, r: 13 }] },
    { id: 'ข้อศอก', circles: [{ cx: 306, cy: 350, r: 12 }, { cx: 402, cy: 350, r: 12 }] },
    { id: 'ข้อมือ/มือ', circles: [{ cx: 297, cy: 404, r: 12 }, { cx: 411, cy: 404, r: 12 }] },
    { id: 'สะโพก/ต้นขา', circles: [{ cx: 338, cy: 384, r: 13 }, { cx: 370, cy: 384, r: 13 }] },
    { id: 'เข่า', circles: [{ cx: 338, cy: 460, r: 12 }, { cx: 370, cy: 460, r: 12 }] },
    { id: 'ข้อเท้า/เท้า', circles: [{ cx: 338, cy: 520, r: 12 }, { cx: 370, cy: 520, r: 12 }] },
    { id: 'หลังส่วนบน', circles: [{ cx: 546, cy: 315, r: 19 }] },
    { id: 'หลังส่วนล่าง', circles: [{ cx: 546, cy: 373, r: 19 }] }
  ]
};
