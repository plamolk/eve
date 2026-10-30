import { describe, test, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { createMeter } from '../../src/meter.js';
import { dayKey, insertResponse, bumpUsage, usageToday } from '../../src/store.js';
import { knownUsage, overQuota, rememberUsage } from '../../src/quota.js';
import app from '../../src/index.js';

const row = (cid) => ({ cid, role: 'donor', data: '{"role":"donor"}', created: 1, src: 0 });

beforeEach(async () => {
  await env.DB.exec('DELETE FROM responses; DELETE FROM usage;');
});

describe('insertResponse', () => {
  test('first insert writes the row and its cid index entry', async () => {
    const m = createMeter();
    expect(await insertResponse(m, env.DB, row('c1'))).toBe(true);
    expect(m.rw).toBe(2);
  });

  test('same cid twice keeps one row', async () => {
    await insertResponse(createMeter(), env.DB, row('c1'));
    expect(await insertResponse(createMeter(), env.DB, row('c1'))).toBe(false);
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM responses').first();
    expect(n).toBe(1);
  });
});

describe('usage', () => {
  test('bumpUsage accumulates and updates the remembered value', async () => {
    const day = 20261030;
    const m1 = createMeter(); m1.rw = 2; m1.rr = 1;
    const u1 = await bumpUsage(env.DB, m1, 1, day);
    expect(u1).toEqual({ day, rw: 3, rr: 1 });
    const m2 = createMeter(); m2.rw = 2;
    const u2 = await bumpUsage(env.DB, m2, 1, day);
    expect(u2.rw).toBe(6);
    expect(knownUsage(day)).toEqual(u2);
    const today = await usageToday(createMeter(), env.DB, day);
    expect(today).toMatchObject({ day, rw: 6, n: 2 });
  });

  test('usageToday without a row is all zeros', async () => {
    expect(await usageToday(createMeter(), env.DB, 20200101)).toEqual({ day: 20200101, rw: 0, rr: 0, n: 0 });
  });

  test('dayKey uses UTC days', () => {
    expect(dayKey(new Date('2026-10-30T23:59:59Z'))).toBe(20261030);
    expect(dayKey(new Date('2026-10-31T00:00:00Z'))).toBe(20261031);
  });

  test('overQuota at 80% of writes or reads', () => {
    expect(overQuota({ rw: 79999, rr: 0 }, env)).toBe(false);
    expect(overQuota({ rw: 80000, rr: 0 }, env)).toBe(true);
    expect(overQuota({ rw: 0, rr: 4000000 }, env)).toBe(true);
  });

  test('knownUsage is null for another day', () => {
    rememberUsage({ day: 20261030, rw: 1, rr: 1 });
    expect(knownUsage(20261031)).toBeNull();
  });
});

test('unknown /api route is a JSON 404', async () => {
  const res = await app.request('/api/nope', {}, env);
  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({ error: 'not_found' });
});
