// 用途：JWT认证守卫
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-09-30

import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 检查是否是公共路由
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('JWT令牌缺失');
    }

    return super.canActivate(context);
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization?.trim();
    if (!authHeader) {
      return undefined;
    }

    const parts = authHeader.split(/\s+/);
    if (parts.length !== 2) {
      return undefined;
    }

    const [type, token] = parts;
    return type.toLowerCase() === 'bearer' ? token : undefined;
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('JWT令牌已过期');
      }
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('无效的JWT令牌');
      }
      if (info?.name === 'NotBeforeError') {
        throw new UnauthorizedException('JWT令牌尚未生效');
      }
      throw new UnauthorizedException('认证失败');
    }
    return user;
  }
}
