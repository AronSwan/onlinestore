# JWT 安全配置指南

## 概述

本文档详细说明了 JWT 认证系统的安全配置要求和实施方案。

## 🔐 核心安全配置

### 1. 算法配置

#### 生产环境推荐配置
```typescript
export const JWT_SECURITY_CONFIG = {
  // 主要算法配置
  algorithm: 'RS256',
  
  // 备用算法（用于密钥轮换期间）
  fallbackAlgorithm: 'RS256',
  
  // 禁用的不安全算法
  disabledAlgorithms: ['none', 'HS256'],
  
  // 密钥配置
  keys: {
    // 当前活跃密钥
    current: {
      keyId: 'rsa-key-2024-01',
      algorithm: 'RS256',
      keySize: 4096
    },
    
    // 轮换密钥
    rotation: {
      keyId: 'rsa-key-2024-02',
      algorithm: 'RS256',
      keySize: 4096,
      activationDate: '2024-07-01T00:00:00Z'
    }
  }
};
```

### 2. 令牌生命周期配置

#### 访问令牌配置
```typescript
export const ACCESS_TOKEN_CONFIG = {
  // 过期时间：15分钟
  expiresIn: '15m',
  
  // 算法
  algorithm: 'RS256',
  
  // 发行者
  issuer: process.env.JWT_ISSUER || 'https://api.yourapp.com',
  
  // 受众
  audience: process.env.JWT_AUDIENCE || 'https://yourapp.com',
  
  // 密钥ID
  keyId: process.env.JWT_ACCESS_KEY_ID || 'access-key-2024',
  
  // 时钟容差（秒）
  clockTolerance: 30,
  
  // 最大令牌年龄（秒）
  maxAge: 900 // 15分钟
};
```

#### 刷新令牌配置
```typescript
export const REFRESH_TOKEN_CONFIG = {
  // 过期时间：7天
  expiresIn: '7d',
  
  // 算法
  algorithm: 'RS256',
  
  // 发行者
  issuer: process.env.JWT_ISSUER || 'https://api.yourapp.com',
  
  // 受众
  audience: process.env.JWT_AUDIENCE || 'https://yourapp.com',
  
  // 密钥ID
  keyId: process.env.JWT_REFRESH_KEY_ID || 'refresh-key-2024',
  
  // 时钟容差（秒）
  clockTolerance: 60,
  
  // 最大令牌年龄（秒）
  maxAge: 604800, // 7天
  
  // 单次使用（刷新后立即失效）
  singleUse: true
};
```

### 3. 密钥管理配置

#### RSA 密钥对配置
```typescript
export const RSA_KEY_CONFIG = {
  // 密钥长度
  keySize: 4096,
  
  // 密钥格式
  format: 'pem',
  
  // 密钥编码
  encoding: 'utf8',
  
  // 密钥轮换周期（月）
  rotationPeriodMonths: 6,
  
  // 密钥存储配置
  storage: {
    // 私钥存储（仅认证服务）
    privateKey: {
      source: 'env', // 'env', 'file', 'vault'
      envVar: 'JWT_PRIVATE_KEY',
      filePath: '/secrets/jwt-private.pem',
      vaultPath: 'secret/jwt/private-key'
    },
    
    // 公钥存储（所有验证服务）
    publicKey: {
      source: 'env', // 'env', 'file', 'vault', 'jwks'
      envVar: 'JWT_PUBLIC_KEY',
      filePath: '/secrets/jwt-public.pem',
      vaultPath: 'secret/jwt/public-key',
      jwksUrl: 'https://api.yourapp.com/.well-known/jwks.json'
    }
  }
};
```

### 4. 验证配置

#### 令牌验证规则
```typescript
export const TOKEN_VALIDATION_CONFIG = {
  // 必需的声明
  requiredClaims: ['iss', 'sub', 'aud', 'exp', 'iat', 'jti'],
  
  // 声明验证规则
  claimValidation: {
    // 发行者验证
    issuer: {
      required: true,
      allowedValues: [process.env.JWT_ISSUER]
    },
    
    // 受众验证
    audience: {
      required: true,
      allowedValues: [process.env.JWT_AUDIENCE]
    },
    
    // 主题验证
    subject: {
      required: true,
      pattern: /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i // UUID v4
    },
    
    // JWT ID验证
    jwtId: {
      required: true,
      minLength: 16,
      pattern: /^[a-zA-Z0-9_-]+$/
    }
  },
  
  // 时间验证
  timeValidation: {
    clockTolerance: 30, // 秒
    maxTokenAge: 86400, // 24小时
    requireNotBefore: true,
    requireIssuedAt: true
  }
};
```

### 5. 安全增强配置

#### 令牌撤销配置
```typescript
export const TOKEN_REVOCATION_CONFIG = {
  // 启用令牌撤销
  enabled: true,
  
  // 黑名单存储
  blacklist: {
    // 存储类型：'redis', 'memory', 'database'
    storage: 'redis',
    
    // Redis配置
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB) || 0,
      keyPrefix: 'jwt:blacklist:'
    },
    
    // 清理策略
    cleanup: {
      // 自动清理过期条目
      autoCleanup: true,
      
      // 清理间隔（小时）
      cleanupInterval: 1
    }
  },
  
  // 撤销事件
  events: {
    // 用户注销
    onLogout: true,
    
    // 密码更改
    onPasswordChange: true,
    
    // 权限变更
    onPermissionChange: true,
    
    // 账户禁用
    onAccountDisable: true
  }
};
```

#### 速率限制配置
```typescript
export const RATE_LIMIT_CONFIG = {
  // 令牌验证速率限制
  tokenValidation: {
    // 每分钟最大验证次数
    maxAttempts: 100,
    
    // 时间窗口（秒）
    windowSeconds: 60,
    
    // 阻断时间（秒）
    blockDuration: 300
  },
  
  // 令牌刷新速率限制
  tokenRefresh: {
    // 每小时最大刷新次数
    maxAttempts: 10,
    
    // 时间窗口（秒）
    windowSeconds: 3600,
    
    // 阻断时间（秒）
    blockDuration: 1800
  },
  
  // 登录速率限制
  login: {
    // 每15分钟最大登录尝试次数
    maxAttempts: 5,
    
    // 时间窗口（秒）
    windowSeconds: 900,
    
    // 阻断时间（秒）
    blockDuration: 3600
  }
};
```

## 🛡️ 环境变量配置

### 必需的环境变量
```bash
# JWT 基础配置
JWT_ALGORITHM=RS256
JWT_ISSUER=https://api.yourapp.com
JWT_AUDIENCE=https://yourapp.com

# 密钥配置
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
JWT_ACCESS_KEY_ID=access-key-2024
JWT_REFRESH_KEY_ID=refresh-key-2024

# 令牌过期时间
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d

# 安全配置
JWT_CLOCK_TOLERANCE=30
JWT_MAX_TOKEN_AGE=86400
JWT_ENABLE_BLACKLIST=true

# Redis 配置（用于黑名单）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# 监控配置
JWT_ENABLE_METRICS=true
JWT_LOG_LEVEL=info
```

### 可选的环境变量
```bash
# 高级安全配置
JWT_ENABLE_VERSION_CHECK=true
JWT_ENABLE_IP_BINDING=false
JWT_ENABLE_DEVICE_BINDING=false

# 性能配置
JWT_CACHE_PUBLIC_KEYS=true
JWT_CACHE_TTL=3600
JWT_PARALLEL_VALIDATION=true

# 调试配置
JWT_DEBUG_MODE=false
JWT_LOG_TOKENS=false
JWT_TRACE_VALIDATION=false
```

## 🔧 配置验证

### 配置验证器
```typescript
import Joi from 'joi';

export const JWT_CONFIG_SCHEMA = Joi.object({
  algorithm: Joi.string().valid('RS256', 'ES256').required(),
  issuer: Joi.string().uri().required(),
  audience: Joi.string().uri().required(),
  
  privateKey: Joi.string().pattern(/^-----BEGIN (RSA )?PRIVATE KEY-----/).required(),
  publicKey: Joi.string().pattern(/^-----BEGIN PUBLIC KEY-----/).required(),
  
  accessToken: Joi.object({
    expiresIn: Joi.string().pattern(/^\d+[smhd]$/).required(),
    keyId: Joi.string().min(8).required()
  }).required(),
  
  refreshToken: Joi.object({
    expiresIn: Joi.string().pattern(/^\d+[smhd]$/).required(),
    keyId: Joi.string().min(8).required()
  }).required(),
  
  security: Joi.object({
    clockTolerance: Joi.number().min(0).max(300).default(30),
    maxTokenAge: Joi.number().min(300).max(86400).default(86400),
    enableBlacklist: Joi.boolean().default(true)
  }).default()
});

export function validateJwtConfig(config: any): void {
  const { error } = JWT_CONFIG_SCHEMA.validate(config);
  if (error) {
    throw new Error(`JWT configuration validation failed: ${error.message}`);
  }
}
```

## 📊 安全监控配置

### 监控指标配置
```typescript
export const MONITORING_CONFIG = {
  // 指标收集
  metrics: {
    enabled: true,
    
    // 收集的指标
    collect: [
      'token_validation_attempts',
      'token_validation_successes',
      'token_validation_failures',
      'token_refresh_attempts',
      'token_blacklist_hits',
      'key_rotation_events'
    ],
    
    // 指标导出
    export: {
      prometheus: true,
      cloudwatch: false,
      datadog: false
    }
  },
  
  // 告警配置
  alerts: {
    // 验证失败率告警
    validationFailureRate: {
      threshold: 0.1, // 10%
      window: '5m',
      severity: 'warning'
    },
    
    // 异常验证尝试告警
    suspiciousActivity: {
      threshold: 100,
      window: '1m',
      severity: 'critical'
    },
    
    // 密钥轮换提醒
    keyRotationDue: {
      daysBeforeExpiry: 30,
      severity: 'info'
    }
  }
};
```

### 日志配置
```typescript
export const LOGGING_CONFIG = {
  // 日志级别
  level: process.env.JWT_LOG_LEVEL || 'info',
  
  // 日志格式
  format: 'json',
  
  // 日志输出
  outputs: ['console', 'file'],
  
  // 文件日志配置
  file: {
    path: '/var/log/jwt-security.log',
    maxSize: '100MB',
    maxFiles: 10,
    compress: true
  },
  
  // 敏感信息过滤
  sanitize: {
    // 不记录完整令牌
    truncateTokens: true,
    
    // 令牌预览长度
    tokenPreviewLength: 20,
    
    // 过滤的字段
    excludeFields: ['password', 'privateKey', 'secret']
  },
  
  // 安全事件日志
  securityEvents: {
    enabled: true,
    
    // 记录的事件
    events: [
      'token_validation_failure',
      'suspicious_activity',
      'key_rotation',
      'blacklist_addition',
      'rate_limit_exceeded'
    ]
  }
};
```

## 🚀 部署配置

### Docker 配置
```dockerfile
# JWT 安全配置的 Docker 环境变量
ENV JWT_ALGORITHM=RS256
ENV JWT_ISSUER=https://api.yourapp.com
ENV JWT_AUDIENCE=https://yourapp.com
ENV JWT_ACCESS_TOKEN_EXPIRES_IN=15m
ENV JWT_REFRESH_TOKEN_EXPIRES_IN=7d
ENV JWT_CLOCK_TOLERANCE=30
ENV JWT_ENABLE_BLACKLIST=true

# 密钥挂载点
VOLUME ["/secrets"]

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health/jwt || exit 1
```

### Kubernetes 配置
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: jwt-keys
type: Opaque
data:
  private-key: <base64-encoded-private-key>
  public-key: <base64-encoded-public-key>

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: jwt-config
data:
  JWT_ALGORITHM: "RS256"
  JWT_ISSUER: "https://api.yourapp.com"
  JWT_AUDIENCE: "https://yourapp.com"
  JWT_ACCESS_TOKEN_EXPIRES_IN: "15m"
  JWT_REFRESH_TOKEN_EXPIRES_IN: "7d"
  JWT_CLOCK_TOLERANCE: "30"
  JWT_ENABLE_BLACKLIST: "true"
```

## 📋 配置检查清单

### 部署前检查
- [ ] 算法设置为 RS256 或更强
- [ ] 密钥长度至少 2048 位（推荐 4096 位）
- [ ] 私钥安全存储且仅认证服务可访问
- [ ] 公钥正确分发给所有验证服务
- [ ] 令牌过期时间合理设置
- [ ] 发行者和受众正确配置
- [ ] 时钟容差适当设置
- [ ] 令牌撤销机制已启用
- [ ] 速率限制已配置
- [ ] 监控和日志已启用

### 运行时检查
- [ ] 配置验证通过
- [ ] 密钥轮换计划已制定
- [ ] 监控告警正常工作
- [ ] 日志记录正常
- [ ] 性能指标在预期范围内
- [ ] 安全事件得到及时响应

## 相关文档

- [JWT 迁移指南](./JWT_MIGRATION_GUIDE.md)
- [JWT 最佳实践](./JWT_BEST_PRACTICES.md)
- [密钥管理指南](./KEY_MANAGEMENT_GUIDE.md)