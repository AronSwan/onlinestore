#!/bin/bash

# Docker环境测试运行脚本

echo "🐳 准备在Docker环境中运行test-runner-secure验证测试..."

# 检查Docker是否可用
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装或不可用，请先安装Docker"
    exit 1
fi

# 创建临时目录
TEMP_DIR=$(mktemp -d)
echo "📁 创建临时目录: $TEMP_DIR"

# 复制必要的文件到临时目录
cp test-runner-secure.cjs "$TEMP_DIR/"
cp test-runner-secure.validation-tests-docker-simple.cjs "$TEMP_DIR/"

# 创建一个简单的package.json（如果需要）
cat > "$TEMP_DIR/package.json" << EOF
{
  "name": "test-runner-secure-validation",
  "version": "1.0.0",
  "description": "Test Runner Secure Validation Tests",
  "main": "test-runner-secure.validation-tests-docker-simple.cjs",
  "scripts": {
    "test": "node test-runner-secure.validation-tests-docker-simple.cjs"
  }
}
EOF

# 在Docker容器中运行测试
echo "🚀 在Docker容器中运行测试..."
docker run --rm \
    -v "$TEMP_DIR:/app" \
    -w /app \
    node:18-alpine \
    sh -c "node test-runner-secure.validation-tests-docker-simple.cjs"

# 检查测试结果
if [ $? -eq 0 ]; then
    echo "✅ Docker环境测试成功完成！"
else
    echo "❌ Docker环境测试失败！"
    # 清理临时目录
    rm -rf "$TEMP_DIR"
    exit 1
fi

# 清理临时目录
echo "🧹 清理临时目录..."
rm -rf "$TEMP_DIR"

echo "🎉 Docker环境测试完成！"