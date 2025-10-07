# JWT 迁移指南：从 HS256 到 RS256

## 概述

本指南详细说明如何将 JWT 认证策略从 HS256（对称加密）升级到 RS256（非对称加密），以提高安全性和可扩展性。

## 为什么要升级到 RS256？

### HS256 的局限性
- **密钥共享风险**：所有服务都需要共享同一个密钥
- **密钥轮换困难**：更换密钥需要同时更新所有服务
- **安全性较低**：对称加密在分布式环境中存在安全隐患

### RS256 的优势
- **密钥分离**：私钥用于签名，公钥用于验证
- **更高安全性**：私钥只需在认证服务中保存
- **易于扩展**：新服务只需公钥即可验证令牌
- **密钥轮换简单**：只需更新公钥分发

## 迁移步骤

### 1. 生成 RSA 密钥对

使用提供的脚本生成密钥对：

```bash
# 在 backend 目录下执行
node scripts/generate-jwt-keys.js
```

这将生成：
- `jwt-private.key`：RSA 私钥文件
- `jwt-public.key`：RSA 公钥文件
- `.env.jwt`：环境变量配置示例

### 2. 配置环境变量

将生成的密钥添加到环境变量中：

```bash
# .env 文件
JWT_ALGORITHM=RS256
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----"

JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAr7eUkS...
-----END PUBLIC KEY-----"

# 可选：保留 JWT_SECRET 以支持向后兼容
JWT_SECRET=your-fallback-secret-for-hs256
```

### 3. 验证配置

运行配置验证器确保设置正确：

```typescript
import { ConfigurationValidator } from './src/config/configuration.validator';

const result = ConfigurationValidator.validateJwtConfig();
console.log('JWT配置验证结果:', result);
```

### 4. 渐进式迁移策略

#### 阶段 1：双算法支持
- 保持 HS256 用于现有令牌验证
- 新令牌使用 RS256 签名
- 逐步过渡用户会话

#### 阶段 2：完全切换
- 所有新令牌使用 RS256
- 停止签发 HS256 令牌
- 保持 HS256 验证直到所有旧令牌过期

#### 阶段 3：清理
- 移除 HS256 支持
- 清理相关配置和代码

## 配置文件更新

### security.constants.ts
```typescript
export const SECURITY_CONSTANTS = {
  JWT: {
    ALGORITHM: 'RS256' as const,
    KEY_SIZE: 2048,
    KEY_FORMAT: 'pkcs8' as const,
    PUBLIC_KEY_FORMAT: 'spki' as const,
  }
};
```

### configuration.ts
```typescript
export interface JwtConfig {
  algorithm: 'HS256' | 'RS256';
  privateKey?: string;  // RS256 私钥
  publicKey?: string;   // RS256 公钥
  secret?: string;      // HS256 密钥（向后兼容）
  expiresIn: string;
  issuer: string;
  audience: string;
}
```

## 代码更新示例

### JWT 服务更新
```typescript
@Injectable()
export class JwtService {
  async generateToken(payload: JwtPayload): Promise<string> {
    const privateKey = await this.getPrivateKey();
    
    return jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      expiresIn: this.configService.get('JWT_EXPIRES_IN'),
      issuer: this.configService.get('JWT_ISSUER'),
      audience: this.configService.get('JWT_AUDIENCE'),
      keyid: 'main-key'
    });
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    const publicKey = await this.getPublicKey();
    
    return jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: this.configService.get('JWT_ISSUER'),
      audience: this.configService.get('JWT_AUDIENCE'),
      clockTolerance: 30
    }) as JwtPayload;
  }
}
```

### JWT 策略更新
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const algorithm = configService.get<string>('JWT_ALGORITHM', 'RS256');
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: algorithm === 'RS256' 
        ? configService.get<string>('JWT_PUBLIC_KEY')
        : configService.get<string>('JWT_SECRET'),
      algorithms: [algorithm],
      issuer: configService.get<string>('JWT_ISSUER'),
      audience: configService.get<string>('JWT_AUDIENCE'),
    });
  }
}
```

## 测试验证

### 单元测试更新
```typescript
describe('JwtService with RS256', () => {
  beforeEach(() => {
    process.env.JWT_ALGORITHM = 'RS256';
    process.env.JWT_PRIVATE_KEY = mockPrivateKey;
    process.env.JWT_PUBLIC_KEY = mockPublicKey;
  });

  it('should generate and verify RS256 tokens', async () => {
    const payload = { sub: 'user123', username: 'testuser' };
    const token = await jwtService.generateToken(payload);
    const decoded = await jwtService.verifyToken(token);
    
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.username).toBe(payload.username);
  });
});
```

### 集成测试
```typescript
describe('Authentication with RS256', () => {
  it('should authenticate with RS256 token', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'testuser', password: 'password' })
      .expect(200);

    const token = loginResponse.body.accessToken;
    
    // 验证令牌格式和算法
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
    expect(header.alg).toBe('RS256');
    
    // 使用令牌访问受保护资源
    await request(app.getHttpServer())
      .get('/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
```

## 部署注意事项

### 1. 密钥管理
- 私钥必须安全存储，建议使用密钥管理服务
- 公钥可以公开分发给需要验证令牌的服务
- 定期轮换密钥对

### 2. 监控和日志
- 监控令牌验证失败率
- 记录算法切换过程中的异常
- 跟踪不同算法令牌的使用情况

### 3. 回滚计划
- 保留 HS256 配置作为紧急回滚选项
- 准备快速切换脚本
- 确保所有环境都有相同的迁移状态

## 常见问题

### Q: 迁移过程中用户需要重新登录吗？
A: 不需要。系统支持双算法验证，现有 HS256 令牌在过期前仍然有效。

### Q: 如何处理微服务环境中的密钥分发？
A: 使用配置管理系统或密钥管理服务统一分发公钥，私钥只保存在认证服务中。

### Q: RS256 性能如何？
A: RS256 验证性能略低于 HS256，但在现代硬件上差异很小，安全性提升值得这个代价。

### Q: 如何验证迁移成功？
A: 检查新生成的令牌头部 `alg` 字段为 `RS256`，且能正常通过验证。

## 相关文档

- [JWT 最佳实践](./JWT_BEST_PRACTICES.md)
- [密钥管理指南](./KEY_MANAGEMENT_GUIDE.md)
- [安全配置检查清单](./SECURITY_CHECKLIST.md)