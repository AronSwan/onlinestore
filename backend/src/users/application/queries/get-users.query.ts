// 用途：获取用户列表查询
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-09-30

export class GetUsersQuery {
  constructor(
    public readonly page?: number,
    public readonly limit?: number,
    public readonly search?: string,
  ) {}
}
