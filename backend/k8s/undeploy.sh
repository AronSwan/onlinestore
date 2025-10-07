#!/bin/bash

# 用途：Kubernetes卸载脚本 - 适用于Linux生产环境
# 依赖文件：apply-all.yaml
# 作者：后端开发团队
# 时间：2025-09-30 11:20:00

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
    -h|--help)
      echo "用法: $0 [选项]"
      echo "选项:"
      echo "  -n, --namespace NAMESPACE  指定Kubernetes命名空间 (默认: $NAMESPACE)"
      echo "  -h, --help                  显示帮助信息"
      exit 0
      ;;
    *)
      echo "未知选项: $1"
      exit 1
      ;;
  esac
done

echo "🗑️  开始卸载 Caddy 风格购物网站后端服务从命名空间: $NAMESPACE..."

# 检查 kubectl 是否安装
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl 未安装，请先安装 kubectl"
    exit 1
fi

# 检查命名空间是否存在
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
    echo "⚠️  命名空间 $NAMESPACE 不存在，无需卸载"
    exit 0
fi

# 删除所有资源
echo "🗑️  删除 Kubernetes 资源..."
kubectl delete -f apply-all.yaml -n $NAMESPACE --ignore-not-found=true

# 等待资源删除完成
echo "⏳ 等待资源删除完成..."
sleep 10

# 检查是否还有残留资源
echo "🔍 检查残留资源..."
PODS=$(kubectl get pods -n $NAMESPACE -l app=caddy-shopping-backend --no-headers 2>/dev/null | wc -l)
SERVICES=$(kubectl get svc -n $NAMESPACE -l app=caddy-shopping-backend --no-headers 2>/dev/null | wc -l)
CONFIGMAPS=$(kubectl get configmap -n $NAMESPACE -l app=caddy-shopping-backend --no-headers 2>/dev/null | wc -l)
SECRETS=$(kubectl get secret -n $NAMESPACE -l app=caddy-shopping-backend --no-headers 2>/dev/null | wc -l)
HPAS=$(kubectl get hpa -n $NAMESPACE -l app=caddy-shopping-backend --no-headers 2>/dev/null | wc -l)
INGRESSES=$(kubectl get ingress -n $NAMESPACE -l app=caddy-shopping-backend --no-headers 2>/dev/null | wc -l)

if [ "$PODS" -eq 0 ] && [ "$SERVICES" -eq 0 ] && [ "$CONFIGMAPS" -eq 0 ] && [ "$SECRETS" -eq 0 ] && [ "$HPAS" -eq 0 ] && [ "$INGRESSES" -eq 0 ]; then
    echo "✅ 所有资源已成功删除"
else
    echo "⚠️  发现残留资源，正在强制删除..."
    
    # 强制删除残留资源
    kubectl delete pods -n $NAMESPACE -l app=caddy-shopping-backend --ignore-not-found=true --force --grace-period=0
    kubectl delete svc -n $NAMESPACE -l app=caddy-shopping-backend --ignore-not-found=true --force
    kubectl delete configmap -n $NAMESPACE -l app=caddy-shopping-backend --ignore-not-found=true --force
    kubectl delete secret -n $NAMESPACE -l app=caddy-shopping-backend --ignore-not-found=true --force
    kubectl delete hpa -n $NAMESPACE -l app=caddy-shopping-backend --ignore-not-found=true --force
    kubectl delete ingress -n $NAMESPACE -l app=caddy-shopping-backend --ignore-not-found=true --force
    
    # 再次等待
    sleep 5
    
    # 最终检查
    REMAINING=$(kubectl get all -n $NAMESPACE -l app=caddy-shopping-backend --no-headers 2>/dev/null | wc -l)
    if [ "$REMAINING" -eq 0 ]; then
        echo "✅ 所有残留资源已成功删除"
    else
        echo "⚠️  仍有部分资源无法自动删除，请手动检查："
        kubectl get all -n $NAMESPACE -l app=caddy-shopping-backend
    fi
fi

# 询问是否删除命名空间
echo ""
read -p "是否要删除命名空间 $NAMESPACE? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  删除命名空间 $NAMESPACE..."
    kubectl delete namespace $NAMESPACE
    echo "✅ 命名空间 $NAMESPACE 已删除"
else
    echo "✅ 卸载完成，命名空间 $NAMESPACE 保留"
fi

echo "🎉 卸载完成！"