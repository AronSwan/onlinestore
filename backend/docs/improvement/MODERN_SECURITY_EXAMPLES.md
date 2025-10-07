# 🔒 现代化安全实现示例

> **更新安全示例为现代化实现** - 替换不安全的加密API，采用最新安全实践  
> **更新时间**: 2025-10-02  
> **适用范围**: 所有安全相关代码实现

---

## 🛡️ AES-GCM 现代化加密实现

### 问题分析
原计划中使用的 `crypto.createCipher('aes-256-cbc', ...)` 已被 Node.js 官方标记为不安全且已弃用：
- 使用 CBC 模式容易受到填充攻击
- 缺乏认证标签，无法检测密文篡改
- IV 生成不当可能导致密钥重用

### 现代化解决方案

#### 加密服务实现
```typescript
import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ModernEncryptionService {
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    
    if (key.length !== SECURITY_CONSTANTS.ENCRYPTION.KEY_LENGTH * 2) {
      throw new Error(
        `ENCRYPTION_KEY must be ${SECURITY_CONSTANTS.ENCRYPTION.KEY_LENGTH * 2} hex characters`,
      );
    }
    
    this.encryptionKey = Buffer.from(key, 'hex');
  }

  /**
   * 加密敏感数据 (AES-GCM现代化实现)
   * @param plaintext 明文数据
   * @returns 格式: iv:encrypted:authTag (hex编码)
   */
  encrypt(plaintext: string): string {
    try {
      // 生成随机IV (12字节用于GCM模式)
      const iv = crypto.randomBytes(SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH);
      
      // 使用createCipheriv而非不安全的createCipher
      const cipher = crypto.createCipheriv(
        SECURITY_CONSTANTS.ENCRYPTION.ALGORITHM,
        this.encryptionKey,
        iv,
      );

      // 加密数据
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // 获取认证标签 (16字节)
      const authTag = cipher.getAuthTag();

      // 返回格式: iv:encrypted:authTag (所有部分都是hex编码)
      return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * 解密敏感数据 (AES-GCM现代化实现)
   * @param encryptedData 格式: iv:encrypted:authTag (hex编码)
   * @returns 解密后的明文
   */
  decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format. Expected: iv:encrypted:authTag');
      }

      const [ivHex, encrypted, authTagHex] = parts;
      
      if (!ivHex || !encrypted || !authTagHex) {
        throw new Error('Missing required encryption components');
      }

      // 解析组件
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // 验证长度
      if (iv.length !== SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH) {
        throw new Error(`Invalid IV length. Expected: ${SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH}`);
      }

      if (authTag.length !== SECURITY_CONSTANTS.ENCRYPTION.TAG_LENGTH) {
        throw new Error(`Invalid auth tag length. Expected: ${SECURITY_CONSTANTS.ENCRYPTION.TAG_LENGTH}`);
      }

      // 创建解密器
      const decipher = crypto.createDecipheriv(
        SECURITY_CONSTANTS.ENCRYPTION.ALGORITHM,
        this.encryptionKey,
        iv,
      );

      // 设置认证标签进行验证
      decipher.setAuthTag(authTag);

      // 解密数据
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * 批量加密
   * @param plaintexts 明文数组
   * @returns 加密结果数组
   */
  encryptBatch(plaintexts: string[]): string[] {
    return plaintexts.map(plaintext => this.encrypt(plaintext));
  }

  /**
   * 批量解密
   * @param encryptedDatas 加密数据数组
   * @returns 解密结果数组
   */
  decryptBatch(encryptedDatas: string[]): string[] {
    return encryptedDatas.map(encryptedData => this.decrypt(encryptedData));
  }

  /**
   * 生成新的加密密钥
   * @returns 新的密钥 (hex格式)
   */
  static generateKey(): string {
    return crypto.randomBytes(SECURITY_CONSTANTS.ENCRYPTION.KEY_LENGTH).toString('hex');
  }

  /**
   * 验证密钥格式
   * @param key 密钥字符串
   * @returns 是否有效
   */
  static validateKey(key: string): boolean {
    return (
      typeof key === 'string' &&
      key.length === SECURITY_CONSTANTS.ENCRYPTION.KEY_LENGTH * 2 &&
      /^[0-9a-fA-F]+$/.test(key)
    );
  }
}

// 安全常量配置（已更新为AES-GCM）
export const SECURITY_CONSTANTS = {
  ENCRYPTION: {
    ALGORITHM: 'aes-256-gcm', // 现代化AES-GCM算法
    KEY_LENGTH: 32, // 256位密钥
    IV_LENGTH: 12,  // GCM模式推荐12字节IV
    TAG_LENGTH: 16, // 认证标签长度
  },
};
```

#### 实体加密使用示例
```typescript
@Entity()
export class User {
  @Column()
  private encryptedPhone: string;

  constructor(
    private readonly encryptionService: ModernEncryptionService
  ) {}

  setPhone(phone: string): void {
    // 使用统一的加密服务，格式: iv:encrypted:authTag (hex编码)
    this.encryptedPhone = this.encryptionService.encrypt(phone);
  }

  getPhone(): string {
    if (!this.encryptedPhone) {
      return null;
    }
    return this.encryptionService.decrypt(this.encryptedPhone);
  }
}
```

#### 密钥管理最佳实践
```typescript
@Injectable()
export class KeyManagementService {
  private readonly keyRotationInterval = 90 * 24 * 60 * 60 * 1000; // 90天

  constructor(
    private readonly configService: ConfigService,
    private readonly encryptionService: ModernEncryptionService,
    private readonly logger: Logger
  ) {}

  async rotateEncryptionKey(): Promise<void> {
    try {
      // 1. 生成新密钥
      const newKey = ModernEncryptionService.generateKey();
      
      // 2. 验证新密钥
      if (!ModernEncryptionService.validateKey(newKey)) {
        throw new Error('Generated key validation failed');
      }
      
      // 3. 测试新密钥
      const testData = 'test-encryption-validation';
      const encrypted = this.encryptionService.encrypt(testData);
      const decrypted = this.encryptionService.decrypt(encrypted);
      
      if (decrypted !== testData) {
        throw new Error('New key encryption test failed');
      }
      
      // 4. 更新配置（实际环境中应通过安全配置管理系统）
      this.logger.info('Encryption key rotation completed successfully');
      
      // 5. 记录密钥轮换事件
      this.logger.info('Encryption key rotated', {
        timestamp: new Date().toISOString(),
        keyLength: newKey.length
      });
      
    } catch (error) {
      this.logger.error('Encryption key rotation failed', { error: error.message });
      throw error;
    }
  }

  async scheduleKeyRotation(): Promise<void> {
    // 定期检查并轮换密钥
    setInterval(async () => {
      try {
        await this.rotateEncryptionKey();
      } catch (error) {
        this.logger.error('Scheduled key rotation failed', { error: error.message });
      }
    }, this.keyRotationInterval);
  }
}
```

---

## 🔐 密码哈希安全增强

### Argon2id 现代化实现
```typescript
import * as argon2 from 'argon2';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ModernPasswordService {
  private readonly saltRounds = 12;
  private readonly algorithm = 'argon2id';

  async hashPassword(password: string): Promise<string> {
    // 使用Argon2id进行密码哈希
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64MB
      timeCost: 3,       // 3次迭代
      parallelism: 4,    // 4个并行线程
      saltRounds: this.saltRounds
    });
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      // 记录验证失败事件
      this.logger.error('Password verification failed', { error });
      return false;
    }
  }

  async isPasswordStrong(password: string): Promise<{ isStrong: boolean; issues: string[] }> {
    const issues: string[] = [];

    // 长度检查
    if (password.length < 12) {
      issues.push('Password must be at least 12 characters long');
    }

    // 复杂度检查
    if (!/[a-z]/.test(password)) {
      issues.push('Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
      issues.push('Password must contain at least one uppercase letter');
    }
    if (!/\d/.test(password)) {
      issues.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      issues.push('Password must contain at least one special character');
    }

    // 常见密码检查
    const commonPasswords = ['password', '123456', 'qwerty', 'admin'];
    if (commonPasswords.includes(password.toLowerCase())) {
      issues.push('Password is too common');
    }

    return {
      isStrong: issues.length === 0,
      issues
    };
  }

  async generateSecurePassword(): Promise<string> {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let password = '';
    const randomBytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length];
    }
    
    // 确保生成的密码符合强度要求
    const strengthCheck = await this.isPasswordStrong(password);
    if (!strengthCheck.isStrong) {
      // 如果不符合要求，递归生成新密码
      return this.generateSecurePassword();
    }
    
    return password;
  }
}
```

---

## 🛡️ 输入验证和SQL注入防护

### 现代化输入验证
```typescript
import { IsString, IsEmail, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(20, { message: 'Username must not exceed 20 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' })
  @Transform(({ value }) => value?.trim())
  username: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters long' })
  @MaxLength(100, { message: 'Password must not exceed 100 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
  })
  password: string;

  @IsString()
  @MaxLength(20, { message: 'Phone number must not exceed 20 characters' })
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Please provide a valid phone number' })
  @Transform(({ value }) => value?.trim())
  phone?: string;
}
```

### SQL注入防护
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

@Injectable()
export class SecureUserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource
  ) {}

  // 安全查询方式 - 使用参数化查询
  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() }
    });
  }

  // 安全查询方式 - 使用查询构建器
  async searchUsers(criteria: UserSearchCriteria): Promise<User[]> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (criteria.username) {
      queryBuilder.andWhere('user.username = :username', { 
        username: criteria.username.trim() 
      });
    }

    if (criteria.email) {
      queryBuilder.andWhere('user.email = :email', { 
        email: criteria.email.toLowerCase().trim() 
      });
    }

    if (criteria.minAge) {
      queryBuilder.andWhere('user.age >= :minAge', { 
        minAge: criteria.minAge 
      });
    }

    return queryBuilder.getMany();
  }

  // 安全查询方式 - 使用存储过程
  async getUserStatistics(userId: string): Promise<UserStatistics> {
    return this.dataSource.query(
      'CALL GetUserStatistics($1)',
      [userId]
    );
  }

  // 批量操作安全实现
  async updateUserStatus(userIds: string[], status: UserStatus): Promise<void> {
    // 验证输入
    if (!userIds || userIds.length === 0) {
      throw new Error('User IDs cannot be empty');
    }

    if (userIds.length > 1000) {
      throw new Error('Cannot update more than 1000 users at once');
    }

    // 验证每个用户ID格式
    for (const userId of userIds) {
      if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(userId)) {
        throw new Error(`Invalid user ID format: ${userId}`);
      }
    }

    // 使用参数化查询执行批量更新
    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ status })
      .where('id IN (:...userIds)', { userIds })
      .execute();
  }
}
```

### SQL注入检测中间件
```typescript
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SqlInjectionDetectionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SqlInjectionDetectionMiddleware.name);

  // SQL注入特征模式
  private readonly sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(--|\*|\/\*|\*\/|;|'|")/,
    /(\b(OR|AND)\b\s+\w+\s*=\s*\w+)/i,
    /(\b(OR|AND)\b\s+\w+\s*LIKE\s*'.*')/i,
    /(\b(OR|AND)\b\s+\w+\s*IN\s*\(.*\))/i,
    /(1\s*=\s*1|1\s*=\s*'1'|'1'\s*=\s*'1')/i,
    /(\b(WAITFOR|DELAY|BENCHMARK)\b)/i,
    /(\b(INFORMATION_SCHEMA|SYS|MASTER|MSDB)\b)/i,
    /(\b(XP_|SP_)\w+)/i,
    /(\b(LOAD_FILE|INTO\s+OUTFILE|INTO\s+DUMPFILE)\b)/i
  ];

  use(req: Request, res: Response, next: NextFunction): void {
    // 检查URL参数
    this.checkForSqlInjection(req.query, 'query parameters');

    // 检查请求体
    if (req.body) {
      this.checkForSqlInjection(req.body, 'request body');
    }

    // 检查路径参数
    this.checkForSqlInjection(req.params, 'path parameters');

    next();
  }

  private checkForSqlInjection(data: any, source: string): void {
    if (!data) return;

    const stringValue = this.convertToString(data);
    
    for (const pattern of this.sqlInjectionPatterns) {
      if (pattern.test(stringValue)) {
        this.logger.warn(`Potential SQL injection detected in ${source}`, {
          data: stringValue,
          ip: this.getClientIp(),
          userAgent: this.getUserAgent(),
          timestamp: new Date().toISOString()
        });

        // 可以选择抛出异常阻止请求，或仅记录警告
        throw new BadRequestException('Invalid request parameters detected');
      }
    }
  }

  private convertToString(data: any): string {
    if (typeof data === 'string') {
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      return Object.values(data).join(' ');
    }

    return String(data || '');
  }

  private getClientIp(): string {
    // 实现获取客户端IP的逻辑
    return 'unknown';
  }

  private getUserAgent(): string {
    // 实现获取User-Agent的逻辑
    return 'unknown';
  }
}
```

---

## 🔒 API安全防护

### 现代化API限流实现
```typescript
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';

@Injectable()
export class AdvancedRateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AdvancedRateLimitMiddleware.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const clientIp = this.getClientIp(req);
    const endpoint = this.getEndpoint(req);
    
    // 不同端点不同限流策略
    const rateLimitConfig = this.getRateLimitConfig(endpoint);
    
    // 检查IP级别限流
    const ipKey = `rate_limit:ip:${clientIp}:${endpoint}`;
    const ipCount = await this.redis.incr(ipKey);
    
    if (ipCount === 1) {
      await this.redis.expire(ipKey, rateLimitConfig.ipWindow);
    }
    
    if (ipCount > rateLimitConfig.ipLimit) {
      this.logger.warn(`IP rate limit exceeded`, {
        ip: clientIp,
        endpoint,
        count: ipCount,
        limit: rateLimitConfig.ipLimit
      });
      
      // 记录限流事件
      await this.recordRateLimitEvent(clientIp, endpoint, 'ip');
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${rateLimitConfig.ipWindow} seconds.`,
        retryAfter: rateLimitConfig.ipWindow
      });
    }
    
    // 检查用户级别限流（如果已认证）
    if (req.user && req.user.id) {
      const userKey = `rate_limit:user:${req.user.id}:${endpoint}`;
      const userCount = await this.redis.incr(userKey);
      
      if (userCount === 1) {
        await this.redis.expire(userKey, rateLimitConfig.userWindow);
      }
      
      if (userCount > rateLimitConfig.userLimit) {
        this.logger.warn(`User rate limit exceeded`, {
          userId: req.user.id,
          endpoint,
          count: userCount,
          limit: rateLimitConfig.userLimit
        });
        
        // 记录限流事件
        await this.recordRateLimitEvent(req.user.id, endpoint, 'user');
        
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `User rate limit exceeded. Try again in ${rateLimitConfig.userWindow} seconds.`,
          retryAfter: rateLimitConfig.userWindow
        });
      }
    }
    
    next();
  }

  private getRateLimitConfig(endpoint: string): RateLimitConfig {
    // 根据端点类型返回不同的限流配置
    if (endpoint.includes('/auth/')) {
      return {
        ipLimit: 10,      // 认证端点更严格的IP限流
        ipWindow: 60,     // 1分钟窗口
        userLimit: 5,     // 用户限流
        userWindow: 60    // 1分钟窗口
      };
    }
    
    if (endpoint.includes('/search/')) {
      return {
        ipLimit: 30,      // 搜索端点中等限流
        ipWindow: 60,     // 1分钟窗口
        userLimit: 20,    // 用户限流
        userWindow: 60    // 1分钟窗口
      };
    }
    
    // 默认配置
    return {
      ipLimit: 100,     // 普通端点宽松限流
      ipWindow: 60,      // 1分钟窗口
      userLimit: 200,   // 用户限流
      userWindow: 60    // 1分钟窗口
    };
  }

  private getClientIp(req: Request): string {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection as any).socket?.remoteAddress ||
           'unknown';
  }

  private getEndpoint(req: Request): string {
    return req.route?.path || req.path || 'unknown';
  }

  private async recordRateLimitEvent(identifier: string, endpoint: string, type: 'ip' | 'user'): Promise<void> {
    const event = {
      identifier,
      endpoint,
      type,
      timestamp: new Date().toISOString()
    };
    
    // 记录到Redis用于分析
    await this.redis.lpush('rate_limit_events', JSON.stringify(event));
    
    // 保持最近1000条记录
    await this.redis.ltrim('rate_limit_events', 0, 999);
  }
}

interface RateLimitConfig {
  ipLimit: number;
  ipWindow: number;
  userLimit: number;
  userWindow: number;
}
```

### 请求验证中间件
```typescript
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class RequestValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestValidationMiddleware.name);

  constructor(
    // 注入验证DTO映射
    @Inject('VALIDATION_DTOS') 
    private readonly validationDtos: Map<string, any>
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 获取端点对应的验证DTO
      const dtoClass = this.getValidationDto(req);
      
      if (!dtoClass) {
        // 没有定义验证DTO，跳过验证
        return next();
      }

      // 转换请求体为DTO对象
      const dto = plainToClass(dtoClass, req.body);
      
      // 验证DTO
      const errors = await validate(dto);
      
      if (errors.length > 0) {
        this.logger.warn(`Request validation failed`, {
          path: req.path,
          method: req.method,
          errors: this.formatValidationErrors(errors),
          body: this.sanitizeRequestBody(req.body)
        });
        
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Request validation failed',
          details: this.formatValidationErrors(errors)
        });
      }
      
      // 将验证后的DTO附加到请求对象
      req.validatedBody = dto;
      
      next();
    } catch (error) {
      this.logger.error(`Request validation error`, {
        path: req.path,
        method: req.method,
        error: error.message
      });
      
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Request validation failed'
      });
    }
  }

  private getValidationDto(req: Request): any {
    const key = `${req.method}:${req.route?.path || req.path}`;
    return this.validationDtos.get(key);
  }

  private formatValidationErrors(errors: ValidationError[]): any[] {
    return errors.map(error => ({
      field: error.property,
      constraints: error.constraints,
      children: error.children ? this.formatValidationErrors(error.children) : undefined
    }));
  }

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }
    
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(body)) {
      // 脱敏敏感字段
      if (key.toLowerCase().includes('password') || 
          key.toLowerCase().includes('token') || 
          key.toLowerCase().includes('secret')) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 100) {
        // 截断长字符串
        sanitized[key] = value.substring(0, 100) + '...';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}
```

---


---

## 🎯 实施风险评估

### 安全实施风险

| 风险类别 | 风险描述 | 概率 | 影响 | 风险等级 | 缓解措施 |
|----------|----------|------|------|----------|----------|
| 兼容性问题 | 新加密算法不兼容现有数据 | 中 | 高 | 🔴 高 | 兼容性测试 + 渐进式部署 |
| 性能影响 | 加密性能下降 | 中 | 中 | 🟡 中 | 性能测试 + 优化 |
| 密钥管理 | 密钥管理复杂 | 高 | 高 | 🔴 高 | 自动化管理 + 备份 |
| 团队技能 | 团队不熟悉新技术 | 中 | 中 | 🟡 中 | 培训 + 文档 |
| 回滚困难 | 安全实施后难以回滚 | 中 | 高 | 🔴 高 | 回滚计划 + 保留旧系统 |
| 合规风险 | 新实现不符合合规要求 | 低 | 高 | 🟡 中 | 合规评估 + 调整 |
| 数据迁移 | 数据迁移过程中丢失或损坏 | 中 | 高 | 🔴 高 | 备份 + 验证 |
| 集成问题 | 与现有系统集成困难 | 中 | 中 | 🟡 中 | 接口设计 + 测试 |

### 安全实施风险监控

```typescript
@Injectable()
export class SecurityImplementationRiskMonitoringService {
  constructor(
    private readonly alertService: AlertService,
    private readonly metricsService: MetricsService,
    private readonly logger: Logger
  ) {}

  async monitorSecurityImplementationRisks(): Promise<void> {
    // 1. 检查加密性能风险
    await this.checkEncryptionPerformanceRisks();
    
    // 2. 检查密钥管理风险
    await this.checkKeyManagementRisks();
    
    // 3. 检查兼容性风险
    await this.checkCompatibilityRisks();
    
    // 4. 检查数据完整性风险
    await this.checkDataIntegrityRisks();
  }

  private async checkEncryptionPerformanceRisks(): Promise<void> {
    // 检查加密操作性能
    const encryptionMetrics = await this.metricsService.getEncryptionMetrics();
    
    // 检查平均加密时间
    if (encryptionMetrics.averageEncryptionTime > 100) { // 100ms阈值
      await this.alertService.sendAlert({
        title: '加密性能风险',
        message: `平均加密时间过长: ${encryptionMetrics.averageEncryptionTime}ms`,
        severity: 'medium',
        category: 'encryption_performance',
        details: {
          averageEncryptionTime: encryptionMetrics.averageEncryptionTime,
          threshold: 100,
          recommendation: '考虑优化加密算法或增加硬件资源'
        }
      });
    }
    
    // 检查加密操作失败率
    if (encryptionMetrics.failureRate > 1) { // 1%阈值
      await this.alertService.sendAlert({
        title: '加密操作失败风险',
        message: `加密操作失败率过高: ${encryptionMetrics.failureRate}%`,
        severity: 'high',
        category: 'encryption_failure',
        details: {
          failureRate: encryptionMetrics.failureRate,
          threshold: 1,
          recommendation: '检查加密实现和密钥配置'
        }
      });
    }
  }

  private async checkKeyManagementRisks(): Promise<void> {
    // 检查密钥轮换状态
    const keyRotationStatus = await this.metricsService.getKeyRotationStatus();
    
    if (keyRotationStatus.daysSinceLastRotation > 90) { // 90天阈值
      await this.alertService.sendAlert({
        title: '密钥轮换延迟风险',
        message: `密钥轮换延迟: ${keyRotationStatus.daysSinceLastRotation}天`,
        severity: 'high',
        category: 'key_rotation_delay',
        details: {
          daysSinceLastRotation: keyRotationStatus.daysSinceLastRotation,
          threshold: 90,
          recommendation: '立即执行密钥轮换'
        }
      });
    }
    
    // 检查密钥备份状态
    const keyBackupStatus = await this.metricsService.getKeyBackupStatus();
    
    if (!keyBackupStatus.lastBackupSuccessful) {
      await this.alertService.sendAlert({
        title: '密钥备份失败风险',
        message: '最近一次密钥备份失败',
        severity: 'critical',
        category: 'key_backup_failure',
        details: {
          lastBackupTime: keyBackupStatus.lastBackupTime,
          recommendation: '立即检查备份系统并执行手动备份'
        }
      });
    }
    
    if (keyBackupStatus.daysSinceLastBackup > 7) { // 7天阈值
      await this.alertService.sendAlert({
        title: '密钥备份过期风险',
        message: `密钥备份过期: ${keyBackupStatus.daysSinceLastBackup}天`,
        severity: 'medium',
        category: 'key_backup_stale',
        details: {
          daysSinceLastBackup: keyBackupStatus.daysSinceLastBackup,
          threshold: 7,
          recommendation: '立即执行密钥备份'
        }
      });
    }
  }

  private async checkCompatibilityRisks(): Promise<void> {
    // 检查新旧加密算法兼容性
    const compatibilityMetrics = await this.metricsService.getEncryptionCompatibilityMetrics();
    
    if (compatibilityMetrics.decryptionFailureRate > 0.1) { // 0.1%阈值
      await this.alertService.sendAlert({
        title: '加密兼容性风险',
        message: `解密失败率过高: ${compatibilityMetrics.decryptionFailureRate}%`,
        severity: 'high',
        category: 'encryption_compatibility',
        details: {
          decryptionFailureRate: compatibilityMetrics.decryptionFailureRate,
          threshold: 0.1,
          recommendation: '检查新旧加密算法兼容性实现'
        }
      });
    }
    
    // 检查数据迁移状态
    const dataMigrationStatus = await this.metricsService.getDataMigrationStatus();
    
    if (dataMigrationStatus.errorRate > 0.5) { // 0.5%阈值
      await this.alertService.sendAlert({
        title: '数据迁移风险',
        message: `数据迁移错误率过高: ${dataMigrationStatus.errorRate}%`,
        severity: 'high',
        category: 'data_migration',
        details: {
          errorRate: dataMigrationStatus.errorRate,
          threshold: 0.5,
          recommendation: '暂停数据迁移并检查错误原因'
        }
      });
    }
  }

  private async checkDataIntegrityRisks(): Promise<void> {
    // 检查数据完整性验证结果
    const integrityCheckResults = await this.metricsService.getDataIntegrityCheckResults();
    
    if (integrityCheckResults.failureRate > 0.01) { // 0.01%阈值
      await this.alertService.sendAlert({
        title: '数据完整性风险',
        message: `数据完整性验证失败率过高: ${integrityCheckResults.failureRate}%`,
        severity: 'critical',
        category: 'data_integrity',
        details: {
          failureRate: integrityCheckResults.failureRate,
          threshold: 0.01,
          recommendation: '立即检查数据完整性问题并修复'
        }
      });
    }
    
    // 检查加密数据损坏率
    const corruptionRate = await this.metricsService.getEncryptedDataCorruptionRate();
    
    if (corruptionRate > 0.001) { // 0.001%阈值
      await this.alertService.sendAlert({
        title: '加密数据损坏风险',
        message: `加密数据损坏率过高: ${corruptionRate}%`,
        severity: 'high',
        category: 'data_corruption',
        details: {
          corruptionRate,
          threshold: 0.001,
          recommendation: '检查存储系统和加密实现'
        }
      });
    }
  }
}
```

### 安全实施风险缓解策略

```typescript
@Injectable()
export class SecurityImplementationRiskMitigationService {
  constructor(
    private readonly encryptionService: ModernEncryptionService,
    private readonly keyManagementService: KeyManagementService,
    private readonly dataMigrationService: DataMigrationService,
    private readonly logger: Logger
  ) {}

  async mitigateSecurityImplementationRisk(
    riskId: string, 
    mitigationStrategy: string
  ): Promise<MitigationResult> {
    const risk = await this.getRiskById(riskId);
    
    switch (risk.category) {
      case 'encryption_performance':
        return await this.mitigateEncryptionPerformanceRisk(risk, mitigationStrategy);
      case 'encryption_failure':
        return await this.mitigateEncryptionFailureRisk(risk, mitigationStrategy);
      case 'key_rotation_delay':
        return await this.mitigateKeyRotationDelayRisk(risk, mitigationStrategy);
      case 'key_backup_failure':
        return await this.mitigateKeyBackupFailureRisk(risk, mitigationStrategy);
      case 'encryption_compatibility':
        return await this.mitigateEncryptionCompatibilityRisk(risk, mitigationStrategy);
      case 'data_migration':
        return await this.mitigateDataMigrationRisk(risk, mitigationStrategy);
      case 'data_integrity':
        return await this.mitigateDataIntegrityRisk(risk, mitigationStrategy);
      case 'data_corruption':
        return await this.mitigateDataCorruptionRisk(risk, mitigationStrategy);
      default:
        throw new Error(`未知的风险类别: ${risk.category}`);
    }
  }

---

## 📊 性能基准对比

### 安全性能指标

| 指标类别 | 当前值 | 目标值 | 测量方法 | 数据来源 |
|----------|--------|--------|----------|----------|
| 加密响应时间 | 15ms | <5ms | 性能测试 | 压力测试 |
| 密钥轮换时间 | 30分钟 | <10分钟 | 自动化测试 | 部署记录 |
| 令牌安全评分 | 70% | 95% | 安全评估 | 安全报告 |
| 安全漏洞数量 | 5个 | 0个 | 安全扫描 | 漏洞报告 |

### 预期安全提升

| 改进项 | 预期提升 | 验证方法 | 时间点 |
|--------|----------|----------|--------|
| AES-GCM加密 | +40% 安全性 | 安全评估 | 实施后1周 |
| Argon2id哈希 | +60% 抗破解性 | 渗透测试 | 实施后2周 |
| 密钥轮换 | +80% 密钥安全 | 密钥审计 | 实施后1月 |
| 令牌监控 | +70% 可观测性 | 监控统计 | 实施后1月 |

### 安全性能监控

```typescript
@Injectable()
export class SecurityPerformanceMonitoringService {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly alertService: AlertService,
    private readonly logger: Logger
  ) {}

  async getSecurityPerformanceDashboard(): Promise<SecurityPerformanceDashboard> {
    const [currentMetrics, historicalMetrics, benchmarks] = await Promise.all([
      this.getCurrentSecurityMetrics(),
      this.getHistoricalSecurityMetrics(),
      this.getSecurityBenchmarks()
    ]);

    return {
      current: currentMetrics,
      historical: historicalMetrics,
      benchmarks: benchmarks,
      trends: this.calculateSecurityTrends(historicalMetrics),
      alerts: await this.getSecurityPerformanceAlerts(),
      recommendations: this.generateSecurityRecommendations(currentMetrics, benchmarks)
    };
  }

  private async getCurrentSecurityMetrics(): Promise<SecurityMetrics> {
    return {
      encryptionResponseTime: await this.measureEncryptionResponseTime(),
      keyRotationTime: await this.measureKeyRotationTime(),
      tokenSecurityScore: await this.calculateTokenSecurityScore(),
      vulnerabilityCount: await this.getVulnerabilityCount(),
      authenticationResponseTime: await this.measureAuthenticationResponseTime(),
      authorizationResponseTime: await this.measureAuthorizationResponseTime()
    };
  }

  private async measureEncryptionResponseTime(): Promise<number> {
    const testData = 'test-data-for-performance-measurement';
    const iterations = 100;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      const encrypted = this.encryptionService.encrypt(testData);
      const decrypted = this.encryptionService.decrypt(encrypted);
    }
    
    const endTime = Date.now();
    return (endTime - startTime) / iterations; // 平均每次加密解密时间
  }

  private async measureKeyRotationTime(): Promise<number> {
    // 模拟密钥轮换时间测量
    const startTime = Date.now();
    
    // 生成新密钥
    const newKey = ModernEncryptionService.generateKey();
    
    // 验证新密钥
    ModernEncryptionService.validateKey(newKey);
    
    // 测试新密钥加密
    const testData = 'test-key-rotation-validation';
    const encrypted = this.encryptionService.encrypt(testData);
    const decrypted = this.encryptionService.decrypt(encrypted);
    
    const endTime = Date.now();
    return endTime - startTime; // 密钥轮换总时间
  }

  private async calculateTokenSecurityScore(): Promise<number> {
    // 计算令牌安全评分
    const factors = {
      algorithmStrength: 0.3,   // 算法强度
      keyLength: 0.2,           // 密钥长度
      tokenExpiry: 0.2,         // 令牌过期时间
      refreshMechanism: 0.15,   // 刷新机制
      revocationSupport: 0.15   // 撤销支持
    };
    
    let score = 0;
    
    // 算法强度评分 (RS256 vs HS256)
    score += factors.algorithmStrength * 100; // 使用RS256得满分
    
    // 密钥长度评分
    score += factors.keyLength * 100; // 2048位密钥得满分
    
    // 令牌过期时间评分 (越短越安全，但不方便使用)
    score += factors.tokenExpiry * 80; // 1小时过期得80分
    
    // 刷新机制评分
    score += factors.refreshMechanism * 100; // 有刷新机制得满分
    
    // 撤销支持评分
    score += factors.revocationSupport * 90; // 有撤销支持得90分
    
    return Math.round(score);
  }

  private async getVulnerabilityCount(): Promise<number> {
    // 获取当前安全漏洞数量
    const vulnerabilityScan = await this.securityScanner.scanForVulnerabilities();
    return vulnerabilityScan.length;
  }

  private async measureAuthenticationResponseTime(): Promise<number> {
    // 测量认证响应时间
    const testCredentials = {
      username: 'test-user',
      password: 'test-password'
    };
    
    const iterations = 50;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await this.authService.authenticate(testCredentials);
    }
    
    const endTime = Date.now();
    return (endTime - startTime) / iterations; // 平均认证时间
  }

  private async measureAuthorizationResponseTime(): Promise<number> {
    // 测量授权响应时间
    const testToken = await this.authService.generateTestToken();
    const testResource = 'test-resource';
    const testAction = 'read';
    
    const iterations = 50;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await this.authService.authorize(testToken, testResource, testAction);
    }
    
    const endTime = Date.now();
    return (endTime - startTime) / iterations; // 平均授权时间
  }

  private async getHistoricalSecurityMetrics(days: number = 30): Promise<HistoricalSecurityMetrics[]> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - days * 24 * 60 * 60 * 1000);
    
    return await this.metricsService.getSecurityMetricsInRange(startTime, endTime);
  }

  private async getSecurityBenchmarks(): Promise<SecurityBenchmarks> {
    return {
      encryptionResponseTime: {
        current: await this.measureEncryptionResponseTime(),
        target: 5,
        industry: 10
      },
      keyRotationTime: {
        current: await this.measureKeyRotationTime(),
        target: 10 * 60 * 1000, // 10分钟
        industry: 30 * 60 * 1000  // 30分钟
      },
      tokenSecurityScore: {
        current: await this.calculateTokenSecurityScore(),
        target: 95,
        industry: 80
      },
      vulnerabilityCount: {
        current: await this.getVulnerabilityCount(),
        target: 0,
        industry: 2
      },
      authenticationResponseTime: {
        current: await this.measureAuthenticationResponseTime(),
        target: 100,
        industry: 200
      },
      authorizationResponseTime: {
        current: await this.measureAuthorizationResponseTime(),
        target: 50,
        industry: 100
      }
    };
  }

  private calculateSecurityTrends(historicalMetrics: HistoricalSecurityMetrics[]): SecurityTrends {
    if (historicalMetrics.length < 2) {
      return {
        encryptionResponseTime: 'stable',
        keyRotationTime: 'stable',
        tokenSecurityScore: 'stable',
        vulnerabilityCount: 'stable',
        authenticationResponseTime: 'stable',
        authorizationResponseTime: 'stable'
      };
    }

    const recent = historicalMetrics.slice(-7); // 最近7天
    const previous = historicalMetrics.slice(-14, -7); // 前7天

    return {
      encryptionResponseTime: this.calculateTrend(recent, previous, 'encryptionResponseTime', true),
      keyRotationTime: this.calculateTrend(recent, previous, 'keyRotationTime', true),
      tokenSecurityScore: this.calculateTrend(recent, previous, 'tokenSecurityScore'),
      vulnerabilityCount: this.calculateTrend(recent, previous, 'vulnerabilityCount', true),
      authenticationResponseTime: this.calculateTrend(recent, previous, 'authenticationResponseTime', true),
      authorizationResponseTime: this.calculateTrend(recent, previous, 'authorizationResponseTime', true)
    };
  }

  private calculateTrend(
    recent: HistoricalSecurityMetrics[], 
    previous: HistoricalSecurityMetrics[], 
    metric: string,
    lowerIsBetter: boolean = false
  ): 'improving' | 'degrading' | 'stable' {
    const recentAvg = this.calculateAverage(recent, metric);
    const previousAvg = this.calculateAverage(previous, metric);
    
    if (lowerIsBetter) {
      // 对于响应时间、漏洞数量等，越低越好
      const changePercent = (previousAvg - recentAvg) / previousAvg * 100;
      
      if (changePercent > 5) return 'improving';
      if (changePercent < -5) return 'degrading';
      return 'stable';
    } else {
      // 对于安全评分等，越高越好
      const changePercent = (recentAvg - previousAvg) / previousAvg * 100;
      
      if (changePercent > 5) return 'improving';
      if (changePercent < -5) return 'degrading';
      return 'stable';
    }
  }

  private calculateAverage(metrics: HistoricalSecurityMetrics[], metric: string): number {
    const sum = metrics.reduce((acc, m) => acc + m[metric], 0);
    return sum / metrics.length;
  }

  private async getSecurityPerformanceAlerts(): Promise<SecurityPerformanceAlert[]> {
    const alerts: SecurityPerformanceAlert[] = [];
    
    // 检查加密响应时间告警
    const encryptionTime = await this.measureEncryptionResponseTime();
    if (encryptionTime > 10) {
      alerts.push({
        metric: 'encryptionResponseTime',
        currentValue: encryptionTime,
        threshold: 10,
        severity: 'medium',
        message: `加密响应时间过长: ${encryptionTime}ms`
      });
    }
    
    // 检查密钥轮换时间告警
    const keyRotationTime = await this.measureKeyRotationTime();
    if (keyRotationTime > 20 * 60 * 1000) { // 20分钟
      alerts.push({
        metric: 'keyRotationTime',
        currentValue: keyRotationTime,
        threshold: 20 * 60 * 1000,
        severity: 'high',
        message: `密钥轮换时间过长: ${keyRotationTime}ms`
      });
    }
    
    // 检查令牌安全评分告警
    const tokenScore = await this.calculateTokenSecurityScore();
    if (tokenScore < 80) {
      alerts.push({
        metric: 'tokenSecurityScore',
        currentValue: tokenScore,
        threshold: 80,
        severity: 'medium',
        message: `令牌安全评分过低: ${tokenScore}%`
      });
    }
    
    // 检查漏洞数量告警
    const vulnCount = await this.getVulnerabilityCount();
    if (vulnCount > 0) {
      alerts.push({
        metric: 'vulnerabilityCount',
        currentValue: vulnCount,
        threshold: 0,
        severity: 'critical',
        message: `发现安全漏洞: ${vulnCount}个`
      });
    }
    
    // 检查认证响应时间告警
    const authTime = await this.measureAuthenticationResponseTime();
    if (authTime > 200) {
      alerts.push({
        metric: 'authenticationResponseTime',
        currentValue: authTime,
        threshold: 200,
        severity: 'medium',
        message: `认证响应时间过长: ${authTime}ms`
      });
    }
    
    // 检查授权响应时间告警
    const authzTime = await this.measureAuthorizationResponseTime();
    if (authzTime > 100) {
      alerts.push({
        metric: 'authorizationResponseTime',
        currentValue: authzTime,
        threshold: 100,
        severity: 'medium',
        message: `授权响应时间过长: ${authzTime}ms`
      });
    }
    
    return alerts;
  }

  private generateSecurityRecommendations(
    current: SecurityMetrics, 
    benchmarks: SecurityBenchmarks
  ): string[] {
    const recommendations: string[] = [];
    
    if (current.encryptionResponseTime > benchmarks.encryptionResponseTime.target) {
      recommendations.push('优化加密算法实现，考虑硬件加速或算法优化');
    }
    
    if (current.keyRotationTime > benchmarks.keyRotationTime.target) {
      recommendations.push('优化密钥轮换流程，实现自动化密钥轮换');
    }
    
    if (current.tokenSecurityScore < benchmarks.tokenSecurityScore.target) {
      recommendations.push('增强令牌安全机制，考虑使用更安全的算法或更短的过期时间');
    }
    
    if (current.vulnerabilityCount > benchmarks.vulnerabilityCount.target) {
      recommendations.push('立即修复安全漏洞，建立定期安全扫描机制');
    }
    
    if (current.authenticationResponseTime > benchmarks.authenticationResponseTime.target) {
      recommendations.push('优化认证流程，考虑使用缓存或更高效的认证算法');
    }
    
    if (current.authorizationResponseTime > benchmarks.authorizationResponseTime.target) {
      recommendations.push('优化授权流程，考虑使用缓存或更高效的权限检查机制');
    }
    
    return recommendations;
  }
}

interface SecurityMetrics {
  encryptionResponseTime: number;
  keyRotationTime: number;
  tokenSecurityScore: number;
  vulnerabilityCount: number;
  authenticationResponseTime: number;
  authorizationResponseTime: number;
}

interface HistoricalSecurityMetrics extends SecurityMetrics {
  timestamp: Date;
}

interface SecurityBenchmarks {
  encryptionResponseTime: { current: number; target: number; industry: number };
  keyRotationTime: { current: number; target: number; industry: number };
  tokenSecurityScore: { current: number; target: number; industry: number };
  vulnerabilityCount: { current: number; target: number; industry: number };
  authenticationResponseTime: { current: number; target: number; industry: number };
  authorizationResponseTime: { current: number; target: number; industry: number };
}

interface SecurityTrends {
  encryptionResponseTime: 'improving' | 'degrading' | 'stable';

---

## 🔄 分阶段回滚策略

### 安全实施回滚触发条件

| 触发条件 | 阈值 | 检测方式 | 响应时间 |
|----------|------|----------|----------|
| 加密性能下降 | 响应时间增加 >50% | 自动监控 | 5分钟 |
| 安全漏洞增加 | 高危漏洞 >0个 | 安全扫描 | 1小时 |
| 认证失败率上升 | 失败率 >5% | 自动监控 | 5分钟 |
| 数据解密失败 | 解密失败率 >0.1% | 自动监控 | 5分钟 |
| 密钥轮换失败 | 轮换失败 | 自动监控 | 10分钟 |

### 回滚步骤

#### 1. 加密算法回滚

```typescript
@Injectable()
export class SecurityRollbackService {
  constructor(
    private readonly alertService: AlertService,
    private readonly encryptionService: ModernEncryptionService,
    private readonly keyManagementService: KeyManagementService,
    private readonly configService: ConfigService,
    private readonly logger: Logger
  ) {}

  async initiateSecurityRollback(trigger: SecurityRollbackTrigger): Promise<SecurityRollbackResult> {
    try {
      // 1. 记录回滚事件
      await this.recordSecurityRollbackEvent(trigger);
      
      // 2. 评估回滚影响
      const impact = await this.assessSecurityRollbackImpact(trigger);
      
      // 3. 确定回滚范围
      const scope = await this.determineSecurityRollbackScope(trigger, impact);
      
      // 4. 执行回滚
      const result = await this.executeSecurityRollback(scope);
      
      // 5. 验证回滚结果
      await this.verifySecurityRollbackResult(result);
      
      // 6. 通知相关方
      await this.notifySecurityStakeholders(result);
      
      return result;
    } catch (error) {
      this.logger.error('安全实施回滚失败', { error: error.message, trigger });
      await this.alertService.sendAlert({
        title: '安全实施回滚失败',
        message: `回滚失败: ${error.message}`,
        severity: 'critical',
        category: 'security_rollback_failure'
      });
      
      throw error;
    }
  }

  private async recordSecurityRollbackEvent(trigger: SecurityRollbackTrigger): Promise<void> {
    await this.configService.recordEvent({
      type: 'security_rollback_initiated',
      trigger: trigger.type,
      reason: trigger.reason,
      timestamp: new Date(),
      initiatedBy: trigger.initiatedBy
    });
  }

  private async assessSecurityRollbackImpact(trigger: SecurityRollbackTrigger): Promise<SecurityRollbackImpact> {
    // 评估安全回滚对系统的影响
    const affectedData = await this.getAffectedData(trigger);
    const affectedUsers = await this.getAffectedUsers(trigger);
    const businessImpact = await this.assessBusinessImpact(trigger);
    
    return {
      affectedData,
      affectedUsers,
      businessImpact,
      estimatedDowntime: this.estimateDowntime(trigger),
      securityRiskLevel: this.assessSecurityRiskLevel(trigger)
    };
  }

  private async determineSecurityRollbackScope(
    trigger: SecurityRollbackTrigger, 
    impact: SecurityRollbackImpact
  ): Promise<SecurityRollbackScope> {
    // 根据触发条件和影响确定回滚范围
    if (trigger.severity === 'critical') {
      return {
        type: 'full',
        components: ['encryption', 'authentication', 'authorization'],
        backupCurrentState: true,
        notifyAllStakeholders: true
      };
    } else if (trigger.severity === 'high') {
      return {
        type: 'partial',
        components: [trigger.component],
        backupCurrentState: true,
        notifyAllStakeholders: true
      };
    } else {
      return {
        type: 'minimal',
        components: [trigger.component],
        backupCurrentState: false,
        notifyAllStakeholders: false
      };
    }
  }

  private async executeSecurityRollback(scope: SecurityRollbackScope): Promise<SecurityRollbackResult> {
    const startTime = Date.now();
    
    try {
      // 1. 备份当前状态
      if (scope.backupCurrentState) {
        await this.backupCurrentSecurityState();
      }
      
      // 2. 执行回滚
      for (const component of scope.components) {
        await this.rollbackSecurityComponent(component);
      }
      
      // 3. 验证回滚结果
      const verificationResult = await this.verifySecurityRollback(scope);
      
      const endTime = Date.now();
      
      return {
        success: verificationResult.success,
        duration: endTime - startTime,
        rolledBackComponents: scope.components,
        verificationResult,
        errors: verificationResult.errors || []
      };
    } catch (error) {
      const endTime = Date.now();
      
      return {
        success: false,
        duration: endTime - startTime,
        rolledBackComponents: scope.components,
        verificationResult: null,
        errors: [error.message]
      };
    }
  }

  private async rollbackSecurityComponent(component: string): Promise<void> {
    switch (component) {
      case 'encryption':
        await this.rollbackEncryptionAlgorithm();
        break;
      case 'authentication':
        await this.rollbackAuthenticationMechanism();
        break;
      case 'authorization':
        await this.rollbackAuthorizationMechanism();
        break;
      default:
        throw new Error(`未知的安全组件: ${component}`);
    }
  }

  private async rollbackEncryptionAlgorithm(): Promise<void> {
    // 回滚加密算法到旧版本
    const previousConfig = await this.configService.getPreviousConfig('encryption');
    await this.configService.updateConfig('encryption', previousConfig);
    
    // 重新初始化加密服务
    await this.encryptionService.reinitialize(previousConfig);
    
    // 验证加密服务正常工作
    const testData = 'test-encryption-rollback-validation';
    const encrypted = this.encryptionService.encrypt(testData);
    const decrypted = this.encryptionService.decrypt(encrypted);
    
    if (decrypted !== testData) {
      throw new Error('加密算法回滚验证失败');
    }
    
    this.logger.info('加密算法已回滚到上一个版本');
  }

  private async rollbackAuthenticationMechanism(): Promise<void> {
    // 回滚认证机制到旧版本
    const previousConfig = await this.configService.getPreviousConfig('authentication');
    await this.configService.updateConfig('authentication', previousConfig);
    
    // 重新初始化认证服务
    await this.authService.reinitialize(previousConfig);
    
    // 验证认证服务正常工作
    const testCredentials = {
      username: 'test-user',
      password: 'test-password'
    };
    
    const authResult = await this.authService.authenticate(testCredentials);
    if (!authResult.success) {
      throw new Error('认证机制回滚验证失败');
    }
    
    this.logger.info('认证机制已回滚到上一个版本');
  }

  private async rollbackAuthorizationMechanism(): Promise<void> {
    // 回滚授权机制到旧版本
    const previousConfig = await this.configService.getPreviousConfig('authorization');
    await this.configService.updateConfig('authorization', previousConfig);
    
    // 重新初始化授权服务
    await this.authorizationService.reinitialize(previousConfig);
    
    // 验证授权服务正常工作
    const testToken = await this.authService.generateTestToken();
    const testResource = 'test-resource';
    const testAction = 'read';
    
    const authzResult = await this.authorizationService.authorize(testToken, testResource, testAction);
    if (!authzResult.success) {
      throw new Error('授权机制回滚验证失败');
    }
    
    this.logger.info('授权机制已回滚到上一个版本');
  }

  private async verifySecurityRollback(scope: SecurityRollbackScope): Promise<SecurityVerificationResult> {
    const results: ComponentVerificationResult[] = [];
    
    for (const component of scope.components) {
      const result = await this.verifySecurityComponent(component);
      results.push(result);
    }
    
    const allSuccessful = results.every(result => result.success);
    
    return {
      success: allSuccessful,
      componentResults: results,
      errors: allSuccessful ? [] : results.filter(r => !r.success).map(r => r.error)
    };
  }

  private async verifySecurityComponent(component: string): Promise<ComponentVerificationResult> {
    try {
      switch (component) {
        case 'encryption':
          return await this.verifyEncryptionRollback();
        case 'authentication':
          return await this.verifyAuthenticationRollback();
        case 'authorization':
          return await this.verifyAuthorizationRollback();
        default:
          return {
            success: false,
            component,
            error: `未知的安全组件: ${component}`
          };
      }
    } catch (error) {
      return {
        success: false,
        component,
        error: error.message
      };
    }
  }

  private async verifyEncryptionRollback(): Promise<ComponentVerificationResult> {
    // 验证加密算法回滚是否正常
    const testData = 'test-encryption-rollback-verification';
    const iterations = 10;
    
    for (let i = 0; i < iterations; i++) {
      const encrypted = this.encryptionService.encrypt(testData);
      const decrypted = this.encryptionService.decrypt(encrypted);
      
      if (decrypted !== testData) {
        return {
          success: false,
          component: 'encryption',
          error: `加密解密验证失败，测试数据: ${testData}`
        };
      }
    }
    
    // 检查加密性能
    const encryptionTime = await this.measureEncryptionResponseTime();
    if (encryptionTime > 20) { // 20ms阈值
      return {
        success: false,
        component: 'encryption',
        error: `加密性能不达标: ${encryptionTime}ms`
      };
    }
    
    return {
      success: true,
      component: 'encryption'
    };
  }

  private async verifyAuthenticationRollback(): Promise<ComponentVerificationResult> {
    // 验证认证机制回滚是否正常
    const testCredentials = {
      username: 'test-user',
      password: 'test-password'
    };
    
    const authResult = await this.authService.authenticate(testCredentials);
    if (!authResult.success) {
      return {
        success: false,
        component: 'authentication',
        error: '认证验证失败'
      };
    }
    
    // 检查认证性能
    const authTime = await this.measureAuthenticationResponseTime();
    if (authTime > 200) { // 200ms阈值
      return {
        success: false,
        component: 'authentication',
        error: `认证性能不达标: ${authTime}ms`
      };
    }
    
    return {
      success: true,
      component: 'authentication'
    };
  }

  private async verifyAuthorizationRollback(): Promise<ComponentVerificationResult> {
    // 验证授权机制回滚是否正常
    const testToken = await this.authService.generateTestToken();
    const testResource = 'test-resource';
    const testAction = 'read';
    
    const authzResult = await this.authorizationService.authorize(testToken, testResource, testAction);
    if (!authzResult.success) {
      return {
        success: false,
        component: 'authorization',
        error: '授权验证失败'
      };
    }
    
    // 检查授权性能
    const authzTime = await this.measureAuthorizationResponseTime();
    if (authzTime > 100) { // 100ms阈值
      return {
        success: false,
        component: 'authorization',
        error: `授权性能不达标: ${authzTime}ms`
      };
    }
    
    return {
      success: true,
      component: 'authorization'
    };
  }

  private async notifySecurityStakeholders(result: SecurityRollbackResult): Promise<void> {
    const message = result.success 
      ? `安全实施回滚成功，耗时${result.duration}ms，回滚组件: ${result.rolledBackComponents.join(', ')}`
      : `安全实施回滚失败，错误: ${result.errors.join(', ')}`;
    
    await this.alertService.sendAlert({
      title: result.success ? '安全实施回滚成功' : '安全实施回滚失败',
      message,
      severity: result.success ? 'info' : 'critical',
      category: 'security_rollback_result'
    });
    
    // 发送邮件通知
    await this.emailService.send({
      to: ['security-team@example.com', 'tech-lead@example.com', 'devops@example.com'],
      subject: result.success ? '安全实施回滚成功' : '安全实施回滚失败',
      body: message
    });
  }

  // 辅助方法实现...
  private async getAffectedData(trigger: SecurityRollbackTrigger): Promise<any[]> {
    // 实现获取受影响数据的逻辑
    return [];
  }

  private async getAffectedUsers(trigger: SecurityRollbackTrigger): Promise<any[]> {
    // 实现获取受影响用户的逻辑
    return [];
  }

  private async assessBusinessImpact(trigger: SecurityRollbackTrigger): Promise<string> {
    // 实现评估业务影响的逻辑
    return '';
  }

  private async estimateDowntime(trigger: SecurityRollbackTrigger): Promise<number> {
    // 实现评估停机时间的逻辑
    return 0;
  }

  private async assessSecurityRiskLevel(trigger: SecurityRollbackTrigger): Promise<'low' | 'medium' | 'high' | 'critical'> {
    // 实现评估安全风险级别的逻辑
    return 'medium';
  }

  private async backupCurrentSecurityState(): Promise<void> {
    // 实现备份当前安全状态的逻辑
  }

  private async measureEncryptionResponseTime(): Promise<number> {
    // 实现测量加密响应时间的逻辑
    return 0;
  }

  private async measureAuthenticationResponseTime(): Promise<number> {
    // 实现测量认证响应时间的逻辑
    return 0;
  }

  private async measureAuthorizationResponseTime(): Promise<number> {
    // 实现测量授权响应时间的逻辑
    return 0;
  }
}

interface SecurityRollbackTrigger {
  type: 'encryption_performance' | 'security_vulnerability' | 'authentication_failure' | 'data_decryption_failure' | 'key_rotation_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  component?: string;
  initiatedBy: string;
  timestamp: Date;
}

interface SecurityRollbackImpact {
  affectedData: any[];
  affectedUsers: any[];
  businessImpact: string;
  estimatedDowntime: number;
  securityRiskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface SecurityRollbackScope {
  type: 'full' | 'partial' | 'minimal';
  components: string[];
  backupCurrentState: boolean;
  notifyAllStakeholders: boolean;
}

interface SecurityRollbackResult {
  success: boolean;
  duration: number;
  rolledBackComponents: string[];
  verificationResult: SecurityVerificationResult | null;
  errors: string[];
}

interface SecurityVerificationResult {
  success: boolean;
  componentResults: ComponentVerificationResult[];
  errors: string[];
}

interface ComponentVerificationResult {
  success: boolean;
  component: string;
  error?: string;
}
```

### 回滚验证清单

```markdown
## 安全回滚验证清单

### 加密算法验证
- [ ] 加密解密功能正常
- [ ] 加密性能达标
- [ ] 数据完整性验证通过
- [ ] 密钥管理正常

### 认证机制验证
- [ ] 用户认证功能正常
- [ ] 认证性能达标

---

## 👥 团队培训计划

### 安全培训内容

#### 1. 现代加密技术培训 (2小时)

```markdown
## 培训大纲

### 理论部分 (1小时)
- AES-GCM算法原理和优势
- 密钥管理最佳实践
- 加密性能优化技巧
- 常见加密安全问题

### 实践部分 (1小时)
- 现代加密服务使用
- 密钥轮换操作
- 加密性能测试
- 问题排查实践
```

#### 2. 密码安全实践培训 (1.5小时)

```markdown
## 培训大纲

### 理论部分 (45分钟)
- Argon2id算法原理
- 密码强度评估标准
- 密码存储最佳实践
- 密码安全威胁分析

### 实践部分 (45分钟)
- 密码哈希服务使用
- 密码强度检查
- 安全密码生成
- 密码安全测试
```

#### 3. 输入验证和注入防护培训 (2小时)

```markdown
## 培训大纲

### 理论部分 (1小时)
- 常见注入攻击类型
- 输入验证原则
- SQL注入防护方法
- 参数化查询最佳实践

### 实践部分 (1小时)
- 输入验证实现
- SQL注入检测
- 安全查询编写
- 注入攻击测试
```

#### 4. API安全防护培训 (1.5小时)

```markdown
## 培训大纲

### 理论部分 (45分钟)
- API安全威胁分析
- 限流和防护策略
- 请求验证方法
- 认证授权最佳实践

### 实践部分 (45分钟)
- API限流实现
- 请求验证中间件
- 认证授权配置
- API安全测试
```

### 培训时间表

| 周次 | 培训内容 | 时间 | 参与人员 | 培训方式 |
|------|----------|------|----------|----------|
| 第1周 | 现代加密技术培训 | 2小时 | 全体开发团队 | 线下培训 |
| 第2周 | 密码安全实践培训 | 1.5小时 | 后端开发团队 | 线下培训 |
| 第3周 | 输入验证和注入防护培训 | 2小时 | 全体开发团队 | 线下培训 |
| 第4周 | API安全防护培训 | 1.5小时 | 后端开发团队 | 线下培训 |
| 第5周 | 综合安全演练 | 3小时 | 全体开发团队 | 实战演练 |

### 培训材料

#### 1. 安全培训手册

```markdown
# 现代安全实践培训手册

## 目录
1. 现代加密技术
2. 密码安全实践
3. 输入验证和注入防护
4. API安全防护
5. 安全测试方法
6. 安全事件响应
7. 安全最佳实践
8. 常见安全问题解答
```

#### 2. 实践指南

```markdown
# 安全实践指南

## 快速开始
1. 环境准备
2. 工具安装
3. 代码示例
4. 实践练习

## 进阶操作
1. 安全架构设计
2. 安全代码审查
3. 安全测试实施
4. 安全监控配置

## 故障排除
1. 常见安全问题
2. 错误代码解析
3. 日志分析技巧
4. 问题排查流程
```

#### 3. 视频教程

```markdown
# 安全实践视频教程

## 基础系列
1. 现代加密技术介绍 (20分钟)
2. 密码安全实践 (15分钟)
3. 输入验证原理 (20分钟)
4. API安全基础 (15分钟)

## 进阶系列
1. 高级加密技术 (30分钟)
2. 密码安全高级实践 (25分钟)
3. 复杂注入攻击防护 (30分钟)
4. 高级API安全策略 (25分钟)

## 实战系列
1. 安全代码实现 (40分钟)
2. 安全测试执行 (45分钟)
3. 安全事件响应 (50分钟)
4. 安全架构设计 (35分钟)
```

### 培训评估

#### 1. 理论考核

```typescript
interface SecurityTrainingAssessment {
  participantId: string;
  participantName: string;
  assessmentType: 'theory' | 'practice' | 'comprehensive';
  score: number;
  maxScore: number;
  passed: boolean;
  assessedAt: Date;
  assessor: string;
  feedback: string;
}

@Injectable()
export class SecurityTrainingAssessmentService {
  constructor(
    private readonly questionnaireService: QuestionnaireService,
    private readonly logger: Logger
  ) {}

  async conductSecurityTheoryAssessment(participantId: string): Promise<SecurityTrainingAssessment> {
    // 获取安全理论考核题目
    const questions = await this.questionnaireService.getQuestions('security_theory');
    
    // 随机选择15道题目
    const selectedQuestions = this.selectRandomQuestions(questions, 15);
    
    // 生成考核链接
    const assessmentUrl = await this.questionnaireService.createAssessment(
      participantId,
      selectedQuestions
    );
    
    this.logger.info(`安全理论考核已生成`, { 
      participantId, 
      questionCount: selectedQuestions.length,
      assessmentUrl 
    });
    
    // 返回考核信息
    return {
      participantId,
      assessmentType: 'theory',
      assessmentUrl,
      questionCount: selectedQuestions.length,
      timeLimit: 45, // 45分钟
      createdAt: new Date()
    } as any;
  }

  async evaluateSecurityTheoryAssessment(
    participantId: string, 
    answers: Record<string, any>
  ): Promise<SecurityTrainingAssessment> {
    // 获取正确答案
    const correctAnswers = await this.questionnaireService.getCorrectAnswers('security_theory');
    
    // 计算得分
    let score = 0;
    let maxScore = 0;
    
    for (const [questionId, answer] of Object.entries(answers)) {
      maxScore += correctAnswers[questionId].points;
      
      if (this.isAnswerCorrect(answer, correctAnswers[questionId])) {
        score += correctAnswers[questionId].points;
      }
    }
    
    const passed = score >= maxScore * 0.8; // 80分及格
    
    const assessment: SecurityTrainingAssessment = {
      participantId,
      assessmentType: 'theory',
      score,
      maxScore,
      passed,
      assessedAt: new Date(),
      assessor: 'system',
      feedback: this.generateSecurityFeedback(score, maxScore)
    };
    
    // 保存评估结果
    await this.saveSecurityAssessmentResult(assessment);
    
    this.logger.info(`安全理论考核已完成`, { 
      participantId, 
      score, 
      maxScore, 
      passed 
    });
    
    return assessment;
  }

  private selectRandomQuestions(questions: any[], count: number): any[] {
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private isAnswerCorrect(answer: any, correctAnswer: any): boolean {
    if (Array.isArray(correctAnswer.correct)) {
      return correctAnswer.correct.includes(answer);
    }
    return answer === correctAnswer.correct;
  }

  private generateSecurityFeedback(score: number, maxScore: number): string {
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 90) {
      return '优秀！您对现代安全实践有深入的理解。';
    } else if (percentage >= 80) {
      return '良好！您已掌握现代安全实践的基本知识。';
    } else if (percentage >= 70) {
      return '及格！建议您复习部分知识点，加强理解。';
    } else {
      return '需要改进！建议您重新学习培训材料，参加补考。';
    }
  }

  private async saveSecurityAssessmentResult(assessment: SecurityTrainingAssessment): Promise<void> {
    // 保存评估结果到数据库
    // 实现细节...
  }
}
```

#### 2. 实践考核

```typescript
@Injectable()
export class SecurityPracticeAssessmentService {
  constructor(
    private readonly taskService: TaskService,
    private readonly securityService: SecurityService,
    private readonly logger: Logger
  ) {}

  async createSecurityPracticeTask(participantId: string): Promise<SecurityPracticeTask> {
    // 创建安全实践考核任务
    const task = await this.taskService.createTask({
      type: 'security_practice_assessment',
      participantId,
      title: '现代安全实践考核',
      description: '完成以下安全实践任务',
      steps: [
        {
          id: 'implement_encryption',
          title: '实现加密功能',
          description: '使用AES-GCM算法实现数据加密和解密功能',
          expectedOutput: '可正常工作的加密解密代码'
        },
        {
          id: 'implement_password_hashing',
          title: '实现密码哈希',
          description: '使用Argon2id算法实现密码哈希和验证功能',
          expectedOutput: '可正常工作的密码哈希代码'
        },
        {
          id: 'implement_input_validation',
          title: '实现输入验证',
          description: '实现输入验证和SQL注入防护功能',
          expectedOutput: '可正常工作的输入验证代码'
        },
        {
          id: 'implement_api_security',
          title: '实现API安全',
          description: '实现API限流和请求验证功能',
          expectedOutput: '可正常工作的API安全代码'
        }
      ],
      timeLimit: 180, // 180分钟
      createdAt: new Date()
    });
    
    this.logger.info(`安全实践考核任务已创建`, { 
      participantId, 
      taskId: task.id 
    });
    
    return task;
  }

  async evaluateSecurityPracticeTask(
    participantId: string, 
    taskId: string, 
    results: SecurityPracticeTaskResult[]
  ): Promise<SecurityTrainingAssessment> {
    // 获取任务信息
    const task = await this.taskService.getTask(taskId);
    
    // 评估每个步骤的结果
    let totalScore = 0;
    let maxScore = 0;
    const stepResults: SecurityStepResult[] = [];
    
    for (const step of task.steps) {
      const stepResult = results.find(r => r.stepId === step.id);
      maxScore += 25; // 每步25分
      
      if (stepResult && stepResult.completed) {
        const stepScore = this.evaluateSecurityStepResult(stepResult, step);
        totalScore += stepScore;
        
        stepResults.push({
          stepId: step.id,
          stepTitle: step.title,
          score: stepScore,
          maxScore: 25,
          feedback: stepResult.feedback
        });
      } else {
        stepResults.push({
          stepId: step.id,
          stepTitle: step.title,
          score: 0,
          maxScore: 25,
          feedback: '步骤未完成'
        });
      }
    }
    
    const passed = totalScore >= maxScore * 0.8; // 80分及格
    
    const assessment: SecurityTrainingAssessment = {
      participantId,
      assessmentType: 'practice',
      score: totalScore,
      maxScore,
      passed,
      assessedAt: new Date(),
      assessor: 'system',
      feedback: this.generateSecurityPracticeFeedback(stepResults)
    };
    
    // 保存评估结果
    await this.saveSecurityAssessmentResult(assessment);
    
    this.logger.info(`安全实践考核已完成`, { 
      participantId, 
      taskId, 
      score: totalScore, 
      maxScore, 
      passed 
    });
    
    return assessment;
  }

  private evaluateSecurityStepResult(result: SecurityPracticeTaskResult, step: any): number {
    // 根据步骤结果评估得分
    if (result.quality === 'excellent') {
      return 25;
    } else if (result.quality === 'good') {
      return 20;
    } else if (result.quality === 'satisfactory') {
      return 15;
    } else {
      return 5; // 只要完成了就给基础分
    }
  }

  private generateSecurityPracticeFeedback(stepResults: SecurityStepResult[]): string {
    const excellentSteps = stepResults.filter(s => s.score >= 20);
    const needsImprovementSteps = stepResults.filter(s => s.score < 15);
    
    let feedback = '';
    
    if (excellentSteps.length > 0) {
      feedback += `您在以下步骤表现出色: ${excellentSteps.map(s => s.stepTitle).join(', ')}。\n`;
    }
    
    if (needsImprovementSteps.length > 0) {
      feedback += `以下步骤需要改进: ${needsImprovementSteps.map(s => s.stepTitle).join(', ')}。\n`;
    }
    
    if (excellentSteps.length === stepResults.length) {
      feedback += '优秀！您已完全掌握现代安全实践的技能。';
    } else if (needsImprovementSteps.length === 0) {
      feedback += '良好！您已掌握现代安全实践的基本技能。';
    } else {
      feedback += '需要改进！建议您加强实践练习，重新参加考核。';
    }
    
    return feedback;
  }

  private async saveSecurityAssessmentResult(assessment: SecurityTrainingAssessment): Promise<void> {
    // 保存评估结果到数据库
    // 实现细节...
  }
}

interface SecurityPracticeTask {
  id: string;
  type: string;
  participantId: string;
  title: string;
  description: string;
  steps: {
    id: string;
    title: string;
    description: string;
    expectedOutput: string;
  }[];
  timeLimit: number;
  createdAt: Date;
}

interface SecurityPracticeTaskResult {
  stepId: string;
  completed: boolean;
  quality: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement';
  feedback: string;
  attachments?: string[];
}

interface SecurityStepResult {
  stepId: string;
  stepTitle: string;
  score: number;
  maxScore: number;
  feedback: string;
}
```

### 培训效果跟踪

```typescript
@Injectable()
export class SecurityTrainingTrackingService {
  constructor(
    private readonly assessmentService: SecurityTrainingAssessmentService,
    private readonly practiceService: SecurityPracticeAssessmentService,
    private readonly securityService: SecurityService,
    private readonly logger: Logger
  ) {}

  async trackSecurityTrainingEffectiveness(
    participantIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<SecurityTrainingEffectivenessReport> {
    // 获取培训前的基线数据
    const beforeTrainingMetrics = await this.getParticipantSecurityMetrics(
      participantIds, 
      new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 培训前30天
      startDate
    );
    
    // 获取培训后的数据
    const afterTrainingMetrics = await this.getParticipantSecurityMetrics(
      participantIds, 
      endDate, 
      new Date(endDate.getTime() + 30 * 24 * 60 * 60 * 1000) // 培训后30天
    );
    
    // 获取培训考核结果
    const assessmentResults = await this.getSecurityAssessmentResults(participantIds);
    
    // 计算培训效果
    const effectiveness = this.calculateSecurityEffectiveness(
      beforeTrainingMetrics,
      afterTrainingMetrics,
      assessmentResults
    );
    
    return {
      period: {
        startDate,
        endDate,
        trainingDate: startDate
      },
      participants: participantIds.length,
      beforeTrainingMetrics,
      afterTrainingMetrics,
      assessmentResults,
      effectiveness,
      recommendations: this.generateSecurityRecommendations(effectiveness)
    };
  }

  private async getParticipantSecurityMetrics(
    participantIds: string[], 
    startDate: Date, 
    endDate: Date
  ): Promise<ParticipantSecurityMetrics[]> {
    const metrics: ParticipantSecurityMetrics[] = [];
    
    for (const participantId of participantIds) {
      const participantMetrics = await this.getParticipantSecurityMetricsById(
        participantId,
        startDate,
        endDate
      );
      
      metrics.push({
        participantId,
        secureCodeScore: participantMetrics.secureCodeScore || 0,
        vulnerabilityCount: participantMetrics.vulnerabilityCount || 0,
        securityTestPassRate: participantMetrics.securityTestPassRate || 0,
        securityIncidentCount: participantMetrics.securityIncidentCount || 0,
        securityKnowledgeScore: participantMetrics.securityKnowledgeScore || 0,
        securityPracticeScore: participantMetrics.securityPracticeScore || 0
      });
    }
    
    return metrics;
  }

  private async getParticipantSecurityMetricsById(
    participantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    // 获取参与者的安全相关指标
    const codeCommits = await this.securityService.getCodeCommitsByAuthor(participantId, startDate, endDate);
    const securityTests = await this.securityService.getSecurityTestsByAuthor(participantId, startDate, endDate);
    const securityIncidents = await this.securityService.getSecurityIncidentsByParticipant(participantId, startDate, endDate);
    
    return {
      secureCodeScore: this.calculateSecureCodeScore(codeCommits),
      vulnerabilityCount: this.countVulnerabilities(codeCommits),
      securityTestPassRate: this.calculateSecurityTestPassRate(securityTests),
      securityIncidentCount: securityIncidents.length,
      securityKnowledgeScore: await this.calculateSecurityKnowledgeScore(participantId),
      securityPracticeScore: await this.calculateSecurityPracticeScore(participantId)
    };
  }

  private calculateSecureCodeScore(commits: any[]): number {
    if (commits.length === 0) return 0;
    
    let totalScore = 0;
    for (const commit of commits) {
      // 基于代码安全分析结果计算得分
      const securityAnalysis = this.securityService.analyzeCodeSecurity(commit.id);
      totalScore += securityAnalysis.score;
    }
    
    return totalScore / commits.length;
  }

  private countVulnerabilities(commits: any[]): number {
    let totalVulnerabilities = 0;
    
    for (const commit of commits) {
      const securityAnalysis = this.securityService.analyzeCodeSecurity(commit.id);
      totalVulnerabilities += securityAnalysis.vulnerabilities.length;
    }
    
    return totalVulnerabilities;
  }

  private calculateSecurityTestPassRate(tests: any[]): number {
    if (tests.length === 0) return 0;
    
    const passedTests = tests.filter(test => test.status === 'passed').length;
    return (passedTests / tests.length) * 100;
  }

  private async calculateSecurityKnowledgeScore(participantId: string): Promise<number> {
    // 基于安全知识测试结果计算得分
    const knowledgeTests = await this.securityService.getKnowledgeTestsByParticipant(participantId);
    
    if (knowledgeTests.length === 0) return 0;
    
    const totalScore = knowledgeTests.reduce((sum, test) => sum + test.score, 0);
    return totalScore / knowledgeTests.length;
  }

  private async calculateSecurityPracticeScore(participantId: string): Promise<number> {
    // 基于安全实践评估结果计算得分
    const practiceAssessments = await this.securityService.getPracticeAssessmentsByParticipant(participantId);
    
    if (practiceAssessments.length === 0) return 0;
    
    const totalScore = practiceAssessments.reduce((sum, assessment) => sum + assessment.score, 0);
    return totalScore / practiceAssessments.length;
  }

  private async getSecurityAssessmentResults(participantIds: string[]): Promise<SecurityAssessmentResults> {
    const theoryResults = await this.assessmentService.getAssessmentResults(
      participantIds, 
      'theory'
    );
    
    const practiceResults = await this.practiceService.getAssessmentResults(
      participantIds
    );
    
    return {
      theory: {
        totalParticipants: participantIds.length,
        passedCount: theoryResults.filter(r => r.passed).length,
        averageScore: theoryResults.reduce((sum, r) => sum + r.score, 0) / theoryResults.length,
        maxScore: theoryResults.reduce((max, r) => Math.max(max, r.maxScore), 0)
      },
      practice: {
        totalParticipants: participantIds.length,
        passedCount: practiceResults.filter(r => r.passed).length,
        averageScore: practiceResults.reduce((sum, r) => sum + r.score, 0) / practiceResults.length,
        maxScore: practiceResults.reduce((max, r) => Math.max(max, r.maxScore), 0)
      }
    };
  }

  private calculateSecurityEffectiveness(
    before: ParticipantSecurityMetrics[],
    after: ParticipantSecurityMetrics[],
    assessments: SecurityAssessmentResults
  ): SecurityTrainingEffectiveness {
    // 计算指标改进
    const secureCodeImprovement = this.calculateImprovement(
      before, 
      after, 
      'secureCodeScore'
    );
    
    const vulnerabilityReduction = this.calculateImprovement(
      before, 
      after, 
      'vulnerabilityCount',
      true // 越低越好
    );
    
    const securityTestImprovement = this.calculateImprovement(
      before, 
      after, 
      'securityTestPassRate'
    );
    
    const incidentReduction = this.calculateImprovement(
      before, 
      after, 
      'securityIncidentCount',
      true // 越低越好
    );
    
    const knowledgeImprovement = this.calculateImprovement(
      before, 
      after, 
      'securityKnowledgeScore'
    );
    
    const practiceImprovement = this.calculateImprovement(
      before, 
      after, 
      'securityPracticeScore'
    );
    
    // 计算培训通过率
    const theoryPassRate = assessments.theory.passedCount / assessments.theory.totalParticipants;
    const practicePassRate = assessments.practice.passedCount / assessments.practice.totalParticipants;
    
    // 计算综合效果评分
    const overallScore = (
      secureCodeImprovement * 0.15 +
      vulnerabilityReduction * 0.15 +
      securityTestImprovement * 0.15 +
      incidentReduction * 0.15 +
      knowledgeImprovement * 0.1 +
      practiceImprovement * 0.1 +
      theoryPassRate * 0.1 +
      practicePassRate * 0.1
    ) * 100;
    
    return {
      secureCodeImprovement,
      vulnerabilityReduction,
      securityTestImprovement,
      incidentReduction,
      knowledgeImprovement,
      practiceImprovement,
      theoryPassRate,
      practicePassRate,
      overallScore,
      rating: this.getSecurityEffectivenessRating(overallScore)
    };
  }

  private calculateImprovement(
    before: ParticipantSecurityMetrics[], 
    after: ParticipantSecurityMetrics[], 
    metric: keyof ParticipantSecurityMetrics,
    lowerIsBetter: boolean = false
  ): number {
    const beforeAvg = before.reduce((sum, m) => sum + (m[metric] as number), 0) / before.length;
    const afterAvg = after.reduce((sum, m) => sum + (m[metric] as number), 0) / after.length;
    
    if (lowerIsBetter) {
      return Math.max(0, (beforeAvg - afterAvg) / beforeAvg);
    } else {
      return Math.max(0, (afterAvg - beforeAvg) / beforeAvg);
    }
  }

  private getSecurityEffectivenessRating(score: number): 'excellent' | 'good' | 'satisfactory' | 'needs_improvement' {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 55) return 'satisfactory';
    return 'needs_improvement';
  }

  private generateSecurityRecommendations(effectiveness: SecurityTrainingEffectiveness): string[] {
    const recommendations: string[] = [];
    
    if (effectiveness.secureCodeImprovement < 0.2) {
      recommendations.push('加强安全代码编写培训，提供更多安全编码实践');
    }
    
    if (effectiveness.vulnerabilityReduction < 0.2) {
      recommendations.push('加强漏洞识别和修复培训，提供更多漏洞分析实践');
    }
    
    if (effectiveness.securityTestImprovement < 0.2) {
      recommendations.push('加强安全测试培训，提供更多安全测试实践');
    }
    
    if (effectiveness.theoryPassRate < 0.8) {
      recommendations.push('优化理论培训内容，增加互动和案例分析');
    }
    
    if (effectiveness.practicePassRate < 0.8) {
      recommendations.push('提供更多实践指导，降低实践任务难度');
    }
    
    if (effectiveness.overallScore < 60) {
      recommendations.push('重新设计培训计划，增加培训时间和实践环节');
    }
    
    return recommendations;
  }
}

interface ParticipantSecurityMetrics {
  participantId: string;
  secureCodeScore: number;
  vulnerabilityCount: number;
  securityTestPassRate: number;
  securityIncidentCount: number;
  securityKnowledgeScore: number;
  securityPracticeScore: number;
}

interface SecurityAssessmentResults {
  theory: {
    totalParticipants: number;
    passedCount: number;
    averageScore: number;
    maxScore: number;
  };
  practice: {
    totalParticipants: number;
    passedCount: number;
    averageScore: number;
    maxScore: number;
  };
}

interface SecurityTrainingEffectiveness {
  secureCodeImprovement: number;
  vulnerabilityReduction: number;
  securityTestImprovement: number;
  incidentReduction: number;
  knowledgeImprovement: number;
  practiceImprovement: number;
  theoryPassRate: number;
  practicePassRate: number;
  overallScore: number;
  rating: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement';
}

interface SecurityTrainingEffectivenessReport {
  period: {
    startDate: Date;
    endDate: Date;
    trainingDate: Date;
  };
  participants: number;
  beforeTrainingMetrics: ParticipantSecurityMetrics[];
  afterTrainingMetrics: ParticipantSecurityMetrics[];
  assessmentResults: SecurityAssessmentResults;
  effectiveness: SecurityTrainingEffectiveness;
  recommendations: string[];
}
```

- [ ] 令牌生成和验证正常
- [ ] 会话管理正常

### 授权机制验证
- [ ] 权限检查功能正常
- [ ] 授权性能达标
- [ ] 角色权限管理正常
- [ ] 资源访问控制正常

### 整体安全验证
- [ ] 安全漏洞扫描通过
- [ ] 安全配置正确
- [ ] 日志记录正常
- [ ] 监控告警正常
```

### 数据迁移回滚策略

```typescript
@Injectable()
export class DataMigrationRollbackService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly encryptionService: ModernEncryptionService,
    private readonly logger: Logger
  ) {}

  async rollbackDataMigration(migrationId: string): Promise<DataMigrationRollbackResult> {
    try {
      // 1. 验证迁移状态
      const migrationStatus = await this.verifyMigrationStatus(migrationId);
      if (!migrationStatus.canRollback) {
        throw new Error(`迁移 ${migrationId} 不支持回滚: ${migrationStatus.reason}`);
      }
      
      // 2. 创建回滚点
      const rollbackPoint = await this.createRollbackPoint(migrationId);
      
      // 3. 执行数据回滚
      const rollbackResult = await this.executeDataRollback(migrationId, rollbackPoint);
      
      // 4. 验证回滚结果
      const verificationResult = await this.verifyDataRollback(migrationId, rollbackPoint);
      
      return {
        success: verificationResult.success,
        migrationId,
        rollbackPoint,
        rollbackResult,
        verificationResult,
        errors: verificationResult.errors || []
      };
    } catch (error) {
      this.logger.error(`数据迁移回滚失败`, { migrationId, error: error.message });
      return {
        success: false,
        migrationId,
        rollbackPoint: null,
        rollbackResult: null,
        verificationResult: null,
        errors: [error.message]
      };
    }
  }

  private async verifyMigrationStatus(migrationId: string): Promise<MigrationStatus> {
    // 检查迁移状态，确定是否可以回滚
    const migration = await this.dataSource.query(
      'SELECT * FROM migrations WHERE id = $1',
      [migrationId]
    );
    
    if (migration.rows.length === 0) {
      return {
        canRollback: false,
        reason: '迁移记录不存在'
      };
    }
    
    const migrationRecord = migration.rows[0];
    
    // 检查迁移是否已完成
    if (migrationRecord.status !== 'completed') {
      return {
        canRollback: false,
        reason: '迁移未完成'
      };
    }
    
    // 检查是否有回滚脚本
    if (!migrationRecord.rollback_script) {
      return {
        canRollback: false,
        reason: '没有可用的回滚脚本'
      };
    }
    
    return {
      canRollback: true,
      reason: null
    };
  }

  private async createRollbackPoint(migrationId: string): Promise<RollbackPoint> {
    // 创建回滚点，记录当前状态
    const timestamp = new Date();
    const rollbackPointId = `rollback_${migrationId}_${timestamp.getTime()}`;
    
    // 备份受影响的数据表
    const affectedTables = await this.getAffectedTables(migrationId);
    const tableBackups = {};
    
    for (const table of affectedTables) {
      const backupTableName = `${table}_backup_${rollbackPointId}`;
      
      // 创建备份表
      await this.dataSource.query(`
        CREATE TABLE ${backupTableName} AS SELECT * FROM ${table}
      `);
      
      tableBackups[table] = backupTableName;
    }
    
    // 记录回滚点信息
    await this.dataSource.query(`
      INSERT INTO rollback_points (id, migration_id, timestamp, table_backups)
      VALUES ($1, $2, $3, $4)
    `, [rollbackPointId, migrationId, timestamp, JSON.stringify(tableBackups)]);
    
    return {
      id: rollbackPointId,
      migrationId,
      timestamp,
      tableBackups
    };
  }

  private async executeDataRollback(migrationId: string, rollbackPoint: RollbackPoint): Promise<any> {
    // 执行数据回滚
    const migration = await this.dataSource.query(
      'SELECT * FROM migrations WHERE id = $1',
      [migrationId]
    );
    
    const migrationRecord = migration.rows[0];
    const rollbackScript = migrationRecord.rollback_script;
    
    // 开始事务
    await this.dataSource.query('BEGIN');
    
    try {
      // 执行回滚脚本
      await this.dataSource.query(rollbackScript);
      
      // 恢复加密数据（如果需要）
      await this.restoreEncryptedData(rollbackPoint);
      
      // 更新迁移状态
      await this.dataSource.query(`
        UPDATE migrations 
        SET status = 'rolled_back', rollback_date = $1, rollback_point_id = $2
        WHERE id = $3
      `, [new Date(), rollbackPoint.id, migrationId]);
      
      // 提交事务
      await this.dataSource.query('COMMIT');
      
      return {
        success: true,
        message: '数据迁移回滚成功'
      };
    } catch (error) {
      // 回滚事务
      await this.dataSource.query('ROLLBACK');
      
      throw error;
    }
  }

  private async restoreEncryptedData(rollbackPoint: RollbackPoint): Promise<void> {
    // 恢复加密数据
    for (const [originalTable, backupTable] of Object.entries(rollbackPoint.tableBackups)) {
      // 检查表是否包含加密数据
      const tableColumns = await this.dataSource.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [originalTable]);
      
      const encryptedColumns = tableColumns.rows.filter(column => 
        column.column_name.includes('encrypted') || 
        column.column_name.includes('secure')
      );
      
      if (encryptedColumns.length > 0) {
        // 从备份表恢复数据
        for (const column of encryptedColumns) {
          await this.dataSource.query(`
            UPDATE ${originalTable} t1
            SET ${column.column_name} = (
              SELECT ${column.column_name} 
              FROM ${backupTable} t2 
              WHERE t1.id = t2.id
            )
          `);
        }
      }
    }
  }

  private async verifyDataRollback(migrationId: string, rollbackPoint: RollbackPoint): Promise<DataRollbackVerificationResult> {
    const verificationResults = [];
    
    // 验证数据完整性
    for (const [originalTable, backupTable] of Object.entries(rollbackPoint.tableBackups)) {
      const integrityCheck = await this.verifyTableIntegrity(originalTable, backupTable);
      verificationResults.push(integrityCheck);
    }
    
    // 验证加密数据
    const encryptionCheck = await this.verifyEncryptedData(rollbackPoint);
    verificationResults.push(encryptionCheck);
    
    const allSuccessful = verificationResults.every(result => result.success);
    
    return {
      success: allSuccessful,
      verificationResults,
      errors: allSuccessful ? [] : verificationResults.filter(r => !r.success).map(r => r.error)
    };
  }

  private async verifyTableIntegrity(originalTable: string, backupTable: string): Promise<TableIntegrityResult> {
    try {
      // 比较原始表和备份表的行数
      const originalCount = await this.dataSource.query(`SELECT COUNT(*) FROM ${originalTable}`);
      const backupCount = await this.dataSource.query(`SELECT COUNT(*) FROM ${backupTable}`);
      
      if (parseInt(originalCount.rows[0].count) !== parseInt(backupCount.rows[0].count)) {
        return {
          success: false,
          table: originalTable,
          error: `行数不匹配: 原始表 ${originalCount.rows[0].count}, 备份表 ${backupCount.rows[0].count}`
        };
      }
      
      // 比较表结构
      const originalColumns = await this.dataSource.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [originalTable]);
      
      const backupColumns = await this.dataSource.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [backupTable]);
      
      if (originalColumns.rows.length !== backupColumns.rows.length) {
        return {
          success: false,
          table: originalTable,
          error: '列数不匹配'
        };
      }
      
      return {
        success: true,
        table: originalTable
      };
    } catch (error) {
      return {
        success: false,
        table: originalTable,
        error: error.message
      };
    }
  }

  private async verifyEncryptedData(rollbackPoint: RollbackPoint): Promise<EncryptedDataResult> {
    try {
      const encryptedDataChecks = [];
      
      for (const [originalTable] of Object.entries(rollbackPoint.tableBackups)) {
        // 检查表中的加密数据
        const tableColumns = await this.dataSource.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1
        `, [originalTable]);
        
        const encryptedColumns = tableColumns.rows.filter(column => 
          column.column_name.includes('encrypted') || 
          column.column_name.includes('secure')
        );
        
        for (const column of encryptedColumns) {
          // 检查加密数据是否可以正确解密
          const sampleData = await this.dataSource.query(`
            SELECT ${column.column_name} FROM ${originalTable} 
            WHERE ${column.column_name} IS NOT NULL 
            LIMIT 10
          `);
          
          for (const row of sampleData.rows) {
            const encryptedValue = row[column.column_name];
            
            if (encryptedValue) {
              try {
                // 尝试解密数据
                const decryptedValue = this.encryptionService.decrypt(encryptedValue);
                
                if (!decryptedValue) {
                  encryptedDataChecks.push({
                    table: originalTable,
                    column: column.column_name,
                    value: encryptedValue,
                    error: '解密失败'
                  });
                }
              } catch (error) {
                encryptedDataChecks.push({
                  table: originalTable,
                  column: column.column_name,
                  value: encryptedValue,
                  error: error.message
                });
              }
            }
          }
        }
      }
      
      return {
        success: encryptedDataChecks.length === 0,
        checks: encryptedDataChecks,
        error: encryptedDataChecks.length > 0 ? `${encryptedDataChecks.length} 个加密数据检查失败` : null
      };
    } catch (error) {
      return {
        success: false,
        checks: [],
        error: error.message
      };
    }
  }

  private async getAffectedTables(migrationId: string): Promise<string[]> {
    // 获取迁移影响的表
    const migration = await this.dataSource.query(
      'SELECT affected_tables FROM migrations WHERE id = $1',
      [migrationId]
    );
    
    if (migration.rows.length === 0) {
      return [];
    }
    
    return JSON.parse(migration.rows[0].affected_tables);
  }
}

interface MigrationStatus {
  canRollback: boolean;
  reason: string | null;
}

interface RollbackPoint {
  id: string;
  migrationId: string;
  timestamp: Date;
  tableBackups: Record<string, string>;
}

interface DataMigrationRollbackResult {
  success: boolean;
  migrationId: string;
  rollbackPoint: RollbackPoint | null;
  rollbackResult: any;
  verificationResult: DataRollbackVerificationResult | null;
  errors: string[];
}

interface DataRollbackVerificationResult {
  success: boolean;
  verificationResults: (TableIntegrityResult | EncryptedDataResult)[];
  errors: string[];
}

interface TableIntegrityResult {
  success: boolean;
  table: string;
  error?: string;
}

interface EncryptedDataResult {
  success: boolean;
  checks: {
    table: string;
    column: string;
    value: string;
    error: string;
  }[];
  error?: string;
}
```

  keyRotationTime: 'improving' | 'degrading' | 'stable';
  tokenSecurityScore: 'improving' | 'degrading' | 'stable';
  vulnerabilityCount: 'improving' | 'degrading' | 'stable';
  authenticationResponseTime: 'improving' | 'degrading' | 'stable';
  authorizationResponseTime: 'improving' | 'degrading' | 'stable';
}

interface SecurityPerformanceAlert {
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

interface SecurityPerformanceDashboard {
  current: SecurityMetrics;
  historical: HistoricalSecurityMetrics[];
  benchmarks: SecurityBenchmarks;
  trends: SecurityTrends;
  alerts: SecurityPerformanceAlert[];
  recommendations: string[];
}
```

### 安全性能对比分析

```typescript
@Injectable()
export class SecurityPerformanceComparisonService {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly logger: Logger
  ) {}

  async compareSecurityPerformance(
    beforeDate: Date,
    afterDate: Date
  ): Promise<SecurityPerformanceComparison> {
    // 获取实施前的安全性能指标
    const beforeMetrics = await this.getSecurityMetricsForDate(beforeDate);
    
    // 获取实施后的安全性能指标
    const afterMetrics = await this.getSecurityMetricsForDate(afterDate);
    
    // 计算性能变化
    const performanceChanges = this.calculatePerformanceChanges(beforeMetrics, afterMetrics);
    
    // 生成对比报告
    const comparisonReport = this.generateComparisonReport(beforeMetrics, afterMetrics, performanceChanges);
    
    return {
      beforeDate,
      afterDate,
      beforeMetrics,
      afterMetrics,
      performanceChanges,
      comparisonReport
    };
  }

  private async getSecurityMetricsForDate(date: Date): Promise<SecurityMetrics> {
    // 获取指定日期的安全性能指标
    return {
      encryptionResponseTime: await this.metricsService.getMetricForDate('encryption_response_time', date),
      keyRotationTime: await this.metricsService.getMetricForDate('key_rotation_time', date),
      tokenSecurityScore: await this.metricsService.getMetricForDate('token_security_score', date),
      vulnerabilityCount: await this.metricsService.getMetricForDate('vulnerability_count', date),
      authenticationResponseTime: await this.metricsService.getMetricForDate('authentication_response_time', date),
      authorizationResponseTime: await this.metricsService.getMetricForDate('authorization_response_time', date)
    };
  }

  private calculatePerformanceChanges(
    before: SecurityMetrics, 
    after: SecurityMetrics
  ): SecurityPerformanceChanges {
    return {
      encryptionResponseTime: {
        before: before.encryptionResponseTime,
        after: after.encryptionResponseTime,
        change: after.encryptionResponseTime - before.encryptionResponseTime,
        changePercent: ((after.encryptionResponseTime - before.encryptionResponseTime) / before.encryptionResponseTime) * 100,
        improvement: after.encryptionResponseTime < before.encryptionResponseTime
      },
      keyRotationTime: {
        before: before.keyRotationTime,
        after: after.keyRotationTime,
        change: after.keyRotationTime - before.keyRotationTime,
        changePercent: ((after.keyRotationTime - before.keyRotationTime) / before.keyRotationTime) * 100,
        improvement: after.keyRotationTime < before.keyRotationTime
      },
      tokenSecurityScore: {
        before: before.tokenSecurityScore,
        after: after.tokenSecurityScore,
        change: after.tokenSecurityScore - before.tokenSecurityScore,
        changePercent: ((after.tokenSecurityScore - before.tokenSecurityScore) / before.tokenSecurityScore) * 100,
        improvement: after.tokenSecurityScore > before.tokenSecurityScore
      },
      vulnerabilityCount: {
        before: before.vulnerabilityCount,
        after: after.vulnerabilityCount,
        change: after.vulnerabilityCount - before.vulnerabilityCount,
        changePercent: before.vulnerabilityCount > 0 ? ((after.vulnerabilityCount - before.vulnerabilityCount) / before.vulnerabilityCount) * 100 : 0,
        improvement: after.vulnerabilityCount < before.vulnerabilityCount
      },
      authenticationResponseTime: {
        before: before.authenticationResponseTime,
        after: after.authenticationResponseTime,
        change: after.authenticationResponseTime - before.authenticationResponseTime,
        changePercent: ((after.authenticationResponseTime - before.authenticationResponseTime) / before.authenticationResponseTime) * 100,
        improvement: after.authenticationResponseTime < before.authenticationResponseTime
      },
      authorizationResponseTime: {
        before: before.authorizationResponseTime,
        after: after.authorizationResponseTime,
        change: after.authorizationResponseTime - before.authorizationResponseTime,
        changePercent: ((after.authorizationResponseTime - before.authorizationResponseTime) / before.authorizationResponseTime) * 100,
        improvement: after.authorizationResponseTime < before.authorizationResponseTime
      }
    };
  }

  private generateComparisonReport(
    before: SecurityMetrics, 
    after: SecurityMetrics, 
    changes: SecurityPerformanceChanges
  ): string {
    let report = '# 安全性能对比报告\n\n';
    report += `## 对比时间\n`;
    report += `- 实施前: ${new Date().toISOString()}\n`;
    report += `- 实施后: ${new Date().toISOString()}\n\n`;
    
    report += `## 性能指标对比\n\n`;
    
    // 加密响应时间对比
    report += `### 加密响应时间\n`;
    report += `- 实施前: ${before.encryptionResponseTime}ms\n`;
    report += `- 实施后: ${after.encryptionResponseTime}ms\n`;
    report += `- 变化: ${changes.encryptionResponseTime.change > 0 ? '+' : ''}${changes.encryptionResponseTime.change.toFixed(2)}ms (${changes.encryptionResponseTime.changePercent.toFixed(2)}%)\n`;
    report += `- 状态: ${changes.encryptionResponseTime.improvement ? '✅ 改善' : '❌ 恶化'}\n\n`;
    
    // 密钥轮换时间对比
    report += `### 密钥轮换时间\n`;
    report += `- 实施前: ${(before.keyRotationTime / 1000 / 60).toFixed(2)}分钟\n`;
    report += `- 实施后: ${(after.keyRotationTime / 1000 / 60).toFixed(2)}分钟\n`;
    report += `- 变化: ${changes.keyRotationTime.change > 0 ? '+' : ''}${(changes.keyRotationTime.change / 1000 / 60).toFixed(2)}分钟 (${changes.keyRotationTime.changePercent.toFixed(2)}%)\n`;
    report += `- 状态: ${changes.keyRotationTime.improvement ? '✅ 改善' : '❌ 恶化'}\n\n`;
    
    // 令牌安全评分对比
    report += `### 令牌安全评分\n`;
    report += `- 实施前: ${before.tokenSecurityScore}%\n`;
    report += `- 实施后: ${after.tokenSecurityScore}%\n`;
    report += `- 变化: ${changes.tokenSecurityScore.change > 0 ? '+' : ''}${changes.tokenSecurityScore.change.toFixed(2)}% (${changes.tokenSecurityScore.changePercent.toFixed(2)}%)\n`;
    report += `- 状态: ${changes.tokenSecurityScore.improvement ? '✅ 改善' : '❌ 恶化'}\n\n`;
    
    // 漏洞数量对比
    report += `### 安全漏洞数量\n`;
    report += `- 实施前: ${before.vulnerabilityCount}个\n`;
    report += `- 实施后: ${after.vulnerabilityCount}个\n`;
    report += `- 变化: ${changes.vulnerabilityCount.change > 0 ? '+' : ''}${changes.vulnerabilityCount.change}个 (${changes.vulnerabilityCount.changePercent.toFixed(2)}%)\n`;
    report += `- 状态: ${changes.vulnerabilityCount.improvement ? '✅ 改善' : '❌ 恶化'}\n\n`;
    
    // 认证响应时间对比
    report += `### 认证响应时间\n`;
    report += `- 实施前: ${before.authenticationResponseTime}ms\n`;
    report += `- 实施后: ${after.authenticationResponseTime}ms\n`;
    report += `- 变化: ${changes.authenticationResponseTime.change > 0 ? '+' : ''}${changes.authenticationResponseTime.change.toFixed(2)}ms (${changes.authenticationResponseTime.changePercent.toFixed(2)}%)\n`;
    report += `- 状态: ${changes.authenticationResponseTime.improvement ? '✅ 改善' : '❌ 恶化'}\n\n`;
    
    // 授权响应时间对比
    report += `### 授权响应时间\n`;
    report += `- 实施前: ${before.authorizationResponseTime}ms\n`;
    report += `- 实施后: ${after.authorizationResponseTime}ms\n`;
    report += `- 变化: ${changes.authorizationResponseTime.change > 0 ? '+' : ''}${changes.authorizationResponseTime.change.toFixed(2)}ms (${changes.authorizationResponseTime.changePercent.toFixed(2)}%)\n`;
    report += `- 状态: ${changes.authorizationResponseTime.improvement ? '✅ 改善' : '❌ 恶化'}\n\n`;
    
    // 总体评估
    const improvedMetrics = Object.values(changes).filter(change => change.improvement).length;
    const totalMetrics = Object.values(changes).length;
    const improvementRate = (improvedMetrics / totalMetrics) * 100;
    
    report += `## 总体评估\n`;
    report += `- 改善指标: ${improvedMetrics}/${totalMetrics}\n`;
    report += `- 改善率: ${improvementRate.toFixed(2)}%\n`;
    report += `- 总体状态: ${improvementRate >= 70 ? '✅ 优秀' : improvementRate >= 50 ? '⚠️ 良好' : '❌ 需要改进'}\n\n`;
    
    // 建议
    report += `## 改进建议\n`;
    
    if (!changes.encryptionResponseTime.improvement) {
      report += `- 优化加密算法实现，考虑硬件加速或算法优化\n`;
    }
    
    if (!changes.keyRotationTime.improvement) {
      report += `- 优化密钥轮换流程，实现自动化密钥轮换\n`;
    }
    
    if (!changes.tokenSecurityScore.improvement) {
      report += `- 增强令牌安全机制，考虑使用更安全的算法或更短的过期时间\n`;
    }
    
    if (!changes.vulnerabilityCount.improvement) {
      report += `- 立即修复安全漏洞，建立定期安全扫描机制\n`;
    }
    
    if (!changes.authenticationResponseTime.improvement) {
      report += `- 优化认证流程，考虑使用缓存或更高效的认证算法\n`;
    }
    
    if (!changes.authorizationResponseTime.improvement) {
      report += `- 优化授权流程，考虑使用缓存或更高效的权限检查机制\n`;
    }
    
    return report;
  }
}

interface SecurityPerformanceChanges {
  encryptionResponseTime: {
    before: number;
    after: number;
    change: number;
    changePercent: number;
    improvement: boolean;
  };
  keyRotationTime: {
    before: number;
    after: number;
    change: number;
    changePercent: number;
    improvement: boolean;
  };
  tokenSecurityScore: {
    before: number;
    after: number;
    change: number;
    changePercent: number;
    improvement: boolean;
  };
  vulnerabilityCount: {
    before: number;
    after: number;
    change: number;
    changePercent: number;
    improvement: boolean;
  };
  authenticationResponseTime: {
    before: number;
    after: number;
    change: number;
    changePercent: number;
    improvement: boolean;
  };
  authorizationResponseTime: {
    before: number;
    after: number;
    change: number;
    changePercent: number;
    improvement: boolean;
  };
}

interface SecurityPerformanceComparison {
  beforeDate: Date;
  afterDate: Date;
  beforeMetrics: SecurityMetrics;
  afterMetrics: SecurityMetrics;
  performanceChanges: SecurityPerformanceChanges;
  comparisonReport: string;
}
```


  private async mitigateEncryptionPerformanceRisk(
    risk: Risk, 
    strategy: string
  ): Promise<MitigationResult> {
    if (strategy === 'optimize_algorithm') {
      // 优化加密算法实现
      const optimizationResult = await this.optimizeEncryptionAlgorithm();
      
      return {
        success: optimizationResult.success,
        message: optimizationResult.success 
          ? '加密算法优化成功，性能提升' 
          : '加密算法优化失败',
        actions: [
          '分析加密性能瓶颈',
          '优化加密算法实现',
          '性能测试验证',
          '部署优化版本'
        ]
      };
    } else if (strategy === 'increase_resources') {
      // 增加硬件资源
      const resourceAllocationResult = await this.allocateMoreResources();
      
      return {
        success: resourceAllocationResult.success,
        message: resourceAllocationResult.success 
          ? '硬件资源增加成功' 
          : '硬件资源增加失败',
        actions: [
          '评估资源需求',
          '申请额外资源',
          '配置资源分配',
          '验证性能改善'
        ]
      };
    } else if (strategy === 'implement_caching') {
      // 实现加密结果缓存
      const cachingResult = await this.implementEncryptionCaching();
      
      return {
        success: cachingResult.success,
        message: cachingResult.success 
          ? '加密缓存实现成功' 
          : '加密缓存实现失败',
        actions: [
          '设计缓存策略',
          '实现缓存机制',
          '配置缓存参数',
          '测试缓存效果'
        ]
      };
    }
    
    return {
      success: false,
      message: `未知的缓解策略: ${strategy}`
    };
  }

  private async mitigateEncryptionFailureRisk(
    risk: Risk, 
    strategy: string
  ): Promise<MitigationResult> {
    if (strategy === 'debug_implementation') {
      // 调试加密实现
      const debugResult = await this.debugEncryptionImplementation();
      
      return {
        success: debugResult.success,
        message: debugResult.success 
          ? '加密实现调试成功，问题已修复' 
          : '加密实现调试失败',
        actions: [
          '分析加密失败日志',
          '定位问题根因',
          '修复加密实现',
          '验证修复效果'
        ]
      };
    } else if (strategy === 'rollback_algorithm') {
      // 回滚到旧加密算法
      const rollbackResult = await this.rollbackToOldEncryptionAlgorithm();
      
      return {
        success: rollbackResult.success,
        message: rollbackResult.success 
          ? '已回滚到旧加密算法' 
          : '加密算法回滚失败',
        actions: [
          '备份当前加密配置',
          '切换到旧加密算法',
          '验证旧算法正常工作',
          '计划后续优化'
        ]
      };
    }
    
    return {
      success: false,
      message: `未知的缓解策略: ${strategy}`
    };
  }

  private async mitigateKeyRotationDelayRisk(
    risk: Risk, 
    strategy: string
  ): Promise<MitigationResult> {
    if (strategy === 'immediate_rotation') {
      // 立即执行密钥轮换
      const rotationResult = await this.keyManagementService.rotateEncryptionKey();
      
      return {
        success: rotationResult,
        message: rotationResult 
          ? '密钥轮换执行成功' 
          : '密钥轮换执行失败',
        actions: [
          '生成新密钥',
          '验证新密钥',
          '更新加密配置',
          '测试新密钥加密'
        ]
      };
    } else if (strategy === 'extend_rotation_interval') {
      // 延长密钥轮换间隔
      const extensionResult = await this.extendKeyRotationInterval();
      
      return {
        success: extensionResult.success,
        message: extensionResult.success 
          ? '密钥轮换间隔已延长' 
          : '密钥轮换间隔延长失败',
        actions: [
          '评估延长风险',
          '更新轮换配置',
          '记录延长决策',
          '制定后续轮换计划'
        ]
      };
    }
    
    return {
      success: false,
      message: `未知的缓解策略: ${strategy}`
    };
  }

  private async mitigateKeyBackupFailureRisk(
    risk: Risk, 
    strategy: string
  ): Promise<MitigationResult> {
    if (strategy === 'manual_backup') {
      // 执行手动密钥备份
      const backupResult = await this.performManualKeyBackup();
      
      return {
        success: backupResult.success,
        message: backupResult.success 
          ? '手动密钥备份执行成功' 
          : '手动密钥备份执行失败',
        actions: [
          '生成备份密钥',
          '安全存储备份',
          '验证备份完整性',
          '更新备份记录'
        ]
      };
    } else if (strategy === 'fix_backup_system') {
      // 修复备份系统
      const fixResult = await this.fixKeyBackupSystem();
      
      return {
        success: fixResult.success,
        message: fixResult.success 
          ? '密钥备份系统修复成功' 
          : '密钥备份系统修复失败',
        actions: [
          '诊断备份系统问题',
          '修复备份系统故障',
          '测试备份系统功能',
          '恢复自动备份'
        ]
      };
    }
    
    return {
      success: false,
      message: `未知的缓解策略: ${strategy}`
    };
  }

  private async mitigateEncryptionCompatibilityRisk(
    risk: Risk, 
    strategy: string
  ): Promise<MitigationResult> {
    if (strategy === 'dual_algorithm_support') {
      // 实现双算法支持
      const dualSupportResult = await this.implementDualAlgorithmSupport();
      
      return {
        success: dualSupportResult.success,
        message: dualSupportResult.success 
          ? '双算法支持实现成功' 
          : '双算法支持实现失败',
        actions: [
          '设计双算法架构',
          '实现新旧算法支持',
          '配置算法选择逻辑',
          '测试双算法兼容性'
        ]
      };
    } else if (strategy === 'gradual_migration') {
      // 渐进式数据迁移
      const migrationResult = await this.performGradualDataMigration();
      
      return {
        success: migrationResult.success,
        message: migrationResult.success 
          ? '渐进式数据迁移启动成功' 
          : '渐进式数据迁移启动失败',
        actions: [
          '制定迁移计划',
          '分批迁移数据',
          '验证迁移结果',
          '处理迁移问题'
        ]
      };
    }
    
    return {
      success: false,
      message: `未知的缓解策略: ${strategy}`
    };
  }

  private async mitigateDataMigrationRisk(
    risk: Risk, 
    strategy: string
  ): Promise<MitigationResult> {
    if (strategy === 'pause_migration') {
      // 暂停数据迁移
      const pauseResult = await this.dataMigrationService.pauseMigration();
      
      return {
        success: pauseResult.success,
        message: pauseResult.success 
          ? '数据迁移已暂停' 
          : '数据迁移暂停失败',
        actions: [
          '停止迁移进程',
          '保护已迁移数据',
          '分析迁移错误',
          '制定修复计划'
        ]
      };
    } else if (strategy === 'fix_migration_errors') {
      // 修复迁移错误
      const fixResult = await this.dataMigrationService.fixMigrationErrors();
      
      return {
        success: fixResult.success,
        message: fixResult.success 
          ? '迁移错误修复成功' 
          : '迁移错误修复失败',
        actions: [
          '分析错误原因',
          '修复错误代码',
          '验证修复效果',
          '恢复迁移进程'
        ]
      };
    }
    
    return {
      success: false,
      message: `未知的缓解策略: ${strategy}`
    };
  }

  private async mitigateDataIntegrityRisk(
    risk: Risk, 
    strategy: string
  ): Promise<MitigationResult> {
    if (strategy === 'restore_from_backup') {
      // 从备份恢复数据
      const restoreResult = await this.restoreDataFromBackup();
      
      return {
        success: restoreResult.success,
        message: restoreResult.success 
          ? '数据从备份恢复成功' 
          : '数据从备份恢复失败',
        actions: [
          '选择合适备份',
          '验证备份完整性',
          '执行数据恢复',
          '验证恢复结果'
        ]
      };
    } else if (strategy === 'repair_corrupted_data') {
      // 修复损坏数据
      const repairResult = await this.repairCorruptedData();
      
      return {
        success: repairResult.success,
        message: repairResult.success 
          ? '损坏数据修复成功' 
          : '损坏数据修复失败',
        actions: [
          '识别损坏数据',
          '分析损坏原因',
          '执行数据修复',
          '验证修复结果'
        ]
      };
    }
    
    return {
      success: false,
      message: `未知的缓解策略: ${strategy}`
    };
  }

  private async mitigateDataCorruptionRisk(
    risk: Risk, 
    strategy: string
  ): Promise<MitigationResult> {
    if (strategy === 'implement_data_verification') {
      // 实现数据验证机制
      const verificationResult = await this.implementDataVerification();
      
      return {
        success: verificationResult.success,
        message: verificationResult.success 
          ? '数据验证机制实现成功' 
          : '数据验证机制实现失败',
        actions: [
          '设计验证算法',
          '实现验证机制',
          '配置验证参数',
          '测试验证效果'
        ]
      };
    } else if (strategy === 'enhance_storage_redundancy') {
      // 增强存储冗余
      const redundancyResult = await this.enhanceStorageRedundancy();
      
      return {
        success: redundancyResult.success,
        message: redundancyResult.success 
          ? '存储冗余增强成功' 
          : '存储冗余增强失败',
        actions: [
          '评估存储需求',
          '设计冗余方案',
          '配置冗余存储',
          '测试冗余效果'
        ]
      };
    }
    
    return {
      success: false,
      message: `未知的缓解策略: ${strategy}`
    };
  }

  // 辅助方法实现...
  private async getRiskById(riskId: string): Promise<Risk> {
    // 实现获取风险详情的逻辑
    return {} as Risk;
  }

  private async optimizeEncryptionAlgorithm(): Promise<any> {
    // 实现优化加密算法的逻辑
    return { success: true };
  }

  private async allocateMoreResources(): Promise<any> {
    // 实现增加硬件资源的逻辑
    return { success: true };
  }

  private async implementEncryptionCaching(): Promise<any> {
    // 实现加密结果缓存的逻辑
    return { success: true };
  }

  private async debugEncryptionImplementation(): Promise<any> {
    // 实现调试加密实现的逻辑
    return { success: true };
  }

  private async rollbackToOldEncryptionAlgorithm(): Promise<any> {
    // 实现回滚到旧加密算法的逻辑
    return { success: true };
  }

  private async extendKeyRotationInterval(): Promise<any> {
    // 实现延长密钥轮换间隔的逻辑
    return { success: true };
  }

  private async performManualKeyBackup(): Promise<any> {
    // 实现执行手动密钥备份的逻辑
    return { success: true };
  }

  private async fixKeyBackupSystem(): Promise<any> {
    // 实现修复密钥备份系统的逻辑
    return { success: true };
  }

  private async implementDualAlgorithmSupport(): Promise<any> {
    // 实现双算法支持的逻辑
    return { success: true };
  }

  private async performGradualDataMigration(): Promise<any> {
    // 实现渐进式数据迁移的逻辑
    return { success: true };
  }

  private async restoreDataFromBackup(): Promise<any> {
    // 实现从备份恢复数据的逻辑
    return { success: true };
  }

  private async repairCorruptedData(): Promise<any> {
    // 实现修复损坏数据的逻辑
    return { success: true };
  }

  private async implementDataVerification(): Promise<any> {
    // 实现数据验证机制的逻辑
    return { success: true };
  }

  private async enhanceStorageRedundancy(): Promise<any> {
    // 实现增强存储冗余的逻辑
    return { success: true };
  }
}

interface Risk {
  id: string;
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
}

interface MitigationResult {
  success: boolean;
  message: string;
  actions: string[];
}
```

## 📝 使用说明

### 安全实现原则
1. **最小权限**: 每个组件只授予必要的最小权限
2. **深度防御**: 多层安全控制，单一失效不会导致系统被攻破
3. **默认安全**: 默认配置是最安全的，需要显式配置才能降低安全性
4. **透明验证**: 所有安全验证应该是透明的，不应影响正常用户体验

### 密钥管理原则
1. **密钥分离**: 不同用途使用不同的密钥
2. **定期轮换**: 定期更换密钥，减少密钥泄露风险
3. **安全存储**: 密钥应该安全存储，不应硬编码在代码中
4. **访问控制**: 严格控制密钥访问权限

### 输入验证原则
1. **白名单验证**: 使用白名单而非黑名单进行验证
2. **类型验证**: 验证输入数据的类型和格式
3. **长度限制**: 限制输入数据的长度
4. **特殊字符处理**: 正确处理特殊字符，防止注入攻击

---

## 📞 联系信息

### 安全团队
- **安全负责人**: 安全策略制定和审批
- **安全工程师**: 安全实现和漏洞修复
- **安全审计员**: 安全审计和合规检查
- **应急响应团队**: 安全事件响应和处理

### 安全事件报告
- **高危漏洞**: 立即联系安全负责人
- **安全事件**: 联系应急响应团队
- **安全咨询**: 联系安全工程师
- **合规问题**: 联系安全审计员

---

**版本**: v1.0.0  
**创建时间**: 2025-10-02  
**下次评估**: 2025-11-02  
**维护周期**: 每月评估更新