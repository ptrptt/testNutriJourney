const {expect,test}=require('@playwright/test');
const fs=require('node:fs');
function result(file,id) {
 const root=JSON.parse(fs.readFileSync(file,'utf8'));
 function find(s){
  for(const spec of s.specs||[]) if(spec.title.startsWith(id+' |')) return spec.tests[0].results.at(-1);
  for(const child of s.suites||[]) {const r=find(child);if(r)return r;}
 }
 for(const s of root.suites){const r=find(s);if(r)return r;}
 throw new Error(`Missing recorded evidence ${id}`);
}
function snapshot(r) {
 const text=Buffer.from(r.attachments.find(a=>a.name==='accessible-page').body,'base64').toString();
 return {xp:Number(text.match(/(\d+) \/ \d+ exp/)[1]),completed:Number(text.match(/ทำสำเร็จแล้ว (\d+)\/4/)[1]),text};
}
module.exports=({page,go,note})=>{
 const transition=()=>{
  const before=result('test-data/auth-run-1/results.json','TC-NAME-003');
  const action=result('test-data/auth-run-2/results.json','TC-MOOD-001');
  const after=result('test-data/auth-run-2/results.json','TC-HJ-002');
  expect(action.status).toBe('passed');
  expect(Date.parse(before.startTime)).toBeLessThan(Date.parse(action.startTime));
  expect(Date.parse(action.startTime)).toBeLessThan(Date.parse(after.startTime));
  return {before:snapshot(before),after:snapshot(after)};
 };
 return {
  'TC-XP-001':async()=>{
   const {before,after}=transition();
   expect(after.xp).toBe(before.xp+50); expect(after.completed).toBe(before.completed+1);
   await test.info().attach('XP-before-after',{body:`Before:\n${before.text}\nAfter mood mission:\n${after.text}`,contentType:'text/plain'});
   await go('/my-egg');
   note(`Retrospective assertion against captured Playwright execution: actual TC-MOOD-001 completed mood mission, XP ${before.xp} → ${after.xp}, missions ${before.completed} → ${after.completed}. Not a newly awarded reward in this verification run.`);
  },
  'TC-XP-003':async()=>{
   const {before,after}=transition(); await go('/my-egg');
   await expect(page.getByText(/^\d+ \/ \d+ exp$/)).toContainText(`${before.xp+50} /`);
   await go('/dashboard'); await expect(page.getByText(/^\d+ \/ \d+ exp$/)).toContainText(`${after.xp} /`);
   note(`Current total ${after.xp} matches captured ${before.xp} + 50 mood reward on both Healthy Journey and Dashboard.`);
  },
  'TC-CHAR-002':async()=>{
   await go('/my-egg');
   test.info().annotations.push({type:'correction',description:'Earlier level assertion assumed fasting reward without completing the whole required IF cycle; threshold precondition was not met, so it was a test-setup error.'});
   test.skip(true,'บัญชีมี XP 250/300 ยังไม่ถึงเกณฑ์เลื่อนเลเวล ต้องมี fixture ที่ได้ XP เพิ่มในรอบภารกิจใหม่; การจบกินก่อนครบเป้าไม่ทำให้ mission สำเร็จ');
  },
  'TC-DM-003':async()=>{
   await go('/my-egg');
   const mission=page.locator('article').filter({has:page.getByRole('heading',{name:'อดอาหารครบตามเป้า',exact:true})});
   await expect(mission.locator('[aria-hidden=true] svg')).toHaveCount(0);
   await expect(page.getByText('ทำสำเร็จแล้ว 3/4',{exact:true})).toBeVisible();
   await page.reload();
   await expect(mission.locator('[aria-hidden=true] svg')).toHaveCount(0);
   note('Fasting-goal mission stays incomplete without a completion checkmark after premature session completion and reload; other three missions are complete.');
  },
 };
};
