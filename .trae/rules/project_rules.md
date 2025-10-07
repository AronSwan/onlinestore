# 🎯 AI 代码审计提示词 (2025 秋季版 v3.1)

> 被调用方式（与 AI Project Build Rules v2.1 对齐）
> - 首选入口：`.trae/rules/audit.ps1`（PowerShell 7.4+）。在项目根目录执行：
>   - Windows: `pwsh -File .\\.trae\\rules\\audit.ps1`
> - 备选：复制本文件“审计流程脚本”部分为 `Start-Audit.ps1` 后执行。
> - 报告目录来源：`reporting.output_path`（默认 `./audit-reports`）。
> - 阻断阈值来源：`audit.profiles.{profile}.security.block_on_cvss` 与 `max_vulnerabilities`（默认 profile: `balanced` → 8.0 / 5）。
> - 状态机联动：当触发阻断阈值时，按 <mcfile name="projectbuild_rules.md" path="d:\codes\onlinestore\.trae\rules\projectbuild_rules.md"></mcfile> Step 6 的规则回退至 `DEVELOPING`；审计通过进入 `OPTIMIZING`。
> <!-- Inserted by AI assistant; Timestamp: 2025-09-10 20:06:18 Asia/Shanghai; Source: projectbuild_rules.md v2.1 -->

**定位**：一份「零配置差异、零信任死角、零幻觉容忍」的 128K 上下文 Prompt；投喂给 GPT-4o / Claude-3.5 / Qwen-2.5-72B，5 min 内吐出可直接 `git apply` 的审计产物。  
**适用场景**：金融级微服务、云原生基础设施、AI 推理、车规嵌入式、链码。  
**交付承诺**：SARIF 2.1 + Markdown + CSV + fixes.patch + SBOM + 可执行 CI 脚本，全部路径化、版本化、可回溯。

---

### 🚀 执行指南

本文件包含一个自洽的 AI 代码审计工作流，由 YAML 配置和 PowerShell 执行脚本两部分组成。脚本会动态读取并解析本文档中嵌入的 YAML 配置来执行一系列安全和质量检查。

**前提条件:**

1.  **执行环境**: Windows 11 / Windows Server 2022 或更高版本，已安装 PowerShell 7.4+。
2.  **PowerShell 模块**:
    *   `powershell-yaml`: 用于解析 YAML 配置。通过 `Install-Module -Name powershell-yaml -Scope CurrentUser` 安装。
3.  **核心工具链**: 确保以下工具已安装并在系统 `PATH` 中可用：
    *   `git`
    *   `npm` (如果项目包含 `package.json`)
    *   `CodeQL CLI`
    *   `Semgrep`
    *   `OSV-Scanner`
    *   `Syft`
    *   `Trivy` (如果需要容器扫描)

**执行步骤:**

1.  **保存脚本**: 将下面的 "审计流程脚本" 部分的代码复制并保存为一个 `.ps1` 文件（例如 `Start-Audit.ps1`）。
2.  **环境配置 (可选)**: 脚本会使用 YAML 中定义的默认值。你可以通过设置环境变量来覆盖这些值，例如：
    ```powershell
    $env:AUDIT_PROFILE="strict"
    $env:PROJECT_REPO="https://github.com/my-org/my-critical-app.git"
    ```
3.  **运行审计**: 在 PowerShell 7+ 终端中，导航到包含 `project_rules.md` 的目录，然后执行脚本：
    ```powershell
    .\\Start-Audit.ps1
    ```
4.  **查看结果**: 审计完成后，所有报告将根据 YAML `reporting.output_path` 的配置（默认为 `./audit-reports`）生成。同时会创建一个 `audit-run.log` 文件记录详细的执行日志。

**工作流概述:**

脚本会自动执行以下步骤：
1.  **解析配置**: 从本文档中提取并解析 `AI 代码审计配置`。
2.  **环境检查**: 验证所有必需的工具是否存在。
3.  **代码准备**: 克隆在配置中指定的 Git 仓库，并安装项目依赖。
4.  **执行扫描**: 依次运行 SAST (CodeQL, Semgrep)、SCA (OSV-Scanner, npm audit) 工具。
5.  **生成 SBOM**: 使用 Syft 创建软件物料清单。
6.  **生成报告**: 将所有工具的输出保存在指定的报告目录中。

---

### ⚙️ 1. AI 代码审计配置 (YAML v3.1)

```yaml
# AI Code Audit Configuration v3.1
# A streamlined, zero-trust configuration for AI-powered code audits.
# Source: Refactored from project_rules.md by AI assistant
# Timestamp: 2025-01-26T15:00:00Z

version: "3.1.0"

# --- Project Context ---
# Defines the project being audited.
project:
  name: "caddy-style-shopping-site"
  version: "1.0.0"
  owner: "e-commerce-team"
  repository:
    url: "https://github.com/your-org/your-repo.git"
    branch: "main"
    commit: "HEAD"
    local_path: "./"
  
  # Supported languages and their versions.
  languages:
    javascript: "ES2024"
    typescript: "5.7"
    html: "5"
    css: "3"
    json: "latest"

  # 'microservice', 'monolith', 'library', 'iot-firmware', 'ai-inference', 'chaincode'
  type: "microservice" 
  
  # 'low', 'medium', 'high', 'critical'
  criticality: "high" 

# --- Audit Configuration ---
# Specifies the audit's scope, depth, and rules.
audit:
  # 'strict', 'balanced', 'lenient'
  profile: "balanced"

  # 'deep' (code + dependencies + infrastructure), 'standard' (code + dependencies), 'shallow' (code only)
  depth: "deep"

  # Globs for files and directories to include in the audit.
  scope:
    include:
      - "js/**/*.js"
      - "js/**/*.cjs"
      - "css/**/*.css"
      - "*.html"
      - "*.json"
      - "components/**/*"
      - "config/**/*"
      - "scripts/**/*"
    exclude:
      - "**/node_modules/**"
      - "**/dist/**"
      - "**/build/**"
      - "**/test*/**"
      - "**/tests/**"
      - "**/docs/**"
      - "**/*.md"
      - "**/*.log"
      - "**/.*"

  # Rules for different audit profiles.
  profiles:
    strict:
      fail_fast: true
      security:
        block_on_cvss: 7.0
        max_vulnerabilities: 0
      quality:
        min_coverage_line: 95
        min_coverage_branch: 90
        max_complexity: 8
      performance:
        max_p99_latency_ms: 100
      license:
        deny: ["GPL-*", "AGPL-*"]

    balanced:
      fail_fast: true
      security:
        block_on_cvss: 8.0
        max_vulnerabilities: 5
      quality:
        min_coverage_line: 90
        min_coverage_branch: 85
        max_complexity: 10
      performance:
        max_p99_latency_ms: 250
      license:
        deny: ["AGPL-*"]

    lenient:
      fail_fast: false
      security:
        block_on_cvss: 9.0
        max_vulnerabilities: 20
      quality:
        min_coverage_line: 80
        min_coverage_branch: 75
        max_complexity: 15
      performance:
        max_p99_latency_ms: 500
      license:
        deny: []

# --- Toolchain Configuration ---
# Defines the security and quality tools to be used.
toolchain:
  sast:
    - name: "CodeQL"
      enabled: true
      config: "security-and-quality"
      languages: ["javascript"]
      timeout: 1800
    - name: "Semgrep"
      enabled: true
      config: "p/ci"
      rules: ["p/security-audit", "p/javascript"]
      timeout: 600
    - name: "ESLint"
      enabled: true
      config: ".eslintrc.cjs"
      fix: false
  sca:
    - name: "OSV-Scanner"
      enabled: true
      format: "sarif"
      timeout: 300
    - name: "npm-audit"
      enabled: true
      args: "--audit-level=moderate"
      format: "json"
    - name: "Retire.js"
      enabled: true
      severity: "medium"
  sbom:
    - name: "Syft"
      enabled: true
      format: "cyclonedx-json"
      include_dev: false
  container_security:
    - name: "Trivy"
      enabled: false
      ignore_unfixed: true
      severity: "CRITICAL,HIGH"
  quality:
    - name: "SonarJS"
      enabled: false
      rules: "recommended"
    - name: "JSHint"
      enabled: false
      config: ".jshintrc"

# --- Execution Environment ---
# Configures the environment where the audit runs.
environment:
  platform: "docker"
  docker:
    image: "mcr.microsoft.com/powershell:latest"
    container_name: "trae-audit-container"
  working_directory: "./"
  timeout_minutes: 45
  fail_fast: true
  parallel_execution: false
  cache:
    enabled: true
    path: ".audit-cache"
    ttl_hours: 24
  temp_directory: "./temp-audit"

# --- Reporting & Notifications ---
# Defines how audit results are reported and who gets notified.
reporting:
  # 'sarif', 'markdown', 'json', 'html', 'csv'
  formats: ["sarif", "markdown", "json"]
  output_path: "./audit-reports"
  timestamp_format: "yyyy-MM-dd_HH-mm-ss"
  include_metadata: true
  compress_results: false
  notifications:
    console:
      enabled: true
      level: "info"
    file:
      enabled: true
      path: "audit-run.log"
    github_pr_comment:
      enabled: false
    slack:
      enabled: false
      webhook_url: ""
    email:
      enabled: false
      recipients: []

# --- Integrations ---
# Configures integrations with external systems.
integrations:
  issue_tracking:
    jira:
      enabled: false
      url: ""
      project_key: ""
    github_issues:
      enabled: false
      assignees: []
      labels: ["security", "audit"]
  ci_cd:
    github_actions:
      enabled: true
      auto_generate: true
      workflow_file: ".github/workflows/audit.yml"
      windows_image: "windows-latest"
      node_versions: ["20.x"]
      triggers:
        push_branches: ["main", "master"]
        pull_request_branches: ["*"]
    # Legacy CI provider integration note removed by AI assistant on 2025-09-10 10:12:29Z (UTC) — Source: automated doc cleanup
    jenkins:
      enabled: false
      auto_generate: false
      jenkinsfile_path: "Jenkinsfile"
  security_platforms:
    defectdojo:
      enabled: false
      url: ""
    sonarqube:
      enabled: false
      url: ""
```

---

### 📜 2. 审计流程脚本 (PowerShell v3.2)

```powershell
# AI Code Audit Workflow v3.2 (PowerShell Edition)
# Refactored for clarity, robustness, and tight integration with the embedded YAML configuration.
# Source: AI Assistant Refactoring of project_rules.md
# Timestamp: 2025-01-26T15:30:00Z
# Prerequisites: PowerShell 7.4+, powershell-yaml module

# --- Script Setup ---
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"
$Global:AuditLogFile = "audit-run.log"
$Global:AuditStartTime = Get-Date
$Global:AuditErrors = @()

# Clean up previous log file
if (Test-Path $Global:AuditLogFile) { Remove-Item $Global:AuditLogFile -Force }

# --- Logging ---
function Write-Log {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,
        [ValidateSet("INFO", "WARN", "ERROR", "DEBUG")]
        [string]$Level = "INFO"
    )
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $logEntry = "[$timestamp] [$Level] $Message"
    
    try {
        Add-Content -Path $Global:AuditLogFile -Value $logEntry -Encoding UTF8 -ErrorAction SilentlyContinue
    } catch {
        # Fallback if log file is locked
    }

    switch ($Level) {
        "INFO"  { Write-Host $logEntry -ForegroundColor Green }
        "WARN"  { Write-Host $logEntry -ForegroundColor Yellow }
        "ERROR" { 
            Write-Host $logEntry -ForegroundColor Red
            $Global:AuditErrors += $Message
        }
        "DEBUG" { Write-Host $logEntry -ForegroundColor Gray }
    }
}

# --- Configuration Management ---
function Get-EmbeddedAuditConfig {
    param (
        [string]$MarkdownPath = ".trae\rules\project_rules.md"
    )
    
    # Try multiple possible paths
    $possiblePaths = @(
        $MarkdownPath,
        "d:\codes\onlinestore\.trae\rules\project_rules.md",
        ".\project_rules.md",
        "project_rules.md"
    )
    
    $foundPath = $null
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $foundPath = $path
            break
        }
    }
    
    if (-not $foundPath) {
        Write-Log "Markdown file not found in any of the expected locations." "ERROR"
        return $null
    }
    
    Write-Log "Parsing embedded YAML configuration from '$foundPath'..."
    
    try {
        $content = Get-Content -Path $foundPath -Raw -Encoding UTF8
        $yamlRegex = [regex]'(?ms)```yaml\s*\n(.*?)\n```'
        $match = $yamlRegex.Match($content)
        
        if ($match.Success) {
            $yamlContent = $match.Groups[1].Value
            
            # Check if powershell-yaml module is available
            if (-not (Get-Command ConvertFrom-Yaml -ErrorAction SilentlyContinue)) {
                Write-Log "The 'powershell-yaml' module is not installed. Attempting to install..." "WARN"
                try {
                    Install-Module -Name powershell-yaml -Scope CurrentUser -Force -AllowClobber
                    Import-Module powershell-yaml
                } catch {
                    Write-Log "Failed to install powershell-yaml module: $($_.Exception.Message)" "ERROR"
                    return $null
                }
            }
            
            $config = $yamlContent | ConvertFrom-Yaml
            Write-Log "YAML configuration parsed successfully."
            
            # Save debug copy
            $config | ConvertTo-Json -Depth 10 | Out-File "config-debug.json" -Encoding UTF8
            
            return $config
        } else {
            Write-Log "Could not find embedded YAML configuration block in '$foundPath'." "ERROR"
            return $null
        }
    } catch {
        Write-Log "Failed to parse YAML. Error: $($_.Exception.Message)" "ERROR"
        return $null
    }
}

function Get-ConfigValue {
    param(
        [Parameter(Mandatory=$true)] $Config,
        [Parameter(Mandatory=$true)] [string]$Path,
        $DefaultValue = $null
    )
    
    if ($null -eq $Config) {
        Write-Log "Configuration object is null for path: $Path" "WARN"
        return $DefaultValue
    }
    
    $keys = $Path.Split('.')
    $current = $Config
    
    foreach ($key in $keys) {
        if ($null -eq $current) {
            Write-Log "Null value encountered in config path: $Path at key: $key" "DEBUG"
            return $DefaultValue
        }
        
        # Handle both hashtable and PSObject
        if ($current -is [hashtable]) {
            if ($current.ContainsKey($key)) {
                $current = $current[$key]
            } else {
                Write-Log "Key '$key' not found in hashtable for path: $Path" "DEBUG"
                return $DefaultValue
            }
        } elseif ($current.PSObject.Properties.Name -contains $key) {
            $current = $current.$key
        } else {
            Write-Log "Key '$key' not found in object for path: $Path" "DEBUG"
            return $DefaultValue
        }
    }
    
    return $current
}

# --- Task Functions ---
function Check-ToolEnvironment {
    param(
        [Parameter(Mandatory=$true)] $Toolchain,
        [Parameter(Mandatory=$true)] $EnvironmentConfig
    )
    
    Write-Log "Checking tool environment..."
    $allTools = @()
    $missingTools = @()
    
    # Extract tools from toolchain configuration
    if ($Toolchain -is [hashtable]) {
        foreach ($category in $Toolchain.Keys) {
            $tools = $Toolchain[$category]
            if ($tools -is [array]) {
                foreach ($tool in $tools) {
                    if ($tool.enabled -eq $true -and $tool.name) {
                        $allTools += $tool.name
                    }
                }
            }
        }
    } else {
        $Toolchain.PSObject.Properties | ForEach-Object {
            $tools = $_.Value
            if ($tools -is [array]) {
                foreach ($tool in $tools) {
                    if ($tool.enabled -eq $true -and $tool.name) {
                        $allTools += $tool.name
                    }
                }
            }
        }
    }
    
    $uniqueTools = $allTools | Select-Object -Unique | Where-Object { $_ }
    # Always check core tools as well
    $uniqueTools = ($uniqueTools + @('git','npm','npx')) | Select-Object -Unique | Where-Object { $_ }
    Write-Log "Required tools: $($uniqueTools -join ', ')"
    
    $isDocker = ($EnvironmentConfig.platform -eq 'docker')
    $containerName = if ($isDocker) { $EnvironmentConfig.container_name } else { $null }

    # Check each tool
    foreach ($tool in $uniqueTools) {
        $toolLower = $tool.ToLower()
        $found = $false
        $checkCommand = "Get-Command $toolLower -ErrorAction SilentlyContinue"
        
        if ($isDocker) {
            Write-Log "Checking for '$toolLower' inside Docker container '$containerName'..."
            $dockerCommand = "docker exec $containerName powershell -Command `"$checkCommand`""
            $result = Invoke-Expression $dockerCommand
            $found = ($result -ne $null) -and ($LASTEXITCODE -eq 0)
        } else {
            $found = (Get-Command $toolLower -ErrorAction SilentlyContinue) -ne $null
        }

        if (-not $found) {
            $missingTools += $tool
            $installHint = switch ($toolLower) {
                "codeql"      { "Please install from https://github.com/github/codeql-cli-binaries" }
                "semgrep"     { "Please install with 'pip install semgrep'" }
                "osv-scanner" { "Please install from https://github.com/google/osv-scanner" }
                "syft"        { "Please install from https://github.com/anchore/syft" }
                "npm"         { "Please install Node.js" }
                "git"         { "Please install Git" }
                default       { "Tool '$tool' not found in PATH" }
            }
            Write-Log "$($tool) not found. $installHint" "WARN"
        }
    }
    
    if ($missingTools.Count -gt 0) {
        Write-Log "Missing tools: $($missingTools -join ', '). Audit will continue but some scans may be skipped." "WARN"
    } else {
        Write-Log "All required tools are available."
    }
    
    return $missingTools.Count -eq 0
}

function Prepare-CodeBase {
    param(
        [string]$RepoUrl,
        [string]$LocalPath = "./",
        [string]$TargetDir = "source"
    )
    
    # If local_path is specified and exists, use it
    if ($LocalPath -and $LocalPath -ne "./" -and (Test-Path $LocalPath)) {
        Write-Log "Using local codebase at: $LocalPath"
        return $LocalPath
    }
    
    # If we're already in a git repository, use current directory
    if (Test-Path ".git") {
        Write-Log "Using current directory as codebase (git repository detected)"
        return "./"
    }
    
    # If RepoUrl is provided, clone it
    if ($RepoUrl -and $RepoUrl -ne "" -and $RepoUrl -ne "https://github.com/your-org/your-repo.git") {
        if (Test-Path $TargetDir) {
            Write-Log "Directory '$TargetDir' already exists. Removing..."
            Remove-Item $TargetDir -Recurse -Force
        }
        
        Write-Log "Cloning repository from '$RepoUrl' into '$TargetDir'..."
        try {
            & git clone --depth 1 $RepoUrl $TargetDir
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Repository cloned successfully."
                return $TargetDir
            } else {
                Write-Log "Git clone failed with exit code: $LASTEXITCODE" "ERROR"
                return "./"
            }
        } catch {
            Write-Log "Failed to clone repository: $($_.Exception.Message)" "ERROR"
            return "./"
        }
    }
    
    # Default to current directory
    Write-Log "Using current directory as codebase"
    return "./"
}

# --- Tool Execution Functions ---
function Invoke-CommandInEnvironment {
    param(
        [Parameter(Mandatory=$true)] $Command,
        [Parameter(Mandatory=$true)] $Arguments,
        [Parameter(Mandatory=$true)] $EnvironmentConfig
    )
    
    if ($EnvironmentConfig.platform -eq 'docker') {
        $containerName = $EnvironmentConfig.docker.container_name
        $dockerArgs = @('exec', $containerName, 'powershell', '-Command', "$Command $Arguments")
        Write-Log "Executing in Docker: docker @dockerArgs" "DEBUG"
        & docker @dockerArgs
    } else {
        Write-Log "Executing locally: & $Command $Arguments" "DEBUG"
        & $Command $Arguments
    }
}

function Invoke-Tool {
    param(
        [Parameter(Mandatory=$true)] $ToolConfig,
        [Parameter(Mandatory=$true)] [string]$WorkingDir,
        [Parameter(Mandatory=$true)] [string]$OutputPath,
        [string]$Category = "unknown",
        [string]$TimestampFormat = "yyyyMMdd-HHmmss",
        $Config = $null
    )
    
    $toolName = $ToolConfig.name
    $toolNameLower = $toolName.ToLower()
    $desiredFormat = if ($ToolConfig.PSObject.Properties.Name -contains 'format' -and $ToolConfig.format) { $ToolConfig.format.ToLower() } else { 'json' }

    # Determine output extension
    $ext = switch ($toolNameLower) {
        'codeql' { 'sarif' }
        default {
            if ($desiredFormat -in @('sarif','json')) { $desiredFormat } else { 'json' }
        }
    }

    $timestamp = Get-Date -Format $TimestampFormat
    $safeName = ($toolNameLower -replace '[^a-z0-9\-\.]', '-')
    $outputFile = Join-Path $OutputPath "$Category-$safeName-$timestamp.$ext"
    # Resolve to absolute output path to avoid issues when changing directories
    try {
        $resolvedOutputPath = Resolve-Path -LiteralPath $OutputPath -ErrorAction Stop
    } catch {
        New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
        $resolvedOutputPath = Resolve-Path -LiteralPath $OutputPath
    }
    $outputFile = Join-Path $resolvedOutputPath.Path (Split-Path -Leaf $outputFile)
    
    Write-Log "Executing $Category tool: $toolName -> $outputFile"
    
    try {
        Push-Location $WorkingDir
        
        # Get environment config for the helper function
        $envConfig = Get-ConfigValue -Config $Config -Path 'environment'
        
        switch ($toolNameLower) {
            'codeql' {
                $lang = if ($ToolConfig.PSObject.Properties.Name -contains 'languages' -and $ToolConfig.languages) { ($ToolConfig.languages -join ',') } else { 'javascript' }
                $dbPath = "codeql-db"
                Invoke-CommandInEnvironment "codeql" "database create $dbPath --language=$lang --source-root=. --overwrite" $envConfig
                
                $queries = if ($ToolConfig.PSObject.Properties.Name -contains 'config' -and $ToolConfig.config) {
                    switch ($ToolConfig.config.ToLower()) {
                        'security-and-quality' { 'codeql/javascript-queries' }
                        default { $ToolConfig.config }
                    }
                } else { 'codeql/javascript-queries' }

                Invoke-CommandInEnvironment "codeql" "database analyze $dbPath $queries --format=sarif-latest --output=$outputFile --overwrite" $envConfig
                Write-Log "CodeQL analysis completed: $outputFile"
            }
            'semgrep' {
                $cfgArgs = @()
                if ($ToolConfig.PSObject.Properties.Name -contains 'config' -and $ToolConfig.config) { $cfgArgs += @('--config', $ToolConfig.config) }
                if ($ToolConfig.PSObject.Properties.Name -contains 'rules' -and $ToolConfig.rules) {
                    foreach ($r in $ToolConfig.rules) { $cfgArgs += @('--config', $r) }
                }
                $scanArgs = ($cfgArgs | ForEach-Object { "'$_'" }) -join " "
                if ($ext -eq 'sarif') {
                    Invoke-CommandInEnvironment "semgrep" "scan $scanArgs --sarif --output $outputFile ." $envConfig
                } else {
                    Invoke-CommandInEnvironment "semgrep" "scan $scanArgs --json --output $outputFile ." $envConfig
                }
                Write-Log "Semgrep analysis completed: $outputFile"
            }
            'eslint' {
                $eslintArgs = @("'.'", "--format", "'json'", "--output-file", "'$outputFile'")
                if ($ToolConfig.PSObject.Properties.Name -contains 'config' -and $ToolConfig.config) { $eslintArgs = @('--config', $ToolConfig.config) + $eslintArgs }
                if ($ToolConfig.PSObject.Properties.Name -contains 'fix' -and $ToolConfig.fix) { $eslintArgs = @('--fix') + $eslintArgs }
                $argString = $eslintArgs -join " "
                Invoke-CommandInEnvironment "npx" "eslint $argString" $envConfig
                Write-Log "ESLint analysis completed: $outputFile"
            }
            'osv-scanner' {
                $fmt = if ($desiredFormat -in @('json','sarif')) { $desiredFormat } else { 'json' }
                Invoke-CommandInEnvironment "osv-scanner" "--format=$fmt --output=$outputFile ." $envConfig
                Write-Log "OSV-Scanner analysis completed: $outputFile"
            }
            'npm-audit' {
                if (Test-Path "package.json") {
                    $args = if ($ToolConfig.PSObject.Properties.Name -contains 'args' -and $ToolConfig.args) { $ToolConfig.args } else { "" }
                    # npm audit --json is tricky with Invoke-CommandInEnvironment due to output redirection
                    if ($envConfig.platform -eq 'docker') {
                        $containerName = $envConfig.docker.container_name
                        & docker exec $containerName powershell -Command "npm audit $args --json" | Out-File $outputFile -Encoding UTF8
                    } else {
                        & npm audit $args --json | Out-File $outputFile -Encoding UTF8
                    }
                    Write-Log "npm audit completed: $outputFile"
                } else {
                    Write-Log "package.json not available, skipping npm audit" "WARN"
                }
            }
            'retire.js' {
                 Invoke-CommandInEnvironment "npx" "retire --outputformat json --outputpath $outputFile" $envConfig
                 Write-Log "Retire.js analysis completed: $outputFile"
            }
            'retire' {
                 Invoke-CommandInEnvironment "npx" "retire --outputformat json --outputpath $outputFile" $envConfig
                 Write-Log "Retire.js analysis completed: $outputFile"
            }
            'syft' {
                $fmt = if ($ToolConfig.PSObject.Properties.Name -contains 'format' -and $ToolConfig.format) { $ToolConfig.format } else { 'json' }
                # Syft output redirection is also tricky
                if ($envConfig.platform -eq 'docker') {
                    $containerName = $envConfig.docker.container_name
                    & docker exec $containerName powershell -Command "syft . -o $fmt" | Out-File $outputFile -Encoding UTF8
                } else {
                    & syft . -o $fmt | Out-File $outputFile -Encoding UTF8
                }
                Write-Log "Syft SBOM generation completed: $outputFile"
            }
            'trivy' {
                $fmt = if ($desiredFormat -in @('json','sarif')) { $desiredFormat } else { 'json' }
                Invoke-CommandInEnvironment "trivy" "fs --format $fmt --output $outputFile ." $envConfig
                Write-Log "Trivy analysis completed: $outputFile"
            }
            default {
                Write-Log "Unknown tool: $toolName, skipping" "WARN"
            }
        }
    } catch {
        Write-Log "Error executing $toolName: $($_.Exception.Message)" "ERROR"
    } finally {
        Pop-Location
    }
}

function Generate-AuditReport {
    param(
        [Parameter(Mandatory=$true)] [string]$OutputPath,
        [Parameter(Mandatory=$true)] $Config
    )
    
    $reportFile = Join-Path $OutputPath "audit-summary-$(Get-Date -Format (Get-ConfigValue $Config 'reporting.timestamp_format' 'yyyyMMdd-HHmmss')).md"
    $endTime = Get-Date
    $duration = $endTime - $Global:AuditStartTime
    
    $reportContent = @"
# AI Code Audit Report

**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
**Duration:** $($duration.TotalMinutes.ToString('F2')) minutes
**Project:** $(Get-ConfigValue $Config 'project.name' 'Unknown')
**Version:** $(Get-ConfigValue $Config 'project.version' 'Unknown')

## Execution Summary

- **Start Time:** $($Global:AuditStartTime.ToString('yyyy-MM-dd HH:mm:ss'))
- **End Time:** $($endTime.ToString('yyyy-MM-dd HH:mm:ss'))
- **Total Errors:** $($Global:AuditErrors.Count)

## Errors Encountered

"@
    
    if ($Global:AuditErrors.Count -gt 0) {
        foreach ($error in $Global:AuditErrors) {
            $reportContent += "- $error`n"
        }
    } else {
        $reportContent += "No errors encountered during audit execution.`n"
    }
    
    $reportContent += @"

## Generated Files

"@
    
    $outputFiles = Get-ChildItem $OutputPath -File | Where-Object { $_.Name -ne (Split-Path $reportFile -Leaf) }
    foreach ($file in $outputFiles) {
        $reportContent += "- [$($file.Name)](./$($file.Name)) - $($file.Length) bytes`n"
    }
    
    $reportContent += @"

## Next Steps

1. Review individual tool reports for detailed findings
2. Prioritize security vulnerabilities by severity
3. Update dependencies with known vulnerabilities
4. Implement recommended security controls
5. Schedule regular security audits

---
*Report generated by AI Code Audit Workflow v3.2*
"@
    
    $reportContent | Out-File $reportFile -Encoding UTF8
    Write-Log "Audit summary report generated: $reportFile"
}

# --- Main Execution ---
function Start-Audit {
    Write-Log "Starting AI Code Audit Workflow v3.2..."
    
    # Load configuration
    $config = Get-EmbeddedAuditConfig
    if (-not $config) {
        Write-Log "Failed to load audit configuration. Exiting." "ERROR"
        return
    }
    
    # Extract configuration values
    $outputPath = Get-ConfigValue $config "reporting.output_path" "./audit-reports"
    $repoUrl = Get-ConfigValue $config "project.repository.url"
    $localPath = Get-ConfigValue $config "project.repository.local_path" "./"
    $toolchain = Get-ConfigValue $config "toolchain"
    $timestampFormat = Get-ConfigValue $config "reporting.timestamp_format" "yyyyMMdd-HHmmss"
    
    Write-Log "Output path: $outputPath"
    
    # Ensure output directory exists
    if (-not (Test-Path $outputPath)) {
        New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
        Write-Log "Created output directory: $outputPath"
    }
    
    # Step 1: Environment Verification
    Write-Log "Step 1: Environment Verification"
    $toolsAvailable = Check-ToolEnvironment $toolchain
    
    # Step 2: Code Preparation
    Write-Log "Step 2: Code Preparation"
    $workingDir = Prepare-CodeBase $repoUrl $localPath "source"
    
    # Install dependencies if package.json exists
    if (Test-Path "$workingDir/package.json") {
        Write-Log "Installing Node.js dependencies..."
        Push-Location $workingDir
        try {
            & npm install
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Dependencies installed successfully."
            } else {
                Write-Log "npm install failed with exit code: $LASTEXITCODE" "WARN"
            }
        } catch {
            Write-Log "Failed to install dependencies: $($_.Exception.Message)" "WARN"
        } finally {
            Pop-Location
        }
    }
    
    # Step 3: SAST Analysis
    Write-Log "Step 3: SAST Analysis"
    $sastTools = Get-ConfigValue $config "toolchain.sast" @()
    if ($sastTools -and $sastTools.Count -gt 0) {
        foreach ($tool in $sastTools) {
            if ($tool.enabled -eq $true) {
                Invoke-Tool $tool $workingDir $outputPath "sast" $timestampFormat $config
            }
        }
    } else {
        Write-Log "No SAST tools configured" "WARN"
    }
    
    # Step 4: SCA Analysis
    Write-Log "Step 4: SCA Analysis"
    $scaTools = Get-ConfigValue $config "toolchain.sca" @()
    if ($scaTools -and $scaTools.Count -gt 0) {
        foreach ($tool in $scaTools) {
            if ($tool.enabled -eq $true) {
                Invoke-Tool $tool $workingDir $outputPath "sca" $timestampFormat $config
            }
        }
    } else {
        Write-Log "No SCA tools configured" "WARN"
    }
    
    # Step 5: SBOM Generation
    Write-Log "Step 5: SBOM Generation"
    $sbomTools = Get-ConfigValue $config "toolchain.sbom" @()
    if ($sbomTools -and $sbomTools.Count -gt 0) {
        foreach ($tool in $sbomTools) {
            if ($tool.enabled -eq $true) {
                Invoke-Tool $tool $workingDir $outputPath "sbom" $timestampFormat $config
            }
        }
    } else {
        Write-Log "No SBOM tools configured" "WARN"
    }
    
    # Step 6: Container Security (if applicable)
    Write-Log "Step 6: Container Security Analysis"
    $containerTools = Get-ConfigValue $config "toolchain.container_security" @()
    if ($containerTools -and $containerTools.Count -gt 0) {
        foreach ($tool in $containerTools) {
            if ($tool.enabled -eq $true) {
                Invoke-Tool $tool $workingDir $outputPath "container" $timestampFormat $config
            }
        }
    } else {
        Write-Log "No container security tools configured" "INFO"
    }
    
    # Generate summary report
    Generate-AuditReport $outputPath $config
    
    Write-Log "AI Code Audit Workflow completed successfully."
    Write-Log "Total errors encountered: $($Global:AuditErrors.Count)"
    
    if ($Global:AuditErrors.Count -gt 0) {
        Write-Log "Review the audit log and summary report for details on errors." "WARN"
    }
    
    # CI workflow auto-generation (based on configuration)
    # Source: Integrated by AI assistant; Timestamp: 2025-09-10 17:31:17Z 
    try {
        $repoRoot = Get-ConfigValue $config "project.repository.local_path" "./"
        if (Test-Path $repoRoot) { $repoRoot = Resolve-Path $repoRoot }
        
        $gaEnabled = Get-ConfigValue $config "integrations.ci_cd.github_actions.enabled" $false
        $gaAuto    = Get-ConfigValue $config "integrations.ci_cd.github_actions.auto_generate" $false
        # Legacy CI provider retrieval note removed by AI assistant on 2025-09-10 10:12:29Z (UTC) — Source: automated doc cleanup
        $jkEnabled = Get-ConfigValue $config "integrations.ci_cd.jenkins.enabled" $false
        $jkAuto    = Get-ConfigValue $config "integrations.ci_cd.jenkins.auto_generate" $false

        if (($gaEnabled -and $gaAuto) -or ($jkEnabled -and $jkAuto)) {
            Ensure-AuditScript -RepoRoot $repoRoot -Config $config
        }
        if ($gaEnabled -and $gaAuto) { Generate-GitHubActionsWorkflow -RepoRoot $repoRoot -Config $config }
        # Legacy CI pipeline generation note removed by AI assistant on 2025-09-10 10:12:29Z (UTC) — Source: automated doc cleanup
        if ($jkEnabled -and $jkAuto) { Generate-Jenkinsfile -RepoRoot $repoRoot -Config $config }
    } catch {
        Write-Log "CI workflow generation failed: $($_.Exception.Message)" "WARN" 
    }
}

# --- CI Integration Helpers ---
# Source: Generated by AI assistant for CI/CD integrations
# Timestamp: 2025-09-10 17:31:17Z (Asia/Shanghai)
function Extract-PowerShellFromMarkdown {
    param(
        [string]$MarkdownPath = ".trae\\rules\\project_rules.md",
        [Parameter(Mandatory=$true)] [string]$OutFilePath
    )
    try {
        $possiblePaths = @(
            $MarkdownPath,
            "d:\\codes\\onlinestore\\.trae\\rules\\project_rules.md",
            ".\\project_rules.md",
            "project_rules.md"
        )
        $found = $null
        foreach ($p in $possiblePaths) { if (Test-Path $p) { $found = $p; break } }
        if (-not $found) { throw "project_rules.md not found" }
        
        $content = Get-Content -Path $found -Raw -Encoding UTF8
        $psRegex = [regex]'(?ms)```powershell\s*\n(.*?)\n```'
        $m = $psRegex.Match($content)
        if (-not $m.Success) { throw "PowerShell code block not found in $found" }
        
        $code = $m.Groups[1].Value
        $header = @(
            "# Start-Audit.ps1 (extracted from project_rules.md)",
            "# Source: d:/codes/onlinestore/.trae/rules/project_rules.md",
            "# Generated: $(Get-Date -Format o) by AI assistant",
            "# NOTE: Do not edit manually; update project_rules.md instead.",
            ""
        ) -join "`n"
        
        $dir = Split-Path -Path $OutFilePath -Parent
        if ($dir -and -not (Test-Path $dir)) { New-Item -Path $dir -ItemType Directory -Force | Out-Null }
        Set-Content -Path $OutFilePath -Value ($header + $code) -Encoding UTF8
        Write-Log "Extracted PowerShell script to '$OutFilePath'"
    } catch {
        Write-Log "Failed to extract PowerShell from markdown: $($_.Exception.Message)" "WARN"
    }
}

function Ensure-AuditScript {
    param(
        [Parameter(Mandatory=$true)] [string]$RepoRoot,
        [Parameter(Mandatory=$true)] $Config,
        [string]$MarkdownPath = ".trae\\rules\\project_rules.md"
    )
    try {
        $scriptRel = "scripts/Start-Audit.ps1"
        $scriptPath = Join-Path $RepoRoot $scriptRel
        Extract-PowerShellFromMarkdown -MarkdownPath $MarkdownPath -OutFilePath $scriptPath
    } catch {
        Write-Log "Failed to ensure audit script: $($_.Exception.Message)" "WARN"
    }
}

function Generate-GitHubActionsWorkflow {
    param(
        [Parameter(Mandatory=$true)] [string]$RepoRoot,
        [Parameter(Mandatory=$true)] $Config
    )
    $gh = Get-ConfigValue $Config "integrations.ci_cd.github_actions" $null
    if (-not $gh -or -not $gh.enabled) { return }
    
    $workflowRel = Get-ConfigValue $Config "integrations.ci_cd.github_actions.workflow_file" ".github/workflows/audit.yml"
    $image = Get-ConfigValue $Config "integrations.ci_cd.github_actions.windows_image" "windows-latest"
    $nodeVersions = Get-ConfigValue $Config "integrations.ci_cd.github_actions.node_versions" @("20.x")
    $pushBranches = Get-ConfigValue $Config "integrations.ci_cd.github_actions.triggers.push_branches" @("main","master")
    $prBranches = Get-ConfigValue $Config "integrations.ci_cd.github_actions.triggers.pull_request_branches" @("*")

    $workflowPath = Join-Path $RepoRoot $workflowRel
    $wfDir = Split-Path -Path $workflowPath -Parent
    if (-not (Test-Path $wfDir)) { New-Item -Path $wfDir -ItemType Directory -Force | Out-Null }

    $pushBranchesYaml = ($pushBranches -join ", ")
    $prBranchesYaml = ($prBranches -join ", ")
    $nodeVer = $nodeVersions[0]

    $wf = @(
        "# AI Code Audit GitHub Actions Workflow",
        "# Source: Generated from project_rules.md by AI assistant",
        "# Generated: $(Get-Date -Format o)",
        "name: AI Code Audit",
        "on:",
        "  push:",
        "    branches: [ $pushBranchesYaml ]",
        "  pull_request:",
        "    branches: [ $prBranchesYaml ]",
        "permissions:",
        "  contents: read",
        "  actions: read",
        "  security-events: write",
        "jobs:",
        "  audit:",
        "    runs-on: $image",
        "    steps:",
        "      - uses: actions/checkout@v4",
        "      - name: Setup Node.js",
        "        if: hashFiles('**/package.json') != ''",
        "        uses: actions/setup-node@v4",
        "        with:",
        "          node-version: $nodeVer",
        "          cache: 'npm'",
        "      - name: Run AI Code Audit",
        "        shell: pwsh",
        "        run: ./scripts/Start-Audit.ps1",
        "      - name: Upload SARIF to GitHub Security",
        "        if: hashFiles('audit-reports/*.sarif') != ''",
        "        uses: github/codeql-action/upload-sarif@v3",
        "        with:",
        "          sarif_file: audit-reports/",
        "      - name: Upload audit artifacts",
        "        if: always()",
        "        uses: actions/upload-artifact@v4",
        "        with:",
        "          name: audit-reports",
        "          path: |",
        "            audit-reports/**",
        "            audit-run.log"
    ) -join "`n"

    Set-Content -Path $workflowPath -Value $wf -Encoding UTF8
    Write-Log "Generated GitHub Actions workflow at '$workflowPath'"
}

# Legacy CI pipeline generator note removed by AI assistant on 2025-09-10 10:12:29Z (UTC) — Source: automated doc cleanup
function Generate-Jenkinsfile {
    param(
        [Parameter(Mandatory=$true)] [string]$RepoRoot,
        [Parameter(Mandatory=$true)] $Config
    )
    $jk = Get-ConfigValue $Config "integrations.ci_cd.jenkins" $null
    if (-not $jk -or -not $jk.enabled) { return }
    
    $jenkinsRel = Get-ConfigValue $Config "integrations.ci_cd.jenkins.jenkinsfile_path" "Jenkinsfile"
    $jenkinsPath = Join-Path $RepoRoot $jenkinsRel

    $jf = @(
        "// AI Code Audit Jenkins Pipeline",
        "// Source: Generated from project_rules.md by AI assistant",
        "// Generated: $(Get-Date -Format o)",
        "pipeline {",
        "  agent any",
        "  options {",
        "    timeout(time: 1, unit: 'HOURS')",
        "    retry(1)",
        "  }",
        "  environment {",
        "    AUDIT_PROFILE = 'balanced'",
        "  }",
        "  stages {",
        "    stage('Setup') {",
        "      steps {",
        "        script {",
        "          if (fileExists('package.json')) {",
        "            bat 'npm install'",
        "          }",
        "        }",
        "      }",
        "    }",
        "    stage('Security Audit') {",
        "      steps {",
        "        bat 'powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\Start-Audit.ps1'",
        "      }",
        "    }",
        "  }",
        "  post {",
        "    always {",
        "      archiveArtifacts artifacts: 'audit-reports/**, audit-run.log', fingerprint: false, allowEmptyArchive: true",
        "    }",
        "  }",
        "}"
    ) -join "`n"

    $dir = Split-Path -Path $jenkinsPath -Parent
    if ($dir -and -not (Test-Path $dir)) { New-Item -Path $dir -ItemType Directory -Force | Out-Null }
    Set-Content -Path $jenkinsPath -Value $jf -Encoding UTF8
    Write-Log "Generated Jenkinsfile at '$jenkinsPath'"
}

# Entry point
Start-Audit
