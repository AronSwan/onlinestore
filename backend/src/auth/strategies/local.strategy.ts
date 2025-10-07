// 用途：本地认证策略，处理用户名/密码登录
// 依赖文件：auth.service.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:35:00

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email', // 使用email字段作为用户名
      passwordField: 'password',
    });
  }

  /**
   * 验证用户登录
   */
  async validate(email: string, password: string): Promise<any> {
    try {
      // 使用AuthService验证用户
      const result = await this.authService.login({ email, password });

      // 返回用户信息
      return {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        role: result.user.role,
      };
    } catch (error) {
      // 登录失败
      throw new UnauthorizedException('用户名或密码错误');
    }
  }
}
