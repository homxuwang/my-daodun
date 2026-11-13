#!/usr/bin/env node
// Bake the generated source sheet into the existing synchronous pixel atlas.
// The PNG is an authoring asset only; browsers and Cocos use the same TS data.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.argv[2] || path.join(root, 'tools/art/meme-source.png'));
const ids = ['mage', 'rogue', 'knight', 'nun', 'pyro', 'bomber', 'sage', 'druid', 'prism', 'fu', 'santa'];
const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || '/home/dev-user/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome',
    headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
let sprites;
try {
    const page = await browser.newPage();
    sprites = await page.evaluate(async ({ url, ids }) => {
        const image = new Image(); image.src = url; await image.decode();
        const source = document.createElement('canvas');
        source.width = image.width; source.height = image.height;
        const ctx = source.getContext('2d'); ctx.drawImage(image, 0, 0);
        const rgba = ctx.getImageData(0, 0, source.width, source.height).data;
        return ids.map((id, i) => {
            const x0 = Math.round(i % 4 * image.width / 4);
            const y0 = Math.round(Math.floor(i / 4) * image.height / 3);
            const x1 = Math.round((i % 4 + 1) * image.width / 4);
            const y1 = Math.round((Math.floor(i / 4) + 1) * image.height / 3);
            let left = x1, top = y1, right = x0, bottom = y0;
            for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
                if (rgba[(y * image.width + x) * 4 + 3] < 190) continue;
                left = Math.min(left, x); right = Math.max(right, x);
                top = Math.min(top, y); bottom = Math.max(bottom, y);
            }
            if (right <= left || bottom <= top) throw Error(`Empty source cell: ${id}`);
            const w = 48, h = 64, sw = right - left + 1, sh = bottom - top + 1;
            const scale = Math.min((w - 4) / sw, (h - 4) / sh);
            const dw = Math.round(sw * scale), dh = Math.round(sh * scale);
            const target = document.createElement('canvas'); target.width = w; target.height = h;
            const t = target.getContext('2d');
            t.imageSmoothingEnabled = true; t.imageSmoothingQuality = 'high';
            t.drawImage(image, left, top, sw, sh, Math.round((w - dw) / 2), h - 2 - dh, dw, dh);
            return { id, w, h, rgba: Array.from(t.getImageData(0, 0, w, h).data) };
        });
    }, { url: 'data:image/png;base64,' + fs.readFileSync(source).toString('base64'), ids });
} finally { await browser.close(); }

// Weighted median-cut: retain fur shading and expressive facial colors in 128 colors.
function encode(sprite) {
    const histogram = new Map();
    for (let i = 0; i < sprite.rgba.length; i += 4) {
        if (sprite.rgba[i + 3] < 128) continue;
        const rgb = sprite.rgba.slice(i, i + 3).map(v => Math.round(v / 8) * 8).map(v => Math.min(255, v));
        const key = rgb.join(','); const entry = histogram.get(key);
        if (entry) entry.weight++; else histogram.set(key, { rgb, weight: 1 });
    }
    let boxes = [[...histogram.values()]];
    const range = box => [0, 1, 2].map(c => Math.max(...box.map(v => v.rgb[c])) - Math.min(...box.map(v => v.rgb[c])));
    while (boxes.length < 128) {
        let best = -1, score = 0;
        boxes.forEach((box, i) => { const s = Math.max(...range(box)) * Math.sqrt(box.reduce((n,v) => n+v.weight,0)); if (box.length > 1 && s > score) { best = i; score = s; } });
        if (best < 0) break;
        const box = boxes.splice(best, 1)[0], ranges = range(box), channel = ranges.indexOf(Math.max(...ranges));
        box.sort((a,b) => a.rgb[channel] - b.rgb[channel]);
        const total = box.reduce((n,v) => n+v.weight,0); let weight = 0, split = 1;
        for (; split < box.length; split++) { weight += box[split - 1].weight; if (weight >= total / 2) break; }
        split = Math.min(split, box.length - 1); boxes.push(box.slice(0,split), box.slice(split));
    }
    const colors = boxes.map(box => { const total=box.reduce((n,v)=>n+v.weight,0); return [0,1,2].map(c=>Math.round(box.reduce((n,v)=>n+v.rgb[c]*v.weight,0)/total)); });
    const palette = [0, ...colors.map(([r,g,b]) => r<<16|g<<8|b)];
    const pixels = [], memo = new Map();
    for (let i = 0; i < sprite.rgba.length; i += 4) {
        if (sprite.rgba[i+3] < 128) { pixels.push(0); continue; }
        const rgb = sprite.rgba.slice(i,i+3), key=rgb.join(',');
        let index=memo.get(key);
        if (index===undefined) {
            let distance=Infinity; index=0;
            colors.forEach((c,n)=>{const d=c.reduce((sum,v,j)=>sum+(v-rgb[j])**2,0);if(d<distance){distance=d;index=n+1;}});
            memo.set(key,index);
        }
        pixels.push(index);
    }
    const runs=[];
    for (let i=0;i<pixels.length;) {let end=i+1;while(end<pixels.length&&pixels[end]===pixels[i])end++;runs.push(end-i,pixels[i]);i=end;}
    return {w:sprite.w,h:sprite.h,palette,runs};
}
const data = Object.fromEntries(sprites.map(sprite=>[sprite.id,encode(sprite)]));
const output = `// Generated by tools/import-meme-art.mjs from tools/art/meme-source.png.\n// Palette index 0 is transparent; runs are [count, paletteIndex, ...].\nexport interface MemeSpriteData { w: number; h: number; palette: number[]; runs: number[]; }\nexport const MEME_ART: Record<string, MemeSpriteData> = ${JSON.stringify(data)};\n`;
fs.writeFileSync(path.join(root,'assets/scripts/MemeArt.ts'), output);
console.log(`Baked ${sprites.length} characters, 48×64, ≤128 colors + transparency each; ${(output.length/1024).toFixed(1)} KiB TS.`);
