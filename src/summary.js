// รวมผลสรุปแบบเพิ่มทีละส่วน (รุ่น 2): เก็บค่าดิบที่บวกต่อได้ แล้วแปลงเป็นรูปแบบที่หน้าแอดมินรับตอนแสดง
import { SCHEMA, ZONES, BODY_REGIONS, ZONE_TYPES, ZONE_PARTS } from './schema.js';

const RANK_POINTS = [3, 2, 1]; // อันดับ 1 = 3 คะแนน, 2 = 2, 3 = 1
const own = (o, k) => Object.hasOwn(o, k);
const inc = (o, k, by = 1) => { o[k] = (own(o, k) ? o[k] : 0) + by; };
const sub = (o, k, make) => (own(o, k) ? o[k] : (o[k] = make()));

function emptyRole() {
  return {
    n: 0, src1: 0, days: {}, heat: {}, body: {}, rank: {}, rank1: {}, q: {}, num: {},
    msd: {}, noMsd: 0, zt: {}, zp: {}, noMap: 0, text: {}, notes: 0
  };
}

export function emptyAcc() {
  return { v: 2, staff: emptyRole(), donor: emptyRole() };
}

// วันที่ตามเวลาไทย (UTC+7) ของเวลาเป็นวินาที
export function bangkokDay(sec) {
  return new Date((sec + 7 * 3600) * 1000).toISOString().slice(0, 10);
}

function countAnswers(r, schema, answers) {
  for (const key of Object.keys(schema)) {
    if (!own(answers, key)) continue;
    const def = schema[key];
    const v = answers[key];
    if (def.type === 'pills' || def.type === 'scale') {
      if (def.options.includes(v)) inc(sub(r.q, key, () => ({})), String(v));
    } else if (def.type === 'multi' || def.type === 'rank') {
      if (!Array.isArray(v)) continue;
      for (const opt of v) if (def.options.includes(opt)) inc(sub(r.q, key, () => ({})), opt);
      if (def.type === 'rank') {
        v.forEach((opt, i) => { if (i < RANK_POINTS.length && def.options.includes(opt)) inc(r.rank, opt, RANK_POINTS[i]); });
        if (def.options.includes(v[0])) inc(r.rank1, v[0]);
      }
    } else if (def.type === 'number') {
      if (v !== '' && v != null) inc(sub(r.num, key, () => ({})), String(v));
    } else if (def.type === 'textarea') {
      if (typeof v === 'string' && v.trim() !== '') inc(r.text, key);
    }
  }
}

export function mergeRows(acc, rows) {
  const out = structuredClone(acc);
  for (const row of rows) {
    if (row.role !== 'staff' && row.role !== 'donor') continue;
    const d = JSON.parse(row.data);
    const r = out[row.role];
    const answers = d.answers && typeof d.answers === 'object' ? d.answers : {};
    r.n += 1;
    if (row.src === 1) r.src1 += 1;
    if (Number.isFinite(row.created)) inc(r.days, bangkokDay(row.created));
    countAnswers(r, SCHEMA[row.role].answers, answers);
    if (answers.noMsd === true) r.noMsd += 1;
    if (answers.noMap === true) r.noMap += 1;
    const msd = d.msd && typeof d.msd === 'object' ? d.msd : {};
    for (const region of Object.keys(msd)) {
      if (!BODY_REGIONS.includes(region)) continue;
      const e = msd[region] || {};
      inc(r.body, region);
      const m = sub(r.msd, region, () => ({ n: 0, y: 0, w: 0, s: {} }));
      m.n += 1;
      if (e.y === 'ใช่') m.y += 1;
      if (e.w === 'ใช่') m.w += 1;
      if (Number.isInteger(e.s) && e.s >= 0 && e.s <= 10) inc(m.s, String(e.s));
    }
    const map = d.map && typeof d.map === 'object' ? d.map : {};
    for (const zone of Object.keys(map)) {
      if (!own(ZONES, zone)) continue; // ข้ามค่าที่ไม่ใช่โซนจริง
      const e = map[zone] || {};
      const h = sub(r.heat, zone, () => ({ c: 0, s: 0 }));
      h.c += 1;
      h.s += e.sev;
      for (const t of Array.isArray(e.t) ? e.t : []) if (ZONE_TYPES.includes(t)) inc(sub(r.zt, zone, () => ({})), t);
      for (const p of Array.isArray(e.p) ? e.p : []) if (ZONE_PARTS.includes(p)) inc(sub(r.zp, zone, () => ({})), p);
      if (typeof e.n === 'string' && e.n.trim() !== '') r.notes += 1;
    }
  }
  return out;
}

const byCount = (o) => Object.entries(o).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'th'));

function heat(h) {
  const out = {};
  for (const [zone, { c, s }] of Object.entries(h)) out[zone] = { count: c, avg: Math.round((s / c) * 10) / 10 };
  return out;
}

function msd(m) {
  const out = {};
  for (const [region, { n, y, w, s }] of Object.entries(m)) {
    const dist = Array.from({ length: 11 }, (_, i) => (own(s, String(i)) ? s[String(i)] : 0));
    const cnt = dist.reduce((a, b) => a + b, 0);
    const avg = cnt ? Math.round((dist.reduce((a, c, i) => a + c * i, 0) / cnt) * 10) / 10 : null;
    out[region] = { n, y, w, avg, dist };
  }
  return out;
}

function zones(r) {
  const out = {};
  for (const zone of Object.keys(r.heat)) {
    out[zone] = { t: byCount(own(r.zt, zone) ? r.zt[zone] : {}), p: byCount(own(r.zp, zone) ? r.zp[zone] : {}) };
  }
  return out;
}

function extra(r) {
  return {
    src1: r.src1,
    days: Object.entries(r.days).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
    q: structuredClone(r.q),
    num: structuredClone(r.num),
    rank1: { ...r.rank1 },
    msd: msd(r.msd),
    noMsd: r.noMsd,
    zones: zones(r),
    noMap: r.noMap,
    text: { ...r.text },
    notes: r.notes
  };
}

export function present(acc) {
  const rank = byCount(acc.staff.rank);
  return {
    staff: { n: acc.staff.n, heat: heat(acc.staff.heat), body: { ...acc.staff.body }, rank, ...extra(acc.staff) },
    donor: { n: acc.donor.n, heat: heat(acc.donor.heat), ...extra(acc.donor) }
  };
}
