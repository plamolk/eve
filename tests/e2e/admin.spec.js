import { test, expect } from '@playwright/test';

const usage = { day: 20261030, rw: 160, rr: 170, n: 50, limits: { rw: 100000, rr: 5000000 } };
const SUMMARY = {
  updated: 1793383200, more: false, usage,
  staff: { n: 30, heat: { A3: { count: 9, avg: 4.2 } }, body: { 'คอ': 9 }, rank: [['ซ่อนสาย', 13], ['ทางเดินกว้างขึ้น', 11]] },
  donor: { n: 20, heat: { Z5: { count: 23, avg: 3.1 } } }
};
const EMPTY = { updated: 0, more: false, usage, staff: { n: 0, heat: {}, body: {}, rank: [] }, donor: { n: 0, heat: {} } };

// state.authed decides between 200 and 401 for every admin call
async function mockAdmin(page, { summary = SUMMARY, password = 'right' } = {}) {
  const state = { authed: false };
  await page.route('**/api/admin/summary*', (r) => state.authed
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(summary) })
    : r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"auth"}' }));
  await page.route('**/api/admin/login', (r) => {
    const ok = r.request().postDataJSON().password === password;
    state.authed = ok;
    return r.fulfill(ok ? { status: 204 } : { status: 401, contentType: 'application/json', body: '{"error":"auth"}' });
  });
  await page.route('**/api/admin/logout', (r) => { state.authed = false; return r.fulfill({ status: 204 }); });
  return state;
}

async function login(page, pw = 'right') {
  await page.getByLabel('รหัสผ่าน').fill(pw);
  await page.getByText('เข้าสู่ระบบ', { exact: true }).click();
}

test('shows login when unauthenticated', async ({ page }) => {
  await mockAdmin(page);
  await page.goto('/admin.html');
  await expect(page.getByLabel('รหัสผ่าน')).toBeVisible();
});

test('wrong password shows a message', async ({ page }) => {
  await mockAdmin(page);
  await page.goto('/admin.html');
  await login(page, 'nope');
  await expect(page.getByText('รหัสผ่านไม่ถูกต้อง')).toBeVisible();
});

test('login then shows the summary', async ({ page }) => {
  await mockAdmin(page);
  await page.goto('/admin.html');
  await login(page);
  await expect(page.getByText('สรุปผล', { exact: true })).toBeVisible();
  await expect(page.locator('svg.bus-svg text', { hasText: /^9$/ })).toHaveCount(1);
  await expect(page.getByText('ซ่อนสาย')).toBeVisible();
  await page.getByText('ผู้บริจาค', { exact: true }).click();
  await expect(page.locator('svg.bus-svg text', { hasText: /^23$/ })).toHaveCount(1);
  await expect(page.getByText('ซ่อนสาย')).toHaveCount(0);
});

test('401 on refresh returns to the login form', async ({ page }) => {
  const state = await mockAdmin(page);
  await page.goto('/admin.html');
  await login(page);
  await expect(page.getByText('อัปเดต', { exact: true })).toBeVisible();
  state.authed = false; // session expired
  await page.getByText('อัปเดต', { exact: true }).click();
  await expect(page.getByLabel('รหัสผ่าน')).toBeVisible();
});

test('csv download pages through responses', async ({ page }) => {
  await mockAdmin(page);
  const pages = {
    0: { rows: [
      { id: 1, cid: 'a', role: 'staff', created: 0, src: 0, data: { role: 'staff', answers: { pos: 'พยาบาล' }, msd: {}, map: {} } },
      { id: 2, cid: 'b', role: 'donor', created: 0, src: 0, data: { role: 'donor', answers: { age: '18-25' }, msd: {}, map: {} } }
    ], next: 2 },
    2: { rows: [{ id: 3, cid: 'c', role: 'donor', created: 0, src: 1, data: { role: 'donor', answers: { age: '26-35' }, msd: {}, map: {} } }], next: null }
  };
  await page.route('**/api/admin/responses*', (r) => {
    const after = new URL(r.request().url()).searchParams.get('after') || '0';
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(pages[after]) });
  });
  await page.goto('/admin.html');
  await login(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByText('ดาวน์โหลด CSV', { exact: true }).click()]);
  expect(download.suggestedFilename()).toMatch(/^survey-\d{8}\.csv$/);
  const text = (await (await download.createReadStream()).toArray()).join('');
  const lines = text.replace(/^﻿/, '').trim().split('\r\n');
  expect(lines).toHaveLength(4);
  expect(lines[0].startsWith('id,created,role,src,cid')).toBe(true);
});

test('empty state', async ({ page }) => {
  await mockAdmin(page, { summary: EMPTY });
  await page.goto('/admin.html');
  await login(page);
  await expect(page.getByText('ยังไม่มีข้อมูล')).toHaveCount(3);
});

test('logout returns to the login form', async ({ page }) => {
  await mockAdmin(page);
  await page.goto('/admin.html');
  await login(page);
  await page.getByText('ออกจากระบบ', { exact: true }).click();
  await expect(page.getByLabel('รหัสผ่าน')).toBeVisible();
});
