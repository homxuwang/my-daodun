import { chromium } from './node_modules/playwright-core/index.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 747 } });

page.on('console', m => console.log('PAGE:', m.text()));

await page.goto('http://localhost:8090/web/');
await page.waitForTimeout(1000);

// Wait for splash to end
await page.waitForFunction(() => window.__game?.state !== 'splash', { timeout: 5000 });

// Count nodes and check for buttons
const sceneInfo = await page.evaluate(() => {
    const scene = window.__scene;
    let nodeCount = 0;
    const buttons = [];

    function walk(n, path = '', depth = 0) {
        nodeCount++;
        const name = n.name || 'unnamed';
        const fullPath = path + '/' + name;

        // Check if this node has touch listeners
        const hasTouch = n._listeners?.has('touch-start') || false;
        const listenerCount = n.listenerCount ? n.listenerCount('touch-start') : 0;

        // Get UITransform info
        let utInfo = null;
        const ut = n._components?.find(c => c.constructor.name === 'UITransform');
        if (ut) {
            utInfo = {
                width: ut.width,
                height: ut.height,
                anchor: { x: ut._anchorPoint?.x, y: ut._anchorPoint?.y }
            };
        }

        if (hasTouch || listenerCount > 0 || name.includes('同意') || name.includes('不同意') || name.includes('开始')) {
            buttons.push({
                path: fullPath,
                pos: { x: n._position?.x, y: n._position?.y },
                active: n.active,
                hasTouch,
                listenerCount,
                ut: utInfo,
                componentCount: n._components?.length || 0
            });
        }

        for (const ch of n.children || []) {
            walk(ch, fullPath, depth + 1);
        }
    }

    walk(scene, '');

    return {
        state: window.__game?.state,
        nodeCount,
        buttons
    };
});

console.log('Scene info:', JSON.stringify(sceneInfo, null, 2));

await browser.close();
