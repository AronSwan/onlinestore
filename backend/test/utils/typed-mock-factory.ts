// 提供更严格类型的 jest.fn 工厂，统一在 Jest v29/v30 下的行为
// 使用 jest.MockedFunction<T> 以避免对不可用的 MockInstance 类型的依赖
export function createMockedFunction<T extends (...args: any[]) => any>(
  impl?: T,
): jest.MockedFunction<T> {
  return jest.fn(impl as any) as unknown as jest.MockedFunction<T>;
}

// 示例：
// const strategy = createMockedFunction<(n: number, s: string) => boolean>((n, s) => true);
// const handler = createMockedFunction<(payload: { id: string }) => Promise<{ ok: boolean }>>(async () => ({ ok: true }));
