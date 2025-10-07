# Paperless-NGX 简化部署脚本
# 版本: 1.0.0

param(
    [string]$Domain = "localhost", 
    [int]$Port = 8010
)

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "🚀 开始部署 Paperless-NGX..." "Green"
Write-ColorOutput "📋 部署参数: 域名=$Domain, 端口=$Port" "Cyan"

try {
    # 检查 Docker
    Write-ColorOutput "🔍 检查 Docker..." "Cyan"
    docker --version
    docker-compose --version
    
    # 创建目录
    Write-ColorOutput "📁 创建必要目录..." "Cyan"
    $directories = @("data", "media", "export", "consume")
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-ColorOutput "✅ 创建目录: $dir" "Green"
        }
    }
    
    # 生成配置
    Write-ColorOutput "🔐 生成安全配置..." "Cyan"
    $secretKey = -join ((1..50) | ForEach-Object { [char]((65..90) + (97..122) + (48..57) | Get-Random) })
    $adminPassword = -join ((1..16) | ForEach-Object { [char]((65..90) + (97..122) + (48..57) | Get-Random) })
    
    # 创建 .env 文件
    Write-ColorOutput "📝 创建环境配置..." "Cyan"
    $envContent = @"
PAPERLESS_REDIS=redis://broker:6379
PAPERLESS_DBHOST=db
PAPERLESS_SECRET_KEY=$secretKey
PAPERLESS_ADMIN_USER=admin
PAPERLESS_ADMIN_PASSWORD=$adminPassword
PAPERLESS_TIME_ZONE=Asia/Shanghai
PAPERLESS_OCR_LANGUAGE=chi_sim+eng
PAPERLESS_ALLOWED_HOSTS=$Domain,localhost,127.0.0.1
PAPERLESS_CONSUMER_RECURSIVE=true
PAPERLESS_FILENAME_FORMAT={created_year}/{correspondent}/{title}
"@
    Set-Content -Path ".env" -Value $envContent -Encoding UTF8
    
    # 创建 docker-compose.yml
    Write-ColorOutput "🐳 创建 Docker Compose 配置..." "Cyan"
    $composeContent = @"
version: "3.4"
services:
  broker:
    image: docker.io/library/redis:7
    restart: unless-stopped
    volumes:
      - redisdata:/data

  db:
    image: docker.io/library/postgres:15
    restart: unless-stopped
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: paperless
      POSTGRES_USER: paperless
      POSTGRES_PASSWORD: paperless

  webserver:
    image: ghcr.io/paperless-ngx/paperless-ngx:latest
    restart: unless-stopped
    depends_on:
      - db
      - broker
    ports:
      - "$Port`:8000"
    env_file:
      - .env
    volumes:
      - data:/usr/src/paperless/data
      - media:/usr/src/paperless/media
      - ./export:/usr/src/paperless/export
      - ./consume:/usr/src/paperless/consume
    environment:
      PAPERLESS_REDIS: redis://broker:6379
      PAPERLESS_DBHOST: db

volumes:
  data:
  media:
  pgdata:
  redisdata:
"@
    Set-Content -Path "docker-compose.yml" -Value $composeContent -Encoding UTF8
    
    # 启动服务
    Write-ColorOutput "🚀 启动服务..." "Cyan"
    docker-compose pull
    docker-compose up -d
    
    # 等待服务启动
    Write-ColorOutput "⏳ 等待服务启动..." "Yellow"
    Start-Sleep -Seconds 30
    
    # 显示结果
    Write-ColorOutput "`n🎉 部署完成！" "Green"
    Write-ColorOutput "=" * 50 "Green"
    Write-ColorOutput "🌐 访问地址: http://$Domain`:$Port" "Cyan"
    Write-ColorOutput "👤 管理员用户: admin" "Cyan"
    Write-ColorOutput "🔑 管理员密码: $adminPassword" "Yellow"
    Write-ColorOutput "`n📋 管理命令:" "White"
    Write-ColorOutput "- 查看状态: docker-compose ps" "White"
    Write-ColorOutput "- 查看日志: docker-compose logs" "White"
    Write-ColorOutput "- 停止服务: docker-compose down" "White"
    Write-ColorOutput "=" * 50 "Green"
    
} catch {
    Write-ColorOutput "❌ 部署失败: $($_.Exception.Message)" "Red"
    exit 1
}