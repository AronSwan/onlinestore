# OpenObserve 安全与合规

## 🔐 认证与密钥管理

### 认证方式
- **Bearer Token** (优先): 使用环境变量 `OPENOBSERVE_TOKEN`
- **Basic认证** (备选): 使用 `OPENOBSERVE_USERNAME` 和 `OPENOBSERVE_PASSWORD`
- **Token优先级**: Bearer Token > Basic认证

### 环境变量配置
```bash
# 推荐配置方式
OPENOBSERVE_TOKEN=your-secure-token-here
OPENOBSERVE_URL=http://localhost:5080
OPENOBSERVE_ORGANIZATION=default

# 备选配置
OPENOBSERVE_USERNAME=admin
OPENOBSERVE_PASSWORD=admin123
```

### 安全最佳实践
- ✅ **严禁密钥写入仓库**: 所有密钥通过环境变量注入
- ✅ **CI/CD安全**: 在CI中以Secret方式注入密钥
- ✅ **密钥轮换**: 定期更换访问令牌
- ✅ **最小权限**: 仅授予必要的读写权限

## 🛡️ 输入验证与安全

### 控制器层验证
```typescript
// DTO验证示例
export class QueryDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsArray()
  @IsString({ each: true })
  streams: string[];

  @IsOptional()
  @IsNumber()
  @Max(10000)
  limit?: number;
}
```

### ValidationPipe配置
```typescript
app.useGlobalPipes(new ValidationPipe({
  transform: true,           // 自动类型转换
  whitelist: true,          // 仅保留DTO中定义的字段
  forbidNonWhitelisted: true, // 拒绝额外字段
  transformOptions: {
    enableImplicitConversion: true,
  },
}));
```

### 查询安全
- ✅ **参数化查询**: 使用`ParameterizedQueryBuilder`防止SQL注入
- ✅ **字段白名单**: `FieldWhitelistService`动态字段验证
- ✅ **安全转义**: `SecureQueryBuilder`提供安全转义
- ✅ **查询限制**: 限制查询结果数量和执行时间

## 🔒 数据保护与脱敏

### 数据脱敏策略
```typescript
// 敏感数据脱敏示例
class DataMaskingService {
  maskEmail(email: string): string {
    return email.replace(/(.{2}).*(@.*)/, '$1***$2');
  }
  
  maskPhoneNumber(phone: string): string {
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }
  
  truncatePII(data: string, maxLength: number = 50): string {
    return data.length > maxLength ? data.substring(0, maxLength) + '...' : data;
  }
}
```

### 数据保留策略
- **日志数据**: 默认保留30天
- **审计日志**: 保留1年
- **PII数据**: 最小化收集，定期清理
- **合规要求**: 遵循GDPR、CCPA等法规

### 传输安全
- ✅ **生产HTTPS**: 生产环境强制使用HTTPS
- ✅ **数据压缩**: gzip压缩减少传输量
- ✅ **连接加密**: TLS 1.2+加密传输
- ✅ **证书验证**: 严格的证书验证

## 🚦 访问控制与速率限制

### API访问控制
```typescript
// 速率限制中间件
@Injectable()
export class RateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientId = this.getClientId(request);
    
    return this.rateLimiter.isAllowed(clientId, {
      windowMs: 60 * 1000,    // 1分钟
      maxRequests: 100,       // 最大请求数
    });
  }
}
```

### 写入限流
- **吞吐限制**: 每秒最多1000次写入
- **批大小限制**: 单次最多1000条记录
- **数据大小限制**: 单次请求最大10MB
- **防雪崩**: 错误率过高时自动降级

### 网关限制
- **IP白名单**: 限制访问来源IP
- **地理限制**: 按地理位置限制访问
- **时间窗口**: 限制访问时间范围
- **异常检测**: 自动识别异常访问模式

## 🔍 审计与监控

### 审计日志
```typescript
// 审计日志示例
class AuditService {
  logAccess(userId: string, operation: string, resource: string) {
    this.logger.log({
      timestamp: new Date().toISOString(),
      userId,
      operation,
      resource,
      ip: this.getClientIp(),
      userAgent: this.getUserAgent(),
    });
  }
}
```

### 安全监控指标
- **unknown_ratio**: 未知错误率监控
- **timeout_rate**: 超时率监控
- **domain_error_spike**: 域错误峰值监控
- **authentication_failures**: 认证失败次数
- **authorization_failures**: 授权失败次数

### 告警配置
```yaml
alerts:
  - name: OpenObserveHighErrorRate
    condition: error_rate > 5%
    duration: 5m
    action: send_alert
    
  - name: OpenObserveAuthFailures
    condition: auth_failures > 10/hour
    duration: 1m
    action: investigate
```

## 🛠️ 安全配置示例

### 环境变量安全配置
```bash
# 基本安全配置
OPENOBSERVE_ENABLED=true
OPENOBSERVE_TOKEN=your-secure-token
OPENOBSERVE_URL=https://your-openobserve.com

# 验证和安全配置
OPENOBSERVE_VALIDATION_ENABLED=true
OPENOBSERVE_FIELD_WHITELIST_ENABLED=true
OPENOBSERVE_RATE_LIMIT_ENABLED=true

# 数据保护配置
OPENOBSERVE_COMPRESSION=true
OPENOBSERVE_DATA_MASKING=true
OPENOBSERVE_AUDIT_ENABLED=true
```

### Docker安全配置
```yaml
# docker-compose.openobserve.yml
services:
  openobserve:
    image: public.ecr.aws/zinclabs/openobserve:latest
    environment:
      - ZO_ROOT_USER_EMAIL=admin@example.com
      - ZO_ROOT_USER_PASSWORD=secure-password-here
    ports:
      - "5080:5080"
    volumes:
      - ./data:/data
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
```

## 🔄 安全回滚策略

### 开关控制
```bash
# 紧急关闭开关
OPENOBSERVE_ENABLED=false          # 完全关闭
OPENOBSERVE_V2_ENABLED=false       # 回退到v1
OPENOBSERVE_VALIDATION_ENABLED=false # 关闭验证
OPENOBSERVE_WRITE_ENABLED=false     # 关闭写入
```

### 灰度发布
```typescript
// 灰度发布配置
const config = {
  rollout: {
    stage1: { percentage: 10, duration: '30m' },
    stage2: { percentage: 30, duration: '30m' },
    stage3: { percentage: 100, duration: 'permanent' },
  },
  monitoring: {
    errorRate: { threshold: 1%, action: 'rollback' },
    latency: { threshold: 2s, action: 'rollback' },
  },
};
```

### 回滚步骤
1. **监控告警**: 观察关键指标
2. **快速回滚**: 关闭功能开关
3. **问题分析**: 分析错误日志
4. **修复验证**: 修复后重新测试
5. **重新发布**: 验证后重新上线

## 🧪 安全测试

### 安全测试命令
```bash
# 运行安全相关测试
npm run test -- --testPathPattern="openobserve" --testNamePattern="security"

# 运行认证测试
npm run test -- --testPathPattern="openobserve" --testNamePattern="authentication"

# 运行输入验证测试
npm run test -- --testPathPattern="openobserve" --testNamePattern="validation"
```

### 安全扫描
```bash
# 依赖漏洞扫描
npm audit

# 代码安全扫描
npm run security:scan

# 配置安全检查
npm run security:config-check
```

---

**最后更新**: 2025-10-13  
**版本**: 1.0.0  
**安全等级**: ⭐⭐⭐⭐⭐ 全面安全防护