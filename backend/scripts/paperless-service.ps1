# Paperless-NGX 服务管理
# 版本: 1.0.0

function Start-PaperlessServices {
    param($SecurityConfig)
    
    Write-ColorOutput "🚀 启动 Paperless-NGX 服务..." "Cyan"
    
    # 更新 Docker Compose 配置
    Update-DockerCompose
    
    # 拉取最新镜像
    Write-ColorOutput "📥 拉取 Docker 镜像..." "Cyan"
    docker-compose pull
    
    # 启动服务
    Write-ColorOutput "🔄 启动服务容器..." "Cyan"
    docker-compose up -d
    
    # 等待数据库初始化
    Write-ColorOutput "⏳ 等待数据库初始化..." "Yellow"
    Start-Sleep -Seconds 10
    
    # 运行数据库迁移
    Write-ColorOutput "🔄 执行数据库迁移..." "Cyan"
    docker-compose exec -T webserver python manage.py migrate
    
    # 创建管理员用户
    Write-ColorOutput "👤 创建管理员用户..." "Cyan"
    $createUserScript = @"
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@$Domain', '$($SecurityConfig.AdminPassword)')
    print('管理员用户创建成功')
else:
    print('管理员用户已存在')
"@
    
    $scriptFile = "create_admin.py"
    Set-Content -Path $scriptFile -Value $createUserScript -Encoding UTF8
    docker-compose exec -T webserver python manage.py shell < $scriptFile
    Remove-Item $scriptFile -Force
    
    Write-ColorOutput "✅ 服务启动完成" "Green"
}

function Stop-PaperlessServices {
    Write-ColorOutput "🛑 停止 Paperless-NGX 服务..." "Cyan"
    docker-compose down
    Write-ColorOutput "✅ 服务已停止" "Green"
}

function Restart-PaperlessServices {
    Write-ColorOutput "🔄 重启 Paperless-NGX 服务..." "Cyan"
    docker-compose restart
    Write-ColorOutput "✅ 服务已重启" "Green"
}

function Get-PaperlessLogs {
    param(
        [string]$Service = "",
        [int]$Lines = 50
    )
    
    if ($Service) {
        docker-compose logs --tail=$Lines $Service
    } else {
        docker-compose logs --tail=$Lines
    }
}

function Get-PaperlessStatus {
    Write-ColorOutput "📊 Paperless-NGX 服务状态:" "Cyan"
    docker-compose ps
    
    Write-ColorOutput "`n💾 存储使用情况:" "Cyan"
    docker system df
    
    Write-ColorOutput "`n🔍 健康检查:" "Cyan"
    try {
        $response = Invoke-WebRequest -Uri "http://$Domain`:$Port" -UseBasicParsing -TimeoutSec 5
        Write-ColorOutput "✅ Web 服务正常 (HTTP $($response.StatusCode))" "Green"
    } catch {
        Write-ColorOutput "❌ Web 服务异常: $($_.Exception.Message)" "Red"
    }
}

function Backup-PaperlessData {
    param(
        [string]$BackupPath = ".\backups\$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    )
    
    Write-ColorOutput "💾 开始备份 Paperless-NGX 数据..." "Cyan"
    
    # 创建备份目录
    if (-not (Test-Path $BackupPath)) {
        New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    }
    
    # 备份数据库
    Write-ColorOutput "📊 备份数据库..." "Cyan"
    docker-compose exec -T db pg_dump -U paperless paperless > "$BackupPath\database.sql"
    
    # 备份媒体文件
    Write-ColorOutput "📁 备份媒体文件..." "Cyan"
    docker-compose exec -T webserver tar -czf - /usr/src/paperless/media > "$BackupPath\media.tar.gz"
    
    # 备份数据文件
    Write-ColorOutput "📄 备份数据文件..." "Cyan"
    docker-compose exec -T webserver tar -czf - /usr/src/paperless/data > "$BackupPath\data.tar.gz"
    
    # 备份配置文件
    Write-ColorOutput "⚙️ 备份配置文件..." "Cyan"
    Copy-Item "docker-compose.yml" "$BackupPath\"
    Copy-Item ".env" "$BackupPath\"
    
    $backupSize = (Get-ChildItem $BackupPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-ColorOutput "✅ 备份完成！" "Green"
    Write-ColorOutput "📍 备份位置: $BackupPath" "Cyan"
    Write-ColorOutput "📊 备份大小: $([math]::Round($backupSize, 2)) MB" "Cyan"
}

function Restore-PaperlessData {
    param([string]$BackupPath)
    
    if (-not (Test-Path $BackupPath)) {
        throw "备份路径不存在: $BackupPath"
    }
    
    Write-ColorOutput "🔄 开始恢复 Paperless-NGX 数据..." "Cyan"
    Write-ColorOutput "⚠️ 此操作将覆盖现有数据，请确认继续..." "Yellow"
    
    $confirmation = Read-Host "输入 'YES' 确认恢复操作"
    if ($confirmation -ne "YES") {
        Write-ColorOutput "❌ 恢复操作已取消" "Yellow"
        return
    }
    
    # 停止服务
    Stop-PaperlessServices
    
    # 恢复配置文件
    if (Test-Path "$BackupPath\docker-compose.yml") {
        Copy-Item "$BackupPath\docker-compose.yml" "."
    }
    if (Test-Path "$BackupPath\.env") {
        Copy-Item "$BackupPath\.env" "."
    }
    
    # 启动服务
    Start-PaperlessServices
    
    # 恢复数据库
    if (Test-Path "$BackupPath\database.sql") {
        Write-ColorOutput "📊 恢复数据库..." "Cyan"
        Get-Content "$BackupPath\database.sql" | docker-compose exec -T db psql -U paperless paperless
    }
    
    # 恢复媒体文件
    if (Test-Path "$BackupPath\media.tar.gz") {
        Write-ColorOutput "📁 恢复媒体文件..." "Cyan"
        Get-Content "$BackupPath\media.tar.gz" | docker-compose exec -T webserver tar -xzf - -C /
    }
    
    # 恢复数据文件
    if (Test-Path "$BackupPath\data.tar.gz") {
        Write-ColorOutput "📄 恢复数据文件..." "Cyan"
        Get-Content "$BackupPath\data.tar.gz" | docker-compose exec -T webserver tar -xzf - -C /
    }
    
    # 重启服务
    Restart-PaperlessServices
    
    Write-ColorOutput "✅ 数据恢复完成！" "Green"
}