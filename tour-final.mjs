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
        state: root.state,
        bottom: root.bottom,
        agreeY: root.bottom + 120,
        menuBtnY: root.bottom + 120 + 400
    };
});

console.log('Initial layout:', layout);

// 1. Privacy - click 同意
console.log('1. Privacy screen - clicking 同意...');
await page.screenshot({ path: '/tmp/final-privacy.png' });
const agreeClientY = (640 - layout.agreeY) / 1280 * 747;
await page.mouse.click(297.5, agreeClientY);
await page.waitForTimeout(1500);

let state = await page.evaluate(() => window.__game?.state);
console.log(`After agree: state=${state}`);

if (state === 'splash') {
    console.log('2. Splash screen - clicking to skip...');
    await page.screenshot({ path: '/tmp/final-splash.png' });
    await page.mouse.click(210, 373);
    await page.waitForTimeout(1000);
    state = await page.evaluate(() => window.__game?.state);
    console.log(`After splash: state=${state}`);
}

// 3. Menu - click 开始游戏
console.log('3. Menu - clicking 开始游戏...');
await page.screenshot({ path: '/tmp/final-menu.png' });
const menuBtnClientY = (640 - layout.menuBtnY) / 1280 * 747;
await page.mouse.click(210, menuBtnClientY);
await page.waitForTimeout(2000);

state = await page.evaluate(() => window.__game?.state);
console.log(`After start: state=${state}`);

// 4. Battle - move joystick
console.log('4. Battle - moving joystick...');
await page.screenshot({ path: '/tmp/final-battle-start.png' });
await page.mouse.move(100, 600);
await page.mouse.down();
await page.waitForTimeout(5000);
await page.mouse.up();
await page.waitForTimeout(500);

await page.screenshot({ path: '/tmp/final-battle-end.png' });

const final = await page.evaluate(() => ({
    state: window.__game?.state,
    time: window.__game?.battle?.time,
    kills: window.__game?.battle?.kills,
    level: window.__game?.battle?.level,
    xp: window.__game?.battle?.xp
}));

console.log(`\nFinal state: ${final.state}`);
console.log(`Battle time: ${final.time?.toFixed(2)}s`);
console.log(`Kills: ${final.kills}`);
console.log(`Level: ${final.level}`);

await browser.close();
process.exit(final.state === 'play' && final.time > 4 ? 0 : 1);
