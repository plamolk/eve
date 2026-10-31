import { test, expect } from '@playwright/test';

const usage = { day: 20261030, rw: 160, rr: 170, n: 50, limits: { rw: 100000, rr: 5000000 } };
const V2 = { src1: 0, days: [], q: {}, num: {}, rank1: {}, msd: {}, noMsd: 0, zones: {}, noMap: 0, text: {}, notes: 0 };
const SUMMARY = {
  updated: 1793383200, more: false, usage,
  staff: { ...V2, n: 30, heat: { A3: { count: 9, avg: 4.2 } }, body: { 'คอ': 9 }, rank: [['ซ่อนสาย', 13], ['ทางเดินกว้างขึ้น', 11]], days: [['2026-10-30', 30]] },
  donor: { ...V2, n: 20, heat: { Z5: { count: 23, avg: 3.1 } }, days: [['2026-10-30', 20]] }
};
const EMPTY = { updated: 0, more: false, usage, staff: { ...V2, n: 0, heat: {}, body: {}, rank: [] }, donor: { ...V2, n: 0, heat: {} } };

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
  await page.getByRole('button', { name: 'ผู้บริจาค', exact: true }).click();
  await expect(page.locator('svg.bus-svg text', { hasText: /^23$/ })).toHaveCount(1);
  await expect(page.locator('svg.bus-svg text', { hasText: /^9$/ })).toHaveCount(0);
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
  await expect(page.getByText('ยังไม่มีข้อมูล')).toHaveCount(4);
});

test('logout returns to the login form', async ({ page }) => {
  await mockAdmin(page);
  await page.goto('/admin.html');
  await login(page);
  await page.getByText('ออกจากระบบ', { exact: true }).click();
  await expect(page.getByLabel('รหัสผ่าน')).toBeVisible();
});

test('tabs switch between the four views', async ({ page }) => {
  await mockAdmin(page);
  await mockComments(page);
  await page.goto('/admin.html');
  await login(page);
  await expect(page.getByText('จำนวนคำตอบรายวัน')).toBeVisible();
  for (const name of ['คำถามทั้งหมด', 'ความคิดเห็น', 'รายคน', 'ภาพรวม']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  await expect(page.getByText('จำนวนคำตอบรายวัน')).toBeVisible();
});

test('summary keeps loading while more is true', async ({ page }) => {
  await mockAdmin(page);
  let calls = 0;
  await page.route('**/api/admin/summary*', (r) => {
    calls += 1;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...SUMMARY, more: calls === 1 }) });
  });
  await page.goto('/admin.html');
  await expect(page.getByText('จำนวนคำตอบรายวัน')).toBeVisible();
  expect(calls).toBe(2);
});

const C_PAGES = {
  first: { items: [
    { id: 9, role: 'staff', created: 1793383200, text: 'สายไฟพาดพื้น\nบรรทัดสอง' },
    { id: 5, role: 'staff', created: 1793300000, text: 'ไม่มี' }
  ], next: 5 },
  second: { items: [{ id: 2, role: 'staff', created: 1793200000, text: 'ที่วางของน้อย' }], next: null },
  search: { items: [{ id: 9, role: 'staff', created: 1793383200, text: 'สายไฟพาดพื้น' }], next: null }
};

async function mockComments(page) {
  const urls = [];
  await page.route('**/api/admin/comments*', (r) => {
    const u = new URL(r.request().url());
    urls.push(u.search);
    const body = u.searchParams.get('q') ? C_PAGES.search : u.searchParams.get('before') ? C_PAGES.second : C_PAGES.first;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return urls;
}

test('comments: choose a question, load more, search', async ({ page }) => {
  await mockAdmin(page, { summary: { ...SUMMARY, staff: { ...SUMMARY.staff, text: { other: 3 } } } });
  const urls = await mockComments(page);
  await page.goto('/admin.html');
  await login(page);
  await page.getByRole('button', { name: 'ความคิดเห็น', exact: true }).click();
  const other = page.locator('[data-action="ckey"][data-key="other"]');
  await expect(other).toContainText('3');
  await other.click();
  await expect(page.getByText('สายไฟพาดพื้น')).toBeVisible();
  expect(urls.at(-1)).toContain('key=other');
  expect(urls.at(-1)).toContain('role=staff');
  await page.getByRole('button', { name: 'โหลดเพิ่ม', exact: true }).click();
  await expect(page.getByText('ที่วางของน้อย')).toBeVisible();
  await expect(page.getByText('ไม่มี', { exact: true })).toBeVisible();
  expect(urls.at(-1)).toContain('before=5');
  await expect(page.getByRole('button', { name: 'โหลดเพิ่ม', exact: true })).toHaveCount(0);
  await page.getByRole('searchbox').fill('สาย');
  await page.getByRole('button', { name: 'ค้นหา', exact: true }).click();
  await expect(page.getByText('ที่วางของน้อย')).toHaveCount(0);
  expect(urls.at(-1)).toContain('q=' + encodeURIComponent('สาย'));
  await page.getByRole('button', { name: 'ล้าง', exact: true }).click();
  await expect(page.getByRole('searchbox')).toHaveValue('');
  expect(urls.at(-1)).not.toContain('q=');
});

test('question tab link opens that question in the comments tab', async ({ page }) => {
  await mockAdmin(page, { summary: { ...SUMMARY, staff: { ...SUMMARY.staff, text: { other: 3 } } } });
  const urls = await mockComments(page);
  await page.goto('/admin.html');
  await login(page);
  await page.getByRole('button', { name: 'คำถามทั้งหมด', exact: true }).click();
  await page.locator('[data-action="gocomments"][data-key="other"]').click();
  await expect(page.getByText('สายไฟพาดพื้น')).toBeVisible();
  expect(urls.at(-1)).toContain('key=other');
});

test('401 on load more returns to login', async ({ page }) => {
  const state = await mockAdmin(page);
  await mockComments(page);
  await page.goto('/admin.html');
  await login(page);
  await page.getByRole('button', { name: 'ความคิดเห็น', exact: true }).click();
  await expect(page.getByRole('button', { name: 'โหลดเพิ่ม', exact: true })).toBeVisible();
  state.authed = false;
  await page.unroute('**/api/admin/comments*');
  await page.route('**/api/admin/comments*', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"auth"}' }));
  await page.getByRole('button', { name: 'โหลดเพิ่ม', exact: true }).click();
  await expect(page.getByLabel('รหัสผ่าน')).toBeVisible();
});

test('401 when opening the comments tab returns to login', async ({ page }) => {
  await mockAdmin(page);
  await page.route('**/api/admin/comments*', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"auth"}' }));
  await page.goto('/admin.html');
  await login(page);
  await page.getByRole('button', { name: 'ความคิดเห็น', exact: true }).click();
  await expect(page.getByLabel('รหัสผ่าน')).toBeVisible();
});
