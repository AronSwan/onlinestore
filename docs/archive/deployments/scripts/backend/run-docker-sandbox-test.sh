#!/bin/bash

# Docker沙箱测试运行脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 输出目录
OUTPUT_DIR="$PROJECT_ROOT/.test-output"

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 函数：打印带颜色的消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 函数：显示帮助信息
show_help() {
    echo "Docker沙箱测试运行脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help              显示帮助信息"
    echo "  -p, --privileged        使用特权模式运行测试"
    echo "  -b, --build             重新构建Docker镜像"
    echo "  -c, --clean             清理测试容器和镜像"
    echo "  -l, --logs              查看测试日志"
    echo "  -r, --report            显示测试报告"
    echo ""
    echo "示例:"
    echo "  $0                     运行标准沙箱测试"
    echo "  $0 -p                  运行特权模式沙箱测试"
    echo "  $0 -b                  重新构建镜像并运行测试"
    echo "  $0 -c                  清理测试环境"
    echo ""
}

# 函数：构建Docker镜像
build_image() {
    print_message $BLUE "🔨 构建Docker镜像..."
    cd "$PROJECT_ROOT"
    docker build -f scripts/Dockerfile.test-runner-secure -t test-runner-secure:test .
    print_message $GREEN "✅ 镜像构建完成"
}

# 函数：运行标准沙箱测试
run_standard_test() {
    print_message $BLUE "🐳 运行标准Docker沙箱测试..."
    cd "$SCRIPT_DIR"
    
    # 创建并运行容器
    docker run --rm \
        --name test-runner-secure-sandbox-test \
        -v "$SCRIPT_DIR:/app/scripts:ro" \
        -v "$OUTPUT_DIR:/app/.test-output" \
        -e NODE_ENV=test \
        test-runner-secure:test
    
    print_message $GREEN "✅ 标准沙箱测试完成"
}

# 函数：运行特权模式沙箱测试
run_privileged_test() {
    print_message $BLUE "🐳 运行特权模式Docker沙箱测试..."
    cd "$SCRIPT_DIR"
    
    # 创建并运行特权容器
    docker run --rm --privileged \
        --name test-runner-secure-sandbox-privileged-test \
        -v "$SCRIPT_DIR:/app/scripts:ro" \
        -v "$OUTPUT_DIR:/app/.test-output" \
        -e NODE_ENV=test \
        test-runner-secure:test
    
    print_message $GREEN "✅ 特权模式沙箱测试完成"
}

# 函数：使用Docker Compose运行测试
run_compose_test() {
    local service_name=$1
    print_message $BLUE "🐳 使用Docker Compose运行测试: $service_name"
    cd "$SCRIPT_DIR"
    
    # 运行指定的服务
    docker-compose -f docker-compose.test-runner-secure.yml run --rm "$service_name"
    
    print_message $GREEN "✅ Docker Compose测试完成: $service_name"
}

# 函数：清理测试环境
clean_test_environment() {
    print_message $YELLOW "🧹 清理测试环境..."
    
    # 停止并删除容器
    docker stop test-runner-secure-sandbox-test 2>/dev/null || true
    docker rm test-runner-secure-sandbox-test 2>/dev/null || true
    docker stop test-runner-secure-sandbox-privileged-test 2>/dev/null || true
    docker rm test-runner-secure-sandbox-privileged-test 2>/dev/null || true
    
    # 删除Docker Compose资源
    cd "$SCRIPT_DIR"
    docker-compose -f docker-compose.test-runner-secure.yml down -v 2>/dev/null || true
    
    # 删除镜像
    docker rmi test-runner-secure:test 2>/dev/null || true
    
    # 清理输出目录
    if [ "$CLEAN_OUTPUT" = "true" ]; then
        rm -rf "$OUTPUT_DIR"
        print_message $GREEN "✅ 输出目录已清理"
    fi
    
    print_message $GREEN "✅ 测试环境清理完成"
}

# 函数：查看测试日志
show_logs() {
    local log_file="$OUTPUT_DIR/sandbox-test-report.json"
    
    if [ -f "$log_file" ]; then
        print_message $BLUE "📋 测试日志:"
        cat "$log_file" | jq '.' 2>/dev/null || cat "$log_file"
    else
        print_message $RED "❌ 测试日志文件不存在: $log_file"
    fi
}

# 函数：显示测试报告
show_report() {
    local report_file="$OUTPUT_DIR/sandbox-test-report.json"
    
    if [ -f "$report_file" ]; then
        print_message $BLUE "📊 测试报告:"
        
        if command -v jq >/dev/null 2>&1; then
            # 使用jq格式化JSON
            local total=$(cat "$report_file" | jq -r '.summary.total // 0')
            local passed=$(cat "$report_file" | jq -r '.summary.passed // 0')
            local failed=$(cat "$report_file" | jq -r '.summary.failed // 0')
            local pass_rate=$(cat "$report_file" | jq -r '.summary.passRate // 0')
            
            echo "总测试数: $total"
            echo "通过: $passed"
            echo "失败: $failed"
            echo "通过率: $pass_rate%"
            
            # 显示失败的测试
            local failed_tests=$(cat "$report_file" | jq -r '.results[] | select(.success == false) | .name')
            if [ -n "$failed_tests" ]; then
                echo ""
                echo "失败的测试:"
                echo "$failed_tests" | while read -r test; do
                    echo "  - $test"
                done
            fi
        else
            # 如果没有jq，直接显示文件内容
            cat "$report_file"
        fi
    else
        print_message $RED "❌ 测试报告文件不存在: $report_file"
    fi
}

# 默认参数
PRIVILEGED=false
BUILD_IMAGE=false
CLEAN_ENVIRONMENT=false
SHOW_LOGS=false
SHOW_REPORT=false
CLEAN_OUTPUT=false

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -p|--privileged)
            PRIVILEGED=true
            shift
            ;;
        -b|--build)
            BUILD_IMAGE=true
            shift
            ;;
        -c|--clean)
            CLEAN_ENVIRONMENT=true
            shift
            ;;
        -l|--logs)
            SHOW_LOGS=true
            shift
            ;;
        -r|--report)
            SHOW_REPORT=true
            shift
            ;;
        --clean-output)
            CLEAN_OUTPUT=true
            shift
            ;;
        *)
            print_message $RED "❌ 未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 主逻辑
main() {
    # 检查Docker是否安装
    if ! command -v docker >/dev/null 2>&1; then
        print_message $RED "❌ Docker未安装，请先安装Docker"
        exit 1
    fi
    
    # 检查Docker是否运行
    if ! docker info >/dev/null 2>&1; then
        print_message $RED "❌ Docker未运行，请先启动Docker"
        exit 1
    fi
    
    # 处理清理选项
    if [ "$CLEAN_ENVIRONMENT" = "true" ]; then
        clean_test_environment
        exit 0
    fi
    
    # 处理查看日志选项
    if [ "$SHOW_LOGS" = "true" ]; then
        show_logs
        exit 0
    fi
    
    # 处理查看报告选项
    if [ "$SHOW_REPORT" = "true" ]; then
        show_report
        exit 0
    fi
    
    # 构建镜像（如果需要）
    if [ "$BUILD_IMAGE" = "true" ]; then
        build_image
    elif ! docker image inspect test-runner-secure:test >/dev/null 2>&1; then
        print_message $YELLOW "⚠️ Docker镜像不存在，自动构建..."
        build_image
    fi
    
    # 运行测试
    if [ "$PRIVILEGED" = "true" ]; then
        run_privileged_test
    else
        run_standard_test
    fi
    
    # 显示测试报告
    show_report
}

# 执行主函数
main