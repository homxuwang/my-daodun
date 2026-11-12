import { chromium } from './node_modules/playwright-core/index.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 747 } });

page.on('console', m => console.log('PAGE:', m.text()));

await page.goto('http://localhost:8090/web/');
await page.waitForTimeout(2000);

// Check available globals
const globals = await page.evaluate(() => {
    return Object.keys(window).filter(k =>
        k.startsWith('__') || ['input', 'game', 'director', 'renderer'].includes(k)
    );
});

console.log('Available globals:', globals);

// Check if buttons exist
const buttons = await page.evaluate(() => {
    const scene = window.__scene;
    const buttons = [];

    function walk(n, path = '') {
        const name = n.name || 'unnamed';
        if (name.includes('同意') || name.includes('不同意') || name.includes('开始')) {
            const pos = n._position;
            const comps = n._components?.map(c => c.constructor.name) || [];
            buttons.push({
                name,
                path: path + '/' + name,
                pos: { x: pos.x, y: pos.y },
                components: comps,
                active: n.active,
                hasListeners: n.listenerCount ? n.listenerCount('touch-start') : 'no method'
            });
        }

        if (n.children) {
            for (const ch of n.children) {
                walk(ch, path + '/' + name);
            }
        }
    }

    walk(scene, '');
    return buttons;
});

console.log('\nButtons found:', JSON.stringify(buttons, null, 2));

await browser.close();
