// /api/admin/* — เข้าด้วยรหัสผ่านเดียว (Worker secret ADMIN_PASSWORD) + cookie ลงลายเซ็น
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { signSession, verifySession } from '../auth.js';
import { safeEqual } from '../crypto.js';
import { allow } from '../ratelimit.js';

const MAX_AGE = 28800; // 8 ชั่วโมง
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
