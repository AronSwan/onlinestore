// 用途：无效邮箱错误
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-09-30

export class InvalidEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEmailError';
  }
}
