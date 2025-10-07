# Paperless-NGX 配置生成器
# 版本: 1.0.0

function New-SecurityConfiguration {
    Write-ColorOutput "🔐 生成安全配置..." "Cyan"
    
    # 生成随机密钥
    $secretKey = -join ((1..50) | ForEach-Object { [char]((65..90) + (97..122) + (48..57) | Get-Random) })
    
    # 生成管理员密码
    $adminPassword = -join ((1..16) | ForEach-Object { [char]((65..90) + (97..122) + (48..57) + (33,35,36,37,38,42,43,45,61,63,64) | Get-Random) })
    
    $config = @{
        SecretKey = $secretKey
        AdminPassword = $adminPassword
        TimeZone = "Asia/Shanghai"
        Language = "zh-cn"
    }
    
    Write-ColorOutput "✅ 安全配置生成完成" "Green"
    return $config
}

function New-EnvironmentConfiguration {
    param($SecurityConfig)
    
    Write-ColorOutput "📝 创建环境配置..." "Cyan"
    
    $envContent = @"
# Paperless-NGX 环境配置
# 生成时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# 基础配置
PAPERLESS_REDIS=redis://broker:6379
PAPERLESS_DBHOST=db
PAPERLESS_DBPORT=5432
PAPERLESS_DBNAME=paperless
PAPERLESS_DBUSER=paperless
PAPERLESS_DBPASS=paperless

# 安全配置
PAPERLESS_SECRET_KEY=$($SecurityConfig.SecretKey)
PAPERLESS_ADMIN_USER=admin
PAPERLESS_ADMIN_PASSWORD=$($SecurityConfig.AdminPassword)
PAPERLESS_ADMIN_MAIL=admin@$Domain

# 本地化配置
PAPERLESS_TIME_ZONE=$($SecurityConfig.TimeZone)
PAPERLESS_OCR_LANGUAGE=chi_sim+eng
PAPERLESS_OCR_LANGUAGES=chi_sim eng

# 功能配置
PAPERLESS_CONSUMER_RECURSIVE=true
PAPERLESS_CONSUMER_SUBDIRS_AS_TAGS=true
PAPERLESS_FILENAME_FORMAT={created_year}/{correspondent}/{title}
PAPERLESS_FILENAME_FORMAT_REMOVE_NONE=true

# 安全配置
PAPERLESS_ALLOWED_HOSTS=$Domain,localhost,127.0.0.1
PAPERLESS_CORS_ALLOWED_HOSTS=http://$Domain`:$Port,http://localhost:$Port
PAPERLESS_FORCE_SCRIPT_NAME=
PAPERLESS_STATIC_URL=/static/
PAPERLESS_AUTO_LOGIN_USERNAME=
PAPERLESS_COOKIE_PREFIX=paperless_
PAPERLESS_ENABLE_HTTP_REMOTE_USER=false

# 文档处理配置
PAPERLESS_OCR_MODE=skip
PAPERLESS_OCR_SKIP_ARCHIVE_FILE=with_text
PAPERLESS_OCR_CLEAN=clean
PAPERLESS_OCR_DESKEW=true
PAPERLESS_OCR_ROTATE_PAGES=true
PAPERLESS_OCR_ROTATE_PAGES_THRESHOLD=12.0
PAPERLESS_OCR_OUTPUT_TYPE=pdfa
PAPERLESS_OCR_PAGES=0
PAPERLESS_OCR_IMAGE_DPI=300

# 任务配置
PAPERLESS_TASK_WORKERS=1
PAPERLESS_THREADS_PER_WORKER=1
PAPERLESS_WORKER_TIMEOUT=1800

# 日志配置
PAPERLESS_LOGROTATE_MAX_SIZE=1048576
PAPERLESS_LOGROTATE_MAX_BACKUPS=20

# 数据保留配置
PAPERLESS_EMPTY_TRASH_DIR=
PAPERLESS_TRASH_DIR=

# 邮件配置（可选）
PAPERLESS_EMAIL_HOST=
PAPERLESS_EMAIL_PORT=587
PAPERLESS_EMAIL_HOST_USER=
PAPERLESS_EMAIL_HOST_PASSWORD=
PAPERLESS_EMAIL_USE_TLS=true
PAPERLESS_EMAIL_USE_SSL=false

# Redis 配置
PAPERLESS_REDIS_PREFIX=paperless
"@

    Set-Content -Path ".env" -Value $envContent -Encoding UTF8
    Write-ColorOutput "✅ 环境配置文件已创建: .env" "Green"
}

function Update-DockerCompose {
    Write-ColorOutput "🔧 更新 Docker Compose 配置..." "Cyan"
    
    # 读取现有配置
    $composeContent = Get-Content -Path "docker-compose.yml" -Raw
    
    # 添加环境变量文件引用
    $updatedContent = $composeContent -replace "environment:", "env_file:`n      - .env`n    environment:"
    
    # 更新端口映射
    $updatedContent = $updatedContent -replace "8000:8000", "$Port`:8000"
    
    Set-Content -Path "docker-compose.yml" -Value $updatedContent -Encoding UTF8
    Write-ColorOutput "✅ Docker Compose 配置已更新" "Green"
}