// ข้อความที่ใช้ร่วมกัน (มาตรวัด คำอธิบายผัง ฟอร์มจุด ปุ่ม) — ชุดคำถามแยกอยู่ใน staff.js / donor.js
window.App = window.App || {};
App.data = App.data || {};

(function () {
  const FREQ = ['ไม่เคย', 'นาน ๆ ครั้ง', 'บางครั้ง', 'บ่อย', 'เกือบทุกครั้ง'];

  // มาตรวัด 1–5 แบบมีอีโมจิ (เก็บคำตอบเป็นตัวเลข)
  const AGREE = [
    { value: 1, emoji: '😣', label: '1 ไม่เห็นด้วยอย่างยิ่ง' },
    { value: 2, emoji: '😕', label: '2' },
    { value: 3, emoji: '😐', label: '3' },
    { value: 4, emoji: '🙂', label: '4' },
    { value: 5, emoji: '😄', label: '5 เห็นด้วยอย่างยิ่ง' }
  ];
  const ANXIETY = [
    { value: 1, emoji: '😌', label: '1 ไม่กังวล' },
    { value: 2, emoji: '🙂', label: '2' },
    { value: 3, emoji: '😐', label: '3' },
    { value: 4, emoji: '😟', label: '4' },
    { value: 5, emoji: '😰', label: '5 กังวลมาก' }
  ];

  const MAP_NOTE = 'วิธีตอบ: แตะโซนหรือเก้าอี้ที่เจอปัญหา แล้วเลือกประเภท ระดับความรุนแรง (ตัวเลขในวงกลมคือคะแนน สีเข้ม = รุนแรงมาก) แล้วกด "บันทึกจุดนี้" หากไม่พบปัญหาข้ามได้เลย';

  App.data.scales = { FREQ: FREQ, AGREE: AGREE, ANXIETY: ANXIETY };
  App.data.mapNote = MAP_NOTE;

  // type: pills | multi | scale | number | textarea | rank
  // multi: max = เลือกได้ไม่เกินกี่ข้อ, only = ตัวเลือกที่เลือกแล้วล้างข้ออื่น (เช่น "ไม่มี")
  // ชุดคำถามของแต่ละบทบาทอยู่ใน staff.js / donor.js

  // Part D — ฟอร์มบันทึกจุดบนผัง (ใช้ทั้งเจ้าหน้าที่และผู้บริจาค)
  App.data.zoneForm = {
    types: { label: 'ประเภทปัญหา (เลือกได้หลายข้อ)', options: ['คับแคบ', 'เอื้อมยาก', 'ต้องก้มหรือบิดตัว', 'ไม่มั่นคง', 'สะดุดสาย', 'ทำความสะอาดยาก', 'ดูน่ากลัว/แออัด', 'อื่น ๆ'] },
    parts: { label: 'ปัญหาอยู่ที่ส่วนไหนของเก้าอี้', options: ['พนักพิง', 'เบาะนั่ง', 'ที่วางแขน', 'ที่วางขา/เท้า', 'กลไกปรับเอน', 'โต๊ะข้าง/ที่วางอุปกรณ์'] },
    severity: {
      label: 'ความรุนแรง',
      options: [
        { value: 1, label: '1 เล็กน้อย' },
        { value: 2, label: '2 พอรบกวน' },
        { value: 3, label: '3 ปานกลาง' },
        { value: 4, label: '4 มาก' },
        { value: 5, label: '5 รุนแรงมาก' }
      ],
      default: 3
    },
    note: 'เล่าเพิ่ม (ไม่บังคับ)',
    save: 'บันทึกจุดนี้',
    remove: 'ไม่มีปัญหา / ลบ',
    savedLabel: 'จุดที่บันทึกแล้ว:',
    savedEmpty: 'ยังไม่มี'
  };

  App.data.thanks = {
    title: 'ขอบคุณค่ะ 🙏',
    body: 'บันทึกคำตอบเสร็จแล้ว หน้านี้ยังไม่ส่งข้อมูลไปที่ใด ช่วงทดลอง (pilot) ให้กดคัดลอกแล้วส่งให้ผู้จัดทำ',
    copy: 'คัดลอกคำตอบ',
    copied: 'คัดลอกแล้ว',
    restart: 'เริ่มใหม่'
  };

  App.data.nav = { back: 'ย้อนกลับ', next: 'ถัดไป', submit: 'ส่งคำตอบ' };
})();
