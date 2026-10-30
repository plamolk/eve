// ชุดคำถามของผู้บริจาคโลหิต (โหลดหลัง common.js)
window.App = window.App || {};
App.data = App.data || {};

(function () {
  // ค่าคงที่ที่ใช้ร่วมกันอยู่ใน common.js
  const AGREE = App.data.scales.AGREE;
  const ANXIETY = App.data.scales.ANXIETY;
  const MAP_NOTE = App.data.mapNote;

  App.data.sections = App.data.sections || {};

  // ---------------- ผู้บริจาคโลหิต ----------------
  App.data.sections.donor = [
    {
      id: 'A',
      title: 'ส่วน A ข้อมูลทั่วไป',
      items: [
        { type: 'pills', key: 'age', label: 'ช่วงอายุ', options: ['18-25', '26-35', '36-45', '46-55', '56 ขึ้นไป'] },
        { type: 'pills', key: 'sex', label: 'เพศ', options: ['ชาย', 'หญิง', 'ไม่ระบุ'] },
        { type: 'pills', key: 'times', label: 'เคยบริจาคมาแล้วกี่ครั้ง', options: ['ครั้งแรก', '2-5', '6-10', 'มากกว่า 10'] },
        { type: 'pills', key: 'mobile', label: 'เคยบริจาคบนรถเคลื่อนที่มาก่อนหรือไม่', options: ['เคย', 'ไม่เคย'] },
        { type: 'pills', key: 'mob', label: 'คุณมีข้อจำกัดในการเดินหรือเคลื่อนไหวหรือไม่', options: ['ไม่มี', 'มีเล็กน้อย', 'มีมาก'] }
      ]
    },
    {
      id: 'B',
      title: 'ส่วน B ความสบาย',
      items: [
        { type: 'scale', key: 'seat', label: 'เก้าอี้นั่งสบาย เอนได้ตามต้องการ', options: AGREE },
        { type: 'scale', key: 'arm', label: 'ที่วางแขนรองรับแขนได้มั่นคงและสบาย', options: AGREE },
        { type: 'scale', key: 'leg', label: 'ที่วางขาและเท้าสบาย', options: AGREE },
        { type: 'scale', key: 'priv', label: 'มีพื้นที่ส่วนตัวพอ ไม่รู้สึกแออัดหรือถูกเบียด', options: AGREE },
        { type: 'scale', key: 'getin', label: 'ขึ้น-ลงเก้าอี้ได้สะดวก', options: AGREE },
        { type: 'pills', key: 'fit', label: 'ขนาดเก้าอี้พอดีกับตัวคุณหรือไม่', options: ['เล็กเกินไป', 'พอดี', 'ใหญ่เกินไป'] }
      ]
    },
    {
      id: 'C',
      title: 'ส่วน C ความรู้สึกและความกังวล',
      items: [
        { type: 'scale', key: 'anx', label: 'ก่อนบริจาคกังวลระดับใด', options: ANXIETY },
        { type: 'pills', key: 'mood', label: 'บรรยากาศในรถทำให้รู้สึกอย่างไร', options: ['กังวลมากขึ้น', 'เหมือนเดิม', 'ผ่อนคลายขึ้น'] },
        { type: 'multi', key: 'uneasy', label: 'อะไรทำให้รู้สึกไม่สบายใจ (เลือกได้หลายข้อ)', options: ['แสง', 'สี', 'ความแออัด', 'เครื่องมือ', 'เห็นเข็ม/ถุงเลือด', 'ไม่มี'], only: 'ไม่มี' },
        { type: 'pills', key: 'dizzy', label: 'เคยรู้สึกหน้ามืดหรือเวียนศีรษะระหว่างหรือหลังบริจาคหรือไม่', options: ['ไม่เคย', 'เคย ระหว่างบริจาค', 'เคย หลังบริจาค'] },
        { type: 'scale', key: 'clean', label: 'รถดูสะอาดและทันสมัย', options: AGREE }
      ]
    },
    {
      id: 'D',
      title: 'ส่วน D จิ้มจุดที่ไม่สบายหรือไม่สะดวก',
      note: MAP_NOTE,
      component: 'busMap',
      items: []
    },
    {
      id: 'E',
      title: 'ส่วน E แรงจูงใจ',
      items: [
        { type: 'multi', key: 'again', max: 3, label: 'อะไรทำให้อยากกลับมาบริจาคซ้ำ (เลือกไม่เกิน 3)', options: ['เก้าอี้สบาย', 'ไม่เจ็บ', 'เจ้าหน้าที่ดูแลดี', 'รถสะอาด', 'ไม่ต้องรอนาน', 'บรรยากาศผ่อนคลาย'] },
        { type: 'textarea', key: 'improve', label: 'อยากให้ปรับปรุงอะไรมากที่สุด' }
      ]
    }
  ];
})();
