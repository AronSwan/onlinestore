import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from './entities/role.entity';
import { PermissionEntity } from './entities/permission.entity';
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
    // 整改（m3，2026-10-02）：从 forFeature 移除 UserRoleEntity —— 它是没有
    // @Entity() 装饰器的普通类（非真实 TypeORM 实体，无对应数据表），注册进
    // forFeature 属于无效注册的休眠配置错误（TypeORM 不会为其生成 Repository 元数据）。
    // 保留的 RoleEntity / PermissionEntity / RolePermissionEntity 均为带 @Entity() 的真实实体。
    // 后续注意：RbacService 中 @InjectRepository(UserRoleEntity) 随之失效，
    // 重新接线前需先补上真正的关联实体或改用 DataSource 查询。
    TypeOrmModule.forFeature([RoleEntity, PermissionEntity, RolePermissionEntity]),
  ],
  providers: [RbacService, RbacGuard, EnhancedRbacGuard],
  exports: [RbacService, RbacGuard, EnhancedRbacGuard],
})
export class RbacModule {}
