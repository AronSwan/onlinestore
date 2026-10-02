#!/bin/bash
# 端口冲突检测脚本 (改进版)

# 获取脚本所在目录并加载工具函数
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

echo "=== 端口冲突检测 ==="

# 创建临时目录
TEMP_DIR=$(create_temp_dir)
PORTS_FILE="$TEMP_DIR/ports.txt"
CONFLICTS_FILE="$TEMP_DIR/conflicts.txt"
DOCKER_CMD=$(get_docker_compose_cmd)

# 初始化临时文件
> "$PORTS_FILE"
> "$CONFLICTS_FILE"

# 自动发现Docker Compose文件
echo "自动发现Docker Compose文件..."
COMPOSE_FILES=($(discover_compose_files))

if [ ${#COMPOSE_FILES[@]} -eq 0 ]; then
    print_message "warning" "未找到任何Docker Compose文件"
    exit 1
fi

echo "找到 ${#COMPOSE_FILES[@]} 个Docker Compose文件"
echo ""

# 提取所有端口映射
echo "提取所有服务端口映射..."
for file in "${COMPOSE_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "分析文件: $file"
        
        # 获取Compose配置
        config=$(get_compose_config "$file")
        if [ $? -ne 0 ]; then
            print_message "error" "无法解析 $file，跳过"
            continue
        fi
        
        # 获取服务列表
        services=$(get_service_names "$config")
        
        # 处理每个服务
        while IFS= read -r service_name; do
            if [ -n "$service_name" ]; then
                # 解析端口映射
                port_mappings=$(parse_port_mappings "$config" "$service_name")
                
                # 记录端口信息并校验属性
                while IFS= read -r port_mapping; do
                    [ -z "$port_mapping" ] && continue
                    if [[ "$port_mapping" =~ ^([0-9]+):([0-9]+)$ ]]; then
                        host_port="${BASH_REMATCH[1]}"; container_port="${BASH_REMATCH[2]}"
                        echo "$file|$service_name|$host_port|$container_port" >> "$PORTS_FILE"
                    fi
                done <<< "$port_mappings"
                # 额外校验端口对象属性（protocol/mode）
                if command -v jq &> /dev/null; then
                    echo "$config" | jq -c ".services[\"$service_name\"].ports[]? | select(type==\"object\")" | while read -r obj; do
                        proto=$(echo "$obj" | jq -r '.protocol // "tcp"')
                        mode=$(echo "$obj" | jq -r '.mode // "host"')
                        if [[ ! "$proto" =~ ^(tcp|udp)$ ]]; then
                            print_message "warning" "$file 服务 $service_name 端口对象协议无效: $proto"
                        fi
                        if [[ ! "$mode" =~ ^(host|ingress)$ ]]; then
                            print_message "warning" "$file 服务 $service_name 端口对象模式无效: $mode"
                        fi
                    done
                fi
            fi
        done <<< "$services"
    fi
done

# 检查端口冲突
echo ""
echo "检查端口冲突..."
if [ -s "$PORTS_FILE" ]; then
    # 按主机端口分组，查找重复端口
    cut -d'|' -f3 "$PORTS_FILE" | sort | uniq -d > "$TEMP_DIR/duplicate_ports.txt"
    
    if [ -s "$TEMP_DIR/duplicate_ports.txt" ]; then
        print_message "error" "发现端口冲突:"
        while read -r port; do
            echo "端口 $port 被多个服务使用:"
            grep "|$port|" "$PORTS_FILE" | while IFS='|' read -r file service_name host_port container_port; do
                echo "  - $file 中的服务 $service_name (主机端口:$host_port -> 容器端口:$container_port)"
            done
            echo ""
            
            # 记录冲突
            echo "$port" >> "$CONFLICTS_FILE"
        done < "$TEMP_DIR/duplicate_ports.txt"
    else
        print_message "success" "未发现端口冲突"
    fi
else
    print_message "warning" "未找到任何端口配置信息"
fi

# 输出端口使用情况报告
echo ""
echo "=== 端口使用情况报告 ==="
printf "%-40s %-20s %-10s %-10s\n" "文件名" "服务名" "主机端口" "容器端口"
printf "%-40s %-20s %-10s %-10s\n" "------" "------" "--------" "--------"

# 格式化输出端口信息
if [ -s "$PORTS_FILE" ]; then
    while IFS='|' read -r file service_name host_port container_port; do
        # 截断长文件名和服务名以适应表格
        file_short=$(echo "$file" | cut -c1-37)
        if [ ${#file} -gt 37 ]; then
            file_short="${file_short}..."
        fi
        
        service_short=$(echo "$service_name" | cut -c1-17)
        if [ ${#service_name} -gt 17 ]; then
            service_short="${service_short}..."
        fi
        
        printf "%-40s %-20s %-10s %-10s\n" "$file_short" "$service_short" "$host_port" "$container_port"
    done < "$PORTS_FILE"
fi

# 统计信息
TOTAL_PORTS=$(wc -l < "$PORTS_FILE" 2>/dev/null || echo 0)
UNIQUE_PORTS=$(cut -d'|' -f3 "$PORTS_FILE" 2>/dev/null | sort -u | wc -l || echo 0)
CONFLICT_COUNT=$(wc -l < "$CONFLICTS_FILE" 2>/dev/null || echo 0)

echo ""
echo "=== 端口统计 ==="
echo "总端口映射数: $TOTAL_PORTS"
echo "唯一主机端口数: $UNIQUE_PORTS"
echo "冲突端口数: $CONFLICT_COUNT"

# 检查常用端口是否被意外占用
echo ""
echo "=== 常用端口检查 ==="
COMMON_PORTS=(80 443 3000 3001 5432 6379 8080 9090 5080)
for port in "${COMMON_PORTS[@]}"; do
    if grep -q "|$port|" "$PORTS_FILE"; then
        echo "端口 $port 被使用:"
        grep "|$port|" "$PORTS_FILE" | while IFS='|' read -r file service_name host_port container_port; do
            echo "  - $file 中的服务 $service_name"
        done
    fi
done

# 结构化 JSON 明细
JSON_FILE="$TEMP_DIR/port_issues.json"
> "$JSON_FILE"
if [ -s "$CONFLICTS_FILE" ]; then
  while IFS='|' read -r file service_name host_port container_port; do
    echo "{\"category\":\"ports\",\"file\":\"$file\",\"service\":\"$service_name\",\"issue\":\"port_conflict\",\"message\":\"主机端口冲突\",\"recommendation\":\"调整映射或使用不同端口\",\"extra\":{\"hostPort\":\"$host_port\",\"containerPort\":\"$container_port\"}}" >> "$JSON_FILE"
  done < "$PORTS_FILE"
fi
# 输出结构化 JSON 明细（供综合脚本抓取）
echo "## JSON_EMBED_START ports"
echo "{\"ports\": { \"details\": ["
awk 'BEGIN{first=1} { if(!first){printf ","}; first=0; printf "%s", $0 }' "$JSON_FILE"
echo "] } }"
echo "## JSON_EMBED_END ports"

# 清理临时文件
rm -rf "$TEMP_DIR"

# 返回适当的退出码
if [ $CONFLICT_COUNT -eq 0 ]; then
    print_message "success" "端口冲突检测通过"
    exit 0
else
    print_message "error" "发现 $CONFLICT_COUNT 个端口冲突"
    exit 1
fi