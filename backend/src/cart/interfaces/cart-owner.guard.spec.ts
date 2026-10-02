// 用途：CartOwnerGuard 单元测试（整改项 B1）
// 覆盖：无认证用户 401；路径参数与令牌主体不一致 403；一致时放行；缺参 fail-closed。
// 作者：后端整改工程师
// 时间：2026-10-02

import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { CartOwnerGuard } from './cart-owner.guard';

function createContext(user: any, params: Record<string, string> = { customerUserId: '1' }) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, params }),
    }),
  } as unknown as ExecutionContext;
}

describe('CartOwnerGuard', () => {
  let guard: CartOwnerGuard;

  beforeEach(() => {
    guard = new CartOwnerGuard();
  });

  describe('无认证用户（JwtAuthGuard 未先行执行或被绕过）', () => {
    it('req.user 缺失时抛 401 UnauthorizedException', () => {
      expect(() => guard.canActivate(createContext(undefined))).toThrow(UnauthorizedException);
    });

    it('req.user 为 null 时抛 401 UnauthorizedException', () => {
      expect(() => guard.canActivate(createContext(null))).toThrow(UnauthorizedException);
    });

    it('req.user 缺少 sub 时抛 401 UnauthorizedException', () => {
      expect(() =>
        guard.canActivate(createContext({ email: 'a@b.c', role: 'user' })),
      ).toThrow(UnauthorizedException);
    });
  });

  describe('路径参数与令牌主体不一致', () => {
    it('customerUserId 不等于 sub 时抛 403 ForbiddenException', () => {
      const context = createContext({ sub: 1, email: 'a@b.c', role: 'user' }, {
        customerUserId: '2',
      } as any);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(/只能操作本人购物车/);
    });

    it('数字 sub 与他人字符串 id 不匹配时抛 403 ForbiddenException', () => {
      const context = createContext({ sub: 100, email: 'a@b.c', role: 'user' }, {
        customerUserId: '100.0',
      } as any);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('路径参数与令牌主体一致', () => {
    it('customerUserId 等于 sub（数字）时放行', () => {
      const context = createContext({ sub: 1, email: 'a@b.c', role: 'user' }, {
        customerUserId: '1',
      } as any);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('sub 为字符串形式（兼容未来载荷变化）时仍可比对放行', () => {
      const context = createContext({ sub: '42', email: 'a@b.c', role: 'user' } as any, {
        customerUserId: '42',
      } as any);
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('缺参 fail-closed', () => {
    it('路由未携带 customerUserId 参数时抛 403 ForbiddenException', () => {
      const context = createContext({ sub: 1, email: 'a@b.c', role: 'user' }, {} as any);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
