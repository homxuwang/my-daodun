import { chromium } from './node_modules/playwright-core/index.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 747 } });

page.on('console', m => console.log('PAGE:', m.text()));
page.on('pageerror', e => console.error('ERROR:', e));

await page.goto('http://localhost:8090/web/');
await page.waitForTimeout(2000);

// Get button info from page
const info = await page.evaluate(() => {
    const root = window.__game;
    if (!root) return { error: 'no root' };

    const scene = window.__scene;
    const buttons = [];

    function walk(n, path = '') {
        const name = n.name || 'unnamed';
        const pos = { x: n._position.x, y: n._position.y };
        const ut = n.getComponent(window.__game.constructor.name === 'GameRoot' ? Object.getPrototypeOf(Object.getPrototypeOf(n)).constructor : null);

        if (n._listeners && n._listeners.has('touch-start')) {
            const ut = n._components.find(c => c.constructor.name === 'UITransform');
            buttons.push({
                path: path + '/' + name,
                pos,
                size: ut ? { w: ut.width, h: ut.height } : null,
                listeners: n.listenerCount('touch-start')
            });
        }

        for (const ch of n.children) {
            walk(ch, path + '/' + name);
        }
    }

    walk(scene, '');

    return {
        state: root.state,
        vh: root.vh,
        bottom: root.bottom,
        buttons
    };
});

console.log(JSON.stringify(info, null, 2));

await page.screenshot({ path: '/tmp/debug-privacy.png' });
await browser.close();
