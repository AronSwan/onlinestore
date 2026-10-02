// 用途：通用归属校验守卫（本人或 admin），封堵横向越权（验收审计优先项 / BACKLOG D5 首刀）
// 依赖文件：jwt-auth.guard.ts（先行认证并填充 req.user）、jwt.strategy.ts（req.user 形状）
// 参照物：cart/interfaces/cart-owner.guard.ts（同一 fail-closed 范式）
// 时间：2026-10-03

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
  UnauthorizedException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export interface AuthenticatedUser {
  sub: number;
  email: string;
  role: string;
}

/** 路由参数名元数据键：@OwnerParam('userId') 声明归属比对用哪个路径参数 */
export const OWNERSHIP_PARAM_KEY = 'ownershipParam';

/** 装饰器：声明本路由以哪个路径参数与令牌主体比对归属 */
export const OwnerParam = (param: string) => SetMetadata(OWNERSHIP_PARAM_KEY, param);

/**
 * 通用归属守卫（fail-closed）：本人（JWT sub === 路径参数）或 admin 放行，其余 403。
 *
 * 用法：@UseGuards(JwtAuthGuard, OwnerOrAdminGuard) + @OwnerParam('userId')。
 * 未声明 @OwnerParam 时默认使用 'id'。moderator 不给旁路（权限语义未定义，从严）。
 */
@Injectable()
export class OwnerOrAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user as AuthenticatedUser | undefined;

    if (!user || user.sub === undefined || user.sub === null) {
      throw new UnauthorizedException('未认证：请先登录');
    }

    if (user.role === 'admin') {
      return true;
    }

    const paramName =
      this.reflector.get<string>(OWNERSHIP_PARAM_KEY, context.getHandler()) || 'id';
    const paramValue = request?.params?.[paramName];
    if (paramValue === undefined || paramValue === null || paramValue === '') {
      throw new ForbiddenException('只能访问本人资源');
    }

    if (String(user.sub) !== String(paramValue)) {
      throw new ForbiddenException('只能访问本人资源');
    }

    return true;
  }
}
