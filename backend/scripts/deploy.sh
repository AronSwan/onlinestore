#!/bin/bash

# 用途：后端系统部署脚本
# 依赖文件：docker-compose.yml, .env
# 作者：后端开发团队
# 时间：2025-09-26 18:26:30

set -e

echo "🚀 开始部署 Caddy 购物网站后端系统..."

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，使用 .env.example 创建..."
    cp .env.example .env
    echo "📝 请编辑 .env 文件配置数据库和Redis连接信息"
    exit 1
fi

# 加载环境变量
source .env

# 创建必要的目录
mkdir -p docker/mysql docker/nginx/ssl

# 构建并启动服务
echo "🔨 构建Docker镜像..."
docker-compose build

echo "🚀 启动服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 检查服务状态
echo "🔍 检查服务状态..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ 所有服务启动成功！"
    echo ""
    echo "📊 服务信息："
    echo "  应用服务: http://localhost:3000"
    echo "  API文档: http://localhost:3000/api"
    echo "  健康检查: http://localhost:3000/health"
    echo "  MySQL: localhost:3306"
    echo "  Redis: localhost:6379"
    echo ""
    echo "🔧 常用命令："
    echo "  查看日志: docker-compose logs -f app"
    echo "  停止服务: docker-compose down"
    echo "  重启服务: docker-compose restart"
    echo "  查看状态: docker-compose ps"
else
    echo "❌ 服务启动失败，请检查日志："
    docker-compose logs
    exit 1
fi

echo "🎉 部署完成！"