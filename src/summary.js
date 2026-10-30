// รวมผลสรุปแบบเพิ่มทีละส่วน: เก็บค่าดิบที่บวกต่อได้ แล้วแปลงเป็นรูปแบบที่ component รับตอนแสดง
import { SCHEMA, ZONES, BODY_REGIONS } from './schema.js';

const RANK_POINTS = [3, 2, 1]; // อันดับ 1 = 3 คะแนน, 2 = 2, 3 = 1
const RANK_OPTIONS = SCHEMA.staff.answers.rank.options;
const own = (o, k) => Object.hasOwn(o, k);

export function emptyAcc() {
  return { staff: { n: 0, heat: {}, body: {}, rank: {} }, donor: { n: 0, heat: {} } };
}

export function mergeRows(acc, rows) {
  const out = structuredClone(acc);
  for (const row of rows) {
    const d = JSON.parse(row.data);
    if (row.role !== 'staff' && row.role !== 'donor') continue;
    const r = out[row.role];
    r.n += 1;
    for (const [zone, e] of Object.entries(d.map || {})) {
      if (!own(ZONES, zone)) continue; // ข้ามค่าที่ไม่ใช่โซนจริง
      const h = own(r.heat, zone) ? r.heat[zone] : (r.heat[zone] = { c: 0, s: 0 });
      h.c += 1;
      h.s += e.sev;
    }
    if (row.role === 'staff') {
      for (const region of Object.keys(d.msd || {})) {
        if (BODY_REGIONS.includes(region)) r.body[region] = (own(r.body, region) ? r.body[region] : 0) + 1;
      }
      ((d.answers && d.answers.rank) || []).forEach((opt, i) => {
        if (i < RANK_POINTS.length && RANK_OPTIONS.includes(opt)) r.rank[opt] = (own(r.rank, opt) ? r.rank[opt] : 0) + RANK_POINTS[i];
      });
    }
  }
  return out;
}

function heat(h) {
  const out = {};
  for (const [zone, { c, s }] of Object.entries(h)) out[zone] = { count: c, avg: Math.round((s / c) * 10) / 10 };
  return out;
}

export function present(acc) {
  const rank = Object.entries(acc.staff.rank).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'th'));
  return {
    staff: { n: acc.staff.n, heat: heat(acc.staff.heat), body: { ...acc.staff.body }, rank },
    donor: { n: acc.donor.n, heat: heat(acc.donor.heat) }
  };
}
