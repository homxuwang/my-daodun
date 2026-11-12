# build-wechat · 微信小游戏壳

目标：把 Cocos 构建产物（build/wechatgame）与本目录合并为可上传的微信小游戏包。

结构（后续实现）：
- game.js        入口：加载引擎 + 启动
- game.json      deviceOrientation=portrait、openDataContext
- project.config.json  appid、projectname=奶娃割草
- openDataContext/     好友排行（共享画布）
- 适配：wx.getSystemInfoSync 安全区/胶囊、激励视频/插屏、分享、vibrate

构建命令：npm run build:wechat（tools/build-wechat.sh）
