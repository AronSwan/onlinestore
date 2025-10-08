# 安全增强方案

> 🔒 **目标**: 构建企业级安全防护体系，达到金融级安全标准  
> 🛡️ **覆盖范围**: 认证授权、数据保护、API安全、基础设施安全  
> 📊 **当前状态**: 已修复100%已知漏洞，需要进一步加强防护

## 🎯 安全目标

### 核心安全指标
| 安全领域 | 当前状态 | 目标状态 | 改进措施 |
|---------|----------|----------|----------|
| 漏洞修复率 | 100% | 100% | 持续安全扫描 |
| 认证安全性 | JWT基础 | 多因子认证 | MFA + 生物识别 |
| 数据加密 | 传输加密 | 端到端加密 | 全链路加密 |
| API安全 | 基础防护 | 企业级防护 | 限流+WAF+监控 |
| 合规性 | 基础合规 | GDPR+SOC2 | 完整合规体系 |

## 🔐 身份认证与授权

### 1. 多因子认证(MFA)实现

#### JWT增强安全配置
```typescript
// src/auth/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userService: UserService,
    private readonly securityService: SecurityService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
      algorithms: ['HS256'],
      // 增强安全配置
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
      clockTolerance: 0, // 不允许时钟偏差
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    // 1. 验证用户是否存在且活跃
    const user = await this.userService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    // 2. 验证token是否在黑名单中
    const isBlacklisted = await this.securityService.isTokenBlacklisted(payload.jti);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token已失效');
    }

    // 3. 验证设备指纹
    const deviceFingerprint = payload.deviceFingerprint;
    if (deviceFingerprint && !await this.securityService.validateDeviceFingerprint(user.id, deviceFingerprint)) {
      throw new UnauthorizedException('设备验证失败');
    }

    // 4. 检查异常登录
    await this.securityService.checkSuspiciousActivity(user.id, payload);

    return user;
  }
}
```

#### 多因子认证服务
```typescript
@Injectable()
export class MfaService {
  constructor(
    private readonly userService: UserService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
    private readonly totpService: TotpService,
  ) {}

  async enableMfa(userId: string, method: MfaMethod): Promise<MfaSetupResponse> {
    const user = await this.userService.findById(userId);
    
    switch (method) {
      case MfaMethod.TOTP:
        return await this.setupTotp(user);
      case MfaMethod.SMS:
        return await this.setupSms(user);
      case MfaMethod.EMAIL:
        return await this.setupEmail(user);
      default:
        throw new BadRequestException('不支持的MFA方法');
    }
  }

  private async setupTotp(user: User): Promise<MfaSetupResponse> {
    const secret = this.totpService.generateSecret();
    const qrCode = await this.totpService.generateQrCode(user.email, secret);
    
    // 临时存储secret，等待验证
    await this.userService.setTempMfaSecret(user.id, secret);
    
    return {
      method: MfaMethod.TOTP,
      qrCode,
      backupCodes: this.generateBackupCodes(),
    };
  }

  async verifyMfa(userId: string, code: string, method: MfaMethod): Promise<boolean> {
    const user = await this.userService.findById(userId);
    
    switch (method) {
      case MfaMethod.TOTP:
        return await this.totpService.verify(user.mfaSecret, code);
      case MfaMethod.SMS:
        return await this.verifySmsCode(userId, code);
      case MfaMethod.EMAIL:
        return await this.verifyEmailCode(userId, code);
      default:
        return false;
    }
  }

  private generateBackupCodes(): string[] {
    return Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );
  }
}
```

### 2. 基于角色的访问控制(RBAC)

#### 权限管理系统
```typescript
// src/auth/rbac/rbac.service.ts
@Injectable()
export class RbacService {
  constructor(
    private readonly userService: UserService,
    private readonly roleService: RoleService,
    private readonly permissionService: PermissionService,
  ) {}

  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    // 1. 获取用户角色
    const userRoles = await this.userService.getUserRoles(userId);
    
    // 2. 获取角色权限
    const permissions = await this.roleService.getRolePermissions(userRoles);
    
    // 3. 检查权限
    return permissions.some(permission => 
      permission.resource === resource && 
      permission.actions.includes(action)
    );
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const userRoles = await this.userService.getUserRoles(userId);
    return await this.roleService.getRolePermissions(userRoles);
  }
}

// 权限装饰器
export const RequirePermission = (resource: string, action: string) => {
  return applyDecorators(
    SetMetadata('permission', { resource, action }),
    UseGuards(PermissionGuard),
  );
};

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.get<{resource: string; action: string}>(
      'permission',
      context.getHandler(),
    );

    if (!permission) {
      return true; // 没有权限要求的接口允许访问
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    return await this.rbacService.checkPermission(
      user.id,
      permission.resource,
      permission.action,
    );
  }
}
```

## 🛡️ API安全防护

### 1. 请求限流和防护

#### 智能限流中间件
```typescript
@Injectable()
export class RateLimitService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async checkRateLimit(
    identifier: string,
    windowMs: number,
    maxRequests: number,
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // 使用Redis滑动窗口算法
    const pipeline = this.redis.pipeline();
    
    // 移除过期的请求记录
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // 添加当前请求
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // 获取当前窗口内的请求数
    pipeline.zcard(key);
    
    // 设置过期时间
    pipeline.expire(key, Math.ceil(windowMs / 1000));
    
    const results = await pipeline.exec();
    const currentRequests = results[2][1] as number;
    
    const allowed = currentRequests <= maxRequests;
    const remaining = Math.max(0, maxRequests - currentRequests);
    const resetTime = now + windowMs;

    return { allowed, remaining, resetTime };
  }
}

@Injectable()
export class SmartRateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly securityService: SecurityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // 获取客户端标识
    const clientId = this.getClientIdentifier(request);
    
    // 动态限流策略
    const { windowMs, maxRequests } = await this.getDynamicLimits(request);
    
    const result = await this.rateLimitService.checkRateLimit(
      clientId,
      windowMs,
      maxRequests,
    );

    // 设置响应头
    response.setHeader('X-RateLimit-Limit', maxRequests);
    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      // 记录限流事件
      await this.securityService.logRateLimitExceeded(clientId, request);
      throw new TooManyRequestsException('请求过于频繁，请稍后再试');
    }

    return true;
  }

  private getClientIdentifier(request: any): string {
    // 优先使用用户ID，其次使用IP
    if (request.user?.id) {
      return `user:${request.user.id}`;
    }
    
    const ip = request.ip || request.connection.remoteAddress;
    return `ip:${ip}`;
  }

  private async getDynamicLimits(request: any): Promise<{windowMs: number; maxRequests: number}> {
    // 根据用户类型和端点调整限流策略
    const isAuthenticated = !!request.user;
    const isApiEndpoint = request.path.startsWith('/api/');
    
    if (isAuthenticated) {
      return { windowMs: 60000, maxRequests: 1000 }; // 认证用户：1000/分钟
    } else if (isApiEndpoint) {
      return { windowMs: 60000, maxRequests: 100 };  // API访问：100/分钟
    } else {
      return { windowMs: 60000, maxRequests: 200 };  // 普通访问：200/分钟
    }
  }
}
```

### 2. 输入验证和清理

#### 安全验证管道
```typescript
@Injectable()
export class SecurityValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): any {
    if (!value) return value;

    // 1. XSS防护
    if (typeof value === 'string') {
      value = this.sanitizeString(value);
    } else if (typeof value === 'object') {
      value = this.sanitizeObject(value);
    }

    // 2. SQL注入防护
    value = this.preventSqlInjection(value);

    // 3. 路径遍历防护
    value = this.preventPathTraversal(value);

    return value;
  }

  private sanitizeString(str: string): string {
    // 移除潜在的XSS攻击代码
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  private sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    return obj;
  }

  private preventSqlInjection(value: any): any {
    if (typeof value === 'string') {
      // 检测SQL注入模式
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b)/i,
        /(UNION\s+SELECT)/i,
        /(\bOR\b\s+\d+\s*=\s*\d+)/i,
        /(\bAND\b\s+\d+\s*=\s*\d+)/i,
      ];

      for (const pattern of sqlPatterns) {
        if (pattern.test(value)) {
          throw new BadRequestException('检测到潜在的SQL注入攻击');
        }
      }
    }
    return value;
  }

  private preventPathTraversal(value: any): any {
    if (typeof value === 'string') {
      // 防止路径遍历攻击
      if (value.includes('../') || value.includes('..\\')) {
        throw new BadRequestException('检测到路径遍历攻击');
      }
    }
    return value;
  }
}
```

## 🔒 数据保护

### 1. 敏感数据加密

#### 字段级加密服务
```typescript
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;

  constructor() {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY环境变量未设置');
    }
  }

  encrypt(text: string): string {
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(this.ivLength);
    
    const cipher = crypto.createCipher(this.algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // 返回: iv + tag + encrypted
    return iv.toString('hex') + tag.toString('hex') + encrypted;
  }

  decrypt(encryptedData: string): string {
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    
    // 解析: iv + tag + encrypted
    const iv = Buffer.from(encryptedData.slice(0, this.ivLength * 2), 'hex');
    const tag = Buffer.from(encryptedData.slice(this.ivLength * 2, (this.ivLength + this.tagLength) * 2), 'hex');
    const encrypted = encryptedData.slice((this.ivLength + this.tagLength) * 2);
    
    const decipher = crypto.createDecipher(this.algorithm, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// 加密装饰器
export function Encrypted() {
  return function (target: any, propertyKey: string) {
    const encryptionService = new EncryptionService();
    
    let value: string;
    
    const getter = function () {
      return value ? encryptionService.decrypt(value) : value;
    };
    
    const setter = function (newValue: string) {
      value = newValue ? encryptionService.encrypt(newValue) : newValue;
    };
    
    Object.defineProperty(target, propertyKey, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true,
    });
  };
}

// 使用示例
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column()
  @Encrypted()
  phone: string; // 自动加密存储

  @Column()
  @Encrypted()
  idCard: string; // 身份证号加密
}
```

### 2. 数据脱敏

#### 数据脱敏服务
```typescript
@Injectable()
export class DataMaskingService {
  maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    
    const [username, domain] = email.split('@');
    const maskedUsername = username.length > 2 
      ? username.substring(0, 2) + '*'.repeat(username.length - 2)
      : username;
    
    return `${maskedUsername}@${domain}`;
  }

  maskPhone(phone: string): string {
    if (!phone || phone.length < 7) return phone;
    
    return phone.substring(0, 3) + '*'.repeat(4) + phone.substring(phone.length - 3);
  }

  maskIdCard(idCard: string): string {
    if (!idCard || idCard.length < 8) return idCard;
    
    return idCard.substring(0, 4) + '*'.repeat(idCard.length - 8) + idCard.substring(idCard.length - 4);
  }

  maskCreditCard(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 8) return cardNumber;
    
    return '*'.repeat(cardNumber.length - 4) + cardNumber.substring(cardNumber.length - 4);
  }

  // 通用脱敏方法
  maskSensitiveData(data: any, maskingRules: MaskingRule[]): any {
    if (!data || typeof data !== 'object') return data;

    const masked = { ...data };
    
    for (const rule of maskingRules) {
      if (masked[rule.field]) {
        masked[rule.field] = this.applyMaskingRule(masked[rule.field], rule);
      }
    }

    return masked;
  }

  private applyMaskingRule(value: string, rule: MaskingRule): string {
    switch (rule.type) {
      case 'email':
        return this.maskEmail(value);
      case 'phone':
        return this.maskPhone(value);
      case 'idCard':
        return this.maskIdCard(value);
      case 'creditCard':
        return this.maskCreditCard(value);
      case 'custom':
        return rule.customMask ? rule.customMask(value) : value;
      default:
        return value;
    }
  }
}

interface MaskingRule {
  field: string;
  type: 'email' | 'phone' | 'idCard' | 'creditCard' | 'custom';
  customMask?: (value: string) => string;
}
```

## 🔍 安全监控

### 1. 安全事件监控

#### 安全监控服务
```typescript
@Injectable()
export class SecurityMonitoringService {
  constructor(
    private readonly logService: LogService,
    private readonly alertService: AlertService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    // 1. 记录安全事件
    await this.logService.logSecurity({
      type: event.type,
      severity: event.severity,
      userId: event.userId,
      ip: event.ip,
      userAgent: event.userAgent,
      details: event.details,
      timestamp: new Date(),
    });

    // 2. 检查是否需要告警
    if (event.severity >= SecuritySeverity.HIGH) {
      await this.alertService.sendSecurityAlert(event);
    }

    // 3. 更新威胁检测计数器
    await this.updateThreatCounters(event);
  }

  async detectSuspiciousActivity(userId: string, activity: ActivityData): Promise<boolean> {
    const suspiciousIndicators = [];

    // 1. 检查异常登录时间
    if (this.isUnusualLoginTime(activity.timestamp)) {
      suspiciousIndicators.push('unusual_login_time');
    }

    // 2. 检查异常地理位置
    if (await this.isUnusualLocation(userId, activity.ip)) {
      suspiciousIndicators.push('unusual_location');
    }

    // 3. 检查设备指纹变化
    if (await this.isUnusualDevice(userId, activity.deviceFingerprint)) {
      suspiciousIndicators.push('unusual_device');
    }

    // 4. 检查行为模式异常
    if (await this.isUnusualBehavior(userId, activity)) {
      suspiciousIndicators.push('unusual_behavior');
    }

    const isSuspicious = suspiciousIndicators.length >= 2;

    if (isSuspicious) {
      await this.logSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.MEDIUM,
        userId,
        ip: activity.ip,
        userAgent: activity.userAgent,
        details: { indicators: suspiciousIndicators },
      });
    }

    return isSuspicious;
  }

  private async updateThreatCounters(event: SecurityEvent): Promise<void> {
    const key = `threat_counter:${event.ip}:${event.type}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, 3600); // 1小时窗口

    // 如果同一IP在1小时内触发同类威胁超过阈值，自动封禁
    const threshold = this.getThreatThreshold(event.type);
    if (count >= threshold) {
      await this.blockIpAddress(event.ip, '自动封禁：威胁行为超过阈值');
    }
  }

  private getThreatThreshold(eventType: SecurityEventType): number {
    const thresholds = {
      [SecurityEventType.FAILED_LOGIN]: 5,
      [SecurityEventType.RATE_LIMIT_EXCEEDED]: 10,
      [SecurityEventType.SUSPICIOUS_ACTIVITY]: 3,
      [SecurityEventType.MALICIOUS_REQUEST]: 1,
    };
    return thresholds[eventType] || 5;
  }
}

enum SecurityEventType {
  FAILED_LOGIN = 'failed_login',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  MALICIOUS_REQUEST = 'malicious_request',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
}

enum SecuritySeverity {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}
```

## 📋 实施计划

### Week 1-2: 认证授权增强
- **Day 1-3**: 实施多因子认证
- **Day 4-6**: 完善RBAC权限系统
- **Day 7**: 安全测试和验证

### Week 3-4: API安全防护
- **Day 1-3**: 部署智能限流系统
- **Day 4-6**: 实施输入验证和清理
- **Day 7**: 安全扫描和修复

### Week 5-6: 数据保护
- **Day 1-3**: 实施数据加密
- **Day 4-6**: 部署数据脱敏
- **Day 7**: 合规性检查

### Week 7-8: 监控告警
- **Day 1-3**: 部署安全监控
- **Day 4-6**: 配置告警系统
- **Day 7**: 整体安全评估

### 验收标准
- [ ] 多因子认证覆盖率100%
- [ ] API安全防护全面部署
- [ ] 敏感数据100%加密
- [ ] 安全监控实时生效
- [ ] 通过第三方安全审计

---

**文档版本**: v1.0  
**最后更新**: 2025-10-07  
**负责人**: 安全团队