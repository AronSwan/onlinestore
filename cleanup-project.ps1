#!/usr/bin/env pwsh
# 用途：项目冗余文件自动清理脚本
# 作者：AI助手
# 时间：2025-01-26 15:50:00
# 依赖文件：PROJECT_CLEANUP_GUIDE.md, package.json

param(
    [switch]$DryRun = $false,
    [switch]$BackupFirst = $true,
    [string]$BackupPath = "cleanup-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar.gz"
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 固定工作目录到脚本所在路径，避免相对路径失效
try {
    Set-Location (Split-Path -Parent $PSCommandPath)
} catch {}

# 记录实际备份文件路径（可能因压缩方式不同而调整扩展名）
$BackupPathActual = $BackupPath

# 颜色定义
$Green = "\u001b[32m"
$Yellow = "\u001b[33m"
$Red = "\u001b[31m"
$Reset = "\u001b[0m"

function Write-Info {
    param([string]$Message)
    Write-Host "$Green[INFO]$Reset $Message"
}

function Write-Warning {
    param([string]$Message)
    Write-Host "$Yellow[WARN]$Reset $Message"
}

function Write-Error {
    param([string]$Message)
    Write-Host "$Red[ERROR]$Reset $Message"
}

function Test-FileExists {
    param([string]$Path)
    return (Test-Path $Path) -and ((Get-Item $Path) -is [System.IO.FileInfo])
}

function Test-DirectoryExists {
    param([string]$Path)
    return (Test-Path $Path) -and ((Get-Item $Path) -is [System.IO.DirectoryInfo])
}

function Create-Backup {
    Write-Info "创建清理前备份..."
    
    if ($DryRun) {
        Write-Warning "干运行模式：跳过实际备份操作"
        return $true
    }
    
    try {
        # 使用tar创建备份（需要安装tar）
        if (Get-Command tar -ErrorAction SilentlyContinue) {
            $filesToBackup = @(
                "backend/",
                "package.json",
                "package-lock.json",
                "docker-compose.yml",
                "Dockerfile",
                ".github/",
                ".trae/"
            )
            
            tar -czf $BackupPath $filesToBackup
            $BackupPathActual = $BackupPath
            Write-Info "备份已创建: $BackupPathActual"
            return $true
        } else {
            Write-Warning "tar命令不可用，使用PowerShell压缩"
            
            # 创建临时目录用于备份
            $tempDir = "temp-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
            New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
            
            # 复制重要文件
            Copy-Item -Path "backend" -Destination $tempDir -Recurse -Force
            Copy-Item -Path "package.json" -Destination $tempDir -Force
            Copy-Item -Path "package-lock.json" -Destination $tempDir -Force
            Copy-Item -Path "docker-compose.yml" -Destination $tempDir -Force
            Copy-Item -Path "Dockerfile" -Destination $tempDir -Force
            
            # 压缩备份
            $zipPath = ($BackupPath -replace '\.tar\.gz$', '.zip')
            Compress-Archive -Path $tempDir -DestinationPath $zipPath -Force
            Remove-Item -Path $tempDir -Recurse -Force
            
            $BackupPathActual = $zipPath
            Write-Info "备份已创建: $BackupPathActual"
            return $true
        }
    }
    catch {
        Write-Error "备份创建失败: $($_.Exception.Message)"
        return $false
    }
}

function Remove-File-Safe {
    param([string]$Path, [string]$Description)
    
    if (Test-FileExists $Path) {
        if ($DryRun) {
            Write-Info "干运行：将删除文件 - $Description: $Path"
        } else {
            try {
                Remove-Item -Path $Path -Force
                Write-Info "已删除文件 - $Description: $Path"
            }
            catch {
                Write-Error "删除文件失败: $Path - $($_.Exception.Message)"
            }
        }
    } else {
        Write-Warning "文件不存在，跳过删除: $Path"
    }
}

function Remove-Directory-Safe {
    param([string]$Path, [string]$Description)
    
    if (Test-DirectoryExists $Path) {
        if ($DryRun) {
            Write-Info "干运行：将删除目录 - $Description: $Path"
        } else {
            try {
                Remove-Item -Path $Path -Recurse -Force
                Write-Info "已删除目录 - $Description: $Path"
            }
            catch {
                Write-Error "删除目录失败: $Path - $($_.Exception.Message)"
            }
        }
    } else {
        Write-Warning "目录不存在，跳过删除: $Path"
    }
}

function Cleanup-Temporary-Files {
    Write-Info "开始清理临时文件..."
    
    # 临时文件
    Remove-File-Safe -Path "backend/run.err" -Description "错误日志"
    Remove-File-Safe -Path "backend/run.out" -Description "输出日志"
    Remove-File-Safe -Path "backend/build.out" -Description "构建输出"
    Remove-File-Safe -Path "backend/undefined" -Description "未定义文件"
    
    # 测试缓存目录
    Remove-Directory-Safe -Path "backend/.test-cache" -Description "测试缓存"
    Remove-Directory-Safe -Path "backend/.test-output" -Description "测试输出"
    Remove-Directory-Safe -Path "backend/test-temp" -Description "临时测试"
    Remove-Directory-Safe -Path "backend/test-output" -Description "测试输出"
}

function Cleanup-Old-Backups {
    Write-Info "开始清理旧备份文件..."
    
    if (Test-DirectoryExists "backups") {
        $backupFiles = Get-ChildItem "backups" -Filter "full-backup-*" | 
                      Sort-Object LastWriteTime -Descending
        
        if ($backupFiles.Count -gt 1) {
            $filesToRemove = $backupFiles | Select-Object -Skip 1
            
            foreach ($file in $filesToRemove) {
                Remove-File-Safe -Path $file.FullName -Description "旧备份文件"
            }
            
            Write-Info "保留最新备份文件: $($backupFiles[0].Name)"
        } else {
            Write-Info "备份文件数量合适，无需清理"
        }
    } else {
        Write-Warning "backups目录不存在，跳过备份清理"
    }
}

function Cleanup-Root-Redundant-Files {
    Write-Info "开始清理根目录冗余文件..."
    
    # 浏览器安装程序
    Remove-File-Safe -Path "MicrosoftEdgeWebview2Setup.exe" -Description "浏览器安装程序"
    
    # 第三方源码（谨慎处理）
    if (Test-FileExists "PrestaShop-src.zip") {
        Write-Warning "检测到第三方源码 PrestaShop-src.zip，建议手动确认是否需要保留"
        if (-not $DryRun) {
            $confirm = Read-Host "是否删除 PrestaShop-src.zip? (y/N)"
            if ($confirm -eq "y" -or $confirm -eq "Y") {
                Remove-File-Safe -Path "PrestaShop-src.zip" -Description "第三方源码"
            }
        }
    }
    
    # 临时标记文件
    Remove-File-Safe -Path "delete" -Description "删除标记"
    Remove-File-Safe -Path "qc" -Description "质量检查"
    Remove-File-Safe -Path "query" -Description "查询文件"
    Remove-File-Safe -Path "queryex" -Description "扩展查询"
}

function Validate-Project-Integrity {
    Write-Info "验证项目完整性..."
    
    $criticalFiles = @(
        "backend/package.json",
        "backend/src/main.ts", 
        "backend/Dockerfile",
        "package.json",
        "docker-compose.yml"
    )
    
    $allExist = $true
    foreach ($file in $criticalFiles) {
        if (-not (Test-FileExists $file)) {
            Write-Error "关键文件缺失: $file"
            $allExist = $false
        } else {
            Write-Info "关键文件存在: $file"
        }
    }
    
    return $allExist
}

function Test-Build {
    Write-Info "测试项目构建..."
    
    if ($DryRun) {
        Write-Warning "干运行模式：跳过实际构建测试"
        return $true
    }
    
    try {
        Set-Location "backend"
        
        # 检查依赖
        if (Test-DirectoryExists "node_modules") {
            Write-Info "node_modules存在，跳过npm install"
        } else {
            Write-Info "安装项目依赖..."
            npm install --silent
        }
        
        # 测试构建
        Write-Info "执行构建测试..."
        npm run build --silent
        
        Set-Location ".."
        Write-Info "项目构建测试通过"
        return $true
    }
    catch {
        Set-Location ".."
        Write-Error "项目构建测试失败: $($_.Exception.Message)"
        return $false
    }
}

# 主清理流程
Write-Info "开始项目冗余文件清理"
Write-Info "工作目录: $(Get-Location)"
Write-Info "模式: $(if ($DryRun) { '干运行（预览）' } else { '实际执行' })"

# 1. 创建备份
if ($BackupFirst -and -not $DryRun) {
    if (-not (Create-Backup)) {
        Write-Error "备份创建失败，终止清理操作"
        exit 1
    }
}

# 2. 执行清理操作
Cleanup-Temporary-Files
Cleanup-Old-Backups
Cleanup-Root-Redundant-Files

# 3. 验证清理结果
$integrityValid = Validate-Project-Integrity
if (-not $integrityValid) {
    Write-Error "项目完整性验证失败"
    if (-not $DryRun -and $BackupFirst) {
        Write-Warning "建议从备份恢复: $BackupPath"
    }
    exit 1
}

# 4. 测试构建
$buildValid = Test-Build
if (-not $buildValid) {
    Write-Error "项目构建测试失败"
    if (-not $DryRun -and $BackupFirst) {
        Write-Warning "建议从备份恢复: $BackupPath"
    }
    exit 1
}

# 5. 生成清理报告
$cleanupReport = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Mode = if ($DryRun) { "DryRun" } else { "Actual" }
    BackupCreated = $BackupFirst -and -not $DryRun
    BackupPath = if ($BackupFirst -and -not $DryRun) { $BackupPathActual } else { "N/A" }
    IntegrityValid = $integrityValid
    BuildValid = $buildValid
}

Write-Info "清理操作完成"
Write-Info "清理报告:"
$cleanupReport.GetEnumerator() | ForEach-Object { 
    Write-Info "  $($_.Key): $($_.Value)" 
}

if ($DryRun) {
    Write-Warning "这是干运行模式，未执行实际删除操作"
    Write-Warning "要执行实际清理，请使用: .\cleanup-project.ps1 -DryRun:`$false"
} else {
    Write-Info "实际清理操作已完成"
    if ($BackupFirst) {
        Write-Info "备份文件位置: $BackupPathActual"
        if ($BackupPathActual -match '\.zip$') {
            Write-Info "如需恢复（PowerShell）：Expand-Archive -LiteralPath \"$BackupPathActual\" -DestinationPath . -Force"
        } else {
            Write-Info "如需恢复（tar）：tar -xzf \"$BackupPathActual\""
        }
    }
}

Write-Info "项目冗余文件清理脚本执行完毕"