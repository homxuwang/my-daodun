import { chromium } from './node_modules/playwright-core/index.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 747 } });

page.on('console', m => console.log('PAGE:', m.text()));
page.on('pageerror', e => console.error('ERROR:', e));

await page.goto('http://localhost:8090/web/');

// Wait for GameRoot to load
await page.waitForTimeout(1000);

// Wait for splash auto-transition (2.5s + buffer)
console.log('Waiting for splash auto-transition...');
await page.waitForFunction(() => window.__game?.state !== 'splash', { timeout: 5000 });

const state1 = await page.evaluate(() => window.__game?.state);
console.log(`After splash: state=${state1}`);

// Get layout
const layout = await page.evaluate(() => {
    const root = window.__game;
    return {
        bottom: root.bottom,
        agreeY: root.bottom + 120,
        menuBtnY: root.bottom + 120 + 400
    };
});

if (state1 === 'privacy') {
    // 1. Privacy - click 同意
    console.log('\n1. Privacy screen - clicking 同意...');
    await page.screenshot({ path: '/tmp/final-privacy.png' });
    const agreeClientY = (640 - layout.agreeY) / 1280 * 747;
    console.log(`   Button at design (150, ${layout.agreeY}) → client (297.5, ${agreeClientY})`);
    await page.mouse.click(297.5, agreeClientY);
    await page.waitForTimeout(1000);

    const state2 = await page.evaluate(() => window.__game?.state);
    console.log(`   After agree: state=${state2}`);
}

// 2. Menu - click 开始游戏
console.log('\n2. Menu - clicking 开始游戏...');
await page.screenshot({ path: '/tmp/final-menu.png' });
const menuBtnClientY = (640 - layout.menuBtnY) / 1280 * 747;
console.log(`   Button at design (0, ${layout.menuBtnY}) → client (210, ${menuBtnClientY})`);
await page.mouse.click(210, menuBtnClientY);
await page.waitForTimeout(2000);

const state3 = await page.evaluate(() => window.__game?.state);
console.log(`   After start: state=${state3}`);

// 3. Battle - move joystick
console.log('\n3. Battle - moving joystick for 5s...');
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
    level: window.__game?.battle?.level
}));

console.log(`\n✓ Final state: ${final.state}`);
console.log(`✓ Battle time: ${final.time?.toFixed(2)}s`);
console.log(`✓ Kills: ${final.kills}`);
console.log(`✓ Level: ${final.level}`);

await browser.close();
process.exit(final.state === 'play' && final.time > 4 ? 0 : 1);
