# Paperless-NGX 一键部署脚本
# 作者: Caddy Shopping Backend Team
# 版本: 1.0.0
# 日期: 2025-10-05

param(
    [string]$Environment = "development",
    [string]$Domain = "localhost", 
    [int]$Port = 8010,
    [switch]$SkipDownload,
    [switch]$Verbose
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 添加必要的类型
Add-Type -AssemblyName System.Web

# 导入辅助函数
. "$PSScriptRoot\paperless-helpers.ps1"
. "$PSScriptRoot\paperless-config.ps1"
. "$PSScriptRoot\paperless-service.ps1"

# 主部署流程
function Start-PaperlessDeployment {
    Write-ColorOutput "🚀 开始部署 Paperless-NGX..." "Green"
    Write-ColorOutput "📋 部署参数:" "Cyan"
    Write-ColorOutput "  - 环境: $Environment" "White"
    Write-ColorOutput "  - 域名: $Domain" "White"
    Write-ColorOutput "  - 端口: $Port" "White"
    Write-ColorOutput "  - 跳过下载: $SkipDownload" "White"
    
    try {
        # 1. 检查前置条件
        Test-Prerequisites
        
        # 2. 初始化部署环境
        Initialize-DeploymentEnvironment
        
        # 3. 下载配置文件
        Get-ConfigurationFiles
        
        # 4. 生成安全配置
        $securityConfig = New-SecurityConfiguration
        
        # 5. 创建环境配置
        New-EnvironmentConfiguration -SecurityConfig $securityConfig
        
        # 6. 启动服务
        Start-PaperlessServices -SecurityConfig $securityConfig
        
        # 7. 等待服务就绪
        Wait-ForServices
        
        # 8. 验证部署
        Test-DeploymentHealth
        
        # 9. 显示部署结果
        Show-DeploymentSummary -SecurityConfig $securityConfig
        
        Write-ColorOutput "🎉 Paperless-NGX 部署完成！" "Green"
        
    } catch {
        Write-ColorOutput "❌ 部署失败: $($_.Exception.Message)" "Red"
        Write-ColorOutput "📋 查看详细日志:" "Yellow"
        if (Test-Path "docker-compose.yml") {
            docker-compose logs --tail=50
        }
        exit 1
    }
}

# 启动部署
Start-PaperlessDeployment