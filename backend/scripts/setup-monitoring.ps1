<#
.SYNOPSIS
  Setup Prometheus alert rules and import Grafana dashboard for Caddy Shopping.

.PARAMETER GrafanaUrl
  Grafana base URL, e.g. http://localhost:3001

.PARAMETER GrafanaApiKey
  Grafana API key with admin permission

.PARAMETER DatasourceUid
  Grafana Prometheus datasource UID

.PARAMETER PrometheusRulesDir
  Local Prometheus rules directory to place alerts file (optional)

.EXAMPLE
  ./scripts/setup-monitoring.ps1 -GrafanaUrl http://localhost:3001 -GrafanaApiKey "eyJrIjoi..." -DatasourceUid "prometheus" -PrometheusRulesDir "C:\Prometheus\rules"
#>

param(
  [Parameter(Mandatory=$true)] [string]$GrafanaUrl,
  [Parameter(Mandatory=$true)] [string]$GrafanaApiKey,
  [Parameter(Mandatory=$true)] [string]$DatasourceUid,
  [Parameter(Mandatory=$false)] [string]$PrometheusRulesDir
)

$ErrorActionPreference = 'Stop'

Write-Host "Uploading Grafana dashboard..." -ForegroundColor Cyan

$dashboardPath = Join-Path $PSScriptRoot "..\monitoring\grafana-dashboard.json"
if (!(Test-Path $dashboardPath)) {
  throw "Dashboard file not found: $dashboardPath"
}

# Inject datasource UID if needed (simple replacement)
$dashboardJson = Get-Content -Raw -Path $dashboardPath
$dashboardJson = $dashboardJson -replace '"datasource":\s*"[^"]*"', '"datasource": "' + $DatasourceUid + '"'

$headers = @{ 
  'Authorization' = "Bearer $GrafanaApiKey"; 
  'Content-Type'  = 'application/json' 
}

$importUrl = "$GrafanaUrl/api/dashboards/db"
$resp = Invoke-RestMethod -Method Post -Uri $importUrl -Headers $headers -Body $dashboardJson
Write-Host "Dashboard imported: UID=$($resp.uid) Title=$($resp.slug)" -ForegroundColor Green

if ($PrometheusRulesDir -and (Test-Path $PrometheusRulesDir)) {
  Write-Host "Installing Prometheus alert rules..." -ForegroundColor Cyan
  $alertsSrc = Join-Path $PSScriptRoot "..\monitoring\prometheus-alerts.yml"
  if (!(Test-Path $alertsSrc)) {
    throw "Alerts file not found: $alertsSrc"
  }
  $alertsDst = Join-Path $PrometheusRulesDir "prometheus-alerts.yml"
  Copy-Item -Path $alertsSrc -Destination $alertsDst -Force
  Write-Host "Alerts copied to $alertsDst. Please reload Prometheus to apply." -ForegroundColor Green
} else {
  Write-Host "PrometheusRulesDir not provided or doesn't exist; skip alerts copy." -ForegroundColor Yellow
}

Write-Host "Monitoring setup completed." -ForegroundColor Green