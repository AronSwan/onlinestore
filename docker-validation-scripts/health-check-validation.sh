#!/bin/bash
# 健康检查配置验证脚本（深度解析）

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

echo "=== 健康检查配置验证（深度） ==="

TEMP_DIR=$(create_temp_dir)
ISSUES_FILE="$TEMP_DIR/hc_issues.txt"
ISSUES_JSON="$TEMP_DIR/hc_issues.json"
SUMMARY_FILE="$TEMP_DIR/hc_summary.txt"
> "$ISSUES_FILE"
> "$SUMMARY_FILE"
> "$ISSUES_JSON"

# 自动发现 compose 层叠链并获取 JSON 配置
mapfile -t files < <(discover_compose_files ".")

if [ ${#files[@]} -eq 0 ]; then
  print_message "warning" "未找到任何Docker Compose文件"
  echo "## JSON_EMBED_START health"
  echo '{"health": { "details": [] } }'
  echo "## JSON_EMBED_END health"
  exit 0
fi

config=$(get_compose_config "${files[0]}")

if [ -z "$config" ]; then
  print_message "error" "无法获取 Docker Compose 配置"
  exit 1
fi

# 解析服务列表
mapfile -t services < <(echo "$config" | jq -r '.services | keys[]')

for svc in "${services[@]}"; do
  # 端口（容器 target 端口列表）
  mapfile -t ports < <(echo "$config" | jq -r ".services[\"$svc\"].ports[]? | if type==\"object\" then .target else (split(\":\")[1]) end" 2>/dev/null | grep -E '^[0-9]+$')
  primary_port="${ports[0]}"
  
  # 健康检查对象
  hc=$(echo "$config" | jq -c ".services[\"$svc\"].healthcheck // empty")
  if [ -z "$hc" ] || [ "$hc" = "null" ]; then
    echo "MISSING|$svc|未配置健康检查" >> "$ISSUES_FILE"
    continue
  fi
  
  # 解析 test 数组/命令（组装为字符串便于匹配）
  test_cmd=$(echo "$hc" | jq -r '(.test // empty) | if type=="array" then join(" ") else . end')
  interval=$(echo "$hc" | jq -r '.interval // empty')
  timeout=$(echo "$hc" | jq -r '.timeout // empty')
  retries=$(echo "$hc" | jq -r '.retries // empty')
  start_period=$(echo "$hc" | jq -r '.start_period // empty')
  
  # 校验 test 存在
  if [ -z "$test_cmd" ]; then
    echo "ISSUE|$svc|缺少 test 命令" >> "$ISSUES_FILE"
    echo "{\"category\":\"health\",\"file\":\"\",\"service\":\"$svc\",\"type\":\"none\",\"issue\":\"missing_test\",\"message\":\"缺少 healthcheck.test\",\"recommendation\":\"使用 curl -sf http://localhost:<port>/health 或 nc -z localhost <port>\",\"extra\":{}}" >> "$ISSUES_JSON"
  else
    # 识别命令模式：curl/wget/nc 以及 URL 形式
    # URL 直接检查
    if [[ "$test_cmd" =~ (http|https)://([^/]+)(/[^ ]*) ]]; then
      scheme="${BASH_REMATCH[1]}"; host="${BASH_REMATCH[2]}"; path="${BASH_REMATCH[3]}"
      [[ "$scheme" =~ ^(http|https)$ ]] || { echo "ISSUE|$svc|不支持的协议: $scheme" >> "$ISSUES_FILE"; echo "{\"category\":\"health\",\"file\":\"\",\"service\":\"$svc\",\"type\":\"url\",\"issue\":\"unsupported_protocol\",\"message\":\"协议 $scheme 不受支持\",\"recommendation\":\"使用 http/https\",\"extra\":{\"scheme\":\"$scheme\"}}" >> "$ISSUES_JSON"; }
      if [ -z "$path" ] || [ "$path" = "/" ]; then { echo "ISSUE|$svc|健康检查URL路径为空" >> "$ISSUES_FILE"; echo "{\"category\":\"health\",\"file\":\"\",\"service\":\"$svc\",\"type\":\"url\",\"issue\":\"empty_path\",\"message\":\"健康检查路径为空\",\"recommendation\":\"设置 /health 或具体探针路径\",\"extra\":{}}" >> "$ISSUES_JSON"; } fi
      # 主机端口抽取
      hp=""; if [[ "$host" =~ :([0-9]+)$ ]]; then hp="${BASH_REMATCH[1]}"; fi
      if [[ "$host" =~ ^(localhost|127\.0\.0\.1|\[::1\]) ]]; then
        if [ -n "$primary_port" ] && [ -n "$hp" ] && [ "$hp" != "$primary_port" ]; then
          echo "ISSUE|$svc|服务端口($primary_port)与健康检查端口($hp)不一致" >> "$ISSUES_FILE"
          echo "{\"category\":\"health\",\"file\":\"\",\"service\":\"$svc\",\"type\":\"url\",\"issue\":\"port_mismatch\",\"message\":\"URL 端口 $hp 与服务端口 $primary_port 不一致\",\"recommendation\":\"统一健康检查端口与服务主端口\",\"extra\":{\"urlPort\":\"$hp\",\"servicePort\":\"$primary_port\"}}" >> "$ISSUES_JSON"
        fi
      fi
    fi
    # curl --fail
    if [[ "$test_cmd" =~ (^|[[:space:]])curl[[:space:]] ]]; then
      [[ "$test_cmd" =~ -s ]] || { echo "ISSUE|$svc|curl 建议添加 -s 静默模式" >> "$ISSUES_FILE"; echo "{\"category\":\"health\",\"file\":\"\",\"service\":\"$svc\",\"type\":\"curl\",\"issue\":\"missing_silent\",\"message\":\"未使用 -s\",\"recommendation\":\"curl -sf -H 'Accept: application/json' ...\",\"extra\":{}}" >> "$ISSUES_JSON"; }
      [[ "$test_cmd" =~ --fail ]] || { echo "ISSUE|$svc|curl 健康检查缺少 --fail" >> "$ISSUES_FILE"; echo "{\"category\":\"health\",\"file\":\"\",\"service\":\"$svc\",\"type\":\"curl\",\"issue\":\"missing_fail\",\"message\":\"未使用 --fail\",\"recommendation\":\"curl -sf --fail ...\",\"extra\":{}}" >> "$ISSUES_JSON"; }
      [[ "$test_cmd" =~ -H[[:space:]] ]] || { echo "ISSUE|$svc|curl 建议添加自定义 Header" >> "$ISSUES_FILE"; echo "{\"category\":\"health\",\"file\":\"\",\"service\":\"$svc\",\"type\":\"curl\",\"issue\":\"missing_header\",\"message\":\"未设置 Header\",\"recommendation\":\"使用 -H 'Accept: application/json' 或认证头\",\"extra\":{}}" >> "$ISSUES_JSON"; }
      if [[ "$test_cmd" =~ (http|https)://([^/ ]+)(/[^ ]*) ]]; then
        host="${BASH_REMATCH[2]}"; hp=""; if [[ "$host" =~ :([0-9]+)$ ]]; then hp="${BASH_REMATCH[1]}"; fi
        if [[ "$host" =~ ^(localhost|127\.0\.0\.1|\[::1\]) ]] && [ -n "$primary_port" ] && [ -n "$hp" ] && [ "$hp" != "$primary_port" ]; then
          echo "ISSUE|$svc|curl URL 端口($hp)与服务端口($primary_port)不一致" >> "$ISSUES_FILE"
          echo "{\"category\":\"health\",\"file\":\"\",\"service\":\"$svc\",\"type\":\"curl\",\"issue\":\"port_mismatch\",\"message\":\"curl URL 端口 $hp 与服务端口 $primary_port 不一致\",\"recommendation\":\"使用 localhost:<servicePort> 或修正服务映射\",\"extra\":{\"urlPort\":\"$hp\",\"servicePort\":\"$primary_port\"}}" >> "$ISSUES_JSON"
        fi
      fi
    fi
    # wget
    if [[ "$test_cmd" =~ (^|[[:space:]])wget[[:space:]] ]]; then
      if [[ "$test_cmd" =~ (http|https)://([^/ ]+)(/[^ ]*) ]]; then
        host="${BASH_REMATCH[2]}"; hp=""; if [[ "$host" =~ :([0-9]+)$ ]]; then hp="${BASH_REMATCH[1]}"; fi
        if [[ "$host" =~ ^(localhost|127\.0\.0\.1|\[::1\]) ]] && [ -n "$primary_port" ] && [ -n "$hp" ] && [ "$hp" != "$primary_port" ]; then
          echo "ISSUE|$svc|wget URL 端口($hp)与服务端口($primary_port)不一致" >> "$ISSUES_FILE"
          echo "{\"category\":\"health\",\"file\":\"\",\"service\":\"$svc\",\"type\":\"wget\",\"issue\":\"port_mismatch\",\"message\":\"wget URL 端口 $hp 与服务端口 $primary_port 不一致\",\"recommendation\":\"使用 localhost:<servicePort> 或修正服务映射\",\"extra\":{\"urlPort\":\"$hp\",\"servicePort\":\"$primary_port\"}}" >> "$ISSUES_JSON"
        fi
      fi
    fi
    # nc
    if [[ "$test_cmd" =~ (^|[[:space:]])nc[[:space:]]+-z[[:space:]]+([^[:space:]]+)[[:space:]]+([0-9]+) ]]; then
      nchost="${BASH_REMATCH[2]}"; ncport="${BASH_REMATCH[3]}"
      if [[ "$nchost" =~ ^(localhost|127\.0\.0\.1|\[::1\]) ]] && [ -n "$primary_port" ] && [ "$ncport" != "$primary_port" ]; then
        echo "ISSUE|$svc|nc 端口($ncport)与服务端口($primary_port)不一致" >> "$ISSUES_FILE"
        echo "{\"category\":\"health\",\"file\":\"\",\"service\":\"$svc\",\"type\":\"nc\",\"issue\":\"port_mismatch\",\"message\":\"nc 检查端口 $ncport 与服务端口 $primary_port 不一致\",\"recommendation\":\"nc -z localhost <servicePort>\",\"extra\":{\"ncPort\":\"$ncport\",\"servicePort\":\"$primary_port\"}}" >> "$ISSUES_JSON"
      fi
    fi
  fi
  
  # 时间单位校验（秒）
  validate_duration() {
    local name="$1"; local val="$2"; local min="$3"; local max="$4"
    if [ -z "$val" ] || ! [[ "$val" =~ ^([0-9]+)s$ ]]; then
      echo "ISSUE|$svc|$name 未设置或单位错误(需例如 5s)" >> "$ISSUES_FILE"
      return
    fi
    local n="${BASH_REMATCH[1]}"
    if [ -n "$min" ] && [ "$n" -lt "$min" ]; then
      echo "ISSUE|$svc|$name($val) 过短，建议 ≥ ${min}s" >> "$ISSUES_FILE"
    fi
    if [ -n "$max" ] && [ "$n" -gt "$max" ]; then
      echo "ISSUE|$svc|$name($val) 过长，建议 ≤ ${max}s" >> "$ISSUES_FILE"
    fi
  }
  validate_duration "interval" "$interval" 5 ""
  validate_duration "timeout" "$timeout" 1 30
  validate_duration "start_period" "$start_period" 10 ""
  
  # 重试次数
  if [ -z "$retries" ] || ! [[ "$retries" =~ ^[0-9]+$ ]]; then
    echo "ISSUE|$svc|retries 未设置或非数字" >> "$ISSUES_FILE"
  elif [ "$retries" -gt 5 ]; then
    echo "ISSUE|$svc|retries($retries) 过多，建议 ≤ 5" >> "$ISSUES_FILE"
  fi
  
  echo "OK|$svc|健康检查已配置" >> "$SUMMARY_FILE"
done

# 汇总输出
echo "=== 健康检查摘要 ==="
if [ -s "$SUMMARY_FILE" ]; then
  echo "服务 | 状态"
  echo "----|-----"
  cut -d'|' -f2,1 "$SUMMARY_FILE" | awk -F'|' '{printf "%-30s | %s\n", $1, $2}'
fi

echo "=== 健康检查问题 ==="
if [ -s "$ISSUES_FILE" ]; then
  while IFS='|' read -r type svc msg; do
    print_message "warning" "$svc: $msg"
  done < "$ISSUES_FILE"
else
  print_message "success" "未发现健康检查配置问题"
fi

rm -rf "$TEMP_DIR"
exit 0