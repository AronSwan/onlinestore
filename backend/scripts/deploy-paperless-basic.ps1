# Paperless-NGX Basic Deployment Script
# Simple and reliable deployment without complex features

param(
    [string]$InstallPath = "C:\paperless-ngx",
    [string]$DataPath = "C:\paperless-data",
    [int]$Port = 8000
)

Write-Host "Starting Paperless-NGX deployment..." -ForegroundColor Green

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

# Create .env file
$envContent = @"
PAPERLESS_REDIS=redis://broker:6379
PAPERLESS_DBHOST=db
PAPERLESS_TIKA_ENABLED=1
PAPERLESS_TIKA_GOTENBERG_ENDPOINT=http://gotenberg:3000
PAPERLESS_TIKA_ENDPOINT=http://tika:9998
PAPERLESS_PORT=$Port
PAPERLESS_DATA_DIR=$DataPath
PAPERLESS_MEDIA_ROOT=$DataPath/media
PAPERLESS_STATICDIR=$DataPath/static
PAPERLESS_FILENAME_FORMAT={created_year}/{correspondent}/{created_month:02d}/{title}
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8
Write-Host "Created .env file" -ForegroundColor Green

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
$services = docker-compose ps --services
if ($services) {
    Write-Host "Running services:" -ForegroundColor Green
    docker-compose ps
} else {
    Write-Host "No services are running" -ForegroundColor Red
}

Write-Host ""
Write-Host "Deployment completed!" -ForegroundColor Green
Write-Host "Paperless-NGX should be available at: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "Installation path: $InstallPath" -ForegroundColor Cyan
Write-Host "Data path: $DataPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "To create an admin user, run:" -ForegroundColor Yellow
Write-Host "docker-compose exec webserver python3 manage.py createsuperuser" -ForegroundColor White
Write-Host ""
Write-Host "To stop the services, run:" -ForegroundColor Yellow
Write-Host "docker-compose down" -ForegroundColor White