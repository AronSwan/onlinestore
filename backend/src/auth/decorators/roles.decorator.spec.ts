// 用途：角色装饰器单元测试
// 依赖文件：roles.decorator.ts
// 作者：后端开发团队
// 时间：2025-09-30 01:30:00

import { UserRole } from '../../users/entities/user.entity';
import { Role } from '../enums/role.enum';

// 模拟 SetMetadata
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  SetMetadata: jest.fn(() => () => {}),
}));

// 导入被测试的模块
import { Roles, ROLES_KEY } from './roles.decorator';
import { SetMetadata } from '@nestjs/common';

const mockSetMetadata = SetMetadata as jest.MockedFunction<typeof SetMetadata>;

describe('Roles Decorator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Roles decorator', () => {
    it('should create a decorator that sets metadata with single role', () => {
      // 清除之前的调用
      mockSetMetadata.mockClear();

      // 调用 Roles 装饰器
      Roles(UserRole.ADMIN as unknown as Role);

      // 验证SetMetadata是否被正确调用
      expect(mockSetMetadata).toHaveBeenCalledWith(ROLES_KEY, [UserRole.ADMIN as unknown as Role]);
    });

    it('should create a decorator that sets metadata with multiple roles', () => {
      // 清除之前的调用
      mockSetMetadata.mockClear();

      Roles(UserRole.ADMIN as unknown as Role, UserRole.MODERATOR as unknown as Role);

      expect(mockSetMetadata).toHaveBeenCalledWith(ROLES_KEY, [
        UserRole.ADMIN as unknown as Role,
        UserRole.MODERATOR as unknown as Role,
      ]);
    });

    it('should create a decorator that sets metadata with empty roles', () => {
      // 清除之前的调用
      mockSetMetadata.mockClear();

      Roles();

      expect(mockSetMetadata).toHaveBeenCalledWith(ROLES_KEY, []);
    });

    it('should create a decorator that sets metadata with all user roles', () => {
      // 清除之前的调用
      mockSetMetadata.mockClear();

      const allRoles = Object.values(UserRole).map(role => role as unknown as Role);
      Roles(...allRoles);

      expect(mockSetMetadata).toHaveBeenCalledWith(ROLES_KEY, allRoles);
    });

    it('should handle UserRole.USER correctly', () => {
      // 清除之前的调用
      mockSetMetadata.mockClear();

      Roles(UserRole.USER as unknown as Role);

      expect(mockSetMetadata).toHaveBeenCalledWith(ROLES_KEY, [UserRole.USER as unknown as Role]);
    });

    it('should handle UserRole.MODERATOR correctly', () => {
      // 清除之前的调用
      mockSetMetadata.mockClear();

      Roles(UserRole.MODERATOR as unknown as Role);

      expect(mockSetMetadata).toHaveBeenCalledWith(ROLES_KEY, [
        UserRole.MODERATOR as unknown as Role,
      ]);
    });

    it('should maintain ROLES_KEY constant', () => {
      expect(ROLES_KEY).toBe('roles');
    });

    it('should call SetMetadata when Roles is called', () => {
      mockSetMetadata.mockClear();

      Roles(UserRole.ADMIN as unknown as Role);

      expect(mockSetMetadata).toHaveBeenCalledTimes(1);
      expect(mockSetMetadata).toHaveBeenCalledWith(ROLES_KEY, [UserRole.ADMIN as unknown as Role]);
    });

    it('should handle repeated roles correctly', () => {
      mockSetMetadata.mockClear();

      Roles(UserRole.ADMIN as unknown as Role, UserRole.ADMIN as unknown as Role);

      expect(mockSetMetadata).toHaveBeenCalledWith(ROLES_KEY, [
        UserRole.ADMIN as unknown as Role,
        UserRole.ADMIN as unknown as Role,
      ]);
    });

    it('should handle mixed roles correctly', () => {
      mockSetMetadata.mockClear();

      Roles(
        UserRole.USER as unknown as Role,
        UserRole.ADMIN as unknown as Role,
        UserRole.USER as unknown as Role,
      );

      expect(mockSetMetadata).toHaveBeenCalledWith(ROLES_KEY, [
        UserRole.USER as unknown as Role,
        UserRole.ADMIN as unknown as Role,
        UserRole.USER as unknown as Role,
      ]);
    });

    it('should preserve the order of roles', () => {
      mockSetMetadata.mockClear();

      Roles(
        UserRole.USER as unknown as Role,
        UserRole.MODERATOR as unknown as Role,
        UserRole.ADMIN as unknown as Role,
      );

      expect(mockSetMetadata).toHaveBeenCalledWith(ROLES_KEY, [
        UserRole.USER as unknown as Role,
        UserRole.MODERATOR as unknown as Role,
        UserRole.ADMIN as unknown as Role,
      ]);
    });
  });

  describe('Roles decorator edge cases', () => {
    it('should handle undefined and null roles', () => {
      mockSetMetadata.mockClear();

      Roles(undefined as any);
      expect(mockSetMetadata).toHaveBeenCalledWith(ROLES_KEY, [undefined]);

      mockSetMetadata.mockClear();
      Roles(null as any);
      expect(mockSetMetadata).toHaveBeenCalledWith(ROLES_KEY, [null]);
    });

    it('should handle non-UserRole values', () => {
      mockSetMetadata.mockClear();

      Roles('admin' as any, 'user' as any);

      expect(mockSetMetadata).toHaveBeenCalledWith(ROLES_KEY, ['admin', 'user']);
    });

    it('should handle very large number of roles', () => {
      mockSetMetadata.mockClear();

      const manyRoles = Array(100).fill(UserRole.USER);
      Roles(...manyRoles);

      expect(mockSetMetadata).toHaveBeenCalledWith(ROLES_KEY, manyRoles);
    });
  });
});
