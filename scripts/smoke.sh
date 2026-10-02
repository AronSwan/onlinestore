#!/usr/bin/env bash
# 冒烟测试（认证 + 购物车关键链路）
# 前提：后端已在本机运行（默认 http://127.0.0.1:3000，SQLite 即可）。
# 用法：
#   bash scripts/smoke.sh              # 默认端口 3000
#   PORT=3690 bash scripts/smoke.sh    # 环境变量或第 1 参数指定端口
# 依赖：curl（Windows 构建需 --ssl-no-revoke）、python3（解析 JSON）。
# 结果：全部通过输出 SMOKE PASS 且 exit 0；任一步失败输出 SMOKE FAIL 与失败步并 exit 1。

set -uo pipefail

PORT="${PORT:-${1:-3000}}"
BASE="http://127.0.0.1:${PORT}"
TS="$(date +%s)"
USERNAME="smoke_${TS}"          # 契约：3-20 位，仅字母/数字/下划线
EMAIL="smoke_${TS}@example.com"
PASSWORD='Smoke%Pass1'          # 契约：>=8 位，含大小写字母/数字/特殊字符(@$!%*?&)
WRONG_PASSWORD='Wr0ng%Pass9'

fail() { echo "SMOKE FAIL: $1"; exit 1; }

# 请求封装：一次调用同时拿状态码与响应体 → 全局变量 CODE / BODY
CODE="" BODY=""
req() {
  local method="$1" path="$2" body="${3-}" token="${4-}" resp
  local args=(--ssl-no-revoke -s -S -X "$method" -w '\n%{http_code}')
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
  [[ -n "$body" ]] && args+=(-H 'Content-Type: application/json' -d "$body")
  if resp="$(curl "${args[@]}" "$BASE$path")"; then
    CODE="${resp##*$'\n'}"
    BODY="${resp%$'\n'*}"
  else
    CODE="000"; BODY=""
  fi
}

# json_field <json字符串> <键...>：取嵌套字段（对象键或数组下标），缺失输出空串
json_field() {
  printf '%s' "$1" | python3 -c '
import json, sys
try:
    cur = json.load(sys.stdin)
except Exception:
    cur = None
for key in sys.argv[1:]:
    if cur is None:
        break
    cur = cur[int(key)] if isinstance(cur, list) and key.isdigit() else cur.get(key)
print("" if cur is None else cur)
' "${@:2}"
}

echo "== smoke: base=$BASE user=$USERNAME =="

# 步骤 1：等待健康检查 200（最多 30 秒）
for _ in $(seq 1 30); do
  req GET /api/health
  [[ "$CODE" == "200" ]] && break
  sleep 1
done
[[ "$CODE" == "200" ]] || fail "步骤1 health 未就绪（期望 200，实际 ${CODE:-无响应}）"
echo "步骤1 health: 200"

# 步骤 2：唯一时间戳凭据注册；后端 @HttpCode(CREATED) 故接受 200/201，断言返回 access_token
req POST /api/auth/register "{\"username\":\"$USERNAME\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
case "$CODE" in 200|201) ;; *) fail "步骤2 register 期望 200/201，实际 $CODE，body=${BODY:0:300}" ;; esac
REGISTER_TOKEN="$(json_field "$BODY" access_token)"
SUB="$(json_field "$BODY" user id)"
[[ -n "$REGISTER_TOKEN" ]] || fail "步骤2 register 响应缺少 access_token，body=${BODY:0:300}"
[[ -n "$SUB" ]] || fail "步骤2 register 响应缺少 user.id（JWT sub），body=${BODY:0:300}"
echo "步骤2 register: $CODE + access_token（sub=$SUB）"

# 步骤 3：同凭据登录（LoginDto 以 email 登录），断言 200 + token
req POST /api/auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
[[ "$CODE" == "200" ]] || fail "步骤3 login 期望 200，实际 $CODE，body=${BODY:0:300}"
LOGIN_TOKEN="$(json_field "$BODY" access_token)"
[[ -n "$LOGIN_TOKEN" ]] || fail "步骤3 login 响应缺少 access_token，body=${BODY:0:300}"
echo "步骤3 login: 200 + access_token"

# 步骤 4：带 token 取购物车（参数化路由 /items/{sub}，sub 须等于 JWT sub），断言 200
req GET "/api/cart/items/$SUB" "" "$LOGIN_TOKEN"
[[ "$CODE" == "200" ]] || fail "步骤4 带 token GET /api/cart/items/$SUB 期望 200，实际 $CODE，body=${BODY:0:300}"
echo "步骤4 cart(带token): 200"

# 步骤 5：匿名访问同一路由，断言 401（JwtAuthGuard）
req GET "/api/cart/items/$SUB"
[[ "$CODE" == "401" ]] || fail "步骤5 匿名 GET /api/cart/items/$SUB 期望 401，实际 $CODE"
echo "步骤5 cart(匿名): 401"

# 步骤 6：错误密码登录，断言 401
req POST /api/auth/login "{\"email\":\"$EMAIL\",\"password\":\"$WRONG_PASSWORD\"}"
[[ "$CODE" == "401" ]] || fail "步骤6 错误密码登录期望 401，实际 $CODE，body=${BODY:0:300}"
echo "步骤6 login(错误密码): 401"

echo "SMOKE PASS"
exit 0
