import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from './entities/role.entity';
import { PermissionEntity } from './entities/permission.entity';
import { UserRoleEntity } from './entities/user-role.entity';
import { RolePermissionEntity } from './entities/role-permission.entity';
import { RbacService } from './rbac.service';
import { RbacGuard } from './guards/rbac.guard';
import { EnhancedRbacGuard } from '../guards/enhanced-rbac.guard';

/**
 * RBAC 权限管理模块
 * 借鉴 Snowy-Cloud 的权限设计
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([RoleEntity, PermissionEntity, UserRoleEntity, RolePermissionEntity]),
  ],
  providers: [RbacService, RbacGuard, EnhancedRbacGuard],
  exports: [RbacService, RbacGuard, EnhancedRbacGuard],
})
export class RbacModule {}
