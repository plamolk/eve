// Screens must look the same before and after the restructure.
// Navigation only clicks visible text, so it works on the old SPA and the new pages.
// thanks-pilot and summary-mock are removed in Tasks 7–8.
import { test, expect } from '@playwright/test';

const STAFF = ['A', 'B', 'C', 'D', 'E', 'F'];
const DONOR = ['A', 'B', 'C', 'D', 'E'];

async function step(page, name) {
  await page.waitForLoadState('networkidle');
  await page.locator('#app > *').first().waitFor();
  await expect(page).toHaveScreenshot(name + '.png', { fullPage: true });
}

async function next(page) {
  await page.getByText('ถัดไป', { exact: true }).click();
}

async function start(page, role) {
  await page.goto('/');
  await page.getByText(role, { exact: true }).click();
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

test('thanks-pilot', async ({ page }) => {
  await start(page, 'เจ้าหน้าที่');
  for (let i = 0; i < STAFF.length - 1; i++) await next(page);
  await page.getByText('ส่งคำตอบ', { exact: true }).click();
  await step(page, 'thanks-pilot');
});

test('summary-mock', async ({ page }) => {
  await page.goto('/');
  await page.getByText('ดูตัวอย่างหน้าสรุปผล (ข้อมูลจำลอง)', { exact: true }).click();
  await step(page, 'summary-mock');
});
