# Docker环境测试运行脚本 (PowerShell版)

Write-Host "🐳 准备在Docker环境中运行test-runner-secure验证测试..." -ForegroundColor Green

# 检查Docker是否可用
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker已安装: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker未安装或不可用，请先安装Docker" -ForegroundColor Red
    exit 1
}

# 创建临时目录
$tempDir = Join-Path $env:TEMP "test-runner-secure-$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
Write-Host "📁 创建临时目录: $tempDir" -ForegroundColor Green

# 复制必要的文件到临时目录
Copy-Item "test-runner-secure.cjs" "$tempDir\" -Force
Copy-Item "test-runner-secure.validation-tests-docker-simple.cjs" "$tempDir\" -Force

# 创建一个简单的package.json（如果需要）
$packageJson = @{
    name = "test-runner-secure-validation"
    version = "1.0.0"
    description = "Test Runner Secure Validation Tests"
    main = "test-runner-secure.validation-tests-docker-simple.cjs"
    scripts = @{
        test = "node test-runner-secure.validation-tests-docker-simple.cjs"
    }
} | ConvertTo-Json -Depth 10

Set-Content -Path "$tempDir\package.json" -Value $packageJson

# 在Docker容器中运行测试
Write-Host "🚀 在Docker容器中运行测试..." -ForegroundColor Green
$containerPath = "/app"
$hostPath = $tempDir.Replace('\', '/')

try {
    $result = docker run --rm `
        -v "${hostPath}:${containerPath}" `
        -w $containerPath `
        node:18-alpine `
        sh -c "node test-runner-secure.validation-tests-docker-simple.cjs"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker环境测试成功完成！" -ForegroundColor Green
    } else {
        Write-Host "❌ Docker环境测试失败！" -ForegroundColor Red
        # 清理临时目录
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        exit 1
    }
} catch {
    Write-Host "❌ 运行Docker容器时出错: $($_.Exception.Message)" -ForegroundColor Red
    # 清理临时目录
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

# 清理临时目录
Write-Host "🧹 清理临时目录..." -ForegroundColor Green
Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "🎉 Docker环境测试完成！" -ForegroundColor Green