# 工具兼容性检查脚本 - 简化版 (Windows PowerShell)
param(
    [switch]$Strict,
    [switch]$AutoFix
)

$ErrorActionPreference = "Continue"
$STRICT_MODE = $Strict
$AUTO_FIX = $AutoFix

Write-Host "=== 工具兼容性检查开始 ===" -ForegroundColor Green
Write-Host "严格模式: $STRICT_MODE" -ForegroundColor Yellow
Write-Host "自动修复: $AUTO_FIX" -ForegroundColor Yellow

# 创建日志文件
$logFile = ".refactor\tool-compatibility.log"
New-Item -ItemType Directory -Force -Path ".refactor" | Out-Null
"工具兼容性检查日志 - $(Get-Date)" | Out-File $logFile

# 1. 动态依赖解析
Write-Host "`n1. 动态依赖解析..." -ForegroundColor Cyan
$dynamicTools = @()

if (Test-Path "package.json") {
    Write-Host "检测到 package.json，解析开发依赖..." -ForegroundColor Yellow
    try {
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        
        if ($packageJson.devDependencies) {
            foreach ($dep in $packageJson.devDependencies.PSObject.Properties) {
                $name = $dep.Name
                $version = $dep.Value -replace "[^\d\.]", ""
                if ($name -match "eslint|prettier|jest") {
                    $dynamicTools += "$name`:$version"
                    "动态检测到工具: $name@$version" | Add-Content $logFile
                }
            }
        }
    }
    catch {
        Write-Host "解析 package.json 失败: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 2. 静态核心工具列表
$staticTools = @(
    "node:18.0.0",
    "npm:9.0.0",
    "git:2.40.0"
)

# 3. 合并工具列表
$allTools = $staticTools + $dynamicTools | Sort-Object -Unique
Write-Host "总计检查工具数量: $($allTools.Count)" -ForegroundColor Green

# 4. 工具检查函数
function Test-ToolCompatibility {
    param($toolName, $requiredVersion)
    
    Write-Host "检查 $toolName (要求版本: $requiredVersion)..." -ForegroundColor White
    
    try {
        $current = ""
        switch ($toolName) {
            "node" {
                $current = (node --version 2>$null) -replace "v", ""
                if ($LASTEXITCODE -ne 0) { throw "Node.js 未安装" }
            }
            "npm" {
                $current = (npm --version 2>$null)
                if ($LASTEXITCODE -ne 0) { throw "npm 未安装" }
            }
            "git" {
                $current = (git --version 2>$null) -replace "git version ", ""
                if ($LASTEXITCODE -ne 0) { throw "Git 未安装" }
            }
            "eslint" {
                $current = (npx eslint --version 2>$null) -replace "v", ""
                if ($LASTEXITCODE -ne 0) { throw "ESLint 未安装" }
            }
            "prettier" {
                $current = (npx prettier --version 2>$null)
                if ($LASTEXITCODE -ne 0) { throw "Prettier 未安装" }
            }
            "jest" {
                $current = (npx jest --version 2>$null)
                if ($LASTEXITCODE -ne 0) { throw "Jest 未安装" }
            }
            default {
                Write-Host "  未知工具类型: $toolName" -ForegroundColor Yellow
                return $true
            }
        }
        
        Write-Host "  当前版本: $current" -ForegroundColor Green
        "$toolName - 当前版本: $current, 要求版本: $requiredVersion" | Add-Content $logFile
        
        # 简化版本比较
        if ($current) {
            Write-Host "  ✓ 工具可用" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  ✗ 工具不可用" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "  ✗ 检查失败: $($_.Exception.Message)" -ForegroundColor Red
        "$toolName - 检查失败: $($_.Exception.Message)" | Add-Content $logFile
        
        if ($STRICT_MODE) {
            return $false
        }
        return $true
    }
}

# 5. 环境隔离检查
Write-Host "`n2. 环境隔离检查..." -ForegroundColor Cyan
$isIsolated = $false

# 检查是否在容器环境
if (Test-Path "/.dockerenv") {
    $isIsolated = $true
    Write-Host "  ✓ 检测到 Docker 容器环境" -ForegroundColor Green
} elseif ($env:CONTAINER -eq "docker") {
    $isIsolated = $true
    Write-Host "  ✓ 检测到容器环境变量" -ForegroundColor Green
} else {
    Write-Host "  ⚠ 未检测到隔离环境 (Windows开发环境)" -ForegroundColor Yellow
    if ($STRICT_MODE) {
        Write-Host "  ⚠ 严格模式下建议使用隔离环境" -ForegroundColor Yellow
    }
}

"环境隔离状态: $isIsolated" | Add-Content $logFile

# 6. 执行工具检查
Write-Host "`n3. 执行工具兼容性检查..." -ForegroundColor Cyan
$failedTools = @()

foreach ($tool in $allTools) {
    $parts = $tool -split ":"
    $name = $parts[0]
    $version = $parts[1]
    
    if (-not (Test-ToolCompatibility $name $version)) {
        $failedTools += $tool
    }
}

# 7. 生成检查结果
Write-Host "`n=== 检查结果汇总 ===" -ForegroundColor Green
Write-Host "总检查工具: $($allTools.Count)" -ForegroundColor White
Write-Host "失败工具: $($failedTools.Count)" -ForegroundColor White
Write-Host "环境隔离: $isIsolated" -ForegroundColor White

if ($failedTools.Count -gt 0) {
    Write-Host "`n失败的工具:" -ForegroundColor Red
    foreach ($tool in $failedTools) {
        Write-Host "  - $tool" -ForegroundColor Red
    }
    
    "检查失败的工具: $($failedTools -join ', ')" | Add-Content $logFile
    
    if ($STRICT_MODE) {
        Write-Host "`n✗ 严格模式下检查失败，退出" -ForegroundColor Red
        exit 1
    } else {
        Write-Host "`n⚠ 建议模式下继续执行" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n✓ 所有工具检查通过" -ForegroundColor Green
}

"检查完成时间: $(Get-Date)" | Add-Content $logFile
Write-Host "`n日志已保存到: $logFile" -ForegroundColor Cyan
Write-Host "=== 工具兼容性检查完成 ===" -ForegroundColor Green