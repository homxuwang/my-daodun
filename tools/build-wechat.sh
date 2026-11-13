#!/usr/bin/env bash
# CREATOR=/path/to/CocosCreator WECHAT_APPID=wx... npm run build:wechat
set -euo pipefail
cd "$(dirname "$0")/.."
APP_ID="${1:-${WECHAT_APPID:-}}"
CHECK_ARGS=()
if [ -n "$APP_ID" ]; then CHECK_ARGS+=(--appid "$APP_ID"); fi
node tools/wechat-preflight.mjs "${CHECK_ARGS[@]}"
npm run check:cocos
if [ -z "${CREATOR:-}" ] || [ ! -f "$CREATOR" ]; then
  echo '构建中止：请安装 Cocos Creator 3.8.8，并将 CREATOR 设置为其可执行文件完整路径。' >&2
  exit 1
fi
PROJECT_PATH="$PWD"
mkdir -p build
CONFIG_PATH="$PWD/build/.wechat-build-config.json"
node --input-type=module - "$APP_ID" "$CONFIG_PATH" <<'JS'
import fs from 'node:fs';
const config=JSON.parse(fs.readFileSync('build-wechat.json','utf8'));
if(process.argv[2])config.packages.wechatgame.appid=process.argv[2];
if(!config.packages.wechatgame.appid)config.packages.wechatgame.appid=JSON.parse(fs.readFileSync('build-templates/wechatgame/project.config.json','utf8')).appid;
fs.writeFileSync(process.argv[3],JSON.stringify(config,null,2));
JS
trap 'rm -f "$CONFIG_PATH"' EXIT
# Windows executables launched from WSL require Windows paths; native macOS/Linux do not.
if [[ "$CREATOR" == *.exe ]] && command -v wslpath >/dev/null 2>&1; then
  PROJECT_PATH="$(wslpath -w "$PWD")"
  CONFIG_PATH_NATIVE="$(wslpath -w "$CONFIG_PATH")"
else
  CONFIG_PATH_NATIVE="$CONFIG_PATH"
fi
set +e
"$CREATOR" --project "$PROJECT_PATH" --build "configPath=$CONFIG_PATH_NATIVE" > build/build-wechat.log 2>&1
code=$?
set -e
if [ "$code" -ne 36 ] && [ "$code" -ne 0 ]; then
  echo "构建失败（退出码 $code），日志：build/build-wechat.log" >&2; exit 1
fi
# Never accept a successful process exit as proof that a runnable game was built.
for file in game.js game.json project.config.json; do
  if [ ! -f "build/wechatgame/$file" ] || [ "build/wechatgame/$file" -ot "$CONFIG_PATH" ]; then
    echo "构建产物缺失或陈旧：build/wechatgame/$file，请检查构建日志。" >&2; exit 1
  fi
done
node tools/wechat-postbuild.mjs
node tools/wechat-preflight.mjs "${CHECK_ARGS[@]}" --package build/wechatgame --report build/wechat-preflight.json
echo '本地构建与包结构检查通过：build/wechatgame。下一步必须用微信开发者工具导入并真机验收。'
