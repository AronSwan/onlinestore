# Email Verifier 微服务集成指南

本项目集成了 AfterShip email-verifier 作为微服务，提供强大的邮箱验证功能。

## 功能特性

- ✅ **语法验证**: 检查邮箱格式是否正确
- ✅ **MX 记录验证**: 检查域名是否能接收邮件
- ✅ **SMTP 验证**: 实际连接邮件服务器验证（可选）
- ✅ **一次性邮箱检测**: 识别临时/垃圾邮箱
- ✅ **免费邮箱检测**: 识别免费邮箱服务商
- ✅ **角色邮箱检测**: 识别 admin@、info@ 等角色邮箱
- ✅ **域名拼写建议**: 自动纠正常见拼写错误
- ✅ **可达性评估**: 评估邮箱的可达性等级
- ✅ **Gravatar 检测**: 检查是否有 Gravatar 头像

## 快速开始

### 1. 部署微服务

```bash
# 给部署脚本执行权限
chmod +x scripts/deploy-email-verifier.sh

# 部署服务
./scripts/deploy-email-verifier.sh deploy
```

### 2. 配置环境变量

编辑 `.env` 文件：

```env
# Email Verifier 配置
EMAIL_VERIFIER_API_URL=http://localhost:8080
EMAIL_VERIFIER_TIMEOUT=10000
EMAIL_VERIFIER_CACHE=true
EMAIL_VERIFIER_CACHE_EXPIRY=300000

# 业务规则配置
ALLOW_DISPOSABLE_EMAIL=false      # 是否允许一次性邮箱
ALLOW_ROLE_ACCOUNT=true           # 是否允许角色邮箱
REQUIRE_MX_RECORDS=true           # 是否要求 MX 记录
MIN_EMAIL_REACHABILITY=unknown    # 最低可达性要求
ENABLE_SMTP_CHECK=false           # 是否启用 SMTP 检查
```

### 3. 集成到后端

在你的 Express/NestJS 应用中：

```javascript
// 引入路由
const emailVerificationRoutes = require('./src/email-verification/email-verification.routes');

// 注册路由
app.use('/api/email', emailVerificationRoutes);
```

### 4. 前端集成

在 HTML 页面中：

```html
<!-- 引入客户端脚本 -->
<script src="/js/email-verification-client.js"></script>

<!-- 邮箱输入框会自动启用验证 -->
<form>
    <input type="email" name="email" placeholder="请输入邮箱地址" required>
    <button type="submit">注册</button>
</form>
```

或手动初始化：

```javascript
const client = new EmailVerificationClient({
    apiBaseUrl: '/api/email',
    enableRealTimeValidation: true,
    debounceDelay: 500
});

// 为表单设置验证
client.setupFormValidation('#registration-form');

// 手动验证
const result = await client.verify('user@example.com');
console.log(result);
```

## API 接口

### 验证单个邮箱

```http
POST /api/email/verify
Content-Type: application/json

{
    "email": "user@example.com"
}
```

响应：

```json
{
    "success": true,
    "data": {
        "email": "user@example.com",
        "valid": true,
        "reason": "Email passed all validation checks",
        "duration_ms": 245,
        "timestamp": "2024-01-01T12:00:00.000Z",
        "details": {
            "syntax": {
                "username": "user",
                "domain": "example.com",
                "valid": true
            },
            "has_mx_records": true,
            "disposable": false,
            "role_account": false,
            "free": false,
            "reachable": "high",
            "smtp": {
                "deliverable": true,
                "full_inbox": false,
                "host_exists": true,
                "catch_all": false
            },
            "gravatar": {
                "has_gravatar": false,
                "gravatar_url": null
            }
        }
    }
}
```

### 批量验证

```http
POST /api/email/verify-batch
Content-Type: application/json

{
    "emails": ["user1@example.com", "user2@example.com"]
}
```

### 健康检查

```http
GET /api/email/health
```

### 获取配置

```http
GET /api/email/config
```

## 管理命令

```bash
# 查看服务日志
./scripts/deploy-email-verifier.sh logs

# 重启服务
./scripts/deploy-email-verifier.sh restart

# 停止服务
./scripts/deploy-email-verifier.sh stop

# 健康检查
./scripts/deploy-email-verifier.sh health
```

## 业务规则配置

### 验证策略

可以通过环境变量配置不同的验证策略：

```env
# 严格模式：拒绝一次性邮箱，要求高可达性
ALLOW_DISPOSABLE_EMAIL=false
MIN_EMAIL_REACHABILITY=high
ENABLE_SMTP_CHECK=true

# 宽松模式：允许大部分邮箱
ALLOW_DISPOSABLE_EMAIL=true
MIN_EMAIL_REACHABILITY=unknown
ENABLE_SMTP_CHECK=false
```

### 自定义验证逻辑

在 `email-verifier-service.js` 中修改 `applyBusinessRules` 方法：

```javascript
applyBusinessRules(apiResult) {
    // 自定义业务逻辑
    if (apiResult.syntax.domain === 'blacklisted-domain.com') {
        return { allowed: false, reason: 'Domain not allowed' };
    }
    
    // 其他规则...
}
```

## SMTP 验证配置

SMTP 验证需要 25 端口可用，大多数 ISP 会屏蔽此端口。

### 使用代理

```env
# 配置 SOCKS 代理
SOCKS_PROXY=socks5://user:pass@proxy:1080?timeout=5s
```

### Docker 配置

在 `docker-compose.email-verifier.yml` 中：

```yaml
environment:
  - ENABLE_SMTP_CHECK=true
  - SOCKS_PROXY=socks5://user:pass@proxy:1080
```

## 性能优化

### 缓存配置

- **内存缓存**: 默认启用，5分钟过期
- **Redis 缓存**: 生产环境推荐

```javascript
// 使用 Redis 缓存
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// 在 EmailVerifierService 中集成 Redis
```

### 限流配置

Nginx 配置中已包含限流：

```nginx
limit_req_zone $binary_remote_addr zone=email_verify:10m rate=10r/s;
limit_req zone=email_verify burst=20 nodelay;
```

## 监控和日志

### 服务监控

```bash
# 查看服务状态
docker-compose -f docker/docker-compose.email-verifier.yml ps

# 查看资源使用
docker stats email-verifier-api
```

### 日志分析

```bash
# 实时日志
docker-compose -f docker/docker-compose.email-verifier.yml logs -f

# 错误日志
docker-compose -f docker/docker-compose.email-verifier.yml logs | grep ERROR
```

## 故障排除

### 常见问题

1. **SMTP 连接超时**
   - 检查 25 端口是否被屏蔽
   - 配置 SOCKS 代理

2. **验证速度慢**
   - 启用缓存
   - 调整超时时间
   - 禁用 SMTP 检查

3. **内存使用过高**
   - 清理缓存
   - 调整缓存过期时间
   - 使用 Redis 外部缓存

### 调试模式

```env
LOG_LEVEL=debug
```

## 安全考虑

1. **限流**: 防止 API 滥用
2. **输入验证**: 严格验证输入参数
3. **错误处理**: 不泄露敏感信息
4. **HTTPS**: 生产环境使用 HTTPS
5. **认证**: 考虑添加 API 认证

## 生产部署

### SSL 配置

1. 获取 SSL 证书
2. 配置 Nginx HTTPS
3. 更新 `nginx.conf` 中的 SSL 配置

### 高可用部署

```yaml
# docker-compose.yml
services:
  email-verifier:
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
```

### 备份和恢复

```bash
# 备份配置
tar -czf email-verifier-backup.tar.gz docker/ .env

# 恢复
tar -xzf email-verifier-backup.tar.gz
```

## 更新和维护

### 更新服务

```bash
# 拉取最新镜像
docker-compose -f docker/docker-compose.email-verifier.yml pull

# 重新部署
./scripts/deploy-email-verifier.sh restart
```

### 数据维护

```bash
# 清理旧镜像
docker image prune -f

# 清理缓存
curl -X POST http://localhost:3000/api/email/cache/clear
```

## 支持和反馈

如有问题或建议，请：

1. 查看日志文件
2. 检查配置文件
3. 参考官方文档: https://github.com/AfterShip/email-verifier
4. 提交 Issue 或联系开发团队