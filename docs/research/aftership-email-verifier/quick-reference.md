# 快速参考

## 目录
- [常用配置](#常用配置)
- [性能参数](#性能参数)
- [故障排除](#故障排除)
- [API 接口](#api-接口)
- [集成示例](#集成示例)

## 常用配置

### 基础配置
```go
verifier := emailverifier.NewVerifier().
  EnableSMTPCheck().
  ConnectTimeout(5 * time.Second).
  OperationTimeout(8 * time.Second)
```

### 生产环境配置
```go
verifier := emailverifier.NewVerifier().
  EnableSMTPCheck().
  DisableCatchAllCheck().
  Proxy("socks5://proxy:1080").
  EnableAutoUpdateDisposable().
  ConnectTimeout(3 * time.Second).
  OperationTimeout(5 * time.Second)
```

### Docker 配置
```yaml
# email-verifier 生产环境配置
version: '3.8'

services:
  email-verifier:
    image: aftership/email-verifier:latest
    environment:
      # 基础配置
      - PORT=8080
      - LOG_LEVEL=info
      
      # SMTP配置
      - ENABLE_SMTP_CHECK=true
      - SMTP_TIMEOUT=5s
      - CONNECT_TIMEOUT=3s
      - OPERATION_TIMEOUT=8s
      
      # 缓存配置
      - CACHE_TTL=1800
      - CACHE_SIZE=1000
      
      # 代理配置（可选）
      # - PROXY_URL=socks5://proxy:1080
      
    # 资源限制
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

### NestJS 集成配置
```typescript
// 环境变量配置
EMAIL_VERIFIER_API_BASE=http://apiserver:8080
EMAIL_VERIFIER_API_TIMEOUT_MS=10000
EMAIL_VERIFY_TTL_SEC=1800
EMAIL_VERIFY_TTL_UNKNOWN_SEC=600
EMAIL_VERIFY_NEG_CACHE_SEC=60

# 限流配置
GLOBAL_RATE_LIMIT=200
GLOBAL_BURST_LIMIT=400
DOMAIN_RATE_LIMIT=3
DOMAIN_BURST_LIMIT=6
```

## 性能参数

| 参数 | 推荐值 | 说明 |
|------|--------|------|
| ConnectTimeout | 3-5s | 建立连接超时 |
| OperationTimeout | 5-8s | SMTP操作超时 |
| 缓存TTL | 10-60分钟 | 验证结果缓存 |
| 并发限制 | 域级≤3, 全局≤200 | 并发控制 |
| 代理超时 | 5s | 代理连接超时 |

### 批量处理性能基准

| 验证类型 | 平均响应时间 | P95 | P99 | 吞吐量 |
|----------|-------------|-----|-----|--------|
| 仅语法 | 5ms | 8ms | 12ms | 2000/s |
| 语法+MX | 120ms | 200ms | 350ms | 500/s |
| 完整验证 | 800ms | 1500ms | 2500ms | 100/s |

### 缓存效果对比

| 缓存策略 | 命中率 | 响应时间改善 | 内存使用 |
|----------|--------|-------------|----------|
| 无缓存 | 0% | - | 0MB |
| 内存缓存 | 65% | 85% | 50MB |
| Redis缓存 | 85% | 95% | 200MB |

## 故障排除

### 常见问题

#### 1. SMTP连接超时
**症状**：验证请求超时，返回未知状态
**原因**：25端口被ISP封锁或网络不稳定
**解决方案**：
- 检查25端口是否可用
- 配置代理：`Proxy("socks5://proxy:1080")`
- 使用厂商API：`EnableAPIVerifier(YAHOO)`
- 调整超时参数：`ConnectTimeout(3 * time.Second)`

#### 2. 验证速度慢
**症状**：单个验证耗时超过1秒
**原因**：网络延迟或目标域响应慢
**解决方案**：
- 启用缓存：设置合适的CACHE_TTL
- 调整超时参数：降低ConnectTimeout和OperationTimeout
- 使用并发连接：增加域级并发限制
- 跳过耗时的检查：`DisableCatchAllCheck()`

#### 3. 内存使用高
**症状**：服务内存占用持续增长
**原因**：缓存数据过多或内存泄漏
**解决方案**：
- 清理缓存：定期清理过期缓存
- 调整TTL：缩短缓存时间
- 限制缓存大小：设置CACHE_SIZE
- 监控内存：设置内存告警阈值

#### 4. 验证结果不准确
**症状**：大量邮箱返回unknown状态
**原因**：网络限制或配置问题
**解决方案**：
- 检查网络：确认25端口可用
- 配置代理：绕过网络限制
- 调整策略：使用厂商API补强
- 降级处理：基于语法和MX记录做基础判断

### 错误代码对照表

| 错误代码 | 含义 | 解决方案 |
|----------|------|----------|
| connection_refused | 连接被拒绝 | 检查网络或使用代理 |
| timeout | 连接超时 | 调整超时参数 |
| rate_limited | 请求被限流 | 降低请求频率 |
| invalid_format | 邮箱格式无效 | 检查邮箱格式 |
| dns_error | DNS查询失败 | 检查DNS配置 |

## API 接口

### REST API 接口

#### 验证单个邮箱
```http
GET /v1/{email}/verification
```

**响应示例**：
```json
{
  "email": "user@example.com",
  "reachable": "yes",
  "syntax": {
    "username": "user",
    "domain": "example.com",
    "valid": true
  },
  "has_mx_records": true,
  "disposable": false,
  "role_account": false,
  "free": false,
  "smtp": {
    "host_exists": true,
    "full_inbox": false,
    "catch_all": false,
    "deliverable": true,
    "disabled": false
  }
}
```

#### 批量验证
```http
POST /v1/batch-verification
```

**请求体**：
```json
{
  "emails": ["user1@example.com", "user2@example.com"],
  "options": {
    "persistResults": true,
    "priority": "normal"
  }
}
```

**响应示例**：
```json
{
  "jobId": "abc123",
  "status": "queued",
  "total": 2,
  "estimatedTime": "5秒"
}
```

#### 查询批量任务状态
```http
GET /v1/batch-verification/{jobId}
```

### Go SDK 接口

```go
// 基础验证
result, err := verifier.Verify("user@example.com")

// 单项检查
mx, err := verifier.CheckMX("example.com")
smtp, err := verifier.CheckSMTP("example.com", "user")
isDEA := verifier.IsDisposable("example.com")
suggest := verifier.SuggestDomain("gmai.com")

// 自定义验证器
verifier := emailverifier.NewVerifier().
  EnableSMTPCheck().
  DisableCatchAllCheck().
  Proxy("socks5://proxy:1080").
  EnableAutoUpdateDisposable().
  ConnectTimeout(3 * time.Second).
  OperationTimeout(5 * time.Second)
```

## 集成示例

### Node.js 集成
```javascript
const axios = require('axios');

class EmailVerifier {
  constructor(apiUrl = 'http://apiserver:8080') {
    this.apiUrl = apiUrl;
  }

  async verify(email) {
    try {
      const response = await axios.get(`${this.apiUrl}/v1/${encodeURIComponent(email)}/verification`);
      return response.data;
    } catch (error) {
      throw new Error(`验证失败: ${error.message}`);
    }
  }

  async batchVerify(emails) {
    try {
      const response = await axios.post(`${this.apiUrl}/v1/batch-verification`, {
        emails,
        options: { persistResults: true }
      });
      return response.data;
    } catch (error) {
      throw new Error(`批量验证失败: ${error.message}`);
    }
  }
}

// 使用示例
const verifier = new EmailVerifier();

// 单个验证
const result = await verifier.verify('user@example.com');
console.log(result.reachable); // yes/no/unknown

// 批量验证
const batchResult = await verifier.batchVerify(['user1@example.com', 'user2@example.com']);
console.log(`任务ID: ${batchResult.jobId}`);
```

### Python 集成
```python
import requests
import time

class EmailVerifier:
    def __init__(self, api_url='http://apiserver:8080'):
        self.api_url = api_url

    def verify(self, email):
        try:
            response = requests.get(f"{self.api_url}/v1/{email}/verification")
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"验证失败: {str(e)}")

    def batch_verify(self, emails):
        try:
            response = requests.post(
                f"{self.api_url}/v1/batch-verification",
                json={"emails": emails, "options": {"persistResults": True}}
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"批量验证失败: {str(e)}")

    def wait_for_batch(self, job_id, timeout=300):
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = requests.get(f"{self.api_url}/v1/batch-verification/{job_id}")
                response.raise_for_status()
                result = response.json()
                
                if result['status'] in ['completed', 'failed']:
                    return result
                    
                time.sleep(2)
            except requests.exceptions.RequestException:
                pass
                
        raise Exception("批量验证超时")

# 使用示例
verifier = EmailVerifier()

# 单个验证
result = verifier.verify('user@example.com')
print(result['reachable'])  # yes/no/unknown

# 批量验证
batch_result = verifier.batch_verify(['user1@example.com', 'user2@example.com'])
print(f"任务ID: {batch_result['jobId']}")

# 等待批量完成
final_result = verifier.wait_for_batch(batch_result['jobId'])
print(f"成功: {final_result['data']['success']}, 失败: {final_result['data']['errors']}")
```

### Java 集成
```java
import okhttp3.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

public class EmailVerifier {
    private final OkHttpClient client;
    private final ObjectMapper mapper;
    private final String apiUrl;

    public EmailVerifier(String apiUrl) {
        this.apiUrl = apiUrl;
        this.client = new OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build();
        this.mapper = new ObjectMapper();
    }

    public VerificationResult verify(String email) throws IOException {
        String url = String.format("%s/v1/%s/verification", apiUrl, email);
        
        Request request = new Request.Builder()
            .url(url)
            .get()
            .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("验证失败: " + response.code());
            }
            
            return mapper.readValue(response.body().string(), VerificationResult.class);
        }
    }

    public BatchResult batchVerify(List<String> emails) throws IOException {
        String url = String.format("%s/v1/batch-verification", apiUrl);
        
        Map<String, Object> body = Map.of(
            "emails", emails,
            "options", Map.of("persistResults", true)
        );
        
        RequestBody requestBody = RequestBody.create(
            mapper.writeValueAsString(body),
            MediaType.get("application/json; charset=utf-8")
        );

        Request request = new Request.Builder()
            .url(url)
            .post(requestBody)
            .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("批量验证失败: " + response.code());
            }
            
            return mapper.readValue(response.body().string(), BatchResult.class);
        }
    }

    // 数据类
    public static class VerificationResult {
        public String email;
        public String reachable;
        public Syntax syntax;
        public boolean has_mx_records;
        public boolean disposable;
        public boolean role_account;
        public boolean free;
        public SMTP smtp;
        
        public static class Syntax {
            public String username;
            public String domain;
            public boolean valid;
        }
        
        public static class SMTP {
            public boolean host_exists;
            public boolean full_inbox;
            public boolean catch_all;
            public boolean deliverable;
            public boolean disabled;
        }
    }
    
    public static class BatchResult {
        public String jobId;
        public String status;
        public int total;
        public String estimatedTime;
    }
}

// 使用示例
EmailVerifier verifier = new EmailVerifier("http://apiserver:8080");

// 单个验证
VerificationResult result = verifier.verify("user@example.com");
System.out.println(result.reachable); // yes/no/unknown

// 批量验证
List<String> emails = List.of("user1@example.com", "user2@example.com");
BatchResult batchResult = verifier.batchVerify(emails);
System.out.println("任务ID: " + batchResult.jobId);