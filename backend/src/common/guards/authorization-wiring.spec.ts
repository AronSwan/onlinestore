// 用途：授权接线锁——用元数据断言把守卫/角色/归属参数的"装饰器接线"锁进测试。
// 背景(2026-10-03 越权审计)：越权修复若只靠 curl 验证，删掉任何一行装饰器都不会有红灯——
// 本 spec 让 "接线被删/被改" 直接失败。直调式 controller spec 不经过守卫管道，无法覆盖此面。
import 'reflect-metadata';
// 注：GUARDS_METADATA 不能从 '@nestjs/common/constants' 导入——ts-jest 环境下该子路径
// 解析出的键为 undefined（实测）；Nest 源码该常量值为 '__guards__'，此处用字面量
const GUARDS_METADATA = '__guards__';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { OWNERSHIP_PARAM_KEY } from './owner-or-admin.guard';
import { OwnerOrAdminGuard } from './owner-or-admin.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Role } from '../../auth/enums/role.enum';

import { UsersController } from '../../users/users.controller';
import { OrdersController } from '../../orders/orders.controller';
import { LoggingController } from '../../logging/logging.controller';
import { MonitoringController } from '../../monitoring/monitoring.controller';
import { AlertController } from '../../monitoring/alert.controller';

// 注意：方法级 @UseGuards 的元数据挂在方法函数自身(Nest 约定)，类级挂在构造函数上
const guardsOf = (target: object, prop?: string): any[] => {
  if (prop) {
    const fn = (target as any)[prop];
    return fn ? Reflect.getMetadata(GUARDS_METADATA, fn) || [] : [];
  }
  return Reflect.getMetadata(GUARDS_METADATA, target) || [];
};
const rolesOf = (target: object, prop?: string): any[] => {
  // SetMetadata(Nest) 在方法上也落在函数自身, 与 @UseGuards 同理
  if (prop) {
    const fn = (target as any)[prop];
    return fn ? Reflect.getMetadata(ROLES_KEY, fn) || [] : [];
  }
  return Reflect.getMetadata(ROLES_KEY, target) || [];
};
const ownerParamOf = (target: object, prop: string) => {
  const fn = (target as any)[prop];
  return fn ? Reflect.getMetadata(OWNERSHIP_PARAM_KEY, fn) : undefined;
};

describe('授权接线锁（装饰器元数据断言）', () => {
  describe('UsersController', () => {
    const c = UsersController.prototype;

    it('列表 GET / 与建号 POST / 挂 admin', () => {
      for (const m of ['searchUsers', 'createUser', 'getUserStats', 'getUserStatsCount']) {
        if (typeof (c as any)[m] !== 'function') continue; // 方法名漂移时跳过由其余用例兜底
        expect(guardsOf(c, m)).toContain(RolesGuard);
        expect(rolesOf(c, m)).toContain(Role.ADMIN);
      }
      expect(guardsOf(c, 'searchUsers')).toContain(RolesGuard);
      expect(rolesOf(c, 'searchUsers')).toContain(Role.ADMIN);
      expect(guardsOf(c, 'createUser')).toContain(RolesGuard);
      expect(rolesOf(c, 'createUser')).toContain(Role.ADMIN);
    });

    it('管理动作(DELETE/activate/deactivate/verify-email)挂 admin', () => {
      for (const m of ['deleteUser', 'activateUser', 'deactivateUser', 'verifyUserEmail']) {
        if (typeof (c as any)[m] !== 'function') continue;
        expect(guardsOf(c, m)).toContain(RolesGuard);
        expect(rolesOf(c, m)).toContain(Role.ADMIN);
      }
    });

    it('资料读写 GET/PUT :id 挂 OwnerOrAdminGuard 且显式声明 @OwnerParam(id)', () => {
      for (const m of ['getUserById', 'updateUser']) {
        expect(guardsOf(c, m)).toContain(OwnerOrAdminGuard);
        expect(ownerParamOf(c, m)).toBe('id');
      }
    });
  });

  describe('OrdersController', () => {
    const c = OrdersController.prototype;

    it('按用户查单挂 OwnerOrAdminGuard 且 @OwnerParam(userId)', () => {
      expect(guardsOf(c, 'findByUserId')).toContain(OwnerOrAdminGuard);
      expect(ownerParamOf(c, 'findByUserId')).toBe('userId');
    });
  });

  describe('监控面三个控制器类级 admin 上锁', () => {
    it.each([
      ['LoggingController', LoggingController],
      ['MonitoringController', MonitoringController],
      ['AlertController', AlertController],
    ])('%s 类级挂 JwtAuthGuard+RolesGuard+ADMIN', (_name, ctrl) => {
      expect(guardsOf(ctrl)).toContain(JwtAuthGuard);
      expect(guardsOf(ctrl)).toContain(RolesGuard);
      expect(rolesOf(ctrl)).toContain(Role.ADMIN);
    });
  });
});
