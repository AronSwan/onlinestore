#!/bin/bash

# OpenObserve 启动脚本
# 用途：启动 OpenObserve 服务并初始化配置
# 使用方法：./scripts/start-openobserve.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否在正确的目录
check_directory() {
    if [ ! -f "package.json" ]; then
        log_error "Please run this script from the backend directory"
        exit 1
    fi
}

# 检查 Docker 是否运行
check_docker() {
    log_info "Checking Docker status..."
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    log_success "Docker is running"
}

# 检查 Docker Compose 是否可用
check_docker_compose() {
    log_info "Checking Docker Compose..."
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    log_success "Docker Compose is available"
}

# 创建必要的目录
create_directories() {
    log_info "Creating necessary directories..."
    mkdir -p docker/openobserve
    mkdir -p logs
    mkdir -p data/openobserve
    log_success "Directories created"
}

# 检查网络是否存在，不存在则创建
check_network() {
    log_info "Checking Docker network..."
    if ! docker network ls | grep -q "caddy-network"; then
        log_info "Creating caddy-network..."
        docker network create caddy-network
        log_success "Network created"
    else
        log_success "Network already exists"
    fi
}

# 启动 OpenObserve 容器
start_openobserve() {
    log_info "Starting OpenObserve container..."
    
    # 使用 docker compose 或 docker-compose
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_CMD="docker compose"
    fi
    
    cd docker/openobserve
    $COMPOSE_CMD up -d
    
    log_success "OpenObserve container started"
    cd ../..
}

# 等待服务启动
wait_for_startup() {
    log_info "Waiting for OpenObserve to start..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:5080/api/_health > /dev/null 2>&1; then
            log_success "OpenObserve is running and healthy"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts: Waiting for OpenObserve..."
        sleep 2
        ((attempt++))
    done
    
    log_error "OpenObserve failed to start within expected time"
    return 1
}

# 检查环境变量
check_environment() {
    log_info "Checking environment configuration..."
    
    # 检查是否有 .env.openobserve 文件
    if [ ! -f ".env.openobserve" ]; then
        log_warning ".env.openobserve file not found"
        log_info "Creating .env.openobserve from example..."
        
        if [ -f ".env.openobserve.example" ]; then
            cp .env.openobserve.example .env.openobserve
            log_success "Created .env.openobserve from example"
            log_warning "Please review and update .env.openobserve with your configuration"
        else
            log_error ".env.openobserve.example not found"
            exit 1
        fi
    else
        log_success ".env.openobserve file found"
    fi
}

# 初始化数据流
initialize_streams() {
    log_info "Initializing OpenObserve streams..."
    
    # 检查 Node.js 是否可用
    if ! command -v node &> /dev/null; then
        log_warning "Node.js not found, skipping stream initialization"
        log_info "Please run 'node scripts/init-openobserve-streams.js' manually after installing Node.js"
        return 0
    fi
    
    # 检查 axios 是否安装
    if ! node -e "require('axios')" 2>/dev/null; then
        log_warning "axios not found, installing..."
        npm install axios
    fi
    
    # 运行初始化脚本
    if node scripts/init-openobserve-streams.js; then
        log_success "Streams initialized successfully"
    else
        log_error "Failed to initialize streams"
        return 1
    fi
}

# 显示访问信息
show_access_info() {
    log_success "OpenObserve setup complete!"
    echo ""
    echo "🌐 Access Information:"
    echo "  Web UI: http://localhost:5080"
    echo "  API: http://localhost:5080/api"
    echo ""
    echo "📋 Default Credentials:"
    echo "  Email: admin@example.com"
    echo "  Password: Complexpass#123"
    echo ""
    echo "🔧 Management Commands:"
    echo "  View logs: docker logs -f openobserve"
    echo "  Stop service: docker-compose -f docker/openobserve/docker-compose.yml down"
    echo "  Restart service: docker-compose -f docker/openobserve/docker-compose.yml restart"
    echo ""
    echo "📚 Documentation:"
    echo "  OpenObserve Docs: https://openobserve.ai/docs"
    echo "  Configuration Guide: backend/docs/OPENOBSERVE_CONFIGURATION_ANALYSIS.md"
}

# 主函数
main() {
    echo "🚀 OpenObserve Setup Script"
    echo "=========================="
    echo ""
    
    # 执行所有检查和设置
    check_directory
    check_docker
    check_docker_compose
    create_directories
    check_network
    check_environment
    
    # 启动服务
    start_openobserve
    
    # 等待服务启动
    if ! wait_for_startup; then
        log_error "OpenObserve startup failed"
        log_info "Check logs with: docker logs openobserve"
        exit 1
    fi
    
    # 初始化数据流
    initialize_streams
    
    # 显示访问信息
    show_access_info
}

# 处理命令行参数
case "${1:-}" in
    "stop")
        log_info "Stopping OpenObserve..."
        cd docker/openobserve
        if command -v docker-compose &> /dev/null; then
            docker-compose down
        else
            docker compose down
        fi
        log_success "OpenObserve stopped"
        ;;
    "restart")
        log_info "Restarting OpenObserve..."
        cd docker/openobserve
        if command -v docker-compose &> /dev/null; then
            docker-compose restart
        else
            docker compose restart
        fi
        log_success "OpenObserve restarted"
        ;;
    "logs")
        log_info "Showing OpenObserve logs..."
        docker logs -f openobserve
        ;;
    "status")
        log_info "Checking OpenObserve status..."
        if curl -f http://localhost:5080/api/_health > /dev/null 2>&1; then
            log_success "OpenObserve is running and healthy"
        else
            log_error "OpenObserve is not running or unhealthy"
            exit 1
        fi
        ;;
    "help"|"-h"|"--help")
        echo "OpenObserve Management Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start     Start OpenObserve (default)"
        echo "  stop      Stop OpenObserve"
        echo "  restart   Restart OpenObserve"
        echo "  logs      Show OpenObserve logs"
        echo "  status    Check OpenObserve status"
        echo "  help      Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0              # Start OpenObserve"
        echo "  $0 start        # Start OpenObserve"
        echo "  $0 stop         # Stop OpenObserve"
        echo "  $0 logs         # View logs"
        ;;
    ""|"start")
        main
        ;;
    *)
        log_error "Unknown command: $1"
        log_info "Use '$0 help' for available commands"
        exit 1
        ;;
esac