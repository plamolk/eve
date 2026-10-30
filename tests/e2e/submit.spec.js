import { test, expect } from '@playwright/test';
import { stubTurnstile, openSurvey, answerAll, STAFF, STAFF_DATA, DONOR, DONOR_DATA, SHEETS, CORS } from './helpers.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const submitBtn = (page) => page.getByText('ส่งคำตอบ', { exact: true });

test.beforeEach(async ({ page }) => { await stubTurnstile(page); });

async function mockApi(page, status, body, contentType = 'application/json', delay = 0) {
  const seen = [];
  await page.route('**/api/submit', async (r) => {
    seen.push(r.request().postDataJSON());
    if (delay) await new Promise((res) => setTimeout(res, delay));
    await r.fulfill({ status, contentType, body: typeof body === 'string' ? body : JSON.stringify(body) });
  });
  return seen;
}

async function mockSheets(page, body = { ok: true }, status = 200) {
  const seen = [];
  await page.route(SHEETS, async (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    seen.push(JSON.parse(r.request().postData()));
    await r.fulfill({ status, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return seen;
}

async function donorToEnd(page) {
  await openSurvey(page, 'donor');
  await answerAll(page, 'donor', DONOR);
}

test('staff run posts envelope with legacy data', async ({ page }) => {
  const seen = await mockApi(page, 201, { ok: true });
  await openSurvey(page, 'staff');
  await answerAll(page, 'staff', STAFF);
  await submitBtn(page).click();
  await expect(page).toHaveURL(/\/thanks(\.html)?$/);
  expect(seen).toHaveLength(1);
  const env = seen[0];
  expect(env.v).toBe(1);
  expect(env.cid).toMatch(UUID);
  expect(env.token).toBe('XXXX.DUMMY.TOKEN.XXXX');
  expect(env.hp).toBe('');
  expect(env.data).toEqual(STAFF_DATA);
  expect(await page.evaluate(() => localStorage.getItem('eve-draft'))).toBeNull();
});

test('donor run posts envelope with noMap', async ({ page }) => {
  const seen = await mockApi(page, 201, { ok: true });
  await donorToEnd(page);
  await submitBtn(page).click();
  await expect(page).toHaveURL(/\/thanks(\.html)?$/);
  expect(seen[0].data).toEqual(DONOR_DATA);
});

test('thanks page has no copy button and no JSON', async ({ page }) => {
  await page.goto('/thanks.html');
  await expect(page.getByText('ขอบคุณค่ะ 🙏')).toBeVisible();
  await expect(page.getByText('คัดลอกคำตอบ')).toHaveCount(0);
  await expect(page.locator('pre')).toHaveCount(0);
  await expect(page.getByText('เริ่มใหม่', { exact: true })).toHaveAttribute('href', 'index.html');
});

test('double click sends exactly one request', async ({ page }) => {
  const seen = await mockApi(page, 201, { ok: true }, 'application/json', 1000);
  await donorToEnd(page);
  await submitBtn(page).click();
  await page.locator('[data-action="submit"]').click({ force: true }).catch(() => {});
  await expect(page).toHaveURL(/\/thanks(\.html)?$/);
  expect(seen).toHaveLength(1);
});

test('worker down falls back to Apps Script', async ({ page }) => {
  await mockApi(page, 503, '<html>error 1027</html>', 'text/html');
  const sheets = await mockSheets(page);
  await donorToEnd(page);
  await submitBtn(page).click();
  await expect(page).toHaveURL(/\/thanks(\.html)?$/);
  expect(sheets).toHaveLength(1);
  expect(sheets[0]).toMatchObject({ auth: 'turnstile', token: 'XXXX.DUMMY.TOKEN.XXXX', data: DONOR_DATA });
  expect(sheets[0].cid).toMatch(UUID);
});

test('both down shows unavailable with retry, keeps draft, and has no copy button or JSON', async ({ page }) => {
  await mockApi(page, 502, 'bad gateway', 'text/plain');
  await mockSheets(page, { ok: false }, 500);
  await donorToEnd(page);
  await submitBtn(page).click();
  await expect(page.getByText('ระบบรับคำตอบขัดข้องชั่วคราว', { exact: false })).toBeVisible();
  await expect(page.getByText('ส่งอีกครั้ง', { exact: true })).toBeVisible();
  await expect(page.getByText('คัดลอกคำตอบ')).toHaveCount(0);
  await expect(page.locator('pre')).toHaveCount(0);
  const draft = JSON.parse(await page.evaluate(() => localStorage.getItem('eve-draft')));
  expect(draft).toMatchObject({ v: 1, role: 'donor', answers: DONOR_DATA.answers });
});

test('403 turnstile shows a message', async ({ page }) => {
  await mockApi(page, 403, { error: 'turnstile' });
  await donorToEnd(page);
  await submitBtn(page).click();
  await expect(page.getByText('ยืนยันตัวตนไม่สำเร็จ กรุณากดส่งอีกครั้ง')).toBeVisible();
});

test('429 rate shows a message', async ({ page }) => {
  await mockApi(page, 429, { error: 'rate' });
  await donorToEnd(page);
  await submitBtn(page).click();
  await expect(page.getByText('ส่งถี่เกินไป รอสักครู่แล้วลองใหม่')).toBeVisible();
});

test('turnstile script blocked shows message, keeps draft, no page error', async ({ page }) => {
  await page.unroute('**/turnstile/v0/api.js*');
  await page.route('**/turnstile/**', (r) => r.abort());
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const seen = await mockApi(page, 201, { ok: true });
  await donorToEnd(page);
  await submitBtn(page).click();
  await expect(page.getByText('โหลดระบบยืนยันตัวตนไม่สำเร็จ', { exact: false })).toBeVisible();
  expect(seen).toHaveLength(0);
  expect(await page.evaluate(() => localStorage.getItem('eve-draft'))).not.toBeNull();
  expect(errors).toEqual([]);
});

test('submit re-checks all sections', async ({ page }) => {
  const seen = await mockApi(page, 201, { ok: true });
  await donorToEnd(page);
  await page.evaluate(() => { delete App.state.answers.seat; });
  await submitBtn(page).click();
  await expect(page.locator('#app h2').first()).toHaveText('ส่วน B ความสบาย');
  await expect(page.getByText('กรุณาตอบข้อนี้')).toBeVisible();
  expect(seen).toHaveLength(0);
});

test('draft banner resumes answers', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate((a) => localStorage.setItem('eve-draft', JSON.stringify({ v: 1, cid: '6f1c2b3a-1111-4222-8333-444455556666', role: 'donor', step: 4, answers: a, msd: {}, map: {} })), DONOR_DATA.answers);
  await openSurvey(page, 'donor');
  await expect(page.getByText('มีคำตอบที่ยังส่งไม่สำเร็จจากครั้งก่อน')).toBeVisible();
  await page.getByText('ส่งต่อ', { exact: true }).click();
  await expect(page.locator('#app h2').first()).toHaveText('ส่วน E แรงจูงใจ');
  const st = await page.evaluate(() => ({ cid: App.state.cid, answers: App.state.answers }));
  expect(st).toEqual({ cid: '6f1c2b3a-1111-4222-8333-444455556666', answers: DONOR_DATA.answers });
});

test('a saved point with no type left is caught before sending', async ({ page }) => {
  const seen = await mockApi(page, 201, { ok: true });
  await donorToEnd(page);
  await page.evaluate(() => { delete App.state.answers.noMap; App.state.map = { A3: { t: [], p: [], sev: 3, n: '' } }; });
  await submitBtn(page).click();
  await expect(page.locator('#app h2').first()).toContainText('ส่วน D');
  await expect(page.getByText('กรุณาเลือกประเภทปัญหาอย่างน้อย 1 อย่าง')).toBeVisible();
  expect(seen).toHaveLength(0);
});

test('a 400 with a field takes the respondent to that section', async ({ page }) => {
  await mockApi(page, 400, { error: 'invalid', field: 'answers.seat' });
  await donorToEnd(page);
  await submitBtn(page).click();
  await expect(page.locator('#app h2').first()).toHaveText('ส่วน B ความสบาย');
  const missing = page.locator('[data-missing]').first();
  await expect(missing).toContainText('ข้อมูลไม่ถูกต้อง');
  await expect(missing).toContainText('เก้าอี้นั่งสบาย');
});
