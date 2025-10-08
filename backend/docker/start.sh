#!/bin/bash

# 后端优化Docker服务快速启动脚本
# 使用方法: ./start-optimized.sh [选项] [服务类型]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    cat << EOF
后端优化Docker服务快速启动脚本

使用方法:
    $0 [选项] [服务类型]

选项:
    -h, --help          显示此帮助信息
    -e, --env FILE      指定环境变量文件 (默认: .env)
    -p, --profile PROFILE 指定 Docker Compose profile
    -d, --detach        在后台运行服务
    -f, --force         强制重新创建容器
    -v, --verbose       显示详细输出
    -s, --stop          停止服务
    -r, --restart       重启服务
    -l, --logs          显示日志
    -c, --clean         清理未使用的资源

服务类型:
    all                 启动所有基础服务 (默认)
    backend             仅启动后端服务
    database            仅启动数据库服务
    cache               仅启动缓存服务
    monitoring          启动监控服务
    payment             启动支付服务 (需要 -p payment)
    tidb                启动TiDB服务 (需要 -p tidb)
    dev                 启动开发环境服务
    prod                启动生产环境服务

示例:
    $0                  # 启动所有基础服务
    $0 backend          # 仅启动后端服务
    $0 -p payment all   # 启动包含支付服务的所有服务
    $0 -p tidb all      # 启动包含TiDB的所有服务
    $0 -d monitoring    # 在后台启动监控服务
    $0 -s               # 停止所有服务
    $0 -l backend       # 查看后端服务日志
    $0 -c               # 清理未使用的资源

EOF
}

# 检查 Docker 和 Docker Compose
check_dependencies() {
    print_info "检查依赖..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装或不在 PATH 中"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装或不在 PATH 中"
        exit 1
    fi
    
    print_success "依赖检查通过"
}

# 检查环境变量文件
check_env_file() {
    local env_file="$1"
    
    if [[ ! -f "$env_file" ]]; then
        print_warning "环境变量文件 $env_file 不存在"
        
        if [[ -f ".env.example" ]]; then
            print_info "从 .env.example 创建环境变量文件..."
            cp .env.example "$env_file"
            print_warning "请编辑 $env_file 文件并设置正确的环境变量"
        else
            print_error ".env.example 文件不存在，无法创建环境变量文件"
        fi
        return 1
    fi
    
    return 0
}

# 启动服务
start_services() {
    local service_type="$1"
    local profile="$2"
    local detach="$3"
    local force="$4"
    local verbose="$5"
    
    local compose_args=""
    local compose_files="-f docker-compose.yml"
    
    # 添加 profile
    if [[ -n "$profile" ]]; then
        compose_args="$compose_args --profile $profile"
    fi
    
    # 添加后台运行
    if [[ "$detach" == "true" ]]; then
        compose_args="$compose_args -d"
    fi
    
    # 添加强制重新创建
    if [[ "$force" == "true" ]]; then
        compose_args="$compose_args --force-recreate"
    fi
    
    # 添加详细输出
    if [[ "$verbose" == "true" ]]; then
        compose_args="$compose_args --verbose"
    fi
    
    case "$service_type" in
        "all")
            print_info "启动所有基础服务..."
            docker-compose $compose_files $compose_args up
            ;;
        "backend")
            print_info "启动后端服务..."
            docker-compose $compose_files $compose_args up backend postgres redis email-verifier openobserve
            ;;
        "database")
            print_info "启动数据库服务..."
            docker-compose $compose_files $compose_args up postgres
            ;;
        "cache")
            print_info "启动缓存服务..."
            docker-compose $compose_files $compose_args up redis
            ;;
        "monitoring")
            print_info "启动监控服务..."
            docker-compose $compose_files $compose_args up openobserve node-exporter
            ;;
        "payment")
            print_info "启动支付服务..."
            if [[ -z "$profile" || "$profile" != "payment" ]]; then
                print_warning "支付服务需要使用 -p payment 选项"
            fi
            docker-compose $compose_files $compose_args up gopay-service crypto-gateway
            ;;
        "tidb")
            print_info "启动 TiDB 服务..."
            if [[ -z "$profile" || "$profile" != "tidb" ]]; then
                print_warning "TiDB 服务需要使用 -p tidb 选项"
            fi
            docker-compose $compose_files $compose_args up tidb-pd tidb-tikv tidb
            ;;
        "dev")
            print_info "启动开发环境服务..."
            docker-compose $compose_files $compose_args up postgres redis email-verifier backend openobserve
            ;;
        "prod")
            print_info "启动生产环境服务..."
            docker-compose $compose_files $compose_args up
            ;;
        *)
            print_error "未知的服务类型: $service_type"
            show_help
            exit 1
            ;;
    esac
    
    if [[ "$detach" == "true" ]]; then
        print_success "服务已在后台启动"
        print_info "使用 '$0 -l' 查看日志"
        print_info "使用 '$0 -s' 停止服务"
    else
        print_success "服务启动完成"
    fi
}

# 停止服务
stop_services() {
    local service_type="$1"
    
    case "$service_type" in
        "all"|"")
            print_info "停止所有服务..."
            docker-compose -f docker-compose.yml down
            ;;
        "backend")
            print_info "停止后端服务..."
            docker-compose -f docker-compose.yml stop backend postgres redis email-verifier openobserve
            ;;
        "database")
            print_info "停止数据库服务..."
            docker-compose -f docker-compose.yml stop postgres
            ;;
        "cache")
            print_info "停止缓存服务..."
            docker-compose -f docker-compose.yml stop redis
            ;;
        "monitoring")
            print_info "停止监控服务..."
            docker-compose -f docker-compose.yml stop openobserve node-exporter
            ;;
        "payment")
            print_info "停止支付服务..."
            docker-compose -f docker-compose.yml stop gopay-service crypto-gateway
            ;;
        "tidb")
            print_info "停止 TiDB 服务..."
            docker-compose -f docker-compose.yml --profile tidb down
            ;;
        *)
            print_error "未知的服务类型: $service_type"
            exit 1
            ;;
    esac
    
    print_success "服务已停止"
}

# 重启服务
restart_services() {
    local service_type="$1"
    
    print_info "重启服务: $service_type"
    stop_services "$service_type"
    sleep 2
    start_services "$service_type" "" "true" "false" "false"
}

# 显示日志
show_logs() {
    local service_type="$1"
    
    case "$service_type" in
        "all"|"")
            docker-compose -f docker-compose.yml logs -f
            ;;
        "backend")
            docker-compose -f docker-compose.yml logs -f backend
            ;;
        "database")
            docker-compose -f docker-compose.yml logs -f postgres
            ;;
        "cache")
            docker-compose -f docker-compose.yml logs -f redis
            ;;
        "monitoring")
            docker-compose -f docker-compose.yml logs -f openobserve
            ;;
        "payment")
            docker-compose -f docker-compose.yml --profile payment logs -f gopay-service
            ;;
        "tidb")
            docker-compose -f docker-compose.yml --profile tidb logs -f
            ;;
        *)
            print_error "未知的服务类型: $service_type"
            exit 1
            ;;
    esac
}

# 清理资源
clean_resources() {
    print_info "清理未使用的 Docker 资源..."
    
    # 清理停止的容器
    print_info "清理停止的容器..."
    docker container prune -f
    
    # 清理未使用的镜像
    print_info "清理未使用的镜像..."
    docker image prune -f
    
    # 清理未使用的网络
    print_info "清理未使用的网络..."
    docker network prune -f
    
    # 清理未使用的卷 (谨慎操作)
    read -p "是否清理未使用的数据卷? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "清理未使用的数据卷..."
        docker volume prune -f
    fi
    
    print_success "资源清理完成"
}

# 显示服务状态
show_status() {
    print_info "服务状态:"
    docker-compose -f docker-compose.yml ps
    
    # 显示profile服务的状态
    if docker-compose -f docker-compose.optimized.yml --profile payment config >/dev/null 2>&1; then
        print_info "\n支付服务状态:"
        docker-compose -f docker-compose.yml --profile payment ps
    fi
    
    if docker-compose -f docker-compose.optimized.yml --profile tidb config >/dev/null 2>&1; then
        print_info "\nTiDB 服务状态:"
        docker-compose -f docker-compose.yml --profile tidb ps
    fi
}

# 主函数
main() {
    local env_file=".env"
    local profile=""
    local detach="false"
    local force="false"
    local verbose="false"
    local action="start"
    local service_type="all"
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -e|--env)
                env_file="$2"
                shift 2
                ;;
            -p|--profile)
                profile="$2"
                shift 2
                ;;
            -d|--detach)
                detach="true"
                shift
                ;;
            -f|--force)
                force="true"
                shift
                ;;
            -v|--verbose)
                verbose="true"
                shift
                ;;
            -s|--stop)
                action="stop"
                shift
                ;;
            -r|--restart)
                action="restart"
                shift
                ;;
            -l|--logs)
                action="logs"
                shift
                ;;
            -c|--clean)
                action="clean"
                shift
                ;;
            --status)
                action="status"
                shift
                ;;
            all|backend|database|cache|monitoring|payment|tidb|dev|prod)
                service_type="$1"
                shift
                ;;
            *)
                print_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 检查依赖
    check_dependencies
    
    # 检查环境变量文件
    if [[ "$action" == "start" ]]; then
        if ! check_env_file "$env_file"; then
            print_error "请配置环境变量文件后重试"
            exit 1
        fi
    fi
    
    # 执行操作
    case "$action" in
        "start")
            start_services "$service_type" "$profile" "$detach" "$force" "$verbose"
            ;;
        "stop")
            stop_services "$service_type"
            ;;
        "restart")
            restart_services "$service_type"
            ;;
        "logs")
            show_logs "$service_type"
            ;;
        "clean")
            clean_resources
            ;;
        "status")
            show_status
            ;;
        *)
            print_error "未知操作: $action"
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"