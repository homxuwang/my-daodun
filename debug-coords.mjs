import { chromium } from './node_modules/playwright-core/index.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 747 } });

page.on('console', m => console.log('PAGE:', m.text()));
page.on('pageerror', e => console.error('ERROR:', e));

await page.goto('http://localhost:8090/web/');
await page.waitForTimeout(2000);

// Get root info
const info = await page.evaluate(() => {
    const root = window.__game;
    if (!root) return { error: 'no root' };

    return {
        state: root.state,
        vh: root.vh,
        vw: root.vw,
        bottom: root.bottom,
        safeBottom: root.safeBottom,
        buttonY: root.bottom + 120
    };
});

console.log('Root info:', JSON.stringify(info, null, 2));

// Calculate client coordinates for the button
const clientX = 297.5; // (360 + 150) / 720 * 420
const buttonY = info.buttonY;
const clientY = (640 - buttonY) / 1280 * 747; // Convert from world Y to client Y

console.log(`Button at design (150, ${buttonY}) → client (${clientX}, ${clientY})`);

await page.screenshot({ path: '/tmp/debug-privacy.png' });
await page.mouse.click(clientX, clientY);
await page.waitForTimeout(1000);

const state2 = await page.evaluate(() => window.__game?.state);
console.log('State after click:', state2);
await page.screenshot({ path: '/tmp/debug-after-click.png' });

await browser.close();
