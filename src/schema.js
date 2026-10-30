// คำถามที่ server รู้จัก (ต้องตรงกับ public/js/data/*.js — tests/unit/schema-sync.test.js ตรวจให้)
// type: pills | scale | multi | rank | number | textarea, optional = ข้อที่ไม่บังคับ

export const SCHEMA = {
  staff: {
    msd: true,
    answers: {
      // ส่วน A ข้อมูลทั่วไป
      pos: {type: 'pills', options: ['พยาบาล', 'เจ้าหน้าที่เทคนิคการแพทย์', 'อื่น ๆ']},
      yrs: {type: 'number'},
      days: {type: 'number'},
      ht: {type: 'pills', optional: true, options: ['ต่ำกว่า 155', '155-165', '166-175', 'สูงกว่า 175']},
      beds: {type: 'number'},
      // ส่วน B พฤติกรรมและสภาพแวดล้อมในรถ
      posture: {type: 'pills', options: ['ยืนเป็นหลัก', 'นั่งเป็นหลัก', 'สลับยืน-นั่ง', 'ก้มตัวเป็นหลัก']},
      hard: {type: 'pills', options: ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'ไม่มี']},
      rowdiff: {type: 'textarea'},
      carry: {type: 'pills', options: ['ไม่เคย', 'นาน ๆ ครั้ง', 'บางครั้ง', 'บ่อย', 'เกือบทุกครั้ง']},
      squeeze: {type: 'pills', options: ['ไม่เคย', 'นาน ๆ ครั้ง', 'บางครั้ง', 'บ่อย', 'เกือบทุกครั้ง']},
      vib: {type: 'pills', options: ['ไม่เคย', 'นาน ๆ ครั้ง', 'บางครั้ง', 'บ่อย', 'เกือบทุกครั้ง']},
      env: {type: 'pills', options: ['ไม่เคย', 'นาน ๆ ครั้ง', 'บางครั้ง', 'บ่อย', 'เกือบทุกครั้ง']},
      // ส่วน C อาการปวดเมื่อย (ดัดแปลงจาก Nordic Questionnaire)
      // ส่วน D จิ้มจุดปัญหาบนผัง Blood Collection Area
      zone: {type: 'pills', options: ['ข้างเก้าอี้แถว A', 'ข้างเก้าอี้แถว B', 'เคาน์เตอร์ข้าง ②', 'เคาน์เตอร์พยาบาล ③', 'เครื่องชั่ง ④', 'ทางเดิน ⑤', 'หน้ารถ ⑥/⑦']},
      // ส่วน E อุปกรณ์ สาย และการทำความสะอาด
      cable: {type: 'pills', options: ['ไม่เคย', 'นาน ๆ ครั้ง', 'บางครั้ง', 'บ่อย', 'เกือบทุกครั้ง']},
      trip: {type: 'pills', options: ['ไม่เคย', 'เกือบสะดุด', 'เคยสะดุด']},
      armpad: {type: 'pills', options: ['ไม่เคย', 'นาน ๆ ครั้ง', 'บางครั้ง', 'บ่อย', 'เกือบทุกครั้ง']},
      cleanspot: {type: 'textarea'},
      cleanmin: {type: 'number'},
      material: {type: 'textarea'},
      setup: {type: 'textarea'},
      faint: {type: 'textarea'},
      // ส่วน F ลำดับความสำคัญ
      rank: {type: 'rank', options: ['ทางเดินกว้างขึ้น', 'ซ่อนสาย', 'ที่วางเครื่องมือในระยะเอื้อม', 'ที่วางแขนปรับได้', 'เก้าอี้เอนศีรษะต่ำได้เร็ว', 'ทำความสะอาดง่าย'], max: 3},
      worry: {type: 'textarea'},
      other: {type: 'textarea'}
    }
  },
  donor: {
    msd: false,
    answers: {
      // ส่วน A ข้อมูลทั่วไป
      age: {type: 'pills', options: ['18-25', '26-35', '36-45', '46-55', '56 ขึ้นไป']},
      sex: {type: 'pills', options: ['ชาย', 'หญิง', 'ไม่ระบุ']},
      times: {type: 'pills', options: ['ครั้งแรก', '2-5', '6-10', 'มากกว่า 10']},
      mobile: {type: 'pills', options: ['เคย', 'ไม่เคย']},
      mob: {type: 'pills', options: ['ไม่มี', 'มีเล็กน้อย', 'มีมาก']},
      // ส่วน B ความสบาย
      seat: {type: 'scale', options: [1, 2, 3, 4, 5]},
      arm: {type: 'scale', options: [1, 2, 3, 4, 5]},
      leg: {type: 'scale', options: [1, 2, 3, 4, 5]},
      priv: {type: 'scale', options: [1, 2, 3, 4, 5]},
      getin: {type: 'scale', options: [1, 2, 3, 4, 5]},
      fit: {type: 'pills', options: ['เล็กเกินไป', 'พอดี', 'ใหญ่เกินไป']},
      // ส่วน C ความรู้สึกและความกังวล
      anx: {type: 'scale', options: [1, 2, 3, 4, 5]},
      mood: {type: 'pills', options: ['กังวลมากขึ้น', 'เหมือนเดิม', 'ผ่อนคลายขึ้น']},
      uneasy: {type: 'multi', options: ['แสง', 'สี', 'ความแออัด', 'เครื่องมือ', 'เห็นเข็ม/ถุงเลือด', 'ไม่มี'], only: 'ไม่มี'},
      dizzy: {type: 'pills', options: ['ไม่เคย', 'เคย ระหว่างบริจาค', 'เคย หลังบริจาค']},
      clean: {type: 'scale', options: [1, 2, 3, 4, 5]},
      // ส่วน D จิ้มจุดที่ไม่สบายหรือไม่สะดวก
      // ส่วน E แรงจูงใจ
      again: {type: 'multi', options: ['เก้าอี้สบาย', 'ไม่เจ็บ', 'เจ้าหน้าที่ดูแลดี', 'รถสะอาด', 'ไม่ต้องรอนาน', 'บรรยากาศผ่อนคลาย'], max: 3},
      improve: {type: 'textarea'}
    }
  }
};

// ปุ่ม "ไม่มี" ของแผนภาพร่างกาย/ผังรถ
export const NONE_KEYS = { staff: ['noMsd', 'noMap'], donor: ['noMap'] };

export const BODY_REGIONS = ['คอ', 'ไหล่', 'ข้อศอก', 'ข้อมือ/มือ', 'สะโพก/ต้นขา', 'เข่า', 'ข้อเท้า/เท้า', 'หลังส่วนบน', 'หลังส่วนล่าง'];

export const ZONES = {Z6: 'zone', Z7: 'zone', Z2: 'zone', Z5: 'zone', Z3: 'zone', Z4: 'zone', A1: 'chair', A2: 'chair', A3: 'chair', A4: 'chair', B1: 'chair', B2: 'chair', B3: 'chair', B4: 'chair'};

export const ZONE_TYPES = ['คับแคบ', 'เอื้อมยาก', 'ต้องก้มหรือบิดตัว', 'ไม่มั่นคง', 'สะดุดสาย', 'ทำความสะอาดยาก', 'ดูน่ากลัว/แออัด', 'อื่น ๆ'];
export const ZONE_PARTS = ['พนักพิง', 'เบาะนั่ง', 'ที่วางแขน', 'ที่วางขา/เท้า', 'กลไกปรับเอน', 'โต๊ะข้าง/ที่วางอุปกรณ์'];
export const MSD_YN = ['ใช่', 'ไม่'];

export const LIMITS = { bodyBytes: 16384, dataBytes: 13824, textarea: 2000, note: 500, numberMax: 9999 };
