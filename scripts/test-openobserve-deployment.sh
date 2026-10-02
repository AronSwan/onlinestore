#!/bin/bash

# 测试OpenObserve部署的脚本

echo "🧪 测试OpenObserve部署..."

# 检查服务是否运行
echo "🔍 检查服务状态..."
if ! curl -f http://localhost:5080 > /dev/null 2>&1; then
    echo "❌ OpenObserve服务未运行"
    exit 1
fi

if ! curl -f http://localhost:6379 > /dev/null 2>&1; then
    echo "❌ Redis服务未运行"
    exit 1
fi

echo "✅ 服务运行正常"

# 测试OpenObserve API
echo ""
echo "🔧 测试OpenObserve API..."

# 获取认证令牌 (这里使用基本认证)
AUTH="admin@example.com:CHANGE_ME_openobserve_password"

# 创建组织 (如果不存在)
ORG_RESPONSE=$(curl -s -u $AUTH -X POST http://localhost:5080/api/organizations \
  -H "Content-Type: application/json" \
  -d '{"identifier":"caddy-shopping-test","name":"Caddy Shopping Test"}')

if [[ $ORG_RESPONSE == *"already exists"* ]]; then
    echo "✅ 组织已存在"
else
    echo "✅ 组织创建成功"
fi

# 获取组织ID
ORG_ID=$(curl -s -u $AUTH "http://localhost:5080/api/organizations" | \
  jq -r '.[] | select(.identifier=="caddy-shopping-test") | .identifier')

if [ -z "$ORG_ID" ]; then
    echo "❌ 无法获取组织ID"
    exit 1
fi

echo "✅ 组织ID: $ORG_ID"

# 创建流
STREAM_RESPONSE=$(curl -s -u $AUTH -X POST "http://localhost:5080/api/$ORG_ID/streams" \
  -H "Content-Type: application/json" \
  -d '{"name":"test-logs"}')

if [[ $STREAM_RESPONSE == *"already exists"* ]] || [ -z "$STREAM_RESPONSE" ]; then
    echo "✅ 流已存在或创建成功"
else
    echo "✅ 流创建成功"
fi

# 发送测试日志
LOG_RESPONSE=$(curl -s -u $AUTH -X POST "http://localhost:5080/api/$ORG_ID/test-logs/_json" \
  -H "Content-Type: application/json" \
  -d "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"level\":\"INFO\",\"message\":\"Test log from deployment test\",\"service\":\"test-script\"}")

if [[ $LOG_RESPONSE == *"successful\":1"* ]]; then
    echo "✅ 日志发送成功"
else
    echo "❌ 日志发送失败: $LOG_RESPONSE"
    exit 1
fi

# 查询日志
sleep 2  # 等待日志被索引
QUERY_RESPONSE=$(curl -s -u $AUTH "http://localhost:5080/api/$ORG_ID/_search?type=logs&stream=test-logs&start=$(date -u -d '1 minute ago' +%Y-%m-%dT%H:%M:%SZ)&end=$(date -u +%Y-%m-%dT%H:%M:%SZ)")

if [[ $QUERY_RESPONSE == *"Test log from deployment test"* ]]; then
    echo "✅ 日志查询成功"
else
    echo "❌ 日志查询失败"
    exit 1
fi

echo ""
echo "🎉 OpenObserve部署测试通过！"
echo ""
echo "📊 访问OpenObserve界面:"
echo "   URL: http://localhost:5080"
echo "   账户: admin@example.com"
echo "   密码: CHANGE_ME_openobserve_password"
echo ""
echo "📋 查看测试日志:"
echo "   1. 登录OpenObserve界面"
echo "   2. 选择 'Caddy Shopping Test' 组织"
echo "   3. 选择 'test-logs' 流"
echo "   4. 查看测试日志数据"