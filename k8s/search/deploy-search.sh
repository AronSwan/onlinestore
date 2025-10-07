#!/bin/bash

# Kubernetes搜索服务部署脚本
set -e

echo "🚀 部署搜索服务到Kubernetes..."

# 检查kubectl
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl未安装"
    exit 1
fi

# 检查Kubernetes连接
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ 无法连接到Kubernetes集群"
    exit 1
fi

echo "✅ Kubernetes连接正常"

# 创建命名空间
echo "📦 创建搜索命名空间..."
kubectl apply -f search-namespace.yaml

# 生成密钥
echo "🔑 生成搜索服务密钥..."
cat > temp-secrets.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: search-secrets
  namespace: search
type: Opaque
data:
  meili-master-key: $(openssl rand -base64 32 | base64)
  zinc-admin-user: $(echo -n "admin" | base64)
  zinc-admin-password: $(openssl rand -base64 16 | base64)
EOF

kubectl apply -f temp-secrets.yaml
rm -f temp-secrets.yaml

# 创建持久化存储
echo "💾 创建持久化存储..."
kubectl apply -f search-pvc.yaml

# 应用配置
echo "⚙️ 应用配置..."
kubectl apply -f search-configmap.yaml

# 部署搜索服务
echo "🔍 部署MeiliSearch..."
kubectl apply -f meilisearch-deployment.yaml

echo "🔍 部署ZincSearch..."
kubectl apply -f zincsearch-deployment.yaml

# 等待服务就绪
echo "⏳ 等待服务启动..."
sleep 30

# 检查部署状态
echo "📊 检查部署状态..."
kubectl get pods -n search
kubectl get services -n search

echo ""
echo "🎉 搜索服务部署完成!"
echo ""
echo "🔗 服务访问信息:"
echo "   - MeiliSearch: meilisearch-service.search.svc.cluster.local:7700"
echo "   - ZincSearch: zincsearch-service.search.svc.cluster.local:4080"
echo ""
echo "💡 常用命令:"
echo "   - 查看日志: kubectl logs -n search -l app=meilisearch"
echo "   - 重启服务: kubectl rollout restart deployment -n search"
echo "   - 删除部署: kubectl delete -f ."