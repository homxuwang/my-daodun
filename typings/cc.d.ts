// 宽松 cc 声明：给 npm run check 兑底（paths 已指向 _shims/cc.ts 时本文件不生效，但保留无 paths 的检查场景）
declare module 'cc' {
    const anyExport: any;
    export = anyExport;
}
declare module 'cc/env' {
    export const EDITOR: boolean;
    export const TEST: boolean;
    export const DEBUG: boolean;
    export const PREVIEW: boolean;
    export const BUILD: boolean;
    export const NATIVE: boolean;
    export const HTML5: boolean;
    export const MINIGAME: boolean;
    export const WECHATGAME: boolean;
    export const BYTEDANCE: boolean;
}
