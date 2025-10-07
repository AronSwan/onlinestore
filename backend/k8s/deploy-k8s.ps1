<#
.SYNOPSIS
  Kubernetes部署脚本 - PowerShell版本

.DESCRIPTION
  用于在Kubernetes集群上部署Caddy购物网站后端服务

.PARAMETER Namespace
  Kubernetes命名空间，默认为"caddy-shopping"

.PARAMETER KubeConfig
  Kubernetes配置文件路径，可选

.EXAMPLE
  .\deploy-k8s.ps1

.EXAMPLE
  .\deploy-k8s.ps1 -Namespace "my-namespace"
#>

# 用途：Kubernetes部署脚本 - PowerShell版本
# 依赖文件：apply-all.yaml, configmap.yaml, secrets.yaml
# 作者：后端开发团队
# 时间：2025-09-30 10:35:00

param(
    [string]$Namespace = "caddy-shopping",
    [string]$KubeConfig
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 开始部署 Caddy 风格购物网站后端服务..." -ForegroundColor Green

# 检查 kubectl 是否安装
Write-Host "🔍 检查 kubectl 是否安装..." -ForegroundColor Cyan
try {
    $kubectlVersion = kubectl version --client --short
    Write-Host "  $kubectlVersion" -ForegroundColor Gray
} catch {
    Write-Host "❌ kubectl 未安装或未在PATH中，请先安装 kubectl" -ForegroundColor Red
    exit 1
}

# 检查 Docker 是否安装
Write-Host "🔍 检查 Docker 是否安装..." -ForegroundColor Cyan
try {
    $dockerVersion = docker --version
    Write-Host "  $dockerVersion" -ForegroundColor Gray
} catch {
    Write-Host "❌ Docker 未安装或未在PATH中，请先安装 Docker" -ForegroundColor Red
    exit 1
}

# 设置 kubectl 配置文件参数（如果提供）
$kubectlArgs = @()
if ($KubeConfig) {
    $kubectlArgs += "--kubeconfig=$KubeConfig"
}

# 创建命名空间（如果不存在）
Write-Host "📦 创建命名空间 $Namespace..." -ForegroundColor Cyan
$namespaceYaml = kubectl $kubectlArgs create namespace $Namespace --dry-run=client -o yaml
$namespaceYaml | kubectl $kubectlArgs apply -f -

# 构建 Docker 镜像
Write-Host "🐳 构建 Docker 镜像..." -ForegroundColor Cyan
docker build -t caddy-shopping-backend:latest .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker 镜像构建失败" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker 镜像构建成功" -ForegroundColor Green

# 验证 Kubernetes 配置文件
Write-Host "🔍 验证 Kubernetes 配置文件..." -ForegroundColor Cyan
kubectl $kubectlArgs apply -f apply-all.yaml --dry-run=client --validate=true

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Kubernetes 配置文件验证失败" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Kubernetes 配置文件验证通过" -ForegroundColor Green

# 部署到 Kubernetes
Write-Host "📋 部署到 Kubernetes..." -ForegroundColor Cyan
kubectl $kubectlArgs apply -f apply-all.yaml

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Kubernetes 部署失败" -ForegroundColor Red
    exit 1
}

# 等待部署完成
Write-Host "⏳ 等待部署完成..." -ForegroundColor Cyan
kubectl $kubectlArgs rollout status deployment/caddy-shopping-backend -n $Namespace --timeout=300s

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ 部署可能未完全完成，但继续检查状态..." -ForegroundColor Yellow
}

# 检查服务状态
Write-Host "🔍 检查服务状态..." -ForegroundColor Cyan
kubectl $kubectlArgs get pods -n $Namespace -l app=caddy-shopping-backend

# 检查 ConfigMap 和 Secret
Write-Host "🔐 检查配置和密钥..." -ForegroundColor Cyan
kubectl $kubectlArgs get configmap -n $Namespace
Write-Host "---" -ForegroundColor Gray
kubectl $kubectlArgs get secret -n $Namespace

# 获取服务信息
Write-Host "🌐 服务信息：" -ForegroundColor Cyan
kubectl $kubectlArgs get service caddy-shopping-backend-service -n $Namespace

# 检查 HPA 状态
Write-Host "📈 检查 HPA 状态..." -ForegroundColor Cyan
kubectl $kubectlArgs get hpa -n $Namespace

# 显示部署摘要
Write-Host ""
Write-Host "🎉 部署完成！" -ForegroundColor Green
Write-Host "📊 查看 Pod 状态：kubectl $kubectlArgs get pods -n $Namespace" -ForegroundColor White
Write-Host "🔗 查看服务：kubectl $kubectlArgs get service -n $Namespace" -ForegroundColor White
Write-Host "🔐 查看配置：kubectl $kubectlArgs get configmap,secret -n $Namespace" -ForegroundColor White
Write-Host "📈 查看 HPA：kubectl $kubectlArgs get hpa -n $Namespace" -ForegroundColor White
Write-Host "📝 查看日志：kubectl $kubectlArgs logs -f deployment/caddy-shopping-backend -n $Namespace" -ForegroundColor White

# 健康检查
Write-Host "🏥 执行健康检查..." -ForegroundColor Cyan
try {
    $healthCheck = kubectl $kubectlArgs exec -n $Namespace deployment/caddy-shopping-backend -- curl -s http://localhost:3000/health
    if ($healthCheck -match '"status":"ok"') {
        Write-Host "✅ 健康检查通过" -ForegroundColor Green
    } else {
        Write-Host "⚠️ 健康检查响应异常：$healthCheck" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ 健康检查失败，请检查服务状态" -ForegroundColor Yellow
}