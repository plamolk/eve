import { test, expect, beforeEach, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';
import app from '../../src/index.js';

let cookie;
const get = (path, c = cookie) => app.request(path, { headers: c ? { cookie: c } : {} }, env);
const ids = async (qs) => (await (await get('/api/admin/comments?' + qs)).json()).items.map((i) => i.id);
const pt = (n) => ({ t: ['คับแคบ'], p: [], sev: 3, n });

const ROWS = [
  [1, 'staff', { answers: { other: 'สายไฟพาดพื้น' }, map: { A3: pt('แคบ'), Z5: pt('') } }],
  [2, 'staff', { answers: { other: '100% ไม่มี_ปัญหา' }, map: {} }],
  [3, 'donor', { answers: { improve: 'ที่วางของ', noMap: true }, map: {} }],
  [4, 'staff', { answers: { other: "ห้อง 'A'" }, map: { B1: pt('เก้าอี้โยก') } }]
];

beforeAll(async () => {
  const res = await app.request('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '10.4.0.1' }, body: JSON.stringify({ password: 'dev-password-change-me-123' }) }, env);
  cookie = res.headers.get('set-cookie').split(';')[0];
});

beforeEach(async () => {
  await env.DB.exec('DELETE FROM responses; DELETE FROM usage;');
  await env.DB.batch(ROWS.map(([id, role, d]) => env.DB.prepare('INSERT INTO responses (id, cid, role, data, created, src) VALUES (?, ?, ?, ?, ?, 0)')
    .bind(id, 'cid-' + id, role, JSON.stringify({ role, msd: {}, ...d }), 2000 + id)));
});

test('comments need the session cookie', async () => {
  expect((await get('/api/admin/comments?key=other', null)).status).toBe(401);
});

test('comments reject a key that is not a long-text question or map', async () => {
  for (const key of ['pos', 'x', '']) {
    const res = await get('/api/admin/comments?key=' + key);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid', field: 'key' });
  }
});

test('comments reject bad role, before, limit and a long q', async () => {
  expect(await (await get('/api/admin/comments?key=other&role=x')).json()).toEqual({ error: 'invalid', field: 'role' });
  expect(await (await get('/api/admin/comments?key=other&before=0')).json()).toEqual({ error: 'invalid', field: 'before' });
  expect(await (await get('/api/admin/comments?key=other&limit=101')).json()).toEqual({ error: 'invalid', field: 'limit' });
  expect(await (await get('/api/admin/comments?key=other&q=' + 'ก'.repeat(101))).json()).toEqual({ error: 'invalid', field: 'q' });
});

test('long-text comments come newest first and page with before/next', async () => {
  const all = await (await get('/api/admin/comments?key=other')).json();
  expect(all.items.map((i) => i.id)).toEqual([4, 2, 1]);
  expect(all.next).toBeNull();
  const p1 = await (await get('/api/admin/comments?key=other&limit=2')).json();
  expect(p1.items.map((i) => i.id)).toEqual([4, 2]);
  expect(p1.next).toBe(2);
  expect(await ids('key=other&limit=2&before=2')).toEqual([1]);
});

test('search matches text literally, including % _ and quotes', async () => {
  expect(await ids('key=other&q=' + encodeURIComponent('สาย'))).toEqual([1]);
  expect(await ids('key=other&q=' + encodeURIComponent('%'))).toEqual([2]);
  expect(await ids('key=other&q=' + encodeURIComponent('_'))).toEqual([2]);
  expect(await ids('key=other&q=' + encodeURIComponent("'A'"))).toEqual([4]);
  expect(await ids('key=other&q=' + encodeURIComponent('  สาย  '))).toEqual([1]);
});

test('donor long text filtered by role', async () => {
  const r = await (await get('/api/admin/comments?key=improve&role=donor')).json();
  expect(r).toEqual({ items: [{ id: 3, role: 'donor', created: 2003, text: 'ที่วางของ' }], next: null });
});

test('map notes come per person with the zone and skip empty notes', async () => {
  const r = await (await get('/api/admin/comments?key=map')).json();
  expect(r.items).toEqual([
    { id: 4, role: 'staff', created: 2004, zone: 'B1', text: 'เก้าอี้โยก' },
    { id: 1, role: 'staff', created: 2001, zone: 'A3', text: 'แคบ' }
  ]);
  expect(r.next).toBeNull();
  const p = await (await get('/api/admin/comments?key=map&limit=1')).json();
  expect(p.items.map((i) => i.id)).toEqual([4]);
  expect(p.next).toBe(4);
  expect(await ids('key=map&limit=1&before=4')).toEqual([1]);
});

test('map notes search', async () => {
  expect(await ids('key=map&q=' + encodeURIComponent('โยก'))).toEqual([4]);
  expect(await ids('key=map&role=donor')).toEqual([]);
});
