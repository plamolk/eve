// การอ่าน/เขียน D1 ที่ใช้ร่วมกันทุก route
import { rememberUsage } from './quota.js';

// วันตามเวลา UTC (โควตารีเซ็ต 00:00 UTC) เป็นตัวเลข YYYYMMDD
export function dayKey(date = new Date()) {
  return Number(date.toISOString().slice(0, 10).replace(/-/g, ''));
}

// คืน true ถ้าเพิ่มแถวใหม่ (cid ซ้ำ → false และไม่เขียนเพิ่ม)
export async function insertResponse(m, db, { cid, role, data, created, src }) {
  const r = await m.run(db.prepare(
    'INSERT INTO responses (cid, role, data, created, src) VALUES (?, ?, ?, ?, ?) ON CONFLICT(cid) DO NOTHING'
  ).bind(cid, role, data, created, src));
  return r.meta.changes === 1;
}

// บวกยอดของคำขอนี้เข้าแถวของวัน (+1 สำหรับการเขียนของ UPSERT เอง) แล้วจำยอดล่าสุดไว้
export async function bumpUsage(db, m, n, day = dayKey()) {
  const row = await db.prepare(
    'INSERT INTO usage (day, rw, rr, n) VALUES (?, ?, ?, ?) ' +
    'ON CONFLICT(day) DO UPDATE SET rw = rw + excluded.rw, rr = rr + excluded.rr, n = n + excluded.n ' +
    'RETURNING rw, rr'
  ).bind(day, m.rw + 1, m.rr, n).first();
  const u = { day, rw: row.rw, rr: row.rr };
  rememberUsage(u);
  return u;
}

export async function usageToday(m, db, day = dayKey()) {
  const r = await m.run(db.prepare('SELECT rw, rr, n FROM usage WHERE day = ?').bind(day));
  const row = r.results[0];
  return row ? { day, rw: row.rw, rr: row.rr, n: row.n } : { day, rw: 0, rr: 0, n: 0 };
}
