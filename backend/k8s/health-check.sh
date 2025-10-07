#!/bin/bash

# 用途：Kubernetes健康检查脚本 - 适用于Linux生产环境
# 依赖文件：kubectl
# 作者：后端开发团队
# 时间：2025-09-30 11:25:00

set -e

# 默认命名空间
NAMESPACE="caddy-shopping"

# 解析命令行参数
while [[ $# -gt 0 ]]; do
  case $1 in
    -n|--namespace)
      NAMESPACE="$2"
      shift 2
      ;;
    -w|--watch)
      WATCH=true
      shift
      ;;
    -h|--help)
      echo "用法: $0 [选项]"
      echo "选项:"
      echo "  -n, --namespace NAMESPACE  指定Kubernetes命名空间 (默认: $NAMESPACE)"
      echo "  -w, --watch                持续监控状态"
      echo "  -h, --help                  显示帮助信息"
      exit 0
      ;;
    *)
      echo "未知选项: $1"
      exit 1
      ;;
  esac
done

# 检查 kubectl 是否安装
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl 未安装，请先安装 kubectl"
    exit 1
fi

# 检查命名空间是否存在
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
    echo "❌ 命名空间 $NAMESPACE 不存在"
    exit 1
fi

# 健康检查函数
health_check() {
    echo "🔍 执行健康检查 - $(date)"
    echo "================================="
    
    # 检查Pod状态
    echo "📦 Pod状态:"
    PODS=$(kubectl get pods -n $NAMESPACE -l app=caddy-shopping-backend --no-headers 2>/dev/null)
    if [ -z "$PODS" ]; then
        echo "❌ 没有找到Pod"
        return 1
    fi
    
    # 显示Pod状态
    kubectl get pods -n $NAMESPACE -l app=caddy-shopping-backend -o wide
    
    # 检查是否有Pod处于非Running状态
    NOT_RUNNING=$(kubectl get pods -n $NAMESPACE -l app=caddy-shopping-backend --no-headers | grep -v Running | wc -l)
    if [ "$NOT_RUNNING" -gt 0 ]; then
        echo "⚠️  有 $NOT_RUNNING 个Pod未处于Running状态"
        kubectl get pods -n $NAMESPACE -l app=caddy-shopping-backend --no-headers | grep -v Running
    else
        echo "✅ 所有Pod都处于Running状态"
    fi
    
    echo ""
    
    # 检查服务状态
    echo "🌐 服务状态:"
    kubectl get svc -n $NAMESPACE -l app=caddy-shopping-backend
    
    echo ""
    
    # 检查HPA状态
    echo "📈 HPA状态:"
    kubectl get hpa -n $NAMESPACE -l app=caddy-shopping-backend
    
    echo ""
    
    # 检查Ingress状态
    echo "🔗 Ingress状态:"
    kubectl get ingress -n $NAMESPACE -l app=caddy-shopping-backend
    
    echo ""
    
    # 检查资源使用情况
    echo "📊 资源使用情况:"
    kubectl top pods -n $NAMESPACE -l app=caddy-shopping-backend 2>/dev/null || echo "⚠️  无法获取资源使用情况，可能未安装metrics-server"
    
    echo ""
    
    # 检查最近的日志
    echo "📝 最近的日志 (最后10行):"
    kubectl logs -n $NAMESPACE deployment/caddy-shopping-backend --tail=10
    
    echo ""
    
    # 执行健康检查端点
    echo "🏥 执行应用健康检查..."
    HEALTH_STATUS=$(kubectl exec -n $NAMESPACE deployment/caddy-shopping-backend -- curl -s http://localhost:3000/health 2>/dev/null || echo "FAILED")
    
    if [ "$HEALTH_STATUS" == "FAILED" ]; then
        echo "❌ 健康检查失败"
        return 1
    else
        echo "✅ 健康检查通过: $HEALTH_STATUS"
    fi
    
    echo "================================="
    echo "✅ 健康检查完成"
}

# 执行健康检查
if [ "$WATCH" = true ]; then
    echo "🔄 持续监控模式 - 按 Ctrl+C 退出"
    while true; do
        clear
        health_check
        sleep 10
    done
else
    health_check
fi