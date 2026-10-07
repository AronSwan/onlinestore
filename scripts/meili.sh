#!/usr/bin/env bash
# 本地单文件 MeiliSearch 启停（2026-10-07 A 方案立；Docker 缺失的替代路径）
# 用法：bash scripts/meili.sh start|stop|status
# 密钥与 backend/.env MEILISEARCH_API_KEY 同值；存量灌数据：node scripts/reindex-meili.mjs
set -e
cd "$(dirname "$0")/.."
KEY="master-key-change-in-production"
case "$1" in
  start)
    if curl -s --noproxy '*' http://127.0.0.1:7700/health | grep -q available; then echo "meili already up"; exit 0; fi
    mkdir -p .local-meili-data
    env -u no_proxy -u NO_PROXY -u http_proxy -u HTTP_PROXY -u https_proxy -u HTTPS_PROXY -u all_proxy -u ALL_PROXY \
      powershell -NoProfile -Command "Start-Process -FilePath '.local-meilisearch.exe' -ArgumentList '--db-path','.local-meili-data','--master-key','$KEY','--http-addr','127.0.0.1:7700','--env','development','--no-analytics' -RedirectStandardOutput '.local-meili.log' -RedirectStandardError '.local-meili.err' -WindowStyle Hidden"
    sleep 4
    curl -s --noproxy '*' http://127.0.0.1:7700/health && echo " (up)"
    ;;
  stop)
    powershell -NoProfile -Command "Get-Process meilisearch*,.local-meilisearch* -ErrorAction SilentlyContinue | Stop-Process -Force" 2>/dev/null || true
    echo "meili stopped"
    ;;
  status)
    curl -s --noproxy '*' http://127.0.0.1:7700/health && echo " (up)" || echo "meili down"
    ;;
  *) echo "usage: bash scripts/meili.sh start|stop|status"; exit 1;;
esac
