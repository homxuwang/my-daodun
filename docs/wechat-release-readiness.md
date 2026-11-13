# 微信小游戏上线验收报告

检查日期：2026-11-12；目标日期：2026-11-13。

**结论：当前受阻，不能据此确认明天可直接正式上线。** 浏览器可玩与微信正式发布之间仍缺真实 AppID、实际构建、真机验收及微信后台审核等证据。

## 已验证与已修复

| 项目 | 结果 | 验证边界 |
| --- | --- | --- |
| 浏览器 TypeScript 检查 | 通过 | 使用项目兼容层 |
| 官方 Cocos Creator 3.8.8 API 类型检查 | 通过 | 使用固定版本 `@cocos/creator-types`，不是 Creator 构建或引擎运行 |
| 浏览器构建 | 通过 | 新角色源图和入口正常编译 |
| 游戏回归 | 123 项断言通过 | 含技能、充能、Boss 抗性、角色图集和模拟战斗；真实鼠标选角、键盘移动、暂停恢复、死亡结算重开、存档重载通过 |
| 发布与音频测试 | 28 项断言通过 | 使用隔离配置、模拟 Creator 与模拟 wx API；不代表微信真机通过 |
| 移动端首次启动 | 通过 | 浏览器移动设备模拟：启动 → 协议 → 触屏同意 → 主菜单 → 重载保留同意记录 |
| 真实微信游戏包 | 未生成 | 当前不存在 `build/wechatgame/game.js` 等必要产物 |
| iOS／Android 微信真机 | 未验证 | 本地浏览器不能替代 |
| 微信后台审核及发布时间 | 未核验 | 未取得账号状态；不能承诺平台审核完成时间 |

本轮修复：

- 修复真实引擎类型检查发现的 `renderer.buildAtlasCanvas` 调用错误；此方法仅在浏览器兼容层存在。
- 音频优先使用 `wx.createWebAudioContext`（或同构平台工厂），保留浏览器 AudioContext 回退；缺少音频 API 时不阻断游戏。
- 将浏览器入口迁至 `_shims/web-main.ts`，避免浏览器专用 API 进入 Creator 的 assets 目录；两种类型检查分别执行。
- 补齐新角色数据脚本的 Creator meta。
- 微信构建脚本支持通过 `CREATOR` 指定原生 macOS／Linux 或 WSL 下 Windows 可执行文件；不再无条件依赖 `wslpath`。
- 使用临时构建配置传入 AppID；成功退出后仍验证产物完整性与新鲜度，防止把旧包误判成新构建成功。
- 发布预检读取实际 TypeScript 导出值；注释里的 `false` 无法绕过正式广告、节日活动开关检查。
- 新增 AppID 一致性、竖屏、初始场景、开放数据域、工程类型及包体保守大小检查，统一包内项目名为“我的刀盾”。

## 当前阻断与待核验

1. **正式 AppID 为空**：`build-wechat.json` 和微信构建模板均未配置正式 AppID。
2. **当前环境未安装／未指定 Cocos Creator 3.8.8**：无法运行实际微信构建；官方类型检查不能代替构建。
3. **尚无真实微信产物**：无法确认实际压缩包大小、引擎启动与开发者工具导入结果。
4. **真机与微信后台状态未知**：需核验账号、平台要求的资质／备案、素材可商用或授权状态，以及代码审核结果；本地无法代查。

广告位和云环境 ID 为空：现有实现允许先无广告、仅本地存档运行，属于功能降级，不应填入伪造 ID；广告收益、云存档无法在当前配置下验收。好友排行需在真实微信环境验证。

完整机器检查结果见 [wechat-preflight.json](validation/wechat-preflight.json)，当前为 `blocked`；游戏断言记录见 [meme-regression.json](validation/meme-regression.json)。

## 具备 AppID 与构建环境后

```bash
npm ci
npm run check
npm run check:cocos
npm run test:wechat
# 指向你已安装的 3.8.8 可执行文件，并使用自己的真实 AppID：
CREATOR='/实际路径/CocosCreator' WECHAT_APPID='你的真实AppID' npm run build:wechat
# 持有同一 AppID，重新检查真实构建包：
CREATOR='/实际路径/CocosCreator' WECHAT_APPID='你的真实AppID' npm run check:wechat
```

Windows 用户也可在 Creator GUI 中选择微信小游戏、设置真实 AppID 与竖屏后构建，再运行 `node tools/wechat-postbuild.mjs`。`build-wechat/` 只有说明文件，**不要导入它**；应导入实际生成的 `build/wechatgame/`。

用微信开发者工具导入真实构建目录，扫码分别在 iOS 和 Android 验证首次启动协议、触摸摇杆、多指／取消、角色选择、升级／暂停／恢复、音效开关、后台切换、死亡／重开、退出重进存档、Boss 阶段及好友排行。建议至少完成一次正常速度整局；配置广告后额外验证看完、取消、拉取失败均不会错误发奖或卡住。

完成后上传版本，并在微信后台按账号当前流程提交审核；正式发布以平台审核结果为准。**上传测试、提交审核和正式上线是不同状态。**

## 复核命令

```bash
npm run check:cocos
npm run check
npm run build:web
npm run test:wechat
# 启动浏览器服务后运行：
GAME_URL=http://localhost:8092/web/ npm run test:meme
GAME_URL=http://localhost:8092/web/ npm run test:launch
npm run check:wechat
```

官方依据：[Cocos 3.8 微信发布流程](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-wechatgame.html)、[Creator 命令行与退出码](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-in-command-line.html)、[官方引擎类型声明](https://github.com/cocos/creator-types/releases)。


## 提审文案清理（2026-11-13）

Boss、怪物、图鉴与成就提示已同步采用虚构命名：铁甲梗将、弹幕伯爵、砍价小兵、弹幕捣蛋鬼；移除了对应真人指向、第三方品牌名称和脏话描述。Boss 现有绘图分别为全盔铁甲角色、幻想吸血鬼，未使用真人照片素材。角色 ID、数值、出场时间、成就 ID 和存档格式保持不变。

此项仅记录文案清理；现有角色 IP 与美术素材的授权状态仍未核验，不能据此认定素材已获授权或平台必然通过审核。其余构建、真机与后台状态以最新实测结果为准。


## 两名角色形象替换（2026-11-13）

`mage` 改为“奶娃”的幼童造型，`knight` 改为“泡泡团团”的泡泡机器人造型；对应头像、三帧动画、技能名、召唤物名、主菜单台词和截图已同步更新。替换源图已接入导入脚本，重建时不会恢复已停用的两个槽位。其他角色的美术数据保持不变。此项完成不代表其余素材授权及平台审核已通过。


## 角色称呼纠正：奶蛙（2026-11-13）

根据用户进一步明确，`mage` 应为网红“奶蛙”，而非人类幼童。已停用幼童源图槽位，改用独立的奶蛙源图；名称、头像、行走帧与技能文案同步修正。原机器人角色和其余阵容保持不变。此处仅记录实现变更，不改变既有素材授权待核验及真实微信构建／真机待验收状态。
