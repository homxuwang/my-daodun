#!/usr/bin/env node
// Import the complete CADPA 12+ source unmodified in composition and aspect ratio.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'tools/art/review/cadpa-12-source.png');
const b=await chromium.launch({executablePath:process.env.CHROME_BIN||'/home/dev-user/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
let pixels;
try {const p=await b.newPage();pixels=await p.evaluate(async url=>{const image=new Image();image.src=url;await image.decode();if(image.width!==810||image.height!==1038)throw Error('Unexpected source dimensions');const c=document.createElement('canvas');c.width=135;c.height=173;const ctx=c.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,c.width,c.height);return [...ctx.getImageData(0,0,c.width,c.height).data];},'data:image/png;base64,'+fs.readFileSync(source).toString('base64'));}finally{await b.close();}
const palette=[],indices=[],map=new Map();
for(let i=0;i<pixels.length;i+=4){const color=((pixels[i+3]<<24)|(pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2])>>>0;if(!map.has(color)){map.set(color,palette.length);palette.push(color);}indices.push(map.get(color));}
const runs=[];for(let i=0;i<indices.length;){let end=i+1;while(end<indices.length&&indices[end]===indices[i])end++;runs.push(end-i,indices[i]);i=end;}
fs.writeFileSync(path.join(root,'assets/scripts/ReviewBadge.ts'),'// Generated from the complete CADPA 12+ source; do not redraw or recolor.\nexport const REVIEW_BADGE_12 = '+JSON.stringify({rating:'12+',w:135,h:173,palette,runs})+';\n');
console.log('Imported complete 12+ mark: 135×173, original proportions.');
