import { chromium } from './node_modules/playwright-core/index.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 747 } });

page.on('console', m => console.log('PAGE:', m.text()));
page.on('pageerror', e => console.error('ERROR:', e));

await page.goto('http://localhost:8090/web/');
await page.waitForTimeout(2000);

// Get layout info
const layout = await page.evaluate(() => {
    const root = window.__game;
    return {
        bottom: root.bottom,
        agreeY: root.bottom + 120,  // 同意 button
        menuBtnY: root.bottom + 120 + 400  // 开始游戏 button (btnTop)
    };
});

console.log('Layout:', layout);

// 1. Skip splash (click anywhere)
console.log('1. Skip splash...');
await page.screenshot({ path: '/tmp/v3-splash.png' });
await page.mouse.click(210, 373);
await page.waitForTimeout(500);

let state = await page.evaluate(() => window.__game?.state);
console.log(`After splash skip: state=${state}`);

// 2. Privacy - click 同意
console.log('2. Privacy - click 同意...');
await page.screenshot({ path: '/tmp/v3-privacy.png' });
const agreeClientY = (640 - layout.agreeY) / 1280 * 747;
console.log(`Clicking 同意 at client (297.5, ${agreeClientY})`);
await page.mouse.click(297.5, agreeClientY);
await page.waitForTimeout(1000);

state = await page.evaluate(() => window.__game?.state);
console.log(`After agree: state=${state}`);

// 3. Menu - click 开始游戏
console.log('3. Menu - click 开始游戏...');
await page.screenshot({ path: '/tmp/v3-menu.png' });
const menuBtnClientY = (640 - layout.menuBtnY) / 1280 * 747;
console.log(`Clicking 开始游戏 at client (210, ${menuBtnClientY})`);
await page.mouse.click(210, menuBtnClientY);
await page.waitForTimeout(1500);

state = await page.evaluate(() => window.__game?.state);
console.log(`After start game: state=${state}`);

// 4. Battle - move joystick
console.log('4. Battle - joystick for 5s...');
await page.screenshot({ path: '/tmp/v3-battle-start.png' });
await page.mouse.move(100, 600);
await page.mouse.down();
await page.waitForTimeout(5000);
await page.mouse.up();

await page.screenshot({ path: '/tmp/v3-battle-end.png' });

const final = await page.evaluate(() => ({
    state: window.__game?.state,
    time: window.__game?.battle?.time,
    kills: window.__game?.battle?.kills,
    level: window.__game?.battle?.level
}));

console.log(`Final: state=${final.state} time=${final.time?.toFixed(2)} kills=${final.kills} level=${final.level}`);

await browser.close();
process.exit(final.state === 'play' && final.time > 0 ? 0 : 1);
