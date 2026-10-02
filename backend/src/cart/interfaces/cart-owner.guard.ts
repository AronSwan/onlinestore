// 用途：购物车归属校验守卫，封堵购物车全路由 IDOR（整改项 B1）
// 依赖文件：jwt-auth.guard.ts（先行认证并填充 req.user）、jwt.strategy.ts（req.user 形状）
// 作者：后端整改工程师
// 时间：2026-10-02

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * 认证用户形状：来自 JwtStrategy.validate() 的返回值
 * （见 src/auth/strategies/jwt.strategy.ts —— 返回最小化载荷 { sub, email, role }），
 * 经 passport 挂载到 req.user。
 */
import { AuthenticatedUser } from '../../common/guards/authenticated-user.interface';

/**
 * 购物车归属守卫（fail-closed）：
 *
 * 必须与 JwtAuthGuard 一起使用且声明在其后：@UseGuards(JwtAuthGuard, CartOwnerGuard)。
 * Nest 按声明顺序执行守卫，JwtAuthGuard 先完成认证并把用户写入 req.user，
 * 本守卫随后将路由参数 :customerUserId 与令牌主体严格比对。
 *
 * 身份绑定决策（2026-10-02 整改 B1）：购物车的 customerUserId 键即认证用户的 id
 * （JWT sub）。路径参数与令牌不一致一律 403 —— 用户只能操作本人购物车，
 * 不再允许凭路径参数读写任意用户的购物车。
 */
@Injectable()
export class CartOwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user as AuthenticatedUser | undefined;

    // JwtAuthGuard 先行执行；到达此处仍无用户说明认证缺失，拒绝（fail-closed）
    if (!user || user.sub === undefined || user.sub === null) {
      throw new UnauthorizedException('未认证：请先登录后再操作购物车');
    }

    const customerUserId = request?.params?.customerUserId;
    if (customerUserId === undefined || customerUserId === null || customerUserId === '') {
      // 本守卫只应挂载在携带 :customerUserId 的路由上，缺参视为非法请求（fail-closed）
      throw new ForbiddenException('只能操作本人购物车');
    }

    // JWT sub 为数字、路径参数恒为字符串：统一成字符串后严格比对（禁止弱相等）
    if (String(user.sub) !== String(customerUserId)) {
      throw new ForbiddenException('只能操作本人购物车');
    }

    return true;
  }
}
