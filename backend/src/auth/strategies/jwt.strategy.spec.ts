/**
 * JwtStrategy 单元测试
 * Blocker 2（2026-10-02）回归防线：
 *  - validate() 不再对已解码的 payload 做二次 jwt.verify（原实现把 payload 对象传给
 *    要求字符串的 validateToken()，必抛错，合法令牌全 401）；
 *  - validate() 按载荷校验最小字段，并按 sub 查用户存在性；
 *  - 返回守卫可用的最小身份 { sub, email, role }（CartOwnerGuard 依赖 sub）。
 */

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: { findById: jest.Mock };

  const nowSec = Math.floor(Date.now() / 1000);
  const validPayload = {
    sub: 42,
    email: 'user@example.com',
    role: 'user',
    iat: nowSec,
    exp: nowSec + 900,
  };

  beforeEach(() => {
    usersService = { findById: jest.fn() };

    const configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'master.jwt.algorithm') return 'HS256';
        if (key === 'master.jwt.secret') return 'unit-test-secret-0123456789abcdef0123456789';
        return defaultValue;
      }),
    } as unknown as ConfigService;

    strategy = new JwtStrategy(usersService as unknown as UsersService, configService);
  });

  it('载荷合法且用户存在 → 返回 { sub, email, role }', async () => {
    usersService.findById.mockResolvedValue({
      id: 42,
      email: 'user@example.com',
      isActive: true,
    });

    await expect(strategy.validate(validPayload)).resolves.toEqual({
      sub: 42,
      email: 'user@example.com',
      role: 'user',
    });
    expect(usersService.findById).toHaveBeenCalledWith(42);
  });

  it('用户不存在 → 抛 UnauthorizedException（用户不存在）', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(strategy.validate(validPayload)).rejects.toThrow('用户不存在');
  });

  it('用户被禁用 → 抛 UnauthorizedException', async () => {
    usersService.findById.mockResolvedValue({ id: 42, isActive: false });

    await expect(strategy.validate(validPayload)).rejects.toThrow(UnauthorizedException);
  });

  it.each([
    ['payload 为空', undefined],
    ['sub 非正数', { ...validPayload, sub: 0 }],
    ['sub 类型错误', { ...validPayload, sub: '42' }],
    ['email 缺失', { ...validPayload, email: undefined }],
    ['email 格式非法', { ...validPayload, email: 'not-an-email' }],
    ['role 非法', { ...validPayload, role: 'superuser' }],
    ['exp 缺失', { ...validPayload, exp: undefined }],
    ['exp 已过期', { ...validPayload, exp: nowSec - 10 }],
  ])('%s → 抛 UnauthorizedException（无效的JWT载荷）', async (_name, payload) => {
    await expect(strategy.validate(payload as any)).rejects.toThrow('无效的JWT载荷');
    expect(usersService.findById).not.toHaveBeenCalled();
  });
});
