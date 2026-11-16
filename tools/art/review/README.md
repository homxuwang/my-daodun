# 适龄提示标识素材

`cadpa-12-source.png` 是完整蓝色 12+ 标识原图（810×1038），来自腾讯 Nintendo Switch 站点公开素材：
https://switch-cn.gtgres.com/global-image/97fcdd30-5d9e-11ec-abbd-e1aeab85f975.png

来源记录也可在 https://commons.wikimedia.org/wiki/File:CADPA_12%2B.png 查看。标识设计归属 CADPA；这里使用腾讯托管的原始 PNG，不使用第三方重绘 SVG，也不表示游戏已获得认证或审核通过。

`node tools/import-review-badge.mjs` 将其等比例缩放至 135×173，保留完整文字、构图与颜色并编码到 `assets/scripts/ReviewBadge.ts`。游戏通过统一图集显示。不要自行重绘、裁掉中文、改变比例或替换为其他年龄图样。
