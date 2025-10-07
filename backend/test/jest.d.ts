// Jest类型定义文件
// 确保Jest全局变量在TypeScript中可用

declare global {
  namespace Jest {
    interface Matchers<R> {
      toBeGreaterThan(value: number): R;
      toBeLessThan(value: number): R;
      toContain(item: any): R;
      toBeDefined(): R;
      toHaveBeenCalled(): R;
      toHaveBeenCalledWith(...args: any[]): R;
      toEqual(expected: any): R;
      toBe(expected: any): R;
      toMatch(pattern: string | RegExp): R;
      toThrow(message?: string | RegExp): R;
      toThrowError(message?: string | RegExp): R;
      resolves: Matchers<Promise<any>>;
      rejects: Matchers<Promise<any>>;
      not: Matchers<R>;
      any(constructor: Function): any;
      stringContaining(str: string): any;
      objectContaining(obj: any): any;
    }

    interface Mock<T extends (...args: any[]) => any> extends Function {
      (...args: Parameters<T>): ReturnType<T>;
      mock: {
        calls: any[][];
        instances: any[];
        results: Array<{
          isThrow: boolean;
          value: any;
        }>;
      };
      mockClear(): void;
      mockReset(): void;
      mockRestore(): void;
      mockImplementation(fn: T): this;
      mockImplementationOnce(fn: T): this;
      mockReturnThis(): this;
      mockReturnValue(value: any): this;
      mockReturnValueOnce(value: any): this;
      mockResolvedValue(value: any): this;
      mockResolvedValueOnce(value: any): this;
      mockRejectedValue(value: any): this;
      mockRejectedValueOnce(value: any): this;
    }

    interface MockedFunction<T extends (...args: any[]) => any> extends Mock<T> {
      new (...args: any[]): ReturnType<T>;
      (...args: Parameters<T>): ReturnType<T>;
    }

    function mock<T>(moduleName: string): T;
    function mock<T>(moduleName: string, factory: () => T): void;
    function mock<T>(moduleName: string, options: { virtual?: boolean }): T;
    function mock<T>(moduleName: string, options: { virtual?: boolean }, factory: () => T): void;

    function fn(): Mock<() => any>;
    function fn<T extends (...args: any[]) => any>(implementation: T): MockedFunction<T>;

    function spyOn(object: any, method: string): Mock<() => any>;
    function spyOn(object: any, method: string, accessType: 'get'): Mock<() => any>;

    function clearAllMocks(): void;
    function resetAllMocks(): void;
    function restoreAllMocks(): void;

    function useFakeTimers(): void;
    function useRealTimers(): void;
    function runAllTimers(): void;
    function runOnlyPendingTimers(): void;
    function advanceTimersByTime(msToRun: number): void;
  }

  var describe: (name: string, fn: () => void) => void;
  var it: (name: string, fn: () => void) => void;
  var test: (name: string, fn: () => void) => void;
  var expect: (actual: any) => Jest.Matchers<any>;
  var beforeAll: (fn: () => void) => void;
  var afterAll: (fn: () => void) => void;
  var beforeEach: (fn: () => void) => void;
  var afterEach: (fn: () => void) => void;
  var jest: typeof Jest;
}

export {};
