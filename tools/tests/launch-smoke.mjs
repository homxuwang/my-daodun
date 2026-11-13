import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/home/dev-user/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.GAME_URL||'http://localhost:8090/web/');
 await page.waitForFunction(()=>window.__game?.state==='privacy',{timeout:15000});
 const point=await page.evaluate(async()=>{const {Label}=await import('cc');let node;function walk(n){if(!n.active)return;if(n.getComponent(Label)?.string==='同意')node=n;for(const c of n.children)walk(c);}walk(window.__scene);if(!node)throw Error('Consent button missing');let x=0,y=0;for(let n=node;n;n=n.parent){x+=n.position.x;y+=n.position.y;}const r=document.getElementById('game').getBoundingClientRect();return {x:r.left+x/720*r.width,y:r.top+(1280-y)/1280*r.height};});
 await page.touchscreen.tap(point.x,point.y);await page.waitForFunction(()=>window.__game.state==='menu');
 const consent=await page.evaluate(async()=>{const {Save}=await import('./js/assets/scripts/Save.js');return Save.data.privacyOk;});assert.equal(consent,true);
 await page.reload();await page.waitForFunction(()=>window.__game?.state==='menu',{timeout:15000});
 assert.deepEqual(errors,[]);
 console.log('PASS mobile first launch → privacy → touchscreen consent → menu → reload persistence (browser, not WeChat device)');
}finally{await browser.close();}
