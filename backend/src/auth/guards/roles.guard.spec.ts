// 用途：角色守卫单元测试
// 依赖文件：roles.guard.ts
// 作者：后端开发团队
// 时间：2025-09-30 00:20:00

import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockExecutionContext = (user: any = null, roles: UserRole[] = []): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
      getClass: () => {},
      getHandler: () => {},
    } as any;
  };

  const mockReflector = {
    get: jest.fn(),
    getAllAndOverride: jest.fn(),
  } as any;

  const mockUser = {
    sub: 1,
    username: 'testuser',
    email: 'test@example.com',
    roles: [UserRole.USER],
  };

  const mockAdminUser = {
    sub: 1,
    username: 'admin',
    email: 'admin@example.com',
    roles: [UserRole.ADMIN],
  };

  const mockModeratorUser = {
    sub: 1,
    username: 'moderator',
    email: 'moderator@example.com',
    roles: [UserRole.MODERATOR],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, { provide: Reflector, useValue: mockReflector }],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('canActivate', () => {
    it('should allow access when no roles required', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([]);

      const context = mockExecutionContext(mockUser);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should return false when no user in request', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = mockExecutionContext(null);

      const result = guard.canActivate(context);
      expect(result).toBe(false);
    });

    it('should return false when user has no roles', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const userWithoutRoles = { ...mockUser, roles: [] };
      const context = mockExecutionContext(userWithoutRoles);

      const result = guard.canActivate(context);
      expect(result).toBe(false);
    });

    it('should allow access when user has required role', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.USER]);

      const context = mockExecutionContext(mockUser);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when admin user accesses admin-only route', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = mockExecutionContext(mockAdminUser);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when moderator user accesses moderator-only route', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.MODERATOR]);

      const context = mockExecutionContext(mockModeratorUser);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false when user lacks required role', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = mockExecutionContext(mockUser);

      const result = guard.canActivate(context);
      expect(result).toBe(false);
    });

    it('should allow access when user has one of multiple required roles', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.USER, UserRole.ADMIN]);

      const context = mockExecutionContext(mockUser);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false when user has none of multiple required roles', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.MODERATOR]);

      const context = mockExecutionContext(mockUser);

      const result = guard.canActivate(context);
      expect(result).toBe(false);
    });

    it('should allow access when user has all required roles (AND logic)', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.USER, UserRole.ADMIN]);

      const userWithMultipleRoles = {
        ...mockUser,
        roles: [UserRole.USER, UserRole.ADMIN],
      };

      const context = mockExecutionContext(userWithMultipleRoles);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle case when roles is null or undefined', () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);

      const context = mockExecutionContext(mockUser);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle case when user roles is not an array', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.USER]);

      const userWithStringRoles = {
        ...mockUser,
        roles: UserRole.USER,
      };

      const context = mockExecutionContext(userWithStringRoles);

      const result = guard.canActivate(context);
      expect(result).toBe(false);
    });

    it('should handle case when required roles is not an array', () => {
      mockReflector.getAllAndOverride.mockReturnValue(UserRole.USER);

      const context = mockExecutionContext(mockUser);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has higher privilege role', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.USER]);

      const adminUser = {
        ...mockUser,
        roles: [UserRole.ADMIN],
      };

      const context = mockExecutionContext(adminUser);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false when user has lower privilege role', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const context = mockExecutionContext(mockUser);

      const result = guard.canActivate(context);
      expect(result).toBe(false);
    });
  });

  describe('matchRoles', () => {
    it('should return true when user has required role', () => {
      const userRoles = [UserRole.USER];
      const requiredRoles = [UserRole.USER];

      const result = (guard as any)['matchRoles'](userRoles, requiredRoles);
      expect(result).toBe(true);
    });

    it('should return false when user lacks required role', () => {
      const userRoles = [UserRole.USER];
      const requiredRoles = [UserRole.ADMIN];

      const result = (guard as any)['matchRoles'](userRoles, requiredRoles);
      expect(result).toBe(false);
    });

    it('should return true when user has one of multiple required roles', () => {
      const userRoles = [UserRole.USER];
      const requiredRoles = [UserRole.USER, UserRole.ADMIN];

      const result = (guard as any)['matchRoles'](userRoles, requiredRoles);
      expect(result).toBe(true);
    });

    it('should return true when user has all required roles', () => {
      const userRoles = [UserRole.USER, UserRole.ADMIN];
      const requiredRoles = [UserRole.USER, UserRole.ADMIN];

      const result = (guard as any)['matchRoles'](userRoles, requiredRoles);
      expect(result).toBe(true);
    });

    it('should return true when user has only some of required roles (OR logic)', () => {
      const userRoles = [UserRole.USER];
      const requiredRoles = [UserRole.USER, UserRole.ADMIN];

      const result = (guard as any)['matchRoles'](userRoles, requiredRoles);
      expect(result).toBe(true);
    });

    it('should return true when no roles required', () => {
      const userRoles = [UserRole.USER];
      const requiredRoles: UserRole[] = [];

      const result = (guard as any)['matchRoles'](userRoles, requiredRoles);
      expect(result).toBe(true);
    });

    it('should return false when user has no roles but roles required', () => {
      const userRoles: UserRole[] = [];
      const requiredRoles = [UserRole.USER];

      const result = (guard as any)['matchRoles'](userRoles, requiredRoles);
      expect(result).toBe(false);
    });

    it('should handle empty user roles array', () => {
      const userRoles: UserRole[] = [];
      const requiredRoles: UserRole[] = [];

      const result = (guard as any)['matchRoles'](userRoles, requiredRoles);
      expect(result).toBe(true);
    });
  });
});
