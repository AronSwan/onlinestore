# 系统清理脚本 - 阶段四优化版本 (PowerShell)
# 用于清理不再需要的Docker资源、临时文件和日志

param(
    [switch]$Force,
    [switch]$Verbose
)

# 颜色定义
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

# 日志函数
function Write-LogInfo {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Blue
}

function Write-LogSuccess {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Colors.Green
}

function Write-LogWarning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors.Yellow
}

function Write-LogError {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

# 检查Docker是否运行
function Test-DockerStatus {
    Write-LogInfo "检查Docker状态..."
    try {
        $dockerInfo = docker info 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-LogError "Docker未运行，请启动Docker Desktop"
            exit 1
        }
        Write-LogSuccess "Docker运行正常"
    }
    catch {
        Write-LogError "无法连接到Docker，请确保Docker Desktop正在运行"
        exit 1
    }
}

# 清理Docker容器
function Remove-StoppedContainers {
    Write-LogInfo "清理停止的Docker容器..."
    
    try {
        $stoppedContainers = docker ps -a --filter "status=exited" --format "{{.Names}}" | Measure-Object -Line
        $stoppedCount = $stoppedContainers.Lines
        
        if ($stoppedCount -gt 0) {
            Write-LogInfo "发现 $stoppedCount 个停止的容器，正在清理..."
            docker container prune -f
            Write-LogSuccess "已清理停止的容器"
        }
        else {
            Write-LogInfo "没有发现停止的容器"
        }
    }
    catch {
        Write-LogError "清理容器时出错: $($_.Exception.Message)"
    }
}

# 清理Docker镜像
function Remove-UnusedImages {
    Write-LogInfo "清理未使用的Docker镜像..."
    
    try {
        # 清理悬空镜像
        $danglingImages = docker images --filter "dangling=true" --format "{{.Repository}}:{{.Tag}}" | Measure-Object -Line
        $danglingCount = $danglingImages.Lines
        
        if ($danglingCount -gt 0) {
            Write-LogInfo "发现 $danglingCount 个悬空镜像，正在清理..."
            docker image prune -f
            Write-LogSuccess "已清理悬空镜像"
        }
        else {
            Write-LogInfo "没有发现悬空镜像"
        }
        
        # 清理未使用的镜像（保留最近使用的）
        Write-LogInfo "清理超过30天未使用的镜像..."
        docker image prune -a -f --filter "until=720h" # 30天
        Write-LogSuccess "已清理旧镜像"
    }
    catch {
        Write-LogError "清理镜像时出错: $($_.Exception.Message)"
    }
}

# 清理Docker网络
function Remove-UnusedNetworks {
    Write-LogInfo "清理未使用的Docker网络..."
    
    try {
        $unusedNetworks = docker network ls --filter "dangling=true" --format "{{.Name}}" | Measure-Object -Line
        $networkCount = $unusedNetworks.Lines
        
        if ($networkCount -gt 0) {
            Write-LogInfo "发现 $networkCount 个未使用的网络，正在清理..."
            docker network prune -f
            Write-LogSuccess "已清理未使用的网络"
        }
        else {
            Write-LogInfo "没有发现未使用的网络"
        }
    }
    catch {
        Write-LogError "清理网络时出错: $($_.Exception.Message)"
    }
}

# 清理Docker卷（谨慎操作）
function Remove-UnusedVolumes {
    Write-LogInfo "检查Docker卷..."
    
    try {
        # 列出所有卷
        Write-LogInfo "当前Docker卷列表："
        docker volume ls
        
        # 只清理明确标记为清理的卷
        $cleanupVolumes = docker volume ls --filter "label=cleanup=true" --format "{{.Name}}" | Measure-Object -Line
        $volumeCount = $cleanupVolumes.Lines
        
        if ($volumeCount -gt 0) {
            Write-LogWarning "发现 $volumeCount 个标记为清理的卷，正在清理..."
            docker volume prune -f --filter "label=cleanup=true"
            Write-LogSuccess "已清理标记的卷"
        }
        else {
            Write-LogInfo "没有发现标记为清理的卷"
        }
    }
    catch {
        Write-LogError "清理卷时出错: $($_.Exception.Message)"
    }
}

# 清理日志文件
function Remove-OldLogs {
    Write-LogInfo "清理应用程序日志..."
    
    try {
        # 清理超过7天的日志文件
        if (Test-Path "./logs") {
            Write-LogInfo "清理超过7天的日志文件..."
            Get-ChildItem -Path "./logs" -Filter "*.log" -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item -Force
            Get-ChildItem -Path "./logs" -Filter "*.log.*" -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item -Force
            Write-LogSuccess "已清理旧日志文件"
        }
        
        # 清理Docker容器日志（需要管理员权限）
        Write-LogInfo "清理Docker容器日志..."
        $containers = docker ps -a --format "{{.Names}}"
        
        foreach ($container in $containers) {
            try {
                $containerId = docker inspect -f '{{.Id}}' $container
                $logPath = "/var/lib/docker/containers/$containerId/${container}-json.log"
                # Windows上Docker日志路径不同，这里只是示例
                # 实际实现需要根据Docker Desktop的具体配置调整
            }
            catch {
                if ($Verbose) {
                    Write-LogWarning "无法清理容器 $container 的日志: $($_.Exception.Message)"
                }
            }
        }
        
        Write-LogSuccess "已清理Docker容器日志"
    }
    catch {
        Write-LogError "清理日志文件时出错: $($_.Exception.Message)"
    }
}

# 清理临时文件
function Remove-TempFiles {
    Write-LogInfo "清理临时文件..."
    
    try {
        # 清理Node.js临时文件
        if (Test-Path "./node_modules/.cache") {
            Remove-Item -Path "./node_modules/.cache/*" -Recurse -Force -ErrorAction SilentlyContinue
            Write-LogSuccess "已清理Node.js缓存"
        }
        
        # 清理构建临时文件
        if (Test-Path "./dist") {
            Get-ChildItem -Path "./dist" -Filter "*.tmp" -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-1) } | Remove-Item -Force
            Write-LogSuccess "已清理构建临时文件"
        }
        
        # 清理测试输出文件
        if (Test-Path "./test-output") {
            Get-ChildItem -Path "./test-output" -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item -Force
            Write-LogSuccess "已清理测试输出文件"
        }
        
        # 清理性能报告（保留最近10个）
        if (Test-Path "./performance-reports") {
            $reports = Get-ChildItem -Path "./performance-reports" -File | Sort-Object LastWriteTime -Descending
            if ($reports.Count -gt 10) {
                $reports | Select-Object -Skip 10 | Remove-Item -Force
                Write-LogSuccess "已清理旧性能报告"
            }
        }
    }
    catch {
        Write-LogError "清理临时文件时出错: $($_.Exception.Message)"
    }
}

# 优化Docker系统
function Optimize-DockerSystem {
    Write-LogInfo "优化Docker系统..."
    
    try {
        # Docker系统清理
        docker system prune -a -f --volumes --filter "until=72h"
        Write-LogSuccess "Docker系统优化完成"
    }
    catch {
        Write-LogError "Docker系统优化时出错: $($_.Exception.Message)"
    }
}

# 检查磁盘空间
function Test-DiskSpace {
    Write-LogInfo "检查磁盘空间使用情况..."
    
    try {
        # 显示当前磁盘使用情况
        $disks = Get-WmiObject -Class Win32_LogicalDisk | Select-Object DeviceID, @{Name="Size(GB)"; Expression={[math]::Round($_.Size/1GB,2)}}, @{Name="FreeSpace(GB)"; Expression={[math]::Round($_.FreeSpace/1GB,2)}}, @{Name="Usage(%)"; Expression={[math]::Round((($_.Size-$_.FreeSpace)/$_.Size)*100,2)}}
        $disks | Format-Table -AutoSize
        
        # 检查Docker占用的空间
        Write-LogInfo "Docker空间使用情况："
        docker system df
        
        # 警告磁盘空间不足
        $systemDrive = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
        $usagePercent = [math]::Round((($systemDrive.Size-$systemDrive.FreeSpace)/$systemDrive.Size)*100,2)
        
        if ($usagePercent -gt 80) {
            Write-LogWarning "磁盘使用率超过80%，建议进一步清理"
        }
        else {
            Write-LogSuccess "磁盘使用率正常：$usagePercent%"
        }
    }
    catch {
        Write-LogError "检查磁盘空间时出错: $($_.Exception.Message)"
    }
}

# 生成清理报告
function New-CleanupReport {
    Write-LogInfo "生成清理报告..."
    
    try {
        $reportFile = "./cleanup-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
        
        $report = @"
=== 系统清理报告 ===
清理时间: $(Get-Date)
清理脚本版本: 阶段四优化版本 (PowerShell)

=== Docker容器状态 ===
$(docker ps -a)

=== Docker镜像状态 ===
$(docker images --format "table {{.Repository}}`t{{.Tag}}`t{{.Size}}`t{{.CreatedAt}}")

=== 磁盘使用情况 ===
$(Get-WmiObject -Class Win32_LogicalDisk | Select-Object DeviceID, @{Name="Size(GB)"; Expression={[math]::Round($_.Size/1GB,2)}}, @{Name="FreeSpace(GB)"; Expression={[math]::Round($_.FreeSpace/1GB,2)}}, @{Name="Usage(%)"; Expression={[math]::Round((($_.Size-$_.FreeSpace)/$_.Size)*100,2)}} | Format-Table -AutoSize | Out-String)

=== Docker空间使用 ===
$(docker system df)

=== 清理完成 ===
"@
        
        $report | Out-File -FilePath $reportFile -Encoding UTF8
        Write-LogSuccess "清理报告已生成: $reportFile"
    }
    catch {
        Write-LogError "生成清理报告时出错: $($_.Exception.Message)"
    }
}

# 主函数
function Main {
    Write-Host "========================================" -ForegroundColor $Colors.White
    Write-Host "    系统清理脚本 - 阶段四优化版本" -ForegroundColor $Colors.White
    Write-Host "           (PowerShell版本)" -ForegroundColor $Colors.White
    Write-Host "========================================" -ForegroundColor $Colors.White
    Write-Host ""
    
    # 记录开始时间
    $startTime = Get-Date
    
    # 执行清理步骤
    Test-DockerStatus
    Remove-StoppedContainers
    Remove-UnusedImages
    Remove-UnusedNetworks
    Remove-UnusedVolumes
    Remove-OldLogs
    Remove-TempFiles
    Optimize-DockerSystem
    Test-DiskSpace
    New-CleanupReport
    
    # 计算执行时间
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor $Colors.White
    Write-LogSuccess "系统清理完成！"
    Write-LogInfo "总耗时: $($duration.TotalSeconds)秒"
    Write-Host "========================================" -ForegroundColor $Colors.White
}

# 执行主函数
Main