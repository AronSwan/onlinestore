import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../auth/rbac/guards/rbac.guard';
import { RequirePermission } from '../../auth/guards/enhanced-rbac.guard';
import { SetMetadata } from '@nestjs/common';

/**
 * API认证装饰器 - 组合JWT认证和权限检查
 */
export function ApiAuth(resource?: string, action?: string) {
  const decorators = [
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: '未认证' }),
    UseGuards(JwtAuthGuard),
  ];

  if (resource && action) {
    decorators.push(
      ApiForbiddenResponse({ description: '权限不足' }),
      SetMetadata('rbac_resource', { resource, action }),
      UseGuards(RbacGuard),
    );
  }

  return applyDecorators(...decorators);
}

/**
 * 管理员权限装饰器
 */
export function ApiAdminAuth() {
  return ApiAuth('admin', 'access');
}

/**
 * 用户权限装饰器
 */
export function ApiUserAuth() {
  return ApiAuth('user', 'access');
}
