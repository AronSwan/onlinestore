# Docker沙箱测试运行脚本 (PowerShell版本)

param(
    [switch]$Help,
    [switch]$Privileged,
    [switch]$Build,
    [switch]$Clean,
    [switch]$Logs,
    [switch]$Report,
    [switch]$CleanOutput
)

# 颜色定义
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

# 脚本目录
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = Split-Path -Parent $ScriptDir

# 输出目录
$OutputDir = Join-Path $ProjectRoot ".test-output"

# 创建输出目录
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# 创建沙箱测试子目录，供容器可写挂载
$SandboxSubdir = Join-Path $OutputDir "sandbox-test"
if (!(Test-Path $SandboxSubdir)) {
    New-Item -ItemType Directory -Path $SandboxSubdir -Force | Out-Null
}

# 函数：打印带颜色的消息
function Write-ColorMessage {
    param(
        [string]$Color,
        [string]$Message
    )
    
    Write-Host $Message -ForegroundColor $Color
}

# 函数：显示帮助信息
function Show-Help {
    Write-Host "Docker沙箱测试运行脚本 (PowerShell版本)"
    Write-Host ""
    Write-Host "用法: .\run-docker-sandbox-test.ps1 [选项]"
    Write-Host ""
    Write-Host "选项:"
    Write-Host "  -Help                  显示帮助信息"
    Write-Host "  -Privileged            使用特权模式运行测试"
    Write-Host "  -Build                  重新构建Docker镜像"
    Write-Host "  -Clean                  清理测试容器和镜像"
    Write-Host "  -Logs                   查看测试日志"
    Write-Host "  -Report                 显示测试报告"
    Write-Host "  -CleanOutput            清理输出目录"
    Write-Host ""
    Write-Host "示例:"
    Write-Host "  .\run-docker-sandbox-test.ps1                    运行标准沙箱测试"
    Write-Host "  .\run-docker-sandbox-test.ps1 -Privileged         运行特权模式沙箱测试"
    Write-Host "  .\run-docker-sandbox-test.ps1 -Build              重新构建镜像并运行测试"
    Write-Host "  .\run-docker-sandbox-test.ps1 -Clean              清理测试环境"
    Write-Host ""
}

# 函数：构建Docker镜像
function Build-Image {
    Write-ColorMessage $Colors.Blue "🔨 构建Docker镜像..."
    Set-Location $ProjectRoot
    
    try {
        docker build -f scripts/Dockerfile.test-runner-secure -t test-runner-secure:test .
        Write-ColorMessage $Colors.Green "✅ 镜像构建完成"
    }
    catch {
        Write-ColorMessage $Colors.Red "❌ 镜像构建失败: $_"
        exit 1
    }
    finally {
        Set-Location $ScriptDir
    }
}

# 函数：运行标准沙箱测试
function Run-StandardTest {
    Write-ColorMessage $Colors.Blue "🐳 运行标准Docker沙箱测试..."
    
    try {
        # 创建并运行容器
        docker run --rm `
            --name test-runner-secure-sandbox-test `
            -v "${ScriptDir}:/app/scripts:ro" `
            -v "${OutputDir}\sandbox-test:/app/scripts/sandbox-test:rw" `
            -v "${OutputDir}:/app/.test-output" `
            -e NODE_ENV=test `
            test-runner-secure:test
        
        Write-ColorMessage $Colors.Green "✅ 标准沙箱测试完成"
    }
    catch {
        Write-ColorMessage $Colors.Red "❌ 标准沙箱测试失败: $_"
        exit 1
    }
}

# 函数：运行特权模式沙箱测试
function Run-PrivilegedTest {
    Write-ColorMessage $Colors.Blue "🐳 运行特权模式Docker沙箱测试..."
    
    try {
        # 创建并运行特权容器
        docker run --rm --privileged `
            --name test-runner-secure-sandbox-privileged-test `
            -v "${ScriptDir}:/app/scripts:ro" `
            -v "${OutputDir}\sandbox-test:/app/scripts/sandbox-test:rw" `
            -v "${OutputDir}:/app/.test-output" `
            -e NODE_ENV=test `
            test-runner-secure:test
        
        Write-ColorMessage $Colors.Green "✅ 特权模式沙箱测试完成"
    }
    catch {
        Write-ColorMessage $Colors.Red "❌ 特权模式沙箱测试失败: $_"
        exit 1
    }
}

# 函数：使用Docker Compose运行测试
function Run-ComposeTest {
    param(
        [string]$ServiceName
    )
    
    Write-ColorMessage $Colors.Blue "🐳 使用Docker Compose运行测试: $ServiceName"
    
    try {
        # 运行指定的服务
        docker-compose -f docker-compose.test-runner-secure.yml run --rm $ServiceName
        
        Write-ColorMessage $Colors.Green "✅ Docker Compose测试完成: $ServiceName"
    }
    catch {
        Write-ColorMessage $Colors.Red "❌ Docker Compose测试失败: $_"
        exit 1
    }
}

# 函数：清理测试环境
function Clean-TestEnvironment {
    Write-ColorMessage $Colors.Yellow "🧹 清理测试环境..."
    
    try {
        # 停止并删除容器
        docker stop test-runner-secure-sandbox-test 2>$null
        docker rm test-runner-secure-sandbox-test 2>$null
        docker stop test-runner-secure-sandbox-privileged-test 2>$null
        docker rm test-runner-secure-sandbox-privileged-test 2>$null
        
        # 删除Docker Compose资源
        docker-compose -f docker-compose.test-runner-secure.yml down -v 2>$null
        
        # 删除镜像
        docker rmi test-runner-secure:test 2>$null
        
        # 清理输出目录
        if ($CleanOutput) {
            if (Test-Path $OutputDir) {
                Remove-Item -Recurse -Force $OutputDir
                Write-ColorMessage $Colors.Green "✅ 输出目录已清理"
            }
        }
        
        Write-ColorMessage $Colors.Green "✅ 测试环境清理完成"
    }
    catch {
        Write-ColorMessage $Colors.Red "❌ 清理测试环境失败: $_"
    }
}

# 函数：查看测试日志
function Show-Logs {
    $LogFile = Join-Path $OutputDir "sandbox-test-report.json"
    
    if (Test-Path $LogFile) {
        Write-ColorMessage $Colors.Blue "📋 测试日志:"
        try {
            if (Get-Command jq -ErrorAction SilentlyContinue) {
                # 使用jq格式化JSON
                Get-Content $LogFile | jq .
            }
            else {
                # 如果没有jq，直接显示文件内容
                Get-Content $LogFile
            }
        }
        catch {
            Get-Content $LogFile
        }
    }
    else {
        Write-ColorMessage $Colors.Red "❌ 测试日志文件不存在: $LogFile"
    }
}

# 函数：显示测试报告
function Show-Report {
    $ReportFile = Join-Path $OutputDir "sandbox-test-report.json"
    
    if (Test-Path $ReportFile) {
        Write-ColorMessage $Colors.Blue "📊 测试报告:"
        
        try {
            if (Get-Command jq -ErrorAction SilentlyContinue) {
                # 使用jq解析JSON
                $Json = Get-Content $ReportFile | ConvertFrom-Json
                
                $Total = $Json.summary.total
                $Passed = $Json.summary.passed
                $Failed = $Json.summary.failed
                $PassRate = $Json.summary.passRate
                
                Write-Host "总测试数: $Total"
                Write-Host "通过: $Passed"
                Write-Host "失败: $Failed"
                Write-Host "通过率: $PassRate%"
                
                # 显示失败的测试
                $FailedTests = $Json.results | Where-Object { $_.success -eq $false }
                if ($FailedTests) {
                    Write-Host ""
                    Write-Host "失败的测试:"
                    $FailedTests | ForEach-Object {
                        Write-Host "  - $($_.name)"
                    }
                }
            }
            else {
                # 如果没有jq，直接显示文件内容
                Get-Content $ReportFile
            }
        }
        catch {
            Write-ColorMessage $Colors.Red "❌ 解析测试报告失败: $_"
            # 显示原始文件内容
            Get-Content $ReportFile
        }
    }
    else {
        Write-ColorMessage $Colors.Red "❌ 测试报告文件不存在: $ReportFile"
    }
}

# 处理显示帮助选项
if ($Help) {
    Show-Help
    exit 0
}

# 处理清理选项
if ($Clean) {
    Clean-TestEnvironment
    exit 0
}

# 处理查看日志选项
if ($Logs) {
    Show-Logs
    exit 0
}

# 处理查看报告选项
if ($Report) {
    Show-Report
    exit 0
}

# 检查Docker是否安装
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-ColorMessage $Colors.Red "❌ Docker未安装，请先安装Docker"
    exit 1
}

# 检查Docker是否运行
try {
    docker info | Out-Null
}
catch {
    Write-ColorMessage $Colors.Red "❌ Docker未运行，请先启动Docker"
    exit 1
}

# 构建镜像（如果需要）
if ($Build) {
    Build-Image
}
elseif (!(docker images test-runner-secure:test -ErrorAction SilentlyContinue)) {
    Write-ColorMessage $Colors.Yellow "⚠️ Docker镜像不存在，自动构建..."
    Build-Image
}

# 运行测试
if ($Privileged) {
    Run-PrivilegedTest
}
else {
    Run-StandardTest
}

# 显示测试报告
Show-Report