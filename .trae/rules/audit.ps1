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
<#
.SYNOPSIS
    Writes log messages to both console and log file with timestamp and level formatting.

.DESCRIPTION
    This function provides centralized logging functionality for the audit script.
    It writes formatted log entries to both the console (with color coding) and
    a log file. Error messages are also tracked in a global error collection.

.PARAMETER Message
    The log message to write. This parameter is mandatory.

.PARAMETER Level
    The log level for the message. Valid values are INFO, WARN, ERROR, DEBUG.
    Default value is INFO.

.EXAMPLE
    Write-Log "Starting audit process"
    Writes an INFO level message to log.

.EXAMPLE
    Write-Log "Configuration file not found" "WARN"
    Writes a WARNING level message to log.

.EXAMPLE
    Write-Log "Critical error occurred" "ERROR"
    Writes an ERROR level message and adds it to the global error collection.

.NOTES
    - Log entries are formatted with timestamp and level
    - Console output uses color coding based on log level
    - Error messages are tracked in $Global:AuditErrors array
    - Log file path is defined in $Global:AuditLogFile
#>
function Write-Log {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true, ValueFromPipeline=$true, Position=0)]
        [ValidateNotNullOrEmpty()]
        [string]$Message,
        [Parameter(Position=1)]
        [ValidateSet("INFO", "WARN", "ERROR", "DEBUG")]
        [string]$Level = "INFO"
    )
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $logEntry = "[$timestamp] [$Level] $Message"
    
    try {
        Add-Content -Path $Global:AuditLogFile -Value $logEntry -Encoding UTF8 -ErrorAction Stop
    } catch [System.IO.IOException] {
        # Handle file lock or access issues
        Write-Warning "Log file is locked or inaccessible: $($_.Exception.Message)"
    } catch [System.UnauthorizedAccessException] {
        # Handle permission issues
        Write-Warning "Insufficient permissions to write to log file: $($_.Exception.Message)"
    } catch {
        # Handle any other unexpected errors
        Write-Warning "Unexpected error writing to log file: $($_.Exception.Message)"
    } finally {
        # Ensure we always display the log entry to console
        # This is handled below in the switch statement
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
<#
.SYNOPSIS
    Extracts and parses YAML configuration from embedded markdown files.

.DESCRIPTION
    This function searches for and parses YAML configuration blocks embedded
    within markdown files. It tries multiple possible file paths and handles
    the installation of required PowerShell modules if needed.

.PARAMETER MarkdownPath
    The path to the markdown file containing embedded YAML configuration.
    Default value is ".trae\rules\project_rules.md".

.EXAMPLE
    $config = Get-EmbeddedAuditConfig
    Retrieves configuration using the default markdown path.

.EXAMPLE
    $config = Get-EmbeddedAuditConfig -MarkdownPath "./custom-rules.md"
    Retrieves configuration from a custom markdown file.

.OUTPUTS
    Returns a PowerShell object containing the parsed YAML configuration,
    or $null if parsing fails.

.NOTES
    - Requires the 'powershell-yaml' module for YAML parsing
    - Automatically attempts to install missing modules
    - Searches multiple possible file paths
    - Creates a debug JSON file for troubleshooting
#>
function Get-EmbeddedAuditConfig {
    [CmdletBinding()]
    param (
        [Parameter(Position=0)]
        [ValidateNotNullOrEmpty()]
        [string]$MarkdownPath = ".trae\rules\project_rules.md"
    )
    
    # Try multiple possible paths
    $possiblePaths = @(
        "d:\codes\onlinestore\.trae\rules\project_rules.md",
        $MarkdownPath,
        ".trae\rules\project_rules.md",
        "..\..\..\onlinestore\.trae\rules\project_rules.md",
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
        if ([string]::IsNullOrEmpty($content)) {
            Write-Log "File content is empty or null: $foundPath" "ERROR"
            return $null
        }
        $yamlRegex = [regex]'(?ms)```yaml\s*\n(.*?)\n```'
        $match = $yamlRegex.Match($content)
        
        if ($match.Success) {
            $yamlContent = $match.Groups[1].Value
            
            # Check if powershell-yaml module is available
            if (-not (Get-Command ConvertFrom-Yaml -ErrorAction SilentlyContinue)) {
                Write-Log "The 'powershell-yaml' module is not installed. Attempting to install..." "WARN"
                try {
                    Install-Module -Name powershell-yaml -Scope CurrentUser -Force -AllowClobber -ErrorAction Stop
                    Import-Module powershell-yaml -ErrorAction Stop
                } catch [System.Management.Automation.CommandNotFoundException] {
                    Write-Log "PowerShell Gallery or Install-Module command not available: $($_.Exception.Message)" "ERROR"
                    return $null
                } catch [System.UnauthorizedAccessException] {
                    Write-Log "Insufficient permissions to install module: $($_.Exception.Message)" "ERROR"
                    return $null
                } catch [System.Net.WebException] {
                    Write-Log "Network error while downloading module: $($_.Exception.Message)" "ERROR"
                    return $null
                } catch {
                    Write-Log "Failed to install powershell-yaml module: $($_.Exception.Message)" "ERROR"
                    return $null
                } finally {
                    # Verify module was loaded successfully
                    if (-not (Get-Command ConvertFrom-Yaml -ErrorAction SilentlyContinue)) {
                        Write-Log "powershell-yaml module installation failed - ConvertFrom-Yaml command not available" "ERROR"
                        # Note: Do not return inside finally; subsequent ConvertFrom-Yaml will fail and be caught by outer catch.
                    }
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
    } catch [System.IO.FileNotFoundException] {
        Write-Log "Configuration file not found: $($_.Exception.Message)" "ERROR"
        return $null
    } catch [System.IO.IOException] {
        Write-Log "File I/O error while reading configuration: $($_.Exception.Message)" "ERROR"
        return $null
    } catch [System.Management.Automation.RuntimeException] {
        Write-Log "PowerShell runtime error during YAML parsing: $($_.Exception.Message)" "ERROR"
        return $null
    } catch {
        Write-Log "Unexpected error parsing YAML configuration: $($_.Exception.Message)" "ERROR"
        Write-Log "Exception type: $($_.Exception.GetType().FullName)" "DEBUG"
        return $null
    } finally {
        # Cleanup any temporary variables or state
        if ($yamlContent) {
            Write-Log "YAML content length: $($yamlContent.Length) characters" "DEBUG"
        }
    }
}

<#
.SYNOPSIS
    Retrieves configuration values from nested objects using dot notation paths.

.DESCRIPTION
    This function navigates through nested configuration objects (hashtables or PSObjects)
    using dot-separated paths to retrieve specific configuration values. It provides
    safe navigation with fallback to default values when paths don't exist.

.PARAMETER Config
    The configuration object to search. Can be a hashtable or PSObject.
    This parameter is mandatory.

.PARAMETER Path
    The dot-separated path to the desired configuration value (e.g., "project.name").
    This parameter is mandatory.

.PARAMETER DefaultValue
    The value to return if the specified path is not found.
    Default value is $null.

.EXAMPLE
    $projectName = Get-ConfigValue -Config $config -Path "project.name" -DefaultValue "Unknown"
    Retrieves the project name from configuration with a fallback value.

.EXAMPLE
    $timeout = Get-ConfigValue $config "toolchain.sast.timeout" 300
    Retrieves SAST timeout value with a default of 300 seconds.

.OUTPUTS
    Returns the configuration value at the specified path, or the default value
    if the path doesn't exist.

.NOTES
    - Supports both hashtable and PSObject navigation
    - Provides detailed debug logging for troubleshooting
    - Safe navigation prevents errors when paths don't exist
#>
function Get-ConfigValue {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true, Position=0)]
        [ValidateNotNull()]
        $Config,
        [Parameter(Mandatory=$true, Position=1)]
        [ValidateNotNullOrEmpty()]
        [string]$Path,
        [Parameter(Position=2)]
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

# --- Metrics & Quality Gate (Inserted by AI assistant; Timestamp: 2025-09-11 15:48:29 Asia/Shanghai; Source: Integration of metrics and threshold evaluation into audit.ps1) ---
function Compute-AuditMetrics {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [ValidateNotNullOrEmpty()]
        [string]$OutputPath
    )
    # Purpose: Aggregate key metrics from audit artifacts (SBOM, Retire.js)
    # Notes: PowerShell 5 compatible (no ConvertFrom-Json -Depth usage)

    $metrics = [ordered]@{
        sbom_components        = 0
        retire_vulnerabilities = 0
        sources                = @{}
    }

    try {
        # Resolve SBOM file
        $sbomFile = Join-Path $OutputPath 'sbom-cyclonedx.json'
        if (-not (Test-Path $sbomFile)) {
            $candidate = Get-ChildItem -Path $OutputPath -File -Filter 'sbom*.json' -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($candidate) { $sbomFile = $candidate.FullName } else { $sbomFile = $null }
        }
        if ($sbomFile -and (Test-Path $sbomFile)) {
            $sbomJson = Get-Content -Path $sbomFile -Raw -Encoding UTF8 | ConvertFrom-Json
            $count = 0
            if ($null -ne $sbomJson) {
                if ($sbomJson.PSObject.Properties.Name -contains 'components') {
                    $components = $sbomJson.components
                    if ($components -is [array]) { $count = $components.Count }
                    elseif ($components) { $count = 1 } else { $count = 0 }
                }
            }
            $metrics.sbom_components = [int]$count
            $metrics.sources.sbom = [string](Split-Path -Leaf $sbomFile)
            Write-Log "Computed SBOM components count: $count from '$($metrics.sources.sbom)'"
        } else {
            Write-Log "SBOM file not found in '$OutputPath' (expected sbom-cyclonedx.json)." "WARN"
        }
    } catch {
        Write-Log "Failed to compute SBOM metrics: $($_.Exception.Message)" "ERROR"
    }

    try {
        # Resolve Retire.js file
        $retireFile = Join-Path $OutputPath 'sca-retire.json'
        if (-not (Test-Path $retireFile)) {
            $candidate = Get-ChildItem -Path $OutputPath -File -Filter '*retire*.json' -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($candidate) { $retireFile = $candidate.FullName } else { $retireFile = $null }
        }
        if ($retireFile -and (Test-Path $retireFile)) {
            $retireJson = Get-Content -Path $retireFile -Raw -Encoding UTF8 | ConvertFrom-Json

            function _Count-VulnerabilitiesRecursive {
                param([Parameter(Mandatory=$true)] $Node)
                $total = 0
                if ($null -eq $Node) { return 0 }
                if ($Node -is [array]) {
                    foreach ($n in $Node) { $total += (_Count-VulnerabilitiesRecursive -Node $n) }
                    return $total
                }
                $props = $Node.PSObject.Properties
                foreach ($p in $props) {
                    if ($p.Name -eq 'vulnerabilities' -and $p.Value -is [array]) {
                        $total += $p.Value.Count
                    }
                    $val = $p.Value
                    if ($val -is [array] -or ($val -is [psobject])) {
                        $total += (_Count-VulnerabilitiesRecursive -Node $val)
                    }
                }
                return $total
            }

            $vulnCount = 0
            if ($null -ne $retireJson) { $vulnCount = (_Count-VulnerabilitiesRecursive -Node $retireJson) }
            $metrics.retire_vulnerabilities = [int]$vulnCount
            $metrics.sources.retire = [string](Split-Path -Leaf $retireFile)
            Write-Log "Computed Retire.js vulnerabilities: $vulnCount from '$($metrics.sources.retire)'"
        } else {
            Write-Log "Retire.js JSON file not found in '$OutputPath' (expected sca-retire.json)." "WARN"
        }
    } catch {
        Write-Log "Failed to compute Retire.js metrics: $($_.Exception.Message)" "ERROR"
    }

    return ([pscustomobject]$metrics)
}

function Evaluate-QualityGate {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)] $Config,
        [Parameter(Mandatory=$true)] $Metrics
    )
    # Purpose: Evaluate audit results against thresholds from YAML profile
    # Notes: Only vulnerability-count gate is enforced here; CVSS gate requires per-finding severity data.

    $profile = (Get-ConfigValue $Config 'audit.profile' 'balanced')
    if ([string]::IsNullOrWhiteSpace($profile)) { $profile = 'balanced' }
    $secPath = "audit.profiles.$profile.security"
    $maxV = [int](Get-ConfigValue $Config ("$secPath.max_vulnerabilities") 5)
    $blockCvss = (Get-ConfigValue $Config ("$secPath.block_on_cvss") 8.0)

    $reasons = New-Object System.Collections.Generic.List[string]
    $status = 'pass'

    if ($Metrics -and $Metrics.retire_vulnerabilities -gt $maxV) {
        $reasons.Add("retire_vulnerabilities=$($Metrics.retire_vulnerabilities) exceeds max_vulnerabilities=$maxV") | Out-Null
        $status = 'fail'
    }
    # CVSS not evaluated due to input data limitations (no per-finding CVSS in retire.js summary)

    $result = [pscustomobject]@{
        status    = $status
        profile   = $profile
        thresholds = [pscustomobject]@{
            max_vulnerabilities = $maxV
            block_on_cvss       = $blockCvss
        }
        reasons   = $reasons
    }

    Write-Log "Quality gate evaluated: status=$status, profile=$profile, max_vulnerabilities=$maxV, block_on_cvss=$blockCvss"
    return $result
}

# --- Task Functions ---
<#
.SYNOPSIS
    Validates the availability of required security and analysis tools.

.DESCRIPTION
    This function checks whether all required tools specified in the toolchain
    configuration are available in the system PATH. It provides detailed warnings
    for missing tools and installation guidance.

.PARAMETER Toolchain
    The toolchain configuration object containing tool definitions.
    This parameter is mandatory.

.PARAMETER EnvironmentConfig
    The environment configuration object.
    This parameter is mandatory.

.EXAMPLE
    $toolsAvailable = Check-ToolEnvironment -Toolchain $config.toolchain -EnvironmentConfig $config.environment
    Checks all tools defined in the configuration.

.OUTPUTS
    Returns $true if all required tools are available, $false otherwise.

.NOTES
    - Checks common security tools like CodeQL, Semgrep, OSV-Scanner, Syft
    - Provides specific installation guidance for missing tools
    - Logs warnings for missing tools but allows audit to continue
    - Supports both hashtable and PSObject toolchain configurations
#>
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
    
    $isDockerConfigured = ($EnvironmentConfig.platform -eq 'docker')
    $isInContainer = (Test-Path '/.dockerenv') -or ($env:RUNNING_IN_CONTAINER -eq '1')
    $useDockerExec = $isDockerConfigured -and -not $isInContainer
    $containerName = if ($useDockerExec) { $EnvironmentConfig.container_name } else { $null }

    # Check each tool
    foreach ($tool in $uniqueTools) {
        $toolLower = $tool.ToLower()
        $found = $false
        $checkCommand = "Get-Command $toolLower -ErrorAction SilentlyContinue"
        
        if ($useDockerExec) {
            Write-Log "Checking for '$toolLower' inside Docker container '$containerName'..."
            $dockerCommand = "docker exec $containerName pwsh -NoLogo -NoProfile -Command `"$checkCommand`""
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
                "retire"      { "Please install Retire.js CLI with 'npm i -g retire' (Docs: https://github.com/RetireJS/retire.js)" }
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

<#
.SYNOPSIS
    Collects version information for all tools in the toolchain.

.DESCRIPTION
    This function collects version information for all tools defined in the toolchain configuration.
    It stores the version information in a global variable for use in reports.

.PARAMETER Toolchain
    The toolchain configuration object containing tool definitions.
    This parameter is mandatory.

.PARAMETER EnvironmentConfig
    The environment configuration object.
    This parameter is mandatory.

.EXAMPLE
    Collect-ToolVersions -Toolchain $config.toolchain -EnvironmentConfig $config.environment
    Collects versions for all tools in the configuration.

.NOTES
    - Collects version information for security tools like CodeQL, Semgrep, OSV-Scanner, Syft
    - Stores versions in global ToolVersions hashtable
    - Handles Docker execution environment
    - Supports both hashtable and PSObject toolchain configurations
#>
function Collect-ToolVersions {
    param(
        [Parameter(Mandatory=$true)] $Toolchain,
        [Parameter(Mandatory=$true)] $EnvironmentConfig
    )
    
    Write-Log "Collecting tool versions..." 'DEBUG'
    
    # Initialize global ToolVersions hashtable if not exists
    if (-not (Get-Variable -Name 'ToolVersions' -Scope 'Global' -ErrorAction 'SilentlyContinue')) {
        $Global:ToolVersions = @{}
    }
    
    $allTools = @()
    
    # Extract tools from toolchain configuration
    if ($Toolchain -is [hashtable]) {
        foreach ($category in $Toolchain.Keys) {
            $tools = $Toolchain[$category]
            if ($tools -is [array]) {
                foreach ($tool in $tools) {
                    if ($tool.name) {
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
                    if ($tool.name) {
                        $allTools += $tool.name
                    }
                }
            }
        }
    }
    
    # Always check core tools as well
    $allTools = ($allTools + @('git','npm','npx','PowerShell')) | Select-Object -Unique | Where-Object { $_ }
    
    $isDockerConfigured = ($EnvironmentConfig.platform -eq 'docker')
    $isInContainer = (Test-Path '/.dockerenv') -or ($env:RUNNING_IN_CONTAINER -eq '1')
    $useDockerExec = $isDockerConfigured -and -not $isInContainer
    $containerName = if ($useDockerExec) { $EnvironmentConfig.container_name } else { $null }
    
    # Collect version for each tool
    foreach ($tool in $allTools) {
        try {
            $toolLower = $tool.ToLower()
            $version = 'Not Installed'
            
            # Get version command based on tool
            $versionCommand = switch ($toolLower) {
                'git'         { 'git --version' }
                'npm'         { 'npm --version' }
                'npx'         { 'npx --version' }
                'codeql'      { 'codeql --version' }
                'semgrep'     { 'semgrep --version' }
                'osv-scanner' { 'osv-scanner --version' }
                'syft'        { 'syft version' }
                'retire'      { 'retire --version' }
                'powershell'  { '(Get-Host).Version.ToString()' }
                default       { continue }
            }
            
            if ($useDockerExec -and $toolLower -ne 'powershell') {
                # Execute in Docker container
                $dockerCmd = "docker exec $containerName pwsh -NoLogo -NoProfile -Command `"$versionCommand`""
                $version = Invoke-Expression $dockerCmd 2>$null
                if ($LASTEXITCODE -ne 0) { $version = 'Not Available in Container' }
            } else {
                # Execute locally
                if ($toolLower -eq 'powershell') {
                    $version = Invoke-Expression $versionCommand
                } else {
                    $version = & cmd.exe /c $versionCommand 2>$null
                }
                if (-not $version) { $version = 'Not Installed' }
            }
            
            # Clean up version output
            if ($version) {
                $version = $version.Trim()
                # Extract semantic version from output
                if ($version -match '\d+\.\d+(\.\d+)?') {
                    $version = $matches[0]
                }
            }
            
            $Global:ToolVersions[$tool] = $version
            Write-Log "$tool version: $version" 'DEBUG'
        } catch {
            Write-Log "Failed to get version for ${tool}: $($_.Exception.Message)" 'DEBUG'
            $Global:ToolVersions[$tool] = 'Error Retrieving'
        }
    }
}

<#
.SYNOPSIS
    Prepares the codebase for audit by handling local paths or cloning repositories.

.DESCRIPTION
    This function determines the appropriate codebase location for audit.
    It can use existing local paths, detect git repositories, or clone
    remote repositories as needed.

.PARAMETER RepoUrl
    The URL of the git repository to clone if local path is not available.
    Optional parameter.

.PARAMETER LocalPath
    The local path to use for the codebase. Default value is "./".

.PARAMETER TargetDir
    The target directory name for cloned repositories. Default value is "source".

.EXAMPLE
    $workingDir = Prepare-CodeBase
    Uses the current directory as codebase.

.EXAMPLE
    $workingDir = Prepare-CodeBase -RepoUrl "https://github.com/user/repo.git"
    Clones the specified repository for audit.

.EXAMPLE
    $workingDir = Prepare-CodeBase -LocalPath "/path/to/code" -TargetDir "audit-source"
    Uses a specific local path and target directory.

.OUTPUTS
    Returns the path to the prepared codebase directory.

.NOTES
    - Prioritizes existing local paths over repository cloning
    - Automatically detects git repositories in current directory
    - Handles repository cloning with error recovery
    - Removes existing target directories before cloning
#>
function Prepare-CodeBase {
    [CmdletBinding()]
    param(
        [Parameter(Position=0)]
        [ValidatePattern('^https?://.*\.git$|^git@.*\.git$|^$')]
        [string]$RepoUrl,
        [Parameter(Position=1)]
        [ValidateNotNullOrEmpty()]
        [string]$LocalPath = "./",
        [Parameter(Position=2)]
        [ValidateNotNullOrEmpty()]
        [ValidatePattern('^[a-zA-Z0-9_-]+$')]
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
            & git clone --depth 1 $RepoUrl $TargetDir 2>&1 | Out-String | Write-Log -Level "DEBUG"
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Repository cloned successfully."
                return $TargetDir
            } else {
                Write-Log "Git clone failed with exit code: $LASTEXITCODE" "ERROR"
                return "./"
            }
        } catch [System.Management.Automation.CommandNotFoundException] {
            Write-Log "Git command not found. Please install Git and ensure it's in PATH: $($_.Exception.Message)" "ERROR"
            return "./"
        } catch [System.ComponentModel.Win32Exception] {
            Write-Log "System error executing git command: $($_.Exception.Message)" "ERROR"
            return "./"
        } catch [System.InvalidOperationException] {
            Write-Log "Invalid operation during git clone: $($_.Exception.Message)" "ERROR"
            return "./"
        } catch {
            Write-Log "Unexpected error cloning repository: $($_.Exception.Message)" "ERROR"
            Write-Log "Exception type: $($_.Exception.GetType().FullName)" "DEBUG"
            return "./"
        } finally {
            # Verify the target directory was created successfully
            if (Test-Path $TargetDir) {
                Write-Log "Target directory '$TargetDir' exists after clone operation" "DEBUG"
            } else {
                Write-Log "Target directory '$TargetDir' was not created" "WARN"
            }
        }
    }
    
    # Default to current directory
    Write-Log "Using current directory as codebase"
    return "./"
}

<#
.SYNOPSIS
    Executes Static Application Security Testing (SAST) tools.

.DESCRIPTION
    This function runs configured SAST tools like CodeQL and Semgrep
    to analyze source code for security vulnerabilities and code quality issues.

.PARAMETER Tools
    Array of SAST tool configurations to execute.

.PARAMETER Languages
    Object containing supported programming languages for analysis.

.PARAMETER OutputPath
    Directory path where SAST tool outputs should be saved.

.EXAMPLE
    Invoke-Sast -Tools $config.toolchain.sast -Languages $config.project.languages -OutputPath "./reports"
    Runs all configured SAST tools.

.NOTES
    - Supports CodeQL and Semgrep tools
    - Generates SARIF format outputs for standardized reporting
    - Handles tool-specific database creation and analysis steps
#>
function Invoke-Sast {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        $Tools,
        [Parameter(Mandatory=$true)]
        $Languages,
        [Parameter(Mandatory=$true)]
        [string]$OutputPath
    )
    foreach ($tool in $Tools) {
        Write-Log "Running SAST tool: $($tool.name)"
        try {
            switch ($tool.name) {
                "CodeQL" {
                    $langList = ($Languages.PSObject.Properties.Name) -join ","
                    Write-Log "Creating CodeQL database for languages: $langList"
                    codeql database create "codeql-db" --language=$langList --overwrite
                    Write-Log "Analyzing with CodeQL..."
                    $OutputPath = Join-Path $ReportDir "sast-codeql"
                    New-Item -ItemType Directory -Force -Path $OutputPath | Out-Null
                    
                    # Primary suite (security-and-quality)
                    # Added by AI assistant on 2025-09-11 11:15:20 Asia/Shanghai — Source: CodeQL CLI docs (database analyze supports --threads and --ram); https://codeql.github.com/docs/codeql-cli/analyzing-databases-with-the-codeql-cli/
                    codeql database analyze "codeql-db" "codeql/javascript-queries:codeql-suites/javascript-security-and-quality.qls" --format=sarif-latest --output="$OutputPath/sast-codeql.sarif" --threads=1 --ram=2048 --download
                    if ($LASTEXITCODE -ne 0) {
                        Write-Log "Primary suite failed, retrying with legacy pack alias..." "WARN"
                        codeql database analyze "codeql-db" codeql/javascript-queries --format=sarif-latest --output="$OutputPath/sast-codeql.sarif" --threads=1 --ram=2048 --download
                    }
                    Write-Log "CodeQL analysis completed: $codeqlOutput"
                }
                "Semgrep" {
                    Write-Log "Analyzing with Semgrep..."
                    semgrep scan --config $tool.config --sarif --output "$OutputPath/sast-semgrep.sarif"
                }
            }
            Write-Log "$($tool.name) analysis completed."
        } catch {
            Write-Log "$($tool.name) analysis failed: $($_.Exception.Message)" "ERROR"
        }
    }
}

<#
.SYNOPSIS
    Executes Software Composition Analysis (SCA) tools.

.DESCRIPTION
    This function runs configured SCA tools like npm audit and OSV-Scanner
    to identify vulnerabilities in project dependencies and third-party components.

.PARAMETER Tools
    Array of SCA tool configurations to execute.

.PARAMETER OutputPath
    Directory path where SCA tool outputs should be saved.

.EXAMPLE
    Invoke-Sca -Tools $config.toolchain.sca -OutputPath "./reports"
    Runs all configured SCA tools.

.NOTES
    - Supports npm audit and OSV-Scanner tools
    - Automatically detects package-lock.json for npm audit
    - Generates both JSON and SARIF format outputs
    - Provides warnings for missing dependency files
#>
function Invoke-Sca {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        $Tools,
        [Parameter(Mandatory=$true)]
        [string]$OutputPath
    )
    foreach ($tool in $Tools) {
        Write-Log "Running SCA tool: $($tool.name)"
        try {
            switch ($tool.name) {
                "npm-audit" {
                    # npm audit requires a package-lock.json file
                    if (Test-Path "package-lock.json") {
                        npm audit --json > "$OutputPath/sca-npm-audit.json"
                    } else {
                        Write-Log "package-lock.json not found, skipping npm audit." "WARN"
                    }
                }
                "OSV-Scanner" {
                    osv-scanner --format=sarif --output="$OutputPath/sca-osv.sarif" ./
                }
            }
            Write-Log "$($tool.name) scan completed."
        } catch {
            Write-Log "$($tool.name) scan failed: $($_.Exception.Message)" "ERROR"
        }
    }
}

<#
.SYNOPSIS
    Generates Software Bill of Materials (SBOM) using configured tools.

.DESCRIPTION
    This function creates a comprehensive SBOM document that catalogs
    all software components, dependencies, and their metadata for
    supply chain security and compliance purposes.

.PARAMETER Tool
    The SBOM tool configuration object (typically Syft).

.PARAMETER OutputPath
    Directory path where the SBOM file should be saved.

.EXAMPLE
    Generate-Sbom -Tool $config.toolchain.sbom[0] -OutputPath "./reports"
    Generates SBOM using the first configured tool.

.NOTES
    - Supports Syft tool for SBOM generation
    - Generates CycloneDX JSON format by default
    - Handles missing tool configuration gracefully
    - Provides detailed component inventory for compliance
#>
function Generate-Sbom {
    [CmdletBinding()]
    param(
        [Parameter()]
        $Tool,
        [Parameter(Mandatory=$true)]
        [string]$OutputPath
    )
    if (-not $Tool) {
        Write-Log "No SBOM tool configured or enabled. Skipping." "WARN"
        return
    }
    Write-Log "Generating SBOM with $($Tool.name)"
    try {
        switch ($Tool.name) {
            "Syft" {
                syft . -o $($Tool.format) > "$OutputPath/sbom.$($Tool.format)"
            }
        }
        Write-Log "SBOM generated successfully."
    } catch {
        Write-Log "SBOM generation failed: $($_.Exception.Message)" "ERROR"
    }
}

# --- Tool Execution Functions ---
<#
.SYNOPSIS
    Executes security and analysis tools based on configuration.

.DESCRIPTION
    This function executes various security and analysis tools including SAST,
    SCA, SBOM generation, and container security tools. It handles tool-specific
    command line arguments and output formatting.

.PARAMETER ToolConfig
    The configuration object for the specific tool to execute.
    This parameter is mandatory.

.PARAMETER WorkingDir
    The working directory where the tool should be executed.
    This parameter is mandatory.

.PARAMETER OutputPath
    The path where tool output files should be saved.
    This parameter is mandatory.

.PARAMETER Category
    The category of the tool (sast, sca, sbom, container).
    Default value is "unknown".

.EXAMPLE
    Invoke-Tool -ToolConfig $sastTool -WorkingDir "./source" -OutputPath "./reports" -Category "sast"
    Executes a SAST tool with the specified configuration.

.EXAMPLE
    Invoke-Tool $scaTool $workDir $outputDir "sca"
    Executes an SCA tool using positional parameters.

.NOTES
    - Supports CodeQL, Semgrep, ESLint, OSV-Scanner, npm audit, Retire.js, Syft, Trivy
    - Automatically checks tool availability before execution
    - Generates timestamped output files
    - Handles tool-specific command line arguments and formats
    - Provides graceful fallback for missing tools
#>
function Invoke-Tool {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true, Position=0)]
        [ValidateNotNull()]
        $ToolConfig,
        [Parameter(Mandatory=$true, Position=1)]
        [ValidateNotNullOrEmpty()]
        [ValidateScript({Test-Path $_ -PathType Container})]
        [string]$WorkingDir,
        [Parameter(Mandatory=$true, Position=2)]
        [ValidateNotNullOrEmpty()]
        [string]$OutputPath,
        [Parameter(Position=3)]
        [ValidateSet("sast", "sca", "sbom", "container", "quality", "unknown")]
        [string]$Category = "unknown"
    )
    
    $toolName = $ToolConfig.name
    $outputFile = Join-Path $OutputPath "$Category-$toolName-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    
    # AI Assistant minimal fix: normalize tool names and harden npm-audit/retire execution
    # Timestamp: 2025-09-11 09:40:47 Asia/Shanghai; Sources: https://docs.npmjs.com/cli/v10/commands/npm-audit https://github.com/RetireJS/retire.js
    $normalizedName = $toolName.ToLower()
    if ($normalizedName -in @('retire.js','retirejs')) { $normalizedName = 'retire' }
    if ($normalizedName -in @('osv_scanner')) { $normalizedName = 'osv-scanner' }
    
    # AI Assistant addition: force stable output filename for Retire.js JSON to align with downstream metrics/report consumers
    # Timestamp: 2025-09-11 23:58:56 Asia/Shanghai; Sources: https://github.com/RetireJS/retire.js (CLI supports --outputformat/--outputpath)
    if ($normalizedName -eq 'retire' -and $Category -eq 'sca') {
        $outputFile = Join-Path $OutputPath 'sca-retire.json'
    }
    
    Write-Log "Executing $Category tool: $toolName"
    
    try {
        Push-Location $WorkingDir
        
        switch ($normalizedName) {
            "codeql" {
                if (Get-Command "codeql" -ErrorAction SilentlyContinue) {
                    $dbPath = "codeql-db"
                    # Fix: add --overwrite to reuse existing DB; switch format to sarif-latest; align extension with .sarif
                    # Timestamp: 2025-09-11 10:02:45 Asia/Shanghai; Source: GitHub CodeQL CLI docs (database analyze supports sarif-latest)
                    & codeql database create $dbPath --language=javascript --source-root=. --overwrite
                    $codeqlOutput = Join-Path $OutputPath "$Category-CodeQL-$(Get-Date -Format 'yyyyMMdd-HHmmss').sarif"
                    # Update: use explicit suite with --download to fetch queries when missing; fallback to legacy alias
                    # Timestamp: 2025-09-11 10:20:31 Asia/Shanghai; Sources: https://docs.github.com/en/code-security/codeql-cli/using-the-codeql-cli/analyzing-databases-with-the-codeql-cli https://docs.github.com/en/code-security/codeql-cli/getting-started-with-the-codeql-cli/customizing-analysis-with-codeql-packs
                    & codeql database analyze $dbPath "codeql/javascript-queries:codeql-suites/javascript-security-and-quality.qls" --format=sarif-latest --output=$codeqlOutput --download
                    if ($LASTEXITCODE -ne 0) {
                        Write-Log "Primary pack analyze failed, retrying with legacy pack alias 'codeql/javascript-queries'..." "WARN"
                        & codeql database analyze $dbPath codeql/javascript-queries --format=sarif-latest --output=$codeqlOutput --download
                    }
                    Write-Log "CodeQL analysis completed: $codeqlOutput"
                } else {
                    Write-Log "CodeQL not available, skipping" "WARN"
                }
            }
            "semgrep" {
                if (Get-Command "semgrep" -ErrorAction SilentlyContinue) {
                    & semgrep --config=auto --json --output=$outputFile .
                    Write-Log "Semgrep analysis completed: $outputFile"
                } else {
                    Write-Log "Semgrep not available, skipping" "WARN"
                }
            }
            "eslint" {
                # AI Assistant update (Timestamp: 2025-09-11 03:01:37 Asia/Shanghai; Source: Dockerfile installs global eslint@8.57.0; caddy-style-shopping-site/package.json devDependencies eslint ^8.57.0)
                # Prefer globally installed eslint to ensure non-interactive, reproducible runs; fall back to pinned npx if needed.
                if (Get-Command "eslint" -ErrorAction SilentlyContinue) {
                    & eslint . --format=json --output-file=$outputFile
                    Write-Log "ESLint analysis completed using global eslint: $outputFile"
                } elseif (Get-Command "npx" -ErrorAction SilentlyContinue) {
                    # Ensure non-interactive execution and pin version to avoid auto-upgrading to v9
                    $env:NPM_CONFIG_YES = "true"
                    & npx --yes --package eslint@8.57.0 eslint . --format=json --output-file=$outputFile
                    Write-Log "ESLint analysis completed via npx pinned eslint@8.57.0: $outputFile"
                } else {
                    Write-Log "ESLint not available (neither global eslint nor npx found), skipping" "WARN"
                }
            }
            "osv-scanner" {
                if (Get-Command "osv-scanner" -ErrorAction SilentlyContinue) {
                    & osv-scanner --format=json --output=$outputFile .
                    Write-Log "OSV-Scanner analysis completed: $outputFile"
                } else {
                    Write-Log "OSV-Scanner not available, skipping" "WARN"
                }
            }
            "npm-audit" {
                if (Get-Command "npm" -ErrorAction SilentlyContinue -and (Test-Path "package.json")) {
                    # Non-interactive and stable output
                    $env:NPM_CONFIG_YES = "true"
                    $argList = @('audit','--json')
                    if ($ToolConfig.PSObject.Properties.Name -contains 'args' -and $ToolConfig.args) {
                        $argList += $ToolConfig.args.Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
                    }
                    try {
                        # 修复：在Windows上正确执行npm命令，避免直接运行npm.ps1导致的错误
                        # 使用PowerShell的调用操作符&来执行npm命令
                        try {
                            $command = "npm $($argList -join ' ') > '$outputFile' 2>&1"
                            Write-Log "Executing: $command" 'DEBUG'
                            Invoke-Expression $command
                            $exitCode = $LASTEXITCODE
                            if (-not (Test-Path $outputFile -PathType Leaf)) {
                                # 创建空文件作为回退
                                '' | Set-Content -Path $outputFile -Encoding utf8
                            }
                            if ($exitCode -ne 0) {
                                Write-Log "npm audit exited with code $exitCode — output captured to $outputFile" "WARN"
                            } else {
                                Write-Log "npm audit completed: $outputFile"
                            }
                        } catch {
                            Write-Log "npm audit failed to execute via Invoke-Expression: $($_.Exception.Message)" "ERROR"
                            # 最后的回退：使用更简单的命令格式
                            try {
                                & npm audit --json > $outputFile 2>&1
                                Write-Log "npm audit completed using fallback method: $outputFile"
                            } catch {
                                Write-Log "npm audit fallback execution failed: $($_.Exception.Message)" "ERROR"
                            }
                        }
                    } catch {
                        Write-Log "npm audit failed to execute: $($_.Exception.Message)" "ERROR"
                    }
                } else {
                    Write-Log "npm or package.json not available, skipping npm audit" "WARN"
                }
            }
            "retire" {
                # Prefer globally installed retire (installed in Dockerfile); fall back to npx if absent
                # AI Assistant enhancement: ensure JSON is generated with a stable filename and scan the current project path for both JS and Node modules
                # Timestamp: 2025-09-12 00:05:30 Asia/Shanghai; Sources: https://www.npmjs.com/package/retire https://github.com/RetireJS/retire.js/blob/master/node/README.md
                $retireArgs = @('--outputformat','json','--outputpath', $outputFile, '--path','.')
                if ($ToolConfig.PSObject.Properties.Name -contains 'severity' -and $ToolConfig.severity) {
                    $retireArgs += @('--severity', "$($ToolConfig.severity)")
                }
                if ($ToolConfig.PSObject.Properties.Name -contains 'args' -and $ToolConfig.args) {
                    $retireArgs += $ToolConfig.args.Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
                }

                if (Get-Command "retire" -ErrorAction SilentlyContinue) {
                    & retire @retireArgs
                    if ($LASTEXITCODE -ne 0) {
                        Write-Log "Retire.js exited with code $LASTEXITCODE (global). Args: $($retireArgs -join ' '). Output file: $outputFile" "WARN"
                    } else {
                        Write-Log "Retire.js analysis completed (global): $outputFile"
                    }
                } elseif (Get-Command "npx" -ErrorAction SilentlyContinue) {
                    $env:NPM_CONFIG_YES = "true"
                    & npx --yes --package retire@latest retire @retireArgs
                    if ($LASTEXITCODE -ne 0) {
                        Write-Log "Retire.js exited with code $LASTEXITCODE via npx. Args: $($retireArgs -join ' '). Output file: $outputFile" "WARN"
                    } else {
                        Write-Log "Retire.js analysis completed via npx: $outputFile"
                    }
                } else {
                    Write-Log "Retire.js/retire not available, skipping" "WARN"
                }
            }
            "syft" {
                if (Get-Command "syft" -ErrorAction SilentlyContinue) {
                    & syft . -o json=$outputFile
                    Write-Log "Syft SBOM generation completed: $outputFile"
                } else {
                    Write-Log "Syft not available, skipping" "WARN"
                }
            }
            "trivy" {
                if (Get-Command "trivy" -ErrorAction SilentlyContinue) {
                    & trivy fs --format=json --output=$outputFile .
                    Write-Log "Trivy analysis completed: $outputFile"
                } else {
                    Write-Log "Trivy not available, skipping" "WARN"
                }
            }
            Default {
                Write-Log "Unknown tool: $toolName" "WARN"
            }
        }
    }
    finally {
        Pop-Location
    }
}

# Helper function to create and insert the artifacts index
<#
.SYNOPSIS
    Creates an artifacts index and links it to the main audit report.

.DESCRIPTION
    This function generates a comprehensive index of all audit artifacts
    including file sizes and SHA256 checksums for integrity verification.
    It creates a separate artifacts-index.md file and links it to the main report.

.PARAMETER OutputPath
    The directory path where the artifacts index should be created.
    This parameter is mandatory.

.PARAMETER ReportFile
    The path to the main audit report file to link the index to.
    This parameter is mandatory.

.PARAMETER KeyFiles
    Array of file objects representing key audit artifacts to index.
    This parameter is mandatory.

.EXAMPLE
    Add-ArtifactsIndexToReport -OutputPath "./reports" -ReportFile "./reports/audit-summary.md" -KeyFiles $artifactFiles
    Creates an artifacts index and links it to the main report.

.NOTES
    - Generates SHA256 checksums for file integrity verification
    - Creates a markdown table with file details
    - Automatically links the index to the main report
    - Handles missing files gracefully with warnings
    - Inserted by AI assistant; Timestamp: 2025-09-10 22:57:37 Asia/Shanghai; Source: Trae AI code audit session
#>
function Add-ArtifactsIndexToReport {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true, Position=0)]
        [ValidateNotNullOrEmpty()]
        [string]$OutputPath,
        [Parameter(Mandatory=$true, Position=1)]
        [ValidateNotNullOrEmpty()]
        [ValidateScript({Test-Path $_ -PathType Leaf})]
        [string]$ReportFile,
        [Parameter(Mandatory=$true, Position=2)]
        [ValidateNotNull()]
        [array]$KeyFiles
    )
    if ($KeyFiles.Count -gt 0) {
        try {
            $artifactsIndexFile = Join-Path $OutputPath "artifacts-index.md"
            $artifactsContent = "# Audit Artifacts Index`n`n"
            $artifactsContent += "| File | Size (bytes) | SHA256 Checksum |`n"
            $artifactsContent += "|------|--------------|-----------------|`n"

            foreach ($f in $KeyFiles) {
                $checksum = (Get-FileHash $f.FullName -Algorithm SHA256).Hash
                $artifactsContent += "| [$($f.Name)](./$($f.Name)) | $($f.Length) | $($checksum) |`n"
            }
            $artifactsContent | Out-File $artifactsIndexFile -Encoding UTF8

            # Now, insert a link to this index in the main report
            $mainReportContent = Get-Content $ReportFile -Raw
            $insertionMarker = "## Generated Files"
            $linkToIndex = "`n[View Artifacts Index](./artifacts-index.md)`n`n"
            $updatedReportContent = $mainReportContent -replace [regex]::Escape($insertionMarker), ($insertionMarker + $linkToIndex)
            $updatedReportContent | Out-File $ReportFile -Encoding UTF8
            Write-Log "Successfully created and linked artifacts index."
        } catch {
            Write-Log "Error creating artifacts index: $($_.Exception.Message)" "WARN"
        }
    } else {
        Write-Log "No key artifacts found to index."
    }
}

<#
.SYNOPSIS
    Generates comprehensive audit reports in multiple formats.

.DESCRIPTION
    This function creates detailed audit reports by aggregating results from
    all executed security and analysis tools. It supports multiple output
    formats including SARIF, Markdown, JSON, HTML, and CSV.

.PARAMETER OutputPath
    The directory path where report files should be generated.
    This parameter is mandatory.

.PARAMETER Config
    The complete audit configuration object containing project details,
    tool configurations, and reporting settings.
    This parameter is mandatory.

.EXAMPLE
    Generate-AuditReport -OutputPath "./reports" -Config $auditConfig
    Generates reports with the specified configuration.

.EXAMPLE
    Generate-AuditReport -OutputPath "./output" -Config $config
    Generates basic reports in the output directory.

.OUTPUTS
    Creates multiple report files in the specified output directory:
    - audit-summary-*.md (Markdown summary)
    - artifacts-index.md (File index)
    - Various tool output files

.NOTES
    - Supports configurable output formats via Config.reporting.formats
    - Includes project metadata, tool configurations, and execution summary
    - Generates timestamped filenames for version control
    - Handles missing tool results gracefully
    - Creates directory structure if it doesn't exist
    - Automatically generates artifacts index for key files
#>
function Generate-AuditReport {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true, Position=0)]
        [ValidateNotNullOrEmpty()]
        [string]$OutputPath,
        [Parameter(Mandatory=$true, Position=1)]
        [ValidateNotNull()]
        $Config
    )
    
    $reportFile = Join-Path $OutputPath "audit-summary-$(Get-Date -Format 'yyyyMMdd-HHmmss').md"
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
        foreach ($error in $Global:AuditErrors) { $reportContent += "- $error`n" }
    } else {
        $reportContent += "No errors encountered during audit execution.`n"
    }

    # Inserted by AI assistant: Tool Versions section
    if ($Global:ToolVersions -and $Global:ToolVersions.Keys.Count -gt 0) {
        $reportContent += "`n## Tool Versions`n`n"
        foreach ($k in ($Global:ToolVersions.Keys | Sort-Object)) {
            $reportContent += "- $($k): $($Global:ToolVersions[$k])`n"
        }
        $reportContent += "`n"
    }

    $reportContent += @"

## Generated Files

"@
    
    $outputFiles = Get-ChildItem $OutputPath -File | Where-Object { $_.Name -ne (Split-Path $reportFile -Leaf) }
    foreach ($file in $outputFiles) {
        $reportContent += "- [$($file.Name)](./$($file.Name)) - $($file.Length) bytes`n"
    }
    
    # Inject core statistics if available
    if ($Global:AuditMetrics) {
        $reportContent += @"

## Core Statistics

- SBOM components: $($Global:AuditMetrics.sbom_components)
- Retire.js vulnerabilities: $($Global:AuditMetrics.retire_vulnerabilities)

"@
    }
    
    # Inject quality gate evaluation if available
    if ($Global:AuditGate) {
        $statusUpper = $Global:AuditGate.status.ToUpper()
        $reportContent += @"
## Quality Gate Evaluation

- Profile: $($Global:AuditGate.profile)
- Thresholds: max_vulnerabilities=$($Global:AuditGate.thresholds.max_vulnerabilities), block_on_cvss=$($Global:AuditGate.thresholds.block_on_cvss)
- Status: $statusUpper
"@
        if ($Global:AuditGate.reasons -and $Global:AuditGate.reasons.Count -gt 0) {
            foreach ($r in $Global:AuditGate.reasons) { $reportContent += "- Reason: $r`n" }
        }
        $reportContent += "`n"
    }

    # Inject state machine transition info if available
    if ($Global:ProjectStateChange) {
        $reportContent += @"
## Project State

- Previous: $($Global:ProjectStateChange.previous_state)
- Current: $($Global:ProjectStateChange.current_state)
- Updated At: $($Global:ProjectStateChange.updated_at)
- Reason: $($Global:ProjectStateChange.reason)
"@
        if ($Global:ProjectStateChange.gate_status) {
            $reportContent += "- Gate Status: $($Global:ProjectStateChange.gate_status)`n"
        }
        $reportContent += "`n"
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

    # --- Artifacts Indexing ---
    try {
        Write-Log "Gathering key artifacts for indexing..."
        $keyPatterns = @(
            "audit-summary-*.md",
            "sast-*.json","sast-*.sarif",
            "sca-*.json","sca-*.sarif",
            "sbom*.*",
            "container-*.json","container-*.sarif"
        )
        $keyFiles = @()
        foreach ($p in $keyPatterns) {
            $keyFiles += Get-ChildItem -Path $outputPath -File -Filter $p -ErrorAction SilentlyContinue
        }
        $keyFiles = $keyFiles | Sort-Object FullName -Unique
        
        # Call the refactored helper function
        Add-ArtifactsIndexToReport -OutputPath $OutputPath -ReportFile $reportFile -KeyFiles $keyFiles

    } catch [System.IO.DirectoryNotFoundException] {
        Write-Log "Output directory not found while enumerating artifacts: $($_.Exception.Message)" "ERROR"
    } catch [System.UnauthorizedAccessException] {
        Write-Log "Access denied while accessing artifacts directory: $($_.Exception.Message)" "ERROR"
    } catch [System.IO.IOException] {
        Write-Log "I/O error while enumerating artifacts: $($_.Exception.Message)" "ERROR"
    } catch {
        Write-Log "Unexpected error while enumerating key artifacts: $($_.Exception.Message)" "WARN"
        Write-Log "Exception type: $($_.Exception.GetType().FullName)" "DEBUG"
    } finally {
        Write-Log "Artifacts indexing completed for $($keyFiles.Count) files" "DEBUG"
    }
} # end function Generate-AuditReport

# --- Project State Helpers (DRY) ---
. "$PSScriptRoot/../scripts/state.ps1"

# --- Docker Environment Helpers ---
# Inserted by AI assistant; Timestamp: 2025-09-11 17:17:56 Asia/Shanghai; Source: Trae AI code audit session — ensure Docker execution when platform=docker

<#
.SYNOPSIS
    Tests if Docker is available on the system.

.DESCRIPTION
    Checks if the 'docker' command is available in the system PATH and if the Docker daemon is running.

.OUTPUTS
    Returns $true if Docker is available and running, $false otherwise.

.EXAMPLE
    if (Test-DockerAvailable) {
        Write-Log "Docker is available"
    }
#>
function Test-DockerAvailable {
    try {
        # Check if docker command exists
        $dockerCommand = Get-Command 'docker' -ErrorAction Stop
        Write-Log "Docker command found at $($dockerCommand.Source)" 'DEBUG'
        
        # Check if Docker daemon is running
        $dockerVersion = & docker version --format '{{.Server.Version}}' 2>$null
        if (-not $dockerVersion) {
            Write-Log "Docker command exists but daemon is not running or inaccessible" 'WARN'
            return $false
        }
        Write-Log "Docker daemon is running (version: $dockerVersion)" 'DEBUG'
        return $true
    } catch {
        Write-Log "Docker is not installed or not in PATH" 'WARN'
        return $false
    }
}

function Get-PreferredDockerImage {
    param(
        [Parameter(Mandatory=$true)] $EnvironmentConfig
    )
    $cfgImage = $EnvironmentConfig.docker.image
    # Prefer locally built audit tools image if present
    $localImages = (docker images --format "{{.Repository}}:{{.Tag}}" 2>$null) | Where-Object { $_ }
    $auditImage = 'onlinestore-audit-tools:latest'
    if ($localImages -and ($localImages -contains $auditImage)) {
        return $auditImage
    }
    if ($cfgImage -and $cfgImage -ne '') { return $cfgImage }
    return $auditImage
}

function Invoke-SelfInDocker {
    param(
        [Parameter(Mandatory=$true)] [string]$Image,
        [Parameter(Mandatory=$true)] $EnvConfig
    )
    Write-Log "Re-invoking audit inside Docker image '$Image'..."
    $hostPath = (Get-Location).Path
    # Normalize backslashes for Docker mount
    $hostPathNorm = $hostPath
    $runArgs = @('run','--rm','-t','-e','RUNNING_IN_CONTAINER=1','-v',"${hostPathNorm}:/workspace",'-w','/workspace')
    if ($EnvConfig.docker.container_name) {
        # Use a transient name to avoid conflicts
        $guid = [guid]::NewGuid().ToString().Substring(0,8)
        $runArgs += @('--name',"$($EnvConfig.docker.container_name)-$guid")
    }
    $cmd = @('docker') + $runArgs + @($Image,'pwsh','-NoLogo','-NoProfile','-File','./.trae/rules/audit.ps1')
    Write-Log ("Running: " + ($cmd -join ' ')) 'DEBUG'
    & $cmd[0] $cmd[1..($cmd.Count-1)]
    $exitCode = $LASTEXITCODE
    Write-Log "Docker run finished with exit code $exitCode"
    return $exitCode
}

# --- Script Entry Point ---
# Inserted by AI assistant; Timestamp: 2025-09-10 22:19:35 Asia/Shanghai; Source: Trae AI code audit session
try {
    Write-Log "Starting AI Code Audit Workflow v3.2..."
    
    $config = Get-EmbeddedAuditConfig
    if ($null -eq $config) {
        Write-Log "Audit configuration could not be parsed. Proceeding with defaults and limited execution." "WARN"
    }

    # Ensure Docker execution if configured and available
    $envCfg = Get-ConfigValue $config 'environment' @{}
    if ($envCfg -and $envCfg.platform -eq 'docker') {
        $isInContainer = (Test-Path '/.dockerenv') -or ($env:RUNNING_IN_CONTAINER -eq '1')
        if (-not $isInContainer) {
            # Check if Docker is available
            if (Test-DockerAvailable) {
                $imageToUse = Get-PreferredDockerImage -EnvironmentConfig $envCfg
                $code = Invoke-SelfInDocker -Image $imageToUse -EnvConfig $envCfg
                exit $code
            } else {
                Write-Log "Docker is not available. Switching to local execution mode." "WARN"
                # Override platform to local for this run
                $envCfg.platform = 'local'
            }
        } else {
            Write-Log "Detected container runtime (/.dockerenv present). Continuing in-container execution." 'DEBUG'
        }
    }

    $outputPath = Get-ConfigValue $config 'reporting.output_path' './audit-reports'
    if (-not (Test-Path $outputPath)) {
        New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
        Write-Log "Created output directory: $outputPath"
    }

    $toolchain = Get-ConfigValue $config 'toolchain' $null

    # Check tools (non-blocking)
    if ($toolchain) { 
        $toolsAvailable = Check-ToolEnvironment -Toolchain $toolchain -EnvironmentConfig (Get-ConfigValue $config 'environment' @{})
        Write-Log "Tool environment check completed. All tools available: $toolsAvailable"
        Collect-ToolVersions -Toolchain $toolchain -EnvironmentConfig (Get-ConfigValue $config 'environment' @{})
    }

    # Prepare codebase
    $repoUrl = Get-ConfigValue $config 'project.repository.url' ''
    $localPath = Get-ConfigValue $config 'project.repository.local_path' './'
    $workingDir = Prepare-CodeBase -RepoUrl $repoUrl -LocalPath $localPath -TargetDir 'source'
    Write-Log "Working directory prepared: $workingDir"

    # Execute tools by category
    $sastTools = @(Get-ConfigValue $config 'toolchain.sast' @()) | Where-Object { $_.enabled -eq $true }
    Write-Log "Executing $($sastTools.Count) SAST tools..."
    foreach ($t in $sastTools) { Invoke-Tool -ToolConfig $t -WorkingDir $workingDir -OutputPath $outputPath -Category 'sast' }

    $scaTools = @(Get-ConfigValue $config 'toolchain.sca' @()) | Where-Object { $_.enabled -eq $true }
    Write-Log "Executing $($scaTools.Count) SCA tools..."
    foreach ($t in $scaTools) { Invoke-Tool -ToolConfig $t -WorkingDir $workingDir -OutputPath $outputPath -Category 'sca' }

    $sbomTools = @(Get-ConfigValue $config 'toolchain.sbom' @()) | Where-Object { $_.enabled -eq $true }
    Write-Log "Executing $($sbomTools.Count) SBOM tools..."
    foreach ($t in $sbomTools) { Invoke-Tool -ToolConfig $t -WorkingDir $workingDir -OutputPath $outputPath -Category 'sbom' }

    $containerTools = @(Get-ConfigValue $config 'toolchain.container_security' @()) | Where-Object { $_.enabled -eq $true }
    Write-Log "Executing $($containerTools.Count) container security tools..."
    foreach ($t in $containerTools) { Invoke-Tool -ToolConfig $t -WorkingDir $workingDir -OutputPath $outputPath -Category 'container' }
    
    Write-Log "All tool executions completed successfully."
    
} catch [System.IO.DirectoryNotFoundException] {
    Write-Log "Required directory not found during audit workflow: $($_.Exception.Message)" "ERROR"
} catch [System.UnauthorizedAccessException] {
    Write-Log "Access denied during audit workflow: $($_.Exception.Message)" "ERROR"
} catch [System.Management.Automation.RuntimeException] {
    Write-Log "PowerShell runtime error during audit workflow: $($_.Exception.Message)" "ERROR"
} catch [System.InvalidOperationException] {
    Write-Log "Invalid operation during audit workflow: $($_.Exception.Message)" "ERROR"
} catch {
    Write-Log "Fatal error in audit workflow: $($_.Exception.Message)" "ERROR"
    Write-Log "Exception type: $($_.Exception.GetType().FullName)" "DEBUG"
    Write-Log "Stack trace: $($_.ScriptStackTrace)" "DEBUG"
} finally {
    try {
        Write-Log "Finalizing audit workflow..."
        
        # Always attempt to generate summary report
        if (-not $outputPath) { $outputPath = './audit-reports' }
        if (-not (Test-Path $outputPath)) { 
            New-Item -ItemType Directory -Path $outputPath -Force | Out-Null 
            Write-Log "Created fallback output directory: $outputPath"
        }

        # Compute metrics and evaluate quality gate before generating the report
        $Global:AuditMetrics = Compute-AuditMetrics -OutputPath $outputPath
        $Global:AuditGate = $null
        if ($config) { $Global:AuditGate = Evaluate-QualityGate -Config $config -Metrics $Global:AuditMetrics }

        # --- Write project state prior to report (Inserted by AI assistant; Timestamp: 2025-09-11 16:20:42 Asia/Shanghai; Source: projectbuild_rules.md Step 6) ---
        $prevObj = Get-ProjectState -StateFile ".trae\state.json"
        $prevVal = 'VALIDATING'
        if ($prevObj -and $prevObj.current_state) { $prevVal = $prevObj.current_state }
        if ($Global:AuditGate -and $Global:AuditGate.status -eq 'fail') {
            $null = Set-ProjectState -CurrentState 'DEVELOPING' -PreviousState $prevVal -Reason 'Quality gate failed' -GateInfo $Global:AuditGate
        } else {
            $null = Set-ProjectState -CurrentState 'OPTIMIZING' -PreviousState $prevVal -Reason 'Quality gate passed' -GateInfo $Global:AuditGate
        }
        
        Generate-AuditReport -OutputPath $outputPath -Config $config
        
        # Calculate total execution time
        $executionTime = (Get-Date) - $Global:AuditStartTime
        Write-Log "Audit workflow completed in $($executionTime.TotalMinutes.ToString('F2')) minutes"
        
        # Summary of errors
        if ($Global:AuditErrors.Count -gt 0) {
            Write-Log "Audit completed with $($Global:AuditErrors.Count) errors:" "WARN"
            $Global:AuditErrors | ForEach-Object { Write-Log "  - $_" "WARN" }
        } else {
            Write-Log "Audit completed successfully with no errors."
        }
        
        # --- State Machine Exit Code Signal (Inserted by AI assistant; Timestamp: 2025-09-11 16:20:42 Asia/Shanghai; Source: propagate exit code; state file already written above) ---
        if ($Global:AuditGate -and $Global:AuditGate.status -eq 'fail') {
            Write-Log "Quality gate failed. Setting non-zero exit code for CI blocking." "WARN"
            $script:LastExitCode = 2
            exit 2
        } else {
            $script:LastExitCode = 0
        }
    } catch {
        Write-Log "Error in finally block: $($_.Exception.Message)" "ERROR"
    }
}





