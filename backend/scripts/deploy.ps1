<#
.SYNOPSIS
  后端系统部署脚本 - PowerShell版本

.DESCRIPTION
  用于部署Caddy购物网站后端系统，包括Docker容器构建和启动

.PARAMETER EnvFile
  环境变量文件路径，默认为当前目录下的.env

.EXAMPLE
  .\deploy.ps1

.EXAMPLE
  .\deploy.ps1 -EnvFile "C:\path\to\custom.env"
#>

# 用途：后端系统部署脚本 - PowerShell版本
# 依赖文件：docker-compose.yml, .env
# 作者：后端开发团队
# 时间：2025-09-30 10:30:00

param(
    [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 开始部署 Caddy 购物网站后端系统..." -ForegroundColor Green

# 检查环境变量文件
if (-not (Test-Path $EnvFile)) {
    Write-Host "⚠️  未找到 $EnvFile 文件，使用 .env.example 创建..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" $EnvFile
        Write-Host "📝 请编辑 $EnvFile 文件配置数据库和Redis连接信息" -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "❌ 未找到 .env.example 文件，请手动创建环境变量文件" -ForegroundColor Red
        exit 1
    }
}

# 加载环境变量
Write-Host "📋 加载环境变量..." -ForegroundColor Cyan
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match "^[^#]") {
        $key, $value = $_ -split '=', 2
        [System.Environment]::SetEnvironmentVariable($key, $value)
    }
}

# 创建必要的目录
Write-Host "📁 创建必要的目录..." -ForegroundColor Cyan
$directories = @("docker\mysql", "docker\nginx\ssl")
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  创建目录: $dir" -ForegroundColor Gray
    }
}

# 检查Docker是否安装
Write-Host "🔍 检查Docker是否安装..." -ForegroundColor Cyan
try {
    $dockerVersion = docker --version
    Write-Host "  $dockerVersion" -ForegroundColor Gray
} catch {
    Write-Host "❌ Docker未安装或未在PATH中，请先安装Docker" -ForegroundColor Red
    exit 1
}

# 检查Docker Compose是否安装
Write-Host "🔍 检查Docker Compose是否安装..." -ForegroundColor Cyan
try {
    $dockerComposeVersion = docker-compose --version
    Write-Host "  $dockerComposeVersion" -ForegroundColor Gray
} catch {
    Write-Host "❌ Docker Compose未安装或未在PATH中，请先安装Docker Compose" -ForegroundColor Red
    exit 1
}

# 构建并启动服务
Write-Host "🔨 构建Docker镜像..." -ForegroundColor Cyan
docker-compose build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker镜像构建失败" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 启动服务..." -ForegroundColor Cyan
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 服务启动失败" -ForegroundColor Red
    exit 1
}

# 等待服务启动
Write-Host "⏳ 等待服务启动..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# 检查服务状态
Write-Host "🔍 检查服务状态..." -ForegroundColor Cyan
$servicesStatus = docker-compose ps
$runningServices = $servicesStatus | Where-Object { $_ -match "Up" }

if ($runningServices) {
    Write-Host "✅ 所有服务启动成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 服务信息：" -ForegroundColor Cyan
    Write-Host "  应用服务: http://localhost:3000" -ForegroundColor White
    Write-Host "  API文档: http://localhost:3000/api/docs" -ForegroundColor White
    Write-Host "  健康检查: http://localhost:3000/health" -ForegroundColor White
    Write-Host "  MySQL: localhost:3306" -ForegroundColor White
    Write-Host "  Redis: localhost:6379" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 常用命令：" -ForegroundColor Cyan
    Write-Host "  查看日志: docker-compose logs -f app" -ForegroundColor White
    Write-Host "  停止服务: docker-compose down" -ForegroundColor White
    Write-Host "  重启服务: docker-compose restart" -ForegroundColor White
    Write-Host "  查看状态: docker-compose ps" -ForegroundColor White
} else {
    Write-Host "❌ 服务启动失败，请检查日志：" -ForegroundColor Red
    docker-compose logs
    exit 1
}