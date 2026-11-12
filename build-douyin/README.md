# build-douyin · 抖音小游戏壳

目标：同一套 Cocos 构建产物适配抖音（tt.* API）。

差异点（相对微信）：
- API 前缀 wx → tt（AdConfig/Social/Recorder 已做 mgApi 兼容）
- 录屏分享：tt.getGameRecorderManager（Recorder.ts 已实现）
- 开放数据域/好友排行：抖音用开放数据能力不同，首版可隐藏排行入口
- appid 换成抖音小游戏 ID

结构（后续实现）：game.js / game.json / project.config.json（抖音版）
