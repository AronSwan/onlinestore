import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../rbac/rbac.service';

export interface ResourceAction {
  resource: string;
  action: string;
}

export const RBAC_RESOURCE = 'rbac_resource';
export const RequirePermission = (resource: string, action: string) =>
  SetMetadata(RBAC_RESOURCE, { resource, action });

@Injectable()
export class EnhancedRbacGuard implements CanActivate {
  private readonly logger = new Logger(EnhancedRbacGuard.name);

  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resourceAction = this.reflector.getAllAndOverride<ResourceAction>(RBAC_RESOURCE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!resourceAction) {
      // 没有权限要求，允许访问
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('RBAC检查失败: 用户未认证');
      throw new ForbiddenException('用户未认证');
    }

    const { resource, action } = resourceAction;
    const hasPermission = await this.rbacService.hasPermission(user.id, resource, action);

    if (!hasPermission) {
      this.logger.warn(`RBAC检查失败: 用户 ${user.id} 缺少权限 ${resource}:${action}`);
      throw new ForbiddenException(`缺少权限: ${resource}:${action}`);
    }

    this.logger.debug(`RBAC检查通过: 用户 ${user.id} 拥有权限 ${resource}:${action}`);
    return true;
  }
}
