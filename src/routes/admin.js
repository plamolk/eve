// /api/admin/* — เข้าด้วยรหัสผ่านเดียว (Worker secret ADMIN_PASSWORD) + cookie ลงลายเซ็น
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { signSession, verifySession } from '../auth.js';
import { safeEqual } from '../crypto.js';
import { allow } from '../ratelimit.js';
import { createMeter } from '../meter.js';
import { dayKey, bumpUsage } from '../store.js';
import { emptyAcc, mergeRows, present } from '../summary.js';

const MAX_AGE = 28800; // 8 ชั่วโมง
const SUMMARY_BATCH = 100;
const PAGE_MAX = 200;
const COOKIE_ATTRS = '; HttpOnly; Secure; SameSite=Strict; Path=/api/admin';

export async function adminHeaders(c, next) {
  await next();
  c.res.headers.set('Cache-Control', 'no-store');
  c.res.headers.set('X-Robots-Tag', 'noindex');
}

export async function requireAdmin(c, next) {
  const ok = await verifySession(c.env.SESSION_KEY, getCookie(c, 'adm'), Math.floor(Date.now() / 1000));
  if (!ok) return c.json({ error: 'auth' }, 401);
  await next();
}

export const adminRoutes = new Hono();

adminRoutes.use('*', adminHeaders);

adminRoutes.post('/login', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || '';
  if (!(await allow(c.env, 'login:' + ip))) return c.json({ error: 'rate' }, 429);
  let body;
  try { body = await c.req.json(); } catch (e) { body = null; }
  const password = body && typeof body.password === 'string' ? body.password : '';
  if (!c.env.ADMIN_PASSWORD || !(await safeEqual(password, c.env.ADMIN_PASSWORD))) return c.json({ error: 'auth' }, 401);
  const value = await signSession(c.env.SESSION_KEY, Math.floor(Date.now() / 1000) + MAX_AGE);
  c.header('Set-Cookie', 'adm=' + value + COOKIE_ATTRS + '; Max-Age=' + MAX_AGE);
  return c.body(null, 204);
});

adminRoutes.post('/logout', (c) => {
  c.header('Set-Cookie', 'adm=' + COOKIE_ATTRS + '; Max-Age=0');
  return c.body(null, 204);
});

// route ที่ต้องเข้าสู่ระบบก่อนอยู่ใต้ middleware นี้ (Task 15 เพิ่ม summary / responses)
adminRoutes.use('/*', async (c, next) => {
  if (c.req.path.endsWith('/login') || c.req.path.endsWith('/logout')) return next();
  return requireAdmin(c, next);
});

// บันทึก cache เฉพาะเมื่อ last_id ยังเป็นค่าที่อ่านมา (อีกแท็บบันทึกไปก่อน → ไม่เขียนทับ ไม่นับซ้ำ)
export async function saveSummary(m, db, oldLast, newLast, acc, now) {
  const r = await m.run(db.prepare('UPDATE summary SET last_id = ?, data = ?, updated = ? WHERE k = 1 AND last_id = ?')
    .bind(newLast, JSON.stringify(acc), now, oldLast));
  return r.meta.changes === 1;
}

adminRoutes.get('/summary', async (c) => {
  const db = c.env.DB;
  const m = createMeter();
  const day = dayKey();
  const [sumRes, useRes] = await m.batch(db, [
    db.prepare('SELECT last_id, data, updated FROM summary WHERE k = 1'),
    db.prepare('SELECT rw, rr, n FROM usage WHERE day = ?').bind(day)
  ]);
  const stored = sumRes.results[0];
  const rebuild = c.req.query('rebuild') === '1';
  const parsed = JSON.parse(stored.data);
  let acc = rebuild || !parsed.staff ? emptyAcc() : parsed;
  const from = rebuild ? 0 : stored.last_id;
  let updated = stored.updated;

  const rows = (await m.run(db.prepare('SELECT id, role, data FROM responses WHERE id > ? ORDER BY id LIMIT ?').bind(from, SUMMARY_BATCH))).results;
  if (rows.length || rebuild) {
    acc = mergeRows(acc, rows);
    updated = Math.floor(Date.now() / 1000);
    const newLast = rows.length ? rows[rows.length - 1].id : from;
    await saveSummary(m, db, stored.last_id, newLast, acc, updated);
  }
  const u = useRes.results[0] || { rw: 0, rr: 0, n: 0 };
  await bumpUsage(db, m, 0, day);
  return c.json({
    updated,
    more: rows.length === SUMMARY_BATCH,
    usage: { day, rw: u.rw, rr: u.rr, n: u.n, limits: { rw: Number(c.env.D1_WRITE_LIMIT || 100000), rr: Number(c.env.D1_READ_LIMIT || 5000000) } },
    ...present(acc)
  });
});

adminRoutes.get('/responses', async (c) => {
  const role = c.req.query('role');
  const after = c.req.query('after') === undefined ? 0 : Number(c.req.query('after'));
  const limit = c.req.query('limit') === undefined ? PAGE_MAX : Number(c.req.query('limit'));
  if (role !== undefined && role !== 'staff' && role !== 'donor') return c.json({ error: 'invalid', field: 'role' }, 400);
  if (!Number.isInteger(after) || after < 0) return c.json({ error: 'invalid', field: 'after' }, 400);
  if (!Number.isInteger(limit) || limit < 1 || limit > PAGE_MAX) return c.json({ error: 'invalid', field: 'limit' }, 400);

  const db = c.env.DB;
  const m = createMeter();
  const sql = 'SELECT id, cid, role, created, src, data FROM responses WHERE id > ?' + (role ? ' AND role = ?' : '') + ' ORDER BY id LIMIT ?';
  const stmt = role ? db.prepare(sql).bind(after, role, limit) : db.prepare(sql).bind(after, limit);
  const rows = (await m.run(stmt)).results.map((r) => ({ ...r, data: JSON.parse(r.data) }));
  await bumpUsage(db, m, 0);
  return c.json({ rows, next: rows.length === limit ? rows[rows.length - 1].id : null });
});
