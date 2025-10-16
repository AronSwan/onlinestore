#!/bin/bash
# Docker配置文件语法验证脚本 (改进版)

# 获取脚本所在目录并加载工具函数
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

echo "=== Docker配置文件语法验证 ==="

# 创建临时目录
TEMP_DIR=$(create_temp_dir)
RESULTS_FILE="$TEMP_DIR/validation_results.txt"
ISSUE_JSON="$TEMP_DIR/syntax_issues.json"

# 初始化结果文件
> "$RESULTS_FILE"
> "$ISSUE_JSON"

# 验证结果统计
TOTAL_FILES=0
PASSED_FILES=0
FAILED_FILES=0

# 自动发现Docker Compose文件
echo "自动发现Docker Compose文件..."
COMPOSE_FILES=($(discover_compose_files))

if [ ${#COMPOSE_FILES[@]} -eq 0 ]; then
    print_message "warning" "未找到任何Docker Compose文件"
    exit 1
fi

echo "找到 ${#COMPOSE_FILES[@]} 个Docker Compose文件:"
printf '%s\n' "${COMPOSE_FILES[@]}"
echo ""

# 验证每个文件
for file in "${COMPOSE_FILES[@]}"; do
    TOTAL_FILES=$((TOTAL_FILES + 1))
    
    echo "验证 $file..."
    
    if validate_compose_syntax "$file"; then
        print_message "success" "$file 语法正确"
        echo "PASS|$file" >> "$RESULTS_FILE"
        PASSED_FILES=$((PASSED_FILES + 1))
    else
        print_message "error" "$file 语法错误"
        echo "FAIL|$file" >> "$RESULTS_FILE"
        FAILED_FILES=$((FAILED_FILES + 1))
        
        # 显示错误详情并写入结构化对象
        docker_cmd=$(get_docker_compose_cmd)
        err="$($docker_cmd -f "$file" config 2>&1 | head -1 | sed 's/"/\"/g')"
        echo "错误详情:"
        $docker_cmd -f "$file" config 2>&1 | head -20
        echo "{\"file\":\"$file\",\"issue\":\"syntax_error\",\"message\":\"$err\",\"recommendation\":\"修复 YAML 缩进/字段/格式错误；使用 docker compose config 本地校验\"}" >> "$ISSUE_JSON"
    fi
    echo ""
done

# 输出验证结果摘要
echo "=== 语法验证结果摘要 ==="
echo "总文件数: $TOTAL_FILES"
echo "通过: $PASSED_FILES"
echo "失败: $FAILED_FILES"

if [ $TOTAL_FILES -gt 0 ]; then
    SUCCESS_RATE=$(( PASSED_FILES * 100 / TOTAL_FILES ))
    echo "通过率: $SUCCESS_RATE%"
fi

# 输出失败的文件列表
if [ $FAILED_FILES -gt 0 ]; then
    echo ""
    echo "失败的文件列表:"
    grep "^FAIL|" "$RESULTS_FILE" | cut -d'|' -f2 | while read -r file; do
        echo "  - $file"
    done
fi

# 输出结构化 JSON 明细（供综合脚本抓取）
echo "## JSON_EMBED_START syntax"
echo "{\"syntax\": { \"details\": ["
awk 'BEGIN{first=1} { if(!first){printf ","}; first=0; printf "%s", $0 }' "$ISSUE_JSON"
echo "] } }"
echo "## JSON_EMBED_END syntax"

# 清理临时文件
rm -rf "$TEMP_DIR"

# 返回适当的退出码
if [ $FAILED_FILES -eq 0 ]; then
    print_message "success" "所有Docker配置文件语法验证通过"
    exit 0
else
    print_message "error" "发现 $FAILED_FILES 个文件存在语法问题"
    exit 1
fi