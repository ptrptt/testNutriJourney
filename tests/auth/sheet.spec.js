const { test, expect, chromium } = require('@playwright/test');
const fs = require('node:fs');
const cases = JSON.parse(fs.readFileSync('test-data/test-cases.json', 'utf8').replace(/^\uFEFF/, ''));
let browser, page;
test.beforeAll(async () => {
 browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
 page = browser.contexts()[0].pages().find(p => p.url().startsWith('https://www.nutrijourney88.com'));
 if (!page) throw new Error('Log in using node scripts/login.js first');
});
test.afterAll(async () => { await browser?.close(); });
test.afterEach(async ({}, info) => {
 if (page && info.status !== 'skipped') {
   await info.attach('screenshot', { body: await page.screenshot({fullPage:true}), contentType:'image/png' });
   await info.attach('accessible-page', { body: await page.locator('body').ariaSnapshot(), contentType:'text/plain' });
 }
});
const go = async route => {
 await page.goto('https://www.nutrijourney88.com' + route);
 await expect(page.locator('h1')).toBeVisible();
 await expect(page.getByRole('link', {name:'โปรไฟล์',exact:true})).toBeVisible();
};
const edit = async () => {
 await go('/profile'); await page.getByRole('button',{name:'แก้ไขข้อมูล',exact:true}).click();
 await expect(page.locator('#edit-profile-height')).toBeVisible();
};
const note = text => test.info().annotations.push({type:'actual',description:text});
const handlers = {
 'TC-LINE_005W1-5': async () => {
  await go('/profile'); await page.reload();
  await expect(page.getByRole('heading',{name:'โปรไฟล์สุขภาพ'})).toBeVisible();
  await expect(page.getByRole('button',{name:'ออกจากระบบ',exact:true})).toBeVisible();
  note('Authenticated profile remains accessible after reload; manual LINE login was performed by user.');
 },
 'TC-HP-001W1-6': async () => {
  await edit();
  for(const id of ['gender','height','activity','goal','target-weight']) await expect(page.locator('#edit-profile-'+id)).toBeVisible();
  await expect(page.getByText('วันเกิด',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'ยกเลิก',exact:true}).click();
  note('Existing health profile and all fields available in its edit form render. New-user onboarding is not covered.');
 },
 'TC-HP-003 W1-6': async () => {
  await edit(); const input=page.locator('#edit-profile-height'); const before=await input.inputValue();
  await input.fill(''); await page.getByRole('button',{name:'บันทึก',exact:true}).click();
  await expect(input).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('กรุณาใส่ข้อมูลให้ครบและถูกต้อง');
  await page.reload(); await edit(); await expect(input).toHaveValue(before);
  note('Blank required height rejected; saved height unchanged after reload.');
 },
 'TC-HP-004 W1-6': async () => {
  await edit(); const input=page.locator('#edit-profile-height'); const before=await input.inputValue();
  await input.fill('-165'); await page.getByRole('button',{name:'บันทึก',exact:true}).click();
  await expect(input).toBeVisible(); expect(await input.evaluate(e=>e.validity.rangeUnderflow)).toBe(true);
  await page.reload(); await edit(); await expect(input).toHaveValue(before);
  note('Negative height -165 rejected with browser validation; persisted height unchanged.');
 },
 'TC-EHP-002W1-6': async () => {
  await edit();
  const fields=['height','activity','target-weight']; const before={};
  for(const field of fields) before[field]=await page.locator('#edit-profile-'+field).inputValue();
  try {
   await page.locator('#edit-profile-height').fill('165');
   await page.locator('#edit-profile-activity').selectOption({label:'ออกกำลังกายปานกลาง 3–5 วัน/สัปดาห์'});
   await page.locator('#edit-profile-target-weight').fill('58');
   await page.getByRole('button',{name:'บันทึก',exact:true}).click();
   await expect(page.locator('#edit-profile-height')).toBeHidden();
   await edit(); await expect(page.locator('#edit-profile-height')).toHaveValue('165');
   await expect(page.locator('#edit-profile-target-weight')).toHaveValue('58');
   await expect(page.locator('#edit-profile-activity').locator('option:checked')).toHaveText('ออกกำลังกายปานกลาง 3–5 วัน/สัปดาห์');
   note('Saved height 165, moderate activity and target weight 58; reopened and verified all values; restoring originals.');
  } finally {
   await edit();
   await page.locator('#edit-profile-height').fill(before.height);
   await page.locator('#edit-profile-activity').selectOption(before.activity);
   await page.locator('#edit-profile-target-weight').fill(before['target-weight']);
   await page.getByRole('button',{name:'บันทึก',exact:true}).click();
   await expect(page.locator('#edit-profile-height')).toBeHidden();
  }
 },
 'TC-WGT-003': async () => {
  await go('/profile');
  await expect(page.getByText('อัปเดตได้อีกครั้ง 1 ต.ค.',{exact:true})).toHaveCount(2);
  await page.getByRole('button',{name:'แก้ไขข้อมูล',exact:true}).click();
  await expect(page.getByLabel('น้ำหนัก (กก.)',{exact:true})).toHaveCount(0);
  note('Current account already recorded weight this month; UI shows next update Oct 1 and no current-weight edit input. UI restriction only; no API bypass attempted.');
 },
 'TC-BM-003': async () => {
  await go('/profile');
  await expect(page.getByText('อัปเดตได้อีกครั้ง 1 ต.ค.',{exact:true})).toHaveCount(2);
  await page.getByRole('button',{name:'แก้ไขข้อมูล',exact:true}).click();
  await expect(page.locator('input')).toHaveCount(2);
  note('Existing measurements display next update Oct 1. Basic edit form contains height/target-weight only, no measurement input. UI restriction verified.');
 },
 'TC-IFCAL-002': async () => {
  await go('/stats?range=calendar');
  await expect(page.getByRole('grid')).toHaveAttribute('aria-label','ปฏิทิน กันยายน 2026');
  await page.getByRole('button',{name:'เดือนก่อนหน้า'}).click();
  await expect(page.getByRole('grid')).toHaveAttribute('aria-label','ปฏิทิน สิงหาคม 2026');
  await page.getByRole('button',{name:'เดือนถัดไป'}).click();
  await expect(page.getByRole('grid')).toHaveAttribute('aria-label','ปฏิทิน กันยายน 2026');
  note('Calendar moves September → August → September and updates date labels.');
 },
 'TC-PPTL-003': async () => {
  await go('/photo'); await expect(page.getByText('ยังไม่มี',{exact:true})).toHaveCount(3);
  await expect(page.getByRole('button',{name:'บันทึกรูปความคืบหน้า'})).toBeEnabled();
  note('No progress photos: three empty angle placeholders and upload action visible.');
 },
 'TC-NAME-001': async () => {
  await go('/my-egg'); await page.getByRole('button',{name:'เปลี่ยนชื่อไข่'}).click();
  await page.getByRole('dialog').getByRole('textbox').fill('น้องม่อน');
  await page.getByRole('dialog').getByRole('button',{name:'บันทึก',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button',{name:'เปลี่ยนชื่อไข่'})).toHaveText('น้องม่อน');
 },
 'TC-NAME-002': async () => {
  await go('/my-egg'); await expect(page.getByRole('button',{name:'เปลี่ยนชื่อไข่'})).toHaveText('น้องม่อน');
  await page.getByRole('button',{name:'เปลี่ยนชื่อไข่'}).click();
  await page.getByRole('dialog').getByRole('textbox').fill('น้องไข่');
  await page.getByRole('dialog').getByRole('button',{name:'บันทึก',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button',{name:'เปลี่ยนชื่อไข่'})).toHaveText('น้องไข่');
 },
 'TC-NAME-003': async () => {
  await go('/my-egg'); await page.reload();
  await expect(page.getByRole('button',{name:'เปลี่ยนชื่อไข่'})).toHaveText('น้องไข่');
 },
 'TC-XP-002': async () => {
  await go('/my-egg'); const xp=await page.getByText(/^\d+ \/ \d+ exp$/).innerText();
  await go('/stats'); await go('/my-egg'); await page.reload();
  await expect(page.getByText(/^\d+ \/ \d+ exp$/)).toHaveText(xp);
  note('Previously completed view-statistics mission does not grant XP again after revisit/reload.');
 },
 'TC-DM-001': async () => {
  await go('/my-egg'); await expect(page.locator('article')).toHaveCount(4);
  for(const name of ['เริ่มทำ IF','อดอาหารครบตามเป้า','บันทึกความรู้สึก','เข้าดูสถิติ']) await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
  await expect(page.getByText('+50 exp',{exact:true})).toHaveCount(4);
 },
};
const reasons = {
 'TC-LINE_001W1-5':'ต้องมีบัญชี LINE ที่ไม่เคยสมัคร; บัญชีปัจจุบันมีข้อมูลเดิมแล้ว',
 'TC-LINE_002 W1-5':'ผู้ใช้ล็อกอินด้วยตนเองก่อนเชื่อม Playwright; ไม่ได้บันทึกการยืนยันตัวตนครบขั้นตอน',
 'TC-LINE_003W1-5':'ต้องทดสอบการยกเลิกใน LINE consent ด้วย session แยก',
 'TC-LINE_004W1-5':'ไม่มีบัญชีหรือเงื่อนไข LINE Authentication ล้มเหลวสำหรับทดสอบ',
 'TC-HP-002 W1-6':'บัญชีผ่าน onboarding แล้วและน้ำหนักเดือนนี้ถูกล็อก จึงตั้งข้อมูลตามเคสไม่ได้ครบ',
 'TC-EHP-001W1-6':'ไม่มีช่องแก้น้ำหนักปัจจุบันใน Basic Profile; น้ำหนักเดือนนี้ล็อกจน 1 ต.ค.',
 'TC-EHP-003W1-6':'ไม่มีช่องแก้น้ำหนักปัจจุบันในบัญชีนี้ จึงกรอก -10 ตามเคสไม่ได้',
 'TC-EHP-004W1-6':'ไม่มีช่องแก้น้ำหนักปัจจุบันให้ลบตามเคส',
 'TC-EHP-005 W1-6':'Expected ขัดกับ steps: ตรวจ persistence แต่ Expected ให้ปฏิเสธข้อมูล ดู review-notes.md',
 'TC-IFG-001W1-8':'Expected เป็น 18:6 แต่ Steps เลือก 16:8; ต้องยืนยันเกณฑ์',
 'TC-IFG-002W1-8':'Data=20:4, Steps=18:6, Expected=ไม่บันทึก ขัดแย้งกัน',
};
// Stateful checks validate rejection before committing the corresponding record.
const ordered = [...cases];
for(const [first,second] of [['TC-PP-002','TC-PP-001'],['TC-PP-003','TC-PP-001'],['TC-MOOD-002','TC-MOOD-001']]) {
 const item=ordered.splice(ordered.findIndex(c=>c.ID.trim()===first),1)[0];
 ordered.splice(ordered.findIndex(c=>c.ID.trim()===second),0,item);
}
const stop=ordered.splice(ordered.findIndex(c=>c.ID==='TC-IFT-002'),1)[0];
ordered.splice(ordered.findIndex(c=>c.ID==='TC-IFTMR-003'),0,stop);
for(const c of ordered) {
 test(`${c.ID.trim()} | ${c.Title.trim()}`, async () => {
  test.info().annotations.push({type:'case-id',description:c.ID.trim()});
  const handler=handlers[c.ID.trim()] || handlers[c.ID];
  const extra=require('./extra-handlers')({page,go,note});
  const ifHandlers=require('./if-handlers')({page,go,note});
  const xpHandlers=require('./reward-handlers')({page,go,note});
  const recheck=require('./recheck-handlers')({page,go,note});
  const run=recheck[c.ID.trim()] || handler || extra[c.ID.trim()] || ifHandlers[c.ID.trim()] || xpHandlers[c.ID.trim()];
  const reason=reasons[c.ID] || require('./blockers')[c.ID.trim()];
  if(!run && !reason) throw new Error(`Unclassified case: ${c.ID}`);
  test.skip(!run, reason);
  await run();
 });
}
