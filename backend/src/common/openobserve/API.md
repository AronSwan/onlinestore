# OpenObserve API（项目对接规范）

## 📋 范围

覆盖本项目对 OpenObserve 的调用与返回契约：
- 数据写入：POST /api/{org}/{stream}/_json
- 数据查询：POST /api/{org}/_search（sql_mode）
- 健康检查：GET /health
- 统计信息：GET /api/{org}/_stats
- 数据完整性：GET /api/{org}/_search

## 🚀 API端点

### 1. 数据写入
```
POST /api/{org}/{stream}/_json
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
  Content-Encoding: gzip (可选)

Body: JSON 数组（记录对象）
Response: 
  200: { "status": "success", "message": "Data ingested successfully" }
  4xx/5xx: OpenObserveError 格式错误
```

### 2. 数据查询
```
POST /api/{org}/_search
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Body: {
  "query": "SELECT * FROM stream WHERE timestamp >= 'now-1h'",
  "streams": ["stream_name"],
  "start_time": "now-1h",
  "end_time": "now",
  "limit": 1000,
  "sql_mode": true
}

Response: 
  200: { "hits": [...], "total": 100, "took": 15 }
  4xx/5xx: OpenObserveError 格式错误
```

### 3. 健康检查
```
GET /health
Response: 
  200: { "status": "healthy", "version": "v1.0.0", "uptime": 3600 }
  503: { "status": "unhealthy", "error": "Service unavailable" }
```

### 4. 统计信息
```
GET /api/{org}/_stats?streams=stream1,stream2
Headers:
  Authorization: Bearer <token>

Response:
  200: { "streams": [...], "total_records": 10000 }
  404: OpenObserveError 格式错误
```

### 5. 数据完整性验证
```
POST /api/{org}/_search
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Body: {
  "query": "SELECT COUNT(*) as total_count, COUNT(DISTINCT _id) as unique_count FROM stream WHERE timestamp >= 'now-1d'",
  "streams": ["stream_name"],
  "sql_mode": true
}

Response:
  200: { "hits": [...], "total": 1 }
  422: OpenObserveError 格式错误
```

## 📝 请求示例

### 数据写入示例
```http
POST /api/default/logs/_json
Authorization: Bearer your-token-here
Content-Type: application/json
Content-Encoding: gzip

[
  {
    "timestamp": "2025-10-13T00:00:00Z",
    "level": "info",
    "message": "User login successful",
    "service": "auth-service",
    "user_id": "12345",
    "ip": "192.168.1.1"
  }
]
```

### 数据查询示例
```json
{
  "query": "SELECT * FROM logs WHERE level = 'error' AND timestamp >= 'now-1h' ORDER BY timestamp DESC",
  "streams": ["logs"],
  "start_time": "now-1h",
  "end_time": "now",
  "limit": 100,
  "sql_mode": true
}
```

## 📊 响应格式

### 成功响应
```json
{
  "success": true,
  "data": {
    "hits": [...],
    "total": 100,
    "took": 15
  },
  "requestId": "req_1760286496614_eiugdacc9"
}
```

### 错误响应（OpenObserveError格式）
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "message": "Validation error: Request failed with status code 400",
    "requestId": "req_1760286496614_eiugdacc9",
    "retryable": false,
    "context": {
      "operation": "querySingleSourceOfTruth",
      "streams": ["test-stream"],
      "query": "INVALID SQL"
    }
  }
}
```

## 🔧 错误代码

| 错误代码 | HTTP状态码 | 描述 | 可重试 |
|----------|------------|------|--------|
| VALIDATION_ERROR | 400-499 | 输入验证错误 | false |
| NETWORK_ERROR | - | 网络连接错误 | true |
| SERVER_ERROR | 500+ | 服务器内部错误 | true |
| TIMEOUT_ERROR | - | 请求超时 | true |

## 🧪 测试命令

```bash
# 运行所有OpenObserve测试
npm run test -- --testPathPattern="openobserve"

# 运行合约测试
npm run test -- --testPathPattern="openobserve.contract.spec.ts"

# 运行集成测试
npm run test -- --testPathPattern="openobserve.integration.spec.ts"
```

## 🐳 本地开发环境

```bash
# 启动OpenObserve服务
docker-compose -f docker-compose.openobserve.yml up -d

# 验证服务状态
curl http://localhost:5080/health

# 测试API端点
curl -H "Authorization: Bearer CHANGE_ME_openobserve_password" \
     http://localhost:5080/api/default/_health
```

---

**最后更新**: 2025-10-13  
**版本**: 1.0.0  
**测试状态**: ✅ 所有32个测试通过