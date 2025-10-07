#!/bin/bash

# Email Verifier 微服务部署脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装"
        exit 1
    fi
    
    log_info "依赖检查完成"
}

# 创建必要的目录
create_directories() {
    log_info "创建目录结构..."
    
    mkdir -p docker/email-verifier
    mkdir -p docker/nginx/ssl
    mkdir -p logs
    mkdir -p data/email-verifier
    mkdir -p data/redis
    
    log_info "目录创建完成"
}

# 设置环境变量
setup_environment() {
    log_info "设置环境变量..."
    
    # 创建 .env 文件（如果不存在）
    if [ ! -f .env ]; then
        cat > .env << EOF
# Email Verifier 配置
EMAIL_VERIFIER_API_URL=http://localhost:8080
EMAIL_VERIFIER_TIMEOUT=10000
EMAIL_VERIFIER_CACHE=true
EMAIL_VERIFIER_CACHE_EXPIRY=300000

# 业务规则配置
ALLOW_DISPOSABLE_EMAIL=false
ALLOW_ROLE_ACCOUNT=true
REQUIRE_MX_RECORDS=true
MIN_EMAIL_REACHABILITY=unknown
ENABLE_SMTP_CHECK=false

# SMTP 代理配置（如果需要）
# SOCKS_PROXY=socks5://user:pass@proxy:1080

# Redis 配置
REDIS_URL=redis://localhost:6379
REDIS_TTL=300

# 日志配置
LOG_LEVEL=info
EOF
        log_info "已创建 .env 配置文件，请根据需要修改"
    else
        log_info "使用现有的 .env 配置文件"
    fi
}

# 构建和启动服务
deploy_services() {
    log_info "构建和启动 Email Verifier 服务..."
    
    # 构建镜像
    docker-compose -f docker/docker-compose.email-verifier.yml build
    
    # 启动服务
    docker-compose -f docker/docker-compose.email-verifier.yml up -d
    
    log_info "服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    # 等待 email-verifier 服务
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:8080/health &> /dev/null; then
            log_info "Email Verifier 服务已就绪"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Email Verifier 服务启动超时"
            exit 1
        fi
        
        log_info "等待服务启动... ($attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
}

# 运行健康检查
health_check() {
    log_info "运行健康检查..."
    
    # 检查 email-verifier
    local health_response=$(curl -s http://localhost:8080/health)
    if [ $? -eq 0 ]; then
        log_info "Email Verifier 健康检查通过"
        echo "响应: $health_response"
    else
        log_error "Email Verifier 健康检查失败"
        exit 1
    fi
    
    # 测试验证功能
    log_info "测试邮箱验证功能..."
    local test_response=$(curl -s "http://localhost:8080/v1/test@example.com/verification")
    if [ $? -eq 0 ]; then
        log_info "邮箱验证功能测试通过"
        echo "测试响应: $test_response"
    else
        log_error "邮箱验证功能测试失败"
        exit 1
    fi
}

# 显示部署信息
show_deployment_info() {
    log_info "部署完成！"
    echo ""
    echo "服务信息:"
    echo "  Email Verifier API: http://localhost:8080"
    echo "  健康检查: http://localhost:8080/health"
    echo "  验证接口: http://localhost:8080/v1/{email}/verification"
    echo ""
    echo "管理命令:"
    echo "  查看日志: docker-compose -f docker/docker-compose.email-verifier.yml logs -f"
    echo "  停止服务: docker-compose -f docker/docker-compose.email-verifier.yml down"
    echo "  重启服务: docker-compose -f docker/docker-compose.email-verifier.yml restart"
    echo ""
    echo "配置文件:"
    echo "  环境变量: .env"
    echo "  Docker Compose: docker/docker-compose.email-verifier.yml"
    echo "  Nginx 配置: docker/nginx/nginx.conf"
}

# 主函数
main() {
    log_info "开始部署 Email Verifier 微服务..."
    
    check_dependencies
    create_directories
    setup_environment
    deploy_services
    wait_for_services
    health_check
    show_deployment_info
    
    log_info "部署完成！"
}

# 处理命令行参数
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "stop")
        log_info "停止服务..."
        docker-compose -f docker/docker-compose.email-verifier.yml down
        ;;
    "restart")
        log_info "重启服务..."
        docker-compose -f docker/docker-compose.email-verifier.yml restart
        ;;
    "logs")
        docker-compose -f docker/docker-compose.email-verifier.yml logs -f
        ;;
    "health")
        health_check
        ;;
    *)
        echo "用法: $0 {deploy|stop|restart|logs|health}"
        exit 1
        ;;
esac