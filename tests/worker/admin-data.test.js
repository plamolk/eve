import { test, expect, beforeEach, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';
import app from '../../src/index.js';
import { saveSummary } from '../../src/routes/admin.js';
import { createMeter } from '../../src/meter.js';

let cookie;
const get = (path, c = cookie) => app.request(path, { headers: c ? { cookie: c } : {} }, env);

async function seed(n, start = 1) {
  const stmts = [];
  for (let i = start; i < start + n; i++) {
    const role = i % 3 === 0 ? 'donor' : 'staff';
    const data = { role, answers: role === 'staff' ? { rank: ['ซ่อนสาย', 'ทางเดินกว้างขึ้น', 'ทำความสะอาดง่าย'] } : {}, msd: {}, map: { A3: { t: ['คับแคบ'], p: [], sev: 4, n: '' } } };
    stmts.push(env.DB.prepare('INSERT INTO responses (id, cid, role, data, created, src) VALUES (?, ?, ?, ?, ?, 0)').bind(i, 'cid-' + i, role, JSON.stringify(data), 1000 + i));
  }
  await env.DB.batch(stmts);
}

beforeAll(async () => {
  const res = await app.request('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '10.3.0.1' }, body: JSON.stringify({ password: 'dev-password-change-me-123' }) }, env);
  cookie = res.headers.get('set-cookie').split(';')[0];
});

beforeEach(async () => {
  await env.DB.exec("DELETE FROM responses; DELETE FROM usage; UPDATE summary SET last_id = 0, data = '{}', updated = 0;");
});

test('summary and responses need the session cookie', async () => {
  expect((await get('/api/admin/summary', null)).status).toBe(401);
  expect((await get('/api/admin/responses', null)).status).toBe(401);
});

test('summary merges at most 100 new rows per call', async () => {
  await seed(105);
  const a = await (await get('/api/admin/summary')).json();
  expect(a.more).toBe(true);
  expect(a.staff.n + a.donor.n).toBe(100);
  const b = await (await get('/api/admin/summary')).json();
  expect(b.more).toBe(false);
  expect(b.staff.n + b.donor.n).toBe(105);
  expect(b.staff.heat.A3.count).toBe(b.staff.n);
  expect(b.staff.rank[0]).toEqual(['ซ่อนสาย', 3 * b.staff.n]);
  expect(b.usage).toMatchObject({ limits: { rw: 100000, rr: 5000000 } });
  expect(b.updated).toBeGreaterThan(0);
});

test('the cache update is guarded by the cursor it read (no double count from two tabs)', async () => {
  await seed(10);
  await get('/api/admin/summary'); // stored cursor → 10
  const before = (await env.DB.prepare('SELECT last_id, data FROM summary').first());
  // a tab that read the cursor while it was still 0 tries to save its result
  const saved = await saveSummary(createMeter(), env.DB, 0, 15, { staff: { n: 999 } }, 1);
  expect(saved).toBe(false);
  expect(await env.DB.prepare('SELECT last_id, data FROM summary').first()).toEqual(before);
});

test('rebuild recounts from scratch', async () => {
  await seed(20);
  await get('/api/admin/summary');
  await env.DB.exec("UPDATE summary SET data = '{\"staff\":{\"n\":999,\"heat\":{},\"body\":{},\"rank\":{}},\"donor\":{\"n\":0,\"heat\":{}}}'");
  const s = await (await get('/api/admin/summary?rebuild=1')).json();
  expect(s.staff.n + s.donor.n).toBe(20);
});

test('responses pages with after/next and filters by role', async () => {
  await seed(7);
  const p1 = await (await get('/api/admin/responses?limit=3')).json();
  expect(p1.rows.map((r) => r.id)).toEqual([1, 2, 3]);
  expect(p1.next).toBe(3);
  expect(typeof p1.rows[0].data).toBe('object');
  const p3 = await (await get('/api/admin/responses?limit=3&after=6')).json();
  expect(p3).toMatchObject({ next: null });
  expect(p3.rows.map((r) => r.id)).toEqual([7]);
  const d = await (await get('/api/admin/responses?role=donor')).json();
  expect(d.rows.map((r) => r.id)).toEqual([3, 6]);
});

test('responses rejects a bad role or limit', async () => {
  expect((await get('/api/admin/responses?role=x')).status).toBe(400);
  expect((await get('/api/admin/responses?limit=500')).status).toBe(400);
});

test('old cache without v:2 is rebuilt from zero', async () => {
  await seed(3);
  await env.DB.exec("UPDATE summary SET last_id = 3, data = '{\"staff\":{\"n\":99,\"heat\":{},\"body\":{},\"rank\":{}},\"donor\":{\"n\":0,\"heat\":{}}}'");
  const s = await (await get('/api/admin/summary')).json();
  expect(s.staff.n + s.donor.n).toBe(3);
});

test('summary includes v2 fields', async () => {
  const data = { role: 'staff', answers: { pos: 'พยาบาล' }, msd: {}, map: {} };
  await env.DB.prepare('INSERT INTO responses (id, cid, role, data, created, src) VALUES (1, ?, ?, ?, ?, 1)')
    .bind('cid-v2', 'staff', JSON.stringify(data), Date.parse('2026-10-31T03:00:00Z') / 1000).run();
  const s = await (await get('/api/admin/summary')).json();
  expect(s.staff.src1).toBe(1);
  expect(s.staff.days).toEqual([['2026-10-31', 1]]);
  expect(s.staff.q).toEqual({ pos: { 'พยาบาล': 1 } });
});

test('responses with before page newest first', async () => {
  await seed(7);
  const p1 = await (await get('/api/admin/responses?before=8&limit=3')).json();
  expect(p1.rows.map((r) => r.id)).toEqual([7, 6, 5]);
  expect(p1.next).toBe(5);
  const d = await (await get('/api/admin/responses?before=5&limit=3&role=donor')).json();
  expect(d.rows.map((r) => r.id)).toEqual([3]);
  expect(d.next).toBeNull();
});

test('responses rejects after together with before, and a bad before', async () => {
  await seed(3);
  const both = await get('/api/admin/responses?after=1&before=5');
  expect(both.status).toBe(400);
  expect(await both.json()).toEqual({ error: 'invalid', field: 'before' });
  expect((await get('/api/admin/responses?before=0')).status).toBe(400);
  expect((await get('/api/admin/responses?before=x')).status).toBe(400);
});

test('one response by id', async () => {
  await seed(3);
  const ok = await get('/api/admin/responses/3');
  expect(ok.status).toBe(200);
  const { row } = await ok.json();
  expect(row.id).toBe(3);
  expect(row.role).toBe('donor');
  expect(typeof row.data).toBe('object');
  expect(Object.keys(row).sort()).toEqual(['cid', 'created', 'data', 'id', 'role', 'src']);
  const missing = await get('/api/admin/responses/999');
  expect(missing.status).toBe(404);
  expect(await missing.json()).toEqual({ error: 'not_found' });
  expect((await get('/api/admin/responses/abc')).status).toBe(400);
  expect((await get('/api/admin/responses/0')).status).toBe(400);
  expect((await get('/api/admin/responses/3', null)).status).toBe(401);
});
