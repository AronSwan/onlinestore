#!/bin/bash

# 用途：Kubernetes清理脚本，删除部署的资源
# 依赖文件：apply-all.yaml
# 作者：后端开发团队
# 时间：2025-09-26 19:10:00

set -e

echo "🧹 开始清理 Caddy 风格购物网站后端服务..."

# 检查 kubectl 是否安装
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl 未安装，请先安装 kubectl"
    exit 1
fi

# 设置命名空间
NAMESPACE="caddy-shopping"

# 确认操作
read -p "⚠️  确定要删除命名空间 '$NAMESPACE' 中的所有资源吗？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 操作已取消"
    exit 0
fi

# 删除所有资源
echo "🗑️  删除所有资源..."
kubectl delete -f k8s/apply-all.yaml --ignore-not-found=true

# 删除命名空间（可选，谨慎使用）
read -p "⚠️  是否要删除命名空间 '$NAMESPACE'？这将删除所有资源！(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  删除命名空间..."
    kubectl delete namespace $NAMESPACE --ignore-not-found=true
    echo "✅ 命名空间已删除"
else
    echo "ℹ️  保留命名空间，仅删除应用资源"
fi

# 清理 Docker 镜像（可选）
read -p "🧽 是否要清理本地 Docker 镜像？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧽 清理 Docker 镜像..."
    docker rmi caddy-shopping-backend:latest 2>/dev/null || echo "ℹ️  镜像不存在或已被清理"
    echo "✅ Docker 镜像已清理"
fi

echo "🎉 清理完成！"
echo ""
echo "📋 剩余资源检查："
kubectl get all -n $NAMESPACE 2>/dev/null || echo "ℹ️  命名空间 '$NAMESPACE' 不存在或为空"