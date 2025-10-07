# API 文档自动化同步脚本
# 用途：确保 OpenAPI 规范与手写 API 文档保持同步

param(
    [string]$OpenApiPath = "../openapi.json",
    [string]$ApiDocsPath = "../API_DOCUMENTATION.md",
    [string]$OutputPath = "../quality/api-sync-report.json",
    [switch]$Fix = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🔄 开始 API 文档同步检查..." -ForegroundColor Green

# 检查文件是否存在
if (-not (Test-Path $OpenApiPath)) {
    Write-Error "OpenAPI 文件不存在: $OpenApiPath"
}

if (-not (Test-Path $ApiDocsPath)) {
    Write-Error "API 文档不存在: $ApiDocsPath"
}

# 读取 OpenAPI 规范
$openApiContent = Get-Content $OpenApiPath -Raw | ConvertFrom-Json
$apiDocsContent = Get-Content $ApiDocsPath -Raw

# 提取 API 端点
$endpoints = @()
foreach ($path in $openApiContent.paths.PSObject.Properties) {
    foreach ($method in $path.Value.PSObject.Properties) {
        $endpoints += @{
            Path = $path.Name
            Method = $method.Name.ToUpper()
            Summary = $method.Value.summary
            OperationId = $method.Value.operationId
        }
    }
}

Write-Host "📊 发现 $($endpoints.Count) 个 API 端点" -ForegroundColor Blue

# 检查文档覆盖率
$missingInDocs = @()
$extraInDocs = @()

foreach ($endpoint in $endpoints) {
    $searchPattern = "$($endpoint.Method)\s+$($endpoint.Path.Replace('/', '\/'))"
    if ($apiDocsContent -notmatch $searchPattern) {
        $missingInDocs += $endpoint
    }
}

# 生成报告
$report = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    totalEndpoints = $endpoints.Count
    missingInDocs = $missingInDocs.Count
    coverage = [math]::Round((($endpoints.Count - $missingInDocs.Count) / $endpoints.Count) * 100, 2)
    missingEndpoints = $missingInDocs
    recommendations = @()
}

if ($missingInDocs.Count -gt 0) {
    Write-Host "⚠️  发现 $($missingInDocs.Count) 个端点未在文档中记录" -ForegroundColor Yellow
    $report.recommendations += "需要在 API_DOCUMENTATION.md 中添加缺失的端点文档"
}

if ($report.coverage -lt 95) {
    $report.recommendations += "API 文档覆盖率低于 95%，建议完善文档"
}

# 保存报告
$report | ConvertTo-Json -Depth 10 | Out-File $OutputPath -Encoding UTF8
Write-Host "📄 报告已保存到: $OutputPath" -ForegroundColor Green

# 如果启用修复模式，生成文档模板
if ($Fix -and $missingInDocs.Count -gt 0) {
    $templatePath = "../quality/api-docs-template.md"
    $template = "# 缺失的 API 端点文档模板`n`n"
    
    foreach ($endpoint in $missingInDocs) {
        $template += @"
## $($endpoint.Method) $($endpoint.Path)

**描述**: $($endpoint.Summary)
**操作ID**: $($endpoint.OperationId)

### 请求参数

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| 待补充 | 待补充 | 待补充 | 待补充 |

### 响应示例

```json
{
  "待补充": "响应结构"
}
```

---

"@
    }
    
    $template | Out-File $templatePath -Encoding UTF8
    Write-Host "🔧 已生成文档模板: $templatePath" -ForegroundColor Cyan
}

# 输出结果
Write-Host "`n📈 同步检查结果:" -ForegroundColor Green
Write-Host "  总端点数: $($report.totalEndpoints)" -ForegroundColor White
Write-Host "  文档覆盖率: $($report.coverage)%" -ForegroundColor White
Write-Host "  缺失文档: $($report.missingInDocs)" -ForegroundColor White

if ($report.coverage -ge 95) {
    Write-Host "✅ API 文档同步状态良好" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ API 文档需要更新" -ForegroundColor Red
    exit 1
}