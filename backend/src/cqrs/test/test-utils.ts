// CQRS测试工具类
// 作者：后端开发团队
// 时间：2025-10-05

import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '../bus/command.bus';
import { QueryBus } from '../bus/query.bus';
import { EventBus } from '../bus/event.bus';
import { CqrsModule } from '../cqrs.module';

/**
 * 测试工具类
 */
export class CqrTestUtils {
  /**
   * 创建测试模块
   */
  static async createTestingModule(providers: any[] = []) {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        CqrsModule.forRoot({
          enableCommandBus: true,
          enableQueryBus: true,
          enableEventBus: true,
          autoDiscoverHandlers: false,
        }),
      ],
      providers: providers,
    }).compile();

    return module;
  }

  /**
   * 创建测试应用
   */
  static async createTestApp(providers: any[] = []) {
    const module = await this.createTestingModule(providers);
    const app = module.createNestApplication();

    await app.init();
    return { app, module };
  }

  /**
   * 获取命令总线
   */
  static getCommandBus(module: TestingModule) {
    return module.get<CommandBus>(CommandBus);
  }

  /**
   * 获取查询总线
   */
  static getQueryBus(module: TestingModule) {
    return module.get<QueryBus>(QueryBus);
  }

  /**
   * 获取事件总线
   */
  static getEventBus(module: TestingModule) {
    return module.get<EventBus>(EventBus);
  }

  /**
   * 清理测试数据
   */
  static cleanup() {
    // 清理测试数据的逻辑
    console.log('Cleaning up test data...');
  }
}

/**
 * 测试数据工厂
 */
export class TestDataFactory {
  /**
   * 创建测试用户数据
   */
  static createUser(overrides: any = {}) {
    return {
      id: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      roleIds: ['role-1'],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * 创建测试命令数据
   */
  static createCommandData(overrides: any = {}) {
    return {
      id: 'test-command-id',
      timestamp: new Date(),
      metadata: {
        requestId: 'test-request-id',
        userId: 'test-user-id',
      },
      ...overrides,
    };
  }

  /**
   * 创建测试查询数据
   */
  static createQueryData(overrides: any = {}) {
    return {
      id: 'test-query-id',
      timestamp: new Date(),
      cacheKey: 'test-cache-key',
      cacheTime: 300,
      staleTime: 60,
      metadata: {
        requestId: 'test-request-id',
      },
      ...overrides,
    };
  }

  /**
   * 创建测试事件数据
   */
  static createEventData(overrides: any = {}) {
    return {
      id: 'test-event-id',
      timestamp: new Date(),
      eventType: 'TestEvent',
      aggregateId: 'test-aggregate-id',
      payload: {
        data: 'test-data',
      },
      metadata: {
        requestId: 'test-request-id',
      },
      ...overrides,
    };
  }

  /**
   * 创建测试错误
   */
  static createTestError(message: string = 'Test error') {
    const error = new Error(message);
    error.stack = 'Error: Test error\n    at test (test.js:1:1)';
    return error;
  }
}

/**
 * 测试模拟器
 */
export class TestMocker {
  /**
   * 模拟命令处理器
   */
  static mockCommandHandler() {
    return {
      handle: jest.fn().mockResolvedValue({
        success: true,
        data: TestDataFactory.createUser(),
      }),
      getName: jest.fn().mockReturnValue('MockCommandHandler'),
    };
  }

  /**
   * 模拟查询处理器
   */
  static mockQueryHandler() {
    return {
      handle: jest.fn().mockResolvedValue({
        success: true,
        data: TestDataFactory.createUser(),
        fromCache: false,
      }),
      getName: jest.fn().mockReturnValue('MockQueryHandler'),
    };
  }

  /**
   * 模拟事件处理器
   */
  static mockEventHandler() {
    return {
      handle: jest.fn().mockResolvedValue({
        success: true,
      }),
      getName: jest.fn().mockReturnValue('MockEventHandler'),
      getEventType: jest.fn().mockReturnValue('TestEvent'),
    };
  }

  /**
   * 模拟中间件
   */
  static mockMiddleware() {
    return {
      name: 'TestMiddleware',
      execute: jest.fn().mockImplementation(async (command, next) => {
        return await next();
      }),
    };
  }

  /**
   * 模拟缓存服务
   */
  static mockCacheService() {
    return {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      clearPattern: jest.fn(),
      clear: jest.fn(),
    };
  }
}

/**
 * 测试断言工具
 */
export class TestAssertions {
  /**
   * 断言成功结果
   */
  static assertSuccess(result: any) {
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  }

  /**
   * 断言失败结果
   */
  static assertFailure(result: any, expectedError?: string) {
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    if (expectedError) {
      expect(result.error).toContain(expectedError);
    }
  }

  /**
   * 断言缓存命中
   */
  static assertCacheHit(result: any) {
    expect(result).toBeDefined();
    expect(result.fromCache).toBe(true);
  }

  /**
   * 断言缓存未命中
   */
  static assertCacheMiss(result: any) {
    expect(result).toBeDefined();
    expect(result.fromCache).toBe(false);
  }

  /**
   * 断言异步执行状态
   */
  static async assertAsyncStatus(commandBus: any, commandId: string, expectedStatus: string) {
    const status = await commandBus.getExecutionStatus(commandId);
    expect(status).toBeDefined();
    expect(status.status).toBe(expectedStatus);
  }
}
