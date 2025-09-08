# 重构回滚机制脚本 (PowerShell版本)
# 在重构出现问题时快速恢复到安全状态

param(
    [string]$RollbackPoint = "latest",
    [switch]$Force = $false,
    [switch]$DryRun = $false
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 颜色输出函数
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# 记录回滚日志
function Write-RollbackLog {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # 输出到控制台
    switch ($Level) {
        "ERROR" { Write-ColorOutput $logEntry "Red" }
        "WARN" { Write-ColorOutput $logEntry "Yellow" }
        "SUCCESS" { Write-ColorOutput $logEntry "Green" }
        default { Write-ColorOutput $logEntry "White" }
    }
    
    # 写入日志文件
    $logPath = ".refactor\rollback.log"
    Add-Content -Path $logPath -Value $logEntry
}

# 获取可用的回滚点
function Get-RollbackPoints {
    $passportPath = ".refactor\passport.json"
    
    if (-not (Test-Path $passportPath)) {
        Write-RollbackLog "重构护照文件不存在" "ERROR"
        return @()
    }
    
    try {
        $passport = Get-Content $passportPath | ConvertFrom-Json
        return $passport.rollback_points
    } catch {
        Write-RollbackLog "读取重构护照失败: $($_.Exception.Message)" "ERROR"
        return @()
    }
}

# 创建当前状态备份
function New-StateBackup {
    $backupDir = ".refactor\backups"
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupPath = "$backupDir\backup_$timestamp"
    
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    }
    
    Write-RollbackLog "创建当前状态备份: $backupPath" "INFO"
    
    try {
        # 备份关键文件
        $filesToBackup = @(
            "js\*.js",
            "css\*.css",
            "*.html",
            "package.json",
            "package-lock.json"
        )
        
        New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
        
        foreach ($pattern in $filesToBackup) {
            $files = Get-ChildItem -Path $pattern -Recurse -ErrorAction SilentlyContinue
            foreach ($file in $files) {
                $relativePath = $file.FullName.Substring((Get-Location).Path.Length + 1)
                $targetDir = Split-Path (Join-Path $backupPath $relativePath) -Parent
                
                if (-not (Test-Path $targetDir)) {
                    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
                }
                
                Copy-Item $file.FullName (Join-Path $backupPath $relativePath) -Force
            }
        }
        
        Write-RollbackLog "备份创建成功: $backupPath" "SUCCESS"
        return $backupPath
    } catch {
        Write-RollbackLog "备份创建失败: $($_.Exception.Message)" "ERROR"
        return $null
    }
}

# 执行回滚操作
function Invoke-Rollback {
    param(
        [string]$TargetPoint,
        [bool]$IsDryRun = $false
    )
    
    Write-RollbackLog "开始回滚到: $TargetPoint" "INFO"
    
    if ($IsDryRun) {
        Write-RollbackLog "[DRY RUN] 模拟回滚操作，不会实际修改文件" "WARN"
    }
    
    # 获取回滚点信息
    $rollbackPoints = Get-RollbackPoints
    $targetRollback = $rollbackPoints | Where-Object { $_.commit_hash -eq $TargetPoint -or $_.description -like "*$TargetPoint*" }
    
    if (-not $targetRollback) {
        Write-RollbackLog "未找到回滚点: $TargetPoint" "ERROR"
        return $false
    }
    
    Write-RollbackLog "找到回滚点: $($targetRollback.description)" "INFO"
    
    if (-not $IsDryRun) {
        # 创建当前状态备份
        $backupPath = New-StateBackup
        if (-not $backupPath) {
            Write-RollbackLog "无法创建备份，回滚中止" "ERROR"
            return $false
        }
        
        try {
            # 使用Git回滚（如果有Git仓库）
            if (Test-Path ".git") {
                Write-RollbackLog "使用Git回滚到: $($targetRollback.commit_hash)" "INFO"
                git reset --hard $targetRollback.commit_hash
                
                if ($LASTEXITCODE -eq 0) {
                    Write-RollbackLog "Git回滚成功" "SUCCESS"
                } else {
                    Write-RollbackLog "Git回滚失败" "ERROR"
                    return $false
                }
            } else {
                Write-RollbackLog "未检测到Git仓库，无法执行自动回滚" "WARN"
                Write-RollbackLog "请手动恢复到安全状态" "WARN"
                return $false
            }
            
            # 验证回滚后状态
            Write-RollbackLog "验证回滚后状态..." "INFO"
            $testResult = npm test 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-RollbackLog "回滚验证成功，所有测试通过" "SUCCESS"
                
                # 更新重构护照
                Update-PassportAfterRollback $TargetPoint $backupPath
                
                return $true
            } else {
                Write-RollbackLog "回滚验证失败，测试未通过" "ERROR"
                Write-RollbackLog $testResult "ERROR"
                return $false
            }
            
        } catch {
            Write-RollbackLog "回滚执行失败: $($_.Exception.Message)" "ERROR"
            return $false
        }
    } else {
        Write-RollbackLog "[DRY RUN] 将回滚到: $($targetRollback.description)" "INFO"
        Write-RollbackLog "[DRY RUN] 提交哈希: $($targetRollback.commit_hash)" "INFO"
        Write-RollbackLog "[DRY RUN] 时间戳: $($targetRollback.timestamp)" "INFO"
        return $true
    }
}

# 更新护照文件
function Update-PassportAfterRollback {
    param(
        [string]$RollbackPoint,
        [string]$BackupPath
    )
    
    $passportPath = ".refactor\passport.json"
    
    try {
        $passport = Get-Content $passportPath | ConvertFrom-Json
        
        # 添加回滚记录
        $rollbackRecord = @{
            rollback_point = $RollbackPoint
            rollback_time = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
            backup_location = $BackupPath
            reason = "Manual rollback initiated"
        }
        
        if (-not $passport.rollback_history) {
            $passport | Add-Member -NotePropertyName "rollback_history" -NotePropertyValue @()
        }
        
        $passport.rollback_history += $rollbackRecord
        $passport.last_rollback = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
        
        $passport | ConvertTo-Json -Depth 10 | Set-Content $passportPath
        Write-RollbackLog "重构护照已更新" "SUCCESS"
        
    } catch {
        Write-RollbackLog "更新重构护照失败: $($_.Exception.Message)" "WARN"
    }
}

# 显示帮助信息
function Show-Help {
    Write-ColorOutput "重构回滚脚本使用说明" "Cyan"
    Write-ColorOutput "" "White"
    Write-ColorOutput "用法:" "Yellow"
    Write-ColorOutput "  .\rollback.ps1 [参数]" "White"
    Write-ColorOutput "" "White"
    Write-ColorOutput "参数:" "Yellow"
    Write-ColorOutput "  -RollbackPoint <点>  指定回滚点 (默认: latest)" "White"
    Write-ColorOutput "  -Force               强制回滚，跳过确认" "White"
    Write-ColorOutput "  -DryRun              模拟运行，不实际修改" "White"
    Write-ColorOutput "" "White"
    Write-ColorOutput "示例:" "Yellow"
    Write-ColorOutput "  .\rollback.ps1 -RollbackPoint initial_state" "White"
    Write-ColorOutput "  .\rollback.ps1 -DryRun" "White"
    Write-ColorOutput "  .\rollback.ps1 -Force" "White"
}

# 主执行逻辑
function Main {
    Write-ColorOutput "🔄 重构回滚系统" "Cyan"
    Write-ColorOutput "" "White"
    
    # 检查是否在项目根目录
    if (-not (Test-Path "package.json")) {
        Write-RollbackLog "请在项目根目录执行此脚本" "ERROR"
        exit 1
    }
    
    # 显示可用回滚点
    $rollbackPoints = Get-RollbackPoints
    
    if ($rollbackPoints.Count -eq 0) {
        Write-RollbackLog "未找到可用的回滚点" "WARN"
        exit 1
    }
    
    Write-ColorOutput "可用回滚点:" "Yellow"
    foreach ($point in $rollbackPoints) {
        Write-ColorOutput "  - $($point.commit_hash): $($point.description)" "White"
    }
    Write-ColorOutput "" "White"
    
    # 确定回滚目标
    if ($RollbackPoint -eq "latest") {
        $RollbackPoint = $rollbackPoints[0].commit_hash
        Write-RollbackLog "使用最新回滚点: $RollbackPoint" "INFO"
    }
    
    # 确认回滚操作
    if (-not $Force -and -not $DryRun) {
        Write-ColorOutput "⚠️  即将回滚到: $RollbackPoint" "Yellow"
        $confirmation = Read-Host "确认继续? (y/N)"
        
        if ($confirmation -ne "y" -and $confirmation -ne "Y") {
            Write-RollbackLog "回滚操作已取消" "INFO"
            exit 0
        }
    }
    
    # 执行回滚
    $success = Invoke-Rollback $RollbackPoint $DryRun
    
    if ($success) {
        Write-RollbackLog "回滚操作完成" "SUCCESS"
        exit 0
    } else {
        Write-RollbackLog "回滚操作失败" "ERROR"
        exit 1
    }
}

# 检查是否请求帮助
if ($args -contains "-h" -or $args -contains "--help" -or $args -contains "/?") {
    Show-Help
    exit 0
}

# 执行主函数
Main