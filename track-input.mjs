import { chromium } from './node_modules/playwright-core/index.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 747 } });

page.on('console', m => console.log('PAGE:', m.text()));

await page.goto('http://localhost:8090/web/');
await page.waitForTimeout(1000);
await page.waitForFunction(() => window.__game?.state !== 'splash', { timeout: 5000 });

// Patch input.emit to log
await page.evaluate(() => {
    const cc = Object.values(window).find(v => v?.input)?.__proto__.constructor;
    const origEmit = window.input.emit;
    window.input.emit = function(...args) {
        console.log('[INPUT.EMIT]', args[0], args[1]?.getLocation?.());
        return origEmit.apply(this, args);
    };
    console.log('[PATCH] input.emit patched');
});

await page.waitForTimeout(500);

// Click
const layout = await page.evaluate(() => ({
    agreeY: window.__game.bottom + 120
}));

const clientY = (640 - layout.agreeY) / 1280 * 747;
console.log(`\nClicking at client (297.5, ${clientY})\n`);

await page.mouse.click(297.5, clientY);
await page.waitForTimeout(1000);

const state = await page.evaluate(() => window.__game.state);
console.log('\nState:', state);

await browser.close();
