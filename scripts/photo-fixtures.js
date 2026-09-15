const {chromium}=require('@playwright/test');
const fs=require('node:fs');
(async()=>{
 fs.mkdirSync('test-data/photos',{recursive:true});
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:300,height:400}});
 for(const [name,color] of [['front','lightblue'],['side','lightgreen'],['back','pink']]) {
  await p.setContent(`<body style="background:${color};font:24px sans-serif">QA TEST ${name}</body>`);
  await p.screenshot({path:`test-data/photos/${name}.png`});
 }
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
