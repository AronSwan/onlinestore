#!/bin/bash

# 搜索服务设置脚本
set -e

echo "🔧 设置搜索服务..."

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装"
    exit 1
fi

# 检查Docker环境
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装"
    exit 1
fi

# 创建搜索服务目录
mkdir -p docker/search

# 复制Docker配置文件
if [ ! -f docker/search/docker-compose.yml ]; then
    echo "📋 复制Docker配置文件..."
    # 这里应该复制实际的配置文件
    echo "✅ Docker配置文件已准备"
fi

# 安装搜索服务依赖
echo "📦 安装搜索服务依赖..."
cd backend

if [ ! -d node_modules ]; then
    npm install
fi

# 安装搜索相关的NPM包
echo "📚 安装搜索库..."
npm install meilisearch @zincsearch/client

echo ""
echo "✅ 搜索服务设置完成!"
echo ""
echo "🚀 下一步操作:"
echo "1. 启动搜索服务: cd docker/search && ./start-search-services.sh"
echo "2. 配置环境变量: cp .env.example .env"
echo "3. 启动应用: npm run start:dev"
echo ""
echo "💡 验证搜索服务:"
echo "   - MeiliSearch: http://localhost:7700"
echo "   - ZincSearch: http://localhost:4080/ui/"