// 用途：JWT认证策略，验证JWT令牌
// 依赖文件：auth.service.ts, unified-master.config.ts
// 作者：后端开发团队
// 时间：2025-06-17 12:45:00
// 修复：添加JWT过期时间、密钥强度和载荷安全检查

import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { AuthService } from '../auth.service';
import { SECURITY_CONSTANTS } from '../../common/security/security.constants';

// 定义JWT载荷接口
export interface JwtPayload {
  sub: number; // 用户ID
  email: string; // 用户邮箱
  role: string; // 用户角色
  iat?: number; // 签发时间
  exp?: number; // 过期时间 - 强制包含
  iss?: string; // 签发者
  aud?: string; // 接收者
  jti?: string; // JWT ID
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    // 首先调用super()，然后再使用this
    const algorithm = configService.get('jwt.algorithm', 'HS256');
    const secretOrKey =
      algorithm === 'RS256' ? configService.get('jwt.publicKey') : configService.get('jwt.secret');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // 强制检查过期时间
      secretOrKey,
      algorithms: [algorithm],
      issuer: SECURITY_CONSTANTS.JWT.ISSUER,
      audience: SECURITY_CONSTANTS.JWT.AUDIENCE,
    });

    // 在super调用后验证JWT密钥强度
    this.validateJwtSecretStrength(secretOrKey, algorithm);
  }

  async validate(payload: JwtPayload) {
    try {
      // 验证JWT载荷最小要求字段
      if (!this.isValidPayload(payload)) {
        throw new UnauthorizedException('无效的JWT载荷');
      }

      // 验证令牌 - 修复类型转换错误
      await this.authService.validateToken(payload as unknown as string);

      // 返回最小化载荷，避免敏感信息泄露
      return {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch (error) {
      throw new UnauthorizedException('令牌验证失败');
    }
  }

  /**
   * 验证JWT载荷是否包含最小必要字段
   */
  private isValidPayload(payload: any): payload is JwtPayload {
    // 检查必要字段是否存在
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    // 验证用户ID
    if (!payload.sub || typeof payload.sub !== 'number' || payload.sub <= 0) {
      return false;
    }

    // 验证邮箱格式
    if (!payload.email || typeof payload.email !== 'string' || !this.isValidEmail(payload.email)) {
      return false;
    }

    // 验证角色
    if (!payload.role || typeof payload.role !== 'string' || !this.isValidRole(payload.role)) {
      return false;
    }

    // 验证过期时间必须存在且为未来时间
    if (!payload.exp || typeof payload.exp !== 'number' || payload.exp <= Date.now() / 1000) {
      return false;
    }

    // 验证签发时间（如果存在）
    if (payload.iat && typeof payload.iat !== 'number') {
      return false;
    }

    return true;
  }

  /**
   * 验证邮箱格式
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证角色是否有效
   */
  private isValidRole(role: string): boolean {
    const validRoles = ['user', 'admin', 'moderator'];
    return validRoles.includes(role.toLowerCase());
  }

  /**
   * 验证JWT密钥强度
   * @param secretOrKey JWT密钥
   * @param algorithm 加密算法
   */
  private validateJwtSecretStrength(secretOrKey: string, algorithm: string): void {
    if (!secretOrKey) {
      throw new Error('JWT密钥不能为空');
    }

    if (algorithm === 'HS256') {
      // HS256算法要求密钥长度至少64字符
      if (secretOrKey.length < 64) {
        throw new Error(`JWT密钥长度不足64字符，当前长度：${secretOrKey.length}`);
      }
    } else if (algorithm === 'RS256') {
      // RS256算法要求私钥和公钥都存在
      const privateKey = this.configService.get('jwt.privateKey');
      const publicKey = this.configService.get('jwt.publicKey');

      if (!privateKey || !publicKey) {
        throw new Error('RS256算法需要同时配置JWT_PRIVATE_KEY和JWT_PUBLIC_KEY');
      }

      // 验证私钥格式
      if (!this.isValidRsaKey(privateKey, 'private')) {
        throw new Error('JWT_PRIVATE_KEY格式无效');
      }

      // 验证公钥格式
      if (!this.isValidRsaKey(publicKey, 'public')) {
        throw new Error('JWT_PUBLIC_KEY格式无效');
      }
    }
  }

  /**
   * 验证RSA密钥格式
   * @param key 密钥字符串
   * @param keyType 密钥类型 ('private' | 'public')
   */
  private isValidRsaKey(key: string, keyType: 'private' | 'public'): boolean {
    try {
      // 移除可能的换行符和空格
      const cleanKey = key.replace(/\s+/g, '');

      // 基本格式检查
      if (keyType === 'private') {
        return (
          cleanKey.startsWith('-----BEGINRSAPRIVATEKEY-----') &&
          cleanKey.endsWith('-----ENDRSAPRIVATEKEY-----')
        );
      } else {
        return (
          cleanKey.startsWith('-----BEGINPUBLICKEY-----') &&
          cleanKey.endsWith('-----ENDPUBLICKEY-----')
        );
      }
    } catch (error) {
      return false;
    }
  }
}
