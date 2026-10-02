// OwnerOrAdminGuard 单元测试：复刻 cart-owner.guard.spec 的 mock 范式
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OwnerOrAdminGuard, OWNERSHIP_PARAM_KEY } from './owner-or-admin.guard';

describe('OwnerOrAdminGuard', () => {
  let guard: OwnerOrAdminGuard;
  let reflector: jest.Mocked<Reflector>;

  const buildContext = (user: any, params: Record<string, string>) => {
    const request = { user, params };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = { get: jest.fn() } as unknown as jest.Mocked<Reflector>;
    guard = new OwnerOrAdminGuard(reflector);
  });

  it('admin 直接放行（不看路径参数）', () => {
    reflector.get.mockReturnValue('userId');
    expect(guard.canActivate(buildContext({ sub: 1, role: 'admin' }, { userId: '999' }))).toBe(
      true,
    );
  });

  it('本人（sub 与路径参数一致）放行', () => {
    reflector.get.mockReturnValue('userId');
    expect(guard.canActivate(buildContext({ sub: 42, role: 'user' }, { userId: '42' }))).toBe(
      true,
    );
  });

  it('他人资源拒绝 403（数字与字符串严格比对）', () => {
    reflector.get.mockReturnValue('userId');
    expect(() =>
      guard.canActivate(buildContext({ sub: 42, role: 'user' }, { userId: '999' })),
    ).toThrow(ForbiddenException);
  });

  it('无认证用户拒绝 401（fail-closed）', () => {
    reflector.get.mockReturnValue('userId');
    expect(() => guard.canActivate(buildContext(undefined, { userId: '1' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('路径参数缺失拒绝 403', () => {
    reflector.get.mockReturnValue('userId');
    expect(() => guard.canActivate(buildContext({ sub: 1, role: 'user' }, {}))).toThrow(
      ForbiddenException,
    );
  });

  it('未声明 @OwnerParam 时默认使用 :id 比对', () => {
    reflector.get.mockReturnValue(undefined);
    expect(guard.canActivate(buildContext({ sub: 7, role: 'user' }, { id: '7' }))).toBe(true);
    expect(() => guard.canActivate(buildContext({ sub: 7, role: 'user' }, { id: '8' }))).toThrow(
      ForbiddenException,
    );
  });

  it('moderator 不给旁路（从严，非 admin 即走归属比对）', () => {
    reflector.get.mockReturnValue('id');
    expect(() =>
      guard.canActivate(buildContext({ sub: 1, role: 'moderator' }, { id: '2' })),
    ).toThrow(ForbiddenException);
  });

  it('sub 为数字 0 也不误判为缺认证', () => {
    reflector.get.mockReturnValue('id');
    expect(guard.canActivate(buildContext({ sub: 0, role: 'user' }, { id: '0' }))).toBe(true);
  });

  it('元数据键为常量（防止拼写漂移）', () => {
    expect(OWNERSHIP_PARAM_KEY).toBe('ownershipParam');
  });
});
