const { chromium } = require('@playwright/test');
(async () => {
 const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
 const page = browser.contexts()[0].pages()[0];
 for (const route of process.argv.slice(2)) {
   await page.goto('https://www.nutrijourney88.com' + route);
   await page.waitForTimeout(1500);
   console.log(JSON.stringify({route, text: await page.locator('body').innerText(), controls: await page.locator('input,button,select,a').evaluateAll(es => es.map(e => ({tag:e.tagName,text:e.innerText,href:e.getAttribute('href'),type:e.getAttribute('type'),name:e.getAttribute('name'),label:e.getAttribute('aria-label'),placeholder:e.getAttribute('placeholder'),value:e.value}))) }));
 }
 await browser.close();
})().catch(e => {console.error(e);process.exit(1)});
