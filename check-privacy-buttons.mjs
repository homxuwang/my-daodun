import { chromium } from './node_modules/playwright-core/index.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 747 } });

page.on('console', m => console.log('PAGE:', m.text()));

await page.goto('http://localhost:8090/web/');
await page.waitForTimeout(1000);
await page.waitForFunction(() => window.__game?.state !== 'splash', { timeout: 5000 });

// Find the privacy buttons and get their world positions
const buttons = await page.evaluate(() => {
    const ui = window.__scene.children[0].children.find(n => n.name === 'UI');
    const privacyScreen = ui.children.find(n => n.name === 'Screen_privacy');

    const result = [];

    function getWorldPos(n) {
        let x = n._position.x;
        let y = n._position.y;
        let p = n.parent;
        while (p) {
            x += p._position.x;
            y += p._position.y;
            p = p.parent;
        }
        return { x, y };
    }

    for (const child of privacyScreen.children) {
        if (child.name === 'btn') {
            const worldPos = getWorldPos(child);
            const ut = child._components.find(c => c.constructor.name === 'UITransform');
            const label = child.children.find(c => c._components.some(comp => comp.constructor.name === 'Label'));
            const labelText = label?._components.find(c => c.constructor.name === 'Label')?.string || '';

            result.push({
                text: labelText,
                localPos: { x: child._position.x, y: child._position.y },
                worldPos,
                size: { w: ut.width, h: ut.height },
                anchor: { x: ut._anchorPoint.x, y: ut._anchorPoint.y },
                active: child.active
            });
        }
    }

    return result;
});

console.log('Privacy buttons:', JSON.stringify(buttons, null, 2));

await browser.close();
