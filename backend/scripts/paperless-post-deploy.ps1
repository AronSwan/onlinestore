# Paperless-NGX Post-Deployment Script
# Handles post-deployment tasks like creating admin user and verification

param(
    [string]$InstallPath = "C:\paperless-ngx",
    [string]$AdminUsername = "admin",
    [string]$AdminEmail = "admin@example.com",
    [int]$Port = 8000
)

Write-Host "Starting post-deployment tasks for Paperless-NGX..." -ForegroundColor Green

# Change to installation directory
Set-Location $InstallPath

# Wait for services to be fully ready
Write-Host "Waiting for services to be fully ready..." -ForegroundColor Yellow
$maxAttempts = 30
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
        exit 1
    }
    
    Start-Sleep -Seconds 10
} while ($true)

# Additional wait for application initialization
Write-Host "Waiting for application initialization..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Check if admin user already exists
Write-Host "Checking if admin user exists..." -ForegroundColor Cyan
$userCheck = docker-compose exec -T webserver python3 manage.py shell -c "from django.contrib.auth.models import User; print(User.objects.filter(username='$AdminUsername').exists())"

if ($userCheck -match "True") {
    Write-Host "Admin user '$AdminUsername' already exists" -ForegroundColor Yellow
} else {
    Write-Host "Creating admin user '$AdminUsername'..." -ForegroundColor Green
    
    # Create superuser non-interactively
    $createUserCommand = @"
from django.contrib.auth.models import User
if not User.objects.filter(username='$AdminUsername').exists():
    User.objects.create_superuser('$AdminUsername', '$AdminEmail', 'admin123')
    print('Admin user created successfully')
else:
    print('Admin user already exists')
"@
    
    $createUserCommand | docker-compose exec -T webserver python3 manage.py shell
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
Write-Host "=== Paperless-NGX Deployment Status ===" -ForegroundColor Green
Write-Host "Installation Path: $InstallPath" -ForegroundColor Cyan
Write-Host "Web Interface: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "Admin Username: $AdminUsername" -ForegroundColor Cyan
Write-Host "Admin Password: admin123" -ForegroundColor Yellow
Write-Host ""
Write-Host "Services Status:" -ForegroundColor Green
docker-compose ps

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Green
Write-Host "1. Open http://localhost:$Port in your browser" -ForegroundColor White
Write-Host "2. Login with username: $AdminUsername, password: admin123" -ForegroundColor White
Write-Host "3. Change the default password in the admin interface" -ForegroundColor White
Write-Host "4. Configure document processing settings" -ForegroundColor White
Write-Host ""
Write-Host "=== Useful Commands ===" -ForegroundColor Green
Write-Host "View logs: docker-compose logs -f" -ForegroundColor White
Write-Host "Stop services: docker-compose down" -ForegroundColor White
Write-Host "Restart services: docker-compose restart" -ForegroundColor White
Write-Host "Update: docker-compose pull && docker-compose up -d" -ForegroundColor White