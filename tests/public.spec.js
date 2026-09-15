const { test, expect } = require('@playwright/test');

test('PUBLIC-001 landing page loads and LINE login becomes ready', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto('/');
  expect(response.status()).toBe(200);
  await expect(page).toHaveTitle(/Nutri Journey/);
  await expect(page.getByRole('heading', { name: 'Nutri Journey', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'เข้าสู่ระบบด้วย LINE', exact: true })).toBeEnabled();
  for (const name of ['ฟีเจอร์หลัก', 'วิธีใช้งาน', 'เกี่ยวกับ Nutri Journey']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  expect(errors, 'Uncaught JavaScript errors during initial page load').toEqual([]);
});

test('PUBLIC-002 LINE button redirects to real LINE login (partial authentication coverage)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'เข้าสู่ระบบด้วย LINE', exact: true }).click();
  await page.waitForURL(url => url.hostname === 'access.line.me');
  expect(new URL(page.url()).protocol).toBe('https:');
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
  // This does not establish successful login or pass TC-LINE_001/002.
});

for (const [id, path, label] of [
  ['PUBLIC-003', '/privacy', 'นโยบายความเป็นส่วนตัว'],
  ['PUBLIC-004', '/terms', 'ข้อตกลงการใช้งาน'],
]) {
  test(`${id} footer opens ${path}`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
    await expect(page).toHaveTitle(new RegExp(label));
  });
}

test('PUBLIC-005 public pages fit viewport without horizontal overflow', async ({ page }) => {
  for (const path of ['/', '/privacy', '/terms']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content, `${path}: horizontal overflow`).toBeLessThanOrEqual(dimensions.width + 1);
  }
});
