#!/bin/bash

# Docker 部署验证脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# 验证结果统计
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# 检查函数
check() {
    local description=$1
    local command=$2
    local expected_result=${3:-0}
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    echo -n "检查: $description ... "
    
    if eval "$command" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ 通过${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}✗ 失败${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# 检查 Docker 安装
check_docker_installation() {
    log_info "检查 Docker 安装..."
    
    check "Docker 命令可用" "command -v docker"
    check "Docker 服务运行" "docker info"
    check "Docker Compose 命令可用" "command -v docker-compose"
    
    local docker_version=$(docker --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
    log_info "Docker 版本: $docker_version"
}

# 检查配置文件
check_configuration_files() {
    log_info "检查配置文件..."
    
    check "docker-compose.yml 存在" "test -f docker-compose.yml"
    check "docker-compose.dev.yml 存在" "test -f docker-compose.dev.yml"
    check "后端 Dockerfile 存在" "test -f backend/Dockerfile"
    check "前端 Dockerfile 存在" "test -f Dockerfile"
    check "环境配置文件存在" "test -f .env.docker"
    check "部署脚本存在" "test -f scripts/docker-deploy.sh"
    
    # 检查配置文件语法
    check "docker-compose.yml 语法正确" "docker-compose -f docker-compose.yml config"
    check "docker-compose.dev.yml 语法正确" "docker-compose -f docker-compose.dev.yml config"
}

# 检查环境变量
check_environment_variables() {
    log_info "检查环境变量..."
    
    if [ -f .env.docker ]; then
        check "环境变量文件存在" "test -f .env.docker"
        
        # 检查关键环境变量
        local env_file=".env.docker"
        
        check "POSTGRES_DB 配置" "grep -q '^POSTGRES_DB=' $env_file"
        check "POSTGRES_USER 配置" "grep -q '^POSTGRES_USER=' $env_file"
        check "POSTGRES_PASSWORD 配置" "grep -q '^POSTGRES_PASSWORD=' $env_file"
        check "JWT_SECRET 配置" "grep -q '^JWT_SECRET=' $env_file"
        check "NODE_ENV 配置" "grep -q '^NODE_ENV=' $env_file"
    else
        log_warn "环境配置文件 .env.docker 不存在"
    fi
}

# 检查网络配置
check_network_configuration() {
    log_info "检查网络配置..."
    
    # 检查网络是否已创建
    if docker network ls | grep -q "shopping-network"; then
        log_info "Docker 网络 shopping-network 已存在"
    else
        log_warn "Docker 网络 shopping-network 不存在，将在部署时创建"
    fi
}

# 检查端口占用
check_port_availability() {
    log_info "检查端口可用性..."
    
    local ports=(80 443 3000 5432 6379 8080 9200 9090 3001)
    
    for port in "${ports[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            log_warn "端口 $port 已被占用"
        else
            log_info "端口 $port 可用"
        fi
    done
}

# 检查系统资源
check_system_resources() {
    log_info "检查系统资源..."
    
    # 检查内存
    local total_mem=$(free -m | awk 'NR==2{print $2}')
    local available_mem=$(free -m | awk 'NR==2{print $7}')
    
    log_info "总内存: ${total_mem}MB"
    log_info "可用内存: ${available_mem}MB"
    
    if [ "$total_mem" -lt 4096 ]; then
        log_warn "系统内存少于 4GB，可能影响性能"
    else
        log_info "系统内存充足"
    fi
    
    # 检查磁盘空间
    local available_disk=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    log_info "可用磁盘空间: ${available_disk}GB"
    
    if [ "$available_disk" -lt 10 ]; then
        log_warn "可用磁盘空间少于 10GB"
    else
        log_info "磁盘空间充足"
    fi
}

# 检查镜像构建
check_image_build() {
    log_info "检查镜像构建..."
    
    # 检查是否可以构建镜像
    if [ -f "backend/Dockerfile" ]; then
        log_info "测试后端镜像构建..."
        if docker build -t test-backend ./backend >/dev/null 2>&1; then
            log_info "✓ 后端镜像构建成功"
            docker rmi test-backend >/dev/null 2>&1 || true
        else
            log_error "✗ 后端镜像构建失败"
        fi
    fi
    
    if [ -f "Dockerfile" ]; then
        log_info "测试前端镜像构建..."
        if docker build -t test-frontend . >/dev/null 2>&1; then
            log_info "✓ 前端镜像构建成功"
            docker rmi test-frontend >/dev/null 2>&1 || true
        else
            log_error "✗ 前端镜像构建失败"
        fi
    fi
}

# 检查服务依赖
check_service_dependencies() {
    log_info "检查服务依赖..."
    
    # 检查后端依赖
    if [ -f "backend/package.json" ]; then
        check "后端 package.json 存在" "test -f backend/package.json"
        
        # 检查关键依赖
        local package_file="backend/package.json"
        
        check "@nestjs/core 依赖" "grep -q '@nestjs/core' $package_file"
        check "typeorm 依赖" "grep -q 'typeorm' $package_file"
        check "pg 依赖" "grep -q '\"pg\"' $package_file"
        check "ioredis 依赖" "grep -q 'ioredis' $package_file"
    fi
}

# 检查健康检查配置
check_health_checks() {
    log_info "检查健康检查配置..."
    
    # 检查 docker-compose.yml 中的健康检查
    if grep -q "healthcheck:" docker-compose.yml; then
        log_info "✓ 发现健康检查配置"
    else
        log_warn "未发现健康检查配置"
    fi
    
    # 检查后端健康检查端点
    if [ -f "backend/src/main.ts" ]; then
        if grep -q "health" backend/src/main.ts; then
            log_info "✓ 发现后端健康检查端点"
        else
            log_warn "未发现后端健康检查端点"
        fi
    fi
}

# 检查安全配置
check_security_configuration() {
    log_info "检查安全配置..."
    
    # 检查 Dockerfile 中的安全配置
    if [ -f "backend/Dockerfile" ]; then
        if grep -q "USER" backend/Dockerfile; then
            log_info "✓ Dockerfile 中配置了非 root 用户"
        else
            log_warn "Dockerfile 中未配置非 root 用户"
        fi
    fi
    
    # 检查环境变量中的安全配置
    if [ -f ".env.docker" ]; then
        if grep -q "JWT_SECRET" .env.docker; then
            local jwt_secret=$(grep "^JWT_SECRET=" .env.docker | cut -d'=' -f2)
            if [ ${#jwt_secret} -gt 20 ]; then
                log_info "✓ JWT_SECRET 长度足够"
            else
                log_warn "JWT_SECRET 长度不足，建议使用更长的密钥"
            fi
        fi
    fi
}

# 检查监控配置
check_monitoring_configuration() {
    log_info "检查监控配置..."
    
    # 检查 Prometheus 配置
    if [ -f "docker/prometheus/prometheus.yml" ]; then
        check "Prometheus 配置文件存在" "test -f docker/prometheus/prometheus.yml"
        check "Prometheus 配置语法正确" "docker run --rm -v $(pwd)/docker/prometheus:/etc/prometheus prom/prometheus:latest --config.file=/etc/prometheus/prometheus.yml --dry-run"
    fi
    
    # 检查 Grafana 配置
    if grep -q "grafana" docker-compose.yml; then
        log_info "✓ 发现 Grafana 服务配置"
    else
        log_warn "未发现 Grafana 服务配置"
    fi
}

# 检查备份配置
check_backup_configuration() {
    log_info "检查备份配置..."
    
    # 检查备份脚本
    if grep -q "backup" scripts/docker-deploy.sh; then
        log_info "✓ 发现备份功能配置"
    else
        log_warn "未发现备份功能配置"
    fi
    
    # 检查数据卷配置
    if grep -q "volumes:" docker-compose.yml; then
        log_info "✓ 发现数据卷配置"
    else
        log_warn "未发现数据卷配置"
    fi
}

# 生成验证报告
generate_report() {
    log_info "生成验证报告..."
    
    echo ""
    echo "=========================================="
    echo "           Docker 部署验证报告"
    echo "=========================================="
    echo "总检查项: $TOTAL_CHECKS"
    echo -e "通过检查: ${GREEN}$PASSED_CHECKS${NC}"
    echo -e "失败检查: ${RED}$FAILED_CHECKS${NC}"
    echo "成功率: $(( PASSED_CHECKS * 100 / TOTAL_CHECKS ))%"
    echo "=========================================="
    
    if [ $FAILED_CHECKS -eq 0 ]; then
        echo -e "${GREEN}✓ 所有检查通过，可以进行部署${NC}"
        return 0
    else
        echo -e "${RED}✗ 发现 $FAILED_CHECKS 个问题，请修复后重新检查${NC}"
        return 1
    fi
}

# 显示帮助信息
show_help() {
    echo "Docker 部署验证脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -v, --verbose  详细输出"
    echo "  -q, --quiet    静默模式"
    echo ""
    echo "检查项目:"
    echo "  - Docker 安装和配置"
    echo "  - 配置文件完整性"
    echo "  - 环境变量配置"
    echo "  - 网络配置"
    echo "  - 端口可用性"
    echo "  - 系统资源"
    echo "  - 镜像构建"
    echo "  - 服务依赖"
    echo "  - 健康检查配置"
    echo "  - 安全配置"
    echo "  - 监控配置"
    echo "  - 备份配置"
    echo ""
}

# 解析命令行参数
VERBOSE=false
QUIET=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -q|--quiet)
            QUIET=true
            shift
            ;;
        *)
            echo "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 主函数
main() {
    echo "=========================================="
    echo "        Docker 部署验证工具"
    echo "=========================================="
    echo ""
    
    # 执行所有检查
    check_docker_installation
    check_configuration_files
    check_environment_variables
    check_network_configuration
    check_port_availability
    check_system_resources
    check_image_build
    check_service_dependencies
    check_health_checks
    check_security_configuration
    check_monitoring_configuration
    check_backup_configuration
    
    # 生成报告
    generate_report
}

# 执行主函数
main "$@"
