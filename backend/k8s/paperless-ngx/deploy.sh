#!/bin/bash
# 用途：Paperless-NGX Kubernetes一键部署脚本
# 依赖文件：apply-all.yaml, data-migration.sh
# 作者：AI助手
# 时间：2025-09-30 16:10:00

set -e

echo "🚀 开始部署 Paperless-NGX 到 Kubernetes 集群..."

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

# 检查 kubectl 是否可用
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl 未安装或不在 PATH 中"
        exit 1
    fi
    log_success "kubectl 检查通过"
}

# 检查集群连接
check_cluster() {
    log_info "检查 Kubernetes 集群连接..."
    if ! kubectl cluster-info &> /dev/null; then
        log_error "无法连接到 Kubernetes 集群"
        exit 1
    fi
    log_success "集群连接正常"
}

# 创建命名空间
create_namespace() {
    log_info "创建 paperless 命名空间..."
    kubectl create namespace paperless --dry-run=client -o yaml | kubectl apply -f -
    log_success "命名空间创建完成"
}

# 部署存储
deploy_storage() {
    log_info "部署持久化存储..."
    kubectl apply -f storage.yaml -n paperless
    
    # 等待 PVC 创建完成
    log_info "等待存储卷就绪..."
    kubectl wait --for=condition=Ready pvc/paperless-data-pvc -n paperless --timeout=300s
    kubectl wait --for=condition=Ready pvc/paperless-media-pvc -n paperless --timeout=300s
    kubectl wait --for=condition=Ready pvc/postgresql-data-pvc -n paperless --timeout=300s
    kubectl wait --for=condition=Ready pvc/redis-data-pvc -n paperless --timeout=300s
    
    log_success "存储部署完成"
}

# 部署数据库
deploy_database() {
    log_info "部署 PostgreSQL 数据库..."
    kubectl apply -f postgresql.yaml -n paperless
    
    log_info "等待数据库就绪..."
    kubectl wait --for=condition=Ready pod -l app=paperless-postgresql -n paperless --timeout=300s
    
    log_success "数据库部署完成"
}

# 部署 Redis
deploy_redis() {
    log_info "部署 Redis 缓存..."
    kubectl apply -f redis.yaml -n paperless
    
    log_info "等待 Redis 就绪..."
    kubectl wait --for=condition=Ready pod -l app=paperless-redis -n paperless --timeout=300s
    
    log_success "Redis 部署完成"
}

# 数据迁移（可选）
data_migration() {
    if [ -f "../paperless-data/db.sqlite3" ]; then
        log_warning "检测到现有 SQLite 数据库，是否进行数据迁移？"
        read -p "是否执行数据迁移？(y/N): " migrate_choice
        
        if [[ $migrate_choice =~ ^[Yy]$ ]]; then
            log_info "开始数据迁移..."
            chmod +x data-migration.sh
            ./data-migration.sh
            log_success "数据迁移完成"
        else
            log_info "跳过数据迁移"
        fi
    else
        log_info "未检测到现有数据，跳过迁移"
    fi
}

# 部署 Paperless-NGX
deploy_paperless() {
    log_info "部署 Paperless-NGX 应用..."
    kubectl apply -f deployment.yaml -n paperless
    kubectl apply -f service.yaml -n paperless
    
    log_info "等待应用就绪..."
    kubectl wait --for=condition=Ready pod -l app=paperless-ngx -n paperless --timeout=600s
    
    log_success "Paperless-NGX 部署完成"
}

# 部署 Ingress
deploy_ingress() {
    log_info "部署 Ingress 配置..."
    kubectl apply -f ingress.yaml -n paperless
    log_success "Ingress 部署完成"
}

# 部署监控
deploy_monitoring() {
    log_info "部署监控配置..."
    kubectl apply -f monitoring.yaml -n paperless
    log_success "监控配置部署完成"
}

# 一键部署
full_deploy() {
    log_info "开始完整部署流程..."
    
    check_kubectl
    check_cluster
    create_namespace
    deploy_storage
    deploy_database
    deploy_redis
    data_migration
    deploy_paperless
    deploy_ingress
    deploy_monitoring
    
    log_success "🎉 Paperless-NGX 部署完成！"
}

# 快速部署（使用 apply-all.yaml）
quick_deploy() {
    log_info "开始快速部署..."
    
    check_kubectl
    check_cluster
    
    kubectl apply -f apply-all.yaml
    
    log_info "等待所有资源就绪..."
    kubectl wait --for=condition=Ready pod -l app -n paperless --timeout=600s
    
    log_success "🎉 Paperless-NGX 快速部署完成！"
}

# 显示部署状态
show_status() {
    log_info "检查部署状态..."
    
    echo ""
    echo "=== Pod 状态 ==="
    kubectl get pods -n paperless
    
    echo ""
    echo "=== 服务状态 ==="
    kubectl get svc -n paperless
    
    echo ""
    echo "=== Ingress 状态 ==="
    kubectl get ingress -n paperless
    
    echo ""
    echo "=== 存储状态 ==="
    kubectl get pvc -n paperless
}

# 显示访问信息
show_access_info() {
    log_info "部署访问信息："
    
    echo ""
    echo "📱 应用访问地址："
    echo "   https://paperless.caddy-shopping.com"
    
    echo ""
    echo "🔧 管理工具："
    echo "   查看 Pod 状态：kubectl get pods -n paperless"
    echo "   查看服务状态：kubectl get svc -n paperless"
    echo "   查看日志：kubectl logs -f deployment/paperless-ngx -n paperless"
    
    echo ""
    echo "📊 监控地址："
    echo "   Grafana: http://grafana.caddy-shopping.com"
    echo "   Prometheus: http://prometheus.caddy-shopping.com"
}

# 清理部署
cleanup() {
    log_warning "即将清理 Paperless-NGX 部署，此操作不可逆！"
    read -p "确认清理？(输入 'yes' 继续): " confirm
    
    if [ "$confirm" = "yes" ]; then
        log_info "开始清理..."
        kubectl delete -f apply-all.yaml --ignore-not-found=true
        kubectl delete namespace paperless --ignore-not-found=true
        log_success "清理完成"
    else
        log_info "取消清理操作"
    fi
}

# 显示帮助信息
show_help() {
    echo "Paperless-NGX Kubernetes 部署脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  full      完整部署（分步执行）"
    echo "  quick     快速部署（使用 apply-all.yaml）"
    echo "  status    显示部署状态"
    echo "  info      显示访问信息"
    echo "  cleanup   清理部署"
    echo "  help      显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 quick     # 快速部署"
    echo "  $0 status    # 查看状态"
}

# 主函数
main() {
    case "${1:-help}" in
        full)
            full_deploy
            ;;
        quick)
            quick_deploy
            ;;
        status)
            show_status
            ;;
        info)
            show_access_info
            ;;
        cleanup)
            cleanup
            ;;
        help|*)
            show_help
            ;;
    esac
}

# 执行主函数
main "$@"