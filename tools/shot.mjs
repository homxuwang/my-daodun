#!/usr/bin/env node
// 截图工具：node tools/shot.mjs <url> <out.png> [waitMs]
import { chromium } from 'playwright-core';
const exe = process.env.CHROME_BIN || '/home/dev-user/.cache/ms-playwright/chromium-1248/chrome-linux-arm64/chrome';
const url = process.argv[2] || 'http://localhost:8090/web/';
const out = process.argv[3] || '/tmp/shot.png';
const waitMs = Number(process.argv[4] || 5000);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 420, height: 747 } });
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
page.on('response', r => { if (r.status() >= 400) logs.push(`[HTTP ${r.status()}] ${r.url()}`); });
await page.goto(url, { waitUntil: 'load', timeout: 15000 }).catch(e => logs.push('[goto] ' + e.message));
await page.waitForTimeout(waitMs);
const err = await page.evaluate(() => document.getElementById('err')?.textContent || '');
await page.screenshot({ path: out });
await browser.close();
if (logs.length) console.log(logs.slice(0, 60).join('\n'));
if (err) console.log('ERR:', err.slice(0, 2000));
console.log('shot:', out);
