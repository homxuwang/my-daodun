import { chromium } from './node_modules/playwright-core/index.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 747 } });

page.on('console', m => console.log('PAGE:', m.text()));

await page.goto('http://localhost:8090/web/');
await page.waitForTimeout(1000);
await page.waitForFunction(() => window.__game?.state !== 'splash', { timeout: 5000 });

// Check button counts
const info = await page.evaluate(() => {
    const scene = window.__scene;
    let privacyBtnCount = 0;

    function walk(n, path = '') {
        const name = n.name || '';
        if (path.includes('Screen_privacy') && name === 'btn') {
            privacyBtnCount++;
        }
        for (const ch of n.children || []) {
            walk(ch, path + '/' + name);
        }
    }

    walk(scene);

    return {
        state: window.__game.state,
        privacyScreenActive: window.__game.screens.privacy.active,
        privacyBtnCount
    };
});

console.log('Info:', JSON.stringify(info, null, 2));

await browser.close();
