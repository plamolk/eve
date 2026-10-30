import { test, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import app from '../../src/index.js';
import { rememberUsage } from '../../src/quota.js';
import { dayKey } from '../../src/store.js';
import { safeEqual } from '../../src/crypto.js';
import donorFull from '../fixtures/donor-full.json';
import staffNone from '../fixtures/staff-none.json';

const AUTH = { authorization: 'Bearer dev-import-token', 'content-type': 'application/json' };
const item = (data = donorFull, received = 1793383200) => ({ cid: crypto.randomUUID(), data, received });
const imp = (body, headers = AUTH) => app.request('/api/import', { method: 'POST', headers, body: JSON.stringify(body) }, env);
const rows = async () => (await env.DB.prepare('SELECT cid, role, created, src FROM responses ORDER BY id').all()).results;

beforeEach(async () => {
  await env.DB.exec('DELETE FROM responses; DELETE FROM usage;');
  rememberUsage({ day: dayKey(), rw: 0, rr: 0 });
});

test('missing or wrong token → 401', async () => {
  expect((await imp({ items: [item()] }, { 'content-type': 'application/json' })).status).toBe(401);
  expect((await imp({ items: [item()] }, { ...AUTH, authorization: 'Bearer nope' })).status).toBe(401);
});

test('41 items → 400 items', async () => {
  const res = await imp({ items: Array.from({ length: 41 }, () => item()) });
  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({ error: 'invalid', field: 'items' });
});

test('valid items are stored with src=1 and created=received; invalid ones are rejected with a field', async () => {
  const a = item(); const b = item(staffNone, 1793383300);
  const bad = item(); bad.data = structuredClone(donorFull); bad.data.answers.age = 'x';
  const res = await imp({ items: [a, bad, b] });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ accepted: [a.cid, b.cid], rejected: [{ cid: bad.cid, field: 'answers.age' }] });
  expect(await rows()).toEqual([
    { cid: a.cid, role: 'donor', created: 1793383200, src: 1 },
    { cid: b.cid, role: 'staff', created: 1793383300, src: 1 }
  ]);
  expect(await env.DB.prepare('SELECT n FROM usage').first()).toEqual({ n: 2 });
});

test('an existing cid counts as accepted without a new row', async () => {
  const a = item();
  await imp({ items: [a] });
  const res = await imp({ items: [a] });
  expect((await res.json()).accepted).toEqual([a.cid]);
  expect(await rows()).toHaveLength(1);
});

test('received in the future is rejected', async () => {
  const a = item(donorFull, Math.floor(Date.now() / 1000) + 3600);
  expect((await (await imp({ items: [a] })).json()).rejected).toEqual([{ cid: a.cid, field: 'received' }]);
});

test('over quota → 503 quota', async () => {
  rememberUsage({ day: dayKey(), rw: 90000, rr: 0 });
  const res = await imp({ items: [item()] });
  expect(res.status).toBe(503);
  expect(await res.json()).toEqual({ error: 'quota' });
});

test('safeEqual', async () => {
  expect(await safeEqual('a', 'a')).toBe(true);
  expect(await safeEqual('a', 'b')).toBe(false);
  expect(await safeEqual('', 'b')).toBe(false);
});
