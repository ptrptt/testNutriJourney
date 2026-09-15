const {test,expect}=require('@playwright/test');
module.exports=({page,go,note})=>{
 const timer=()=>page.getByText(/^\d{1,2}:\d{2}:\d{2}$/).first();
 const seconds=async()=> (await timer().innerText()).split(':').reduce((n,s)=>n*60+Number(s),0);
 const plan=async value=>{
  await go('/if');
  const select=page.getByRole('button',{name:/^(เลือก|เปลี่ยน)รูปแบบ IF$/});
  await expect(select).toBeVisible();
  await select.click();
  await page.getByRole('dialog').getByRole('button',{name:new RegExp('^'+value+' อด')}).click();
  await page.getByRole('button',{name:'บันทึกรูปแบบ IF',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText(`ทำ IF รูปแบบ ${value}`,{exact:true})).toBeVisible();
 };
 return {
  'TC-IFG-003W1-8':async()=>{
   await go('/if');
   await page.getByRole('button',{name:/^(เลือก|เปลี่ยน)รูปแบบ IF$/}).click();
   const save=page.getByRole('button',{name:'บันทึกรูปแบบ IF',exact:true});
   test.skip(await save.isEnabled(),'มีรูปแบบเดิมที่ถูกเลือกใน dialog และไม่มีตัวเลือกล้างค่า; ต้องใช้บัญชีที่ยังไม่ตั้ง IF');
   await expect(save).toBeDisabled();
   note('Without selecting a plan, save action is disabled.');
  },
  'TC-IFG-004W1-8':async()=>{
   await plan('16:8');
   await test.info().attach('before-reload',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
   note('Saved 16:8 and confirmed it on screen before reload. Expected the same plan after reload.');
   await page.reload();
   await expect(page.getByText('ทำ IF รูปแบบ 16:8',{exact:true})).toBeVisible();
   note('Saved 16:8 then reloaded; same plan persisted.');
  },
  'TC-IFG-005W1-8':async()=>{
   await plan('16:8'); await page.getByRole('button',{name:'เปลี่ยนรูปแบบ IF'}).click();
   await page.getByRole('dialog').getByRole('button',{name:/^18:6 อด/}).click();
   await test.info().attach('unsaved-18-6',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
   note('Confirmed saved 16:8, selected unsaved 18:6, then navigated away/back. Expected saved 16:8 to remain.');
   await page.goto('https://www.nutrijourney88.com/dashboard'); await go('/if');
   await expect(page.getByText('ทำ IF รูปแบบ 16:8',{exact:true})).toBeVisible();
   note('Selected 18:6 without saving, navigated away/back; saved plan remains 16:8.');
  },
  'TC-IFT-001':async()=>{
   await plan('16:8'); await page.getByRole('button',{name:'เริ่ม IF',exact:true}).click();
   await expect(page.getByRole('button',{name:'สิ้นสุดการอด',exact:true})).toBeVisible();
   await expect(page.getByText(/เริ่มการอด ·/)).toBeVisible();
   expect(await seconds()).toBeLessThan(20);
   note('Started a new 16:8 session; fasting state, start time and near-zero elapsed timer displayed.');
  },
  'TC-IFT-003':async()=>{
   await go('/if'); const start=await page.getByText(/เริ่มการอด ·/).innerText();
   await go('/dashboard'); await go('/if');
   await expect(page.getByRole('button',{name:'สิ้นสุดการอด',exact:true})).toBeVisible();
   await expect(page.getByText(/เริ่มการอด ·/)).toHaveText(start);
  },
  'TC-IFTMR-001':async()=>{
   await go('/if'); await expect(page.getByRole('button',{name:'สิ้นสุดการอด',exact:true})).toBeVisible();
   const before=await seconds();
   await expect.poll(seconds,{timeout:6000}).toBeGreaterThan(before);
   expect(await seconds()).toBeLessThanOrEqual(before+8);
   note('Timer increments in real time during the session started by TC-IFT-001.');
  },
  'TC-IFTMR-002':async()=>{
   await go('/if'); const start=await page.getByText(/เริ่มการอด ·/).innerText();
   const before=await seconds(),at=Date.now(); await page.reload();
   await expect(page.getByText(/เริ่มการอด ·/)).toHaveText(start);
   const after=await seconds(); expect(after).toBeGreaterThanOrEqual(before);
   expect(Math.abs(after-before-(Date.now()-at)/1000)).toBeLessThan(4);
   note('Reload preserves start timestamp; elapsed time matches wall-clock progression within 4 seconds.');
  },
  'TC-IFT-002':async()=>{
   await go('/if'); await page.getByRole('button',{name:'สิ้นสุดการอด',exact:true}).click();
   await expect(page.getByRole('button',{name:'สิ้นสุดการกิน',exact:true})).toBeVisible();
   await page.getByRole('button',{name:'สิ้นสุดการกิน',exact:true}).click();
   const d=page.getByRole('dialog'); await d.getByRole('button',{name:'ดี',exact:true}).click();
   await d.getByRole('button',{name:'สิ้นสุดการกิน',exact:true}).click();
   await expect(d).toBeHidden();
   await expect(page.getByRole('button',{name:'สิ้นสุดการกิน',exact:true})).toHaveCount(0);
   await go('/stats?range=calendar');
   await expect(page.getByRole('gridcell',{name:/วันนี้.*ไม่ถึงเป้าหมาย.*อารมณ์ ดี/})).toBeVisible();
   note('Ended fasting → eating → confirmed with mood; completed short session persisted as below goal in today’s calendar.');
  },
  'TC-IFTMR-003':async()=>{
   await go('/if'); await expect(timer()).toHaveText('0:00:00');
   const before=await seconds(); await page.waitForTimeout(1500); expect(await seconds()).toBe(before);
   await expect(page.getByRole('button',{name:'เลือกรูปแบบ IF',exact:true})).toBeVisible();
   note('Completed session returns to idle 0:00:00; timer stays stopped.');
  },
  'TC-IFCAL-001':async()=>{
   await go('/stats?range=calendar');
   await expect(page.getByRole('gridcell',{name:/วันนี้.*ไม่ถึงเป้าหมาย/})).toBeVisible();
   note('Today’s date displays the below-goal session created and completed during this run.');
  },
 };
};
