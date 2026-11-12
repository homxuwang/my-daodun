# 我的刀盾 · My Knife & Shield

以「我的刀盾」为主角、集合奶龙与 meme 元素的竖屏割草幸存者小游戏。
参考 [milky-frog（奶蛙割草）](https://github.com/ychisbest/milky-frog) 的架构与数值，
目标平台：微信小游戏、抖音小游戏（另附浏览器预览）。

设计文档：`docs/design-overview.md`（IP/怪物/武器替换表）、`docs/release-checklist.md`（上架清单）、参考工程 `docs/数值设计.md`（数值曲线）。

## 目录

```
assets/scripts/    Cocos TS 游戏逻辑（与参考工程同构，内容替换为奶娃主题）
assets/scenes/     Main.scene（Canvas + 自动挂 GameRoot）
_shims/            浏览器替身：cc / cc-env 最小实现 + 2D 渲染器
web/               浏览器预览外壳（index.html，由编译生成 js）
tools/             compile-web / serve / shot / build-wechat / wechat-postbuild
build-wechat/      微信小游戏壳（README 里是目标结构）
build-douyin/      抖音小游戏壳
docs/              设计文档
milky-frog/        参考工程（只读，不参与构建）
```

## 浏览器预览（无需 Cocos Creator）

```bash
npm install
npm run web        # 编译 + 启动 http://localhost:8090/web/
# 另开窗口截图验收：
node tools/shot.mjs http://localhost:8090/web/ /tmp/shot.png
```

- 源码保持无后缀相对导入（与 Cocos 兼容），编译时由 `tools/compile-web.mjs` 给产物补 `.js` 后缀。
- `cc` 模块由 `_shims/cc.ts` 提供：节点树 + 事件 + 一个 Canvas 2D 渲染器（把像素图集画出来）。
- 输入：触摸拖动 = 虚拟摇杆；键盘 WASD/方向键移动，1/2/3 选卡，空格/Q 大招，Esc 暂停。

## 类型检查

```bash
npm run check      # tsc -p tools/tsconfig.check.json（宽松 cc 声明，0 错误）
```

## 构建微信小游戏

```bash
npm run build:wechat   # tools/build-wechat.sh（需本机 Cocos Creator 3.8.8）
```

上线前检查（脚本会强制）：`AdConfig.debugFake === false`、`Defs.ts EVENT.force === false`。
构建后 `tools/wechat-postbuild.mjs` 自动放入开放数据域（好友排行）。

## 内容主题（相对参考工程）

| 参考（奶蛙系） | 本作（奶娃刀盾系） |
| --- | --- |
| 奶蛙主角 | 我的刀盾（头顶「菜」，菜刀+锅盾） |
| 蝌蚪/蛙舌 | 奶龙吐息、奶茶吸管 |
| 皮鞭/魔杖/镜盾… | 菜刀/奶茶枪/锅盖/唢呐/榴莲地雷…（24 武器改名不改数值） |
| 灰鼠/蝙蝠/史莱姆… | 梗图鼠/表情包鸽子/梗图史莱姆…（27 怪改名） |
| 月光草原…流沙荒漠 | 梗图草原…网速沙漠（5 图改名） |
| 广告/上架方案一 | 完全沿用（见参考工程 README） |

角色、大招、进化、命运卡牌、神兵、图鉴、每日任务、签到、成就等系统全部沿用参考工程实现。


## 常见坑

- **端口**：8080 常被其它服务占用，本项目脚本默认 **8090**（`npm run serve` / `npm run web`）。
- **源码不要加 `.ts` 导入后缀**：Cocos 构建与浏览器共用源码，后缀只在 `web/js` 产物里由 `compile-web.mjs` 补齐。
- **`tools/fix-imports.mjs` 已废弃**：它会把后缀写回源码、破坏 Cocos 兼容，现在直接退出。
- **截图验收**：`node tools/shot.mjs http://localhost:8090/web/index.html /tmp/shot.png`（`/web/` 与 `/web/index.html` 均可）。
- **页面报 `Unexpected token ')'`**：一定是某个 `.js` 产物语法坏了，先 `node --check` 全部 `web/js/**/*.js` 定位。
