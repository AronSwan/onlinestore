# Paperless-NGX Local Setup Script
# Configure Paperless-NGX after deployment

param(
    [string]$AdminUsername = "admin",
    [string]$AdminEmail = "admin@localhost.com",
    [int]$Port = 8001
)

# Get the current backend directory
$BackendDir = Split-Path -Parent $PSScriptRoot
$InstallPath = Join-Path $BackendDir "paperless-ngx"

Write-Host "Setting up Paperless-NGX in project backend..." -ForegroundColor Green

# Change to installation directory
if (Test-Path $InstallPath) {
    Set-Location $InstallPath
} else {
    Write-Host "Installation directory not found: $InstallPath" -ForegroundColor Red
    Write-Host "Please run deployment first: npm run paperless:deploy-local" -ForegroundColor Yellow
    exit 1
}

# Wait for services to be fully ready
Write-Host "Waiting for services to be fully ready..." -ForegroundColor Yellow
$maxAttempts = 20
$attempt = 0

do {
    $attempt++
    Write-Host "Checking services... (Attempt $attempt/$maxAttempts)" -ForegroundColor Cyan
    
    $webserverStatus = docker-compose ps webserver --format "table {{.Status}}"
    if ($webserverStatus -match "Up") {
        Write-Host "Webserver is running!" -ForegroundColor Green
        break
    }
    
    if ($attempt -ge $maxAttempts) {
        Write-Host "Services did not start within expected time" -ForegroundColor Red
        Write-Host "Current status:" -ForegroundColor Yellow
        docker-compose ps
        exit 1
    }
    
    Start-Sleep -Seconds 15
} while ($true)

# Additional wait for application initialization
Write-Host "Waiting for application initialization..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Create superuser
Write-Host "Creating admin user '$AdminUsername'..." -ForegroundColor Green

$createUserScript = @"
from django.contrib.auth.models import User
import os
username = '$AdminUsername'
email = '$AdminEmail'
password = 'admin123'

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username, email, password)
    print(f'Admin user {username} created successfully')
else:
    print(f'Admin user {username} already exists')
"@

try {
    $createUserScript | docker-compose exec -T webserver python3 manage.py shell
    Write-Host "Admin user setup completed" -ForegroundColor Green
} catch {
    Write-Host "Failed to create admin user: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "You can create it manually later through the web interface" -ForegroundColor Cyan
}

# Test web interface accessibility
Write-Host "Testing web interface accessibility..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$Port" -TimeoutSec 10 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "Web interface is accessible!" -ForegroundColor Green
    } else {
        Write-Host "Web interface returned status code: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Web interface is not yet accessible: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "This is normal during initial startup. Please wait a few more minutes." -ForegroundColor Cyan
}

# Display final status
Write-Host ""
Write-Host "=== Paperless-NGX Setup Complete ===" -ForegroundColor Green
Write-Host "Project Location: $InstallPath" -ForegroundColor Cyan
Write-Host "Web Interface: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "Admin Username: $AdminUsername" -ForegroundColor Cyan
Write-Host "Admin Password: admin123 (please change after first login)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Services Status:" -ForegroundColor Green
docker-compose ps

Write-Host ""
Write-Host "=== Project Integration ===" -ForegroundColor Green
Write-Host "- Paperless-NGX is now part of your backend project" -ForegroundColor White
Write-Host "- Data is stored in: backend/paperless-data/" -ForegroundColor White
Write-Host "- Import documents to: backend/paperless-ngx/consume/" -ForegroundColor White
Write-Host "- Export documents from: backend/paperless-ngx/export/" -ForegroundColor White
Write-Host ""
Write-Host "=== Management Commands ===" -ForegroundColor Green
Write-Host "View logs: npm run paperless:logs-local" -ForegroundColor White
Write-Host "Stop services: npm run paperless:stop-local" -ForegroundColor White
Write-Host "Restart services: npm run paperless:restart-local" -ForegroundColor White