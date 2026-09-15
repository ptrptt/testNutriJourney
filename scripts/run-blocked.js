const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const cases=JSON.parse(fs.readFileSync('test-data/coverage.json','utf8')).filter(c=>c.Status==='Blocked');
const pattern=cases.map(c=>c.ID.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+' \\|').join('|');
const result=spawnSync(process.execPath,['node_modules/@playwright/test/cli.js','test','-c','playwright.auth.config.js','--grep',pattern],{stdio:'inherit'});
process.exitCode=result.status ?? 1;
