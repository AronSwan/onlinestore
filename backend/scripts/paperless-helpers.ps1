# Paperless-NGX 辅助函数
# 版本: 1.0.0

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    
    Write-Host $Message -ForegroundColor $Color
}

function Test-Prerequisites {
    Write-ColorOutput "🔍 检查前置条件..." "Cyan"
    
    # 检查 Docker
    try {
        $dockerVersion = docker --version
        Write-ColorOutput "✅ Docker: $dockerVersion" "Green"
    } catch {
        throw "Docker 未安装或未启动。请安装 Docker Desktop 并确保服务正在运行。"
    }
    
    # 检查 Docker Compose
    try {
        $composeVersion = docker-compose --version
        Write-ColorOutput "✅ Docker Compose: $composeVersion" "Green"
    } catch {
        throw "Docker Compose 未安装。请安装 Docker Compose。"
    }
    
    # 检查端口占用
    $portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($portInUse) {
        throw "端口 $Port 已被占用。请选择其他端口或停止占用该端口的服务。"
    }
    
    Write-ColorOutput "✅ 所有前置条件检查通过" "Green"
}

function Initialize-DeploymentEnvironment {
    Write-ColorOutput "📁 初始化部署环境..." "Cyan"
    
    # 创建必要的目录
    $directories = @("data", "media", "export", "consume")
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-ColorOutput "✅ 创建目录: $dir" "Green"
        }
    }
    
    # 设置目录权限
    foreach ($dir in $directories) {
        $acl = Get-Acl $dir
        $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule("Everyone", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
        $acl.SetAccessRule($accessRule)
        Set-Acl -Path $dir -AclObject $acl
    }
    
    Write-ColorOutput "✅ 部署环境初始化完成" "Green"
}

function Get-ConfigurationFiles {
    if ($SkipDownload) {
        Write-ColorOutput "⏭️ 跳过配置文件下载" "Yellow"
        return
    }
    
    Write-ColorOutput "📥 下载配置文件..." "Cyan"
    
    # 下载 docker-compose.yml
    $composeUrl = "https://raw.githubusercontent.com/paperless-ngx/paperless-ngx/main/docker/compose/docker-compose.sqlite.yml"
    try {
        Invoke-WebRequest -Uri $composeUrl -OutFile "docker-compose.yml" -UseBasicParsing
        Write-ColorOutput "✅ 下载 docker-compose.yml" "Green"
    } catch {
        Write-ColorOutput "⚠️ 下载失败，使用默认配置" "Yellow"
        # 如果下载失败，创建默认配置
        $defaultCompose = @"
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
      - "$($Port):8000"
    healthcheck:
      test: ["CMD", "curl", "-fs", "-S", "--max-time", "2", "http://localhost:8000"]
      interval: 30s
      timeout: 10s
      retries: 5
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
        Set-Content -Path "docker-compose.yml" -Value $defaultCompose -Encoding UTF8
    }
    
    Write-ColorOutput "✅ 配置文件准备完成" "Green"
}

function Wait-ForServices {
    Write-ColorOutput "⏳ 等待服务启动..." "Cyan"
    
    $maxAttempts = 60
    $attempt = 0
    
    do {
        $attempt++
        Start-Sleep -Seconds 5
        
        try {
            $response = Invoke-WebRequest -Uri "http://$Domain`:$Port" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-ColorOutput "✅ 服务已就绪" "Green"
                return
            }
        } catch {
            Write-ColorOutput "⏳ 等待中... ($attempt/$maxAttempts)" "Yellow"
        }
        
    } while ($attempt -lt $maxAttempts)
    
    throw "服务启动超时，请检查 Docker 日志"
}

function Test-DeploymentHealth {
    Write-ColorOutput "🔍 验证部署健康状态..." "Cyan"
    
    # 检查容器状态
    $containers = docker-compose ps --services
    foreach ($container in $containers) {
        $status = docker-compose ps $container
        Write-ColorOutput "📦 $container`: 运行中" "Green"
    }
    
    # 检查 Web 服务
    try {
        $response = Invoke-WebRequest -Uri "http://$Domain`:$Port" -UseBasicParsing
        Write-ColorOutput "✅ Web 服务响应正常 (HTTP $($response.StatusCode))" "Green"
    } catch {
        Write-ColorOutput "⚠️ Web 服务检查失败: $($_.Exception.Message)" "Yellow"
    }
    
    Write-ColorOutput "✅ 健康检查完成" "Green"
}

function Show-DeploymentSummary {
    param($SecurityConfig)
    
    Write-ColorOutput "`n🎉 部署完成摘要" "Green"
    Write-ColorOutput "=" * 50 "Green"
    Write-ColorOutput "🌐 访问地址: http://$Domain`:$Port" "Cyan"
    Write-ColorOutput "👤 管理员用户: admin" "Cyan"
    Write-ColorOutput "🔑 管理员密码: $($SecurityConfig.AdminPassword)" "Yellow"
    Write-ColorOutput "🔐 Secret Key: $($SecurityConfig.SecretKey)" "Yellow"
    Write-ColorOutput "`n📋 后续步骤:" "White"
    Write-ColorOutput "1. 访问 Web 界面并登录" "White"
    Write-ColorOutput "2. 修改默认密码" "White"
    Write-ColorOutput "3. 配置用户和权限" "White"
    Write-ColorOutput "4. 开始上传文档" "White"
    Write-ColorOutput "`n🔧 管理命令:" "White"
    Write-ColorOutput "- 查看日志: docker-compose logs" "White"
    Write-ColorOutput "- 停止服务: docker-compose down" "White"
    Write-ColorOutput "- 重启服务: docker-compose restart" "White"
    Write-ColorOutput "=" * 50 "Green"
}