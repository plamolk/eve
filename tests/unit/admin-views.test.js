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

// ---------- มุมมองของแท็บ (โหลดไฟล์หน้าแอดมินครบชุด) ----------
import { emptyAcc, present } from '../../src/summary.js';

const VIEW_FILES = [
  'public/js/shared/ui.js', 'public/js/data/common.js', 'public/js/data/staff.js', 'public/js/data/donor.js',
  'public/js/data/bus-layout.js', 'public/js/data/body-regions.js',
  'public/js/components/bus-map.js', 'public/js/components/body-map.js',
  'public/js/admin/stats.js', 'public/js/admin/api.js', 'public/js/admin/overview.js', 'public/js/admin/questions.js',
  'public/js/admin/admin.js'
];
const loadViews = (extra = []) => loadBrowser(VIEW_FILES.concat(extra));
const base = () => ({ updated: 0, more: false, usage: { day: 1, rw: 0, rr: 0, n: 0, limits: { rw: 100000, rr: 5000000 } }, ...present(emptyAcc()) });

function fixture() {
  const s = base();
  Object.assign(s.staff, {
    n: 2,
    q: { pos: { 'พยาบาล': 2 }, ht: { '155-165': 1 } },
    num: { yrs: { '5': 1, '7': 1 } },
    text: { other: 2 },
    rank: [['ซ่อนสาย', 5], ['ทางเดินกว้างขึ้น', 5], ['ทำความสะอาดง่าย', 2]],
    rank1: { 'ซ่อนสาย': 1, 'ทางเดินกว้างขึ้น': 1 },
    msd: { 'คอ': { n: 1, y: 1, w: 0, avg: 4, dist: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0] } },
    noMsd: 1,
    heat: { A3: { count: 1, avg: 4 } },
    zones: { A3: { t: [['คับแคบ', 1], ['เอื้อมยาก', 1]], p: [['พนักพิง', 1]] } },
    noMap: 0
  });
  Object.assign(s.donor, { n: 2, q: { seat: { '4': 1, '2': 1 }, uneasy: { 'แสง': 2, 'สี': 1 } } });
  return s;
}
const optRow = (label, value) => new RegExp(label + '</span><span[^>]*></span><span[^>]*>' + value.replace(/[()]/g, '\\$&') + '<');

describe('questions tab', () => {
  test('pills list every option, zero ones included, with % of people who answered', () => {
    const html = loadViews().adminViews.questions(fixture(), 'staff');
    expect(html).toMatch(optRow('พยาบาล', '2 (100%)'));
    expect(html).toMatch(optRow('อื่น ๆ', '0 (0%)'));
    expect(html).toContain('ตอบ 1 จาก 2 คน');
    expect(html).toContain('ตำแหน่งงาน');
    expect(html).toContain('ส่วน A ข้อมูลทั่วไป');
  });

  test('scale shows the option labels and the mean', () => {
    const html = loadViews().adminViews.questions(fixture(), 'donor');
    expect(html).toContain('ค่าเฉลี่ย 3');
    expect(html).toContain('5 เห็นด้วยอย่างยิ่ง');
  });

  test('multi counts against everyone in the role and says the total can pass 100%', () => {
    const html = loadViews().adminViews.questions(fixture(), 'donor');
    expect(html).toMatch(optRow('แสง', '2 (100%)'));
    expect(html).toMatch(optRow('สี', '1 (50%)'));
    expect(html).toContain('เลือกได้หลายข้อ ผลรวมเกิน 100% ได้');
  });

  test('number shows mean, median, min and max', () => {
    const html = loadViews().adminViews.questions(fixture(), 'staff');
    for (const s of ['ค่าเฉลี่ย 6', 'มัธยฐาน 6', 'ต่ำสุด 5', 'สูงสุด 7']) expect(html).toContain(s);
  });

  test('rank shows total points, sorted, with a first-place column', () => {
    const html = loadViews().adminViews.questions(fixture(), 'staff');
    expect(html).toContain('อันดับ 1 (คน)');
    expect(html.indexOf('ทำความสะอาดง่าย')).toBeGreaterThan(html.indexOf('ซ่อนสาย'));
  });

  test('long text shows the count and a link to the comments tab', () => {
    const html = loadViews().adminViews.questions(fixture(), 'staff');
    expect(html).toContain('2 ความคิดเห็น');
    expect(html).toContain('data-action="gocomments" data-key="other"');
  });

  test('body map section is a table per region with the no-pain count', () => {
    const html = loadViews().adminViews.questions(fixture(), 'staff');
    expect(html).toMatch(/<th scope="row"[^>]*>คอ<\/th><td[^>]*>1<\/td><td[^>]*>1<\/td><td[^>]*>0<\/td><td[^>]*>4<\/td>/);
    expect(html).toContain('ไม่มีอาการ 1 คน');
    expect(html).toContain('scope="col"');
  });

  test('bus map section lists each point with its top problem types', () => {
    const html = loadViews().adminViews.questions(fixture(), 'staff');
    expect(html).toContain('คับแคบ (1)');
    expect(html).toContain('พนักพิง (1)');
    expect(html).toContain('ไม่พบปัญหา 0 คน');
  });

  test('a role with no answers shows the empty state once and never NaN', () => {
    const html = loadViews().adminViews.questions(base(), 'donor');
    expect(html.match(/ยังไม่มีข้อมูล/g)).toHaveLength(1);
    expect(html).not.toMatch(/NaN|Infinity/);
    expect(html).toContain('data-action="qrole" data-value="staff"');
  });
});
