const fs = require('node:fs');
const path = require('node:path');
const cases = JSON.parse(fs.readFileSync('test-data/test-cases.json','utf8').replace(/^\uFEFF/,''));
const source=process.argv[2] || 'test-results-auth/results.json';
const currentRun=process.argv.includes('--current');
const run = JSON.parse(fs.readFileSync(source,'utf8'));
const ledgerPath='test-data/execution-ledger.json';
const ledger=fs.existsSync(ledgerPath)?JSON.parse(fs.readFileSync(ledgerPath,'utf8')):{};
function visit(suite) {
 for(const spec of suite.specs || []) for(const test of spec.tests) {
  const id=spec.title.split(' | ')[0]; const result=test.results.at(-1);
  if(!result) continue;
  const annotations=[...(test.annotations || []),...(result.annotations || [])];
  const status=result.status==='passed'?'Pass':result.status==='skipped'?'Blocked':'Fail';
  // A later partial run must not replace a real execution with an unimplemented skip.
  if(!currentRun && status==='Blocked' && ledger[id] && ledger[id].status!=='Blocked' && !annotations.some(a=>a.type==='correction')) continue;
  fs.mkdirSync('test-data/evidence',{recursive:true});
  const evidence=[];
  for(const attachment of result.attachments || []) {
   const ext=attachment.contentType==='image/png'?'png':'txt';
   const target=`test-data/evidence/${id.replace(/[^A-Za-z0-9_-]/g,'_')}-${attachment.name}.${ext}`;
   if(attachment.body) fs.writeFileSync(target,Buffer.from(attachment.body,'base64'));
   else if(attachment.path) {
    const archived=path.join(path.dirname(source),path.relative(path.resolve('test-results-auth'),attachment.path));
    const actual=fs.existsSync(archived)?archived:attachment.path;
    if(!fs.existsSync(actual)) continue;
    fs.copyFileSync(actual,target);
   }
   else continue;
   evidence.push(target);
  }
  ledger[id]={status,startedAt:result.startTime,actual:annotations.filter(a=>a.type==='actual'||a.type==='skip').map(a=>a.description).join('\n'),error:result.error?.message || '',attachments:evidence};
 }
 for(const child of suite.suites || []) visit(child);
}
for(const suite of run.suites) visit(suite);
fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2));
const rows=cases.map(c=>{
 const r=ledger[c.ID.trim()];
 return {...c,Status:r?.status||'Not Run',Actual:r ? (r.actual || (r.status==='Pass'?'Playwright assertions passed; see test source and evidence':r.error)):'ยังไม่ได้รัน',Environment:'https://www.nutrijourney88.com',Tester:r?.status==='Blocked'?'':'Playwright / Codex',Date:r?.status==='Blocked'?'':r?.startedAt||'',Remarks:r?.error||r?.attachments.join('\n')||''};
});
const keys=Object.keys(rows[0]); const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
fs.writeFileSync('test-data/coverage.json',JSON.stringify(rows,null,2));
fs.writeFileSync('test-data/coverage.csv','\uFEFF'+[keys,...rows.map(r=>keys.map(k=>r[k]))].map(r=>r.map(quote).join(',')).join('\r\n'));
const counts=rows.reduce((counts,r)=>(counts[r.Status]=(counts[r.Status]||0)+1,counts),{});
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
fs.writeFileSync('test-data/report.html',`<!doctype html><html lang="th"><meta charset="utf-8"><title>NutriJourney — Sheet Test Results</title><style>body{font:16px system-ui;max-width:1100px;margin:32px auto;padding:0 16px;color:#183024}summary{cursor:pointer;padding:12px;background:#edf4ef}details{margin:8px 0;border:1px solid #cddbd0}details>div{padding:16px}pre{white-space:pre-wrap;overflow-wrap:anywhere}.Pass{color:#176236}.Fail{color:#bd2222}.Blocked{color:#926100}img{max-width:500px;width:100%}button{margin:4px;padding:8px}</style><h1>NutriJourney: ผลทดสอบตามชีต 74 เคส</h1><p>URL: https://www.nutrijourney88.com/ — Chromium desktop, บัญชีทดสอบที่ผู้ใช้ล็อกอิน</p><p>${escape(JSON.stringify(counts))}</p><p>Blocked = ยังทดสอบครบขั้นตอนไม่ได้ ไม่ถือว่าผ่าน. เคสหน้าสาธารณะ 10 เทสต์อยู่ในรายงานแยก.</p>${rows.map(r=>`<details><summary><b class="${r.Status}">${r.Status}</b> ${escape(r.ID)} — ${escape(r.Title)}</summary><div><b>Steps</b><pre>${escape(r.Steps)}</pre><b>Expected (ต้นฉบับ)</b><pre>${escape(r.Expected)}</pre><b>Actual / ข้อจำกัด</b><pre>${escape(r.Actual)}</pre>${r.Status==='Fail'?`<pre>${escape(r.Remarks)}</pre>`:''}${(ledger[r.ID.trim()]?.attachments||[]).filter(p=>p.endsWith('.png')).map(p=>`<a href="${escape(p.replace('test-data/',''))}"><img loading="lazy" src="${escape(p.replace('test-data/',''))}" alt="หลักฐาน ${escape(r.ID)}"></a>`).join('')}</div></details>`).join('')}</html>`);
console.log(counts);
