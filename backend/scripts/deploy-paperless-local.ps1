# Paperless-NGX Local Project Deployment Script
# Deploy Paperless-NGX within the current backend project

param(
    [int]$Port = 8001
)

# Get the current backend directory
$BackendDir = Split-Path -Parent $PSScriptRoot
$InstallPath = Join-Path $BackendDir "paperless-ngx"
$DataPath = Join-Path $BackendDir "paperless-data"

Write-Host "Deploying Paperless-NGX to project backend..." -ForegroundColor Green
Write-Host "Backend Directory: $BackendDir" -ForegroundColor Cyan
Write-Host "Install Path: $InstallPath" -ForegroundColor Cyan
Write-Host "Data Path: $DataPath" -ForegroundColor Cyan

# Check if Docker is installed
try {
    docker --version | Out-Null
    Write-Host "Docker is available" -ForegroundColor Green
} catch {
    Write-Host "Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check if Docker Compose is available
try {
    docker-compose --version | Out-Null
    Write-Host "Docker Compose is available" -ForegroundColor Green
} catch {
    Write-Host "Docker Compose is not available. Please install Docker Compose." -ForegroundColor Red
    exit 1
}

# Create installation directory
if (!(Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force
    Write-Host "Created installation directory: $InstallPath" -ForegroundColor Green
}

# Create data directory
if (!(Test-Path $DataPath)) {
    New-Item -ItemType Directory -Path $DataPath -Force
    Write-Host "Created data directory: $DataPath" -ForegroundColor Green
}

# Change to installation directory
Set-Location $InstallPath

# Download docker-compose.yml
$composeUrl = "https://raw.githubusercontent.com/paperless-ngx/paperless-ngx/main/docker/compose/docker-compose.sqlite.yml"
try {
    Invoke-WebRequest -Uri $composeUrl -OutFile "docker-compose.yml"
    Write-Host "Downloaded docker-compose.yml" -ForegroundColor Green
} catch {
    Write-Host "Failed to download docker-compose.yml: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Create docker-compose.env file with project-specific configuration
$envContent = @"
PAPERLESS_REDIS=redis://broker:6379
PAPERLESS_DBHOST=
PAPERLESS_TIKA_ENABLED=1
PAPERLESS_TIKA_GOTENBERG_ENDPOINT=http://gotenberg:3000
PAPERLESS_TIKA_ENDPOINT=http://tika:9998
PAPERLESS_PORT=$Port
PAPERLESS_DATA_DIR=$DataPath
PAPERLESS_MEDIA_ROOT=$DataPath/media
PAPERLESS_STATICDIR=$DataPath/static
PAPERLESS_FILENAME_FORMAT={created_year}/{correspondent}/{created_month:02d}/{title}
PAPERLESS_SECRET_KEY=change-me-in-production
PAPERLESS_URL=http://localhost:$Port
PAPERLESS_ALLOWED_HOSTS=localhost,127.0.0.1
PAPERLESS_CORS_ALLOWED_HOSTS=http://localhost:$Port
PAPERLESS_TIME_ZONE=Asia/Shanghai
PAPERLESS_OCR_LANGUAGE=chi-sim+eng
"@

$envContent | Out-File -FilePath "docker-compose.env" -Encoding UTF8
Write-Host "Created docker-compose.env file" -ForegroundColor Green

# Create directories required by docker-compose
$requiredDirs = @("export", "consume")
foreach ($dir in $requiredDirs) {
    $dirPath = Join-Path $InstallPath $dir
    if (!(Test-Path $dirPath)) {
        New-Item -ItemType Directory -Path $dirPath -Force
        Write-Host "Created directory: $dir" -ForegroundColor Green
    }
}

# Stop any existing services
Write-Host "Stopping any existing services..." -ForegroundColor Yellow
docker-compose down 2>$null

# Start the services
Write-Host "Starting Paperless-NGX services..." -ForegroundColor Yellow
try {
    docker-compose up -d
    Write-Host "Services started successfully!" -ForegroundColor Green
} catch {
    Write-Host "Failed to start services: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Wait for services to be ready
Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check if services are running
Write-Host "Checking service status..." -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "=== Paperless-NGX Local Deployment Completed ===" -ForegroundColor Green
Write-Host "Installation Path: $InstallPath" -ForegroundColor Cyan
Write-Host "Data Path: $DataPath" -ForegroundColor Cyan
Write-Host "Access URL: http://localhost:$Port" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: npm run paperless:setup-local" -ForegroundColor White
Write-Host "2. Open: http://localhost:$Port" -ForegroundColor White
Write-Host "3. Login with admin/admin123" -ForegroundColor White