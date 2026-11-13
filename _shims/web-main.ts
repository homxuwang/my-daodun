// 浏览器预览入口：创建 canvas、桥接输入事件、驱动 GameRoot 与 2D 渲染器。
// 真机（Cocos 场景）走 GameRoot 底部的自动挂载逻辑，不经过本文件。
import { Canvas, Color, EventKeyboard, EventTouch, Game, Input, Node, clientToDesign, director, Director, game, input, renderer } from 'cc';
import { GameRoot } from '../assets/scripts/GameRoot';

const DESIGN_W = 720;
const DESIGN_H = 1280;

function boot() {
    const app = document.getElementById('app') || document.body;
    const canvas = document.createElement('canvas');
    canvas.id = 'game';
    app.appendChild(canvas);
    renderer.attach(canvas);

    const layout = () => {
        const vw = window.innerWidth, vh = window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const cssW = Math.min(vw, vh * (DESIGN_W / DESIGN_H));
        const cssH = cssW * (DESIGN_H / DESIGN_W);
        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        renderer.scale = canvas.width / DESIGN_W;
        renderer.designW = DESIGN_W;
        renderer.designH = DESIGN_H;
    };
    layout();
    window.addEventListener('resize', layout);

    // 触摸 → 设计分辨率坐标（左下原点、y 向上，与 Cocos UI 一致）
    const toDesign = (clientX: number, clientY: number) => clientToDesign(clientX, clientY, canvas.getBoundingClientRect(), DESIGN_W, DESIGN_H);
    let currentTouch: EventTouch | null = null;
    const fire = (type: string, clientX: number, clientY: number) => {
        const { x, y } = toDesign(clientX, clientY);
        if (!currentTouch || type === 'touch-start') {
            currentTouch = new EventTouch(x, y);
        } else {
            (currentTouch as any)._x = x;
            (currentTouch as any)._y = y;
        }
        input.emit(type, currentTouch);
        if (type === 'touch-end' || type === 'touch-cancel') {
            currentTouch = null;
        }
    };
    canvas.addEventListener('pointerdown', (e) => { fire('touch-start', e.clientX, e.clientY); });
    canvas.addEventListener('pointermove', (e) => fire('touch-move', e.clientX, e.clientY));
    canvas.addEventListener('pointerup', (e) => fire('touch-end', e.clientX, e.clientY));
    canvas.addEventListener('pointercancel', (e) => fire('touch-cancel', e.clientX, e.clientY));
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => input.emit(Input.EventType.KEY_DOWN, new EventKeyboard(e.keyCode)));
    window.addEventListener('keyup', (e) => input.emit(Input.EventType.KEY_UP, new EventKeyboard(e.keyCode)));
    const hide = () => game.emit(Game.EVENT_HIDE);
    const show = () => game.emit(Game.EVENT_SHOW);
    window.addEventListener('blur', hide);
    window.addEventListener('focus', show);
    document.addEventListener('visibilitychange', () => (document.hidden ? hide() : show()));

    // 场景等价物：Scene → Canvas 节点 → GameRoot
    const scene = new Node('Scene');
    (globalThis as any).__scene = scene;
    const canvasHost = new Node('Canvas');
    canvasHost.setPosition(360, 640, 0); // Cocos 世界坐标中心与屏幕中心对齐
    scene.addChild(canvasHost);

    // 触发 GameRoot 的兜底挂载（EVENT_AFTER_SCENE_LAUNCH）
    const prevGetScene = (director as any).getScene;
    (director as any).getScene = () => scene;
    // getComponentInChildren(GameRoot) 在节点树上查找：Canvas 节点上没有 GameRoot → 会 addComponent
    // 但 shim 的 scene 需要有 getComponentInChildren：Node 基类已有
    // Canvas 组件：挂一个让兜底逻辑找到 canvas.node
    canvasHost.addComponent(Canvas);
    director.emit(Director.EVENT_AFTER_SCENE_LAUNCH);
    (director as any).getScene = prevGetScene || (() => scene);

    const root: any = canvasHost.getComponentInChildren(GameRoot) || (globalThis as any).__game;
    if (!root) {
        console.warn('[web] GameRoot 挂载失败，手动挂载');
    }
    (globalThis as any).__game = root;

    // 主循环：update + render
    let last = performance.now();
    const loop = (now: number) => {
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (root && typeof root.update === 'function') root.update(dt);
        renderer.render(scene);
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    console.log('[web] 我的刀盾 已启动');
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
}
