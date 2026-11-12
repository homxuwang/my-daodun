import { chromium } from './node_modules/playwright-core/index.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 747 } });

page.on('console', m => console.log('PAGE:', m.text()));

await page.goto('http://localhost:8090/web/');
await page.waitForTimeout(3000);

// Check initial state
const initial = await page.evaluate(() => ({
    state: window.__game?.state,
    privacyOk: window.__game?.constructor?.name === 'GameRoot' ?
        (window.Save?.data?.privacyOk || false) : null
}));

console.log('Initial:', initial);

// If state is 'splash', the game auto-transitions. Wait and check again.
await page.waitForTimeout(2000);

const afterWait = await page.evaluate(() => window.__game?.state);
console.log('After 2s wait:', afterWait);

await page.screenshot({ path: '/tmp/state-check.png' });
await browser.close();
