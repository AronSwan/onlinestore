#!/usr/bin/env bash
# dev.sh — 本地双服务一键起停（实战检验教训固化：2026-10-04 两次服务全挂，均因进程挂在临时 shell 上被收割）
# 用法: bash scripts/dev.sh start|stop|status|restart
# 注意: 后端启动需 60-90s（Redis/OpenObserve 不可达时重试超时，属已知环境噪音）；vite 绑 IPv6，健康检查用 localhost 而非 127.0.0.1
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_PID_FILE="/tmp/onlinestore-backend.pid"
VITE_PID_FILE="/tmp/onlinestore-vite.pid"

health() {
  curl -s --noproxy '*' -m 5 -o /dev/null -w '%{http_code}' "http://localhost:$1/${2:-}" 2>/dev/null
}

wait_healthy() { # url_path port label max_wait_s
  local waited=0 code
  while [ $waited -lt "${4:-120}" ]; do
    code=$(health "$2" "$3")
    [ "$code" = "200" ] && echo "  ✓ $1 就绪 (${waited}s)" && return 0
    sleep 5; waited=$((waited+5))
  done
  echo "  ✗ $1 未在 ${4:-120}s 内就绪 (last=$code)"; return 1
}

start_one() { # name pidfile cwd cmd port healthpath
  if [ -f "$2" ] && kill -0 "$(cat "$2")" 2>/dev/null; then echo "$1 已运行 (PID $(cat "$2"))"; return 0; fi
  echo "启动 $1 ..."
  (cd "$3" && nohup $4 > "/tmp/onlinestore-$5.log" 2>&1 & echo $! > "$2")
  wait_healthy "$1" "$6" "$7" 120
}

case "${1:-status}" in
  start)
    start_one "后端(3777)" "$BACKEND_PID_FILE" "$ROOT/backend" "node dist/src/main.js" backend 3777 "api/products"
    start_one "前端(5173)" "$VITE_PID_FILE" "$ROOT" "npx vite --port 5173" vite 5173 ""
    echo "前端: http://localhost:5173  后端: http://localhost:3777/api"
    ;;
  stop)
    for f in "$BACKEND_PID_FILE" "$VITE_PID_FILE"; do
      if [ -f "$f" ]; then
        pid=$(cat "$f")
        if kill -0 "$pid" 2>/dev/null; then kill "$pid" && echo "已停止 PID $pid"; else echo "PID $pid 已不在"; fi
        rm -f "$f"
      fi
    done
    # 兜底：清残留监听（可能被别的 shell 拉起而无 pid 文件）
    for port in 3777 5173; do
      pid=$(netstat -ano | grep ":$port" | grep LISTENING | head -1 | awk '{print $NF}')
      [ -n "$pid" ] && taskkill //PID "$pid" //F >/dev/null 2>&1 && echo "兜底清理 :$port PID $pid"
    done
    ;;
  status)
    bcode=$(health 3777 "api/products"); [ "$bcode" = "200" ] && echo "后端(:3777) 运行中" || echo "后端(:3777) DOWN (code=$bcode)"
    fcode=$(health 5173 ""); [ "$fcode" = "200" ] && echo "前端(:5173) 运行中" || echo "前端(:5173) DOWN (code=$fcode)"
    ;;
  restart) bash "$0" stop; bash "$0" start ;;
  *) echo "用法: bash scripts/dev.sh start|stop|status|restart"; exit 1 ;;
esac
