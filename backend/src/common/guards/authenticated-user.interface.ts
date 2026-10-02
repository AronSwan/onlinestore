// 用途：认证用户形状的单一来源（jwt.strategy.validate() 的返回值，
// 经 passport 挂载到 req.user；CartOwnerGuard / OwnerOrAdminGuard 共同消费）
export interface AuthenticatedUser {
  sub: number;
  email: string;
  role: string;
}
