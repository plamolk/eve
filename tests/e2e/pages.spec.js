import { test, expect } from '@playwright/test';

const PAGES = ['/', '/survey.html?role=staff', '/survey.html?role=donor', '/thanks.html', '/admin.html'];

test('donor survey does not load staff-only scripts', async ({ page }) => {
  const urls = [];
  page.on('request', (r) => urls.push(r.url()));
  await page.goto('/survey.html?role=donor', { waitUntil: 'networkidle' });
  await expect(page.locator('#app h2').first()).toBeVisible();
  expect(urls.filter((u) => /staff\.js|body-map\.js|body-regions\.js/.test(u))).toEqual([]);
});

test('invalid role redirects to index', async ({ page }) => {
  await page.goto('/survey.html?role=x');
  await expect(page).toHaveURL(/\/(index\.html)?$/);
});

test('no console errors or 404 on any page', async ({ page }) => {
  // admin.html asks the API first; a logged-out visitor gets 401 and the login form (expected, not a problem)
  await page.route('**/api/admin/summary*', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"auth"}' }));
  const problems = [];
  const expected401 = (s) => /status of 401/.test(s);
  page.on('console', (m) => { if (m.type() === 'error' && !expected401(m.text())) problems.push('console: ' + m.text()); });
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400 && !(r.status() === 401 && r.url().includes('/api/admin/'))) problems.push(r.status() + ' ' + r.url()); });
  for (const p of PAGES) {
    await page.goto(p, { waitUntil: 'networkidle' });
  }
  expect(problems).toEqual([]);
});
