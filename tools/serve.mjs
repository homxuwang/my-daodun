#!/usr/bin/env node
// 本地静态服务器：浏览器预览（http://localhost:8090/web/）
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || 8090);
const MIME = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.map': 'application/json',
};

const ACCESS = process.env.SERVE_ACCESS_LOG;
http.createServer((req, res) => {
    let url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (ACCESS) fs.appendFile(ACCESS, new Date().toISOString() + ' ' + url + '\n', () => {});
    let file = path.join(root, url);
    // 目录 → index.html（/web/ 能直接打开）
    if (url.endsWith('/')) file = path.join(file, 'index.html');
    else if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('404 ' + url); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
    });
}).listen(port, () => console.log(`刀盾闯关 → http://localhost:${port}/web/`));
