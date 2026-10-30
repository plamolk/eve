import { test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import app from '../../src/index.js';
import { requireAdmin, adminHeaders } from '../../src/routes/admin.js';

let ipN = 0;
const login = (password, ip = '10.1.0.' + (++ipN)) => app.request('/api/admin/login', {
  method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify({ password })
}, env);

// a tiny app with the same middleware, to test the guard on its own
const guarded = new Hono();
guarded.use('/api/admin/*', adminHeaders);
guarded.use('/api/admin/*', requireAdmin);
guarded.get('/api/admin/ping', (c) => c.json({ ok: true }));

test('wrong password → 401', async () => {
  const res = await login('nope');
  expect(res.status).toBe(401);
  expect(await res.json()).toEqual({ error: 'auth' });
});

test('right password → 204 with a strict session cookie', async () => {
  const res = await login('dev-password-change-me-123');
  expect(res.status).toBe(204);
  const c = res.headers.get('set-cookie');
  expect(c).toMatch(/^adm=\d+\.[A-Za-z0-9_-]+;/);
  for (const part of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/api/admin', 'Max-Age=28800']) expect(c).toContain(part);
});

test('6th wrong attempt within a minute → 429', async () => {
  const ip = '10.250.0.1';
  for (let i = 0; i < 5; i++) expect((await login('nope', ip)).status).toBe(401);
  const res = await login('nope', ip);
  expect(res.status).toBe(429);
  expect(await res.json()).toEqual({ error: 'rate' });
});

test('guard: no cookie → 401 with no-store and noindex', async () => {
  const res = await guarded.request('/api/admin/ping', {}, env);
  expect(res.status).toBe(401);
  expect(res.headers.get('cache-control')).toBe('no-store');
  expect(res.headers.get('x-robots-tag')).toBe('noindex');
});

test('guard: cookie from login → 200', async () => {
  const cookie = (await login('dev-password-change-me-123')).headers.get('set-cookie').split(';')[0];
  const res = await guarded.request('/api/admin/ping', { headers: { cookie } }, env);
  expect(res.status).toBe(200);
});

test('logout clears the cookie', async () => {
  const res = await app.request('/api/admin/logout', { method: 'POST' }, env);
  expect(res.status).toBe(204);
  expect(res.headers.get('set-cookie')).toMatch(/^adm=;.*Max-Age=0/);
});
