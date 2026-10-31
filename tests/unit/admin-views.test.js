import { describe, test, expect } from 'vitest';
import { loadBrowser } from '../helpers/load-browser.js';

const plain = (v) => JSON.parse(JSON.stringify(v));

function stubFetch(responses) {
  const calls = [];
  let i = 0;
  const fetch = async (url, opts) => {
    calls.push(url);
    const r = typeof responses === 'function' ? responses(url, i) : responses[Math.min(i, responses.length - 1)];
    i += 1;
    return { status: r.status || 200, ok: (r.status || 200) < 400, text: async () => JSON.stringify(r.body === undefined ? {} : r.body) };
  };
  return { fetch, calls };
}

const load = (globals) => loadBrowser(['public/js/admin/stats.js', 'public/js/admin/api.js'], globals);

describe('adminStats', () => {
  const S = load().adminStats;

  test('pct rounds to one decimal and drops .0', () => {
    expect(S.pct(2, 3)).toBe('66.7%');
    expect(S.pct(1, 2)).toBe('50%');
    expect(S.pct(0, 0)).toBe('0%');
  });

  test('freqStats gives mean, median, min and max from a frequency table', () => {
    expect(plain(S.freqStats({ '5': 1, '7': 1 }))).toEqual({ n: 2, mean: 6, median: 6, min: 5, max: 7 });
    expect(S.freqStats({ '1': 1, '2': 1, '9': 1 }).median).toBe(2);
    expect(S.freqStats({ '3': 2, '10': 1 }).median).toBe(3);
    expect(plain(S.freqStats({}))).toEqual({ n: 0, mean: null, median: null, min: null, max: null });
  });

  test('bins keeps each value when there are few and makes 20 even ranges when there are many', () => {
    expect(plain(S.bins({ '3': 2, '1': 1 }))).toEqual([['1', 1], ['3', 2]]);
    const many = {};
    for (let v = 1; v <= 30; v++) many[String(v)] = 1;
    const b = S.bins(many);
    expect(b.length).toBe(20);
    expect(b.reduce((a, r) => a + r[1], 0)).toBe(30);
    expect(b[0][0]).toMatch(/^1–/);
    expect(b[19][0]).toMatch(/–30$/);
  });

  test('fillDays fills every day between the first and last with zeros', () => {
    expect(plain(S.fillDays([['2026-10-30', 2]], [['2026-11-01', 1]]))).toEqual([
      ['2026-10-30', 2, 0], ['2026-10-31', 0, 0], ['2026-11-01', 0, 1]
    ]);
    expect(plain(S.fillDays([], []))).toEqual([]);
  });

  test('bangkokDate and bangkokTime use UTC+7', () => {
    const sec = Date.parse('2026-10-30T17:30:00Z') / 1000;
    expect(S.bangkokDate(sec)).toBe('2026-10-31');
    expect(S.bangkokTime(sec)).toBe('2026-10-31 00:30');
  });
});

describe('adminApi', () => {
  test('summaryAll keeps calling while more is true', async () => {
    const { fetch, calls } = stubFetch([{ body: { more: true } }, { body: { more: true } }, { body: { more: false, staff: { n: 3 } } }]);
    const api = load({ fetch }).adminApi;
    const seen = [];
    const s = await api.summaryAll((n) => seen.push(n));
    expect(calls.length).toBe(3);
    expect(calls.every((u) => u === '/api/admin/summary')).toBe(true);
    expect(seen).toEqual([1, 2]);
    expect(s.staff.n).toBe(3);
  });

  test('summaryAll stops after 50 calls', async () => {
    const { fetch, calls } = stubFetch([{ body: { more: true } }]);
    const s = await load({ fetch }).adminApi.summaryAll();
    expect(calls.length).toBe(50);
    expect(s.more).toBe(true);
  });

  test('call rejects with auth on 401', async () => {
    const { fetch } = stubFetch([{ status: 401, body: { error: 'auth' } }]);
    await expect(load({ fetch }).adminApi.call('GET', '/api/admin/summary')).rejects.toMatchObject({ auth: true });
  });

  test('comments, responses and response build their URLs', async () => {
    const { fetch, calls } = stubFetch([{ body: { items: [], next: null } }]);
    const api = load({ fetch }).adminApi;
    await api.comments({ key: 'other', role: 'staff', q: 'a b&c', before: undefined, limit: 50 });
    await api.responses({ before: 9, role: '', limit: 50 });
    await api.response(7);
    expect(calls).toEqual([
      '/api/admin/comments?key=other&role=staff&q=a%20b%26c&limit=50',
      '/api/admin/responses?before=9&limit=50',
      '/api/admin/responses/7'
    ]);
  });
});
