/**
 * 用户角色枚举
 */
export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
  GUEST = 'guest',
}

/**
 * 角色权限映射
 */
export const RolePermissions = {
  [Role.ADMIN]: ['*'],
  [Role.MODERATOR]: ['read', 'write', 'moderate'],
  [Role.USER]: ['read', 'write'],
  [Role.GUEST]: ['read'],
};

/**
 * 角色层级
 */
export const RoleHierarchy = {
  [Role.ADMIN]: 4,
  [Role.MODERATOR]: 3,
  [Role.USER]: 2,
  [Role.GUEST]: 1,
};
