import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { env } from 'cloudflare:test';
import app from '../../src/index.js';
import { rememberUsage } from '../../src/quota.js';
import { dayKey } from '../../src/store.js';
import staffFull from '../fixtures/staff-full.json';
import donorFull from '../fixtures/donor-full.json';

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
let ipN = 0;
let calls;
let verify; // siteverify response body
let sheets; // { status, body }

function envelope(data = staffFull, extra = {}) {
  return { v: 1, cid: crypto.randomUUID(), token: 'tok', hp: '', data, ...extra };
}

function post(body, ip = '10.0.0.' + (++ipN)) {
  return app.request('/api/submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  }, env);
}

const rows = async () => (await env.DB.prepare('SELECT * FROM responses').all()).results;

beforeEach(async () => {
  await env.DB.exec('DELETE FROM responses; DELETE FROM usage;');
  rememberUsage({ day: dayKey(), rw: 0, rr: 0 });
  calls = [];
  verify = { success: true, hostname: 'survey.test', action: 'submit' };
  sheets = { status: 200, body: { ok: true } };
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const u = String(url);
    calls.push({ url: u, body: init && init.body });
    if (u === SITEVERIFY) return Response.json(verify);
    if (u === env.SHEETS_URL) return Response.json(sheets.body, { status: sheets.status });
    throw new Error('unexpected fetch ' + u);
  });
});

afterEach(() => { vi.restoreAllMocks(); });

describe('strict Turnstile with unset ALLOWED_HOSTS', () => {
  test('rejects and logs a configuration error', async () => {
    const { turnstileAccepted } = await import('../../src/turnstile.js');
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(turnstileAccepted({ ok: true, hostname: 'x', action: 'submit' }, { TURNSTILE_STRICT: '1', ALLOWED_HOSTS: 'REPLACE_WITH_HOSTNAME' })).toBe(false);
    expect(turnstileAccepted({ ok: true, hostname: 'x', action: 'submit' }, { TURNSTILE_STRICT: '1', ALLOWED_HOSTS: '' })).toBe(false);
    expect(err).toHaveBeenCalledWith(expect.stringContaining('ALLOWED_HOSTS'));
  });

  test('wrangler.jsonc ships a placeholder the pre-launch grep catches', async () => {
    const cfg = (await import('../../wrangler.jsonc?raw')).default;
    expect(cfg).toMatch(/"ALLOWED_HOSTS": "REPLACE_WITH_HOSTNAME"/);
  });
});

describe('POST /api/submit', () => {
  test('stores one row with the data unchanged and counts 3 written rows', async () => {
    const res = await post(envelope());
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
    const r = await rows();
    expect(r).toHaveLength(1);
    expect(r[0].role).toBe('staff');
    expect(r[0].src).toBe(0);
    expect(JSON.parse(r[0].data)).toEqual(staffFull);
    const u = await env.DB.prepare('SELECT rw, n FROM usage').first();
    expect(u).toEqual({ rw: 3, n: 1 });
  });

  test('same cid twice stores one row and still answers 201', async () => {
    const e = envelope(donorFull);
    expect((await post(e)).status).toBe(201);
    expect((await post(e)).status).toBe(201);
    expect(await rows()).toHaveLength(1);
  });

  test('honeypot: 201 but nothing stored and Turnstile not called', async () => {
    const res = await post(envelope(staffFull, { hp: 'http://spam' }));
    expect(res.status).toBe(201);
    expect(await rows()).toHaveLength(0);
    expect(calls).toHaveLength(0);
  });

  test('invalid data → 400 with field, D1 untouched', async () => {
    const d = structuredClone(staffFull); d.answers.yrs = '-1';
    const res = await post(envelope(d));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid', field: 'answers.yrs' });
    expect(await env.DB.prepare('SELECT COUNT(*) AS n FROM usage').first()).toEqual({ n: 0 });
  });

  test('broken JSON → 400', async () => {
    const res = await post('{not json');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid', field: 'body' });
  });

  test('body over 16384 bytes → 413 and D1 untouched', async () => {
    const res = await post('x'.repeat(16385));
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: 'too_large' });
    expect(await env.DB.prepare('SELECT COUNT(*) AS n FROM usage').first()).toEqual({ n: 0 });
  });

  test('Turnstile failure → 403', async () => {
    verify = { success: false };
    const res = await post(envelope());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'turnstile' });
    expect(await rows()).toHaveLength(0);
  });

  test('strict mode rejects a foreign hostname or action', async () => {
    verify = { success: true, hostname: 'evil.example', action: 'submit' };
    expect((await post(envelope())).status).toBe(403);
    verify = { success: true, hostname: 'survey.test', action: 'login' };
    expect((await post(envelope())).status).toBe(403);
  });

  test('siteverify receives secret, token and IP', async () => {
    await post(envelope(), '10.9.9.9');
    const form = new URLSearchParams(calls[0].body);
    expect(form.get('secret')).toBe('test-secret');
    expect(form.get('response')).toBe('tok');
    expect(form.get('remoteip')).toBe('10.9.9.9');
  });

  test('6th request from one IP within a minute → 429 rate', async () => {
    const ip = '10.200.0.1';
    for (let i = 0; i < 5; i++) expect((await post(envelope(donorFull), ip)).status).toBe(201);
    const res = await post(envelope(donorFull), ip);
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'rate' });
  });

  test('at 80% of the write quota answers go to Sheets (202), not D1', async () => {
    rememberUsage({ day: dayKey(), rw: 80000, rr: 0 });
    const e = envelope(donorFull);
    const res = await post(e);
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true, queued: true });
    expect(await rows()).toHaveLength(0);
    const sent = JSON.parse(calls.find((c) => c.url === env.SHEETS_URL).body);
    expect(sent).toEqual({ auth: 'worker', key: 'dev-sheets-token', via: 'worker', cid: e.cid, data: donorFull });
  });

  test('D1 error → Sheets (202)', async () => {
    await env.DB.exec('DROP TABLE responses');
    try {
      const res = await post(envelope(donorFull));
      expect(res.status).toBe(202);
      expect(calls.some((c) => c.url === env.SHEETS_URL)).toBe(true);
    } finally {
      await env.DB.exec("CREATE TABLE responses (id INTEGER PRIMARY KEY, cid TEXT NOT NULL UNIQUE, role TEXT NOT NULL CHECK (role IN ('staff','donor')), data TEXT NOT NULL, created INTEGER NOT NULL, src INTEGER NOT NULL DEFAULT 0) STRICT");
    }
  });

  test('D1 error and Sheets error → 503 unavailable', async () => {
    sheets = { status: 500, body: { ok: false } };
    await env.DB.exec('DROP TABLE responses');
    try {
      const res = await post(envelope(donorFull));
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: 'unavailable' });
    } finally {
      await env.DB.exec("CREATE TABLE responses (id INTEGER PRIMARY KEY, cid TEXT NOT NULL UNIQUE, role TEXT NOT NULL CHECK (role IN ('staff','donor')), data TEXT NOT NULL, created INTEGER NOT NULL, src INTEGER NOT NULL DEFAULT 0) STRICT");
    }
  });
});
