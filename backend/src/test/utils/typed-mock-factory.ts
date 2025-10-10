// 提供更严格类型的 jest.fn 工厂，统一在 Jest v29/v30 下的行为
// 使用 MockInstance 以兼容当前 @types/jest 声明，避免 contexts 属性不匹配问题
export function createMockedFunction<T extends (...args: any[]) => any>(
  impl?: T,
): jest.MockInstance<ReturnType<T>, Parameters<T>> {
  return jest.fn(impl as any) as unknown as jest.MockInstance<ReturnType<T>, Parameters<T>>;
}

// 示例：
// const strategy = createMockedFunction<(n: number, s: string) => boolean>((n, s) => true);
// const handler = createMockedFunction<(payload: { id: string }) => Promise<{ ok: boolean }>>(async () => ({ ok: true }));