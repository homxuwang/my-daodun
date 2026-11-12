import { Color, Label, Layers, Node, Sprite, UITransform, Vec3 } from 'cc';
import { Art } from './Art.js';
import { PX } from './Defs.js';
import { Sound } from './Sound.js';
export function mkNode(name, parent) {
    const n = new Node(name);
    n.layer = Layers.Enum.UI_2D;
    if (parent)
        parent.addChild(n);
    return n;
}
// 像素精灵：按原始尺寸 × scale 放大
export function mkSprite(parent, frame, scale = PX, name = frame) {
    const n = mkNode(name, parent);
    const s = n.addComponent(Sprite);
    s.sizeMode = Sprite.SizeMode.RAW;
    s.trim = false;
    s.spriteFrame = Art.f(frame);
    n.setScale(scale, scale, 1);
    return s;
}
// 纯色矩形（使用图集中的白色块，可与其它精灵合批）
export function mkRect(parent, w, h, color, name = 'rect', ax = 0.5, ay = 0.5) {
    const n = mkNode(name, parent);
    const s = n.addComponent(Sprite);
    s.sizeMode = Sprite.SizeMode.CUSTOM;
    s.trim = false;
    s.spriteFrame = Art.f('white');
    const ut = n.getComponent(UITransform);
    ut.setAnchorPoint(ax, ay);
    ut.setContentSize(w, h);
    s.color = color;
    return s;
}
// cache=true 时使用共享字符图集（CHAR 模式），只适合字符种类少、频繁变化的数字文本；
// 其余文本使用 NONE 模式，避免大量中文大字号把共享图集撑满导致文字不显示
export function mkLabel(parent, text, size, color = Color.WHITE, align = 'center', outline = 3, cache = false) {
    const n = mkNode('label', parent);
    const l = n.addComponent(Label);
    l.string = text;
    l.fontSize = size;
    l.lineHeight = size + 6;
    l.isBold = true;
    l.color = color;
    l.cacheMode = cache ? Label.CacheMode.CHAR : Label.CacheMode.NONE;
    if (outline > 0) {
        l.enableOutline = true;
        l.outlineColor = new Color(16, 10, 24, 255);
        l.outlineWidth = outline;
    }
    const ut = n.getComponent(UITransform);
    if (align === 'left') {
        l.horizontalAlign = Label.HorizontalAlign.LEFT;
        ut.setAnchorPoint(0, 0.5);
    }
    else if (align === 'right') {
        l.horizontalAlign = Label.HorizontalAlign.RIGHT;
        ut.setAnchorPoint(1, 0.5);
    }
    else {
        l.horizontalAlign = Label.HorizontalAlign.CENTER;
    }
    l.verticalAlign = Label.VerticalAlign.CENTER;
    return l;
}
export function setSize(n, w, h) {
    n.getComponent(UITransform).setContentSize(w, h);
}
const C_BORDER = new Color(214, 170, 70, 255);
// 像素风按钮：金边 + 深色底，按下缩放反馈
export function mkButton(parent, text, w, h, onClick, fill = new Color(120, 30, 40, 255), fontSize = 30) {
    const node = mkRect(parent, w, h, C_BORDER, 'btn').node;
    const bg = mkRect(node, w - 8, h - 8, fill, 'fill');
    const label = mkLabel(node, text, fontSize, Color.WHITE, 'center', 3);
    const base = new Vec3(1, 1, 1);
    node.on(Node.EventType.TOUCH_START, () => node.setScale(0.94, 0.94, 1));
    node.on(Node.EventType.TOUCH_CANCEL, () => node.setScale(base));
    node.on(Node.EventType.TOUCH_END, () => {
        node.setScale(base);
        Sound.play('click');
        onClick();
    });
    return { node, bg, label };
}
// 带边框的面板/卡片
export function mkPanel(parent, w, h, fill = new Color(36, 30, 64, 245), border = C_BORDER) {
    const b = mkRect(parent, w, h, border, 'panel');
    const f = mkRect(b.node, w - 6, h - 6, fill, 'fill');
    return { node: b.node, fill: f, border: b };
}
// 吞掉点击（用于遮罩）
export function blockTouches(n) {
    n.on(Node.EventType.TOUCH_START, (e) => { e.propagationStopped = true; });
    n.on(Node.EventType.TOUCH_END, (e) => { e.propagationStopped = true; });
}
