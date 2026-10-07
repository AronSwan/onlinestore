#!/usr/bin/env bash
# 本地 Zinc 备引擎启停（2026-10-07 实测立；主引擎 meili.sh，降级链已验）
# 用法：bash scripts/zinc.sh start|stop|status
# 凭据与 compose 默认一致（backend zincsearch.service 同款兜底值）；灌数据：node scripts/reindex-zinc.mjs
set -e
cd "$(dirname "$0")/.."
case "$1" in
  start)
    if curl -s --noproxy '*' -u admin:CHANGE_ME_zinc_admin_password http://127.0.0.1:4080/healthz | grep -q ok; then echo "zinc already up"; exit 0; fi
    env -u no_proxy -u NO_PROXY -u http_proxy -u HTTP_PROXY -u https_proxy -u HTTPS_PROXY -u all_proxy -u ALL_PROXY \
      ZINC_FIRST_ADMIN_USER=admin ZINC_FIRST_ADMIN_PASSWORD=CHANGE_ME_zinc_admin_password \
      powershell -NoProfile -Command "Start-Process -FilePath '.local-zinc/zincsearch.exe' -ArgumentList '--server','--mode','standalone' -WorkingDirectory '.local-zinc' -RedirectStandardOutput '.local-zinc.log' -RedirectStandardError '.local-zinc.err' -WindowStyle Hidden"
    sleep 5
    curl -s --noproxy '*' -u admin:CHANGE_ME_zinc_admin_password http://127.0.0.1:4080/healthz && echo " (up)"
    ;;
  stop)
    powershell -NoProfile -Command "Get-Process zincsearch* -ErrorAction SilentlyContinue | Stop-Process -Force" 2>/dev/null || true
    echo "zinc stopped"
    ;;
  status)
    curl -s --noproxy '*' -u admin:CHANGE_ME_zinc_admin_password http://127.0.0.1:4080/healthz && echo " (up)" || echo "zinc down"
    ;;
  *) echo "usage: bash scripts/zinc.sh start|stop|status"; exit 1;;
esac
