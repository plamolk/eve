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
  await mockPeople(page);
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

const STAFF_ROW = { id: 3, cid: 'c3', role: 'staff', created: 1793383200, src: 0, data: { role: 'staff', answers: { pos: 'พยาบาล', yrs: '5', rank: ['ซ่อนสาย', 'ทางเดินกว้างขึ้น', 'ทำความสะอาดง่าย'], other: 'ไม่มี', noMsd: true, noMap: true }, msd: {}, map: {} } };
const P_PAGES = {
  first: { rows: [STAFF_ROW, { ...STAFF_ROW, id: 2, src: 1 }], next: 2 },
  second: { rows: [{ ...STAFF_ROW, id: 1 }], next: null }
};

async function mockPeople(page, { missing = [] } = {}) {
  const urls = [];
  await page.route('**/api/admin/responses?*', (r) => {
    const u = new URL(r.request().url());
    urls.push(u.search);
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(u.searchParams.get('before') === '2' ? P_PAGES.second : P_PAGES.first) });
  });
  await page.route('**/api/admin/responses/*', (r) => {
    const id = Number(new URL(r.request().url()).pathname.split('/').pop());
    return missing.includes(id)
      ? r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not_found"}' })
      : r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ row: { ...STAFF_ROW, id } }) });
  });
  return urls;
}

test('people: list, page, open detail, go back', async ({ page }) => {
  await mockAdmin(page);
  const urls = await mockPeople(page);
  await page.goto('/admin.html');
  await login(page);
  await page.getByRole('button', { name: 'รายคน', exact: true }).click();
  await expect(page.getByText('ทางสำรอง', { exact: true })).toBeVisible();
  expect(urls.at(-1)).toContain('limit=50');
  await page.getByRole('button', { name: 'เก่ากว่า', exact: true }).click();
  await expect(page.locator('[data-action="person"][data-id="1"]').first()).toBeVisible();
  expect(urls.at(-1)).toContain('before=2');
  await page.getByRole('button', { name: 'ใหม่กว่า', exact: true }).click();
  await expect(page.locator('[data-action="person"][data-id="3"]').first()).toBeVisible();
  expect(urls.at(-1)).not.toContain('before=');
  await page.getByRole('button', { name: 'ผู้บริจาค', exact: true }).click();
  expect(urls.at(-1)).toContain('role=donor');
  await page.getByRole('button', { name: 'ทั้งหมด', exact: true }).click();
  await page.locator('button[data-action="person"][data-id="3"]').click();
  await expect(page.getByText('ตำแหน่งงาน')).toBeVisible();
  await expect(page.getByText('พยาบาล', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'กลับไปรายการ', exact: true }).click();
  await expect(page.locator('button[data-action="person"][data-id="3"]')).toBeVisible();
});

test('comment link opens that person', async ({ page }) => {
  await mockAdmin(page);
  await mockComments(page);
  await mockPeople(page);
  await page.goto('/admin.html');
  await login(page);
  await page.getByRole('button', { name: 'ความคิดเห็น', exact: true }).click();
  await page.getByRole('button', { name: 'ดูคำตอบทั้งหมดของคนนี้' }).first().click();
  await expect(page.getByRole('button', { name: 'รายคน', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('ตำแหน่งงาน')).toBeVisible();
});

test('missing person shows not found', async ({ page }) => {
  await mockAdmin(page);
  await mockComments(page);
  await mockPeople(page, { missing: [9] });
  await page.goto('/admin.html');
  await login(page);
  await page.getByRole('button', { name: 'ความคิดเห็น', exact: true }).click();
  await page.getByRole('button', { name: 'ดูคำตอบทั้งหมดของคนนี้' }).first().click();
  await expect(page.getByText('ไม่พบคำตอบนี้')).toBeVisible();
  await page.getByRole('button', { name: 'กลับไปรายการ', exact: true }).click();
  await expect(page.locator('button[data-action="person"][data-id="3"]')).toBeVisible();
});

// ---------- final review fixes ----------
test('paging still works after opening a person while a page was loading', async ({ page }) => {
  await mockAdmin(page);
  const urls = await mockPeople(page);
  let release;
  const held = new Promise((r) => { release = r; });
  await page.route('**/api/admin/responses?*before=2*', async (r) => {
    urls.push(new URL(r.request().url()).search);
    await held;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(P_PAGES.second) });
  });
  await page.goto('/admin.html');
  await login(page);
  await page.getByRole('button', { name: 'รายคน', exact: true }).click();
  await expect(page.locator('button[data-action="person"][data-id="3"]')).toBeVisible();
  await page.getByRole('button', { name: 'เก่ากว่า', exact: true }).click();
  await page.locator('button[data-action="person"][data-id="3"]').click();
  await expect(page.getByText('ตำแหน่งงาน')).toBeVisible();
  release();
  await page.getByRole('button', { name: 'กลับไปรายการ', exact: true }).click();
  await expect(page.locator('button[data-action="person"][data-id="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'ใหม่กว่า', exact: true }).click();
  await expect(page.locator('button[data-action="person"][data-id="3"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'ใหม่กว่า', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'เก่ากว่า', exact: true }).click();
  await expect(page.locator('button[data-action="person"][data-id="1"]')).toBeVisible();
});

test('after a 401 on the first comments load, logging in again loads the comments', async ({ page }) => {
  await mockAdmin(page);
  await mockComments(page);
  let first = true;
  await page.route('**/api/admin/comments*', (r) => {
    if (!first) return r.fallback();
    first = false;
    return r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"auth"}' });
  });
  await page.goto('/admin.html');
  await login(page);
  await page.getByRole('button', { name: 'ความคิดเห็น', exact: true }).click();
  await expect(page.getByLabel('รหัสผ่าน')).toBeVisible();
  await login(page);
  await expect(page.getByText('สายไฟพาดพื้น')).toBeVisible();
  await expect(page.getByText('ไม่พบความคิดเห็น')).toHaveCount(0);
});

test('after a 401 while opening a person, logging in again shows the people list', async ({ page }) => {
  await mockAdmin(page);
  await mockPeople(page);
  let first = true;
  await page.route('**/api/admin/responses/*', (r) => {
    if (!first) return r.fallback();
    first = false;
    return r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"auth"}' });
  });
  await page.goto('/admin.html');
  await login(page);
  await page.getByRole('button', { name: 'รายคน', exact: true }).click();
  await page.locator('button[data-action="person"][data-id="3"]').click();
  await expect(page.getByLabel('รหัสผ่าน')).toBeVisible();
  await login(page);
  await expect(page.locator('button[data-action="person"][data-id="3"]')).toBeVisible();
});

test('the refresh button reloads the people list', async ({ page }) => {
  await mockAdmin(page);
  await mockPeople(page);
  await page.goto('/admin.html');
  await login(page);
  await page.getByRole('button', { name: 'รายคน', exact: true }).click();
  await expect(page.locator('button[data-action="person"][data-id="3"]')).toBeVisible();
  await page.route('**/api/admin/responses?*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rows: [{ ...STAFF_ROW, id: 4 }, STAFF_ROW], next: null }) }));
  await page.getByText('อัปเดต', { exact: true }).click();
  await expect(page.locator('button[data-action="person"][data-id="4"]')).toBeVisible();
});

test('a failed person lookup that is not a 404 says loading failed, not "not found"', async ({ page }) => {
  await mockAdmin(page);
  await mockPeople(page);
  await page.route('**/api/admin/responses/*', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"server"}' }));
  await page.goto('/admin.html');
  await login(page);
  await page.getByRole('button', { name: 'รายคน', exact: true }).click();
  await page.locator('button[data-action="person"][data-id="3"]').click();
  await expect(page.getByText('โหลดข้อมูลไม่สำเร็จ ลองกดอัปเดตอีกครั้ง')).toBeVisible();
  await expect(page.getByText('ไม่พบคำตอบนี้')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'กลับไปรายการ', exact: true })).toBeVisible();
});
