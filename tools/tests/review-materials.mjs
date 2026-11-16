import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out='docs/review-materials';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/home/dev-user/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
 const context=await browser.newContext({viewport:{width:540,height:960},hasTouch:true,isMobile:true,deviceScaleFactor:2});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.GAME_URL||'http://localhost:8090/web/');await page.waitForFunction(()=>window.__game?.state==='splash');
 const info=await page.evaluate(async()=>{const r=await import('./js/assets/scripts/ReviewInfo.js');return {...r};});
 assert.equal(info.AGE_RATING,'12+');assert.equal(info.HEALTH_TIP.replace(/[，。\s]/g,'').length,48);
 await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.__game.state),'splash');
 await page.screenshot({path:out+'/01-startup.png'});
 const tapLabel=async text=>{const p=await page.evaluate(async text=>{const {Label}=await import('cc');let found;function walk(n){if(!n.active)return;if(n.getComponent(Label)?.string===text)found=n;for(const c of n.children)walk(c);}walk(window.__scene);if(!found)throw Error('Missing label: '+text);let x=0,y=0;for(let n=found;n;n=n.parent){x+=n.position.x;y+=n.position.y;}const r=document.getElementById('game').getBoundingClientRect();return {x:r.left+x/720*r.width,y:r.top+(1280-y)/1280*r.height};},text);await page.touchscreen.tap(p.x,p.y);};
 // Actual badge tap must open the explanation and prevent automatic navigation behind it.
 await page.touchscreen.tap(62/720*540,72/1280*960);
 assert.equal(await page.evaluate(()=>window.__game.ageNode.active),true);
 const paused=await page.evaluate(()=>window.__game.splashT);await page.waitForTimeout(4200);
 assert.equal(await page.evaluate(()=>window.__game.splashT),paused);
 assert.equal(await page.evaluate(()=>window.__game.state),'splash');
 await tapLabel('关闭');assert.equal(await page.evaluate(()=>window.__game.ageNode.active),false);
 await page.waitForFunction(()=>window.__game.state==='privacy',{timeout:10000});await tapLabel('同意');await page.waitForFunction(()=>window.__game.state==='menu');
 await page.screenshot({path:out+'/02-menu.png'});
 await page.touchscreen.tap(62/720*540,72/1280*960);assert.equal(await page.evaluate(()=>window.__game.ageNode.active),true);
 await page.screenshot({path:out+'/03-age-explanation.png'});
 await tapLabel('关闭');assert.equal(await page.evaluate(()=>window.__game.ageNode.active),false);
 assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/备案填写文本.txt',`游戏名称：刀盾闯关\n适龄等级：${info.AGE_RATING}（12周岁及以上）\n\n${info.HEALTH_TITLE}\n${info.HEALTH_TIP}\n\n适龄提示说明\n${info.AGE_TIP}\n`);
 console.log('PASS 12+ rating, complete health text, early-skip protection, badge touch, modal timer pause/close, consent flow; exported three actual browser screenshots and filing text.');
}finally{await browser.close();}
