// Code.gs runs in Google Apps Script; here it runs in node:vm with small stand-ins for the Google services.
import { describe, test, expect, beforeEach } from 'vitest';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const CODE = readFileSync(new URL('../../tools/apps-script/Code.gs', import.meta.url), 'utf8');
const CID = (n) => '6f1c2b3a-1111-4222-8333-' + String(n).padStart(12, '0');
const DATA = { role: 'donor', answers: { age: '18-25', noMap: true }, msd: {}, map: {} };

function makeSheet(rows = []) {
  // rows exclude the header row (row 1)
  return {
    rows,
    getLastRow: () => rows.length + 1,
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => rows.slice(r - 2, r - 2 + nr).map((row) => row.slice(c - 1, c - 1 + nc)),
      setValue: (v) => { rows[r - 2][c - 1] = v; }
    }),
    appendRow: (arr) => { rows.push(arr.slice()); }
  };
}

let ctx, deps, mails, fetches, verify, worker;

beforeEach(() => {
  ctx = { console, JSON, Date, Math };
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx);
  mails = [];
  fetches = [];
  verify = { success: true, action: 'submit', hostname: 'survey.test' };
  worker = { code: 200, body: null };
  const props = { SHEETS_TOKEN: 'sheet-key', IMPORT_TOKEN: 'imp', TURNSTILE_SECRET: 'ts', WORKER_URL: 'https://w.test', ALLOWED_HOSTNAME: 'survey.test' };
  deps = {
    props,
    setProp: (k, v) => { props[k] = v; },
    sheet: makeSheet(),
    now: new Date('2026-10-31T03:00:00Z'),
    today: (d) => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10),
    mail: (subject, body) => mails.push({ subject, body }),
    lock: { waitLock: () => {}, releaseLock: () => {} },
    fetch: (url, opts) => {
      fetches.push({ url, opts });
      const body = url.includes('siteverify') ? verify : worker.body;
      return { getResponseCode: () => (url.includes('siteverify') ? 200 : worker.code), getContentText: () => JSON.stringify(body) };
    }
  };
});

const handle = (p) => ctx.handle_(p, deps);

describe('handle_', () => {
  test('worker with the right key appends one row', () => {
    expect(handle({ auth: 'worker', key: 'sheet-key', cid: CID(1), data: DATA })).toEqual({ ok: true });
    expect(deps.sheet.rows).toEqual([['2026-10-31T03:00:00.000Z', CID(1), 'donor', JSON.stringify(DATA), 'worker', '']]);
  });

  test('wrong key → auth', () => {
    expect(handle({ auth: 'worker', key: 'nope', cid: CID(1), data: DATA })).toEqual({ ok: false, error: 'auth' });
    expect(deps.sheet.rows).toHaveLength(0);
  });

  test('browser path verifies the Turnstile token', () => {
    expect(handle({ auth: 'turnstile', token: 't', cid: CID(2), data: DATA })).toEqual({ ok: true });
    expect(fetches[0].url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(fetches[0].opts.payload).toEqual({ secret: 'ts', response: 't' });
    expect(deps.sheet.rows[0][4]).toBe('browser');
  });

  test.each([
    [{ success: false }],
    [{ success: true, action: 'submit', hostname: 'evil.example' }],
    [{ success: true, action: 'login', hostname: 'survey.test' }]
  ])('Turnstile result %j → auth', (v) => {
    verify = v;
    expect(handle({ auth: 'turnstile', token: 't', cid: CID(3), data: DATA })).toEqual({ ok: false, error: 'auth' });
  });

  test('duplicate cid → ok without a second row', () => {
    handle({ auth: 'worker', key: 'sheet-key', cid: CID(4), data: DATA });
    expect(handle({ auth: 'worker', key: 'sheet-key', cid: CID(4), data: DATA })).toEqual({ ok: true });
    expect(deps.sheet.rows).toHaveLength(1);
  });

  test.each([
    [{ auth: 'worker', key: 'sheet-key', cid: CID(5), data: { ...DATA, role: 'x' } }],
    [{ auth: 'worker', key: 'sheet-key', cid: 'abc', data: DATA }],
    [{ auth: 'worker', key: 'sheet-key', cid: CID(5), data: { ...DATA, answers: { t: 'ก'.repeat(14000) } } }]
  ])('bad payload → invalid', (p) => {
    expect(handle(p)).toEqual({ ok: false, error: 'invalid' });
  });

  test('one alert email per Bangkok day', () => {
    handle({ auth: 'worker', key: 'sheet-key', cid: CID(6), data: DATA });
    handle({ auth: 'worker', key: 'sheet-key', cid: CID(7), data: DATA });
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toBe('แบบสอบถาม: มีคำตอบเข้าทางสำรอง');
    deps.now = new Date('2026-11-01T03:00:00Z');
    handle({ auth: 'worker', key: 'sheet-key', cid: CID(8), data: DATA });
    expect(mails).toHaveLength(2);
  });
});

describe('syncBatch_', () => {
  const fill = (n) => {
    for (let i = 0; i < n; i++) deps.sheet.rows.push(['2026-10-31T01:00:00.000Z', CID(100 + i), 'donor', JSON.stringify(DATA), 'worker', '']);
  };

  test('sends at most 40 unsynced rows with the import token', () => {
    fill(45);
    worker.body = { accepted: [], rejected: [] };
    const r = ctx.syncBatch_(deps);
    expect(r.sent).toBe(40);
    const call = fetches[0];
    expect(call.url).toBe('https://w.test/api/import');
    expect(call.opts.headers).toEqual({ Authorization: 'Bearer imp' });
    const body = JSON.parse(call.opts.payload);
    expect(body.items).toHaveLength(40);
    expect(body.items[0]).toEqual({ cid: CID(100), data: DATA, received: Math.floor(Date.parse('2026-10-31T01:00:00.000Z') / 1000) });
  });

  test('marks only accepted rows as synced', () => {
    fill(45);
    const accepted = Array.from({ length: 39 }, (_, i) => CID(100 + i));
    worker.body = { accepted, rejected: [{ cid: CID(139), field: 'answers.age' }] };
    expect(ctx.syncBatch_(deps)).toEqual({ sent: 40, accepted: 39 });
    expect(deps.sheet.rows.filter((r) => r[5] !== '')).toHaveLength(39);
    expect(deps.sheet.rows[0][5]).toBe('2026-10-31T03:00:00.000Z');
  });

  test('worker 503 marks nothing', () => {
    fill(3);
    worker.code = 503;
    worker.body = { error: 'quota' };
    expect(ctx.syncBatch_(deps)).toEqual({ sent: 3, accepted: 0 });
    expect(deps.sheet.rows.every((r) => r[5] === '')).toBe(true);
  });

  test('nothing to send', () => {
    expect(ctx.syncBatch_(deps)).toEqual({ sent: 0, accepted: 0 });
    expect(fetches).toHaveLength(0);
  });

  test('Date objects from the sheet are accepted as received', () => {
    deps.sheet.rows.push([new Date('2026-10-31T01:00:00Z'), CID(200), 'donor', JSON.stringify(DATA), 'worker', '']);
    worker.body = { accepted: [CID(200)], rejected: [] };
    ctx.syncBatch_(deps);
    expect(JSON.parse(fetches[0].opts.payload).items[0].received).toBe(1793408400);
  });
});
