# Tool Compatibility Check Script - Fixed Version
param(
    [switch]$Strict,
    [switch]$AutoFix
)

$STRICT_MODE = $Strict.IsPresent
$AUTO_FIX = $AutoFix.IsPresent

Write-Host "=== Tool Compatibility Check Script ===" -ForegroundColor Green
Write-Host "Strict Mode: $STRICT_MODE" -ForegroundColor Yellow
Write-Host "Auto Fix: $AUTO_FIX" -ForegroundColor Yellow

# 1. Dynamic dependency resolution
$dynamicTools = @()

if (Test-Path "package.json") {
    Write-Host "Scanning package.json..." -ForegroundColor Cyan
    try {
        $packageContent = Get-Content "package.json" | ConvertFrom-Json
        if ($packageContent.devDependencies) {
            foreach ($tool in $packageContent.devDependencies.PSObject.Properties.Name) {
                if ($tool -match "eslint|jscpd|prettier|jest") {
                    $version = $packageContent.devDependencies.$tool
                    $toolEntry = "$tool" + ":" + "$version"
                    $dynamicTools += $toolEntry
                }
            }
        }
    } catch {
        Write-Host "Failed to parse package.json" -ForegroundColor Red
    }
}

# 2. Merge tool lists
$staticTools = @("flyway:11.11.2", "flagger:0.36.0")
$allTools = $staticTools + $dynamicTools
$requiredTools = $allTools | Sort-Object -Unique

Write-Host "Detected tools:" -ForegroundColor Green
foreach ($tool in $requiredTools) {
    Write-Host "  - $tool" -ForegroundColor White
}

# 3. Smart fix function
function Fix-Tool {
    param(
        [string]$Name,
        [string]$RequiredVersion
    )
    
    Write-Host "Fixing $Name to version $RequiredVersion" -ForegroundColor Magenta
    
    if ($Name -match "eslint|jscpd|prettier|jest") {
        $cmd = "npm install -g $Name@$RequiredVersion"
        Write-Host "Simulating: $cmd" -ForegroundColor Yellow
        return $true
    } elseif ($Name -match "semgrep|coverage|pytest") {
        $cmd = "pip install $Name==$RequiredVersion"
        Write-Host "Simulating: $cmd" -ForegroundColor Yellow
        return $true
    } else {
        Write-Host "Auto-fix not supported for $Name" -ForegroundColor Red
        return $false
    }
}

# 4. Tool compatibility check function
function Test-ToolCompatibility {
    param(
        [string]$Name,
        [string]$RequiredVersion,
        [int]$RetryCount = 0
    )
    
    $maxRetries = 3
    
    Write-Host "Checking tool $Name version $RequiredVersion (retry: $RetryCount)" -ForegroundColor White
    
    # Simulate check result
    $result = 1  # Assume check failed
    
    # Auto-fix logic
    if ($result -eq 1 -and $AUTO_FIX -and $RetryCount -lt $maxRetries) {
        if (Fix-Tool -Name $Name -RequiredVersion $RequiredVersion) {
            $newRetryCount = $RetryCount + 1
            return Test-ToolCompatibility -Name $Name -RequiredVersion $RequiredVersion -RetryCount $newRetryCount
        }
    }
    
    if ($RetryCount -ge $maxRetries) {
        Write-Host "Max retries reached, stopping" -ForegroundColor Red
    }
    
    return $result
}

# 5. Environment isolation check
function Test-EnvironmentIsolation {
    Write-Host "Checking environment isolation..." -ForegroundColor Cyan
    
    $isDocker = Test-Path "/.dockerenv"
    $isVM = $false
    
    try {
        $systemInfo = Get-WmiObject -Class Win32_ComputerSystem -ErrorAction SilentlyContinue
        if ($systemInfo -and $systemInfo.Model -match "Virtual|VMware|VirtualBox") {
            $isVM = $true
        }
    } catch {
        Write-Host "Cannot detect VM environment" -ForegroundColor Yellow
    }
    
    $isolated = $isDocker -or $isVM
    
    if ($isolated) {
        Write-Host "Environment isolation check passed" -ForegroundColor Green
        return 0
    } else {
        $warningMsg = "Warning: Current environment is not isolated"
        if ($STRICT_MODE) {
            Write-Host "$warningMsg - Blocked in strict mode" -ForegroundColor Red
            return 1
        } else {
            Write-Host "$warningMsg - Continue in advisory mode" -ForegroundColor Yellow
            return 0
        }
    }
}

# 6. Execute checks
$overallResult = 0
$checkResults = @()

# Environment isolation check
$envResult = Test-EnvironmentIsolation
if ($envResult -ne 0) {
    $overallResult = 1
}

# Tool compatibility checks
foreach ($toolSpec in $requiredTools) {
    $parts = $toolSpec -split ":"
    if ($parts.Length -eq 2) {
        $toolName = $parts[0]
        $toolVersion = $parts[1]
        
        $result = Test-ToolCompatibility -Name $toolName -RequiredVersion $toolVersion
        $checkResults += @{
            Tool = $toolName
            Version = $toolVersion
            Result = $result
        }
        
        if ($result -ne 0) {
            $overallResult = 1
        }
    }
}

# 7. Generate report
$reportPath = ".refactor\tool-compatibility.log"
if (-not (Test-Path ".refactor")) {
    New-Item -ItemType Directory -Path ".refactor" -Force | Out-Null
}

$reportContent = "=== Tool Compatibility Check Report ===`r`n"
$reportContent += "Generated: $(Get-Date)`r`n"
$reportContent += "Strict Mode: $STRICT_MODE`r`n"
$reportContent += "Auto Fix: $AUTO_FIX`r`n`r`n"

if ($envResult -eq 0) {
    $reportContent += "Environment Isolation Check: PASSED`r`n`r`n"
} else {
    $reportContent += "Environment Isolation Check: FAILED`r`n`r`n"
}

$reportContent += "Tool Check Results:`r`n"
foreach ($result in $checkResults) {
    if ($result.Result -eq 0) {
        $status = "PASSED"
    } else {
        $status = "FAILED"
    }
    $toolName = $result.Tool
    $toolVersion = $result.Version
    $reportContent += "- $toolName $toolVersion : $status`r`n"
}

if ($overallResult -eq 0) {
    $reportContent += "`r`nOverall Result: PASSED"
} else {
    $reportContent += "`r`nOverall Result: FAILED"
}

$reportContent | Out-File -FilePath $reportPath -Encoding UTF8
Write-Host "Report generated: $reportPath" -ForegroundColor Green

# 8. Output result
if ($overallResult -eq 0) {
    Write-Host "=== All checks passed ===" -ForegroundColor Green
} else {
    Write-Host "=== Checks failed ===" -ForegroundColor Red
    if ($STRICT_MODE) {
        Write-Host "Execution blocked in strict mode" -ForegroundColor Red
    }
}

exit $overallResult