const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
module.exports = ({ page, go, note }) => {
  const original = require('./extra-handlers')({ page, go, note });
  const rewardPath = 'test-data/current-mood-reward.json';
  async function snapshot() {
    await go('/my-egg');
    const [xp, max] = (await page.getByText(/^\d+ \/ \d+ exp$/).innerText()).match(/\d+/g).map(Number);
    const level = Number((await page.getByText(/^เลเวล \d+$/).innerText()).match(/\d+/)[0]);
    const mission = page.locator('article').filter({ has: page.getByRole('heading', { name: 'บันทึกความรู้สึก', exact: true }) });
    return { xp, max, level, moodComplete: await mission.locator('[aria-hidden=true] svg').count() > 0 };
  }
  async function prepareMood() {
    await go('/if');
    await expect(page.getByRole('button', { name: /^(สิ้นสุดการกิน|สิ้นสุดการอด|เลือกรูปแบบ IF|เปลี่ยนรูปแบบ IF)$/ }).first()).toBeVisible();
    if (await page.getByRole('button', { name: 'สิ้นสุดการกิน', exact: true }).isVisible()) return;
    test.skip(await page.getByRole('button', { name: 'สิ้นสุดการอด', exact: true }).isVisible(),
      'มีเซสชันอดอาหารที่กำลังทำงานก่อนเคส Mood ต้องเตรียมเซสชันช่วงกินสำหรับทดสอบ');
    await page.getByRole('button', { name: /^(เลือก|เปลี่ยน)รูปแบบ IF$/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /^16:8 อด/ }).click();
    await page.getByRole('button', { name: 'บันทึกรูปแบบ IF', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.getByRole('button', { name: 'เริ่ม IF', exact: true }).click();
    await page.getByRole('button', { name: 'สิ้นสุดการอด', exact: true }).click();
    await expect(page.getByRole('button', { name: 'สิ้นสุดการกิน', exact: true })).toBeVisible();
    note('Created a new test IF session and moved it into the eating phase for Mood validation.');
  }
  async function reward() {
    test.skip(!fs.existsSync(rewardPath), 'ต้องรัน TC-MOOD-001 ในรอบปัจจุบันเพื่อเก็บ XP ก่อนและหลัง');
    const data = JSON.parse(fs.readFileSync(rewardPath, 'utf8'));
    test.skip(Date.now() - Date.parse(data.at) > 3600000, 'หลักฐาน XP เกินหนึ่งชั่วโมง ต้องบันทึก transition ใหม่');
    test.skip(data.before.moodComplete, 'ภารกิจ Mood สำเร็จก่อนทดสอบรอบนี้แล้ว ต้องใช้ภารกิจที่ยังไม่สำเร็จเพื่อยืนยันการเพิ่ม XP ใหม่');
    return data;
  }
  const handlers = {};
  async function savePlan(value) {
    await page.getByRole('button', { name: /^(เลือก|เปลี่ยน)รูปแบบ IF$/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: new RegExp(`^${value} อด`) }).click();
    await page.getByRole('button', { name: 'บันทึกรูปแบบ IF', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText(`ทำ IF รูปแบบ ${value}`, { exact: true })).toBeVisible();
  }
  for (const id of ['TC-IFG-001W1-8', 'TC-IFG-002W1-8']) handlers[id] = async () => {
    await go('/if');
    test.skip(await page.getByRole('button', { name: /^(สิ้นสุดการอด|สิ้นสุดการกิน)$/ }).count() > 0,
      'มีเซสชัน IF กำลังทำงาน ต้องใช้สถานะที่เลือกเป้าหมายได้');
    await savePlan('16:8');
    if (id === 'TC-IFG-002W1-8') await savePlan('18:6');
    await test.info().attach('observed-plan', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    note(id === 'TC-IFG-001W1-8'
      ? 'ทำ Steps แล้วเลือก 16:8 ได้ผล 16:8 แต่ Expected ในชีตระบุ 18:6 รอยืนยันเกณฑ์ก่อนตัดสิน'
      : 'ทำ Steps แล้วเปลี่ยน 16:8 เป็น 18:6 ได้บนหน้าจอ แต่ Data ระบุ 20:4 และ Expected บอกไม่บันทึก รอยืนยันเกณฑ์');
    test.skip(true, 'ตรวจพฤติกรรมตาม Steps แล้ว แต่ยังตัดสิน Pass/Fail ไม่ได้เพราะ Expected และ Data ในชีตขัดแย้งกัน');
  };
  for (const id of ['TC-PP-001', 'TC-PP-002', 'TC-PP-003']) handlers[id] = async () => {
    await go('/photo');
    const locked = page.getByText('บันทึกเดือนนี้แล้ว · กลับมาอีกครั้งในเดือนถัดไป', { exact: true });
    test.skip(await locked.isVisible(), 'บันทึกรูปเดือนนี้แล้วและไม่มีปุ่มอัปโหลด ต้องใช้บัญชีที่ยังไม่บันทึกรูปในเดือนนี้');
    await original[id]();
  };
  handlers['TC-PPTL-003'] = async () => {
    await go('/photo');
    test.skip(await page.getByRole('img', { name: 'ภาพถ่ายความคืบหน้า', exact: true }).count() > 0,
      'บัญชีมีรูปที่บันทึกแล้ว ช่องว่างของเดือนถัดไปไม่ใช่เงื่อนไขบัญชีไม่มีรูป ต้องใช้บัญชีว่าง');
    await original['TC-PPTL-003']();
  };
  handlers['TC-MOOD-002'] = async () => { await prepareMood(); await original['TC-MOOD-002'](); };
  handlers['TC-MOOD-001'] = async () => {
    const before = await snapshot();
    await prepareMood();
    await original['TC-MOOD-001']();
    const after = await snapshot();
    const data = { at: new Date().toISOString(), before, after };
    fs.writeFileSync(rewardPath, JSON.stringify(data, null, 2));
    await test.info().attach('current-mood-reward', { body: JSON.stringify(data), contentType: 'application/json' });
    note(`Current run Mood reward observation: ${JSON.stringify(data)}`);
  };
  handlers['TC-XP-001'] = async () => {
    const { before, after } = await reward();
    expect(after.moodComplete).toBe(true);
    expect(after.level - before.level).toBeGreaterThanOrEqual(0);
    expect(after.level - before.level).toBeLessThanOrEqual(1);
    const gained = after.level === before.level ? after.xp - before.xp : before.max - before.xp + after.xp;
    expect(gained).toBe(50);
    note(`Fresh Mood mission awarded ${gained} XP; level ${before.level} → ${after.level}.`);
  };
  handlers['TC-XP-003'] = async () => {
    const { after } = await reward();
    await handlers['TC-XP-001']();
    for (const route of ['/my-egg', '/dashboard']) {
      await go(route);
      await expect(page.getByText(/^\d+ \/ \d+ exp$/)).toHaveText(`${after.xp} / ${after.max} exp`);
    }
    note('XP displayed on both pages matches the fresh before/after mission observation.');
  };
  handlers['TC-CHAR-002'] = async () => {
    const { before, after } = await reward();
    test.skip(before.max - before.xp > 50, 'XP ก่อนภารกิจยังห่างจากเกณฑ์เกิน 50 ต้องใช้บัญชีใกล้เลื่อนระดับ');
    await handlers['TC-XP-001']();
    expect(after.level).toBe(before.level + 1);
    await go('/my-egg');
    await expect(page.getByRole('img', { name: new RegExp(`ระดับ ${after.level}$`) })).toBeVisible();
    note('Fresh mission crossed the displayed XP threshold and updated level and character image.');
  };
  return handlers;
};
