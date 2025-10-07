# 🔐 高级JWT策略实现

> **改进JWT策略为RS256非对称加密** - 提升安全性，支持密钥轮换与跨服务认证  
> **更新时间**: 2025-10-02  
> **适用范围**: 所有认证授权相关功能

---

## 🎯 JWT策略升级概述

### 当前问题分析
原计划中使用的HS256对称加密存在以下问题：
- 密钥管理困难，所有服务需要共享同一密钥
- 密钥轮换复杂，需要同时更新所有服务
- 跨服务认证安全性不足，密钥泄露影响范围大
- 缺乏密钥版本管理，无法平滑过渡

### 升级方案
采用RS256非对称加密 + 密钥管理 + 令牌轮换的现代化JWT策略：
- 使用RSA密钥对，私钥签名，公钥验证
- 支持密钥轮换和版本管理
- 实现令牌黑名单机制
- 添加令牌复用检测
- 支持多服务认证

---

## 🔑 RS256非对称加密实现

### JWT配置优化
```typescript
// JWT配置优化 - 升级到RS256非对称加密
const jwtConfig = {
  accessTokenExpiresIn: '15m',
  refreshTokenExpiresIn: '7d',
  algorithm: 'RS256', // 升级到非对称加密
  issuer: 'caddy-shopping',
  audience: 'caddy-shopping-users',
  keyId: 'main-key', // 密钥标识符
  clockTolerance: 30 // 30秒时钟偏差容忍
};

@Injectable()
export class JwtConfigService {
  constructor(private readonly configService: ConfigService) {}

  getJwtConfig(): typeof jwtConfig {
    return {
      ...jwtConfig,
      accessTokenExpiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', jwtConfig.accessTokenExpiresIn),
      refreshTokenExpiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', jwtConfig.refreshTokenExpiresIn),
      issuer: this.configService.get<string>('JWT_ISSUER', jwtConfig.issuer),
      audience: this.configService.get<string>('JWT_AUDIENCE', jwtConfig.audience),
      clockTolerance: this.configService.get<number>('JWT_CLOCK_TOLERANCE', jwtConfig.clockTolerance)
    };
  }
}
```

### 高级JWT服务实现
```typescript
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class AdvancedJwtService {
  private readonly logger = new Logger(AdvancedJwtService.name);
  private readonly keyCache = new Map<string, { publicKey: string; privateKey: string; createdAt: Date }>();

  constructor(
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis
  ) {}

  /**
   * 生成访问令牌 (RS256算法)
   */
  async generateAccessToken(payload: JwtPayload): Promise<string> {
    try {
      const keyId = await this.getCurrentKeyId();
      const privateKey = await this.getPrivateKey(keyId);
      
      const tokenPayload: EnhancedJwtPayload = {
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + this.parseExpirationTime(this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m')),
        jti: this.generateJti(),
        kid: keyId,
        scope: payload.roles?.join(' ') || ''
      };

      return jwt.sign(tokenPayload, privateKey, {
        algorithm: 'RS256',
        issuer: this.configService.get<string>('JWT_ISSUER', 'caddy-shopping'),
        audience: this.configService.get<string>('JWT_AUDIENCE', 'caddy-shopping-users'),
        keyid: keyId
      });
    } catch (error) {
      this.logger.error('Access token generation failed', { error: error.message });
      throw new Error('Token generation failed');
    }
  }

  /**
   * 生成刷新令牌 (RS256算法)
   */
  async generateRefreshToken(payload: JwtPayload): Promise<string> {
    try {
      const keyId = await this.getCurrentKeyId();
      const privateKey = await this.getPrivateKey(keyId);
      
      const tokenPayload: EnhancedJwtPayload = {
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + this.parseExpirationTime(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d')),
        jti: this.generateJti(),
        kid: keyId,
        tokenType: 'refresh',
        scope: payload.roles?.join(' ') || ''
      };

      return jwt.sign(tokenPayload, privateKey, {
        algorithm: 'RS256',
        issuer: this.configService.get<string>('JWT_ISSUER', 'caddy-shopping'),
        audience: this.configService.get<string>('JWT_AUDIENCE', 'caddy-shopping-users'),
        keyid: keyId
      });
    } catch (error) {
      this.logger.error('Refresh token generation failed', { error: error.message });
      throw new Error('Token generation failed');
    }
  }

  /**
   * 验证令牌 (RS256算法)
   */
  async verifyToken(token: string): Promise<EnhancedJwtPayload> {
    try {
      // 1. 检查令牌黑名单
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // 2. 解码令牌获取kid
      const decoded = jwt.decode(token, { complete: true }) as any;
      if (!decoded || !decoded.header || !decoded.header.kid) {
        throw new UnauthorizedException('Invalid token format');
      }

      const keyId = decoded.header.kid;
      
      // 3. 获取对应的公钥
      const publicKey = await this.getPublicKey(keyId);
      
      // 4. 验证令牌
      const payload = jwt.verify(token, publicKey, {
        algorithms: ['RS256'], // 仅允许RS256算法
        issuer: this.configService.get<string>('JWT_ISSUER', 'caddy-shopping'),
        audience: this.configService.get<string>('JWT_AUDIENCE', 'caddy-shopping-users'),
        clockTolerance: this.configService.get<number>('JWT_CLOCK_TOLERANCE', 30)
      }) as EnhancedJwtPayload;
      
      // 5. 检查令牌是否即将过期（提前5分钟）
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp - now < 300) {
        payload.tokenExpiringSoon = true;
      }
      
      return payload;
      
    } catch (error) {
      this.logger.error('Token verification failed', { 
        error: error.message,
        tokenPreview: token.substring(0, 20) + '...'
      });
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * 令牌刷新机制
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AccessTokenResponse> {
    try {
      // 1. 验证刷新令牌
      const payload = await this.verifyToken(refreshTokenDto.refreshToken);
      
      // 2. 检查令牌类型
      if (payload.tokenType !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }
      
      // 3. 检查令牌是否已被使用（复用检测）
      if (await this.isTokenUsed(refreshTokenDto.refreshToken)) {
        // 如果刷新令牌被复用，可能存在攻击，将所有相关令牌加入黑名单
        await this.revokeUserTokens(payload.sub);
        throw new UnauthorizedException('Refresh token reuse detected');
      }
      
      // 4. 检查用户是否仍然存在且状态正常
      const user = await this.userService.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }
      
      // 5. 检查令牌版本（防止令牌重放攻击）
      if (payload.tokenVersion !== user.tokenVersion) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      
      // 6. 标记旧刷新令牌为已使用
      await this.markTokenAsUsed(refreshTokenDto.refreshToken, payload.exp);
      
      // 7. 生成新的访问令牌
      const newPayload: JwtPayload = {
        sub: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles
      };
      
      const newAccessToken = await this.generateAccessToken(newPayload);
      
      // 8. 记录令牌刷新事件
      this.logger.info('Access token refreshed', {
        userId: user.id,
        oldTokenJti: payload.jti,
        newTokenJti: this.extractJti(newAccessToken)
      });
      
      return {
        accessToken: newAccessToken,
        expiresIn: this.parseExpirationTime(this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m')),
        tokenType: 'Bearer'
      };
      
    } catch (error) {
      this.logger.error('Token refresh failed', { error: error.message });
      throw error;
    }
  }

  /**
   * 令牌撤销（登出）
   */
  async revokeToken(token: string): Promise<void> {
    try {
      const payload = await this.verifyToken(token);
      
      // 将令牌添加到黑名单
      await this.addToBlacklist(token, new Date(payload.exp * 1000));
      
      // 记录令牌撤销事件
      this.logger.info('Token revoked', {
        tokenId: payload.jti,
        userId: payload.sub
      });
      
    } catch (error) {
      // 即使令牌验证失败，也尝试将提供的令牌加入黑名单
      try {
        await this.addToBlacklist(token, new Date(Date.now() + 24 * 60 * 60 * 1000)); // 24小时后过期
      } catch (blacklistError) {
        this.logger.error('Failed to add token to blacklist during revoke', {
          error: blacklistError.message
        });
      }
      
      this.logger.error('Token revocation failed', { error: error.message });
    }
  }

  /**
   * 撤销用户所有令牌
   */
  async revokeUserTokens(userId: string): Promise<void> {
    try {
      // 更新用户令牌版本，使所有旧令牌失效
      await this.userService.updateTokenVersion(userId);
      
      // 记录用户令牌撤销事件
      this.logger.info('All user tokens revoked', {
        userId
      });
      
    } catch (error) {
      this.logger.error('Failed to revoke user tokens', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  // 私有方法实现

  private async getCurrentKeyId(): Promise<string> {
    // 从Redis获取当前密钥ID
    const keyId = await this.redis.get('jwt:current_key_id');
    if (keyId) {
      return keyId;
    }
    
    // 如果没有当前密钥ID，生成新的密钥对
    return await this.generateNewKeyPair();
  }

  private async generateNewKeyPair(): Promise<string> {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    const keyId = this.generateKeyId();
    
    // 存储密钥对到Redis
    await this.redis.hset(`jwt:keys:${keyId}`, {
      privateKey,
      publicKey,
      createdAt: new Date().toISOString()
    });
    
    // 设置当前密钥ID
    await this.redis.set('jwt:current_key_id', keyId);
    
    // 缓存密钥到内存
    this.keyCache.set(keyId, {
      privateKey,
      publicKey,
      createdAt: new Date()
    });
    
    this.logger.info('New JWT key pair generated', { keyId });
    
    return keyId;
  }

  private async getPrivateKey(keyId: string): Promise<string> {
    // 先从内存缓存获取
    const cachedKey = this.keyCache.get(keyId);
    if (cachedKey) {
      return cachedKey.privateKey;
    }
    
    // 从Redis获取
    const keyData = await this.redis.hgetall(`jwt:keys:${keyId}`);
    if (!keyData || !keyData.privateKey) {
      throw new Error(`Private key not found for key ID: ${keyId}`);
    }
    
    // 缓存到内存
    this.keyCache.set(keyId, {
      privateKey: keyData.privateKey,
      publicKey: keyData.publicKey,
      createdAt: new Date(keyData.createdAt)
    });
    
    return keyData.privateKey;
  }

  private async getPublicKey(keyId: string): Promise<string> {
    // 先从内存缓存获取
    const cachedKey = this.keyCache.get(keyId);
    if (cachedKey) {
      return cachedKey.publicKey;
    }
    
    // 从Redis获取
    const keyData = await this.redis.hgetall(`jwt:keys:${keyId}`);
    if (!keyData || !keyData.publicKey) {
      throw new Error(`Public key not found for key ID: ${keyId}`);
    }
    
    // 缓存到内存
    this.keyCache.set(keyId, {
      privateKey: keyData.privateKey,
      publicKey: keyData.publicKey,
      createdAt: new Date(keyData.createdAt)
    });
    
    return keyData.publicKey;
  }

  private async addToBlacklist(token: string, expiresAt: Date): Promise<void> {
    const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    await this.redis.setex(`blacklist:${token}`, ttl, '1');
    
    // 记录令牌撤销事件
    this.logger.info('Token added to blacklist', { 
      tokenId: this.extractJti(token),
      expiresAt 
    });
  }

  private async isTokenBlacklisted(token: string): Promise<boolean> {
    return await this.redis.exists(`blacklist:${token}`) === 1;
  }

  private async isTokenUsed(token: string): Promise<boolean> {
    return await this.redis.exists(`used_refresh_token:${token}`) === 1;
  }

  private async markTokenAsUsed(token: string, expiresAt: number): Promise<void> {
    const ttl = expiresAt - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.setex(`used_refresh_token:${token}`, ttl, '1');
    }
  }

  private generateJti(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private generateKeyId(): string {
    return `key_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private extractJti(token: string): string {
    try {
      const decoded = jwt.decode(token, { complete: true }) as any;
      return decoded?.payload?.jti || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private parseExpirationTime(timeString: string): number {
    const timeValue = parseInt(timeString);
    const timeUnit = timeString.replace(/[0-9]/g, '');
    
    switch (timeUnit) {
      case 's': return timeValue;
      case 'm': return timeValue * 60;
      case 'h': return timeValue * 60 * 60;
      case 'd': return timeValue * 24 * 60 * 60;
      default: return timeValue; // 默认为秒
    }
  }
}

// 接口定义
export interface JwtPayload {
  sub: string; // 用户ID
  username: string;
  email: string;
  roles: string[];
}

export interface EnhancedJwtPayload extends JwtPayload {
  iat: number;
  exp: number;
  jti: string; // JWT ID，用于唯一标识
  kid: string; // 密钥ID
  scope?: string; // 权限范围
  tokenType?: 'access' | 'refresh';
  tokenVersion?: number;
  tokenExpiringSoon?: boolean;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface AccessTokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}
```

---

## 🛡️ JWT安全中间件

### 高级JWT认证守卫
```typescript
import { Injectable, CanActivate, ExecutionContext, Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdvancedJwtService } from './advanced-jwt.service';

@Injectable()
export class AdvancedJwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(AdvancedJwtAuthGuard.name);

  constructor(
    private readonly jwtService: AdvancedJwtService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    try {
      const payload = await this.jwtService.verifyToken(token);
      
      // 检查令牌是否即将过期（提前5分钟）
      if (payload.tokenExpiringSoon) {
        // 在响应头中提示令牌即将过期
        request.tokenExpiringSoon = true;
      }

      // 将用户信息附加到请求对象
      request.user = payload;
      
      // 检查角色权限
      const requiredRoles = this.reflector.get<string[]>(
        'roles',
        context.getHandler()
      );
      
      if (requiredRoles) {
        const hasRole = requiredRoles.some(role => 
          payload.roles?.includes(role)
        );
        
        if (!hasRole) {
          this.logger.warn('Insufficient permissions', {
            userId: payload.sub,
            requiredRoles,
            userRoles: payload.roles
          });
          throw new ForbiddenException('Insufficient permissions');
        }
      }

      // 检查权限范围
      const requiredScopes = this.reflector.get<string[]>(
        'scopes',
        context.getHandler()
      );
      
      if (requiredScopes) {
        const userScopes = payload.scope?.split(' ') || [];
        const hasScope = requiredScopes.some(scope => 
          userScopes.includes(scope)
        );
        
        if (!hasScope) {
          this.logger.warn('Insufficient scope permissions', {
            userId: payload.sub,
            requiredScopes,
            userScopes
          });
          throw new ForbiddenException('Insufficient scope permissions');
        }
      }

      return true;
      
    } catch (error) {
      this.logger.error('JWT authentication failed', { error });
      throw error;
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

// 角色装饰器
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// 权限范围装饰器
export const Scopes = (...scopes: string[]) => SetMetadata('scopes', scopes);
```

### 令牌刷新控制器
```typescript
import { Controller, Post, Body, HttpCode, HttpStatus, Res, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AdvancedJwtService, RefreshTokenDto, AccessTokenResponse } from './advanced-jwt.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly jwtService: AdvancedJwtService,
    private readonly userService: UserService,
    private readonly logger: Logger
  ) {}

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiResponse({ status: 200, description: '令牌刷新成功', type: AccessTokenResponse })
  @ApiResponse({ status: 401, description: '无效的刷新令牌' })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Res() response: Response,
    @Headers('user-agent') userAgent?: string
  ): Promise<void> {
    try {
      const result = await this.jwtService.refreshToken(refreshTokenDto);
      
      // 记录令牌刷新事件
      this.logger.info('Access token refreshed', {
        userAgent,
        timestamp: new Date().toISOString()
      });
      
      // 设置响应头
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Pragma', 'no-cache');
      
      response.json(result);
    } catch (error) {
      this.logger.error('Token refresh failed', { 
        error: error.message,
        userAgent
      });
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登出' })
  @ApiResponse({ status: 200, description: '登出成功' })
  async logout(
    @Body() logoutDto: LogoutDto,
    @Headers('user-agent') userAgent?: string
  ): Promise<{ message: string }> {
    try {
      // 验证并撤销访问令牌
      if (logoutDto.accessToken) {
        await this.jwtService.revokeToken(logoutDto.accessToken);
      }
      
      // 如果提供了刷新令牌，也将其加入黑名单
      if (logoutDto.refreshToken) {
        await this.jwtService.revokeToken(logoutDto.refreshToken);
      }
      
      // 记录登出事件
      this.logger.info('User logged out successfully', {
        userAgent,
        timestamp: new Date().toISOString()
      });
      
      return { message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error('Logout failed', { 
        error: error.message,
        userAgent
      });
      // 即使令牌验证失败，也返回成功，避免泄露信息
      return { message: 'Logged out successfully' };
    }
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '撤销用户所有令牌' })
  @ApiResponse({ status: 200, description: '所有令牌已撤销' })
  async logoutAll(
    @Body() logoutAllDto: LogoutAllDto,
    @Headers('user-agent') userAgent?: string
  ): Promise<{ message: string }> {
    try {
      // 验证令牌获取用户ID
      const payload = await this.jwtService.verifyToken(logoutAllDto.accessToken);
      
      // 撤销用户所有令牌
      await this.jwtService.revokeUserTokens(payload.sub);
      
      // 记录全量登出事件
      this.logger.info('All user tokens revoked', {
        userId: payload.sub,
        userAgent,
        timestamp: new Date().toISOString()
      });
      
      return { message: 'All tokens revoked successfully' };
    } catch (error) {
      this.logger.error('Logout all failed', { 
        error: error.message,
        userAgent
      });
      throw error;
    }
  }
}

interface LogoutDto {
  accessToken: string;
  refreshToken?: string;
}

interface LogoutAllDto {
  accessToken: string;
}
```

---

## 🔄 密钥轮换机制

### 密钥轮换服务
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Redis } from 'ioredis';
import { AdvancedJwtService } from './advanced-jwt.service';

@Injectable()
export class JwtKeyRotationService {
  private readonly logger = new Logger(JwtKeyRotationService.name);
  private readonly keyRotationInterval: number;

  constructor(
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly jwtService: AdvancedJwtService
  ) {
    // 默认90天轮换一次，可通过配置调整
    this.keyRotationInterval = this.configService.get<number>('JWT_KEY_ROTATION_DAYS', 90) * 24 * 60 * 60 * 1000;
  }

  /**
   * 定期检查并轮换密钥
   */
  @Cron('0 0 2 * * *') // 每天凌晨2点检查
  async checkAndRotateKeys(): Promise<void> {
    try {
      const currentKeyId = await this.redis.get('jwt:current_key_id');
      if (!currentKeyId) {
        this.logger.warn('No current key ID found, generating new key pair');
        await this.jwtService.generateNewKeyPair();
        return;
      }

      const keyData = await this.redis.hgetall(`jwt:keys:${currentKeyId}`);
      if (!keyData || !keyData.createdAt) {
        this.logger.warn('Key data not found, generating new key pair');
        await this.jwtService.generateNewKeyPair();
        return;
      }

      const createdAt = new Date(keyData.createdAt);
      const now = new Date();
      const keyAge = now.getTime() - createdAt.getTime();

      // 检查密钥是否需要轮换
      if (keyAge >= this.keyRotationInterval) {
        this.logger.info('Key rotation interval reached, initiating key rotation');
        await this.rotateKey();
      } else {
        // 计算剩余时间
        const remainingTime = this.keyRotationInterval - keyAge;
        const remainingDays = Math.ceil(remainingTime / (24 * 60 * 60 * 1000));
        
        if (remainingDays <= 7) { // 剩余7天以下时开始警告
          this.logger.warn(`Key rotation needed in ${remainingDays} days`, {
            keyId: currentKeyId,
            createdAt: keyData.createdAt
          });
        }
      }
    } catch (error) {
      this.logger.error('Key rotation check failed', { error: error.message });
    }
  }

  /**
   * 手动触发密钥轮换
   */
  async rotateKey(): Promise<void> {
    try {
      // 1. 获取当前密钥ID
      const currentKeyId = await this.redis.get('jwt:current_key_id');
      if (!currentKeyId) {
        throw new Error('No current key ID found');
      }

      // 2. 生成新密钥对
      const newKeyId = await this.jwtService.generateNewKeyPair();
      
      // 3. 更新当前密钥ID为新的密钥
      await this.redis.set('jwt:current_key_id', newKeyId);
      
      // 4. 将旧密钥标记为已弃用，但保留一段时间用于验证现有令牌
      await this.redis.hset(`jwt:keys:${currentKeyId}`, 'deprecated', 'true');
      await this.redis.expire(`jwt:keys:${currentKeyId}`, 7 * 24 * 60 * 60); // 7天后删除
      
      // 5. 记录密钥轮换事件
      this.logger.info('JWT key rotation completed', {
        oldKeyId: currentKeyId,
        newKeyId,
        timestamp: new Date().toISOString()
      });
      
      // 6. 通知其他服务（如果有分布式系统）
      await this.notifyKeyRotation(currentKeyId, newKeyId);
      
    } catch (error) {
      this.logger.error('Key rotation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * 清理过期的密钥
   */
  @Cron('0 30 3 * * 0') // 每周日凌晨3:30清理
  async cleanupExpiredKeys(): Promise<void> {
    try {
      const keyPattern = 'jwt:keys:*';
      const keys = await this.redis.keys(keyPattern);
      
      let cleanedCount = 0;
      
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        
        // 如果密钥没有设置TTL或者即将过期，标记为清理
        if (ttl === -1 || ttl < 24 * 60 * 60) { // 1天内过期
          const keyData = await this.redis.hgetall(key);
          const deprecated = keyData.deprecated === 'true';
          
          // 如果已弃用且没有TTL，删除它
          if (deprecated && ttl === -1) {
            await this.redis.del(key);
            cleanedCount++;
            
            this.logger.debug('Expired key cleaned up', {
              keyId: key.replace('jwt:keys:', '')
            });
          }
        }
      }
      
      if (cleanedCount > 0) {
        this.logger.info('Expired keys cleanup completed', {
          cleanedCount
        });
      }
    } catch (error) {
      this.logger.error('Expired keys cleanup failed', { error: error.message });
    }
  }

  /**
   * 获取密钥状态信息
   */
  async getKeyStatus(): Promise<KeyStatus> {
    try {
      const currentKeyId = await this.redis.get('jwt:current_key_id');
      if (!currentKeyId) {
        return {
          currentKeyId: null,
          keyAge: 0,
          rotationNeeded: true,
          nextRotationDate: new Date(),
          totalKeys: 0
        };
      }

      const keyData = await this.redis.hgetall(`jwt:keys:${currentKeyId}`);
      if (!keyData || !keyData.createdAt) {
        return {
          currentKeyId,
          keyAge: 0,
          rotationNeeded: true,
          nextRotationDate: new Date(),
          totalKeys: 0
        };
      }

      const createdAt = new Date(keyData.createdAt);
      const now = new Date();
      const keyAge = now.getTime() - createdAt.getTime();
      const rotationNeeded = keyAge >= this.keyRotationInterval;
      const nextRotationDate = new Date(createdAt.getTime() + this.keyRotationInterval);

      // 获取所有密钥数量
      const keyPattern = 'jwt:keys:*';
      const keys = await this.redis.keys(keyPattern);

      return {
        currentKeyId,
        keyAge,
        rotationNeeded,
        nextRotationDate,
        totalKeys: keys.length
      };
    } catch (error) {
      this.logger.error('Failed to get key status', { error: error.message });
      throw error;
    }
  }

  private async notifyKeyRotation(oldKeyId: string, newKeyId: string): Promise<void> {
    // 在分布式系统中，这里可以通知其他服务更新密钥缓存
    // 例如通过消息队列、配置中心等
    
    this.logger.info('Notifying other services about key rotation', {
      oldKeyId,
      newKeyId
    });
    
    // 示例：发布到Redis频道
    await this.redis.publish('jwt:key-rotation', JSON.stringify({
      oldKeyId,
      newKeyId,
      timestamp: new Date().toISOString()
    }));
  }
}

interface KeyStatus {
  currentKeyId: string | null;
  keyAge: number;
  rotationNeeded: boolean;
  nextRotationDate: Date;
  totalKeys: number;
}
```

---

## 📊 JWT监控与分析

### JWT监控服务
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class JwtMonitoringService {
  private readonly logger = new Logger(JwtMonitoringService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  /**
   * 收集JWT使用统计
   */
  @Cron('0 */15 * * * *') // 每15分钟执行一次
  async collectJwtStats(): Promise<void> {
    try {
      const stats = await this.gatherJwtStats();
      
      // 存储统计数据
      const timestamp = new Date().toISOString();
      await this.redis.hset(`jwt:stats:${timestamp}`, stats);
      
      // 设置过期时间（保留7天）
      await this.redis.expire(`jwt:stats:${timestamp}`, 7 * 24 * 60 * 60);
      
      // 更新实时统计
      await this.updateRealTimeStats(stats);
      
      this.logger.debug('JWT stats collected', { stats });
    } catch (error) {
      this.logger.error('Failed to collect JWT stats', { error: error.message });
    }
  }

  /**
   * 获取JWT使用报告
   */
  async getJwtReport(hours: number = 24): Promise<JwtReport> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);
      
      // 获取时间范围内的统计数据
      const stats = await this.getStatsInRange(startTime, endTime);
      
      // 计算汇总数据
      const summary = this.calculateStatsSummary(stats);
      
      // 获取实时统计
      const realTimeStats = await this.getRealTimeStats();
      
      // 获取异常统计
      const anomalies = await this.detectAnomalies(stats);
      
      return {
        period: {
          startTime,
          endTime,
          hours
        },
        summary,
        realTime: realTimeStats,
        anomalies,
        recommendations: this.generateRecommendations(summary, anomalies)
      };
    } catch (error) {
      this.logger.error('Failed to generate JWT report', { error: error.message });
      throw error;
    }
  }

  private async gatherJwtStats(): Promise<Record<string, string>> {
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    
    // 统计令牌生成数量
    const tokensGenerated = await this.redis.get('jwt:stats:tokens_generated') || '0';
    
    // 统计令牌验证数量
    const tokensVerified = await this.redis.get('jwt:stats:tokens_verified') || '0';
    
    // 统计令牌刷新数量
    const tokensRefreshed = await this.redis.get('jwt:stats:tokens_refreshed') || '0';
    
    // 统计令牌撤销数量
    const tokensRevoked = await this.redis.get('jwt:stats:tokens_revoked') || '0';
    
    // 统计验证失败数量
    const verificationFailures = await this.redis.get('jwt:stats:verification_failures') || '0';
    
    // 统计黑名单命中数量
    const blacklistHits = await this.redis.get('jwt:stats:blacklist_hits') || '0';
    
    // 统计复用检测命中数量
    const reuseDetectionHits = await this.redis.get('jwt:stats:reuse_detection_hits') || '0';
    
    // 重置计数器
    await this.redis.set('jwt:stats:tokens_generated', '0');
    await this.redis.set('jwt:stats:tokens_verified', '0');
    await this.redis.set('jwt:stats:tokens_refreshed', '0');
    await this.redis.set('jwt:stats:tokens_revoked', '0');
    await this.redis.set('jwt:stats:verification_failures', '0');
    await this.redis.set('jwt:stats:blacklist_hits', '0');
    await this.redis.set('jwt:stats:reuse_detection_hits', '0');
    
    return {
      timestamp: now.toISOString(),
      tokensGenerated,
      tokensVerified,
      tokensRefreshed,
      tokensRevoked,
      verificationFailures,
      blacklistHits,
      reuseDetectionHits
    };
  }

  private async updateRealTimeStats(stats: Record<string, string>): Promise<void> {
    // 更新实时统计
    await this.redis.hincrby('jwt:realtime:today', 'tokensGenerated', parseInt(stats.tokensGenerated));
    await this.redis.hincrby('jwt:realtime:today', 'tokensVerified', parseInt(stats.tokensVerified));
    await this.redis.hincrby('jwt:realtime:today', 'tokensRefreshed', parseInt(stats.tokensRefreshed));
    await this.redis.hincrby('jwt:realtime:today', 'tokensRevoked', parseInt(stats.tokensRevoked));
    await this.redis.hincrby('jwt:realtime:today', 'verificationFailures', parseInt(stats.verificationFailures));
    await this.redis.hincrby('jwt:realtime:today', 'blacklistHits', parseInt(stats.blacklistHits));
    await this.redis.hincrby('jwt:realtime:today', 'reuseDetectionHits', parseInt(stats.reuseDetectionHits));
    
    // 设置过期时间（每天重置）
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    await this.redis.expireat('jwt:realtime:today', Math.floor(tomorrow.getTime() / 1000));
  }

  private async getStatsInRange(startTime: Date, endTime: Date): Promise<Record<string, any>[]> {
    // 获取时间范围内的所有统计数据
    const pattern = 'jwt:stats:*';
    const keys = await this.redis.keys(pattern);
    
    const stats: Record<string, any>[] = [];
    
    for (const key of keys) {
      const keyData = await this.redis.hgetall(key);
      const timestamp = keyData.timestamp;
      
      if (timestamp) {
        const keyTime = new Date(timestamp);
        
        // 检查是否在时间范围内
        if (keyTime >= startTime && keyTime <= endTime) {
          stats.push({
            timestamp,
            ...keyData
          });
        }
      }
    }
    
    // 按时间排序
    return stats.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private calculateStatsSummary(stats: Record<string, any>[]): JwtStatsSummary {
    if (stats.length === 0) {
      return {
        totalTokensGenerated: 0,
        totalTokensVerified: 0,
        totalTokensRefreshed: 0,
        totalTokensRevoked: 0,
        totalVerificationFailures: 0,
        totalBlacklistHits: 0,
        totalReuseDetectionHits: 0,
        averageTokensPerMinute: 0,
        verificationFailureRate: 0,
        blacklistHitRate: 0,
        reuseDetectionHitRate: 0
      };
    }
    
    const summary = stats.reduce((acc, stat) => {
      acc.totalTokensGenerated += parseInt(stat.tokensGenerated);
      acc.totalTokensVerified += parseInt(stat.tokensVerified);
      acc.totalTokensRefreshed += parseInt(stat.tokensRefreshed);
      acc.totalTokensRevoked += parseInt(stat.tokensRevoked);
      acc.totalVerificationFailures += parseInt(stat.verificationFailures);
      acc.totalBlacklistHits += parseInt(stat.blacklistHits);
      acc.totalReuseDetectionHits += parseInt(stat.reuseDetectionHits);
      return acc;
    }, {
      totalTokensGenerated: 0,
      totalTokensVerified: 0,
      totalTokensRefreshed: 0,
      totalTokensRevoked: 0,
      totalVerificationFailures: 0,
      totalBlacklistHits: 0,
      totalReuseDetectionHits: 0
    });
    
    // 计算平均值和比率
    const timeRangeInMinutes = stats.length * 15; // 每15分钟一个数据点
    
    return {
      ...summary,
      averageTokensPerMinute: Math.round(summary.totalTokensGenerated / timeRangeInMinutes),
      verificationFailureRate: summary.totalTokensVerified > 0 
        ? (summary.totalVerificationFailures / summary.totalTokensVerified * 100).toFixed(2)
        : '0',
      blacklistHitRate: summary.totalTokensVerified > 0 
        ? (summary.totalBlacklistHits / summary.totalTokensVerified * 100).toFixed(2)
        : '0',
      reuseDetectionHitRate: summary.totalTokensRefreshed > 0 
        ? (summary.totalReuseDetectionHits / summary.totalTokensRefreshed * 100).toFixed(2)
        : '0'
    };
  }

  private async getRealTimeStats(): Promise<Record<string, string>> {
    return await this.redis.hgetall('jwt:realtime:today');
  }

  private async detectAnomalies(stats: Record<string, any>[]): Promise<JwtAnomaly[]> {
    const anomalies: JwtAnomaly[] = [];
    
    if (stats.length < 5) {
      return anomalies; // 数据不足，无法检测异常
    }
    
    // 检测验证失败率异常
    const recentStats = stats.slice(-5); // 最近5个数据点
    const avgVerificationFailures = recentStats.reduce((sum, stat) => 
      sum + parseInt(stat.verificationFailures), 0) / recentStats.length;
    
    const overallAvgFailures = stats.reduce((sum, stat) => 
      sum + parseInt(stat.verificationFailures), 0) / stats.length;
    
    if (avgVerificationFailures > overallAvgFailures * 2) {
      anomalies.push({
        type: 'high_verification_failure_rate',
        severity: 'warning',
        message: `Recent verification failure rate (${avgVerificationFailures.toFixed(2)}) is significantly higher than average (${overallAvgFailures.toFixed(2)})`,
        timestamp: new Date().toISOString()
      });
    }
    
    // 检测黑名单命中率异常
    const avgBlacklistHits = recentStats.reduce((sum, stat) => 
      sum + parseInt(stat.blacklistHits), 0) / recentStats.length;
    
    const overallAvgBlacklistHits = stats.reduce((sum, stat) => 
      sum + parseInt(stat.blacklistHits), 0) / stats.length;
    
    if (avgBlacklistHits > overallAvgBlacklistHits * 2) {
      anomalies.push({
        type: 'high_blacklist_hit_rate',
        severity: 'warning',
        message: `Recent blacklist hit rate (${avgBlacklistHits.toFixed(2)}) is significantly higher than average (${overallAvgBlacklistHits.toFixed(2)})`,
        timestamp: new Date().toISOString()
      });
    }
    
    return anomalies;
  }

  private generateRecommendations(summary: JwtStatsSummary, anomalies: JwtAnomaly[]): string[] {
    const recommendations: string[] = [];
    
    // 基于统计数据的建议
    if (parseFloat(summary.verificationFailureRate) > 5) {
      recommendations.push('Verification failure rate is high (>5%). Consider reviewing authentication logs for potential attacks.');
    }
    
    if (parseFloat(summary.blacklistHitRate) > 1) {
      recommendations.push('Blacklist hit rate is high (>1%). Consider reviewing token revocation processes.');
    }
    
    if (parseFloat(summary.reuseDetectionHitRate) > 0.5) {
      recommendations.push('Reuse detection hit rate is high (>0.5%). Consider reviewing refresh token usage patterns.');
    }
    
    // 基于异常的建议
    for (const anomaly of anomalies) {
      if (anomaly.type === 'high_verification_failure_rate') {
        recommendations.push('Investigate recent verification failures for potential security threats.');
      }
      
      if (anomaly.type === 'high_blacklist_hit_rate') {
        recommendations.push('Review recent token revocations and check for potential account compromises.');
      }
    }
    
    return recommendations;
  }
}

interface JwtStatsSummary {
  totalTokensGenerated: number;
  totalTokensVerified: number;
  totalTokensRefreshed: number;
  totalTokensRevoked: number;
  totalVerificationFailures: number;
  totalBlacklistHits: number;
  totalReuseDetectionHits: number;
  averageTokensPerMinute: number;
  verificationFailureRate: string;
  blacklistHitRate: string;
  reuseDetectionHitRate: string;
}

interface JwtAnomaly {
  type: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

interface JwtReport {
  period: {
    startTime: Date;
    endTime: Date;
    hours: number;
  };
  summary: JwtStatsSummary;
  realTime: Record<string, string>;
  anomalies: JwtAnomaly[];
  recommendations: string[];
}
```

---

## 📝 使用说明

### JWT安全原则
1. **最小权限**: JWT只包含必要的用户信息和权限
2. **短期有效**: 访问令牌有效期短（15分钟），减少泄露风险
3. **令牌轮换**: 定期轮换密钥，确保长期安全性
4. **撤销机制**: 提供令牌撤销机制，应对安全事件

### 密钥管理原则
1. **非对称加密**: 使用RSA密钥对，私钥签名，公钥验证
2. **密钥分离**: 不同环境使用不同的密钥对
3. **定期轮换**: 定期更换密钥，减少密钥泄露风险
4. **版本管理**: 支持多版本密钥共存，平滑过渡

### 令牌使用原则
1. **安全传输**: 使用HTTPS传输令牌，防止中间人攻击
2. **存储安全**: 客户端安全存储令牌，避免XSS攻击
3. **及时刷新**: 在令牌即将过期时主动刷新
4. **异常处理**: 妥善处理令牌验证失败，避免信息泄露

---

## 📞 联系信息

### 认证安全团队
- **安全负责人**: 认证安全策略制定和审批
- **安全工程师**: 认证安全实现和漏洞修复
- **认证专家**: JWT实现和密钥管理
- **应急响应团队**: 认证安全事件响应和处理

### 安全事件报告
- **密钥泄露**: 立即联系安全负责人
- **令牌伪造**: 联系应急响应团队
- **认证绕过**: 联系安全工程师
- **密钥轮换问题**: 联系认证专家

---

**版本**: v1.0.0  
**创建时间**: 2025-10-02  
**下次评估**: 2025-11-02  
**维护周期**: 每月评估更新