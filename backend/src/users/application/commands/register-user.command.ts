// 用途：注册用户命令
// 依赖文件：domain/value-objects/*
// 作者：后端开发团队
// 时间：2025-09-30

export class RegisterUserCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly username: string,
    public readonly phone?: string,
    public readonly avatar?: string,
  ) {}
}
