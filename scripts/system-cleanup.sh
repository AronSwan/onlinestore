#!/bin/bash
# 系统清理脚本 - 阶段四优化版本
# 用于清理不再需要的Docker资源、临时文件和日志

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

# 检查Docker是否运行
check_docker() {
    log_info "检查Docker状态..."
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker未运行，请启动Docker服务"
        exit 1
    fi
    log_success "Docker运行正常"
}

# 清理Docker容器
cleanup_containers() {
    log_info "清理停止的Docker容器..."
    
    # 获取停止的容器数量
    stopped_containers=$(docker ps -a --filter "status=exited" --format "{{.Names}}" | wc -l)
    
    if [ "$stopped_containers" -gt 0 ]; then
        log_info "发现 $stopped_containers 个停止的容器，正在清理..."
        docker container prune -f
        log_success "已清理停止的容器"
    else
        log_info "没有发现停止的容器"
    fi
}

# 清理Docker镜像
cleanup_images() {
    log_info "清理未使用的Docker镜像..."
    
    # 清理悬空镜像
    dangling_images=$(docker images --filter "dangling=true" --format "{{.Repository}}:{{.Tag}}" | wc -l)
    
    if [ "$dangling_images" -gt 0 ]; then
        log_info "发现 $dangling_images 个悬空镜像，正在清理..."
        docker image prune -f
        log_success "已清理悬空镜像"
    else
        log_info "没有发现悬空镜像"
    fi
    
    # 清理未使用的镜像（保留最近使用的）
    log_info "清理超过30天未使用的镜像..."
    docker image prune -a -f --filter "until=720h" # 30天
    log_success "已清理旧镜像"
}

# 清理Docker网络
cleanup_networks() {
    log_info "清理未使用的Docker网络..."
    
    # 获取未使用的网络数量
    unused_networks=$(docker network ls --filter "dangling=true" --format "{{.Name}}" | wc -l)
    
    if [ "$unused_networks" -gt 0 ]; then
        log_info "发现 $unused_networks 个未使用的网络，正在清理..."
        docker network prune -f
        log_success "已清理未使用的网络"
    else
        log_info "没有发现未使用的网络"
    fi
}

# 清理Docker卷（谨慎操作）
cleanup_volumes() {
    log_info "检查Docker卷..."
    
    # 列出所有卷
    log_info "当前Docker卷列表："
    docker volume ls
    
    # 只清理明确标记为清理的卷
    cleanup_volumes=$(docker volume ls --filter "label=cleanup=true" --format "{{.Name}}" | wc -l)
    
    if [ "$cleanup_volumes" -gt 0 ]; then
        log_warning "发现 $cleanup_volumes 个标记为清理的卷，正在清理..."
        docker volume prune -f --filter "label=cleanup=true"
        log_success "已清理标记的卷"
    else
        log_info "没有发现标记为清理的卷"
    fi
}

# 清理日志文件
cleanup_logs() {
    log_info "清理应用程序日志..."
    
    # 清理超过7天的日志文件
    if [ -d "./logs" ]; then
        log_info "清理超过7天的日志文件..."
        find ./logs -name "*.log" -type f -mtime +7 -exec rm -f {} \;
        find ./logs -name "*.log.*" -type f -mtime +7 -exec rm -f {} \;
        log_success "已清理旧日志文件"
    fi
    
    # 清理Docker容器日志
    log_info "清理Docker容器日志..."
    docker_containers=$(docker ps -a --format "{{.Names}}")
    
    for container in $docker_containers; do
        if [ -f "/var/lib/docker/containers/$(docker inspect -f '{{.Id}}' $container)/${container}-json.log" ]; then
            # 截断日志文件，保留最后100MB
            truncate -s 100M "/var/lib/docker/containers/$(docker inspect -f '{{.Id}}' $container)/${container}-json.log" 2>/dev/null || true
        fi
    done
    
    log_success "已清理Docker容器日志"
}

# 清理临时文件
cleanup_temp_files() {
    log_info "清理临时文件..."
    
    # 清理Node.js临时文件
    if [ -d "./node_modules/.cache" ]; then
        rm -rf ./node_modules/.cache/*
        log_success "已清理Node.js缓存"
    fi
    
    # 清理构建临时文件
    if [ -d "./dist" ]; then
        find ./dist -name "*.tmp" -type f -mtime +1 -exec rm -f {} \;
        log_success "已清理构建临时文件"
    fi
    
    # 清理测试输出文件
    if [ -d "./test-output" ]; then
        find ./test-output -name "*" -type f -mtime +7 -exec rm -f {} \;
        log_success "已清理测试输出文件"
    fi
    
    # 清理性能报告（保留最近10个）
    if [ -d "./performance-reports" ]; then
        cd ./performance-reports
        ls -t | tail -n +11 | xargs -r rm -f
        cd ..
        log_success "已清理旧性能报告"
    fi
}

# 优化Docker系统
optimize_docker() {
    log_info "优化Docker系统..."
    
    # Docker系统清理
    docker system prune -a -f --volumes --filter "until=72h"
    
    log_success "Docker系统优化完成"
}

# 检查磁盘空间
check_disk_space() {
    log_info "检查磁盘空间使用情况..."
    
    # 显示当前磁盘使用情况
    df -h
    
    # 检查Docker占用的空间
    log_info "Docker空间使用情况："
    docker system df
    
    # 警告磁盘空间不足
    disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 80 ]; then
        log_warning "磁盘使用率超过80%，建议进一步清理"
    else
        log_success "磁盘使用率正常：$disk_usage%"
    fi
}

# 生成清理报告
generate_report() {
    log_info "生成清理报告..."
    
    report_file="./cleanup-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "=== 系统清理报告 ==="
        echo "清理时间: $(date)"
        echo "清理脚本版本: 阶段四优化版本"
        echo ""
        echo "=== Docker容器状态 ==="
        docker ps -a
        echo ""
        echo "=== Docker镜像状态 ==="
        docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
        echo ""
        echo "=== 磁盘使用情况 ==="
        df -h
        echo ""
        echo "=== Docker空间使用 ==="
        docker system df
        echo ""
        echo "=== 清理完成 ==="
    } > "$report_file"
    
    log_success "清理报告已生成: $report_file"
}

# 主函数
main() {
    echo "========================================"
    echo "    系统清理脚本 - 阶段四优化版本"
    echo "========================================"
    echo ""
    
    # 记录开始时间
    start_time=$(date +%s)
    
    # 执行清理步骤
    check_docker
    cleanup_containers
    cleanup_images
    cleanup_networks
    cleanup_volumes
    cleanup_logs
    cleanup_temp_files
    optimize_docker
    check_disk_space
    generate_report
    
    # 计算执行时间
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    echo ""
    echo "========================================"
    log_success "系统清理完成！"
    log_info "总耗时: ${duration}秒"
    echo "========================================"
}

# 执行主函数
main "$@"