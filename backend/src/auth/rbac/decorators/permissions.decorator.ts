import { SetMetadata } from '@nestjs/common';

/**
 * 权限装饰器
 * 借鉴 Snowy-Cloud 的权限注解设计
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

/**
 * 角色装饰器
 */
export const RequireRoles = (...roles: string[]) => SetMetadata('roles', roles);

/**
 * 数据权限装饰器
 */
export const DataScope = (scope: 'ALL' | 'DEPT' | 'SELF') => SetMetadata('dataScope', scope);
