#!/bin/bash
# 卷映射冲突检测脚本

# 获取脚本所在目录并加载工具函数
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

echo "=== 卷映射冲突检测 ==="

# 选择 Docker Compose 命令（v2 优先）
if docker compose version > /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif docker-compose version > /dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ 未检测到 Docker Compose，请安装 docker compose 或 docker-compose"
    exit 1
fi

# 自动发现所有 docker-compose 文件
mapfile -t COMPOSE_FILES < <(find . -type f \( -name "docker-compose.yml" -o -name "docker-compose.yaml" -o -name "docker-compose*.yml" -o -name "docker-compose*.yaml" \))
if [ ${#COMPOSE_FILES[@]} -eq 0 ]; then
    echo "⚠️ 未发现任何 docker-compose 文件"
fi

VOL_FILE=$(mktemp)
NAMED_VOL_FILE=$(mktemp)

for file in "${COMPOSE_FILES[@]}"; do
  echo "分析文件: $file"
  $COMPOSE_CMD -f "$file" config 2>/dev/null | \
  awk -v file="$file" '
    BEGIN { in_services=0; current_service="" }
    /^services:/ { in_services=1; next }
    in_services==1 && /^[[:space:]]{2}[A-Za-z0-9_-]+:/ {
      svc=$0; gsub(/^[[:space:]]+|:.*/, "", svc); current_service=svc
    }
    # 匹配挂载行
    in_services==1 && /^[[:space:]]*-?[[:space:]]*[^:]+:[^:]+/ {
      line=$0
      gsub(/^[[:space:]]*-?[[:space:]]*/, "", line)
      split(line, parts, ":")
      host=parts[1]; cont=parts[2]
      sub(/[[:space:]].*$/, "", host); sub(/[[:space:]].*$/, "", cont)
      print file "|" current_service "|" host "|" cont >> ENVIRON["VOL_FILE"]
    }
    # 顶层命名卷
    /^volumes:/ { in_vols=1; next }
    in_vols==1 && /^[[:space:]]{2}[A-Za-z0-9_-]+:/ {
      name=$0; gsub(/^[[:space:]]+|:.*/, "", name); print file "|" name >> ENVIRON["NAMED_VOL_FILE"]
    }
  ' VOL_FILE="$VOL_FILE" NAMED_VOL_FILE="$NAMED_VOL_FILE"
done

# 主机路径冲突
if [ -s "$VOL_FILE" ]; then
  echo "检查主机路径冲突..."
  cut -d'|' -f3 "$VOL_FILE" | sort | uniq -d | while read -r host; do
    [ -z "$host" ] && continue
    echo "❌ 发现主机路径复用: $host"
    grep "|$host|" "$VOL_FILE" | sed 's/^/  - /'
  done
else
  echo "✅ 未发现卷映射配置或无冲突"
fi

# 命名卷列表
if [ -s "$NAMED_VOL_FILE" ]; then
  echo "命名卷列表:"
  column -t -s '|' "$NAMED_VOL_FILE"
fi

# 结构化 JSON 明细
JSON_FILE=$(mktemp)
> "$JSON_FILE"
# 主机路径复用对象
if [ -s "$VOL_FILE" ]; then
  cut -d'|' -f3 "$VOL_FILE" | sort | uniq -d | while read -r host; do
    [ -z "$host" ] && continue
    grep "|$host|" "$VOL_FILE" | while IFS='|' read -r file svc hostp contp; do
      echo "{\"category\":\"volume\",\"file\":\"$file\",\"service\":\"$svc\",\"issue\":\"volume_host_conflict\",\"message\":\"主机路径复用\",\"recommendation\":\"避免不同服务复用同一路径或使用命名卷\",\"extra\":{\"hostPath\":\"$hostp\",\"containerPath\":\"$contp\"}}" >> "$JSON_FILE"
    done
  done
fi
# 输出结构化 JSON 明细（供综合脚本抓取）
echo "## JSON_EMBED_START volume"
echo "{\"volume\": { \"details\": ["
awk 'BEGIN{first=1} { if(!first){printf ","}; first=0; printf "%s", $0 }' "$JSON_FILE"
echo "] } }"
echo "## JSON_EMBED_END volume"

rm -f "$VOL_FILE" "$NAMED_VOL_FILE" "$JSON_FILE"
exit 0