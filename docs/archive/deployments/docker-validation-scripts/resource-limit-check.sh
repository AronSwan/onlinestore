#!/bin/bash
# 资源限制合理性检查脚本

# 获取脚本所在目录并加载工具函数
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

echo "=== 资源限制合理性检查 ==="

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

RES_FILE=$(mktemp)

for file in "${COMPOSE_FILES[@]}"; do
  echo "分析文件: $file"
  $COMPOSE_CMD -f "$file" config 2>/dev/null | \
  awk -v file="$file" '
    BEGIN{in_services=0; current_service=""}
    /^services:/ { in_services=1; next }
    in_services==1 && /^[[:space:]]{2}[A-Za-z0-9_-]+:/ {
      svc=$0; gsub(/^[[:space:]]+|:.*/, "", svc); current_service=svc
    }
    in_services==1 && /deploy:/ { in_deploy=1; next }
    in_deploy==1 && /resources:/ { in_res=1; next }
    in_res==1 && /limits:/ { in_limits=1; next }
    in_res==1 && /reservations:/ { in_reserv=1; next }
    in_limits==1 && /memory:/ { match($0, /memory:[[:space:]]*([0-9A-Za-z]+)/, arr); if(arr[1] != "") print file "|" current_service "|limit_memory|" arr[1] >> ENVIRON["RES_FILE"] }
    in_limits==1 && /cpus:/ { match($0, /cpus:[[:space:]]*([0-9\.]+)/, arr); if(arr[1] != "") print file "|" current_service "|limit_cpus|" arr[1] >> ENVIRON["RES_FILE"] }
    in_reserv==1 && /memory:/ { match($0, /memory:[[:space:]]*([0-9A-Za-z]+)/, arr); if(arr[1] != "") print file "|" current_service "|reserv_memory|" arr[1] >> ENVIRON["RES_FILE"] }
    in_reserv==1 && /cpus:/ { match($0, /cpus:[[:space:]]*([0-9\.]+)/, arr); if(arr[1] != "") print file "|" current_service "|reserv_cpus|" arr[1] >> ENVIRON["RES_FILE"] }
  ' RES_FILE="$RES_FILE"
done

RES_JSON="$TEMP_DIR/res_issues.json"
> "$RES_JSON"

if [ -s "$RES_FILE" ]; then
  echo "资源限制配置摘要："
  echo "文件 | 服务 | 项 | 值"
  echo "----|------|----|----"
  column -t -s '|' "$RES_FILE"
  # 结构化对象：每行一个明细
  while IFS='|' read -r file service key value; do
    [ -z "$service" ] && continue
    echo "{\"category\":\"resource\",\"file\":\"$file\",\"service\":\"$service\",\"issue\":\"resource_present\",\"message\":\"资源项存在\",\"recommendation\":\"确认数值单位与范围合理\",\"extra\":{\"key\":\"$key\",\"value\":\"$value\"}}" >> "$RES_JSON"
  done < "$RES_FILE"
else
  echo "⚠️ 未发现 deploy.resources 配置"
  echo "{\"category\":\"resource\",\"file\":\"\",\"service\":\"\",\"issue\":\"resources_missing\",\"message\":\"未发现任何 deploy.resources 配置\",\"recommendation\":\"为关键服务设置 limits/reservations\",\"extra\":{}}" >> "$RES_JSON"
fi

# 输出结构化 JSON 明细（供综合脚本抓取）
echo "## JSON_EMBED_START resource"
echo "{\"resource\": { \"details\": ["
if [ -f "$RES_JSON" ] && [ -s "$RES_JSON" ]; then
    awk 'BEGIN{first=1} { if(!first){printf ","}; first=0; printf "%s", $0 }' "$RES_JSON"
else
    echo ""
fi
echo "] } }"
echo "## JSON_EMBED_END resource"

rm -f "$RES_FILE" "$RES_JSON"
exit 0