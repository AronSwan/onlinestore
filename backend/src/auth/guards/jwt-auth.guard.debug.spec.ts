// 调试JWT认证守卫的简化测试
import { JwtAuthGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';

// 简单的mock
const mockReflector = {
  getAllAndOverride: jest.fn(),
} as any;

describe('JwtAuthGuard Debug', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard(mockReflector);
  });

  it('should create guard instance', () => {
    expect(guard).toBeDefined();
  });

  it('should throw UnauthorizedException when no token', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false); // 不是公共路由

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }), // 没有authorization header
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(mockContext)).toThrow('JWT令牌缺失');
  });

  it('should return true for public routes', () => {
    mockReflector.getAllAndOverride.mockReturnValue(true); // 是公共路由

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;

    const result = guard.canActivate(mockContext);
    expect(result).toBe(true);
  });
});
