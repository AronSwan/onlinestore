# Frontmatter 验证脚本
# 用途：验证所有 Markdown 文档的 frontmatter 格式是否符合标准

param(
    [string]$DocsPath = "../",
    [string]$OutputPath = "../quality/frontmatter-validation-report.json"
)

$ErrorActionPreference = "Continue"

Write-Host "🔍 开始 Frontmatter 验证..." -ForegroundColor Green

# 必需的 frontmatter 字段
$requiredFields = @('title', 'description', 'version', 'owner', 'lastUpdated', 'status')
$validStatuses = @('active', 'draft', 'deprecated', 'archived')

# 查找所有 Markdown 文件
$markdownFiles = Get-ChildItem -Path $DocsPath -Filter "*.md" -Recurse | Where-Object { 
    $_.FullName -notmatch "node_modules|\.git|temp" 
}

$validationResults = @()
$totalFiles = $markdownFiles.Count
$validFiles = 0
$invalidFiles = 0

Write-Host "📄 发现 $totalFiles 个 Markdown 文件" -ForegroundColor Blue

foreach ($file in $markdownFiles) {
    $relativePath = $file.FullName.Replace((Get-Location).Path, "").TrimStart('\')
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    $result = @{
        file = $relativePath
        hasFrontmatter = $false
        missingFields = @()
        invalidFields = @()
        warnings = @()
        status = "valid"
    }
    
    # 检查是否有 frontmatter
    if ($content -match '^---\s*\n(.*?)\n---\s*\n') {
        $result.hasFrontmatter = $true
        $frontmatterContent = $matches[1]
        
        try {
            # 简单解析 YAML frontmatter
            $frontmatterLines = $frontmatterContent -split '\n'
            $frontmatterData = @{}
            
            foreach ($line in $frontmatterLines) {
                if ($line -match '^(\w+):\s*(.*)$') {
                    $key = $matches[1].Trim()
                    $value = $matches[2].Trim().Trim('"', "'")
                    $frontmatterData[$key] = $value
                }
            }
            
            # 检查必需字段
            foreach ($field in $requiredFields) {
                if (-not $frontmatterData.ContainsKey($field) -or [string]::IsNullOrWhiteSpace($frontmatterData[$field])) {
                    $result.missingFields += $field
                }
            }
            
            # 验证特定字段格式
            if ($frontmatterData.ContainsKey('status') -and $frontmatterData['status'] -notin $validStatuses) {
                $result.invalidFields += "status: 无效值 '$($frontmatterData['status'])'，应为: $($validStatuses -join ', ')"
            }
            
            if ($frontmatterData.ContainsKey('lastUpdated') -and $frontmatterData['lastUpdated'] -notmatch '^\d{4}-\d{2}-\d{2}$') {
                $result.invalidFields += "lastUpdated: 格式应为 YYYY-MM-DD"
            }
            
            # 检查警告项
            if (-not $frontmatterData.ContainsKey('tags') -or [string]::IsNullOrWhiteSpace($frontmatterData['tags'])) {
                $result.warnings += "建议添加 tags 字段"
            }
            
            if (-not $frontmatterData.ContainsKey('targetRole') -or [string]::IsNullOrWhiteSpace($frontmatterData['targetRole'])) {
                $result.warnings += "建议添加 targetRole 字段"
            }
            
        } catch {
            $result.invalidFields += "Frontmatter 解析失败: $($_.Exception.Message)"
        }
    } else {
        # 跳过某些特殊文件
        if ($file.Name -notin @('README.md', 'CHANGELOG.md') -and $file.Directory.Name -ne 'templates') {
            $result.missingFields = $requiredFields
        }
    }
    
    # 确定整体状态
    if ($result.missingFields.Count -gt 0 -or $result.invalidFields.Count -gt 0) {
        $result.status = "invalid"
        $invalidFiles++
    } else {
        $validFiles++
    }
    
    $validationResults += $result
    
    # 输出进度
    $status = if ($result.status -eq "valid") { "✅" } else { "❌" }
    Write-Host "  $status $relativePath" -ForegroundColor $(if ($result.status -eq "valid") { "Green" } else { "Red" })
}

# 生成报告
$report = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    totalFiles = $totalFiles
    validFiles = $validFiles
    invalidFiles = $invalidFiles
    validationRate = [math]::Round(($validFiles / $totalFiles) * 100, 2)
    results = $validationResults
    summary = @{
        mostCommonMissingFields = ($validationResults | ForEach-Object { $_.missingFields } | Group-Object | Sort-Object Count -Descending | Select-Object -First 5)
        filesNeedingAttention = ($validationResults | Where-Object { $_.status -eq "invalid" } | Select-Object -ExpandProperty file)
    }
}

# 保存报告
$report | ConvertTo-Json -Depth 10 | Out-File $OutputPath -Encoding UTF8
Write-Host "📄 验证报告已保存到: $OutputPath" -ForegroundColor Green

# 输出摘要
Write-Host "`n📊 Frontmatter 验证结果:" -ForegroundColor Green
Write-Host "  总文件数: $totalFiles" -ForegroundColor White
Write-Host "  有效文件: $validFiles" -ForegroundColor Green
Write-Host "  无效文件: $invalidFiles" -ForegroundColor Red
Write-Host "  验证通过率: $($report.validationRate)%" -ForegroundColor White

if ($report.validationRate -ge 90) {
    Write-Host "✅ Frontmatter 质量良好" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Frontmatter 需要改进" -ForegroundColor Red
    
    # 显示需要修复的文件
    if ($invalidFiles -gt 0) {
        Write-Host "`n需要修复的文件:" -ForegroundColor Yellow
        $validationResults | Where-Object { $_.status -eq "invalid" } | ForEach-Object {
            Write-Host "  - $($_.file)" -ForegroundColor Yellow
            if ($_.missingFields.Count -gt 0) {
                Write-Host "    缺失字段: $($_.missingFields -join ', ')" -ForegroundColor Gray
            }
            if ($_.invalidFields.Count -gt 0) {
                Write-Host "    无效字段: $($_.invalidFields -join ', ')" -ForegroundColor Gray
            }
        }
    }
    
    exit 1
}