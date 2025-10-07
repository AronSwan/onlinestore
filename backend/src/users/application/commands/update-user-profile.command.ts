// 用途：更新用户资料命令
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-09-30

export class UpdateUserProfileCommand {
  constructor(
    public readonly userId: number,
    public readonly username?: string,
    public readonly phone?: string,
    public readonly avatar?: string,
  ) {}
}
