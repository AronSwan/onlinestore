# 限流和安全防护系统

## 概述

本系统提供了一套完整的API限流和安全防护解决方案，支持多种限流算法、安全防护机制和监控告警功能。

## 核心特性

### 🚀 限流功能
- **多种算法**：令牌桶、滑动窗口、固定窗口、漏桶算法
- **多维度限流**：用户、IP、API、功能模块限流
- **动态配置**：支持运行时动态调整限流参数
- **分布式支持**：基于Redis的分布式限流

### 🛡️ 安全防护
- **IP控制**：白名单、黑名单、自动封禁
- **请求验证**：HTTPS强制、请求大小限制、方法验证
- **API密钥**：支持API密钥认证和管理
- **频率检查**：防止暴力破解和恶意请求

### 📊 监控告警
- **实时监控**：请求统计、限流状态、安全事件
- **性能指标**：响应时间、成功率、错误率
- **告警通知**：邮件、Slack、Webhook通知
- **可视化**：Grafana仪表板集成

## 快速开始

### 1. 环境配置

复制环境配置文件：
```bash
cp .env.rate-limiter.example .env
```

配置Redis连接：
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

### 2. 模块集成

在 `app.module.ts` 中导入模块：

```typescript
import { RateLimiterModule } from './common/rate-limiter/rate-limiter.module';

@Module({
  imports: [
    // 基础配置
    RateLimiterModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
        password: 'password'
      },
      global: {
        enabled: true,
        limit: 1000,
        window: 60
      },
      security: {
        enabled: true,
        requireHttps: true,
        ipWhitelist: ['127.0.0.1']
      }
    }),
    
    // 异步配置
    RateLimiterModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD')
        },
        global: {
          enabled: configService.get('GLOBAL_RATE_LIMIT_ENABLED', true),
          limit: configService.get('GLOBAL_RATE_LIMIT_MAX', 1000),
          window: configService.get('GLOBAL_RATE_LIMIT_WINDOW', 60)
        }
      }),
      inject: [ConfigService]
    })
  ]
})
export class AppModule {}
```

## 使用指南

### 限流装饰器

#### 基础限流
```typescript
import { RateLimit } from './common/decorators/rate-limit.decorator';

@Controller('api')
export class ApiController {
  @RateLimit({ limit: 100, window: 60 })
  @Get('data')
  getData() {
    return { data: 'example' };
  }
}
```

#### 专用限流装饰器
```typescript
// 登录限流
@LoginRateLimit({ limit: 5, window: 3600 })
@Post('login')
login(@Body() loginDto: LoginDto) {
  // 登录逻辑
}

// 搜索限流
@SearchRateLimit({ limit: 50, window: 60 })
@Get('search')
search(@Query('q') query: string) {
  // 搜索逻辑
}

// 支付限流
@PaymentRateLimit({ limit: 5, window: 60 })
@Post('payment')
payment(@Body() paymentDto: PaymentDto) {
  // 支付逻辑
}
```

#### 高级限流策略
```typescript
// 组合限流
@CombinedRateLimit([
  { type: 'user', limit: 100, window: 60 },
  { type: 'ip', limit: 200, window: 60 }
])
@Get('combined')
combinedEndpoint() {
  // 业务逻辑
}

// 条件限流
@ConditionalRateLimit({
  condition: (req) => req.user?.role !== 'admin',
  limit: 50,
  window: 60
})
@Get('conditional')
conditionalEndpoint() {
  // 业务逻辑
}

// 基于角色的限流
@RoleBasedRateLimit({
  user: { limit: 100, window: 60 },
  premium: { limit: 500, window: 60 },
  admin: { limit: -1, window: 60 } // 无限制
})
@Get('role-based')
roleBasedEndpoint() {
  // 业务逻辑
}
```

### 安全装饰器

#### 安全配置
```typescript
import { Security, RequireHttps, IpWhitelist } from './common/decorators/security.decorator';

@Controller('admin')
@Security({
  requireHttps: true,
  ipWhitelist: ['192.168.1.0/24'],
  maxRequestSize: 1024 * 1024 // 1MB
})
export class AdminController {
  @RequireHttps()
  @IpWhitelist(['192.168.1.100'])
  @Get('sensitive')
  sensitiveData() {
    return { sensitive: 'data' };
  }
}
```

#### 跳过安全检查
```typescript
import { SkipSecurity } from './common/decorators/security.decorator';

@SkipSecurity()
@Get('public')
publicEndpoint() {
  return { message: 'public data' };
}
```

### 服务使用

#### 限流服务
```typescript
import { RateLimiterService } from './common/rate-limiter/rate-limiter.service';

@Injectable()
export class CustomService {
  constructor(private rateLimiterService: RateLimiterService) {}

  async checkCustomLimit(userId: string) {
    const result = await this.rateLimiterService.checkLimit({
      key: `custom:${userId}`,
      limit: 100,
      window: 60,
      algorithm: 'SLIDING_WINDOW'
    });

    if (!result.allowed) {
      throw new TooManyRequestsException(
        `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`
      );
    }

    return result;
  }

  async resetUserLimit(userId: string) {
    await this.rateLimiterService.resetLimit(`user:${userId}`);
  }

  async getStats() {
    return await this.rateLimiterService.getStats();
  }
}
```

## 限流算法

### 1. 令牌桶算法 (TOKEN_BUCKET)
```typescript
@RateLimit({
  algorithm: 'TOKEN_BUCKET',
  limit: 100,        // 桶容量
  window: 60,        // 时间窗口
  refillRate: 10     // 每秒填充令牌数
})
```

**特点**：
- 允许突发流量
- 平滑限流
- 适合API网关

### 2. 滑动窗口算法 (SLIDING_WINDOW)
```typescript
@RateLimit({
  algorithm: 'SLIDING_WINDOW',
  limit: 100,        // 窗口内最大请求数
  window: 60,        // 窗口大小（秒）
  segments: 10       // 窗口分片数
})
```

**特点**：
- 精确限流
- 内存占用较高
- 适合精确控制

### 3. 固定窗口算法 (FIXED_WINDOW)
```typescript
@RateLimit({
  algorithm: 'FIXED_WINDOW',
  limit: 100,        // 窗口内最大请求数
  window: 60         // 窗口大小（秒）
})
```

**特点**：
- 简单高效
- 可能有边界问题
- 适合简单场景

### 4. 漏桶算法 (LEAKY_BUCKET)
```typescript
@RateLimit({
  algorithm: 'LEAKY_BUCKET',
  limit: 50,         // 桶容量
  window: 60,        // 时间窗口
  leakRate: 5        // 每秒漏出请求数
})
```

**特点**：
- 平滑输出
- 严格限流
- 适合流量整形

## 安全防护

### IP控制

#### 白名单配置
```typescript
// 全局白名单
RateLimiterModule.forRoot({
  security: {
    ipWhitelist: [
      '127.0.0.1',
      '192.168.1.0/24',
      '10.0.0.0/8'
    ]
  }
})

// 方法级白名单
@IpWhitelist(['192.168.1.100', '10.0.0.1'])
@Get('admin-only')
adminOnly() {
  return { message: 'admin data' };
}
```

#### 黑名单配置
```typescript
// 全局黑名单
RateLimiterModule.forRoot({
  security: {
    ipBlacklist: [
      '192.168.2.100',
      '10.1.0.0/16'
    ]
  }
})

// 方法级黑名单
@IpBlacklist(['192.168.2.100'])
@Get('restricted')
restricted() {
  return { message: 'restricted data' };
}
```

#### 自动封禁
```typescript
// 配置自动封禁
RateLimiterModule.forRoot({
  security: {
    autoBan: {
      enabled: true,
      threshold: 10,     // 失败次数阈值
      duration: 3600,    // 封禁时长（秒）
      window: 300        // 检查窗口（秒）
    }
  }
})
```

### API密钥认证

#### 配置API密钥
```typescript
RateLimiterModule.forRoot({
  apiKey: {
    enabled: true,
    header: 'X-API-Key',
    queryParam: 'api_key'
  }
})
```

#### 使用API密钥
```typescript
// 请求头方式
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/data

// 查询参数方式
curl http://localhost:3000/api/data?api_key=your-api-key
```

## 监控和指标

### 内置指标

系统自动收集以下指标：

- **请求统计**：总请求数、成功数、失败数
- **限流统计**：限流次数、限流率、恢复时间
- **安全统计**：安全事件、封禁次数、白名单命中
- **性能指标**：响应时间、处理时间、队列长度

### 获取统计信息

```typescript
@Injectable()
export class MonitoringService {
  constructor(private rateLimiterService: RateLimiterService) {}

  async getSystemStats() {
    const stats = await this.rateLimiterService.getStats();
    return {
      requests: stats.totalRequests,
      rateLimited: stats.rateLimitedRequests,
      rateLimitRate: stats.rateLimitedRequests / stats.totalRequests,
      avgResponseTime: stats.avgResponseTime,
      activeConnections: stats.activeConnections
    };
  }

  async getHealthStatus() {
    const health = await this.rateLimiterService.getHealth();
    return {
      status: health.status,
      redis: health.redis,
      memory: health.memory,
      uptime: health.uptime
    };
  }
}
```

### Prometheus集成

```typescript
// 启用Prometheus指标
RateLimiterModule.forRoot({
  monitoring: {
    prometheus: {
      enabled: true,
      port: 9090,
      path: '/metrics'
    }
  }
})
```

指标示例：
```
# 请求总数
http_requests_total{method="GET",status="200"} 1000

# 限流次数
rate_limit_exceeded_total{endpoint="/api/data"} 50

# 响应时间
http_request_duration_seconds{method="GET"} 0.1
```

## 告警配置

### 邮件告警
```typescript
RateLimiterModule.forRoot({
  alerting: {
    email: {
      enabled: true,
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        user: 'alerts@example.com',
        password: 'password'
      },
      recipients: ['admin@example.com'],
      templates: {
        rateLimitExceeded: 'rate-limit-alert.html',
        securityEvent: 'security-alert.html'
      }
    }
  }
})
```

### Slack告警
```typescript
RateLimiterModule.forRoot({
  alerting: {
    slack: {
      enabled: true,
      webhookUrl: 'https://hooks.slack.com/services/...',
      channel: '#alerts',
      username: 'RateLimiter Bot'
    }
  }
})
```

### 自定义Webhook
```typescript
RateLimiterModule.forRoot({
  alerting: {
    webhook: {
      enabled: true,
      url: 'https://your-webhook-endpoint.com/alerts',
      headers: {
        'Authorization': 'Bearer your-token'
      }
    }
  }
})
```

## 最佳实践

### 1. 限流策略设计

#### 分层限流
```typescript
// 全局限流（最外层）
@GlobalRateLimit({ limit: 10000, window: 60 })

// API限流（中间层）
@ApiRateLimit({ limit: 1000, window: 60 })

// 用户限流（最内层）
@UserRateLimit({ limit: 100, window: 60 })
```

#### 差异化限流
```typescript
// 根据用户类型设置不同限制
@RoleBasedRateLimit({
  guest: { limit: 10, window: 60 },
  user: { limit: 100, window: 60 },
  premium: { limit: 500, window: 60 },
  admin: { limit: -1, window: 60 }
})
```

### 2. 安全配置

#### 生产环境安全
```typescript
RateLimiterModule.forRoot({
  security: {
    requireHttps: true,
    maxRequestSize: 1024 * 1024, // 1MB
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    ipWhitelist: ['trusted-ip-range'],
    autoBan: {
      enabled: true,
      threshold: 5,
      duration: 3600
    }
  }
})
```

#### 开发环境配置
```typescript
RateLimiterModule.forRoot({
  security: {
    requireHttps: false,
    ipWhitelist: ['127.0.0.1', '::1'],
    autoBan: {
      enabled: false
    }
  }
})
```

### 3. 性能优化

#### Redis优化
```typescript
RateLimiterModule.forRoot({
  redis: {
    host: 'redis-cluster',
    port: 6379,
    password: 'password',
    db: 0,
    keyPrefix: 'rl:',
    // 连接池配置
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: null,
    // 集群配置
    enableOfflineQueue: false
  }
})
```

#### 内存优化
```typescript
RateLimiterModule.forRoot({
  performance: {
    // 使用压缩存储
    compression: true,
    // 批量操作
    batchSize: 100,
    // 异步处理
    asyncProcessing: true,
    // 缓存优化
    cacheSize: 10000,
    cacheTtl: 300
  }
})
```

### 4. 监控和调试

#### 详细日志
```typescript
RateLimiterModule.forRoot({
  logging: {
    level: 'debug',
    includeHeaders: true,
    includeBody: false,
    logRateLimitHits: true,
    logSecurityEvents: true
  }
})
```

#### 健康检查
```typescript
@Get('health')
async healthCheck() {
  const health = await this.rateLimiterService.getHealth();
  return {
    status: health.status,
    timestamp: new Date().toISOString(),
    checks: {
      redis: health.redis,
      memory: health.memory,
      rateLimiter: health.rateLimiter
    }
  };
}
```

## 故障排除

### 常见问题

#### 1. Redis连接失败
```bash
# 检查Redis连接
redis-cli -h localhost -p 6379 ping

# 检查Redis配置
redis-cli config get "*"
```

#### 2. 限流不生效
- 检查装饰器配置
- 验证Redis键值
- 查看日志输出

#### 3. 性能问题
- 监控Redis性能
- 检查网络延迟
- 优化算法选择

#### 4. 内存泄漏
- 监控内存使用
- 检查缓存清理
- 调整TTL设置

### 调试工具

#### 限流状态查询
```typescript
// 查询特定键的限流状态
const status = await rateLimiterService.getStatus('user:123');
console.log('Remaining:', status.remaining);
console.log('Reset time:', status.resetTime);

// 查询所有活跃的限流键
const activeKeys = await rateLimiterService.getActiveKeys();
console.log('Active keys:', activeKeys);
```

#### 性能分析
```typescript
// 启用性能分析
RateLimiterModule.forRoot({
  profiling: {
    enabled: true,
    sampleRate: 0.1, // 10%采样
    includeStackTrace: true
  }
})
```

## API参考

### RateLimiterService

#### 方法列表

```typescript
interface RateLimiterService {
  // 检查限流
  checkLimit(config: RateLimitConfig): Promise<RateLimitResult>;
  
  // 重置限流
  resetLimit(key: string): Promise<void>;
  
  // 获取状态
  getStatus(key: string): Promise<RateLimitStatus>;
  
  // 获取统计
  getStats(): Promise<RateLimitStats>;
  
  // 获取健康状态
  getHealth(): Promise<RateLimitHealth>;
  
  // 清理过期数据
  cleanup(): Promise<void>;
}
```

### 装饰器选项

```typescript
interface RateLimitOptions {
  limit: number;           // 限制数量
  window: number;          // 时间窗口（秒）
  algorithm?: string;      // 算法类型
  keyGenerator?: Function; // 键生成器
  skipIf?: Function;       // 跳过条件
  message?: string;        // 错误消息
  headers?: boolean;       // 是否设置响应头
}
```

## 更新日志

### v1.0.0
- 初始版本发布
- 支持四种限流算法
- 基础安全防护功能
- Redis分布式存储

### v1.1.0
- 添加API密钥认证
- 增强监控功能
- 支持Prometheus集成
- 优化性能

### v1.2.0
- 添加告警功能
- 支持集群模式
- 增强安全防护
- 改进文档

## 许可证

MIT License