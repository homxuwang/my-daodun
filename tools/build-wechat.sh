#!/bin/bash
# 构建微信小游戏包 → build/wechatgame（需本机安装 Cocos Creator 3.8.8，WSL 下调用 Windows 版）
# 用法：tools/build-wechat.sh [AppID]
set -e
cd "$(dirname "$0")/.."
if [ -n "$1" ]; then
  python3 - "$1" <<'PY'
import json, sys
p = 'build-wechat.json'
d = json.load(open(p, encoding='utf-8'))
d['packages']['wechatgame']['appid'] = sys.argv[1]
json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
PY
fi
grep -q "debugFake: false" assets/scripts/AdConfig.ts || { echo "❌ AdConfig.debugFake 不是 false"; exit 1; }
grep -q "force: false }" assets/scripts/Defs.ts || { echo "❌ Defs.ts 中 EVENT.force 不是 false"; exit 1; }
CREATOR=${CREATOR:-/mnt/c/ProgramData/cocos/editors/Creator/3.8.8/CocosCreator.exe}
WIN_ROOT=$(wslpath -w "$PWD")
mkdir -p build
set +e
"$CREATOR" --project "$WIN_ROOT" --build "configPath=$WIN_ROOT\\build-wechat.json" > build/build-wechat.log 2>&1
code=$?
set -e
if [ $code -ne 36 ] && [ $code -ne 0 ]; then echo "❌ 构建失败（退出码 $code），日志：build/build-wechat.log"; exit 1; fi
sed -i 's/"projectname":"[^"]*"/"projectname":"奶娃割草"/' build/wechatgame/project.config.json
if [ -f build/wechatgame/first-screen.js ]; then
  sed -i 's/^let useLogo = true;/let useLogo = false;/' build/wechatgame/first-screen.js
  rm -f build/wechatgame/logo.png build/wechatgame/slogan.png
fi
node tools/wechat-postbuild.mjs
echo "✅ 构建完成：build/wechatgame（$(du -sh build/wechatgame | cut -f1)，主包上限 4MB）"
