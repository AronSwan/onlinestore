// Jest 类型声明文件
// 解决测试文件中找不到 describe, it, expect, jest 等全局变量的问题

declare global {
  namespace jest {
    interface Matchers<R> {
      toBe(expected?: any): R;
      toBeCloseTo(num: number, delta?: number): R;
      toBeDefined(): R;
      toBeFalsy(): R;
      toBeGreaterThan(num: number): R;
      toBeGreaterThanOrEqual(num: number): R;
      toBeInstanceOf(expected: any): R;
      toBeLessThan(num: number): R;
      toBeLessThanOrEqual(num: number): R;
      toBeNaN(): R;
      toBeNull(): R;
      toBeTruthy(): R;
      toBeUndefined(): R;
      toContain(item: any): R;
      toContainEqual(item: any): R;
      toEqual(expected: any): R;
      toHaveBeenCalled(): R;
      toHaveBeenCalledTimes(count: number): R;
      toHaveBeenCalledWith(...args: any[]): R;
      toHaveClass(className: string): R;
      toHaveLength(length: number): R;
      toHaveProperty(keyPath: string | string[], value?: any): R;
      toMatch(pattern: string | RegExp): R;
      toMatchObject(expected: any): R;
      toStrictEqual(expected: any): R;
      toThrow(error?: string | RegExp | Error): R;
      toThrowError(error?: string | RegExp | Error): R;
      not: Matchers<any>;
      resolves: Matchers<any>;
      rejects: Matchers<any>;
    }
    
    // 添加全局匹配器函数
    function stringContaining(expected: string): any;
    function objectContaining(expected: any): any;
    function arrayContaining(expected: any[]): any;
    function anything(): any;
    function any(constructor?: any): any;
    function stringMatching(expected: string | RegExp): any;
    
    interface SpyInstance<T = any> extends Mock<T> {
      mock: {
        calls: any[][];
        instances: any[];
        invocationCallOrder: number[];
        results: Array<{ type: 'return' | 'throw'; value: any }>;
      };
    }
    
    interface Mock<T = any> extends Function {
      (...args: any[]): T;
      mock: {
        calls: any[][];
        instances: any[];
        invocationCallOrder: number[];
        results: Array<{ type: 'return' | 'throw'; value: any }>;
      };
      mockClear(): Mock<T>;
      mockReset(): Mock<T>;
      mockRestore(): Mock<T>;
      mockImplementation(fn: (...args: any[]) => any): Mock<T>;
      mockImplementationOnce(fn: (...args: any[]) => any): Mock<T>;
      mockImplementation(fn?: () => any): Mock<T>;
      mockName(name: string): Mock<T>;
      mockReturnThis(): Mock<T>;
      mockReturnValue(value: any): Mock<T>;
      mockReturnValueOnce(value: any): Mock<T>;
      mockResolvedValue(value: any): Mock<T>;
      mockResolvedValueOnce(value: any): Mock<T>;
      mockRejectedValue(value: any): Mock<T>;
      mockRejectedValueOnce(value: any): Mock<T>;
    }
    
    interface MockedFunction<T extends Function> extends Mock<ReturnType<T>> {
      new (...args: Parameters<T>): ReturnType<T>;
      (...args: Parameters<T>): ReturnType<T>;
    }
    
    interface MockedObject {
      [key: string]: any;
    }
    
    type Mocked<T> = {
      [K in keyof T]: T[K] extends Function
        ? jest.MockedFunction<T[K]>
        : T[K];
    };
    
    function Mock<T = any>(): jest.Mock<T>;
    function fn<T = any>(implementation?: (...args: any[]) => any): jest.Mock<T>;
    function spyOn<T>(object: T, method: keyof T): jest.SpyInstance;
    function stringMatching(expected: string | RegExp): any;
  }
  
  var describe: (name: string, fn: () => void) => void;
  var it: (name: string, fn: () => void) => void;
  var test: (name: string, fn: () => void) => void;
  var expect: {
    <T = any>(actual: T): jest.Matchers<T>;
    stringContaining(expected: string): any;
    objectContaining(expected: any): any;
    arrayContaining(expected: any[]): any;
    anything(): any;
    any(constructor?: any): any;
    stringMatching(expected: string | RegExp): any;
  };
  var beforeAll: (fn: () => void) => void;
  var afterAll: (fn: () => void) => void;
  var beforeEach: (fn: () => void) => void;
  var afterEach: (fn: () => void) => void;
  
  var jest: {
    clearAllMocks(): void;
    resetAllMocks(): void;
    restoreAllMocks(): void;
    resetModules(): void;
    mock<T = any>(moduleName: string): T;
    mock<T = any>(moduleName: string, factory?: () => T): void;
    Mock<T = any>(moduleName: string): T;
    Mock<T = any>(moduleName: string, factory?: () => T): void;
    unmock(moduleName: string): void;
    spyOn<T>(object: T, method: keyof T): jest.SpyInstance;
    useFakeTimers(): void;
    useRealTimers(): void;
    runAllTicks(): void;
    runAllTimers(): void;
    runOnlyPendingTimers(): void;
    advanceTimersByTime(msToRun: number): void;
    advanceTimersToNextTimer(): void;
    setSystemTime(now?: number | Date): void;
    getRealSystemTime(): number;
    clearAllTimers(): void;
    getTimerCount(): number;
    fn<T = any>(implementation?: (...args: any[]) => any): jest.Mock<T>;
    Mock<T = any>(): jest.Mock<T>;
    Mocked<T extends object>(): T;
    MockedFunction<T extends Function>(fn: T): jest.MockedFunction<T>;
    MockedObject(obj: any): jest.MockedObject;
  };
  
  // 添加全局jest函数
  function Mock<T = any>(moduleName: string): T;
  function Mock<T = any>(moduleName: string, factory?: () => T): void;
  function unmock(moduleName: string): void;
  function clearAllMocks(): void;
  function resetAllMocks(): void;
  function restoreAllMocks(): void;
  function resetModules(): void;
  function fn<T = any>(implementation?: (...args: any[]) => any): jest.Mock<T>;
  function spyOn<T>(object: T, method: keyof T): jest.SpyInstance;
  function stringContaining(expected: string): any;
  function objectContaining(expected: any): any;
  function arrayContaining(expected: any[]): any;
  function anything(): any;
  function any(constructor?: any): any;
  function stringMatching(expected: string | RegExp): any;
  function Mock<T = any>(): jest.Mock<T>;
  function Mocked<T extends object>(obj: T): jest.Mocked<T>;
  function MockedFunction<T extends Function>(fn: T): jest.MockedFunction<T>;
  function MockedObject(obj: any): jest.MockedObject;
  
  // 添加fail函数
  function fail(message?: string): never;
}

export {};