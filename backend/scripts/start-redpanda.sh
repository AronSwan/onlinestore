#!/bin/bash

# Redpanda 启动脚本
echo "🚀 启动 Redpanda 流处理平台..."

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker"
    exit 1
fi

# 停止已存在的容器
echo "🛑 停止现有 Redpanda 容器..."
docker stop redpanda redpanda-console 2>/dev/null || true
docker rm redpanda redpanda-console 2>/dev/null || true

# 启动 Redpanda
echo "🐼 启动 Redpanda..."
docker run -d \
  --name redpanda \
  -p 9092:9092 \
  -p 9644:9644 \
  docker.redpanda.com/redpandadata/redpanda:latest \
  redpanda start \
  --overprovisioned \
  --smp 1 \
  --memory 1G \
  --reserve-memory 0M \
  --node-id 0 \
  --kafka-addr PLAINTEXT://0.0.0.0:29092,OUTSIDE://0.0.0.0:9092 \
  --advertise-kafka-addr PLAINTEXT://redpanda:29092,OUTSIDE://localhost:9092

# 等待 Redpanda 启动
echo "⏳ 等待 Redpanda 启动..."
sleep 10

# 启动 Redpanda Console
echo "📊 启动 Redpanda Console..."
docker run -d \
  --name redpanda-console \
  -p 8080:8080 \
  -e KAFKA_BROKERS=redpanda:9092 \
  docker.redpanda.com/redpandadata/console:latest

# 等待 Console 启动
sleep 5

# 检查服务状态
echo "🔍 检查服务状态..."
docker ps --filter "name=redpanda"

# 创建测试主题
echo "📝 创建测试主题..."
docker exec redpanda rpk topic create \
  orders \
  products \
  users \
  --brokers=localhost:9092

echo "✅ Redpanda 启动完成!"
echo "📊 Redpanda Console: http://localhost:8080"
echo "🔗 Kafka Broker: localhost:9092"
echo "📈 Redpanda Metrics: http://localhost:9644/metrics"