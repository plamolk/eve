import { test, expect } from '@playwright/test';

async function open(page, role) {
  await page.goto('/survey.html?role=' + role);
  await page.locator('[role="progressbar"]').waitFor();
}

const heading = (page) => page.locator('#app h2').first();

test('next is blocked until the section is answered', async ({ page }) => {
  await open(page, 'staff');
  await page.getByText('ถัดไป', { exact: true }).click();
  await expect(heading(page)).toHaveText('ส่วน A ข้อมูลทั่วไป');
  const missing = page.locator('[data-missing]').first();
  await expect(missing).toContainText('กรุณาตอบข้อนี้');
  await expect(missing).toContainText('ตำแหน่งงาน');
  await expect(missing).toBeInViewport();
});

test('answering the missing question clears its warning', async ({ page }) => {
  await open(page, 'staff');
  await page.getByText('ถัดไป', { exact: true }).click();
  await page.locator('[data-action="pick"][data-key="pos"]').first().click();
  await expect(page.getByText('กรุณาตอบข้อนี้')).toHaveCount(0);
});

test('none buttons satisfy the body map and the bus map', async ({ page }) => {
  await open(page, 'donor');
  await page.evaluate(() => { App.state.step = 3; });
  await page.getByText('ถัดไป', { exact: true }).click(); // renders part D with its warning
  await expect(heading(page)).toContainText('ส่วน D');
  await expect(page.locator('[data-missing]')).toContainText("กรุณาบันทึกจุดบนผัง หรือกด 'ไม่พบปัญหา'");
  await page.getByText('ไม่พบปัญหา', { exact: true }).click();
  await page.getByText('ถัดไป', { exact: true }).click();
  await expect(heading(page)).toContainText('ส่วน E');
  expect(await page.evaluate(() => App.state.answers.noMap)).toBe(true);
});

test('zone save requires a problem type', async ({ page }) => {
  await open(page, 'donor');
  await page.evaluate(() => { App.state.step = 3; });
  await page.getByText('ถัดไป', { exact: true }).click(); // shows part D warning, renders step 3
  await page.locator('g[data-action="zone"][data-id="A3"]').click();
  await page.getByText('บันทึกจุดนี้', { exact: true }).click();
  await expect(page.getByText('กรุณาเลือกประเภทปัญหาอย่างน้อย 1 อย่าง')).toBeVisible();
  expect(await page.evaluate(() => App.state.map.A3)).toBeUndefined();
});

for (const choice of ['บันทึกทั้งหมด', 'ทิ้งจุดเหล่านี้', 'กลับไปแก้']) {
  test('unsaved point warning on part D: ' + choice, async ({ page }) => {
    await open(page, 'donor');
    await page.evaluate(() => { App.state.step = 3; });
    await page.getByText('ถัดไป', { exact: true }).click();
    await page.locator('g[data-action="zone"][data-id="A3"]').click();
    await page.locator('[data-action="zlist"][data-field="t"]').first().click(); // A3 is now tmp
    await page.getByText('ถัดไป', { exact: true }).click();
    await expect(page.getByText('มี 1 จุดบนผังที่ยังไม่ได้กด "บันทึกจุดนี้"')).toBeVisible();
    await page.getByText(choice, { exact: true }).click();
    const st = await page.evaluate(() => ({ step: App.state.step, map: App.state.map, open: App.state.openZone }));
    if (choice === 'บันทึกทั้งหมด') { expect(st.step).toBe(4); expect(st.map.A3.tmp).toBeUndefined(); }
    if (choice === 'ทิ้งจุดเหล่านี้') { expect(st.step).toBe(3); expect(st.map).toEqual({}); }
    if (choice === 'กลับไปแก้') { expect(st.step).toBe(3); expect(st.open).toBe('A3'); }
  });
}
