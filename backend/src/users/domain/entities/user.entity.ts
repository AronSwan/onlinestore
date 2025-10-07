// 用途：用户实体定义（领域层）
// 依赖文件：value-objects/*
// 作者：后端开发团队
// 时间：2025-09-30

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

// Domain User class (placeholder for DDD implementation)
export class User {
  constructor(
    public readonly id: number,
    public readonly email: string,
    public readonly username: string,
    public readonly role: UserRole,
  ) {}
}
