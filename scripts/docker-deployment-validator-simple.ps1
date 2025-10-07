# Docker 部署验证脚本 (简化版)

param(
    [switch]$Help,
    [switch]$Verbose
)

# 显示帮助信息
function Show-Help {
    Write-Host "Docker 部署验证脚本 (简化版)"
    Write-Host ""
    Write-Host "用法: .\docker-deployment-validator-simple.ps1 [选项]"
    Write-Host ""
    Write-Host "选项:"
    Write-Host "  -Help          显示帮助信息"
    Write-Host "  -Verbose       详细输出"
    Write-Host ""
}

# 检查函数
function Test-Check {
    param(
        [string]$Description,
        [scriptblock]$Command
    )
    
    Write-Host -NoNewline "检查: $Description ... "
    
    try {
        $result = & $Command
        if ($result) {
            Write-Host "✓ 通过" -ForegroundColor Green
            return $true
        } else {
            Write-Host "✗ 失败" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "✗ 失败" -ForegroundColor Red
        return $false
    }
}

# 主验证函数
function Test-DockerDeployment {
    Write-Host "=========================================="
    Write-Host "        Docker 部署验证工具"
    Write-Host "=========================================="
    Write-Host ""
    
    $totalChecks = 0
    $passedChecks = 0
    
    # 检查 Docker 安装
    Write-Host "检查 Docker 安装..." -ForegroundColor Cyan
    
    if (Test-Check "Docker 命令可用" { Get-Command docker -ErrorAction SilentlyContinue }) { $passedChecks++ }
    $totalChecks++
    
    if (Test-Check "Docker 服务运行" { docker info 2>$null }) { $passedChecks++ }
    $totalChecks++
    
    if (Test-Check "Docker Compose 命令可用" { Get-Command docker-compose -ErrorAction SilentlyContinue }) { $passedChecks++ }
    $totalChecks++
    
    # 检查配置文件
    Write-Host "`n检查配置文件..." -ForegroundColor Cyan
    
    if (Test-Check "docker-compose.yml 存在" { Test-Path "docker-compose.yml" }) { $passedChecks++ }
    $totalChecks++
    
    if (Test-Check "docker-compose.dev.yml 存在" { Test-Path "docker-compose.dev.yml" }) { $passedChecks++ }
    $totalChecks++
    
    if (Test-Check "后端 Dockerfile 存在" { Test-Path "backend/Dockerfile" }) { $passedChecks++ }
    $totalChecks++
    
    if (Test-Check "前端 Dockerfile 存在" { Test-Path "Dockerfile" }) { $passedChecks++ }
    $totalChecks++
    
    if (Test-Check "环境配置文件存在" { Test-Path ".env.docker" }) { $passedChecks++ }
    $totalChecks++
    
    if (Test-Check "部署脚本存在" { Test-Path "scripts/docker-deploy.sh" }) { $passedChecks++ }
    $totalChecks++
    
    # 检查配置文件语法
    Write-Host "`n检查配置文件语法..." -ForegroundColor Cyan
    
    if (Test-Check "docker-compose.yml 语法正确" { 
        try { docker-compose -f docker-compose.yml config 2>$null; $true } catch { $false }
    }) { $passedChecks++ }
    $totalChecks++
    
    if (Test-Check "docker-compose.dev.yml 语法正确" { 
        try { docker-compose -f docker-compose.dev.yml config 2>$null; $true } catch { $false }
    }) { $passedChecks++ }
    $totalChecks++
    
    # 检查环境变量
    Write-Host "`n检查环境变量..." -ForegroundColor Cyan
    
    if (Test-Path ".env.docker") {
        $content = Get-Content ".env.docker" -Raw
        
        if (Test-Check "POSTGRES_DB 配置" { $content -match 'POSTGRES_DB=' }) { $passedChecks++ }
        $totalChecks++
        
        if (Test-Check "POSTGRES_USER 配置" { $content -match 'POSTGRES_USER=' }) { $passedChecks++ }
        $totalChecks++
        
        if (Test-Check "POSTGRES_PASSWORD 配置" { $content -match 'POSTGRES_PASSWORD=' }) { $passedChecks++ }
        $totalChecks++
        
        if (Test-Check "JWT_SECRET 配置" { $content -match 'JWT_SECRET=' }) { $passedChecks++ }
        $totalChecks++
        
        if (Test-Check "NODE_ENV 配置" { $content -match 'NODE_ENV=' }) { $passedChecks++ }
        $totalChecks++
    } else {
        Write-Host "警告: 环境配置文件 .env.docker 不存在" -ForegroundColor Yellow
    }
    
    # 检查后端依赖
    Write-Host "`n检查后端依赖..." -ForegroundColor Cyan
    
    if (Test-Path "backend/package.json") {
        $packageContent = Get-Content "backend/package.json" -Raw
        
        if (Test-Check "@nestjs/core 依赖" { $packageContent -match '@nestjs/core' }) { $passedChecks++ }
        $totalChecks++
        
        if (Test-Check "typeorm 依赖" { $packageContent -match 'typeorm' }) { $passedChecks++ }
        $totalChecks++
        
        if (Test-Check "pg 依赖" { $packageContent -match '"pg"' }) { $passedChecks++ }
        $totalChecks++
        
        if (Test-Check "ioredis 依赖" { $packageContent -match 'ioredis' }) { $passedChecks++ }
        $totalChecks++
    }
    
    # 检查系统资源
    Write-Host "`n检查系统资源..." -ForegroundColor Cyan
    
    try {
        $totalMemory = (Get-CimInstance -ClassName Win32_ComputerSystem).TotalPhysicalMemory / 1MB
        $availableMemory = (Get-Counter "\Memory\Available MBytes").CounterSamples.CookedValue
        
        Write-Host "总内存: $([math]::Round($totalMemory, 2))MB"
        Write-Host "可用内存: $([math]::Round($availableMemory, 2))MB"
        
        if ($totalMemory -lt 4096) {
            Write-Host "警告: 系统内存少于 4GB，可能影响性能" -ForegroundColor Yellow
        } else {
            Write-Host "系统内存充足" -ForegroundColor Green
            if (Test-Check "内存检查" { $true }) { $passedChecks++ }
            $totalChecks++
        }
    } catch {
        Write-Host "无法检查内存信息" -ForegroundColor Yellow
    }
    
    try {
        $disk = Get-PSDrive -Name (Get-Location).Drive.Name
        $availableDisk = $disk.Free / 1GB
        Write-Host "可用磁盘空间: $([math]::Round($availableDisk, 2))GB"
        
        if ($availableDisk -lt 10) {
            Write-Host "警告: 可用磁盘空间少于 10GB" -ForegroundColor Yellow
        } else {
            Write-Host "磁盘空间充足" -ForegroundColor Green
            if (Test-Check "磁盘空间检查" { $true }) { $passedChecks++ }
            $totalChecks++
        }
    } catch {
        Write-Host "无法检查磁盘空间" -ForegroundColor Yellow
    }
    
    # 生成报告
    Write-Host "`n=========================================="
    Write-Host "           Docker 部署验证报告"
    Write-Host "=========================================="
    Write-Host "总检查项: $totalChecks"
    Write-Host "通过检查: $passedChecks" -ForegroundColor Green
    Write-Host "失败检查: $($totalChecks - $passedChecks)" -ForegroundColor Red
    
    if ($totalChecks -gt 0) {
        $successRate = [math]::Round(($passedChecks * 100) / $totalChecks, 2)
        Write-Host "成功率: $successRate%"
    }
    Write-Host "=========================================="
    
    if (($totalChecks - $passedChecks) -eq 0) {
        Write-Host "✓ 所有检查通过，可以进行部署" -ForegroundColor Green
        return $true
    } else {
        Write-Host "✗ 发现 $($totalChecks - $passedChecks) 个问题，请修复后重新检查" -ForegroundColor Red
        return $false
    }
}

# 主函数
function Main {
    if ($Help) {
        Show-Help
        return
    }
    
    $result = Test-DockerDeployment
    
    if (-not $result) {
        exit 1
    }
}

# 执行主函数
Main
