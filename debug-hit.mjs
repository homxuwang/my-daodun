import { chromium } from './node_modules/playwright-core/index.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 747 } });

page.on('console', m => console.log('PAGE:', m.text()));

await page.goto('http://localhost:8090/web/');
await page.waitForTimeout(2000);

// Inject hit test debug
await page.evaluate(() => {
    const orig = window.input.emit;
    window.input.emit = function(type, e) {
        if (type.includes('TOUCH')) {
            console.log(`[INPUT] ${type} at (${e.getLocation().x}, ${e.getLocation().y})`);

            // Manually run hit test to see what gets hit
            const scene = window.__scene;
            function testHit(n, x, y, depth = 0) {
                if (!n.active) return null;

                const ut = n.getComponent(Object.getPrototypeOf(Object.getPrototypeOf(n)).constructor);
                if (ut?.width && ut?.height) {
                    let wx = n._position.x, wy = n._position.y;
                    let p = n.parent;
                    while (p) {
                        wx += p._position.x;
                        wy += p._position.y;
                        p = p.parent;
                    }

                    const x0 = wx - ut.width * ut._anchorPoint.x;
                    const y0 = wy - ut.height * ut._anchorPoint.y;
                    const x1 = x0 + ut.width;
                    const y1 = y0 + ut.height;

                    const hit = x >= x0 && x <= x1 && y >= y0 && y <= y1;
                    if (hit || n.name?.includes('同意') || n.name?.includes('开始')) {
                        console.log(`  ${'  '.repeat(depth)}[${hit?'HIT':'miss'}] ${n.name} at world (${wx}, ${wy}) size ${ut.width}x${ut.height} anchor (${ut._anchorPoint.x}, ${ut._anchorPoint.y}) → AABB (${x0}, ${y0})-(${x1}, ${y1}) listeners=${n.listenerCount?.('touch-start')||0}`);
                    }
                }

                for (let i = n.children.length - 1; i >= 0; i--) {
                    const r = testHit(n.children[i], x, y, depth + 1);
                    if (r) return r;
                }

                return null;
            }

            const loc = e.getLocation();
            testHit(scene, loc.x, loc.y);
        }
        return orig.call(this, type, e);
    };

    console.log('[DEBUG] Input interceptor installed');
});

await page.waitForTimeout(500);

// Get button info
const info = await page.evaluate(() => ({
    state: window.__game?.state,
    bottom: window.__game?.bottom
}));

console.log('\nInitial state:', info.state);

// Click where we think 同意 is
const agreeY = info.bottom + 120;
const clientY = (640 - agreeY) / 1280 * 747;
console.log(`\nClicking at client (297.5, ${clientY}) = design (150, ${agreeY})\n`);

await page.mouse.click(297.5, clientY);
await page.waitForTimeout(1000);

const newState = await page.evaluate(() => window.__game?.state);
console.log('\nNew state:', newState);

await browser.close();
