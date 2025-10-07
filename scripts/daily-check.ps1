# 日常依赖检查脚本 (PowerShell)
# 用于快速检查项目依赖状态

Write-Host "=== 依赖健康检查 ===" -ForegroundColor Green
Write-Host "检查时间: $(Get-Date)" -ForegroundColor Yellow
Write-Host ""

# 检查 Node.js 版本
Write-Host "Node.js 版本: $(node --version)" -ForegroundColor Cyan
Write-Host "npm 版本: $(npm --version)" -ForegroundColor Cyan
Write-Host ""

# 前端检查
Write-Host "=== 前端依赖检查 ===" -ForegroundColor Green
if (Test-Path "package.json") {
    Write-Host "安全检查:" -ForegroundColor Yellow
    npm audit --audit-level=moderate
    Write-Host ""
    
    Write-Host "过时依赖:" -ForegroundColor Yellow
    npm outdated
    Write-Host ""
} else {
    Write-Host "未找到前端 package.json" -ForegroundColor Red
}

# 后端检查
Write-Host "=== 后端依赖检查 ===" -ForegroundColor Green
if (Test-Path "backend/package.json") {
    Set-Location backend
    Write-Host "安全检查:" -ForegroundColor Yellow
    npm audit --audit-level=moderate
    Write-Host ""
    
    Write-Host "过时依赖:" -ForegroundColor Yellow
    npm outdated
    Write-Host ""
    Set-Location ..
} else {
    Write-Host "未找到后端 package.json" -ForegroundColor Red
}

Write-Host "=== 检查完成 ===" -ForegroundColor Green