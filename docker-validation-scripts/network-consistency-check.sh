#!/bin/bash
# 网络配置一致性验证脚本

# 获取脚本所在目录并加载工具函数
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

echo "=== 网络配置一致性验证 ==="

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

SUBNETS_FILE=$(mktemp)
NETWORKS_FILE=$(mktemp)
SERVICES_NET_FILE=$(mktemp)

for file in "${COMPOSE_FILES[@]}"; do
  echo "分析文件: $file"
  $COMPOSE_CMD -f "$file" config 2>/dev/null | \
  awk -v file="$file" '
    BEGIN { in_networks=0; in_services=0; current_service="" }
    /^networks:/ { in_networks=1; in_services=0; next }
    /^services:/ { in_services=1; in_networks=0; next }
    in_networks==1 && /^[[:space:]]{2}[A-Za-z0-9_-]+:/ {
      name=$0; gsub(/^[[:space:]]+|:.*/, "", name); print file "|" name >> ENVIRON["NETWORKS_FILE"]
    }
    in_networks==1 && /subnet:/ {
      match($0, /subnet:[[:space:]]*([0-9\.\/]+)/, arr)
      if (arr[1] != "") { print file "|" arr[1] >> ENVIRON["SUBNETS_FILE"] }
    }
    in_services==1 && /^[[:space:]]{2}[A-Za-z0-9_-]+:/ {
      svc=$0; gsub(/^[[:space:]]+|:.*/, "", svc); current_service=svc
    }
    in_services==1 && /^[[:space:]]*-?[[:space:]]*[A-Za-z0-9_-]+$/ {
      line=$0; gsub(/^[[:space:]]*-?[[:space:]]*/, "", line);
      print file "|" current_service "|" line >> ENVIRON["SERVICES_NET_FILE"]
    }
  ' NETWORKS_FILE="$NETWORKS_FILE" SUBNETS_FILE="$SUBNETS_FILE" SERVICES_NET_FILE="$SERVICES_NET_FILE"
done

# 子网冲突
if [ -s "$SUBNETS_FILE" ]; then
  echo "检查网络子网冲突..."
  cut -d'|' -f2 "$SUBNETS_FILE" | sort | uniq -d | while read -r subnet; do
    [ -z "$subnet" ] && continue
    echo "❌ 发现子网冲突: $subnet"
    grep "|$subnet$" "$SUBNETS_FILE" | sed 's/^/  - /'
  done
else
  echo "✅ 未发现子网配置或无冲突"
fi

# 服务网络连接
if [ -s "$SERVICES_NET_FILE" ]; then
  echo "服务与网络连接关系:"
  echo "文件 | 服务 | 网络"
  echo "----|------|------"
  column -t -s '|' "$SERVICES_NET_FILE"
fi

# 结构化 JSON 明细
JSON_FILE=$(mktemp)
> "$JSON_FILE"
# 子网冲突对象
if [ -s "$SUBNETS_FILE" ]; then
  cut -d'|' -f2 "$SUBNETS_FILE" | sort | uniq -d | while read -r subnet; do
    [ -z "$subnet" ] && continue
    grep "|$subnet$" "$SUBNETS_FILE" | while IFS='|' read -r f s; do
      echo "{\"category\":\"network\",\"file\":\"$f\",\"service\":\"\",\"issue\":\"subnet_conflict\",\"message\":\"发现重复子网\",\"recommendation\":\"调整子网避免重叠\",\"extra\":{\"subnet\":\"$subnet\"}}" >> "$JSON_FILE"
    done
  done
fi
# 服务网络连接信息对象（信息类）
if [ -s "$SERVICES_NET_FILE" ]; then
  while IFS='|' read -r file svc net; do
    echo "{\"category\":\"network\",\"file\":\"$file\",\"service\":\"$svc\",\"issue\":\"network_binding_info\",\"message\":\"服务连接网络\",\"recommendation\":\"\",\"extra\":{\"network\":\"$net\"}}" >> "$JSON_FILE"
  done < "$SERVICES_NET_FILE"
fi

# 输出结构化 JSON 明细（供综合脚本抓取）
echo "## JSON_EMBED_START network"
echo "{\"network\": { \"details\": ["
awk 'BEGIN{first=1} { if(!first){printf ","}; first=0; printf "%s", $0 }' "$JSON_FILE"
echo "] } }"
echo "## JSON_EMBED_END network"

rm -f "$SUBNETS_FILE" "$NETWORKS_FILE" "$SERVICES_NET_FILE" "$JSON_FILE"

exit 0