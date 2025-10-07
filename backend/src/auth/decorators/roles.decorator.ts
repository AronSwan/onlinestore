// 用途：角色装饰器
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-09-30

import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
