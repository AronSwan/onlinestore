# 用途：Redpanda 启动脚本（Windows PowerShell 版本）
# 依赖文件：无
# 作者：后端开发团队
// 时间：2025-09-29 10:30:00

# Redpanda 启动脚本
Write-Host "🚀 启动 Redpanda 流处理平台..." -ForegroundColor Green

# 检查 Docker 是否运行
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker 未运行，请先启动 Docker Desktop" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Docker 未运行，请先启动 Docker Desktop" -ForegroundColor Red
    exit 1
}

# 停止已存在的容器
Write-Host "🛑 停止现有 Redpanda 容器..." -ForegroundColor Yellow
docker stop redpanda redpanda-console 2>$null | Out-Null
docker rm redpanda redpanda-console 2>$null | Out-Null

# 启动 Redpanda
Write-Host "🐼 启动 Redpanda..." -ForegroundColor Yellow
docker run -d `
  --name redpanda `
  -p 9092:9092 `
  -p 9644:9644 `
  docker.redpanda.com/redpandadata/redpanda:latest `
  redpanda start `
  --overprovisioned `
  --smp 1 `
  --memory 1G `
  --reserve-memory 0M `
  --node-id 0 `
  --kafka-addr PLAINTEXT://0.0.0.0:29092,OUTSIDE://0.0.0.0:9092 `
  --advertise-kafka-addr PLAINTEXT://redpanda:29092,OUTSIDE://localhost:9092

# 等待 Redpanda 启动
Write-Host "⏳ 等待 Redpanda 启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 启动 Redpanda Console
Write-Host "📊 启动 Redpanda Console..." -ForegroundColor Yellow
docker run -d `
  --name redpanda-console `
  -p 8080:8080 `
  -e KAFKA_BROKERS=redpanda:9092 `
  docker.redpanda.com/redpandadata/console:latest

# 等待 Console 启动
Start-Sleep -Seconds 5

# 检查服务状态
Write-Host "🔍 检查服务状态..." -ForegroundColor Yellow
docker ps --filter "name=redpanda"

# 创建测试主题
Write-Host "📝 创建测试主题..." -ForegroundColor Yellow
docker exec redpanda rpk topic create `
  orders `
  products `
  users `
  --brokers=localhost:9092

Write-Host "✅ Redpanda 启动完成!" -ForegroundColor Green
Write-Host "📊 Redpanda Console: http://localhost:8080" -ForegroundColor Cyan
Write-Host "🔗 Kafka Broker: localhost:9092" -ForegroundColor Cyan
Write-Host "📈 Redpanda Metrics: http://localhost:9644/metrics" -ForegroundColor Cyan