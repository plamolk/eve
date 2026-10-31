// End to end against the real local Worker + D1 (Turnstile widget stubbed; the Worker
// verifies the dummy token with Cloudflare's test secret).
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { stubTurnstile, openSurvey, answerAll, STAFF, STAFF_DATA, DONOR, DONOR_DATA } from './helpers.js';

test.describe.configure({ mode: 'serial' });

const DEV = Object.fromEntries(readFileSync('.dev.vars', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const fixture = (n) => JSON.parse(readFileSync('tests/fixtures/' + n + '.json', 'utf8'));
const today = () => Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));

function sql(command) {
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'eve-survey', '--local', '--json', '--command', command], { encoding: 'utf8' });
  return JSON.parse(out)[0].results;
}
const usageNow = () => sql('SELECT rw, rr FROM usage WHERE day = ' + today())[0] || { rw: 0, rr: 0 };

async function adminCookie(request) {
  const res = await request.post('/api/admin/login', { data: { password: DEV.ADMIN_PASSWORD } });
  expect(res.status()).toBe(204);
  return res.headers()['set-cookie'].split(';')[0];
}

async function submit(request, data) {
  return request.post('/api/submit', { data: { v: 1, cid: crypto.randomUUID(), token: 'XXXX.DUMMY.TOKEN.XXXX', hp: '', data } });
}

test.beforeAll(async ({ request }) => {
  sql("DELETE FROM responses; DELETE FROM usage; UPDATE summary SET last_id = 0, data = '{}', updated = 0");
  await request.delete('http://localhost:8790/records');
});

test.beforeEach(async ({ page }) => { await stubTurnstile(page); });

test('every page loads with no console errors or 404', async ({ page }) => {
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/status of 401/.test(m.text())) problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400 && !(r.status() === 401 && r.url().includes('/api/admin/'))) problems.push(r.status() + ' ' + r.url()); });
  for (const p of ['/', '/survey.html?role=staff', '/survey.html?role=donor', '/thanks.html', '/admin.html']) {
    await page.goto(p, { waitUntil: 'networkidle' });
  }
  expect(problems).toEqual([]);
});

test('staff and donor submissions are stored in the legacy format', async ({ page, request }) => {
  for (const [role, spec] of [['staff', STAFF], ['donor', DONOR]]) {
    await openSurvey(page, role);
    await answerAll(page, role, spec);
    await page.getByText('ส่งคำตอบ', { exact: true }).click();
    await expect(page).toHaveURL(/\/thanks(\.html)?$/);
  }
  const cookie = await adminCookie(request);
  const res = await request.get('/api/admin/responses', { headers: { cookie } });
  const { rows } = await res.json();
  expect(rows.map((r) => r.data)).toEqual([STAFF_DATA, DONOR_DATA]);
  expect(rows.map((r) => r.src)).toEqual([0, 0]);
});

test('admin page shows the real counts', async ({ page }) => {
  await page.goto('/admin.html');
  await page.getByLabel('รหัสผ่าน').fill(DEV.ADMIN_PASSWORD);
  await page.getByText('เข้าสู่ระบบ', { exact: true }).click();
  await expect(page.locator('[data-stat="staff"] [data-value]')).toHaveText('1');
  await expect(page.locator('[data-stat="donor"] [data-value]')).toHaveText('1');
  await expect(page.getByText('ซ่อนสาย')).toBeVisible();
});

test('measure rows per submit, per admin open, and payload sizes', async ({ request }) => {
  const u0 = usageNow();
  expect((await submit(request, fixture('staff-full'))).status()).toBe(201);
  const u1 = usageNow();
  const cookie = await adminCookie(request);
  await request.get('/api/admin/summary', { headers: { cookie } });
  const u2 = usageNow();
  const size = (n) => new TextEncoder().encode(JSON.stringify(fixture(n))).length;
  const m = {
    staffFullBytes: size('staff-full'),
    donorFullBytes: size('donor-full'),
    rowsWrittenPerSubmit: u1.rw - u0.rw,
    rowsReadPerSubmit: u1.rr - u0.rr,
    adminOpenRw: u2.rw - u1.rw,
    adminOpenRr: u2.rr - u1.rr
  };
  writeFileSync('docs/reports/measurements.json', JSON.stringify(m, null, 2) + '\n');
  expect(m.rowsWrittenPerSubmit).toBe(3);
});

test('over quota goes to Sheets, and import syncs it back', async ({ request }) => {
  sql('UPDATE usage SET rw = 80000 WHERE day = ' + today());
  expect((await submit(request, fixture('donor-full'))).status()).toBe(201); // learns the new total
  const res = await submit(request, fixture('donor-full'));
  expect(res.status()).toBe(202);
  const records = await (await request.get('http://localhost:8790/records')).json();
  const rec = records.find((r) => r.auth === 'worker');
  expect(rec).toMatchObject({ key: DEV.SHEETS_TOKEN, data: fixture('donor-full') });

  const auth = { authorization: 'Bearer ' + DEV.IMPORT_TOKEN };
  const body = { items: [{ cid: rec.cid, data: rec.data, received: Math.floor(Date.now() / 1000) }] };
  const blocked = await request.post('/api/import', { headers: auth, data: body });
  expect(blocked.status()).toBe(503);

  sql('UPDATE usage SET rw = 0 WHERE day = ' + today());
  const cookie = await adminCookie(request);
  await request.get('/api/admin/summary', { headers: cookie ? { cookie } : {} }); // refreshes the remembered total
  const ok = await request.post('/api/import', { headers: auth, data: body });
  expect(ok.status()).toBe(200);
  expect((await ok.json()).accepted).toEqual([rec.cid]);
  expect(sql("SELECT src FROM responses WHERE cid = '" + rec.cid + "'")).toEqual([{ src: 1 }]);
});
