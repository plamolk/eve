// Screens must look the same before and after the restructure.
// Navigation only clicks visible text, so it works on the old SPA and the new pages.
import { test, expect } from '@playwright/test';

const STAFF = ['A', 'B', 'C', 'D', 'E', 'F'];
const DONOR = ['A', 'B', 'C', 'D', 'E'];

async function step(page, name) {
  await page.waitForLoadState('networkidle');
  await page.locator('#app > *').first().waitFor();
  await expect(page).toHaveScreenshot(name + '.png', { fullPage: true });
}

// Answer the section on screen (after its screenshot) so "ถัดไป" is allowed.
async function fillSection(page) {
  const keys = (action) => page.locator(`[data-action="${action}"]`).evaluateAll(
    (els) => [...new Set(els.map((e) => e.dataset.key))]);
  for (const action of ['pick', 'scale', 'multi']) {
    for (const k of await keys(action)) await page.locator(`[data-action="${action}"][data-key="${k}"]`).first().click();
  }
  for (const k of await keys('rank')) {
    for (let i = 0; i < 3; i++) await page.locator(`[data-action="rank"][data-key="${k}"]`).nth(i).click();
  }
  for (const el of await page.locator('input[type="number"][data-key]').all()) await el.fill('1');
  for (const el of await page.locator('textarea[data-key]').all()) await el.fill('ทดสอบ');
  for (const el of await page.locator('[data-action="none"]').all()) await el.click();
}

async function next(page) {
  await fillSection(page);
  await page.getByText('ถัดไป', { exact: true }).click();
}

async function start(page, role) {
  await page.goto('/');
  await page.getByText(role, { exact: true }).click();
  await page.locator('[role="progressbar"]').waitFor(); // role scripts load before the first render
}

test('intro', async ({ page }) => {
  await page.goto('/');
  await step(page, 'intro');
});

for (const [label, prefix, parts] of [['เจ้าหน้าที่', 'staff', STAFF], ['ผู้บริจาคโลหิต', 'donor', DONOR]]) {
  test(prefix + ' sections', async ({ page }) => {
    await start(page, label);
    for (let i = 0; i < parts.length; i++) {
      await step(page, prefix + '-' + parts[i]);
      if (i < parts.length - 1) await next(page);
    }
  });
}
