# --- Shared Project State Helpers (DRY) ---
# Inserted by AI assistant; Timestamp: 2025-09-11 16:39:03 Asia/Shanghai; Source: DRY state helpers extracted from audit.ps1

function Invoke-StateLog {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    if (Get-Command Write-Log -ErrorAction SilentlyContinue) {
        Write-Log $Message $Level
    } else {
        $prefix = "[$Level]"
        Write-Host "$prefix $Message"
    }
}

function Get-ProjectState {
    param(
        [string]$StateFile = ".trae\state.json"
    )
    try {
        $dir = Split-Path $StateFile -Parent
        if (-not (Test-Path $dir)) { return $null }
        if (-not (Test-Path $StateFile)) { return $null }
        $json = Get-Content -Path $StateFile -Raw -Encoding UTF8
        if ([string]::IsNullOrWhiteSpace($json)) { return $null }
        return $json | ConvertFrom-Json
    } catch {
        Invoke-StateLog "Failed to read project state: $($_.Exception.Message)" "WARN"
        return $null
    }
}

function Set-ProjectState {
    param(
        [Parameter(Mandatory=$true)] [string]$CurrentState,
        [string]$PreviousState = $null,
        [string]$Reason = $null,
        [string]$StateFile = ".trae\state.json",
        $GateInfo = $null,
        [string]$GateStatus = $null,
        [string]$GateProfile = $null,
        $GateThresholds = $null
    )
    try {
        $stateDir = Split-Path $StateFile -Parent
        if (-not (Test-Path $stateDir)) { New-Item -ItemType Directory -Path $stateDir -Force | Out-Null }

        # Prefer GateInfo object if provided; else use individual params
        $resolvedStatus = if ($GateInfo -and $GateInfo.PSObject.Properties.Name -contains 'status') { $GateInfo.status } elseif ($GateStatus) { $GateStatus } else { $null }
        $resolvedProfile = if ($GateInfo -and $GateInfo.PSObject.Properties.Name -contains 'profile') { $GateInfo.profile } elseif ($GateProfile) { $GateProfile } else { $null }
        $resolvedThresholds = if ($GateInfo -and $GateInfo.PSObject.Properties.Name -contains 'thresholds') { $GateInfo.thresholds } elseif ($GateThresholds) { $GateThresholds } else { $null }

        $obj = [PSCustomObject]@{
            previous_state = $PreviousState
            current_state  = $CurrentState
            updated_at     = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            reason         = $Reason
            gate_status    = $resolvedStatus
            gate_profile   = $resolvedProfile
            gate_thresholds= $resolvedThresholds
        }
        $json = $obj | ConvertTo-Json -Depth 6
        $json | Out-File -FilePath $StateFile -Encoding UTF8
        Invoke-StateLog "Project state updated: $PreviousState -> $CurrentState ($Reason)" "INFO"
        $Global:ProjectStateChange = $obj
        return $true
    } catch {
        Invoke-StateLog "Failed to write project state: $($_.Exception.Message)" "ERROR"
        return $false
    }
}