import { chromium } from './node_modules/playwright-core/index.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 747 } });

page.on('console', m => console.log('PAGE:', m.text()));

await page.goto('http://localhost:8090/web/');
await page.waitForTimeout(1000);
await page.waitForFunction(() => window.__game?.state !== 'splash', { timeout: 5000 });

console.log('Installing click tracker...');

// Install click tracker
await page.evaluate(() => {
    window.clickLog = [];
    const scene = window.__scene;

    function walk(n) {
        const origOn = n.on.bind(n);
        n.on = function(evt, cb, target) {
            if (evt === 'touch-start') {
                const wrapped = function(e) {
                    window.clickLog.push({ node: n.name, evt, x: e.getLocation().x, y: e.getLocation().y });
                    return cb.call(this, e);
                };
                return origOn(evt, wrapped, target);
            }
            return origOn(evt, cb, target);
        };

        for (const ch of n.children || []) {
            walk(ch);
        }
    }

    walk(scene);
    console.log('[TRACKER] Installed');
});

await page.waitForTimeout(500);

// Click where we think 同意 is
const layout = await page.evaluate(() => ({
    bottom: window.__game.bottom,
    agreeY: window.__game.bottom + 120
}));

const clientY = (640 - layout.agreeY) / 1280 * 747;
console.log(`\nClicking at client (297.5, ${clientY}) = design (150, ${layout.agreeY})\n`);

await page.mouse.click(297.5, clientY);
await page.waitForTimeout(500);

const result = await page.evaluate(() => ({
    state: window.__game.state,
    clickLog: window.clickLog
}));

console.log('Result:', JSON.stringify(result, null, 2));

await browser.close();
