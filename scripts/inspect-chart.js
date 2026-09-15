const {chromium}=require('@playwright/test');
(async()=>{
 const b=await chromium.connectOverCDP('http://127.0.0.1:9223'); const p=b.contexts()[0].pages()[0];
 await p.addInitScript(()=>{
  window.__qaCanvasText=[];
  const original=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text,...args){
   window.__qaCanvasText.push(String(text)); return original.call(this,text,...args);
  };
 });
 await p.goto('https://www.nutrijourney88.com/stats'); await p.locator('canvas').waitFor();
 await p.waitForTimeout(1200);
 const box=await p.locator('canvas').boundingBox();
 await p.mouse.move(box.x+45,box.y+box.height/2); await p.waitForTimeout(500);
 console.log(await p.evaluate(()=>[...new Set(window.__qaCanvasText)]));
 await p.screenshot({path:'test-data/chart-hover.png',fullPage:true});
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
