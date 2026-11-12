// 浏览器/Node 用的最小 cc 实现：数据结构 + 节点树 + 事件 + 一个 2D 画布渲染器。
// Cocos 构建不包含本文件（assets/scripts 只 import 'cc'，由 Creator 解析）。
// 渲染器把 Sprite/Label 画到 <canvas>，逻辑层（GameRoot/Battle）无需改动。
export class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = 0;
        this.y = 0;
        this.x = x;
        this.y = y;
    }
}
export class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.x = x;
        this.y = y;
        this.z = z;
    }
    set(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; return this; }
    clone() { return new Vec3(this.x, this.y, this.z); }
}
export class Color {
    constructor(r = 255, g = 255, b = 255, a = 255) {
        this.r = 255;
        this.g = 255;
        this.b = 255;
        this.a = 255;
        this.set(r, g, b, a);
    }
    set(r = 255, g = 255, b = 255, a = 255) { this.r = r; this.g = g; this.b = b; this.a = a; return this; }
    clone() { return new Color(this.r, this.g, this.b, this.a); }
}
Color.WHITE = new Color(255, 255, 255, 255);
Color.BLACK = new Color(0, 0, 0, 255);
Color.TRANSPARENT = new Color(0, 0, 0, 0);
export class Size {
    constructor(w = 0, h = 0) {
        this.width = 0;
        this.height = 0;
        this.width = w;
        this.height = h;
    }
}
export class Rect {
    constructor(x = 0, y = 0, w = 0, h = 0) {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
    }
}
// ---------------------------------------------------------------- 存储 / 系统
const storage = (() => {
    try {
        const ls = globalThis.localStorage;
        if (ls)
            return ls;
    }
    catch { /* 忽略 */ }
    const mem = new Map();
    return {
        getItem: (k) => (mem.has(k) ? mem.get(k) : null),
        setItem: (k, v) => { mem.set(k, v); },
        removeItem: (k) => { mem.delete(k); },
    };
})();
export const sys = {
    localStorage: storage,
    isMobile: true,
    platform: 'browser',
    getSafeAreaRect() {
        const nav = globalThis.navigator;
        const inset = nav && nav.safeAreaInsets;
        if (inset) {
            // 浏览器：safeAreaInsets 是 CSS px，y 向下；Cocos 的 Rect y 向上（底部为 0）
            const h = globalThis.innerHeight || 1280;
            return new Rect(inset.left, h - inset.bottom, globalThis.innerWidth - inset.left - inset.right, inset.top + inset.bottom);
        }
        return null;
    },
};
export const ResolutionPolicy = { EXACT_FIT: 0, NO_BORDER: 1, SHOW_ALL: 2, FIXED_HEIGHT: 3, FIXED_WIDTH: 4 };
export const view = {
    designResolution: { width: 720, height: 1280 },
    setDesignResolutionSize(w, h, _p) { this.designResolution.width = w; this.designResolution.height = h; },
    getVisibleSize() { return new Size(720, 1280); },
    getVisibleSize_() { return new Size(720, 1280); },
};
/** 逻辑坐标（720×1280，左上原点）→ 设计坐标（y 向上）。触摸派发与渲染共用同一约定。 */
export function clientToDesign(clientX, clientY, rect, designW = 720, designH = 1280) {
    const x = ((clientX - rect.left) / Math.max(1, rect.width)) * designW;
    const y = designH - ((clientY - rect.top) / Math.max(1, rect.height)) * designH;
    return { x, y };
}
export const Layers = { Enum: { UI_2D: 1 << 25, UI_3D: 1 << 26, DEFAULT: 1 << 30, NONE: 0 } };
// ---------------------------------------------------------------- 事件总线
class Emitter {
    constructor() {
        this.map = new Map();
    }
    on(evt, cb, _t) {
        if (!this.map.has(evt))
            this.map.set(evt, new Set());
        this.map.get(evt).add(cb);
    }
    off(evt, cb, _t) {
        if (!cb)
            this.map.delete(evt);
        else
            this.map.get(evt)?.delete(cb);
    }
    emit(evt, e) {
        const set = this.map.get(evt);
        if (set)
            for (const cb of Array.from(set)) {
                try {
                    cb(e);
                }
                catch (err) {
                    console.error(err);
                }
            }
    }
}
export const input = new Emitter();
export const game = new Emitter();
export const director = new Emitter();
director.getScene = () => globalThis.__scene || null;
director.loadScene = () => { };
export var KeyCode;
(function (KeyCode) {
    KeyCode[KeyCode["NONE"] = 0] = "NONE";
    KeyCode[KeyCode["BACKSPACE"] = 8] = "BACKSPACE";
    KeyCode[KeyCode["TAB"] = 9] = "TAB";
    KeyCode[KeyCode["ENTER"] = 13] = "ENTER";
    KeyCode[KeyCode["SHIFT"] = 16] = "SHIFT";
    KeyCode[KeyCode["ESCAPE"] = 27] = "ESCAPE";
    KeyCode[KeyCode["SPACE"] = 32] = "SPACE";
    KeyCode[KeyCode["LEFT"] = 37] = "LEFT";
    KeyCode[KeyCode["UP"] = 38] = "UP";
    KeyCode[KeyCode["RIGHT"] = 39] = "RIGHT";
    KeyCode[KeyCode["DOWN"] = 40] = "DOWN";
    KeyCode[KeyCode["ARROW_LEFT"] = 37] = "ARROW_LEFT";
    KeyCode[KeyCode["ARROW_UP"] = 38] = "ARROW_UP";
    KeyCode[KeyCode["ARROW_RIGHT"] = 39] = "ARROW_RIGHT";
    KeyCode[KeyCode["ARROW_DOWN"] = 40] = "ARROW_DOWN";
    KeyCode[KeyCode["DIGIT_0"] = 48] = "DIGIT_0";
    KeyCode[KeyCode["DIGIT_1"] = 49] = "DIGIT_1";
    KeyCode[KeyCode["DIGIT_2"] = 50] = "DIGIT_2";
    KeyCode[KeyCode["DIGIT_3"] = 51] = "DIGIT_3";
    KeyCode[KeyCode["DIGIT_4"] = 52] = "DIGIT_4";
    KeyCode[KeyCode["DIGIT_5"] = 53] = "DIGIT_5";
    KeyCode[KeyCode["DIGIT_6"] = 54] = "DIGIT_6";
    KeyCode[KeyCode["DIGIT_7"] = 55] = "DIGIT_7";
    KeyCode[KeyCode["DIGIT_8"] = 56] = "DIGIT_8";
    KeyCode[KeyCode["DIGIT_9"] = 57] = "DIGIT_9";
    KeyCode[KeyCode["A"] = 65] = "A";
    KeyCode[KeyCode["B"] = 66] = "B";
    KeyCode[KeyCode["C"] = 67] = "C";
    KeyCode[KeyCode["D"] = 68] = "D";
    KeyCode[KeyCode["E"] = 69] = "E";
    KeyCode[KeyCode["F"] = 70] = "F";
    KeyCode[KeyCode["G"] = 71] = "G";
    KeyCode[KeyCode["H"] = 72] = "H";
    KeyCode[KeyCode["I"] = 73] = "I";
    KeyCode[KeyCode["J"] = 74] = "J";
    KeyCode[KeyCode["K"] = 75] = "K";
    KeyCode[KeyCode["L"] = 76] = "L";
    KeyCode[KeyCode["M"] = 77] = "M";
    KeyCode[KeyCode["N"] = 78] = "N";
    KeyCode[KeyCode["O"] = 79] = "O";
    KeyCode[KeyCode["P"] = 80] = "P";
    KeyCode[KeyCode["Q"] = 81] = "Q";
    KeyCode[KeyCode["R"] = 82] = "R";
    KeyCode[KeyCode["S"] = 83] = "S";
    KeyCode[KeyCode["T"] = 84] = "T";
    KeyCode[KeyCode["U"] = 85] = "U";
    KeyCode[KeyCode["V"] = 86] = "V";
    KeyCode[KeyCode["W"] = 87] = "W";
    KeyCode[KeyCode["X"] = 88] = "X";
    KeyCode[KeyCode["Y"] = 89] = "Y";
    KeyCode[KeyCode["Z"] = 90] = "Z";
    KeyCode[KeyCode["KEY_A"] = 65] = "KEY_A";
    KeyCode[KeyCode["KEY_D"] = 68] = "KEY_D";
    KeyCode[KeyCode["KEY_P"] = 80] = "KEY_P";
    KeyCode[KeyCode["KEY_Q"] = 81] = "KEY_Q";
    KeyCode[KeyCode["KEY_R"] = 82] = "KEY_R";
    KeyCode[KeyCode["KEY_S"] = 83] = "KEY_S";
    KeyCode[KeyCode["KEY_W"] = 87] = "KEY_W";
})(KeyCode || (KeyCode = {}));
export const Input = { EventType: { KEY_DOWN: 'key-down', KEY_UP: 'key-up', TOUCH_START: 'touch-start', TOUCH_MOVE: 'touch-move', TOUCH_END: 'touch-end', TOUCH_CANCEL: 'touch-cancel' } };
export const Game = { EVENT_HIDE: 'game-hide', EVENT_SHOW: 'game-show' };
export const Director = { EVENT_AFTER_SCENE_LAUNCH: 'after-scene-launch' };
export const EDITOR = false;
export class EventKeyboard {
    constructor(keyCode = 0) {
        this.keyCode = 0;
        this.keyCode = keyCode;
    }
}
export class EventTouch {
    constructor(x = 0, y = 0) {
        this.propagationStopped = false;
        /** 本触摸点 START 是否已命中且未被拦截（按钮只在 STARTED 时响应 END，对齐 Cocos 手感） */
        this.started = false;
        this._x = 0;
        this._y = 0;
        this.touch = {
            getLocationX: () => this._x,
            getLocationY: () => this._y,
        };
        this._x = x;
        this._y = y;
    }
    getUILocation() { return { x: this._x, y: this._y }; }
    getLocation() { return { x: this._x, y: this._y }; }
}
class NodeBase {
    constructor(name = '') {
        this.name = '';
        this.layer = 0;
        this.parent = null;
        this.children = [];
        this.active = true;
        this.angle = 0;
        this._pos = new Vec3();
        this._scale = new Vec3(1, 1, 1);
        this._listeners = new Map();
        this._components = [];
        this.name = name;
    }
    get position() { return this._pos; }
    get scale() { return this._scale; }
    get isValid() { return true; }
    get childrenCount() { return this.children.length; }
    addChild(n) { if (n.parent)
        n.parent.removeChild(n); n.parent = this; this.children.push(n); return n; }
    removeChild(n) { const i = this.children.indexOf(n); if (i >= 0)
        this.children.splice(i, 1); n.parent = null; }
    removeFromParent() { if (this.parent)
        this.parent.removeChild(this); }
    getChildByName(n) { return this.children.find((c) => c.name === n) || null; }
    setPosition(x, y, z) {
        if (typeof x === 'object') {
            this._pos.x = x.x;
            this._pos.y = x.y;
            this._pos.z = x.z;
        }
        else {
            this._pos.x = x;
            this._pos.y = y ?? 0;
            this._pos.z = z ?? 0;
        }
    }
    setScale(x, y, z) {
        if (typeof x === 'object') {
            this._scale.x = x.x;
            this._scale.y = x.y;
            this._scale.z = x.z;
        }
        else {
            this._scale.x = x;
            this._scale.y = y ?? 1;
            this._scale.z = z ?? 1;
        }
    }
    on(evt, cb, _t) {
        if (!this._listeners.has(evt))
            this._listeners.set(evt, new Set());
        this._listeners.get(evt).add(cb);
    }
    off(evt, cb) {
        if (!cb)
            this._listeners.delete(evt);
        else
            this._listeners.get(evt)?.delete(cb);
    }
    emit(evt, e) {
        const set = this._listeners.get(evt);
        if (set)
            for (const cb of Array.from(set)) {
                try {
                    cb(e);
                }
                catch (err) {
                    console.error(err);
                }
            }
    }
    hasListeners(evt) { return !!this._listeners.get(evt)?.size; }
    listenerCount(evt) { return this._listeners.get(evt)?.size || 0; }
    addComponent(ctor) {
        // 与 Cocos 一致：挂组件前确保 UITransform 已存在（首次 addComponent 时补）
        this.getComponent(UITransform);
        const c = typeof ctor === 'function' ? new ctor() : ctor;
        c.node = this;
        this._components.push(c);
        if (typeof c.onLoad === 'function')
            c.onLoad();
        return c;
    }
    getComponent(ctor) {
        if (!ctor)
            return null;
        const hit = this._components.find((c) => c instanceof ctor || c.constructor === ctor);
        if (hit)
            return hit;
        // Cocos 会给每个 Node 自动挂 UITransform；shim 惰性补齐，避免 getComponent(UITransform) 返回 null
        if (ctor === UITransform && !this._components.some((c) => c instanceof UITransform)) {
            const ut = new UITransform();
            ut.node = this;
            this._components.push(ut);
            return ut;
        }
        return null;
    }
    getComponentInChildren(ctor) {
        const hit = this.getComponent(ctor);
        if (hit)
            return hit;
        for (const ch of this.children) {
            const r = ch.getComponentInChildren(ctor);
            if (r)
                return r;
        }
        return null;
    }
    getComponentsInChildren(ctor) {
        const out = [];
        const walk = (n) => {
            const c = n.getComponent(ctor);
            if (c)
                out.push(c);
            n.children.forEach(walk);
        };
        walk(this);
        return out;
    }
    destroyAllChildren() {
        for (const ch of [...this.children])
            ch.destroy();
    }
    destroy() {
        this.active = false;
        if (this.parent)
            this.parent.removeChild(this);
        for (const ch of [...this.children])
            ch.destroy();
    }
}
export class Node extends NodeBase {
}
Node.EventType = { TOUCH_START: 'touch-start', TOUCH_MOVE: 'touch-move', TOUCH_END: 'touch-end', TOUCH_CANCEL: 'touch-cancel' };
export class Component {
    constructor() {
        this.enabled = true;
    }
    onLoad() { }
    onDestroy() { }
    update(_dt) { }
    scheduleOnce(cb, delay = 0) { setTimeout(cb, delay * 1000); }
    schedule(cb, interval = 1) { return setInterval(cb, interval * 1000); }
    unschedule(id) { clearInterval(id); }
    getComponent(ctor) { return this.node ? this.node.getComponent(ctor) : null; }
    getComponentInChildren(ctor) { return this.node ? this.node.getComponentInChildren(ctor) : null; }
    addComponent(ctor) { return this.node.addComponent(ctor); }
}
export class UITransform {
    constructor() {
        this.width = 0;
        this.height = 0;
        this.anchorX = 0.5;
        this.anchorY = 0.5;
    }
    onLoad() { }
    setContentSize(w, h) { this.width = w; this.height = h; return this; }
    setAnchorPoint(x, y) { this.anchorX = x; this.anchorY = y; return this; }
    get contentSize() { return new Size(this.width, this.height); }
    get anchorPoint() { return new Vec2(this.anchorX, this.anchorY); }
    /** UI 世界坐标（设计分辨率，原点左下）→ 节点局部坐标 */
    convertToNodeSpaceAR(world, out = new Vec3()) {
        const n = this.node;
        const p = n ? n._pos : { x: 0, y: 0 };
        out.x = world.x - p.x;
        out.y = world.y - p.y;
        out.z = 0;
        return out;
    }
}
export class Label {
    constructor() {
        this.string = '';
        this.fontSize = 24;
        this.lineHeight = 30;
        this.isBold = false;
        this.color = new Color();
        this.cacheMode = 0;
        this.enableOutline = false;
        this.outlineColor = new Color(0, 0, 0, 255);
        this.outlineWidth = 2;
        this.horizontalAlign = 1;
        this.verticalAlign = 1;
    }
    onLoad() { }
}
Label.CacheMode = { NONE: 0, CHAR: 1, BITMAP: 2 };
Label.HorizontalAlign = { LEFT: 0, CENTER: 1, RIGHT: 2 };
Label.VerticalAlign = { TOP: 0, CENTER: 1, BOTTOM: 2 };
export class Sprite {
    constructor() {
        this.spriteFrame = null;
        this.sizeMode = 0;
        this.type = 0;
        this.trim = false;
        this.color = new Color();
    }
    onLoad() { }
}
Sprite.SizeMode = { CUSTOM: 0, TRIMMED: 1, RAW: 2 };
Sprite.Type = { SIMPLE: 0, TILED: 1, FILLED: 2 };
export class Canvas {
    constructor() {
        this.cameraComponent = null;
    }
    onLoad() { }
}
export class SubContextView {
    constructor() {
        this.designResolutionSize = new Size(640, 300);
        this.fps = 30;
    }
    onLoad() { }
}
// ---------------------------------------------------------------- 贴图 / 图集
export class ImageAsset {
    constructor(o) {
        this.width = 0;
        this.height = 0;
        Object.assign(this, o || {});
        if (o && o._data)
            this.data = o._data;
    }
}
export class Texture2D {
    constructor() {
        this.image = null;
    }
    setFilters(..._a) { }
    setMipFilter(..._a) { }
    setWrapMode(..._a) { }
    addRef() { }
}
Texture2D.PixelFormat = { RGBA8888: 0 };
Texture2D.Filter = { NEAREST: 0, LINEAR: 1, NONE: 0 };
Texture2D.WrapMode = { CLAMP_TO_EDGE: 0, REPEAT: 1 };
export class SpriteFrame {
    constructor() {
        this.texture = null;
        this.rect = null;
        this.originalSize = null;
        this.offset = new Vec2();
        this.isRotate = false;
    }
    reset(o) { Object.assign(this, o); }
    addRef() { }
}
// ---------------------------------------------------------------- 触摸派发
// Cocos：全局 input 事件 → 命中检测 → 目标节点 → 沿父链触发监听（propagationStopped 停止向上传播）。
// shim 用与渲染一致的世界坐标累积做命中（UITransform 尺寸 + anchor），active=false 的子树跳过。
function touchHitTest(px, py, root) {
    let hit = null;
    const walk = (n, ox, oy) => {
        if (!n.active)
            return;
        const x = ox + n._pos.x;
        const y = oy + n._pos.y;
        // 逆序遍历 children：后绘制的（上层）先命中
        for (let i = n.children.length - 1; i >= 0; i--)
            walk(n.children[i], x, y);
        if (hit)
            return;
        const ut = n.getComponent(UITransform);
        if (!ut || !ut.width || !ut.height)
            return;
        const x0 = x - ut.width * ut.anchorX;
        const y0 = y - ut.height * ut.anchorY;
        const x1 = x0 + ut.width;
        const y1 = y0 + ut.height;
        if (px >= x0 && px <= x1 && py >= y0 && py <= y1)
            hit = n;
    };
    walk(root, 0, 0);
    return hit;
}
function dispatchTouch(type, e) {
    const scene = globalThis.__scene;
    if (!scene)
        return;
    const loc = e.getUILocation();
    if (type === Node.EventType.TOUCH_START)
        e.started = false;
    const target = touchHitTest(loc.x, loc.y, scene);
    if (!target)
        return;
    if (type === Node.EventType.TOUCH_START) {
        // START：命中且未被 overlay(blockTouches) 拦截 → 标记 started，按钮 END 才会触发
        let blocked = false;
        for (let n = target; n; n = n.parent) {
            n.emit(type, e);
            if (e.propagationStopped) {
                blocked = true;
                break;
            }
        }
        if (!blocked)
            e.started = true;
        return;
    }
    if (type === Node.EventType.TOUCH_END) {
        if (!e.started)
            return; // 未成功 START 的触摸点不触发 END（点击语义）
        for (let n = target; n; n = n.parent) {
            n.emit(type, e);
            if (e.propagationStopped)
                break;
        }
        return;
    }
    // MOVE / CANCEL：直接冒泡（摇杆 MOVE 在 touchLayer 上监听）
    for (let n = target; n; n = n.parent) {
        n.emit(type, e);
        if (e.propagationStopped)
            break;
    }
}
input.on(Node.EventType.TOUCH_START, (e) => dispatchTouch(Node.EventType.TOUCH_START, e));
input.on(Node.EventType.TOUCH_MOVE, (e) => dispatchTouch(Node.EventType.TOUCH_MOVE, e));
input.on(Node.EventType.TOUCH_END, (e) => dispatchTouch(Node.EventType.TOUCH_END, e));
input.on(Node.EventType.TOUCH_CANCEL, (e) => dispatchTouch(Node.EventType.TOUCH_CANCEL, e));
// ---------------------------------------------------------------- 2D 渲染器
// 把节点树画到 canvas：Sprite 用图集（NEAREST），Label 用系统字体。
// 坐标：Cocos UI 以左下为原点、y 向上；canvas 以左上为原点、y 向下。
export class Renderer2D {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        /** 设计分辨率（逻辑像素） */
        this.designW = 720;
        this.designH = 1280;
        /** canvas 实际像素 / 设计像素 */
        this.scale = 1;
        this.atlasCanvas = null;
    }
    attach(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }
    /** 把 RGBA 图集数据铺成离屏 canvas（NEAREST 放大靠 imageSmoothingEnabled=false） */
    buildAtlasCanvas(size, data) {
        const cv = globalThis.document.createElement('canvas');
        cv.width = size;
        cv.height = size;
        const c = cv.getContext('2d');
        const img = c.createImageData(size, size);
        img.data.set(data);
        c.putImageData(img, 0, 0);
        this.atlasCanvas = cv;
    }
    render(root) {
        const ctx = this.ctx;
        if (!ctx)
            return;
        const W = this.designW, H = this.designH;
        ctx.save();
        ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#121612';
        ctx.fillRect(0, 0, W, H);
        this.drawNode(ctx, root, 0, 0, 1);
        ctx.restore();
    }
    drawNode(ctx, n, ox, oy, os) {
        if (!n.active)
            return;
        const x = ox + n._pos.x * os;
        const y = oy + n._pos.y * os;
        const s = os * n._scale.x; // 只用 x 缩放（游戏里 xy 同步）
        const rot = (n.angle * Math.PI) / 180;
        const sp = n.getComponent(Sprite);
        const lb = n.getComponent(Label);
        if (sp && sp.spriteFrame && sp.spriteFrame.rect && this.atlasCanvas) {
            const r = sp.spriteFrame.rect;
            ctx.save();
            ctx.translate(x, y);
            if (rot)
                ctx.rotate(-rot); // Cocos 角度逆时针为正，canvas 顺时针为正
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
        }
        else if (sp && !sp.spriteFrame) {
            // 无贴图矩形（理论不出现，mkRect 用 white 帧）
        }
        if (lb && lb.string) {
            ctx.save();
            ctx.translate(x, y);
            if (rot)
                ctx.rotate(-rot);
            const size = lb.fontSize * s;
            ctx.font = `${lb.isBold ? 'bold ' : ''}${size}px sans-serif`;
            ctx.textAlign = ['left', 'center', 'right'][lb.horizontalAlign] || 'center';
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
        for (const ch of n.children)
            this.drawNode(ctx, ch, x, y, s);
    }
}
export const renderer = new Renderer2D();
export const _decorator = {
    ccclass: (..._a) => (target) => target,
    property: (..._a) => () => undefined,
};
