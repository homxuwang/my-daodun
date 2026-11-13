#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const validAppId = value => /^wx[0-9a-f]{16}$/.test(value || '') && value !== 'wx6ac3f5090a6b99c5';
function configExport(file, name) {
    const source = fs.readFileSync(file, 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const context = { exports: {} };
    vm.runInNewContext(code, context, { filename: file, timeout: 2000 });
    return context.exports[name];
}
export function inspectWechat({ root = project, packageDir, appid, environment = false } = {}) {
    const checks = [];
    const add = (id, ok, message, optional = false) => checks.push({ id, status: ok ? 'pass' : optional ? 'warning' : 'fail', message });
    const json = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
    const build = json('build-wechat.json'), template = json('build-templates/wechatgame/project.config.json');
    const expected = appid || process.env.WECHAT_APPID || build.packages?.wechatgame?.appid || template.appid;
    add('appid', validAppId(expected), '需要真实微信小游戏 AppID；不接受空值、tourist 或引擎默认测试 AppID');
    const configured = [build.packages?.wechatgame?.appid, template.appid].filter(Boolean);
    add('appid-consistency', configured.every(id => id === expected), '构建配置与模板中已填写的 AppID 必须一致');
    const ads = configExport(path.join(root, 'assets/scripts/AdConfig.ts'), 'AD_CONFIG');
    const event = configExport(path.join(root, 'assets/scripts/Defs.ts'), 'EVENT');
    add('real-ads', ads?.debugFake === false, '正式版本禁止模拟广告发奖');
    add('real-events', event?.force === false, '正式版本禁止强制开启节日活动');
    add('release-build', build.debug === false && build.sourceMaps === false, '使用非调试构建并关闭源码映射');
    add('portrait', build.packages?.wechatgame?.orientation === 'portrait', '微信构建必须为竖屏');
    const scene = json('assets/scenes/Main.scene.meta');
    add('start-scene', build.startScene === scene.uuid && build.scenes?.some(s => s.uuid === scene.uuid), '初始场景必须匹配 Main.scene UUID');
    add('open-data-source', fs.existsSync(path.join(root, 'build-templates/wechatgame/openDataContext/index.js')), '好友排行开放数据域源文件存在');
    add('ads-configured', !!ads.rewarded || Object.values(ads.rewardedByPlace || {}).some(Boolean), '广告位尚未配置；首版可无广告运行，不能验证广告收益', true);
    if (environment) {
        const creator = process.env.CREATOR;
        add('creator', !!creator && fs.existsSync(creator), '当前环境需要 CREATOR 指向 Cocos Creator 3.8.8 可执行文件');
    }
    if (packageDir) {
        const out = path.resolve(root, packageDir);
        const exists = file => fs.existsSync(path.join(out, file));
        add('package-entry', exists('game.js') && exists('game.json') && exists('project.config.json'), '真实构建包必须包含 game.js、game.json、project.config.json');
        if (exists('project.config.json') && exists('game.json')) {
            const pc = JSON.parse(fs.readFileSync(path.join(out,'project.config.json'),'utf8'));
            const game = JSON.parse(fs.readFileSync(path.join(out,'game.json'),'utf8'));
            add('package-appid', validAppId(pc.appid) && pc.appid === expected, '游戏包中的 AppID 必须与正式配置相符');
            add('package-type', pc.compileType === 'game', '开发者工具工程类型必须为 game');
            add('package-portrait', game.deviceOrientation === 'portrait', '游戏包设备方向必须为 portrait');
            add('package-open-data', game.openDataContext === 'openDataContext' && exists('openDataContext/index.js'), '游戏包需包含已登记的好友排行开放数据域');
            // Conservative total-size gate: this project has no configured subpackages.
            const size = dir => fs.readdirSync(dir,{withFileTypes:true}).reduce((n,e)=>n+(e.isDirectory()?size(path.join(dir,e.name)):fs.statSync(path.join(dir,e.name)).size),0);
            const bytes = size(out);
            add('package-size', bytes <= 4*1024*1024, `游戏包总大小 ${bytes} 字节；保守检查不超过 4 MiB，最终以微信工具核算为准`);
        }
    }
    return { checkedAt: new Date().toISOString(), status: checks.some(c=>c.status==='fail')?'blocked':'local-checks-passed', checks, unverified: ['Cocos实际构建及引擎启动','微信开发者工具导入与iOS/Android真机验收','微信后台资质、素材授权、审核状态与发布时间'] };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const args=process.argv.slice(2), value=flag=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1];};
    try {
        const report=inspectWechat({packageDir:value('--package'),appid:value('--appid'),environment:args.includes('--environment')});
        for(const c of report.checks) console.log(`${c.status.toUpperCase()} ${c.id}: ${c.message}`);
        console.log('STATUS '+report.status+'（本地检查通过不代表微信审核通过）');
        const out=value('--report');if(out){fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
        process.exitCode=report.status==='blocked'?1:0;
    } catch(e){console.error('微信预检失败：'+e.message);process.exitCode=1;}
}
