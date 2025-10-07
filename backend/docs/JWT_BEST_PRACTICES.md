# JWT 最佳实践指南

## 概述

本文档提供了在生产环境中使用 JWT（JSON Web Token）的最佳实践和安全建议。

## 🔐 安全最佳实践

### 1. 算法选择

#### 推荐算法
- **RS256**：生产环境首选，使用 RSA 公私钥对
- **ES256**：椭圆曲线算法，性能更好
- **HS256**：仅用于单体应用或开发环境

#### 避免的算法
- **none**：绝对禁止在生产环境使用
- **HS256**：在微服务环境中避免使用

### 2. 密钥管理

#### RSA 密钥要求
```bash
# 生成 2048 位 RSA 密钥对（最低要求）
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# 推荐使用 4096 位密钥（更高安全性）
openssl genrsa -out private.pem 4096
openssl rsa -in private.pem -pubout -out public.pem
```

#### 密钥存储
- 使用环境变量或密钥管理服务
- 私钥仅存储在认证服务中
- 公钥可以分发给验证服务
- 定期轮换密钥（建议每 6-12 个月）

### 3. 令牌结构设计

#### 标准声明（Claims）
```typescript
interface JwtPayload {
  // 标准声明
  iss: string;    // 发行者
  sub: string;    // 主题（用户ID）
  aud: string;    // 受众
  exp: number;    // 过期时间
  nbf: number;    // 生效时间
  iat: number;    // 签发时间
  jti: string;    // JWT ID（唯一标识符）
  
  // 自定义声明
  username: string;
  roles: string[];
  permissions: string[];
  tokenVersion: number;
}
```

#### 最小化载荷
- 避免在 JWT 中存储敏感信息
- 保持载荷尽可能小
- 使用引用而非完整数据

### 4. 过期时间策略

#### 访问令牌
- **短期有效**：15-30 分钟
- **用途**：API 访问认证
- **刷新**：通过刷新令牌获取新的访问令牌

#### 刷新令牌
- **长期有效**：7-30 天
- **用途**：获取新的访问令牌
- **存储**：安全存储（HttpOnly Cookie）

```typescript
const tokenConfig = {
  accessToken: {
    expiresIn: '15m',
    algorithm: 'RS256'
  },
  refreshToken: {
    expiresIn: '7d',
    algorithm: 'RS256'
  }
};
```

## 🛡️ 安全防护措施

### 1. 令牌验证

#### 完整验证流程
```typescript
async function validateToken(token: string): Promise<JwtPayload> {
  try {
    // 1. 检查令牌格式
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token format');
    }
    
    // 2. 检查黑名单
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }
    
    // 3. 验证签名和声明
    const payload = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: expectedIssuer,
      audience: expectedAudience,
      clockTolerance: 30
    }) as JwtPayload;
    
    // 4. 检查用户状态
    const user = await getUserById(payload.sub);
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }
    
    // 5. 检查令牌版本
    if (payload.tokenVersion !== user.tokenVersion) {
      throw new Error('Token version mismatch');
    }
    
    return payload;
  } catch (error) {
    throw new UnauthorizedException('Token validation failed');
  }
}
```

### 2. 令牌撤销机制

#### 黑名单实现
```typescript
@Injectable()
export class TokenBlacklistService {
  constructor(private redis: Redis) {}
  
  async addToBlacklist(token: string, expiresAt: Date): Promise<void> {
    const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    await this.redis.setex(`blacklist:${token}`, ttl, '1');
  }
  
  async isBlacklisted(token: string): Promise<boolean> {
    const result = await this.redis.get(`blacklist:${token}`);
    return result === '1';
  }
}
```

### 3. 令牌刷新策略

#### 安全刷新实现
```typescript
async refreshToken(refreshToken: string): Promise<TokenPair> {
  // 验证刷新令牌
  const payload = await this.validateRefreshToken(refreshToken);
  
  // 检查用户状态
  const user = await this.userService.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new UnauthorizedException('User not found or inactive');
  }
  
  // 生成新的令牌对
  const newAccessToken = await this.generateAccessToken(user);
  const newRefreshToken = await this.generateRefreshToken(user);
  
  // 撤销旧的刷新令牌
  await this.blacklistService.addToBlacklist(
    refreshToken, 
    new Date(payload.exp * 1000)
  );
  
  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  };
}
```

## 🚀 性能优化

### 1. 缓存策略

#### 公钥缓存
```typescript
@Injectable()
export class JwtKeyService {
  private publicKeyCache = new Map<string, string>();
  
  async getPublicKey(keyId: string): Promise<string> {
    // 检查缓存
    if (this.publicKeyCache.has(keyId)) {
      return this.publicKeyCache.get(keyId);
    }
    
    // 从密钥服务获取
    const publicKey = await this.fetchPublicKey(keyId);
    
    // 缓存公钥（TTL: 1小时）
    this.publicKeyCache.set(keyId, publicKey);
    setTimeout(() => {
      this.publicKeyCache.delete(keyId);
    }, 3600000);
    
    return publicKey;
  }
}
```

### 2. 批量验证

#### 批量令牌验证
```typescript
async validateTokensBatch(tokens: string[]): Promise<JwtPayload[]> {
  const validationPromises = tokens.map(token => 
    this.validateToken(token).catch(() => null)
  );
  
  const results = await Promise.all(validationPromises);
  return results.filter(result => result !== null);
}
```

## 📊 监控和日志

### 1. 关键指标监控

#### 监控指标
- 令牌验证成功率
- 令牌验证延迟
- 刷新令牌使用频率
- 令牌撤销事件
- 异常验证尝试

#### 监控实现
```typescript
@Injectable()
export class JwtMetricsService {
  private readonly metrics = {
    validationAttempts: 0,
    validationSuccesses: 0,
    validationFailures: 0,
    refreshAttempts: 0
  };
  
  recordValidationAttempt(success: boolean): void {
    this.metrics.validationAttempts++;
    if (success) {
      this.metrics.validationSuccesses++;
    } else {
      this.metrics.validationFailures++;
    }
  }
  
  getSuccessRate(): number {
    return this.metrics.validationSuccesses / this.metrics.validationAttempts;
  }
}
```

### 2. 安全日志

#### 日志记录
```typescript
@Injectable()
export class JwtSecurityLogger {
  private readonly logger = new Logger('JwtSecurity');
  
  logValidationFailure(token: string, error: string, ip: string): void {
    this.logger.warn('JWT validation failed', {
      tokenPreview: token.substring(0, 20) + '...',
      error,
      ip,
      timestamp: new Date().toISOString()
    });
  }
  
  logSuspiciousActivity(event: string, details: any): void {
    this.logger.error('Suspicious JWT activity detected', {
      event,
      details,
      timestamp: new Date().toISOString()
    });
  }
}
```

## 🔧 配置示例

### 生产环境配置
```typescript
export const jwtConfig = {
  algorithm: 'RS256',
  issuer: 'https://api.yourapp.com',
  audience: 'https://yourapp.com',
  accessToken: {
    expiresIn: '15m',
    keyId: 'access-key-2024'
  },
  refreshToken: {
    expiresIn: '7d',
    keyId: 'refresh-key-2024'
  },
  security: {
    clockTolerance: 30,
    maxTokenAge: 86400, // 24小时
    enableBlacklist: true,
    enableVersionCheck: true
  }
};
```

## 📋 安全检查清单

### 部署前检查
- [ ] 使用 RS256 或更强的算法
- [ ] 私钥安全存储
- [ ] 令牌过期时间合理
- [ ] 实现令牌撤销机制
- [ ] 配置适当的声明验证
- [ ] 启用安全日志记录
- [ ] 实现速率限制
- [ ] 配置 HTTPS 传输
- [ ] 测试密钥轮换流程
- [ ] 验证错误处理逻辑

### 运行时监控
- [ ] 监控令牌验证指标
- [ ] 跟踪异常验证尝试
- [ ] 监控令牌刷新频率
- [ ] 检查密钥使用情况
- [ ] 审计安全事件日志

## 相关资源

- [RFC 7519 - JSON Web Token (JWT)](https://tools.ietf.org/html/rfc7519)
- [RFC 7515 - JSON Web Signature (JWS)](https://tools.ietf.org/html/rfc7515)
- [OWASP JWT Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)