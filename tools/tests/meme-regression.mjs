import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const url = process.env.GAME_URL || 'http://localhost:8090/web/';
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/home/dev-user/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'], headless: true });
const page = await browser.newPage({ viewport: {width: 1080,height: 780} });
const errors=[]; page.on('pageerror', e=>errors.push(e.message));
page.on('console', m=>{if(m.type()==='error' || m.type()==='warning' && m.text().includes('missing sprite'))errors.push(m.text());});
try {
 await page.goto(url);
 await page.waitForFunction(()=>!!window.__game);
 const result=await page.evaluate(async()=>{
  const {Battle}=await import('./js/assets/scripts/Battle.js');
  const {CHARACTERS,ENEMIES}=await import('./js/assets/scripts/Defs.js');
  const {Node}=await import('cc');
  const {allSprites}=await import('./js/assets/scripts/PixelArt.js');
  const {Save}=await import('./js/assets/scripts/Save.js');
  const checks=[];
  const ok=(v,msg)=>{if(!v)throw Error(msg);checks.push(msg);};
  const near=(a,b,msg)=>ok(Math.abs(a-b)<1e-6,`${msg}: ${a} == ${b}`);
  const b=new Battle(new Node('MemeRegression'));
  const reset=id=>{b.reset(CHARACTERS.find(c=>c.id===id));b.stats.might=1;b.stats.crit=0;b.stats.fresh=0;b.stats.eliteDmg=0;b.stats.ultCharge=0;b.blessings=[];b.hp=b.stats.maxHp;b.iframe=0;b.hitstop=0;};
  const enemy=(x=80,y=0,boss=false)=>{const e=b.spawnEnemy('rat',x,y,true);e.hp=e.maxHp=10000;e.def={...e.def,hp:10000,knockRes:0,boss,speed:20};b.grid.clear();for(const e of b.enemies)b.grid.insert(e);return e;};
  const pulses=(id,seconds)=>{reset(id);const e=enemy();b.ult=1;ok(b.useUlt(),id+' release');ok(!b.useUlt(),id+' reject repeat');for(let i=0;i<Math.round(seconds*20);i++)b.updateUlt(.05);return 10000-e.hp;};
  near(pulses('mage',4),120,'dragon four fire ticks');
  near(pulses('knight',5),50,'maka five bubble ticks');
  near(pulses('nun',5),100,'banana five crying ticks');
  near(pulses('pyro',2),100,'happy five jumps');
  near(pulses('sage',3),120,'popcat six sonic rings');
  near(pulses('druid',.75),100,'angry cat five claws');
  near(pulses('prism',4),120,'pepe four flood ticks');
  near(pulses('fu',2),150,'fortune five gold waves');near(b.gold,10,'fortune fixed reward');near(b.ult,0,'fortune reward cannot recharge');
  near(pulses('santa',1.6),240,'santa eight gift bombs');
  reset('bomber');let e=enemy();let boss=enemy(90,0,true);b.ult=1;b.useUlt();near(e.hp,9920,'crycat impact');ok(e.memeFearUntil===3 && boss.memeFearUntil===0,'boss immune to fear');
  reset('rogue');b.ult=1;b.useUlt();for(let i=0;i<5;i++)b.updatePlayer(.05);near(b.px,260,'no-target pounce uses facing');ok(b.memeSpeedT>0,'pounce speed buff');
  reset('mage');e=enemy();b.updateTrait(6);near(e.hp,9980,'dragon passive cone');
  reset('sage');e=enemy();b.updateTrait(5);near(e.hp,9980,'popcat passive piercing wave');
  reset('druid');e=enemy();b.updateTrait(4);near(e.hp,9970,'angry cat passive claw');b.hp=b.stats.maxHp*.4;b.traitT=0;b.updateTrait(0);near(b.traitT,2,'low health claw interval');
  reset('knight');b.fireBullet('fireball',10,0,0,100,5);b.updateTrait(12);ok(!b.bullets[0].alive && b.shieldHits===1,'maka clears bullets and shields');b.updateTrait(12);near(b.shieldHits,1,'maka shield does not stack');
  reset('bomber');b.hp=b.stats.maxHp*.3;b.updateTrait(10);near(b.memeShieldHp,b.stats.maxHp*.1,'crycat low-health shield');let hp=b.hp;b.hurtPlayer(5);near(b.hp,hp,'shield absorbs damage');b.updatePlayer(2);near(b.memeShieldHp,0,'shield expires');
  reset('nun');b.hurtPlayer(5);ok(b.memeZones.length===1,'banana tears on damage');e=enemy();boss=enemy(90,0,true);near(b.memeSlow(e),.3,'tears slow');near(b.memeSlow(boss),.2,'boss slow cap');b.memeZone(0,0,110,4,.25,0x69bca9);near(b.memeSlow(e),.3,'slow takes strongest');b.updateMemeZones(3);near(e.hp,9940,'overlapping zones each deal damage');
  reset('prism');b.updateTrait(8);ok(b.memeZones.length===1,'pepe passive puddle');b.updateMemeZones(4);ok(b.memeZones.length===0,'puddle expires');
  reset('santa');b.updateTrait(30);ok(b.pickups.length===1,'santa passive gift');
  for(const id of ['mage','pyro','druid']){reset(id);for(let i=0;i<(id==='druid'?80:100);i++){const target=enemy();b.killEnemy(target);}near(b.ult,1,id+' kill threshold');}
  reset('knight');for(let i=0;i<1000;i++)b.updateUlt(.05);near(b.ult,1,'50 second time charge');
  reset('rogue');b.setInput(1,0);for(let i=0;i<800;i++)b.updatePlayer(.05);near(b.ult,1,'40 second moving charge');ok(b.memeMoveT>=3,'continuous movement buff');b.setInput(0,0);b.updatePlayer(.05);near(b.memeMoveT,0,'stopping clears movement buff');
  reset('nun');b.hp=1;b.heal(b.stats.maxHp);near(b.ult,(b.stats.maxHp-1)/b.stats.maxHp,'charge counts actual healing');const charge=b.ult;b.heal(100);near(b.ult,charge,'overheal cannot charge');
  reset('bomber');b.hp=2;b.hurtPlayer(10000);near(b.ult,2/b.stats.maxHp,'overkill only charges actual lost health');
  reset('fu');const random=Math.random;Math.random=()=>0;try{b.spawnPickup('coin',0,0,100,true);b.updatePickups(.01);}finally{Math.random=random;}near(b.ult,1,'100 base coins charge');ok(b.gold>=200,'fortune extra coins');
  reset('pyro');for(let i=0;i<20;i++){const e=enemy();b.killEnemy(e);}near(b.memeHappyT,3,'happy kill streak buff');near(b.cdMul(),.8,'happy cooldown multiplier');
  reset('knight');b.ult=1;b.useUlt();const life=b.ultT; // Paused UI never calls battle.tick.
  window.__game.setState('pause');const before=b.time;ok(b.time===before && b.ultT===life,'pause does not advance skill timers');
  reset('prism');b.memeZone(0,0,100,4,.25,0xffffff);b.memeShieldT=2;b.tasks.push({t:1,fn:()=>{throw Error('stale task');}});reset('mage');ok(!b.memeZones.length && !b.tasks.length && !b.memeShieldT && !b.ultT,'new run clears skills');
  b.hp=0;b.onDeath();const time=b.time;b.tick(1);near(b.time,time,'dead battle does not advance');reset('mage');b.revive(1);ok(!b.dead && !b.ultT,'revival state clean');
  for(const c of CHARACTERS){reset(c.id);b.ult=1;ok(b.useUlt(),c.id+' empty arena cast');for(let i=0;i<120;i++)b.tick(.05);ok(Number.isFinite(b.hp) && Number.isFinite(b.px),c.id+' full simulation finite');}
  reset('knight');e=enemy(100,0);b.ultT=5;const originalX=e.x;b.updateEnemies(.1);near(originalX-e.x,1,'bubble slows actual enemy motion by 50%');
  reset('sage');boss=enemy(80,0,true);b.updateTrait(5);near(boss.kx,0,'sonic passive cannot push boss');
  reset('prism');boss=enemy(80,0,true);b.ult=1;b.useUlt();b.updateUlt(1);near(boss.kx,0,'flood cannot push boss');
  reset('pyro');b.ult=1;b.useUlt();b.hp=0;b.revivals=0;b.onDeath();ok(b.ultT===0 && b.tasks.length===0 && b.playerBody.position.y===0,'death cancels active ultimate');
  const ids=CHARACTERS.map(c=>c.id);ok(ids.join(',')==='hunter,mage,rogue,knight,nun,pyro,bomber,sage,druid,prism,fu,santa','legacy ids unchanged');ok(CHARACTERS.find(c=>c.id==='fu').cost===-1 && CHARACTERS.find(c=>c.id==='santa').cost===-1,'seasonal unlocks retained');
  const sprites=allSprites();const hashes=new Set();for(const c of CHARACTERS){const frames=[0,1,2].map(i=>sprites[c.sprite+'_'+i]);ok(frames.every(Boolean),c.id+' three sprite frames');const signature=frames[0].data.reduce((h,v)=>((h*31)^v)>>>0,0);hashes.add(signature);ok(frames[0].data.some((v,i)=>v!==frames[1].data[i]),c.id+' animated walk');}ok(hashes.size===12,'all silhouettes distinct');
  b.world.destroy();return {checks,characters:CHARACTERS.map(c=>({id:c.id,name:c.name,ult:c.ultName}))};
 });
 assert.equal(errors.length,0,errors.join('\n'));
 fs.writeFileSync('docs/validation/meme-regression.json',JSON.stringify(result,null,2)+'\n');
 console.log(`PASS ${result.checks.length} assertions`);
 // Render an actual generated sprite contact sheet; no production gallery route.
 await page.evaluate(async()=>{
  const {CHARACTERS}=await import('./js/assets/scripts/Defs.js');const {allSprites}=await import('./js/assets/scripts/PixelArt.js');const sprites=allSprites();
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=780;const ctx=canvas.getContext('2d');ctx.fillStyle='#121b2b';ctx.fillRect(0,0,1080,780);ctx.fillStyle='#fff3d1';ctx.font='bold 30px sans-serif';ctx.fillText('MEME SURVIVORS · 角色总览',38,48);ctx.imageSmoothingEnabled=false;
  CHARACTERS.forEach((c,i)=>{const x=28+i%4*263,y=80+Math.floor(i/4)*230;ctx.fillStyle='#202e43';ctx.fillRect(x,y,245,210);const s=sprites[c.sprite+'_0'];const off=document.createElement('canvas');off.width=s.w;off.height=s.h;off.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(s.data),s.w,s.h),0,0);ctx.drawImage(off,x+70,y+10,96,128);ctx.fillStyle='#fff3d1';ctx.font='bold 22px sans-serif';ctx.fillText(c.name,x+16,y+166);ctx.fillStyle='#a9cbd9';ctx.font='16px sans-serif';ctx.fillText(c.ultName,x+16,y+193);});
  window.__game.setState('pause');document.body.replaceChildren(canvas);canvas.style.cssText='position:fixed;inset:0;width:1080px;height:780px';
 });
 await page.screenshot({path:'docs/validation/meme-roster.png'});
 // Real game scene screenshot after a controlled skill release.
 await page.goto(url);await page.waitForFunction(()=>!!window.__game);
 await page.setViewportSize({width:420,height:747});
 await page.evaluate(async()=>{const {CHARACTERS}=await import('./js/assets/scripts/Defs.js');const g=window.__game;g.startGame();g.battle.reset(CHARACTERS.find(c=>c.id==='knight'));g.battle.pendingBlessings=0;g.battle.pendingLevels=0;g.setState('play');g.tutStep=-1;g.tutNode.active=false;g.battle.ult=1;for(let i=0;i<12;i++)g.battle.spawnEnemy('rat',Math.cos(i)*150,Math.sin(i)*150,true);g.battle.useUlt();g.battle.invulnT=10;});
 await page.waitForTimeout(1250);assert.equal(await page.evaluate(()=>window.__game.state),'play');await page.screenshot({path:'docs/validation/meme-bubbles.png'});
 await page.evaluate(async()=>{const {CHARACTERS}=await import('./js/assets/scripts/Defs.js');const g=window.__game;g.battle.reset(CHARACTERS.find(c=>c.id==='mage'));g.battle.pendingBlessings=0;g.battle.ult=1;g.battle.invulnT=10;g.battle.spawnEnemy('slime',120,0,true);g.battle.useUlt();});
 await page.waitForTimeout(800);await page.screenshot({path:'docs/validation/meme-fire.png'});
 // A real paused game must keep all duration, movement and charge counters stable.
 const frozen=await page.evaluate(()=>{const g=window.__game;g.setState('pause');return [g.battle.time,g.battle.ultT,g.battle.ult,g.battle.px];});
 await page.waitForTimeout(300);assert.deepEqual(await page.evaluate(()=>{const b=window.__game.battle;return [b.time,b.ultT,b.ult,b.px];}),frozen);
 await page.evaluate(()=>window.__game.setState('play'));await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>window.__game.battle.time)>frozen[0]);
 // Seed the existing save format, persist, reload and inspect selection and ownership.
 await page.evaluate(async()=>{const {Save}=await import('./js/assets/scripts/Save.js');Save.data.chars=['hunter','mage','rogue','fu','santa'];Save.data.selected='fu';Save.save();});
 await page.reload();await page.waitForFunction(()=>!!window.__game);
 assert.deepEqual(await page.evaluate(async()=>{const {Save}=await import('./js/assets/scripts/Save.js');return {selected:Save.data.selected,chars:Save.data.chars,name:window.__game.selectedChar().name};}),{selected:'fu',chars:['hunter','mage','rogue','fu','santa'],name:'招财猫'});
 await page.evaluate(()=>window.__game.setState('chars'));await page.screenshot({path:'docs/validation/meme-selection.png'});
 // Select an owned replacement and start using real pointer input.
 const clickLabel=async text=>{
  const point=await page.evaluate(async text=>{const {Label}=await import('cc');let found=null;function walk(n){if(!n.active)return;const l=n.getComponent(Label);if(l?.string===text)found=n;for(const c of n.children)walk(c);}walk(window.__scene);if(!found)throw Error('Missing label '+text);let x=0,y=0;for(let n=found;n;n=n.parent){x+=n.position.x;y+=n.position.y;}const r=document.getElementById('game').getBoundingClientRect();return {x:r.left+x/720*r.width,y:r.top+(1280-y)/1280*r.height};},text);
  await page.mouse.click(point.x,point.y);
 };
 await clickLabel('奶蛙');assert.equal(await page.evaluate(async()=>{const {Save}=await import('./js/assets/scripts/Save.js');return Save.data.selected;}),'mage');
 await clickLabel('出发!');await page.waitForTimeout(100);
 if(await page.evaluate(()=>window.__game.state)!=='play'){await page.keyboard.press('1');await page.waitForTimeout(100);}
 assert.equal(await page.evaluate(()=>window.__game.state),'play');
 await page.keyboard.down('d');await page.waitForTimeout(200);await page.keyboard.up('d');
 assert.ok(await page.evaluate(()=>window.__game.battle.px)>0);
 await page.evaluate(()=>{const b=window.__game.battle;b.hp=0;b.revivals=0;});
 await page.waitForFunction(()=>window.__game.state==='result',{timeout:10000});
 await page.keyboard.press('Enter');await page.waitForTimeout(150);
 assert.ok(await page.evaluate(()=>['play','levelup'].includes(window.__game.state)));
 assert.equal(errors.length,0,errors.join('\n'));
 result.integration = ['pointer selection','start','keyboard movement','death/result/replay','pause/resume','persisted legacy save'];
 fs.writeFileSync('docs/validation/meme-regression.json',JSON.stringify(result,null,2)+'\n');
 console.log('PASS pointer selection, start, keyboard movement, death/result/replay, pause/resume and persisted legacy save');
 console.log('Screenshots: docs/validation/meme-{roster,selection,bubbles,fire}.png');
} finally {await browser.close();}
