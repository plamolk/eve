import { test, expect } from 'vitest';
import { signSession, verifySession } from '../../src/auth.js';

const KEY = 'k1';

test('a signed session verifies before it expires', async () => {
  const v = await signSession(KEY, 2000);
  expect(v).toMatch(/^2000\.[A-Za-z0-9_-]+$/);
  expect(await verifySession(KEY, v, 1999)).toBe(true);
});

test('tampered signature fails', async () => {
  const v = await signSession(KEY, 2000);
  const last = v.slice(-1);
  expect(await verifySession(KEY, v.slice(0, -1) + (last === 'A' ? 'B' : 'A'), 1999)).toBe(false);
});

test('changed expiry fails', async () => {
  const v = await signSession(KEY, 2000);
  expect(await verifySession(KEY, v.replace(/^2000/, '9999'), 1999)).toBe(false);
});

test('expired session fails', async () => {
  expect(await verifySession(KEY, await signSession(KEY, 2000), 2000)).toBe(false);
});

test('other key fails', async () => {
  expect(await verifySession('k2', await signSession(KEY, 2000), 1)).toBe(false);
});

test.each(['', 'garbage', '2000.', '.abc', undefined])('malformed %j fails', async (v) => {
  expect(await verifySession(KEY, v, 1)).toBe(false);
});
