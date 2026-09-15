const {expect} = require('@playwright/test');
module.exports = ({page,go,note}) => {
 const upload = async () => {
  await go('/photo'); await page.getByRole('button',{name:'บันทึกรูปความคืบหน้า',exact:true}).click();
  await expect(page.locator('input[type=file]')).toHaveCount(3);
 };
 const endDialog = async () => {
  await go('/if'); await page.getByRole('button',{name:'สิ้นสุดการกิน',exact:true}).click();
  return page.getByRole('dialog');
 };
 return {
  'TC-HS-001': async () => {
   await go('/profile'); await expect(page.getByText('231 กก.',{exact:true})).toBeVisible();
   await page.addInitScript(()=>{
    window.__qaHealthChartText=[];
    const original=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(text,...args){
     window.__qaHealthChartText.push(String(text)); return original.call(this,text,...args);
    };
   });
   await go('/stats'); const canvas=page.locator('canvas'); await expect(canvas).toBeVisible();
   await expect(page.getByText('1 จุดบันทึก',{exact:true})).toBeVisible();
   await expect.poll(()=>page.evaluate(()=>window.__qaHealthChartText?.includes('11 ก.ย.'))).toBe(true);
   const box=await canvas.boundingBox();
   await page.mouse.move(box.x+45,box.y+box.height/2);
   await expect.poll(()=>page.evaluate(()=>window.__qaHealthChartText?.includes('231.0 กก.'))).toBe(true);
   note('Observed actual canvas fillText output and hovered real data point: 11 September 2026, 231.0 kg, matching profile. Drawing calls were observed, not mocked. Only one existing record is available.');
  },
  'TC-MOOD-002': async () => {
   const d=await endDialog(); await d.getByRole('button',{name:'สิ้นสุดการกิน',exact:true}).click();
   await expect(d.getByText('กรุณาเลือกอารมณ์ก่อนสิ้นสุด',{exact:true})).toBeVisible();
   await expect(d).toBeVisible();
   await page.reload(); await expect(page.getByRole('button',{name:'สิ้นสุดการกิน',exact:true})).toBeVisible();
   note('Submitting without mood shows error and preserves active eating session after reload.');
  },
  'TC-MOOD-001': async () => {
   const d=await endDialog(); await d.getByRole('button',{name:'ดี',exact:true}).click();
   await d.getByRole('button',{name:'สิ้นสุดการกิน',exact:true}).click();
   await expect(d).toBeHidden();
   await go('/stats?range=calendar');
   await expect(page.getByRole('gridcell',{name:/วันนี้.*อารมณ์ ดี/})).toBeVisible();
   note('Selected ดี (Happy), completed IF, and confirmed today’s persisted calendar mood.');
  },
  'TC-MOOD-003': async () => {
   await go('/stats?range=calendar'); await page.reload();
   await expect(page.getByRole('gridcell',{name:/วันนี้.*อารมณ์ ดี/})).toBeVisible();
   note('Reloaded calendar and confirmed the mood saved in TC-MOOD-001.');
  },
  'TC-CAL-001': async () => {
   await go('/stats?range=calendar');
   const cell=page.getByRole('gridcell',{name:/วันนี้.*อารมณ์ ดี/});
   await expect(cell).toBeVisible(); await cell.click();
   note('Today’s IF calendar entry is labelled with saved mood ดี; clicked the entry.');
  },
  'TC-PP-002': async () => {
   await upload(); await page.locator('input[type=file]').nth(0).setInputFiles('test-data/photos/front.png');
   await page.getByRole('button',{name:'บันทึก',exact:true}).click();
   await expect(page.getByRole('dialog')).toBeVisible();
   await expect(page.getByRole('dialog')).toContainText(/ครบ|3 มุม/);
   await page.reload(); await expect(page.getByText('ยังไม่มี',{exact:true})).toHaveCount(3);
   note('Submitted only front image; dialog stayed open and no photo set persisted after reload.');
  },
  'TC-PP-003': async () => {
   await upload(); await page.locator('input[type=file]').nth(0).setInputFiles({name:'invalid.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nQA invalid image')});
   await page.locator('input[type=file]').nth(1).setInputFiles('test-data/photos/side.png');
   await page.locator('input[type=file]').nth(2).setInputFiles('test-data/photos/back.png');
   await page.getByRole('button',{name:'บันทึก',exact:true}).click();
   await expect(page.getByRole('dialog')).toContainText(/ไม่รองรับ|รองรับเฉพาะ|ประเภทไฟล์|ชนิดไฟล์|รูปภาพเท่านั้น|JPG|PNG/);
   await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
   note('Actual PDF file rejected by upload UI; accept attribute alone is not treated as validation.');
  },
  'TC-PP-001': async () => {
   if(process.env.VERIFY_PHOTO_SUBMISSION==='1') {
    await go('/photo');
    await expect(page.getByRole('heading',{name:'กันยายน 2026',exact:true})).toBeVisible();
    await expect(page.getByRole('img',{name:'ภาพถ่ายความคืบหน้า',exact:true})).toHaveCount(3);
    for(const image of await page.getByRole('img',{name:'ภาพถ่ายความคืบหน้า',exact:true}).all())
     await expect.poll(()=>image.evaluate(e=>e.complete && e.naturalWidth===300 && e.naturalHeight===400)).toBe(true);
    await expect(page.getByText('231 กก.',{exact:true})).toBeVisible();
    note('Continuation of prior TC-PP-001 submission in auth-run-3: verified all three uploaded 300×400 QA images persisted in September with weight 231. October placeholders are separate. Upload form had filenames but no previews.');
    return;
   }
   await upload();
   for(const [i,name] of ['front','side','back'].entries()) await page.locator('input[type=file]').nth(i).setInputFiles(`test-data/photos/${name}.png`);
   for(const name of ['front','side','back']) await expect(page.getByRole('dialog').getByText(`${name}.png`,{exact:true})).toBeVisible();
   note('Preview observation: upload form shows filenames but no image previews before save (0 img elements).');
   await page.getByRole('button',{name:'บันทึก',exact:true}).click();
   await expect(page.getByRole('dialog')).toBeHidden(); await page.reload();
   await expect(page.getByText('ยังไม่มี',{exact:true})).toHaveCount(0);
   await expect(page.locator('main img')).toHaveCount(3);
   note('Uploaded 3 labelled synthetic QA images; verified filenames and persisted set after reload. Image previews before save were absent.');
  },
  'TC-HP-005W1-6': async () => {
   await go('/profile'); await page.getByRole('button',{name:'แก้ไขข้อมูล',exact:true}).click();
   const height=await page.locator('#edit-profile-height').inputValue();
   await page.getByRole('button',{name:'บันทึก',exact:true}).click();
   await expect(page.getByRole('dialog')).toBeHidden(); await page.reload();
   await expect(page.getByText(`${height} ซม.`,{exact:true})).toBeVisible();
   note(`Saved existing health profile and reloaded: height ${height} matches saved value.`);
  },
  'TC-HJ-001': async () => {
   await go('/my-egg'); const level=(await page.getByText(/^เลเวล \d+$/).innerText()).match(/\d+/)[0];
   await expect(page.getByRole('img',{name:new RegExp(`ระดับ ${level}$`)})).toBeVisible();
   await expect(page.getByRole('progressbar',{name:'ความคืบหน้าเลเวล'})).toBeVisible();
   const xp=await page.getByText(/^\d+ \/ \d+ exp$/).innerText();
   await go('/dashboard'); await expect(page.getByText(/^\d+ \/ \d+ exp$/)).toHaveText(xp);
   note('Character level/image and progress render; XP matches Dashboard. Does not establish all level thresholds.');
  },
  'TC-HJ-002': async () => {
   await go('/my-egg'); const [xp,max]=(await page.getByText(/^\d+ \/ \d+ exp$/).innerText()).match(/\d+/g).map(Number);
   const bar=page.getByRole('progressbar',{name:'ความคืบหน้าเลเวล'});
   const attrs=await bar.evaluate(e=>({now:e.getAttribute('aria-valuenow'),max:e.getAttribute('aria-valuemax')}));
   expect(Number(attrs.now)).toBe(Math.round(xp/max*100)); expect(Number(attrs.max)).toBe(100);
   note(`Progress percentage matches visible XP ${xp}/${max}.`);
  },
  'TC-BA-002': async () => {
   await go('/photo'); await page.getByRole('button',{name:'เปรียบเทียบ',exact:true}).click();
   await expect(page.getByText('ยังมีน้อยกว่า 2 เดือน — บันทึกครบ 2 เดือนขึ้นไปจึงเปรียบเทียบได้',{exact:true})).toBeVisible();
   await expect(page.getByRole('img',{name:'ภาพถ่ายความคืบหน้า',exact:true})).toHaveCount(0);
   note('Comparison blocked with only one month of photos; explicit two-month requirement shown.');
  },
  'TC-PPTL-002': async () => {
   await go('/photo');
   await expect(page.getByRole('heading',{name:'กันยายน 2026',exact:true})).toBeVisible();
   await page.getByRole('img',{name:'ภาพถ่ายความคืบหน้า',exact:true}).first().click();
   await expect(page.getByText('231 กก.',{exact:true})).toBeVisible();
   await expect(page.getByText('32 นิ้ว',{exact:true})).toBeVisible();
   note('Selected saved photo; timeline displays September date, weight 231 and waist 32 matching test profile.');
  },
 };
};
