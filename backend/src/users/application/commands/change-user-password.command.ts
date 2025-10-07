// 用途：修改用户密码命令
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-09-30

export class ChangeUserPasswordCommand {
  constructor(
    public readonly userId: number,
    public readonly oldPassword: string,
    public readonly newPassword: string,
  ) {}
}
