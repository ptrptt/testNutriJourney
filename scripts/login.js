const { chromium } = require('@playwright/test');
const path = require('node:path');

(async () => {
  // Dedicated test profile; never use the user's normal browser profile.
  const context = await chromium.launchPersistentContext(path.resolve('.auth/browser'), {
    headless: false,
    args: ['--remote-debugging-port=9223', '--remote-debugging-address=127.0.0.1'],
    viewport: { width: 1280, height: 900 },
  });
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://www.nutrijourney88.com/');
  const login = page.getByRole('button', { name: 'เข้าสู่ระบบด้วย LINE', exact: true });
  if (await login.isVisible().catch(() => false)) await login.click();
  console.log('Test browser ready. Log in manually using a test LINE account. Keep this browser open.');
  await new Promise(resolve => context.on('close', resolve));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
