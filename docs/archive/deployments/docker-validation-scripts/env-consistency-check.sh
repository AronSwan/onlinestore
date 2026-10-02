#!/bin/bash
# 环境变量一致性验证脚本 (改进版)

# 获取脚本所在目录并加载工具函数
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

echo "=== 环境变量一致性验证 ==="

# 创建临时目录
TEMP_DIR=$(create_temp_dir)
ENV_VARS_FILE="$TEMP_DIR/env_vars.txt"
INCONSISTENT_FILE="$TEMP_DIR/inconsistent_vars.txt"
UNDEFINED_REFS_FILE="$TEMP_DIR/undefined_refs.txt"
ISSUE_JSON="$TEMP_DIR/env_issues.json"

# 初始化临时文件
> "$ENV_VARS_FILE"
> "$INCONSISTENT_FILE"
> "$UNDEFINED_REFS_FILE"
> "$ISSUE_JSON"

# 定义关键环境变量
KEY_ENV_VARS=(
    "POSTGRES_DB"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "REDIS_PASSWORD"
    "JWT_SECRET"
    "ZO_ROOT_USER_EMAIL"
    "ZO_ROOT_USER_PASSWORD"
    "NODE_ENV"
    "PORT"
    "MEILI_MASTER_KEY"
    "ZINC_FIRST_ADMIN_USER"
    "ZINC_FIRST_ADMIN_PASSWORD"
)

# 自动发现Docker Compose文件
echo "自动发现Docker Compose文件..."
COMPOSE_FILES=($(discover_compose_files))

if [ ${#COMPOSE_FILES[@]} -eq 0 ]; then
    print_message "warning" "未找到任何Docker Compose文件"
    exit 1
fi

echo "找到 ${#COMPOSE_FILES[@]} 个Docker Compose文件"
echo ""

# 从各种配置文件中提取环境变量
echo "提取环境变量配置..."
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
                # 解析环境变量
                env_vars=$(parse_environment_variables "$config" "$service_name")
                
                # 记录环境变量信息
                while IFS='|' read -r var_name var_value; do
                    if [ -n "$var_name" ]; then
                        echo "$file|$service_name|$var_name|$var_value" >> "$ENV_VARS_FILE"
                    fi
                done <<< "$env_vars"
            fi
        done <<< "$services"
    fi
done

# 检查关键环境变量一致性
echo ""
echo "检查关键环境变量一致性..."
for var in "${KEY_ENV_VARS[@]}"; do
    echo "检查环境变量 $var..."
    
    # 提取该变量的所有值
    var_values=$(grep "|$var|" "$ENV_VARS_FILE" | cut -d'|' -f4 | sort -u)
    
    if [ -z "$var_values" ]; then
        print_message "warning" "未找到环境变量 $var 的定义"
        continue
    fi
    
    # 统计不同值的数量
    value_count=$(echo "$var_values" | wc -l)
    
    if [ $value_count -gt 1 ]; then
        print_message "error" "$var 在不同文件中有多个值:"
        grep "|$var|" "$ENV_VARS_FILE" | while IFS='|' read -r file service_name var_name var_value; do
            echo "  - $file 中的服务 $service_name: $var_value"
            echo "{\"var\":\"$var\",\"file\":\"$file\",\"service\":\"$service_name\",\"value\":\"$var_value\",\"issue\":\"env_inconsistent\",\"message\":\"环境变量值不一致\",\"recommendation\":\"统一变量来源与默认值\"}" >> "$ISSUE_JSON"
        done
        echo "$var" >> "$INCONSISTENT_FILE"
    else
        print_message "success" "$var 值一致: $var_values"
    fi
    echo ""
done

# 检查未定义的环境变量引用
echo "检查未定义的环境变量引用..."
grep "\${" "$ENV_VARS_FILE" | while IFS='|' read -r file service_name var_name var_value; do
    # 提取所有变量引用
    echo "$var_value" | grep -oE '\${[A-Z_]+[^}]*}' | while read -r var_ref; do
        # 提取变量名（去掉默认值语法）
        ref_var=$(echo "$var_ref" | sed 's/\${//g' | sed 's/}//g' | sed 's/:-.*//g' | sed 's/?.*//g')
        
        # 检查该变量是否有定义
        if ! grep -q "|$ref_var|" "$ENV_VARS_FILE" && ! echo "${KEY_ENV_VARS[@]}" | grep -q "$ref_var"; then
            echo "$file|$service_name|$var_ref|$var_ref" >> "$UNDEFINED_REFS_FILE"
            echo "{\"service\":\"$service_name\",\"var\":\"$ref_var\",\"file\":\"$file\",\"issue\":\"env_undefined_ref\",\"message\":\"引用了未定义的环境变量\",\"recommendation\":\"在 env_file 或 environment 中定义该变量，或提供默认值\"}" >> "$ISSUE_JSON"
        fi
    done
done

# 输出未定义的环境变量引用
if [ -s "$UNDEFINED_REFS_FILE" ]; then
    echo ""
    print_message "warning" "发现未定义的环境变量引用:"
    while IFS='|' read -r file service_name var_name var_ref; do
        echo "  - $file 中的服务 $service_name 引用了未定义的变量: \${$var_ref}"
    done < "$UNDEFINED_REFS_FILE"
fi

# 输出环境变量使用情况报告
echo ""
echo "=== 环境变量使用情况报告 ==="
printf "%-50s %-20s %-25s %-30s\n" "文件名" "服务名" "变量名" "值"
printf "%-50s %-20s %-25s %-30s\n" "------" "------" "------" "----"

# 格式化输出环境变量信息
if [ -s "$ENV_VARS_FILE" ]; then
    while IFS='|' read -r file service_name var_name var_value; do
        # 截断长字段以适应表格
        file_short=$(echo "$file" | cut -c1-47)
        if [ ${#file} -gt 47 ]; then
            file_short="${file_short}..."
        fi
        
        service_short=$(echo "$service_name" | cut -c1-17)
        if [ ${#service_name} -gt 17 ]; then
            service_short="${service_short}..."
        fi
        
        var_short=$(echo "$var_name" | cut -c1-22)
        if [ ${#var_name} -gt 22 ]; then
            var_short="${var_short}..."
        fi
        
        value_short=$(echo "$var_value" | cut -c1-27)
        if [ ${#var_value} -gt 27 ]; then
            value_short="${value_short}..."
        fi
        
        printf "%-50s %-20s %-25s %-30s\n" "$file_short" "$service_short" "$var_short" "$value_short"
    done < "$ENV_VARS_FILE"
fi

# 统计信息
TOTAL_VARS=$(wc -l < "$ENV_VARS_FILE" 2>/dev/null || echo 0)
UNIQUE_VARS=$(cut -d'|' -f3 "$ENV_VARS_FILE" 2>/dev/null | sort -u | wc -l || echo 0)
INCONSISTENT_COUNT=$(wc -l < "$INCONSISTENT_FILE" 2>/dev/null || echo 0)
UNDEFINED_COUNT=$(wc -l < "$UNDEFINED_REFS_FILE" 2>/dev/null || echo 0)

echo ""
echo "=== 环境变量统计 ==="
echo "总环境变量定义数: $TOTAL_VARS"
echo "唯一环境变量数: $UNIQUE_VARS"
echo "不一致的变量数: $INCONSISTENT_COUNT"
echo "未定义的引用数: $UNDEFINED_COUNT"

# 输出有问题的环境变量列表
if [ $INCONSISTENT_COUNT -gt 0 ]; then
    echo ""
    echo "不一致的环境变量:"
    cat "$INCONSISTENT_FILE" | while read -r var; do
        echo "  - $var"
    done
fi

if [ $UNDEFINED_COUNT -gt 0 ]; then
    echo ""
    echo "被引用但未定义的环境变量:"
    cut -d'|' -f3 "$UNDEFINED_REFS_FILE" | sort -u | while read -r var; do
        echo "  - $var"
    done
fi

# 清理临时文件
# 输出结构化 JSON 明细（供综合脚本抓取）
echo "## JSON_EMBED_START env"
echo "{\"env\": { \"details\": ["
awk 'BEGIN{first=1} { if(!first){printf ","}; first=0; printf "%s", $0 }' "$ISSUE_JSON"
echo "] } }"
echo "## JSON_EMBED_END env"

rm -rf "$TEMP_DIR"

# 返回适当的退出码
if [ $INCONSISTENT_COUNT -eq 0 ] && [ $UNDEFINED_COUNT -eq 0 ]; then
    print_message "success" "环境变量一致性验证通过"
    exit 0
else
    print_message "error" "发现 $((INCONSISTENT_COUNT + UNDEFINED_COUNT)) 个环境变量问题"
    exit 1
fi