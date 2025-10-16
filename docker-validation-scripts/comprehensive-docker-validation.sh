#!/bin/bash
# Docker配置文件综合验证脚本 (改进版)

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

echo "=== Docker配置文件综合验证 ==="

# 创建临时目录
TEMP_DIR=$(create_temp_dir)
REPORT_FILE="docker-validation-report.md"
RESULTS_FILE="$TEMP_DIR/validation_results.txt"

# 初始化结果文件
> "$RESULTS_FILE"

# 初始化报告
cat > "$REPORT_FILE" << EOF
# Docker配置验证报告

## 验证概述
- 验证时间: $(date '+%Y-%m-%d %H:%M:%S')
- 验证人员: $(whoami)
- 验证范围: 所有Docker配置文件

## 验证结果

EOF

# 定义验证脚本列表
VALIDATION_SCRIPTS=(
    "docker-syntax-validation.sh"
    "port-conflict-detection.sh"
    "env-consistency-check.sh"
    "network-consistency-check.sh"
    "volume-conflict-detection.sh"
    "health-check-validation.sh"
    "resource-limit-check.sh"
)

# 执行结果统计
TOTAL_SCRIPTS=0
PASSED_SCRIPTS=0
FAILED_SCRIPTS=0

# 检查Docker是否可用
echo "检查Docker环境..."
if ! get_docker_compose_cmd > /dev/null; then
    print_message "error" "Docker或Docker Compose不可用"
    
    # 添加错误到报告
    echo "### Docker环境检查\n" >> "$REPORT_FILE"
    echo "❌ Docker或Docker Compose不可用" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "**修复建议:**" >> "$REPORT_FILE"
    echo "1. 安装Docker Desktop" >> "$REPORT_FILE"
    echo "2. 确保Docker和Docker Compose已添加到系统PATH" >> "$REPORT_FILE"
    echo "3. 重启终端或PowerShell" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # 保存报告
    echo "详细报告已保存到: $REPORT_FILE"
    
    # 清理临时文件
    rm -rf "$TEMP_DIR"
    
    exit 1
fi

print_message "success" "Docker环境检查通过"
echo ""

# 执行所有验证脚本
for script in "${VALIDATION_SCRIPTS[@]}"; do
    TOTAL_SCRIPTS=$((TOTAL_SCRIPTS + 1))
    script_path="$SCRIPT_DIR/$script"
    
    if [ -f "$script_path" ]; then
        echo "执行 $script..."
        
        # 执行验证脚本并捕获输出
        script_output_file="$TEMP_DIR/${script%.sh}_output.txt"
        script_exit_code=0
        
        # 执行脚本并保存输出
        bash "$script_path" > "$script_output_file" 2>&1 || script_exit_code=$?
        
        # 将输出添加到报告
        script_title=$(echo "$script" | sed 's/-validation-v2.sh//' | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2)); print}')
        
        echo "### $script_title\n" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        cat "$script_output_file" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        
        # 记录结果
        if [ $script_exit_code -eq 0 ]; then
            echo "PASS|$script|$script_title" >> "$RESULTS_FILE"
            print_message "success" "$script 验证通过"
            PASSED_SCRIPTS=$((PASSED_SCRIPTS + 1))
        else
            echo "FAIL|$script|$script_title" >> "$RESULTS_FILE"
            print_message "error" "$script 验证失败"
            FAILED_SCRIPTS=$((FAILED_SCRIPTS + 1))
        fi
    else
        echo "⚠️  验证脚本 $script 不存在"
        echo "MISSING|$script|$script" >> "$RESULTS_FILE"
        FAILED_SCRIPTS=$((FAILED_SCRIPTS + 1))
        
        # 记录缺失的脚本
        script_title=$(echo "$script" | sed 's/-validation-v2.sh//' | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2)); print}')
        echo "### $script_title\n" >> "$REPORT_FILE"
        echo "⚠️ 验证脚本不存在: $script_path" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi
    
    echo ""
done

# 添加总结到报告
overall_status="❌ 失败"
if [ $FAILED_SCRIPTS -eq 0 ]; then
    overall_status="✅ 通过"
fi

success_rate=$(( PASSED_SCRIPTS * 100 / TOTAL_SCRIPTS ))

cat >> "$REPORT_FILE" << EOF
## 总结
- 总体状态: $overall_status
- 验证脚本总数: $TOTAL_SCRIPTS
- 通过验证: $PASSED_SCRIPTS
- 失败验证: $FAILED_SCRIPTS
- 成功率: $success_rate%

### 验证结果详情

### 汇总表（按类别）
| 类别 | 通过 | 警告 | 错误 |
|------|------|------|------|
| 语法 | $(grep -c "✅" "$TEMP_DIR/docker-syntax-validation_output.txt" 2>/dev/null || echo 0) | $(grep -c "⚠️" "$TEMP_DIR/docker-syntax-validation_output.txt" 2>/dev/null || echo 0) | $(grep -c "❌" "$TEMP_DIR/docker-syntax-validation_output.txt" 2>/dev/null || echo 0) |
| 端口 | $(grep -c "✅" "$TEMP_DIR/port-conflict-detection_output.txt" 2>/dev/null || echo 0) | $(grep -c "⚠️" "$TEMP_DIR/port-conflict-detection_output.txt" 2>/dev/null || echo 0) | $(grep -c "❌" "$TEMP_DIR/port-conflict-detection_output.txt" 2>/dev/null || echo 0) |
| 环境 | $(grep -c "✅" "$TEMP_DIR/env-consistency-check_output.txt" 2>/dev/null || echo 0) | $(grep -c "⚠️" "$TEMP_DIR/env-consistency-check_output.txt" 2>/dev/null || echo 0) | $(grep -c "❌" "$TEMP_DIR/env-consistency-check_output.txt" 2>/dev/null || echo 0) |
| 网络 | $(grep -c "✅" "$TEMP_DIR/network-consistency-check_output.txt" 2>/dev/null || echo 0) | $(grep -c "⚠️" "$TEMP_DIR/network-consistency-check_output.txt" 2>/dev/null || echo 0) | $(grep -c "❌" "$TEMP_DIR/network-consistency-check_output.txt" 2>/dev/null || echo 0) |
| 卷   | $(grep -c "✅" "$TEMP_DIR/volume-conflict-detection_output.txt" 2>/dev/null || echo 0) | $(grep -c "⚠️" "$TEMP_DIR/volume-conflict-detection_output.txt" 2>/dev/null || echo 0) | $(grep -c "❌" "$TEMP_DIR/volume-conflict-detection_output.txt" 2>/dev/null || echo 0) |
| 健康 | $(grep -c "OK|" "$TEMP_DIR/health-check-validation_output.txt" 2>/dev/null || echo 0) | $(grep -c "⚠️" "$TEMP_DIR/health-check-validation_output.txt" 2>/dev/null || echo 0) | $(grep -c "❌\|ISSUE\|MISSING" "$TEMP_DIR/health-check-validation_output.txt" 2>/dev/null || echo 0) |
| 资源 | $(grep -c "资源限制配置摘要" "$TEMP_DIR/resource-limit-check_output.txt" 2>/dev/null || echo 0) | 0 | $(grep -c "⚠️\|❌" "$TEMP_DIR/resource-limit-check_output.txt" 2>/dev/null || echo 0) |

### 修复建议清单
- 端口：检查重复主机端口并调整映射；使用长格式端口声明时确保 published/target 正确
- 环境：统一变量来源，优先级遵循 $(echo "${VALIDATION_ENV_PRECEDENCE:-environment,env_file,dotenv}")
- 网络：避免子网重叠，明确服务网络连接
- 卷：避免主机路径复用；命名卷未使用可清理
- 健康检查：设置合理的 interval/timeout/start_period/retries；确保 test 访问正确端口
- 资源限制：设置 limits/reservations，维持合理比例（建议 20%-80%）

EOF

# 添加详细结果到报告
echo "| 脚本 | 状态 | 描述 |" >> "$REPORT_FILE"
echo "|------|------|------|" >> "$REPORT_FILE"

while IFS='|' read -r status script title; do
    status_icon="❌"
    if [ "$status" = "PASS" ]; then
        status_icon="✅"
    elif [ "$status" = "MISSING" ]; then
        status_icon="⚠️"
    fi
    
    echo "| $script | $status_icon | $title |" >> "$REPORT_FILE"
done < "$RESULTS_FILE"

# 添加修复建议
if [ $FAILED_SCRIPTS -gt 0 ]; then
    cat >> "$REPORT_FILE" << EOF

## 修复建议

### 1. 语法错误
- 检查Docker Compose文件的YAML语法
- 确保缩进和格式正确
- 使用在线YAML验证器验证语法

### 2. 端口冲突
- 修改冲突服务的端口映射
- 确保每个主机端口唯一
- 考虑使用Docker的网络特性避免端口冲突

### 3. 环境变量不一致
- 统一环境变量定义
- 使用.env文件管理共享变量
- 检查变量引用的正确性

### 4. 网络配置问题
- 检查网络子网冲突
- 确保服务正确连接到网络
- 验证网络驱动配置

### 5. 卷映射冲突
- 修改冲突的卷映射路径
- 使用命名卷避免路径冲突
- 检查卷权限配置

### 6. 健康检查问题
- 配置适当的健康检查端点
- 确保健康检查端口与服务端口一致
- 调整健康检查参数

### 7. 资源限制问题
- 为所有服务配置资源限制
- 根据服务需求调整资源限制
- 确保资源预留不超过限制

EOF
fi

# 添加下一步行动
cat >> "$REPORT_FILE" << EOF
## 下一步行动

1. 优先修复导致验证失败的关键问题
2. 重新运行验证脚本确认修复效果
3. 将验证脚本集成到CI/CD流水线
4. 定期执行验证确保配置质量

## 自动化集成

### CI/CD集成
将验证脚本集成到CI/CD流水线中，在代码提交时自动执行验证：

\`\`\`bash
# 给脚本添加执行权限
chmod +x validation-scripts/*.sh

# 运行综合验证
./validation-scripts/comprehensive-docker-validation.sh
\`\`\`

### Git Hooks集成
在Git提交前自动执行验证：

\`\`\`bash
#!/bin/sh
# .git/hooks/pre-commit

echo "执行Docker配置验证..."
./validation-scripts/comprehensive-docker-validation.sh

if [ \$? -ne 0 ]; then
    echo "Docker配置验证失败，请修复问题后再提交"
    exit 1
fi
\`\`\`

EOF

# 输出验证结果摘要
echo "=== 验证完成 ==="
echo "总验证脚本数: $TOTAL_SCRIPTS"
echo "通过: $PASSED_SCRIPTS"
echo "失败: $FAILED_SCRIPTS"
echo "成功率: $success_rate%"
echo ""
echo "详细报告已保存到: $REPORT_FILE"

# 生成 JSON 摘要（含按类别的错误明细）
JSON_FILE="docker-validation-report.json"
# 收集各类别原始输出路径
declare -A CAT2FILE=(
  [syntax]="$TEMP_DIR/docker-syntax-validation_output.txt"
  [ports]="$TEMP_DIR/port-conflict-detection_output.txt"
  [env]="$TEMP_DIR/env-consistency-check_output.txt"
  [network]="$TEMP_DIR/network-consistency-check_output.txt"
  [volume]="$TEMP_DIR/volume-conflict-detection_output.txt"
  [health]="$TEMP_DIR/health-check-validation_output.txt"
  [resource]="$TEMP_DIR/resource-limit-check_output.txt"
)

extract_lines_json_array() {
  local file="$1"; local pattern="$2"
  [ -f "$file" ] || { echo "[]"; return; }
  local tmp
  tmp=$(mktemp)
  grep -E "$pattern" "$file" 2>/dev/null | sed 's/"/\\"/g' | awk '{printf "  \"%s\",\n", $0}' | sed '$ s/,$//' > "$tmp"
  echo "["; cat "$tmp"; echo "]"; rm -f "$tmp"
}

PORT_CONFLICTS_COUNT=$(grep -cE "❌|ERROR|FAIL" "${CAT2FILE[ports]}" 2>/dev/null || echo 0)

cat > "$JSON_FILE" <<JSON
{
  "summary": {
    "total": $TOTAL_SCRIPTS,
    "passed": $PASSED_SCRIPTS,
    "failed": $FAILED_SCRIPTS,
    "successRate": $success_rate,
    "portConflicts": $PORT_CONFLICTS_COUNT
  },
  "results": [
$(awk -F'|' '{printf "    {\"status\":\"%s\",\"script\":\"%s\",\"title\":\"%s\"},\n", $1,$2,$3}' "$RESULTS_FILE" | sed '$ s/,$//')
  ],
  "categories": {
    "syntax": {
      "errors": $(extract_lines_json_array "${CAT2FILE[syntax]}" "❌|ERROR|FAIL|ISSUE|MISSING"),
      "warnings": $(extract_lines_json_array "${CAT2FILE[syntax]}" "⚠️|WARN"),
      "details": $( awk '/^## JSON_EMBED_START syntax/{flag=1; next} /^## JSON_EMBED_END syntax/{flag=0} flag {print}' "${CAT2FILE[syntax]}" | jq -c '(.syntax.details // []) | map(. + {category:"syntax", file:(.file//""), service:(.service//""), issue:(.issue//"unknown"), message:(.message//""), recommendation:(.recommendation//""), extra:(.extra//{})})' 2>/dev/null || echo '[]' )
    },
    "ports": {
      "errors": $(extract_lines_json_array "${CAT2FILE[ports]}" "❌|ERROR|FAIL|ISSUE|MISSING"),
      "warnings": $(extract_lines_json_array "${CAT2FILE[ports]}" "⚠️|WARN"),
      "details": $( awk '/^## JSON_EMBED_START ports/{flag=1; next} /^## JSON_EMBED_END ports/{flag=0} flag {print}' "${CAT2FILE[ports]}" | jq -c '(.ports.details // []) | map(. + {category:"ports", file:(.file//""), service:(.service//""), issue:(.issue//"unknown"), message:(.message//""), recommendation:(.recommendation//""), extra:(.extra//{})})' 2>/dev/null || echo '[]' )
    },
    "env": {
      "errors": $(extract_lines_json_array "${CAT2FILE[env]}" "❌|ERROR|FAIL|ISSUE|MISSING"),
      "warnings": $(extract_lines_json_array "${CAT2FILE[env]}" "⚠️|WARN"),
      "details": $( awk '/^## JSON_EMBED_START env/{flag=1; next} /^## JSON_EMBED_END env/{flag=0} flag {print}' "${CAT2FILE[env]}" | jq -c '(.env.details // []) | map(. + {category:"env", file:(.file//""), service:(.service//""), issue:(.issue//"unknown"), message:(.message//""), recommendation:(.recommendation//""), extra:(.extra//{})})' 2>/dev/null || echo '[]' )
    },
    "network": {
      "errors": $(extract_lines_json_array "${CAT2FILE[network]}" "❌|ERROR|FAIL|ISSUE|MISSING"),
      "warnings": $(extract_lines_json_array "${CAT2FILE[network]}" "⚠️|WARN"),
      "details": $( awk '/^## JSON_EMBED_START network/{flag=1; next} /^## JSON_EMBED_END network/{flag=0} flag {print}' "${CAT2FILE[network]}" | jq -c '(.network.details // []) | map(. + {category:"network", file:(.file//""), service:(.service//""), issue:(.issue//"unknown"), message:(.message//""), recommendation:(.recommendation//""), extra:(.extra//{})})' 2>/dev/null || echo '[]' )
    },
    "volume": {
      "errors": $(extract_lines_json_array "${CAT2FILE[volume]}" "❌|ERROR|FAIL|ISSUE|MISSING"),
      "warnings": $(extract_lines_json_array "${CAT2FILE[volume]}" "⚠️|WARN"),
      "details": $( awk '/^## JSON_EMBED_START volume/{flag=1; next} /^## JSON_EMBED_END volume/{flag=0} flag {print}' "${CAT2FILE[volume]}" | jq -c '(.volume.details // []) | map(. + {category:"volume", file:(.file//""), service:(.service//""), issue:(.issue//"unknown"), message:(.message//""), recommendation:(.recommendation//""), extra:(.extra//{})})' 2>/dev/null || echo '[]' )
    },
    "health": {
      "errors": $(extract_lines_json_array "${CAT2FILE[health]}" "❌|ERROR|FAIL|ISSUE|MISSING"),
      "warnings": $(extract_lines_json_array "${CAT2FILE[health]}" "⚠️|WARN"),
      "details": $( awk '/^## JSON_EMBED_START health/{flag=1; next} /^## JSON_EMBED_END health/{flag=0} flag {print}' "${CAT2FILE[health]}" | jq -c '(.health.details // []) | map(. + {category:"health", file:(.file//""), service:(.service//""), issue:(.issue//"unknown"), message:(.message//""), recommendation:(.recommendation//""), extra:(.extra//{})})' 2>/dev/null || echo '[]' )
    },
    "resource": {
      "errors": $(extract_lines_json_array "${CAT2FILE[resource]}" "❌|ERROR|FAIL|ISSUE|MISSING"),
      "warnings": $(extract_lines_json_array "${CAT2FILE[resource]}" "⚠️|WARN"),
      "details": $( awk '/^## JSON_EMBED_START resource/{flag=1; next} /^## JSON_EMBED_END resource/{flag=0} flag {print}' "${CAT2FILE[resource]}" | jq -c '(.resource.details // []) | map(. + {category:"resource", file:(.file//""), service:(.service//""), issue:(.issue//"unknown"), message:(.message//""), recommendation:(.recommendation//""), extra:(.extra//{})})' 2>/dev/null || echo '[]' )
    }
  }
}
JSON

# 输出失败的项目
if [ $FAILED_SCRIPTS -gt 0 ]; then
    echo ""
    echo "失败的验证项目:"
    while IFS='|' read -r status script title; do
        if [ "$status" = "FAIL" ] || [ "$status" = "MISSING" ]; then
            echo "  - $title ($script)"
        fi
    done < "$RESULTS_FILE"
fi

# 清理临时文件
rm -rf "$TEMP_DIR"

# 返回适当的退出码
if [ $FAILED_SCRIPTS -eq 0 ]; then
    print_message "success" "所有Docker配置验证通过"
    exit 0
else
    print_message "error" "发现 $FAILED_SCRIPTS 个验证失败"
    exit 1
fi