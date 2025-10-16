# Docker环境测试运行脚本 (PowerShell简单版)

Write-Host "Preparing to run test-runner-secure validation tests in Docker..." -ForegroundColor Green

# Check if Docker is available
try {
    $dockerVersion = docker --version
    Write-Host "Docker is available: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "Docker is not installed or available, please install Docker first" -ForegroundColor Red
    exit 1
}

# Create temporary directory
$tempDir = Join-Path $env:TEMP "test-runner-secure-$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
Write-Host "Created temporary directory: $tempDir" -ForegroundColor Green

# Copy necessary files to temporary directory
Copy-Item "test-runner-secure.cjs" "$tempDir\" -Force
Copy-Item "test-runner-secure.validation-tests-docker-simple.cjs" "$tempDir\" -Force

# Run tests in Docker container
Write-Host "Running tests in Docker container..." -ForegroundColor Green
$containerPath = "/app"
$hostPath = $tempDir.Replace('\', '/')

try {
    $result = docker run --rm `
        -v "${hostPath}:${containerPath}" `
        -w $containerPath `
        node:18-alpine `
        sh -c "node test-runner-secure.validation-tests-docker-simple.cjs"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Docker environment tests completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Docker environment tests failed!" -ForegroundColor Red
        # Clean up temporary directory
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        exit 1
    }
} catch {
    Write-Host "Error running Docker container: $($_.Exception.Message)" -ForegroundColor Red
    # Clean up temporary directory
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

# Clean up temporary directory
Write-Host "Cleaning up temporary directory..." -ForegroundColor Green
Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Docker environment tests completed!" -ForegroundColor Green