# Docker 部署验证脚本 (PowerShell 版本)

param(
    [switch]$Help,
    [switch]$Verbose,
    [switch]$Quiet
)

# 颜色输出函数
function Write-ColorOutput {
    param(
        [string]$Message,
        [ConsoleColor]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# 日志函数
function Log-Info {
    param([string]$Message)
    if (-not $Quiet) {
        Write-ColorOutput "[INFO] $Message" -Color Green
    }
}

function Log-Warn {
    param([string]$Message)
    if (-not $Quiet) {
        Write-ColorOutput "[WARN] $Message" -Color Yellow
    }
}

function Log-Error {
    param([string]$Message)
    if (-not $Quiet) {
        Write-ColorOutput "[ERROR] $Message" -Color Red
    }
}

function Log-Debug {
    param([string]$Message)
    if ($Verbose) {
        Write-ColorOutput "[DEBUG] $Message" -Color Cyan
    }
}

# 验证结果统计
$script:TotalChecks = 0
$script:PassedChecks = 0
$script:FailedChecks = 0

# 检查函数
function Test-Check {
    param(
        [string]$Description,
        [scriptblock]$Command
    )
    
    $script:TotalChecks++
    
    Write-Host -NoNewline "检查: $Description ... "
    
    try {
        $result = & $Command
        if ($result) {
            Write-ColorOutput "✓ 通过" -Color Green
            $script:PassedChecks++
            return $true
        } else {
            Write-ColorOutput "✗ 失败" -Color Red
            $script:FailedChecks++
            return $false
        }
    } catch {
        Write-ColorOutput "✗ 失败" -Color Red
        $script:FailedChecks++
        return $false
    }
}

# 检查 Docker 安装
function Test-DockerInstallation {
    Log-Info "检查 Docker 安装..."
    
    Test-Check "Docker 命令可用" { Get-Command docker -ErrorAction SilentlyContinue }
    Test-Check "Docker 服务运行" { docker info 2>$null }
    Test-Check "Docker Compose 命令可用" { Get-Command docker-compose -ErrorAction SilentlyContinue }
    
    try {
        $dockerVersion = docker --version 2>$null
        if ($dockerVersion) {
            $version = [regex]::Match($dockerVersion, '\d+\.\d+').Value
            Log-Info "Docker 版本: $version"
        }
    } catch {
        Log-Warn "无法获取 Docker 版本信息"
    }
}

# 检查配置文件
function Test-ConfigurationFiles {
    Log-Info "检查配置文件..."
    
    Test-Check "docker-compose.yml 存在" { Test-Path "docker-compose.yml" }
    Test-Check "docker-compose.dev.yml 存在" { Test-Path "docker-compose.dev.yml" }
    Test-Check "后端 Dockerfile 存在" { Test-Path "backend/Dockerfile" }
    Test-Check "前端 Dockerfile 存在" { Test-Path "Dockerfile" }
    Test-Check "环境配置文件存在" { Test-Path ".env.docker" }
    Test-Check "部署脚本存在" { Test-Path "scripts/docker-deploy.sh" }
    
    # 检查配置文件语法
    Test-Check "docker-compose.yml 语法正确" { 
        try { docker-compose -f docker-compose.yml config 2>$null; $true } catch { $false }
    }
    Test-Check "docker-compose.dev.yml 语法正确" { 
        try { docker-compose -f docker-compose.dev.yml config 2>$null; $true } catch { $false }
    }
}

# 检查环境变量
function Test-EnvironmentVariables {
    Log-Info "检查环境变量..."
    
    if (Test-Path ".env.docker") {
        Test-Check "环境变量文件存在" { Test-Path ".env.docker" }
        
        $envFile = ".env.docker"
        $content = Get-Content $envFile -Raw
        
        Test-Check "POSTGRES_DB 配置" { $content -match '^POSTGRES_DB=' }
        Test-Check "POSTGRES_USER 配置" { $content -match '^POSTGRES_USER=' }
        Test-Check "POSTGRES_PASSWORD 配置" { $content -match '^POSTGRES_PASSWORD=' }
        Test-Check "JWT_SECRET 配置" { $content -match '^JWT_SECRET=' }
        Test-Check "NODE_ENV 配置" { $content -match '^NODE_ENV=' }
    } else {
        Log-Warn "环境配置文件 .env.docker 不存在"
    }
}

# 检查网络配置
function Test-NetworkConfiguration {
    Log-Info "检查网络配置..."
    
    # 检查网络是否已创建
    try {
        $networks = docker network ls 2>$null
        if ($networks -match "shopping-network") {
            Log-Info "Docker 网络 shopping-network 已存在"
        } else {
            Log-Warn "Docker 网络 shopping-network 不存在，将在部署时创建"
        }
    } catch {
        Log-Warn "无法检查 Docker 网络"
    }
}

# 检查端口占用
function Test-PortAvailability {
    Log-Info "检查端口可用性..."
    
    $ports = @(80, 443, 3000, 5432, 6379, 8080, 9200, 9090, 3001)
    
    foreach ($port in $ports) {
        try {
            $connection = New-Object System.Net.Sockets.TcpClient
            $connection.Connect("localhost", $port)
            $connection.Close()
            Log-Warn "端口 $port 已被占用"
        } catch {
            Log-Info "端口 $port 可用"
        }
    }
}

# 检查系统资源
function Test-SystemResources {
    Log-Info "检查系统资源..."
    
    # 检查内存
    $totalMemory = (Get-CimInstance -ClassName Win32_ComputerSystem).TotalPhysicalMemory / 1MB
    $availableMemory = (Get-Counter "\Memory\Available MBytes").CounterSamples.CookedValue
    
    Log-Info "总内存: $([math]::Round($totalMemory, 2))MB"
    Log-Info "可用内存: $([math]::Round($availableMemory, 2))MB"
    
    if ($totalMemory -lt 4096) {
        Log-Warn "系统内存少于 4GB，可能影响性能"
    } else {
        Log-Info "系统内存充足"
    }
    
    # 检查磁盘空间
    $disk = Get-PSDrive -Name (Get-Location).Drive.Name
    $availableDisk = $disk.Free / 1GB
    Log-Info "可用磁盘空间: $([math]::Round($availableDisk, 2))GB"
    
    if ($availableDisk -lt 10) {
        Log-Warn "可用磁盘空间少于 10GB"
    } else {
        Log-Info "磁盘空间充足"
    }
}

# 检查镜像构建
function Test-ImageBuild {
    Log-Info "检查镜像构建..."
    
    # 检查后端镜像构建
    if (Test-Path "backend/Dockerfile") {
        Log-Info "测试后端镜像构建..."
        try {
            $buildResult = docker build -t test-backend ./backend 2>&1
            if ($LASTEXITCODE -eq 0) {
                Log-Info "✓ 后端镜像构建成功"
                docker rmi test-backend 2>$null
            } else {
                Log-Error "✗ 后端镜像构建失败"
            }
        } catch {
            Log-Error "✗ 后端镜像构建失败"
        }
    }
    
    # 检查前端镜像构建
    if (Test-Path "Dockerfile") {
        Log-Info "测试前端镜像构建..."
        try {
            $buildResult = docker build -t test-frontend . 2>&1
            if ($LASTEXITCODE -eq 0) {
                Log-Info "✓ 前端镜像构建成功"
                docker rmi test-frontend 2>$null
            } else {
                Log-Error "✗ 前端镜像构建失败"
            }
        } catch {
            Log-Error "✗ 前端镜像构建失败"
        }
    }
}

# 检查服务依赖
function Test-ServiceDependencies {
    Log-Info "检查服务依赖..."
    
    if (Test-Path "backend/package.json") {
        Test-Check "后端 package.json 存在" { Test-Path "backend/package.json" }
        
        $packageFile = "backend/package.json"
        $content = Get-Content $packageFile -Raw
        
        Test-Check "@nestjs/core 依赖" { $content -match '@nestjs/core' }
        Test-Check "typeorm 依赖" { $content -match 'typeorm' }
        Test-Check "pg 依赖" { $content -match '"pg"' }
        Test-Check "ioredis 依赖" { $content -match 'ioredis' }
    }
}

# 检查健康检查配置
function Test-HealthChecks {
    Log-Info "检查健康检查配置..."
    
    if (Test-Path "docker-compose.yml") {
        $content = Get-Content "docker-compose.yml" -Raw
        if ($content -match "healthcheck:") {
            Log-Info "✓ 发现健康检查配置"
        } else {
            Log-Warn "未发现健康检查配置"
        }
    }
    
    if (Test-Path "backend/src/main.ts") {
        $content = Get-Content "backend/src/main.ts" -Raw
        if ($content -match "health") {
            Log-Info "✓ 发现后端健康检查端点"
        } else {
            Log-Warn "未发现后端健康检查端点"
        }
    }
}

# 检查安全配置
function Test-SecurityConfiguration {
    Log-Info "检查安全配置..."
    
    if (Test-Path "backend/Dockerfile") {
        $content = Get-Content "backend/Dockerfile" -Raw
        if ($content -match "USER") {
            Log-Info "✓ Dockerfile 中配置了非 root 用户"
        } else {
            Log-Warn "Dockerfile 中未配置非 root 用户"
        }
    }
    
    if (Test-Path ".env.docker") {
        $content = Get-Content ".env.docker" -Raw
        if ($content -match "JWT_SECRET=") {
            $jwtSecret = [regex]::Match($content, 'JWT_SECRET=(.+)').Groups[1].Value
            if ($jwtSecret.Length -gt 20) {
                Log-Info "✓ JWT_SECRET 长度足够"
            } else {
                Log-Warn "JWT_SECRET 长度不足，建议使用更长的密钥"
            }
        }
    }
}

# 检查监控配置
function Test-MonitoringConfiguration {
    Log-Info "检查监控配置..."
    
    if (Test-Path "docker/prometheus/prometheus.yml") {
        Test-Check "Prometheus 配置文件存在" { Test-Path "docker/prometheus/prometheus.yml" }
        
        # 简单的语法检查
        try {
            $prometheusConfig = Get-Content "docker/prometheus/prometheus.yml" -Raw | ConvertFrom-Yaml 2>$null
            if ($prometheusConfig) {
                Log-Info "✓ Prometheus 配置文件格式正确"
            }
        } catch {
            Log-Warn "Prometheus 配置文件可能存在语法问题"
        }
    }
    
    if (Test-Path "docker-compose.yml") {
        $content = Get-Content "docker-compose.yml" -Raw
        if ($content -match "grafana") {
            Log-Info "✓ 发现 Grafana 服务配置"
        } else {
            Log-Warn "未发现 Grafana 服务配置"
        }
    }
}

# 检查备份配置
function Test-BackupConfiguration {
    Log-Info "检查备份配置..."
    
    if (Test-Path "scripts/docker-deploy.sh") {
        $content = Get-Content "scripts/docker-deploy.sh" -Raw
        if ($content -match "backup") {
            Log-Info "✓ 发现备份功能配置"
        } else {
            Log-Warn "未发现备份功能配置"
        }
    }
    
    if (Test-Path "docker-compose.yml") {
        $content = Get-Content "docker-compose.yml" -Raw
        if ($content -match "volumes:") {
            Log-Info "✓ 发现数据卷配置"
        } else {
            Log-Warn "未发现数据卷配置"
        }
    }
}

# 生成验证报告
function New-ValidationReport {
    Log-Info "生成验证报告..."
    
    Write-Host ""
    Write-Host "=========================================="
    Write-Host "           Docker 部署验证报告"
    Write-Host "=========================================="
    Write-Host "总检查项: $script:TotalChecks"
    Write-ColorOutput "通过检查: $script:PassedChecks" -Color Green
    Write-ColorOutput "失败检查: $script:FailedChecks" -Color Red
    
    if ($script:TotalChecks -gt 0) {
        $successRate = [math]::Round(($script:PassedChecks * 100) / $script:TotalChecks, 2)
        Write-Host "成功率: $successRate%"
    }
    Write-Host "=========================================="
    
    if ($script:FailedChecks -eq 0) {
        Write-ColorOutput "✓ 所有检查通过，可以进行部署" -Color Green
        return $true
    } else {
        Write-ColorOutput "✗ 发现 $script:FailedChecks 个问题，请修复后重新检查" -Color Red
        return $false
    }
}

# 显示帮助信息
function Show-Help {
    Write-Host "Docker 部署验证脚本 (PowerShell 版本)"
    Write-Host ""
    Write-Host "用法: .\docker-deployment-validator.ps1 [选项]"
    Write-Host ""
    Write-Host "选项:"
    Write-Host "  -Help          显示帮助信息"
    Write-Host "  -Verbose       详细输出"
    Write-Host "  -Quiet         静默模式"
    Write-Host ""
    Write-Host "检查项目:"
    Write-Host "  - Docker 安装和配置"
    Write-Host "  - 配置文件完整性"
    Write-Host "  - 环境变量配置"
    Write-Host "  - 网络配置"
    Write-Host "  - 端口可用性"
    Write-Host "  - 系统资源"
    Write-Host "  - 镜像构建"
    Write-Host "  - 服务依赖"
    Write-Host "  - 健康检查配置"
    Write-Host "  - 安全配置"
    Write-Host "  - 监控配置"
    Write-Host "  - 备份配置"
    Write-Host ""
}

# 主函数
function Main {
    if ($Help) {
        Show-Help
        return
    }
    
    Write-Host "=========================================="
    Write-Host "        Docker 部署验证工具"
    Write-Host "=========================================="
    Write-Host ""
    
    # 执行所有检查
    Test-DockerInstallation
    Test-ConfigurationFiles
    Test-EnvironmentVariables
    Test-NetworkConfiguration
    Test-PortAvailability
    Test-SystemResources
    Test-ImageBuild
    Test-ServiceDependencies
    Test-HealthChecks
    Test-SecurityConfiguration
    Test-MonitoringConfiguration
    Test-BackupConfiguration
    
    # 生成报告
    $result = New-ValidationReport
    
    if (-not $result) {
        exit 1
    }
}

# 执行主函数
Main
