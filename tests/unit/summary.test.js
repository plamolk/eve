import { test, expect } from 'vitest';
import { describe, test as t2, expect as e2 } from 'vitest';
import { emptyAcc, mergeRows, present, bangkokDay } from '../../src/summary.js';
import { TEXT_KEYS } from '../../src/schema.js';

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
  expect(s.donor).toMatchObject({ n: 1, heat: { Z5: { count: 1, avg: 2 } } });
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
  expect(present(emptyAcc())).toMatchObject({ staff: { n: 0, heat: {}, body: {}, rank: [] }, donor: { n: 0, heat: {} } });
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

describe('v2', () => {
  const sec = (iso) => Date.parse(iso) / 1000;
  const row = (id, role, data, created, src) => ({ id, role, created, src, data: JSON.stringify({ role, msd: {}, map: {}, ...data }) });
  const STAFF_ROWS = [
    row(1, 'staff', {
      answers: { pos: 'พยาบาล', ht: '155-165', yrs: '5', rank: ['ซ่อนสาย', 'ทางเดินกว้างขึ้น', 'ทำความสะอาดง่าย'], other: 'x' },
      msd: { 'คอ': { y: 'ใช่', w: 'ไม่', s: 4 } },
      map: { A3: { t: ['คับแคบ', 'เอื้อมยาก'], p: ['พนักพิง'], sev: 4, n: 'แคบ' } }
    }, sec('2026-10-30T17:30:00Z'), 0),
    row(2, 'staff', {
      answers: { pos: 'พยาบาล', yrs: '7', rank: ['ทางเดินกว้างขึ้น', 'ซ่อนสาย', 'ทำความสะอาดง่าย'], other: 'x', noMsd: true }
    }, sec('2026-10-30T16:59:00Z'), 1)
  ];
  const DONOR_ROWS = [row(3, 'donor', { answers: { seat: 4, uneasy: ['แสง', 'สี'], noMap: true } }, sec('2026-10-31T03:00:00Z'), 0)];

  t2('emptyAcc is version 2 with the same keys for both roles', () => {
    const a = emptyAcc();
    e2(a.v).toBe(2);
    e2(Object.keys(a.donor).sort()).toEqual(Object.keys(a.staff).sort());
    e2(Object.keys(a.staff).sort()).toEqual(['body', 'days', 'heat', 'msd', 'n', 'noMap', 'noMsd', 'notes', 'num', 'q', 'rank', 'rank1', 'src1', 'text', 'zp', 'zt'].sort());
  });

  t2('bangkokDay uses UTC+7', () => {
    e2(bangkokDay(sec('2026-10-30T17:30:00Z'))).toBe('2026-10-31');
    e2(bangkokDay(sec('2026-10-30T16:59:00Z'))).toBe('2026-10-30');
  });

  t2('staff rows count every question type', () => {
    const s = present(mergeRows(emptyAcc(), STAFF_ROWS)).staff;
    e2(s.q.pos).toEqual({ 'พยาบาล': 2 });
    e2(Object.values(s.q.ht).reduce((a, b) => a + b, 0)).toBe(1);
    e2(s.num.yrs).toEqual({ '5': 1, '7': 1 });
    e2(s.rank1).toEqual({ 'ซ่อนสาย': 1, 'ทางเดินกว้างขึ้น': 1 });
    e2(s.q.rank).toEqual({ 'ซ่อนสาย': 2, 'ทางเดินกว้างขึ้น': 2, 'ทำความสะอาดง่าย': 2 });
    e2(s.msd['คอ']).toEqual({ n: 1, y: 1, w: 0, avg: 4, dist: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0] });
    e2(s.noMsd).toBe(1);
    e2(s.zones.A3.t).toEqual([['คับแคบ', 1], ['เอื้อมยาก', 1]]);
    e2(s.zones.A3.p).toEqual([['พนักพิง', 1]]);
    e2(s.notes).toBe(1);
    e2(s.text.other).toBe(2);
    e2(s.src1).toBe(1);
    e2(s.days).toEqual([['2026-10-30', 1], ['2026-10-31', 1]]);
  });

  t2('donor rows count scale, multi and noMap', () => {
    const d = present(mergeRows(emptyAcc(), DONOR_ROWS)).donor;
    e2(d.q.seat).toEqual({ '4': 1 });
    e2(d.q.uneasy).toEqual({ 'แสง': 1, 'สี': 1 });
    e2(d.noMap).toBe(1);
    e2(d.n).toBe(1);
  });

  t2('merging v2 rows in chunks equals merging at once', () => {
    const all = [...STAFF_ROWS, ...DONOR_ROWS];
    const once = mergeRows(emptyAcc(), all);
    const chunked = mergeRows(mergeRows(emptyAcc(), all.slice(0, 2)), all.slice(2));
    e2(chunked).toEqual(once);
  });

  t2('values outside the schema are skipped', () => {
    const bad = row(5, 'staff', {
      answers: { pos: 'หมอ' },
      msd: { 'คอ': { y: 'ใช่', w: 'ใช่', s: 12 } },
      map: { A1: { t: ['ร้อน'], p: ['หลังคา'], sev: 2, n: '' } }
    }, sec('2026-10-31T01:00:00Z'), 0);
    const s = present(mergeRows(emptyAcc(), [bad])).staff;
    e2(s.q.pos || {}).toEqual({});
    e2(s.msd['คอ'].dist).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    e2(s.zones.A1).toEqual({ t: [], p: [] });
  });

  t2('a __proto__ zone is not counted and does not pollute Object.prototype', () => {
    const evil = { id: 6, role: 'staff', created: sec('2026-10-31T01:00:00Z'), src: 0,
      data: '{"role":"staff","answers":{},"msd":{},"map":{"__proto__":{"t":["คับแคบ"],"sev":1,"n":"x"}}}' };
    const s = present(mergeRows(emptyAcc(), [evil])).staff;
    e2(({}).t).toBeUndefined();
    e2(s.zones).toEqual({});
    e2(s.notes).toBe(0);
  });

  t2('TEXT_KEYS lists the textarea questions in survey order', () => {
    e2(TEXT_KEYS).toEqual({ staff: ['rowdiff', 'cleanspot', 'material', 'setup', 'faint', 'worry', 'other'], donor: ['improve'] });
  });
});
