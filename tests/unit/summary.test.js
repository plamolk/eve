import { test, expect } from 'vitest';
import { emptyAcc, mergeRows, present } from '../../src/summary.js';

const r = (id, role, data) => ({ id, role, data: JSON.stringify({ role, msd: {}, map: {}, ...data }) });
const ROWS = [
  r(1, 'staff', { answers: { rank: ['ซ่อนสาย', 'ทางเดินกว้างขึ้น', 'ทำความสะอาดง่าย'] }, msd: { 'คอ': { y: 'ใช่', w: 'ไม่', s: 3 }, 'ไหล่': { y: 'ใช่', w: 'ใช่', s: 5 } }, map: { A3: { t: ['คับแคบ'], p: [], sev: 4, n: '' } } }),
  r(2, 'staff', { answers: { rank: ['ซ่อนสาย', 'ทำความสะอาดง่าย', 'ทางเดินกว้างขึ้น'], noMsd: true }, map: { A3: { t: ['คับแคบ'], p: [], sev: 5, n: '' } } }),
  r(3, 'donor', { answers: { noMap: false }, map: { Z5: { t: ['คับแคบ'], sev: 2, n: '' } } })
];

test('present() gives the shapes the components take', () => {
  const s = present(mergeRows(emptyAcc(), ROWS));
  expect(s.staff.n).toBe(2);
  expect(s.staff.heat).toEqual({ A3: { count: 2, avg: 4.5 } });
  expect(s.staff.body).toEqual({ 'คอ': 1, 'ไหล่': 1 });
  expect(s.staff.rank).toEqual([['ซ่อนสาย', 6], ['ทางเดินกว้างขึ้น', 3], ['ทำความสะอาดง่าย', 3]]);
  expect(s.donor).toEqual({ n: 1, heat: { Z5: { count: 1, avg: 2 } } });
});

test('merging in chunks equals merging at once', () => {
  const once = mergeRows(emptyAcc(), ROWS);
  const chunked = mergeRows(mergeRows(emptyAcc(), ROWS.slice(0, 1)), ROWS.slice(1));
  expect(chunked).toEqual(once);
});

test('mergeRows does not change its input', () => {
  const acc = emptyAcc();
  mergeRows(acc, ROWS);
  expect(acc).toEqual(emptyAcc());
});

test('avg is rounded to one decimal', () => {
  const rows = [4, 4, 5].map((sev, i) => r(i + 1, 'donor', { answers: {}, map: { B2: { t: ['คับแคบ'], p: [], sev, n: '' } } }));
  expect(present(mergeRows(emptyAcc(), rows)).donor.heat.B2).toEqual({ count: 3, avg: 4.3 });
});

test('empty accumulator presents empty summaries', () => {
  expect(present(emptyAcc())).toEqual({ staff: { n: 0, heat: {}, body: {}, rank: [] }, donor: { n: 0, heat: {} } });
});

test('rows with inherited keys never touch Object.prototype', () => {
  const evil = { id: 9, role: 'staff', data: '{"role":"staff","answers":{"rank":["__proto__","constructor"]},"msd":{"__proto__":{"y":"ใช่","w":"ไม่","s":1}},"map":{"__proto__":{"t":["คับแคบ"],"sev":3,"n":""},"toString":{"t":["คับแคบ"],"sev":3,"n":""}}}' };
  const s = present(mergeRows(emptyAcc(), [evil]));
  expect(({}).c).toBeUndefined();
  expect(({}).s).toBeUndefined();
  expect(s.staff.heat).toEqual({});
  expect(s.staff.body).toEqual({});
  expect(s.staff.rank).toEqual([]);
});
