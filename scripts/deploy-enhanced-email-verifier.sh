#!/bin/bash

# Enhanced Email Verifier 微服务部署脚本
# 
# 功能特性：
# - 完整的服务栈部署
# - 健康检查和等待机制
# - 配置验证和生成
# - 监控和日志集成
# - 安全配置

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

# 显示帮助信息
show_help() {
    cat << EOF
Enhanced Email Verifier 部署脚本

用法: $0 [选项] [命令]

命令:
  deploy      部署完整服务栈
  start       启动服务
  stop        停止服务
  restart     重启服务
  logs        查看日志
  health      健康检查
  status      服务状态
  config      生成配置文件
  clean       清理资源
  test        运行测试
  monitor     打开监控仪表板

选项:
  -e, --env ENVIRONMENT      设置环境 (dev|staging|prod)
  -v, --verbose              详细输出
  -h, --help                 显示帮助信息
  --skip-monitoring          跳过监控服务部署
  --skip-ssl                 跳过SSL配置
  --enable-smtp              启用SMTP验证
  --enable-proxy             启用代理配置

示例:
  $0 deploy                   # 部署到开发环境
  $0 -e prod deploy           # 部署到生产环境
  $0 --enable-smtp deploy     # 启用SMTP验证部署
  $0 logs                     # 查看所有服务日志
  $0 logs email-verifier      # 查看特定服务日志
EOF
}

# 默认配置
ENVIRONMENT="dev"
VERBOSE=false
SKIP_MONITORING=false
SKIP_SSL=false
ENABLE_SMTP=false
ENABLE_PROXY=false
COMPOSE_FILE="docker/docker-compose.enhanced-email-verifier.yml"

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case "$1" in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --skip-monitoring)
            SKIP_MONITORING=true
            shift
            ;;
        --skip-ssl)
            SKIP_SSL=true
            shift
            ;;
        --enable-smtp)
            ENABLE_SMTP=true
            shift
            ;;
        --enable-proxy)
            ENABLE_PROXY=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        deploy|start|stop|restart|logs|health|status|config|clean|test|monitor)
            COMMAND="$1"
            shift
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 验证命令
if [ -z "${COMMAND:-}" ]; then
    COMMAND="deploy"
fi

# 详细输出函数
debug_log() {
    if [ "$VERBOSE" = true ]; then
        log_debug "$1"
    fi
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    local missing_deps=()
    
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        missing_deps+=("docker-compose")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "缺少依赖: ${missing_deps[*]}"
        log_info "请安装缺少的依赖后重试"
        exit 1
    fi
    
    # 检查Docker是否运行
    if ! docker info &> /dev/null; then
        log_error "Docker未运行，请启动Docker服务"
        exit 1
    fi
    
    log_info "依赖检查完成"
}

# 创建必要的目录
create_directories() {
    log_info "创建目录结构..."
    
    local dirs=(
        "docker/email-verifier"
        "docker/nginx/ssl"
        "docker/nginx/logs"
        "docker/redis"
        "docker/prometheus"
        "docker/grafana/provisioning/datasources"
        "docker/grafana/provisioning/dashboards"
        "docker/grafana/dashboards"
        "logs"
        "data/email-verifier"
        "data/redis"
        "data/openobserve"
        "data/prometheus"
        "data/grafana"
        "backups"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
        debug_log "创建目录: $dir"
    done
    
    log_info "目录创建完成"
}

# 生成环境配置
generate_environment_config() {
    log_info "生成环境配置..."
    
    local env_file=".env.${ENVIRONMENT}"
    local symlink_env=".env"
    
    # 根据环境生成配置
    case "$ENVIRONMENT" in
        "prod")
            cat > "$env_file" << EOF
# 生产环境配置
NODE_ENV=production
APP_VERSION=2.0.0

# Email Verifier配置
EMAIL_VERIFIER_API_URL=http://email-verifier:8080
EMAIL_VERIFIER_TIMEOUT=10000
EMAIL_VERIFIER_CACHE=true
EMAIL_VERIFIER_CACHE_EXPIRY=1800000
EMAIL_VERIFIER_UNKNOWN_CACHE_EXPIRY=300000
EMAIL_VERIFIER_NEGATIVE_CACHE_EXPIRY=60000

# 业务规则配置
ALLOW_DISPOSABLE_EMAIL=false
ALLOW_ROLE_ACCOUNT=false
REQUIRE_MX_RECORDS=true
MIN_EMAIL_REACHABILITY=medium
ENABLE_SMTP_CHECK=${ENABLE_SMTP}

# 性能配置
EMAIL_VERIFIER_MAX_CONCURRENCY=100
EMAIL_VERIFIER_DOMAIN_RATE_LIMIT=5
EMAIL_VERIFIER_GLOBAL_RATE_LIMIT=500

# Redis配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD:-}
REDIS_DB=0
REDIS_TTL=1800

# OpenObserve配置
OPENOBSERVE_ENABLED=true
OPENOBSERVE_BASE_URL=http://openobserve:5080
OPENOBSERVE_ORG=default
OPENOBSERVE_STREAM=email_verification
OPENOBSERVE_TOKEN=${OPENOBSERVE_TOKEN:-}
OPENOBSERVE_BATCH_SIZE=100
OPENOBSERVE_FLUSH_INTERVAL=5000

# 代理配置
SOCKS_PROXY=${SOCKS_PROXY:-}

# 监控配置
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true

# 日志配置
LOG_LEVEL=warn
LOG_FORMAT=json

# 安全配置
NGINX_WORKER_PROCESSES=auto
NGINX_WORKER_CONNECTIONS=2048

# SSL配置
SSL_CERT_FILE=/etc/nginx/ssl/cert.pem
SSL_KEY_FILE=/etc/nginx/ssl/key.pem
EOF
            ;;
        "staging")
            cat > "$env_file" << EOF
# 预发环境配置
NODE_ENV=staging
APP_VERSION=2.0.0

# Email Verifier配置
EMAIL_VERIFIER_API_URL=http://email-verifier:8080
EMAIL_VERIFIER_TIMEOUT=8000
EMAIL_VERIFIER_CACHE=true
EMAIL_VERIFIER_CACHE_EXPIRY=900000
EMAIL_VERIFIER_UNKNOWN_CACHE_EXPIRY=180000
EMAIL_VERIFIER_NEGATIVE_CACHE_EXPIRY=45000

# 业务规则配置
ALLOW_DISPOSABLE_EMAIL=false
ALLOW_ROLE_ACCOUNT=false
REQUIRE_MX_RECORDS=true
MIN_EMAIL_REACHABILITY=low
ENABLE_SMTP_CHECK=false

# 性能配置
EMAIL_VERIFIER_MAX_CONCURRENCY=50
EMAIL_VERIFIER_DOMAIN_RATE_LIMIT=3
EMAIL_VERIFIER_GLOBAL_RATE_LIMIT=200

# Redis配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TTL=900

# OpenObserve配置
OPENOBSERVE_ENABLED=true
OPENOBSERVE_BASE_URL=http://openobserve:5080
OPENOBSERVE_ORG=default
OPENOBSERVE_STREAM=email_verification
OPENOBSERVE_TOKEN=
OPENOBSERVE_BATCH_SIZE=50
OPENOBSERVE_FLUSH_INTERVAL=3000

# 监控配置
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true

# 日志配置
LOG_LEVEL=info
LOG_FORMAT=json

# 安全配置
NGINX_WORKER_PROCESSES=auto
NGINX_WORKER_CONNECTIONS=1024
EOF
            ;;
        *)  # dev
            cat > "$env_file" << EOF
# 开发环境配置
NODE_ENV=development
APP_VERSION=2.0.0-dev

# Email Verifier配置
EMAIL_VERIFIER_API_URL=http://email-verifier:8080
EMAIL_VERIFIER_TIMEOUT=5000
EMAIL_VERIFIER_CACHE=true
EMAIL_VERIFIER_CACHE_EXPIRY=300000
EMAIL_VERIFIER_UNKNOWN_CACHE_EXPIRY=60000
EMAIL_VERIFIER_NEGATIVE_CACHE_EXPIRY=30000

# 业务规则配置
ALLOW_DISPOSABLE_EMAIL=true
ALLOW_ROLE_ACCOUNT=true
REQUIRE_MX_RECORDS=false
MIN_EMAIL_REACHABILITY=unknown
ENABLE_SMTP_CHECK=false

# 性能配置
EMAIL_VERIFIER_MAX_CONCURRENCY=20
EMAIL_VERIFIER_DOMAIN_RATE_LIMIT=2
EMAIL_VERIFIER_GLOBAL_RATE_LIMIT=50

# Redis配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TTL=300

# OpenObserve配置
OPENOBSERVE_ENABLED=false
OPENOBSERVE_BASE_URL=http://openobserve:5080
OPENOBSERVE_ORG=default
OPENOBSERVE_STREAM=email_verification
OPENOBSERVE_TOKEN=
OPENOBSERVE_BATCH_SIZE=10
OPENOBSERVE_FLUSH_INTERVAL=1000

# 监控配置
PROMETHEUS_ENABLED=${SKIP_MONITORING:+false}
PROMETHEUS_ENABLED=${PROMETHEUSENABLED:-true}
GRAFANA_ENABLED=${SKIP_MONITORING:+false}
GRAFANA_ENABLED=${GRAFANAENABLED:-true}

# 日志配置
LOG_LEVEL=debug
LOG_FORMAT=pretty

# 安全配置
NGINX_WORKER_PROCESSES=1
NGINX_WORKER_CONNECTIONS=512
EOF
            ;;
    esac
    
    # 创建符号链接
    if [ -f "$env_file" ]; then
        ln -sf "$env_file" "$symlink_env"
        log_info "环境配置已生成: $env_file -> $symlink_env"
    else
        log_error "环境配置生成失败"
        exit 1
    fi
}

# 生成Redis配置
generate_redis_config() {
    log_info "生成Redis配置..."
    
    cat > docker/redis/redis.conf << EOF
# Redis配置文件
bind 0.0.0.0
port 6379
timeout 0
keepalive 300

# 内存配置
maxmemory 256mb
maxmemory-policy allkeys-lru

# 持久化配置
save 900 1
save 300 10
save 60 10000

# AOF配置
appendonly yes
appendfsync everysec

# 日志配置
loglevel notice
logfile /var/log/redis/redis.log

# 安全配置
${REDIS_PASSWORD:+requirepass $REDIS_PASSWORD}

# 性能配置
tcp-keepalive 60
tcp-backlog 511
EOF
    
    log_info "Redis配置已生成"
}

# 生成Prometheus配置
generate_prometheus_config() {
    if [ "$SKIP_MONITORING" = true ]; then
        log_info "跳过Prometheus配置生成"
        return
    fi
    
    log_info "生成Prometheus配置..."
    
    cat > docker/prometheus/prometheus.yml << EOF
# Prometheus配置
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'email-verifier'
    static_configs:
      - targets: ['email-verifier:8080']
    metrics_path: '/metrics'
    scrape_interval: 10s
    
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
    scrape_interval: 30s
    
  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
    scrape_interval: 30s
    
  - job_name: 'openobserve'
    static_configs:
      - targets: ['openobserve:5080']
    scrape_interval: 30s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
EOF
    
    log_info "Prometheus配置已生成"
}

# 生成Grafana配置
generate_grafana_config() {
    if [ "$SKIP_MONITORING" = true ]; then
        log_info "跳过Grafana配置生成"
        return
    fi
    
    log_info "生成Grafana配置..."
    
    # 数据源配置
    cat > docker/grafana/provisioning/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF
    
    # 仪表板配置
    cat > docker/grafana/provisioning/dashboards/dashboard.yml << EOF
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF
    
    log_info "Grafana配置已生成"
}

# 生成SSL证书（自签名，仅用于开发）
generate_ssl_certificates() {
    if [ "$SKIP_SSL" = true ]; then
        log_info "跳过SSL证书生成"
        return
    fi
    
    log_info "生成SSL证书..."
    
    local cert_file="docker/nginx/ssl/cert.pem"
    local key_file="docker/nginx/ssl/key.pem"
    
    if [ ! -f "$cert_file" ] || [ ! -f "$key_file" ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$key_file" \
            -out "$cert_file" \
            -subj "/C=CN/ST=State/L=City/O=Organization/CN=email-verifier.yourdomain.com"
        
        log_info "SSL证书已生成"
    else
        log_info "SSL证书已存在，跳过生成"
    fi
}

# 验证配置
validate_config() {
    log_info "验证配置..."
    
    # 检查Docker Compose文件
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Docker Compose文件不存在: $COMPOSE_FILE"
        exit 1
    fi
    
    # 验证Docker Compose配置
    if ! docker-compose -f "$COMPOSE_FILE" config > /dev/null; then
        log_error "Docker Compose配置验证失败"
        exit 1
    fi
    
    # 检查环境变量文件
    if [ ! -f ".env" ]; then
        log_error "环境变量文件不存在: .env"
        exit 1
    fi
    
    log_info "配置验证完成"
}

# 构建和启动服务
deploy_services() {
    log_info "部署服务..."
    
    # 拉取最新镜像
    log_info "拉取最新镜像..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # 构建自定义镜像
    log_info "构建自定义镜像..."
    docker-compose -f "$COMPOSE_FILE" build
    
    # 启动服务
    log_info "启动服务..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    log_info "服务部署完成"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    local services=("email-verifier" "redis")
    if [ "$SKIP_MONITORING" = false ]; then
        services+=("openobserve")
    fi
    
    for service in "${services[@]}"; do
        log_info "等待 $service 服务..."
        local max_attempts=30
        local attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up (healthy)"; then
                log_info "$service 服务已就绪"
                break
            fi
            
            if [ $attempt -eq $max_attempts ]; then
                log_error "$service 服务启动超时"
                return 1
            fi
            
            log_info "等待 $service 服务启动... ($attempt/$max_attempts)"
            sleep 2
            ((attempt++))
        done
    done
    
    log_info "所有服务已就绪"
}

# 运行健康检查
run_health_checks() {
    log_info "运行健康检查..."
    
    # 检查Email Verifier服务
    local health_url="http://localhost:8080/health"
    if curl -f "$health_url" &> /dev/null; then
        log_info "Email Verifier 健康检查通过"
    else
        log_error "Email Verifier 健康检查失败"
        return 1
    fi
    
    # 测试邮箱验证功能
    local test_email="test@example.com"
    local verify_url="http://localhost:8080/v1/${test_email}/verification"
    if curl -f "$verify_url" &> /dev/null; then
        log_info "邮箱验证功能测试通过"
    else
        log_warn "邮箱验证功能测试失败（可能是配置问题）"
    fi
    
    log_info "健康检查完成"
}

# 显示部署信息
show_deployment_info() {
    log_info "部署完成！"
    echo ""
    echo "服务信息:"
    echo "  Email Verifier API: http://localhost:8080"
    echo "  健康检查: http://localhost:8080/health"
    echo "  API文档: http://localhost/api/docs"
    echo ""
    
    if [ "$SKIP_MONITORING" = false ]; then
        echo "监控服务:"
        echo "  OpenObserve: http://localhost:5080"
        echo "  Prometheus: http://localhost:9090"
        echo "  Grafana: http://localhost:3000 (admin/admin)"
        echo ""
    fi
    
    echo "管理命令:"
    echo "  查看日志: $0 logs"
    echo "  停止服务: $0 stop"
    echo "  重启服务: $0 restart"
    echo "  健康检查: $0 health"
    echo "  服务状态: $0 status"
    echo ""
    echo "配置文件:"
    echo "  环境变量: .env"
    echo "  Docker Compose: $COMPOSE_FILE"
    echo "  Nginx配置: docker/nginx/enhanced-nginx.conf"
    echo ""
}

# 启动服务
start_services() {
    log_info "启动服务..."
    docker-compose -f "$COMPOSE_FILE" start
    log_info "服务启动完成"
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    docker-compose -f "$COMPOSE_FILE" stop
    log_info "服务停止完成"
}

# 重启服务
restart_services() {
    log_info "重启服务..."
    docker-compose -f "$COMPOSE_FILE" restart
    log_info "服务重启完成"
}

# 查看日志
show_logs() {
    local service="$1"
    
    if [ -n "$service" ]; then
        log_info "查看 $service 服务日志..."
        docker-compose -f "$COMPOSE_FILE" logs -f "$service"
    else
        log_info "查看所有服务日志..."
        docker-compose -f "$COMPOSE_FILE" logs -f
    fi
}

# 服务状态
show_status() {
    log_info "服务状态:"
    docker-compose -f "$COMPOSE_FILE" ps
}

# 清理资源
clean_resources() {
    log_info "清理资源..."
    
    # 停止并删除容器
    docker-compose -f "$COMPOSE_FILE" down -v
    
    # 删除未使用的镜像
    docker image prune -f
    
    # 删除未使用的网络
    docker network prune -f
    
    log_info "资源清理完成"
}

# 运行测试
run_tests() {
    log_info "运行测试..."
    
    # 运行单元测试
    if [ -d "backend/src/email-verification/__tests__" ]; then
        cd backend
        npm test -- src/email-verification/__tests__/
        cd ..
    else
        log_warn "测试目录不存在，跳过测试"
    fi
    
    log_info "测试完成"
}

# 打开监控仪表板
open_monitoring() {
    if [ "$SKIP_MONITORING" = true ]; then
        log_error "监控服务未启用"
        return 1
    fi
    
    log_info "打开监控仪表板..."
    
    # 尝试打开Grafana
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:3000"
    elif command -v open &> /dev/null; then
        open "http://localhost:3000"
    else
        log_info "请手动访问监控仪表板:"
        echo "  Grafana: http://localhost:3000 (admin/admin)"
        echo "  Prometheus: http://localhost:9090"
        echo "  OpenObserve: http://localhost:5080"
    fi
}

# 主函数
main() {
    log_info "开始部署 Enhanced Email Verifier 微服务..."
    log_info "环境: $ENVIRONMENT"
    
    check_dependencies
    create_directories
    generate_environment_config
    generate_redis_config
    generate_prometheus_config
    generate_grafana_config
    generate_ssl_certificates
    validate_config
    deploy_services
    wait_for_services
    run_health_checks
    show_deployment_info
    
    log_info "部署完成！"
}

# 命令处理
case "$COMMAND" in
    "deploy")
        main
        ;;
    "start")
        check_dependencies
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        ;;
    "logs")
        show_logs "$1"
        ;;
    "health")
        run_health_checks
        ;;
    "status")
        show_status
        ;;
    "config")
        create_directories
        generate_environment_config
        generate_redis_config
        generate_prometheus_config
        generate_grafana_config
        generate_ssl_certificates
        ;;
    "clean")
        clean_resources
        ;;
    "test")
        run_tests
        ;;
    "monitor")
        open_monitoring
        ;;
    *)
        log_error "未知命令: $COMMAND"
        show_help
        exit 1
        ;;
esac