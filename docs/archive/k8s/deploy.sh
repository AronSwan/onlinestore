#!/bin/bash

# 用途：Kubernetes部署脚本 - 适用于Linux生产环境
# 依赖文件：apply-all.yaml, configmap.yaml, secrets.yaml
# 作者：后端开发团队
# 时间：2025-09-30 11:15:00

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

echo "🚀 开始部署 Caddy 风格购物网站后端服务到命名空间: $NAMESPACE..."

# 检查 kubectl 是否安装
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl 未安装，请先安装 kubectl"
    exit 1
fi

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 设置命名空间
echo "📦 创建命名空间 $NAMESPACE..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# 构建 Docker 镜像
echo "🐳 构建 Docker 镜像..."
docker build -t caddy-shopping-backend:latest .

# 检查镜像是否构建成功
if [ $? -ne 0 ]; then
    echo "❌ Docker 镜像构建失败"
    exit 1
fi

echo "✅ Docker 镜像构建成功"

# 验证 Kubernetes 配置文件
echo "🔍 验证 Kubernetes 配置文件..."
kubectl apply -f apply-all.yaml --dry-run=client --validate=true

if [ $? -ne 0 ]; then
    echo "❌ Kubernetes 配置文件验证失败"
    exit 1
fi

echo "✅ Kubernetes 配置文件验证通过"

# 部署到 Kubernetes 集群
echo "🚀 部署应用到 Kubernetes 集群..."
kubectl apply -f apply-all.yaml -n $NAMESPACE

# 等待部署完成
echo "⏳ 等待部署完成..."
kubectl rollout status deployment/caddy-shopping-backend -n $NAMESPACE --timeout=300s

# 检查服务状态
echo "🔍 检查服务状态..."
kubectl get pods -n $NAMESPACE -l app=caddy-shopping-backend
kubectl get svc -n $NAMESPACE -l app=caddy-shopping-backend

# 获取服务外部访问地址
echo "🌐 获取服务外部访问地址..."
SERVICE_IP=$(kubectl get svc caddy-shopping-backend-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
SERVICE_HOSTNAME=$(kubectl get svc caddy-shopping-backend-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

if [ -n "$SERVICE_IP" ]; then
  echo "✅ 服务已部署完成，可以通过 IP: $SERVICE_IP 访问"
elif [ -n "$SERVICE_HOSTNAME" ]; then
  echo "✅ 服务已部署完成，可以通过主机名: $SERVICE_HOSTNAME 访问"
else
  echo "✅ 服务已部署完成，正在等待外部IP分配..."
  echo "   使用以下命令检查服务状态:"
  echo "   kubectl get svc caddy-shopping-backend-service -n $NAMESPACE -w"
fi

# 显示健康检查命令
echo ""
echo "🔍 健康检查命令:"
echo "   kubectl get pods -n $NAMESPACE -l app=caddy-shopping-backend"
echo "   kubectl logs -n $NAMESPACE deployment/caddy-shopping-backend"
echo "   kubectl port-forward -n $NAMESPACE svc/caddy-shopping-backend-service 3000:3000"

echo "🎉 部署完成！"