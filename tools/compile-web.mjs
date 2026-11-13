#!/usr/bin/env node
// 把 assets/scripts（TS，与 Cocos 构建同源）+ _shims（cc/cc-env 替身）编译成 web/js 下的 ES Module。
// 源文件保持无后缀相对导入（与 Cocos 兼容），由 tsc 的 rewriteRelativeImportExtensions 补 .js 后缀。
// 依赖：npm install（typescript）
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'web/js');
fs.mkdirSync(out, { recursive: true });

const tsconfig = {
    compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'node',
        outDir: 'web/js',
        rootDir: '.',
        strict: false,
        skipLibCheck: true,
        experimentalDecorators: true,
        rewriteRelativeImportExtensions: true,
        types: [],
        baseUrl: '.',
        paths: { 'cc': ['_shims/cc.ts'], 'cc/env': ['_shims/cc-env.ts'] },
        lib: ['ES2020', 'DOM'],
    },
    include: ['assets/scripts/**/*.ts', '_shims/web-main.ts', '_shims/cc.ts', '_shims/cc-env.ts'],
    exclude: ['node_modules', 'build', 'library', 'temp', 'check-out', 'tools'],
};
const cfgPath = path.join(root, 'tsconfig.web.json');
fs.writeFileSync(cfgPath, JSON.stringify(tsconfig, null, 2));

const tsc = path.join(root, 'node_modules/typescript/bin/tsc');
if (!fs.existsSync(tsc)) { console.error('缺少 typescript：请先 npm install'); process.exit(1); }
execFileSync(process.execPath, [tsc, '-p', cfgPath], { stdio: 'inherit', cwd: root });


// 2) 产物后处理：给相对导入补 .js（浏览器 ESM 必须；rewriteRelativeImportExtensions 在 module=ESNext 下不改写裸相对路径）
function walk(d) {
    const out = [];
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        const fp = path.join(d, f.name);
        if (f.isDirectory()) out.push(...walk(fp));
        else if (f.name.endsWith('.js')) out.push(fp);
    }
    return out;
}
let rewritten = 0;
for (const file of walk(out)) {
    const src = fs.readFileSync(file, 'utf-8');
    const fixed = src.replace(/(from\s+['"])(\.\.?\/[^'"]+?)(['"])/g, (m, a, spec, b) => {
        if (/\.(js|mjs|json|css)$/.test(spec)) return m;
        rewritten++;
        return a + spec + '.js' + b;
    });
    if (fixed !== src) fs.writeFileSync(file, fixed);
}
console.log(`相对导入补 .js：${rewritten} 处`);

// 与 index.html 的 importmap 对齐：'cc' → /web/js/cc.js，'cc/env' → /web/js/cc-env.js
fs.copyFileSync(path.join(out, '_shims/cc.js'), path.join(out, 'cc.js'));
fs.copyFileSync(path.join(out, '_shims/cc-env.js'), path.join(out, 'cc-env.js'));
fs.copyFileSync(path.join(root, '_shims/web-index.html'), path.join(root, 'web/index.html'));
console.log('✔ 编译完成 → web/js');
