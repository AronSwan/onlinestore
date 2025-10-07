#!/bin/bash

# 日常依赖检查脚本
# 用于快速检查项目依赖状态

echo "=== 依赖健康检查 ==="
echo "检查时间: $(date)"
echo ""

# 检查 Node.js 版本
echo "Node.js 版本: $(node --version)"
echo "npm 版本: $(npm --version)"
echo ""

# 前端检查
echo "=== 前端依赖检查 ==="
if [ -f "package.json" ]; then
    echo "安全检查:"
    npm audit --audit-level=moderate
    echo ""
    
    echo "过时依赖:"
    npm outdated
    echo ""
else
    echo "未找到前端 package.json"
fi

# 后端检查
echo "=== 后端依赖检查 ==="
if [ -f "backend/package.json" ]; then
    cd backend
    echo "安全检查:"
    npm audit --audit-level=moderate
    echo ""
    
    echo "过时依赖:"
    npm outdated
    echo ""
    cd ..
else
    echo "未找到后端 package.json"
fi

echo "=== 检查完成 ==="