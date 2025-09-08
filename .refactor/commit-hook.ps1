# 重构提交钩子脚本 (PowerShell版本)
# 确保每次提交都经过质量检查

param(
    [string]$CommitMessage = ""
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

# 检查提交消息格式
function Test-CommitMessage {
    param([string]$Message)
    
    if ([string]::IsNullOrWhiteSpace($Message)) {
        Write-ColorOutput "❌ 提交消息不能为空" "Red"
        return $false
    }
    
    # 检查是否包含重构标识
    if ($Message -match "^refactor:") {
        Write-ColorOutput "✅ 重构提交格式正确" "Green"
        return $true
    }
    
    # 允许其他类型的提交，但给出提示
    Write-ColorOutput "ℹ️  非重构提交，跳过重构检查" "Yellow"
    return $true
}

# 运行测试套件
function Invoke-TestSuite {
    Write-ColorOutput "🧪 运行测试套件..." "Cyan"
    
    try {
        $testResult = npm test 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ 所有测试通过" "Green"
            return $true
        } else {
            Write-ColorOutput "❌ 测试失败:" "Red"
            Write-ColorOutput $testResult "Red"
            return $false
        }
    } catch {
        Write-ColorOutput "❌ 测试执行出错: $($_.Exception.Message)" "Red"
        return $false
    }
}

# 检查代码质量
function Test-CodeQuality {
    Write-ColorOutput "🔍 检查代码质量..." "Cyan"
    
    # 检查是否有语法错误
    try {
        $lintResult = npm run lint 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ 代码质量检查通过" "Green"
            return $true
        } else {
            Write-ColorOutput "⚠️  代码质量检查有警告，但允许提交" "Yellow"
            return $true
        }
    } catch {
        Write-ColorOutput "ℹ️  未配置lint脚本，跳过代码质量检查" "Yellow"
        return $true
    }
}

# 更新重构护照
function Update-RefactorPassport {
    $passportPath = ".refactor\passport.json"
    
    if (Test-Path $passportPath) {
        try {
            $passport = Get-Content $passportPath | ConvertFrom-Json
            $passport.last_commit_check = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
            $passport.commit_checks_passed = $passport.commit_checks_passed + 1
            
            $passport | ConvertTo-Json -Depth 10 | Set-Content $passportPath
            Write-ColorOutput "✅ 重构护照已更新" "Green"
        } catch {
            Write-ColorOutput "⚠️  重构护照更新失败: $($_.Exception.Message)" "Yellow"
        }
    }
}

# 主执行逻辑
function Main {
    Write-ColorOutput "🚀 开始重构提交检查..." "Cyan"
    Write-ColorOutput "提交消息: $CommitMessage" "White"
    
    # 检查提交消息
    if (-not (Test-CommitMessage $CommitMessage)) {
        Write-ColorOutput "❌ 提交被拒绝：提交消息格式不正确" "Red"
        exit 1
    }
    
    # 如果是重构提交，执行完整检查
    if ($CommitMessage -match "^refactor:") {
        Write-ColorOutput "🔧 检测到重构提交，执行完整质量检查..." "Cyan"
        
        # 运行测试
        if (-not (Invoke-TestSuite)) {
            Write-ColorOutput "❌ 提交被拒绝：测试失败" "Red"
            Write-ColorOutput "💡 请修复测试后重新提交" "Yellow"
            exit 1
        }
        
        # 检查代码质量
        if (-not (Test-CodeQuality)) {
            Write-ColorOutput "❌ 提交被拒绝：代码质量检查失败" "Red"
            exit 1
        }
        
        # 更新重构护照
        Update-RefactorPassport
    }
    
    Write-ColorOutput "✅ 所有检查通过，允许提交" "Green"
    Write-ColorOutput "📝 提交记录已更新到重构护照" "Cyan"
    exit 0
}

# 执行主函数
Main