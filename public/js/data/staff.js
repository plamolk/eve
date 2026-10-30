// ชุดคำถามของเจ้าหน้าที่ (โหลดหลัง common.js)
window.App = window.App || {};
App.data = App.data || {};

(function () {
  // ค่าคงที่ที่ใช้ร่วมกันอยู่ใน common.js
  const FREQ = App.data.scales.FREQ;
  const MAP_NOTE = App.data.mapNote;

  App.data.sections = App.data.sections || {};

  // ---------------- เจ้าหน้าที่ ----------------
  App.data.sections.staff = [
    {
      id: 'A',
      title: 'ส่วน A ข้อมูลทั่วไป',
      items: [
        { type: 'pills', key: 'pos', label: 'ตำแหน่งงาน', options: ['พยาบาล', 'เจ้าหน้าที่เทคนิคการแพทย์', 'อื่น ๆ'] },
        { type: 'number', key: 'yrs', label: 'ประสบการณ์ออกหน่วยบนรถ (ปี)' },
        { type: 'number', key: 'days', label: 'ออกหน่วยประมาณกี่วันต่อเดือน' },
        { type: 'pills', key: 'ht', optional: true, label: 'ช่วงส่วนสูง (ซม.) ไม่บังคับ', options: ['ต่ำกว่า 155', '155-165', '166-175', 'สูงกว่า 175'] },
        { type: 'number', key: 'beds', label: 'ปกติดูแลผู้บริจาคกี่เตียงพร้อมกัน' }
      ]
    },
    {
      id: 'B',
      title: 'ส่วน B พฤติกรรมและสภาพแวดล้อมในรถ',
      items: [
        { type: 'pills', key: 'posture', label: 'ท่าหลักขณะทำหัตถการ', options: ['ยืนเป็นหลัก', 'นั่งเป็นหลัก', 'สลับยืน-นั่ง', 'ก้มตัวเป็นหลัก'] },
        { type: 'pills', key: 'hard', label: 'เก้าอี้ตัวไหนเข้าถึงยากที่สุด', options: ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'ไม่มี'] },
        { type: 'textarea', key: 'rowdiff', label: 'แถว A (ติดเคาน์เตอร์ข้าง) กับแถว B (ติดเครื่องชั่ง) ทำงานต่างกันอย่างไร' },
        { type: 'pills', key: 'carry', label: 'ต้องเคลื่อนย้ายถุงเลือด/อุปกรณ์ข้ามทางเดินบ่อยแค่ไหน', options: FREQ },
        { type: 'pills', key: 'squeeze', label: 'ทางเดินคับแคบจนต้องเบียดหรือรอเพื่อนร่วมงานผ่านบ่อยแค่ไหน', options: FREQ },
        { type: 'pills', key: 'vib', label: 'แรงสั่นสะเทือนหรือเสียงรบกวนการทำงานบ่อยแค่ไหน', options: FREQ },
        { type: 'pills', key: 'env', label: 'อุณหภูมิหรือแสงในรถรบกวนการทำงานบ่อยแค่ไหน', options: FREQ }
      ]
    },
    {
      id: 'C',
      title: 'ส่วน C อาการปวดเมื่อย (ดัดแปลงจาก Nordic Questionnaire)',
      note: 'แตะวงกลมบนร่างกายส่วนที่เคยมีอาการปวดเมื่อยจากการทำงาน (แตะซ้ำเพื่อยกเลิก) แล้วระบุรายละเอียดด้านล่าง',
      component: 'bodyMap',
      items: []
    },
    {
      id: 'D',
      title: 'ส่วน D จิ้มจุดปัญหาบนผัง Blood Collection Area',
      note: MAP_NOTE,
      component: 'busMap',
      items: [
        {
          type: 'pills', key: 'zone', label: 'ปกติคุณยืนหรือนั่งทำงานตรงไหนมากที่สุด', large: true,
          options: ['ข้างเก้าอี้แถว A', 'ข้างเก้าอี้แถว B', 'เคาน์เตอร์ข้าง ②', 'เคาน์เตอร์พยาบาล ③', 'เครื่องชั่ง ④', 'ทางเดิน ⑤', 'หน้ารถ ⑥/⑦']
        }
      ]
    },
    {
      id: 'E',
      title: 'ส่วน E อุปกรณ์ สาย และการทำความสะอาด',
      items: [
        { type: 'pills', key: 'cable', label: 'สายไฟ/ท่อเลือดพาดพื้นบ่อยแค่ไหน', options: FREQ },
        { type: 'pills', key: 'trip', label: 'เคยสะดุดหรือเกือบสะดุดสายหรือไม่', options: ['ไม่เคย', 'เกือบสะดุด', 'เคยสะดุด'] },
        { type: 'pills', key: 'armpad', label: 'ต้องใช้ผ้า/หมอนหนุนแขนเสริมเพราะที่วางแขนเดิมไม่พอดีบ่อยแค่ไหน', options: FREQ },
        { type: 'textarea', key: 'cleanspot', label: 'พื้นผิวหรือซอกมุมจุดไหนทำความสะอาดยากที่สุด' },
        { type: 'number', key: 'cleanmin', label: 'ใช้เวลาทำความสะอาดต่อเตียงประมาณกี่นาที' },
        { type: 'textarea', key: 'material', label: 'วัสดุส่วนไหนเสื่อมสภาพจากน้ำยาทำความสะอาด' },
        { type: 'textarea', key: 'setup', label: 'การติดตั้ง/เก็บอุปกรณ์ก่อน-หลังออกหน่วยยากหรือใช้เวลาแค่ไหน' },
        { type: 'textarea', key: 'faint', label: 'เมื่อผู้บริจาคเป็นลม ขั้นตอนเป็นอย่างไร และพื้นที่ติดขัดตรงไหน' }
      ]
    },
    {
      id: 'F',
      title: 'ส่วน F ลำดับความสำคัญ',
      items: [
        {
          type: 'rank', key: 'rank', max: 3, label: 'เลือก 3 อย่างที่อยากให้แก้ก่อน (กดตามลำดับ 1-2-3)',
          options: ['ทางเดินกว้างขึ้น', 'ซ่อนสาย', 'ที่วางเครื่องมือในระยะเอื้อม', 'ที่วางแขนปรับได้', 'เก้าอี้เอนศีรษะต่ำได้เร็ว', 'ทำความสะอาดง่าย']
        },
        { type: 'textarea', key: 'worry', label: 'ถ้ามีเฟอร์นิเจอร์ใหม่ สิ่งที่กังวลที่สุดคืออะไร' },
        { type: 'textarea', key: 'other', label: 'ข้อเสนอแนะอื่น ๆ' }
      ]
    }
  ];

  // Part C (เจ้าหน้าที่) — รายละเอียดต่อจุดบนร่างกาย
  App.data.msd = {
    year: { label: '12 เดือน', options: ['ใช่', 'ไม่'], default: 'ใช่' },
    week: { label: '7 วัน', options: ['ใช่', 'ไม่'], default: 'ไม่' },
    sev: { label: 'รุนแรง 0-10', min: 0, max: 10, default: 3 }
  };
})();
