// 浏览器/Node 用的最小 cc 实现：数据结构 + 节点树 + 事件 + 一个 2D 画布渲染器。
// Cocos 构建不包含本文件（assets/scripts 只 import 'cc'，由 Creator 解析）。
// 渲染器把 Sprite/Label 画到 <canvas>，逻辑层（GameRoot/Battle）无需改动。

export type Vec2Like = { x: number; y: number };

export class Vec2 { x = 0; y = 0; constructor(x = 0, y = 0) { this.x = x; this.y = y; } }
export class Vec3 {
    x = 0; y = 0; z = 0;
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; return this; }
    clone() { return new Vec3(this.x, this.y, this.z); }
}
export class Color {
    r = 255; g = 255; b = 255; a = 255;
    constructor(r = 255, g = 255, b = 255, a = 255) { this.set(r, g, b, a); }
    set(r = 255, g = 255, b = 255, a = 255) { this.r = r; this.g = g; this.b = b; this.a = a; return this; }
    clone() { return new Color(this.r, this.g, this.b, this.a); }
    static WHITE = new Color(255, 255, 255, 255);
    static BLACK = new Color(0, 0, 0, 255);
    static TRANSPARENT = new Color(0, 0, 0, 0);
}
export class Size { width = 0; height = 0; constructor(w = 0, h = 0) { this.width = w; this.height = h; } }
export class Rect { x = 0; y = 0; width = 0; height = 0; constructor(x = 0, y = 0, w = 0, h = 0) { this.x = x; this.y = y; this.width = w; this.height = h; } }

// ---------------------------------------------------------------- 存储 / 系统
const storage = (() => {
    try {
        const ls = (globalThis as any).localStorage;
        if (ls) return ls;
    } catch { /* 忽略 */ }
    const mem = new Map<string, string>();
    return {
        getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
        setItem: (k: string, v: string) => { mem.set(k, v); },
        removeItem: (k: string) => { mem.delete(k); },
    };
})();

export const sys = {
    localStorage: storage,
    isMobile: true,
    platform: 'browser',
    getSafeAreaRect(): Rect | null {
        const nav = (globalThis as any).navigator as any;
        const inset = nav && nav.safeAreaInsets;
        if (inset) {
            // 浏览器：safeAreaInsets 是 CSS px，y 向下；Cocos 的 Rect y 向上（底部为 0）
            const h = (globalThis as any).innerHeight || 1280;
            return new Rect(inset.left, h - inset.bottom, (globalThis as any).innerWidth - inset.left - inset.right, inset.top + inset.bottom);
        }
        return null;
    },
};

export const ResolutionPolicy = { EXACT_FIT: 0, NO_BORDER: 1, SHOW_ALL: 2, FIXED_HEIGHT: 3, FIXED_WIDTH: 4 };
export const view = {
    designResolution: { width: 720, height: 1280 },
    setDesignResolutionSize(w: number, h: number, _p?: number) { this.designResolution.width = w; this.designResolution.height = h; },
    getVisibleSize() { return new Size(720, 1280); },
    getVisibleSize_() { return new Size(720, 1280); },
};

/** 逻辑坐标（720×1280，左上原点）→ 设计坐标（y 向上）。触摸派发与渲染共用同一约定。 */
export function clientToDesign(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }, designW = 720, designH = 1280) {
    const x = ((clientX - rect.left) / Math.max(1, rect.width)) * designW;
    const y = designH - ((clientY - rect.top) / Math.max(1, rect.height)) * designH;
    return { x, y };
}

export const Layers = { Enum: { UI_2D: 1 << 25, UI_3D: 1 << 26, DEFAULT: 1 << 30, NONE: 0 } };

// ---------------------------------------------------------------- 事件总线
class Emitter {
    private map = new Map<string, Set<(e: any) => void>>();
    on(evt: string, cb: (e: any) => void, _t?: any) {
        if (!this.map.has(evt)) this.map.set(evt, new Set());
        this.map.get(evt)!.add(cb);
    }
    off(evt: string, cb?: (e: any) => void, _t?: any) {
        if (!cb) this.map.delete(evt);
        else this.map.get(evt)?.delete(cb);
    }
    emit(evt: string, e?: any) {
        const set = this.map.get(evt);
        if (set) for (const cb of Array.from(set)) { try { cb(e); } catch (err) { console.error(err); } }
    }
}
export const input = new Emitter();
export const game = new Emitter() as any;
export const director = new Emitter() as any;
(director as any).getScene = () => (globalThis as any).__scene || null;
(director as any).loadScene = () => { /* 单场景 */ };

export enum KeyCode {
    NONE = 0, BACKSPACE = 8, TAB = 9, ENTER = 13, SHIFT = 16, ESCAPE = 27, SPACE = 32,
    LEFT = 37, UP = 38, RIGHT = 39, DOWN = 40,
    ARROW_LEFT = 37, ARROW_UP = 38, ARROW_RIGHT = 39, ARROW_DOWN = 40,
    DIGIT_0 = 48, DIGIT_1 = 49, DIGIT_2 = 50, DIGIT_3 = 51, DIGIT_4 = 52,
    DIGIT_5 = 53, DIGIT_6 = 54, DIGIT_7 = 55, DIGIT_8 = 56, DIGIT_9 = 57,
    A = 65, B = 66, C = 67, D = 68, E = 69, F = 70, G = 71, H = 72, I = 73, J = 74,
    K = 75, L = 76, M = 77, N = 78, O = 79, P = 80, Q = 81, R = 82, S = 83, T = 84,
    U = 85, V = 86, W = 87, X = 88, Y = 89, Z = 90,
    KEY_A = 65, KEY_D = 68, KEY_P = 80, KEY_Q = 81, KEY_R = 82, KEY_S = 83, KEY_W = 87,
}
export const Input = { EventType: { KEY_DOWN: 'key-down', KEY_UP: 'key-up', TOUCH_START: 'touch-start', TOUCH_MOVE: 'touch-move', TOUCH_END: 'touch-end', TOUCH_CANCEL: 'touch-cancel' } };
export const Game = { EVENT_HIDE: 'game-hide', EVENT_SHOW: 'game-show' };
export const Director = { EVENT_AFTER_SCENE_LAUNCH: 'after-scene-launch' };
export const EDITOR = false;

export class EventKeyboard {
    keyCode = 0;
    constructor(keyCode = 0) { this.keyCode = keyCode; }
}
export class EventTouch {
    propagationStopped = false;
    /** 本触摸点 START 是否已命中且未被拦截（按钮只在 STARTED 时响应 END，对齐 Cocos 手感） */
    started = false;
    private _x = 0; private _y = 0;
    touch = {
        getLocationX: () => this._x,
        getLocationY: () => this._y,
    };
    constructor(x = 0, y = 0) { this._x = x; this._y = y; }
    getUILocation() { return { x: this._x, y: this._y }; }
    getLocation() { return { x: this._x, y: this._y }; }
}

// ---------------------------------------------------------------- 节点树
type Listener = (e?: any) => void;

class NodeBase {
    name = '';
    layer = 0;
    parent: NodeBase | null = null;
    children: NodeBase[] = [];
    active = true;
    angle = 0;
    _pos = new Vec3();
    _scale = new Vec3(1, 1, 1);
    private _listeners = new Map<string, Set<Listener>>();
    private _components: any[] = [];
    constructor(name = '') { this.name = name; }

    get position() { return this._pos; }
    get scale() { return this._scale; }
    get isValid() { return true; }
    get childrenCount() { return this.children.length; }

    addChild(n: NodeBase) { if (n.parent) n.parent.removeChild(n); n.parent = this; this.children.push(n); return n; }
    removeChild(n: NodeBase) { const i = this.children.indexOf(n); if (i >= 0) this.children.splice(i, 1); n.parent = null; }
    removeFromParent() { if (this.parent) this.parent.removeChild(this); }
    getChildByName(n: string) { return this.children.find((c) => c.name === n) || null; }

    setPosition(x: number | Vec3, y?: number, z?: number) {
        if (typeof x === 'object') { this._pos.x = x.x; this._pos.y = x.y; this._pos.z = x.z; }
        else { this._pos.x = x; this._pos.y = y ?? 0; this._pos.z = z ?? 0; }
    }
    setScale(x: number | Vec3, y?: number, z?: number) {
        if (typeof x === 'object') { this._scale.x = x.x; this._scale.y = x.y; this._scale.z = x.z; }
        else { this._scale.x = x; this._scale.y = y ?? 1; this._scale.z = z ?? 1; }
    }

    on(evt: string, cb: Listener, _t?: any) {
        if (!this._listeners.has(evt)) this._listeners.set(evt, new Set());
        this._listeners.get(evt)!.add(cb);
    }
    off(evt: string, cb?: Listener) {
        if (!cb) this._listeners.delete(evt);
        else this._listeners.get(evt)?.delete(cb);
    }
    emit(evt: string, e?: any) {
        const set = this._listeners.get(evt);
        if (set) for (const cb of Array.from(set)) { try { cb(e); } catch (err) { console.error(err); } }
    }
    hasListeners(evt: string) { return !!this._listeners.get(evt)?.size; }
    listenerCount(evt: string) { return this._listeners.get(evt)?.size || 0; }

    addComponent<T = any>(ctor: any): T {
        // 与 Cocos 一致：挂组件前确保 UITransform 已存在（首次 addComponent 时补）
        this.getComponent(UITransform);
        const c = typeof ctor === 'function' ? new ctor() : ctor;
        c.node = this;
        this._components.push(c);
        if (typeof c.onLoad === 'function') c.onLoad();
        return c;
    }
    getComponent(ctor: any) {
        if (!ctor) return null;
        const hit = this._components.find((c) => c instanceof ctor || c.constructor === ctor);
        if (hit) return hit;
        // Cocos 会给每个 Node 自动挂 UITransform；shim 惰性补齐，避免 getComponent(UITransform) 返回 null
        if (ctor === UITransform && !this._components.some((c) => c instanceof UITransform)) {
            const ut = new UITransform();
            ut.node = this as any;
            this._components.push(ut);
            return ut;
        }
        return null;
    }
    getComponentInChildren(ctor: any): any {
        const hit = this.getComponent(ctor);
        if (hit) return hit;
        for (const ch of this.children) { const r = ch.getComponentInChildren(ctor); if (r) return r; }
        return null;
    }
    getComponentsInChildren(ctor: any): any[] {
        const out: any[] = [];
        const walk = (n: NodeBase) => {
            const c = n.getComponent(ctor);
            if (c) out.push(c);
            n.children.forEach(walk);
        };
        walk(this);
        return out;
    }

    destroyAllChildren() {
        for (const ch of [...this.children]) ch.destroy();
    }

    destroy() {
        this.active = false;
        if (this.parent) this.parent.removeChild(this);
        for (const ch of [...this.children]) ch.destroy();
    }
}

export class Node extends NodeBase {
    static EventType = { TOUCH_START: 'touch-start', TOUCH_MOVE: 'touch-move', TOUCH_END: 'touch-end', TOUCH_CANCEL: 'touch-cancel' };
}

export class Component {
    node!: NodeBase;
    enabled = true;
    onLoad() {}
    onDestroy() {}
    update(_dt: number) {}
    scheduleOnce(cb: () => void, delay = 0) { setTimeout(cb, delay * 1000); }
    schedule(cb: () => void, interval = 1) { return setInterval(cb, interval * 1000); }
    unschedule(id: any) { clearInterval(id); }
    getComponent(ctor: any) { return this.node ? this.node.getComponent(ctor) : null; }
    getComponentInChildren(ctor: any) { return this.node ? this.node.getComponentInChildren(ctor) : null; }
    addComponent<T = any>(ctor: any): T { return this.node.addComponent(ctor); }
}

export class UITransform {
    node!: NodeBase;
    width = 0; height = 0;
    anchorX = 0.5; anchorY = 0.5;
    onLoad() {}
    setContentSize(w: number, h: number) { this.width = w; this.height = h; return this; }
    setAnchorPoint(x: number, y: number) { this.anchorX = x; this.anchorY = y; return this; }
    get contentSize() { return new Size(this.width, this.height); }
    get anchorPoint() { return new Vec2(this.anchorX, this.anchorY); }
    /** UI 世界坐标（设计分辨率，原点左下）→ 节点局部坐标 */
    convertToNodeSpaceAR(world: Vec3, out = new Vec3()) {
        const n = this.node as any;
        const p = n ? n._pos : { x: 0, y: 0 };
        out.x = world.x - p.x;
        out.y = world.y - p.y;
        out.z = 0;
        return out;
    }
}

export class Label {
    node!: NodeBase;
    string = '';
    fontSize = 24;
    lineHeight = 30;
    isBold = false;
    color = new Color();
    cacheMode = 0;
    enableOutline = false;
    outlineColor = new Color(0, 0, 0, 255);
    outlineWidth = 2;
    horizontalAlign = 1;
    verticalAlign = 1;
    static CacheMode = { NONE: 0, CHAR: 1, BITMAP: 2 };
    static HorizontalAlign = { LEFT: 0, CENTER: 1, RIGHT: 2 };
    static VerticalAlign = { TOP: 0, CENTER: 1, BOTTOM: 2 };
    onLoad() {}
}

export class Sprite {
    node!: NodeBase;
    spriteFrame: SpriteFrame | null = null;
    sizeMode = 0;
    type = 0;
    trim = false;
    color = new Color();
    static SizeMode = { CUSTOM: 0, TRIMMED: 1, RAW: 2 };
    static Type = { SIMPLE: 0, TILED: 1, FILLED: 2 };
    onLoad() {}
}

export class Canvas {
    node!: NodeBase;
    cameraComponent: { clearColor: Color } | null = null;
    onLoad() {}
}

export class SubContextView {
    node!: NodeBase;
    designResolutionSize = new Size(640, 300);
    fps = 30;
    onLoad() {}
}

// ---------------------------------------------------------------- 贴图 / 图集
export class ImageAsset {
    data: Uint8Array; width = 0; height = 0;
    constructor(o: any) { Object.assign(this, o || {}); if (o && o._data) this.data = o._data; }
}
export class Texture2D {
    static PixelFormat = { RGBA8888: 0 };
    static Filter = { NEAREST: 0, LINEAR: 1, NONE: 0 };
    static WrapMode = { CLAMP_TO_EDGE: 0, REPEAT: 1 };
    image: ImageAsset | null = null;
    setFilters(..._a: any[]) {} setMipFilter(..._a: any[]) {} setWrapMode(..._a: any[]) {} addRef() {}
}
export class SpriteFrame {
    texture: Texture2D | null = null;
    rect: Rect | null = null;
    originalSize: Size | null = null;
    offset = new Vec2();
    isRotate = false;
    reset(o: any) { Object.assign(this, o); }
    addRef() {}
}

// ---------------------------------------------------------------- 触摸派发
// Cocos：全局 input 事件 → 命中检测 → 目标节点 → 沿父链触发监听（propagationStopped 停止向上传播）。
// shim 用与渲染一致的世界坐标累积做命中（UITransform 尺寸 + anchor），active=false 的子树跳过。

function touchHitTest(px: number, py: number, root: NodeBase): NodeBase | null {
    let hit: NodeBase | null = null;
    const walk = (n: NodeBase, ox: number, oy: number) => {
        if (!n.active) return;
        const x = ox + n._pos.x;
        const y = oy + n._pos.y;
        // 逆序遍历 children：后绘制的（上层）先命中
        for (let i = n.children.length - 1; i >= 0; i--) walk(n.children[i], x, y);
        if (hit) return;
        const ut = n.getComponent(UITransform);
        if (!ut || !ut.width || !ut.height) return;
        const x0 = x - ut.width * ut.anchorX;
        const y0 = y - ut.height * ut.anchorY;
        const x1 = x0 + ut.width;
        const y1 = y0 + ut.height;
        if (px >= x0 && px <= x1 && py >= y0 && py <= y1) hit = n;
    };
    walk(root, 0, 0);
    return hit;
}

function dispatchTouch(type: string, e: EventTouch) {
    const scene = (globalThis as any).__scene as NodeBase | undefined;
    if (!scene) return;
    const loc = e.getUILocation();
    if (type === Node.EventType.TOUCH_START) e.started = false;

    const target = touchHitTest(loc.x, loc.y, scene);
    if (!target) return;
    if (type === Node.EventType.TOUCH_START) {
        // START：命中且未被 overlay(blockTouches) 拦截 → 标记 started，按钮 END 才会触发
        let blocked = false;
        for (let n: NodeBase | null = target; n; n = n.parent) {
            n.emit(type, e);
            if (e.propagationStopped) { blocked = true; break; }
        }
        if (!blocked) e.started = true;
        return;
    }
    if (type === Node.EventType.TOUCH_END) {
        if (!e.started) return;   // 未成功 START 的触摸点不触发 END（点击语义）
        for (let n: NodeBase | null = target; n; n = n.parent) {
            n.emit(type, e);
            if (e.propagationStopped) break;
        }
        return;
    }
    // MOVE / CANCEL：直接冒泡（摇杆 MOVE 在 touchLayer 上监听）
    for (let n: NodeBase | null = target; n; n = n.parent) {
        n.emit(type, e);
        if (e.propagationStopped) break;
    }
}

input.on(Node.EventType.TOUCH_START, (e: EventTouch) => dispatchTouch(Node.EventType.TOUCH_START, e));
input.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => dispatchTouch(Node.EventType.TOUCH_MOVE, e));
input.on(Node.EventType.TOUCH_END, (e: EventTouch) => dispatchTouch(Node.EventType.TOUCH_END, e));
input.on(Node.EventType.TOUCH_CANCEL, (e: EventTouch) => dispatchTouch(Node.EventType.TOUCH_CANCEL, e));

// ---------------------------------------------------------------- 2D 渲染器
// 把节点树画到 canvas：Sprite 用图集（NEAREST），Label 用系统字体。
// 坐标：Cocos UI 以左下为原点、y 向上；canvas 以左上为原点、y 向下。
export class Renderer2D {
    canvas: HTMLCanvasElement | null = null;
    ctx: CanvasRenderingContext2D | null = null;
    /** 设计分辨率（逻辑像素） */
    designW = 720;
    designH = 1280;
    /** canvas 实际像素 / 设计像素 */
    scale = 1;
    atlasCanvas: HTMLCanvasElement | null = null;

    attach(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    /** 把 RGBA 图集数据铺成离屏 canvas（NEAREST 放大靠 imageSmoothingEnabled=false） */
    buildAtlasCanvas(size: number, data: Uint8Array) {
        const cv = (globalThis as any).document.createElement('canvas');
        cv.width = size; cv.height = size;
        const c = cv.getContext('2d')!;
        const img = c.createImageData(size, size);
        img.data.set(data);
        c.putImageData(img, 0, 0);
        this.atlasCanvas = cv;
    }

    render(root: NodeBase) {
        const ctx = this.ctx;
        if (!ctx) return;
        const W = this.designW, H = this.designH;
        ctx.save();
        ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#121612';
        ctx.fillRect(0, 0, W, H);
        this.drawNode(ctx, root, 0, 0, 1);
        ctx.restore();
    }

    private drawNode(ctx: CanvasRenderingContext2D, n: NodeBase, ox: number, oy: number, os: number) {
        if (!n.active) return;
        const x = ox + n._pos.x * os;
        const y = oy + n._pos.y * os;
        const s = os * n._scale.x; // 只用 x 缩放（游戏里 xy 同步）
        const rot = (n.angle * Math.PI) / 180;

        const sp = n.getComponent(Sprite) as Sprite | null;
        const lb = n.getComponent(Label) as Label | null;

        if (sp && sp.spriteFrame && sp.spriteFrame.rect && this.atlasCanvas) {
            const r = sp.spriteFrame.rect;
            ctx.save();
            ctx.translate(x, y);
            if (rot) ctx.rotate(-rot); // Cocos 角度逆时针为正，canvas 顺时针为正
            const w = r.width * s, h = r.height * s;
            const ax = 0.5, ay = 0.5; // Sprite 默认中心锚点（RAW/CUSTOM 情况下 UiKit 会改 UITransform，这里近似）
            const dx = -w * ax, dy = h * ay; // y 翻转
            ctx.imageSmoothingEnabled = false;
            const col = sp.color;
            if (col && (col.r !== 255 || col.g !== 255 || col.b !== 255 || col.a !== 255)) {
                // 着色：先画到临时再染色开销大；简单用 globalAlpha + 滤镜近似
                ctx.globalAlpha = (col.a ?? 255) / 255;
                if (col.r !== 255 || col.g !== 255 || col.b !== 255) {
                    ctx.filter = `rgb(${col.r},${col.g},${col.b})`;
                }
            }
            ctx.drawImage(this.atlasCanvas, r.x, r.y, r.width, r.height, dx, dy, w, h);
            ctx.filter = 'none';
            ctx.globalAlpha = 1;
            ctx.restore();
        } else if (sp && !sp.spriteFrame) {
            // 无贴图矩形（理论不出现，mkRect 用 white 帧）
        }

        if (lb && lb.string) {
            ctx.save();
            ctx.translate(x, y);
            if (rot) ctx.rotate(-rot);
            const size = lb.fontSize * s;
            ctx.font = `${lb.isBold ? 'bold ' : ''}${size}px sans-serif`;
            ctx.textAlign = (['left', 'center', 'right'] as const)[lb.horizontalAlign] || 'center';
            ctx.textBaseline = 'middle';
            const col = lb.color;
            if (lb.enableOutline) {
                const oc = lb.outlineColor;
                ctx.strokeStyle = `rgba(${oc.r},${oc.g},${oc.b},${(oc.a ?? 255) / 255})`;
                ctx.lineWidth = lb.outlineWidth * s;
                ctx.strokeText(lb.string, 0, 0);
            }
            ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${(col.a ?? 255) / 255})`;
            ctx.fillText(lb.string, 0, 0);
            ctx.restore();
        }

        for (const ch of n.children) this.drawNode(ctx, ch, x, y, s);
    }
}

export const renderer = new Renderer2D();

export const _decorator = {
    ccclass: (..._a: any[]) => (target: any) => target,
    property: (..._a: any[]) => () => undefined,
};
