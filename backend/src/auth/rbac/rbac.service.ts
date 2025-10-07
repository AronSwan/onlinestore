import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from './entities/role.entity';
import { PermissionEntity } from './entities/permission.entity';
import { UserRoleEntity } from './entities/user-role.entity';
import { RolePermissionEntity } from './entities/role-permission.entity';

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(
    @InjectRepository(RoleEntity)
    private roleRepository: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private permissionRepository: Repository<PermissionEntity>,
    @InjectRepository(UserRoleEntity)
    private userRoleRepository: Repository<UserRoleEntity>,
    @InjectRepository(RolePermissionEntity)
    private rolePermissionRepository: Repository<RolePermissionEntity>,
  ) {}

  /**
   * 检查用户是否拥有指定资源的操作权限
   */
  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      // 获取用户角色
      const userRoles = await this.userRoleRepository.find({
        where: { userId: parseInt(userId) },
        relations: ['role'],
      });

      if (userRoles.length === 0) {
        this.logger.debug(`用户 ${userId} 没有分配任何角色`);
        return false;
      }

      // 检查角色权限
      for (const userRole of userRoles) {
        const rolePermissions = await this.rolePermissionRepository.find({
          where: { roleId: userRole.roleId.toString() },
          relations: ['permission'],
        });

        for (const rolePermission of rolePermissions) {
          const permission = rolePermission.permission;
          if (permission.resource === resource && permission.action === action) {
            this.logger.debug(
              `用户 ${userId} 通过角色 ${userRole.roleId} 拥有权限 ${resource}:${action}`,
            );
            return true;
          }
        }
      }

      this.logger.debug(`用户 ${userId} 没有权限 ${resource}:${action}`);
      return false;
    } catch (error) {
      this.logger.error(`检查用户权限时发生错误: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 为用户分配角色
   */
  async assignRole(userId: string, roleId: string): Promise<void> {
    const existingUserRole = await this.userRoleRepository.findOne({
      where: { userId: parseInt(userId), roleId: parseInt(roleId) },
    });

    if (existingUserRole) {
      this.logger.warn(`用户 ${userId} 已经拥有角色 ${roleId}`);
      return;
    }

    const userRole = this.userRoleRepository.create({
      userId: parseInt(userId),
      roleId: parseInt(roleId),
    });

    await this.userRoleRepository.save(userRole);
    this.logger.log(`为用户 ${userId} 分配角色 ${roleId}`);
  }

  /**
   * 移除用户角色
   */
  async removeRole(userId: string, roleId: string): Promise<void> {
    await this.userRoleRepository.delete({ userId: parseInt(userId), roleId: parseInt(roleId) });
    this.logger.log(`移除用户 ${userId} 的角色 ${roleId}`);
  }

  /**
   * 获取用户所有权限
   */
  async getUserPermissions(userId: string): Promise<PermissionEntity[]> {
    const userRoles = await this.userRoleRepository.find({
      where: { userId: parseInt(userId) },
    });

    const permissions: PermissionEntity[] = [];
    for (const userRole of userRoles) {
      const rolePermissions = await this.rolePermissionRepository.find({
        where: { roleId: userRole.roleId.toString() },
        relations: ['permission'],
      });

      permissions.push(...rolePermissions.map(rp => rp.permission));
    }

    // 去重
    const uniquePermissions = permissions.filter(
      (permission, index, self) => index === self.findIndex(p => p.id === permission.id),
    );

    return uniquePermissions;
  }
}
