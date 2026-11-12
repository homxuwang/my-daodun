import { chromium } from './node_modules/playwright-core/index.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 747 } });

page.on('console', m => console.log('PAGE:', m.text()));
page.on('pageerror', e => console.error('ERROR:', e));

await page.goto('http://localhost:8090/web/');
await page.waitForTimeout(2000);

// Privacy screen - click 同意 at client (297.5, 677)
console.log('Privacy screen...');
await page.screenshot({ path: '/tmp/tour-privacy.png' });
const state1 = await page.evaluate(() => window.__game?.state);
console.log(`State before agree: ${state1}`);

await page.mouse.click(297.5, 677);
await page.waitForTimeout(1000);

// Check state after agree
const state2 = await page.evaluate(() => window.__game?.state);
console.log(`State after agree: ${state2}`);
await page.screenshot({ path: '/tmp/tour-splash.png' });

// Skip splash - click center
await page.mouse.click(210, 373);
await page.waitForTimeout(500);

const state3 = await page.evaluate(() => window.__game?.state);
console.log(`State after splash: ${state3}`);
await page.screenshot({ path: '/tmp/tour-menu.png' });

// Menu - click 开始游戏 at client (210, 443)
await page.mouse.click(210, 443);
await page.waitForTimeout(1000);

const state4 = await page.evaluate(() => window.__game?.state);
console.log(`State after start: ${state4}`);
await page.screenshot({ path: '/tmp/tour-battle-start.png' });

// Battle - move joystick for 5s
await page.mouse.move(100, 600);
await page.mouse.down();
await page.waitForTimeout(5000);
await page.mouse.up();

await page.screenshot({ path: '/tmp/tour-battle-end.png' });

const time = await page.evaluate(() => window.__game?.battle?.time);
const kills = await page.evaluate(() => window.__game?.battle?.kills);

console.log(`Final: state=${state4} time=${time?.toFixed(2)} kills=${kills}`);

await browser.close();
process.exit(state4 === 'play' && time > 0 ? 0 : 1);
