// 用途：根据ID获取用户查询
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-09-30

export class GetUserByIdQuery {
  constructor(public readonly userId: number) {}
}
