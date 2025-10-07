#!/bin/bash

# Docker 部署脚本

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
    echo "Docker 部署脚本"
    echo ""
    echo "用法: $0 [命令] [选项]"
    echo ""
    echo "命令:"
    echo "  dev         启动开发环境"
    echo "  prod        启动生产环境"
    echo "  monitoring  启动监控服务"
    echo "  stop        停止所有服务"
    echo "  restart     重启服务"
    echo "  logs        查看日志"
    echo "  clean       清理资源"
    echo "  backup      备份数据"
    echo "  restore     恢复数据"
    echo "  health      健康检查"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -v, --verbose  详细输出"
    echo "  -f, --force    强制执行"
    echo ""
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
    
    # 检查 Docker 是否运行
    if ! docker info &> /dev/null; then
        log_error "Docker 服务未运行"
        exit 1
    fi
    
    log_info "依赖检查完成"
}

# 创建必要的目录和文件
setup_environment() {
    log_info "设置环境..."
    
    # 创建日志目录
    mkdir -p logs/{nginx,postgres,backend}
    
    # 创建 SSL 目录
    mkdir -p docker/nginx/ssl
    
    # 复制环境配置文件
    if [ ! -f .env ]; then
        if [ -f .env.docker ]; then
            cp .env.docker .env
            log_info "已复制 .env.docker 到 .env"
        else
            log_warn ".env 文件不存在，请手动创建"
        fi
    fi
    
    # 设置权限
    chmod +x scripts/*.sh
    
    log_info "环境设置完成"
}

# 启动开发环境
start_dev() {
    log_info "启动开发环境..."
    
    docker-compose -f docker-compose.dev.yml up -d
    
    log_info "开发环境启动完成"
    log_info "前端: http://localhost:3001"
    log_info "后端: http://localhost:3000"
    log_info "数据库: localhost:5433"
    log_info "Redis: localhost:6380"
    log_info "PgAdmin: http://localhost:5050"
    log_info "Redis Commander: http://localhost:8082"
}

# 启动生产环境
start_prod() {
    log_info "启动生产环境..."
    
    # 构建镜像
    docker-compose build
    
    # 启动服务
    docker-compose up -d
    
    log_info "生产环境启动完成"
    log_info "网站: http://localhost"
    log_info "API: http://localhost/api"
    log_info "负载均衡器: http://localhost:8000"
}

# 启动监控服务
start_monitoring() {
    log_info "启动监控服务..."
    
    docker-compose --profile monitoring up -d
    
    log_info "监控服务启动完成"
    log_info "Prometheus: http://localhost:9090"
    log_info "Grafana: http://localhost:3001"
    log_info "Kibana: http://localhost:5601"
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    
    docker-compose down
    docker-compose -f docker-compose.dev.yml down
    
    log_info "服务已停止"
}

# 重启服务
restart_services() {
    log_info "重启服务..."
    
    docker-compose restart
    
    log_info "服务已重启"
}

# 查看日志
show_logs() {
    local service=${1:-}
    
    if [ -n "$service" ]; then
        log_info "查看 $service 服务日志..."
        docker-compose logs -f "$service"
    else
        log_info "查看所有服务日志..."
        docker-compose logs -f
    fi
}

# 清理资源
clean_resources() {
    log_warn "清理 Docker 资源..."
    
    if [ "$FORCE" = true ]; then
        # 停止所有容器
        docker-compose down -v
        docker-compose -f docker-compose.dev.yml down -v
        
        # 删除未使用的镜像
        docker image prune -f
        
        # 删除未使用的卷
        docker volume prune -f
        
        # 删除未使用的网络
        docker network prune -f
        
        log_info "资源清理完成"
    else
        log_warn "使用 -f 或 --force 选项来强制清理资源"
    fi
}

# 备份数据
backup_data() {
    log_info "备份数据..."
    
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # 备份数据库
    docker-compose exec postgres pg_dump -U postgres shopping_db > "$backup_dir/database.sql"
    
    # 备份 Redis 数据
    docker-compose exec redis redis-cli BGSAVE
    docker cp shopping-redis:/data/dump.rdb "$backup_dir/redis.rdb"
    
    # 备份配置文件
    cp .env "$backup_dir/"
    cp -r docker/ "$backup_dir/"
    
    log_info "数据备份完成: $backup_dir"
}

# 恢复数据
restore_data() {
    local backup_dir=$1
    
    if [ -z "$backup_dir" ]; then
        log_error "请指定备份目录"
        exit 1
    fi
    
    if [ ! -d "$backup_dir" ]; then
        log_error "备份目录不存在: $backup_dir"
        exit 1
    fi
    
    log_info "恢复数据从: $backup_dir"
    
    # 恢复数据库
    if [ -f "$backup_dir/database.sql" ]; then
        docker-compose exec -T postgres psql -U postgres shopping_db < "$backup_dir/database.sql"
        log_info "数据库恢复完成"
    fi
    
    # 恢复 Redis 数据
    if [ -f "$backup_dir/redis.rdb" ]; then
        docker-compose stop redis
        docker cp "$backup_dir/redis.rdb" shopping-redis:/data/dump.rdb
        docker-compose start redis
        log_info "Redis 数据恢复完成"
    fi
    
    log_info "数据恢复完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local services=("frontend" "backend" "postgres" "redis" "email-verifier")
    local failed_services=()
    
    for service in "${services[@]}"; do
        if docker-compose ps "$service" | grep -q "Up (healthy)"; then
            log_info "✅ $service: 健康"
        elif docker-compose ps "$service" | grep -q "Up"; then
            log_warn "⚠️  $service: 运行中 (健康检查未配置或失败)"
        else
            log_error "❌ $service: 未运行"
            failed_services+=("$service")
        fi
    done
    
    if [ ${#failed_services[@]} -eq 0 ]; then
        log_info "所有服务运行正常"
    else
        log_error "以下服务存在问题: ${failed_services[*]}"
        exit 1
    fi
}

# 解析命令行参数
VERBOSE=false
FORCE=false

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
        -f|--force)
            FORCE=true
            shift
            ;;
        *)
            COMMAND=$1
            shift
            ;;
    esac
done

# 启用详细输出
if [ "$VERBOSE" = true ]; then
    set -x
fi

# 主函数
main() {
    check_dependencies
    setup_environment
    
    case "${COMMAND:-help}" in
        "dev")
            start_dev
            ;;
        "prod")
            start_prod
            ;;
        "monitoring")
            start_monitoring
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "logs")
            show_logs "$2"
            ;;
        "clean")
            clean_resources
            ;;
        "backup")
            backup_data
            ;;
        "restore")
            restore_data "$2"
            ;;
        "health")
            health_check
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# 执行主函数
main "$@"