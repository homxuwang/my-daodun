# 上架清单（微信 / 抖音小游戏）

## 通用（两平台）

- [ ] 游戏名：微信填「奶娃割草」，抖音同名（后台与 `GameRoot.ts` 的 `GAME_NAME` 保持一致）
- [ ] 软件著作权证书（休闲游戏类目必需）
- [ ] 小程序/小游戏备案（国内平台要求）
- [ ] 隐私政策与用户协议：游戏内展示全文（`Legal.ts`），不跳外链
- [ ] 适龄提示 12+（启动页展示）
- [ ] 分享不发放任何奖励（平台禁止诱导分享）——本作分享只发战绩
- [ ] 上线前构建门槛：`AdConfig.debugFake === false`、`Defs.ts EVENT.force === false`（build-wechat.sh 强制 grep）

## 微信小游戏

- [ ] 用微信开发者工具打开 `build/wechatgame`，填正式 AppID
- [ ] 流量主：累计 UV 1000 后开通，创建激励视频 + 插屏广告位
- [ ] 广告位 ID 填入 `assets/scripts/AdConfig.ts`（`rewarded` / `interstitial`，或 `rewardedByPlace` 分位置）
- [ ] 「设置 → 用户隐私保护指引」如实填写（游戏不调用需授权隐私接口，广告由平台提供）
- [ ] 未成年人防沉迷由微信平台统一处理，无需自行接入
- [ ] 好友排行：构建后跑 `node tools/wechat-postbuild.mjs`（开放数据域写入 game.json）
- [ ] 云存档（可选）：`SocialConfig.cloudEnv` 填云开发环境 ID，数据库建 `saves` 集合（仅创建者可读写）
- [ ] 埋点：微信「We 分析 → 自定义分析」登记 `docs/埋点方案.md` 的事件 ID 后 `Analytics.track` 才会落库

## 抖音小游戏

- [ ] 抖音开放平台建小游戏，拿 appid 填进抖音构建配置
- [ ] `AdConfig.ts` 的广告位换成抖音激励/插屏 ID（`mgApi()` 已兼容 tt）
- [ ] 录屏分享：`Recorder.ts` 自动生效（开局录制，结算分享视频，不发奖）
- [ ] 好友排行：抖音无开放数据域，首次版本隐藏排行入口（`SocialConfig.friendRank = false`）
- [ ] 埋点：抖音后台登记事件后 `tt.reportAnalytics` 生效

## 建议节奏

1. 先浏览器预览验收内容（`npm run web`）→ 2. Cocos 构建微信包 → 3. 微信开发者工具真机预览 →
4. 提审前跑 `tools/build-wechat.sh`（内置两道上线门槛）→ 5. 抖音壳复用同一构建产物。
