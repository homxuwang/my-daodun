import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { inspectWechat, validAppId } from '../wechat-preflight.mjs';
const root=process.cwd(), fixture=fs.mkdtempSync(path.join(os.tmpdir(),'daodun-wechat-'));
let assertions=0;
const ok=(value,message)=>{assert.ok(value,message);assertions++;};
const write=(file,data)=>{const target=path.join(fixture,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,typeof data==='string'?data:JSON.stringify(data));};
const appid='wx1234567890abcdef'; // Fixture identifier only, never written to project configuration.
try {
 for(const file of ['build-wechat.json','build-templates/wechatgame/project.config.json','assets/scenes/Main.scene.meta','assets/scripts/AdConfig.ts','assets/scripts/Defs.ts','build-templates/wechatgame/openDataContext/index.js'])write(file,fs.readFileSync(path.join(root,file),'utf8'));
 for(const value of ['', 'touristappid','wx6ac3f5090a6b99c5','wx-not-valid'])ok(!validAppId(value),'reject invalid/default appid');
 const initial=inspectWechat({root:fixture});ok(initial.checks.some(c=>c.id==='appid'&&c.status==='fail'),'empty appid blocks release');
 const source=inspectWechat({root:fixture,appid});ok(source.status==='local-checks-passed','valid fixture source passes checks');ok(source.unverified.length>0,'local checks never assert remote review or device pass');
 write('out/game.js','// TEST FIXTURE: not a real Cocos build');
 write('out/game.json',{deviceOrientation:'portrait'});
 write('out/project.config.json',{appid,compileType:'game'});
 execFileSync(process.execPath,[path.join(root,'tools/wechat-postbuild.mjs'),path.join(fixture,'out')],{stdio:'pipe'});
 ok(fs.existsSync(path.join(fixture,'out/openDataContext/index.js')),'postbuild copies actual ranking source');
 const packaged=()=>inspectWechat({root:fixture,appid,packageDir:'out'});
 ok(packaged().status==='local-checks-passed','complete fixture package structure passes');
 fs.unlinkSync(path.join(fixture,'out/game.js'));ok(packaged().status==='blocked','missing game entry blocks release');write('out/game.js','// fixture');
 write('out/project.config.json',{appid:'wxabcdef1234567890',compileType:'game'});ok(packaged().checks.some(c=>c.id==='package-appid'&&c.status==='fail'),'wrong package appid blocks');
 write('out/project.config.json',{appid,compileType:'miniprogram'});ok(packaged().checks.some(c=>c.id==='package-type'&&c.status==='fail'),'wrong package type blocks');write('out/project.config.json',{appid,compileType:'game'});
 write('out/game.json',{deviceOrientation:'landscape'});ok(packaged().checks.some(c=>c.id==='package-portrait'&&c.status==='fail'),'landscape blocks');ok(packaged().checks.some(c=>c.id==='package-open-data'&&c.status==='fail'),'unregistered open data blocks');write('out/game.json',{deviceOrientation:'portrait',openDataContext:'openDataContext'});
 fs.writeFileSync(path.join(fixture,'out/oversized.bin'),Buffer.alloc(4*1024*1024));ok(packaged().checks.some(c=>c.id==='package-size'&&c.status==='fail'),'oversized package blocks');fs.unlinkSync(path.join(fixture,'out/oversized.bin'));
 let ads=fs.readFileSync(path.join(fixture,'assets/scripts/AdConfig.ts'),'utf8');write('assets/scripts/AdConfig.ts',ads.replace('debugFake: false','debugFake: true')+'\n// debugFake: false -- must not bypass the check');ok(packaged().checks.some(c=>c.id==='real-ads'&&c.status==='fail'),'comment cannot bypass real ad flag check');write('assets/scripts/AdConfig.ts',ads);
 let defs=fs.readFileSync(path.join(fixture,'assets/scripts/Defs.ts'),'utf8');write('assets/scripts/Defs.ts',defs.replace('force: false','force: true'));ok(packaged().checks.some(c=>c.id==='real-events'&&c.status==='fail'),'forced event blocks release');write('assets/scripts/Defs.ts',defs);
 const state={oscillators:0,started:0,intervals:0,stopped:0,created:0};
 const audioParam={setValueAtTime(){},exponentialRampToValueAtTime(){}};
 const ctx={state:'running',currentTime:0,destination:{},createGain(){return {gain:{...audioParam,value:1},connect(){}};},createOscillator(){state.oscillators++;return {frequency:audioParam,connect(){},start(){state.started++;},stop(){}};},resume(){return Promise.resolve();}};
 const load=(platform,data={music:true,sfx:true,vibrate:true})=>{
  const scope={exports:{},require(id){if(id==='./Save')return {Save:{data}};throw Error('Unexpected dependency '+id);},wx:platform,setInterval(){state.intervals++;return 1;},clearInterval(){state.stopped++;},console};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('assets/scripts/Sound.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,scope);
  return scope.exports.Sound;
 };
 const sound=load({createWebAudioContext(){state.created++;return ctx;}});
 sound.play('click');ok(state.created===1&&state.started>0,'WeChat audio works without DOM AudioContext');
 sound.playBgm('bgm_battle');ok(state.intervals===1,'WeChat BGM starts');sound.pauseBgm();ok(state.stopped>0,'background pause clears timer');sound.resumeBgm();ok(state.intervals===2,'foreground can restart BGM');
 const silent=load(undefined);silent.play('click');silent.vibrate();ok(true,'no audio API / navigator degrades safely');
 const muted=load({createWebAudioContext(){throw Error('muted audio should not initialize');}},{music:false,sfx:false,vibrate:false});muted.play('click');ok(true,'muted effects do not initialize platform audio');
 const inaccessible=load({createWebAudioContext(){throw Error('unavailable platform API');}});inaccessible.play('click');ok(true,'audio creation failure does not block game');
 // Exercise the actual shell wrapper against an isolated fake Creator, not project output.
 for(const file of ['tools/build-wechat.sh','tools/wechat-preflight.mjs','tools/wechat-postbuild.mjs'])write(file,fs.readFileSync(path.join(root,file),'utf8'));
 fs.symlinkSync(path.join(root,'node_modules'),path.join(fixture,'node_modules'),'dir');
 write('package.json',{type:'module',scripts:{'check:cocos':'node -e "process.exit(0)"'}});
 write('creator-fixture.mjs',`#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';
const args=process.argv.slice(2), project=args[args.indexOf('--project')+1];
const config=JSON.parse(fs.readFileSync(args[args.indexOf('--build')+1].slice('configPath='.length),'utf8'));
const out=path.join(project,'build/wechatgame');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'game.js'),'// TEST FIXTURE ONLY');
fs.writeFileSync(path.join(out,'game.json'),JSON.stringify({deviceOrientation:'portrait'}));
fs.writeFileSync(path.join(out,'project.config.json'),JSON.stringify({appid:config.packages.wechatgame.appid,compileType:'game'}));
process.exit(36);
`);
 fs.chmodSync(path.join(fixture,'creator-fixture.mjs'),0o755);
 const buildEnv={...process.env,CREATOR:path.join(fixture,'creator-fixture.mjs')};
 execFileSync('bash',[path.join(fixture,'tools/build-wechat.sh'),appid],{cwd:fixture,env:buildEnv,stdio:'pipe'});
 ok(fs.existsSync(path.join(fixture,'build/wechatgame/openDataContext/index.js')),'shell wrapper runs postbuild after Creator exit 36');
 ok(!fs.existsSync(path.join(fixture,'build/.wechat-build-config.json')),'shell wrapper cleans temporary configuration');
 write('creator-fixture.mjs','#!/usr/bin/env node\nprocess.exit(0);\n');
 for(const name of ['game.js','game.json','project.config.json'])fs.utimesSync(path.join(fixture,'build/wechatgame',name),new Date(1),new Date(1));
 let rejected=false;try{execFileSync('bash',[path.join(fixture,'tools/build-wechat.sh'),appid],{cwd:fixture,env:buildEnv,stdio:'pipe'});}catch(e){rejected=e.status!==0;}
 ok(rejected,'exit zero with stale output is rejected');
 ok(!fs.existsSync(path.join(fixture,'build/.wechat-build-config.json')),'failed build cleans temporary configuration');
 console.log(`PASS ${assertions} WeChat release/audio assertions (fixtures, not real-device certification)`);
} finally {fs.rmSync(fixture,{recursive:true,force:true});}
