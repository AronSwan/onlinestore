#!/bin/bash

# OpenObserve 快速修复脚本
# 用途：解决 OpenObserve 登录问题
# 使用方法：./scripts/quick-fix-openobserve.sh

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

# 停止现有 OpenObserve 容器
stop_openobserve() {
    log_info "Stopping existing OpenObserve containers..."
    
    # 尝试停止 docker-compose 服务
    if [ -f "docker/openobserve/docker-compose.yml" ]; then
        cd docker/openobserve
        if command -v docker-compose &> /dev/null; then
            docker-compose down 2>/dev/null || true
        else
            docker compose down 2>/dev/null || true
        fi
        cd ../..
    fi
    
    # 尝试停止独立容器
    docker stop openobserve 2>/dev/null || true
    
    log_success "Containers stopped"
}

# 清理容器和卷
cleanup_openobserve() {
    log_info "Cleaning up containers and volumes..."
    
    # 删除容器
    docker rm openobserve 2>/dev/null || true
    
    # 删除卷（注意：这会删除所有数据）
    log_warning "This will delete all OpenObserve data"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker volume rm openobserve_data 2>/dev/null || true
        log_success "Volumes cleaned"
    else
        log_info "Skipping volume cleanup"
    fi
}

# 创建新的 Docker Compose 配置
create_docker_compose() {
    log_info "Creating new Docker Compose configuration..."
    
    mkdir -p docker/openobserve
    
    cat > docker/openobserve/docker-compose.yml << 'EOF'
version: '3.8'

services:
  openobserve:
    image: public.ecr.aws/zinclabs/openobserve:latest
    container_name: openobserve
    ports:
      - "5080:5080"
    environment:
      - ZO_ROOT_USER_EMAIL=admin@example.com
      - ZO_ROOT_USER_PASSWORD=Complexpass#123
      - ZO_DATA_DIR=/data
      - ZO_META_DIR=/data/meta
      - ZO_FILE_DATA_DIR=/data/files
    volumes:
      - openobserve_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5080/api/_health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  openobserve_data:
    driver: local
EOF
    
    log_success "Docker Compose configuration created"
}

# 启动 OpenObserve 服务
start_openobserve() {
    log_info "Starting OpenObserve service..."
    
    cd docker/openobserve
    if command -v docker-compose &> /dev/null; then
        docker-compose up -d
    else
        docker compose up -d
    fi
    cd ../..
    
    log_success "OpenObserve service started"
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

# 测试登录
test_login() {
    log_info "Testing login credentials..."
    
    # 尝试使用默认凭据
    local response=$(curl -s -X POST http://localhost:5080/api/default/login \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@example.com","password":"Complexpass#123"}' || echo "")
    
    if [[ $response == *"token"* ]]; then
        log_success "Login test successful"
        return 0
    else
        log_warning "Login test failed, but service is running"
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
    echo "📋 Login Credentials:"
    echo "  Email: admin@example.com"
    echo "  Password: Complexpass#123"
    echo ""
    echo "🔧 Management Commands:"
    echo "  View logs: docker logs -f openobserve"
    echo "  Stop service: docker-compose -f docker/openobserve/docker-compose.yml down"
    echo "  Restart service: docker-compose -f docker/openobserve/docker-compose.yml restart"
    echo ""
    echo "📚 Additional Help:"
    echo "  Troubleshooting guide: backend/docs/OPENOBSERVE_TROUBLESHOOTING.md"
    echo "  Configuration analysis: backend/docs/OPENOBSERVE_CONFIGURATION_ANALYSIS.md"
    echo ""
    echo "⚠️  If you still can't login:"
    echo "  1. Try different credentials (see troubleshooting guide)"
    echo "  2. Check container logs: docker logs openobserve"
    echo "  3. Reset the service: ./scripts/quick-fix-openobserve.sh reset"
}

# 显示容器日志
show_logs() {
    log_info "Showing OpenObserve logs..."
    docker logs -f openobserve
}

# 重置服务
reset_service() {
    log_info "Resetting OpenObserve service..."
    stop_openobserve
    cleanup_openobserve
    create_docker_compose
    start_openobserve
    wait_for_startup
    show_access_info
}

# 主函数
main() {
    echo "🔧 OpenObserve Quick Fix Script"
    echo "==============================="
    echo ""
    
    check_directory
    stop_openobserve
    cleanup_openobserve
    create_docker_compose
    start_openobserve
    
    if wait_for_startup; then
        test_login || true
        show_access_info
    else
        log_error "OpenObserve failed to start properly"
        log_info "Check logs with: $0 logs"
        log_info "Or try reset with: $0 reset"
        exit 1
    fi
}

# 处理命令行参数
case "${1:-}" in
    "stop")
        stop_openobserve
        ;;
    "start")
        start_openobserve
        wait_for_startup
        show_access_info
        ;;
    "restart")
        stop_openobserve
        start_openobserve
        wait_for_startup
        show_access_info
        ;;
    "logs")
        show_logs
        ;;
    "reset")
        reset_service
        ;;
    "test")
        test_login
        ;;
    "status")
        if curl -f http://localhost:5080/api/_health > /dev/null 2>&1; then
            log_success "OpenObserve is running and healthy"
            test_login
        else
            log_error "OpenObserve is not running or unhealthy"
            exit 1
        fi
        ;;
    "help"|"-h"|"--help")
        echo "OpenObserve Quick Fix Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  (none)    Complete fix process (default)"
        echo "  stop      Stop OpenObserve"
        echo "  start     Start OpenObserve"
        echo "  restart   Restart OpenObserve"
        echo "  logs      Show OpenObserve logs"
        echo "  reset     Reset OpenObserve (delete data)"
        echo "  test      Test login credentials"
        echo "  status    Check OpenObserve status"
        echo "  help      Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0              # Complete fix process"
        echo "  $0 reset        # Reset everything"
        echo "  $0 logs         # View logs"
        echo "  $0 test         # Test login"
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown command: $1"
        log_info "Use '$0 help' for available commands"
        exit 1
        ;;
esac