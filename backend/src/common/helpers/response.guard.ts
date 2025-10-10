/**
 * 通用联合类型守卫：用于安全收窄第三方/网关响应
 * 适用场景：形如 { success: boolean; data?: T; message?: string; code?: string }
 * 在 success 为 true 且存在 data 时，安全访问 data 字段。
 */

export type SuccessResponseGeneric = { success: true; data: any };
export type ErrorResponseGeneric = { success: false; message?: string; code?: string };

/**
 * 判断响应是否为成功且携带数据的形态
 */
export function isSuccessResponse(
  res: { success: boolean } & { data?: any }
): res is SuccessResponseGeneric {
  return res.success === true && res.data !== undefined && res.data !== null;
}

/**
 * 可选：在不依赖 success 作为区分字段时，基于存在性判断 data 字段
 */
export function hasData<T = any>(res: unknown): res is { data: T } {
  return !!res && typeof res === 'object' && 'data' in (res as any) && !!(res as any).data;
}