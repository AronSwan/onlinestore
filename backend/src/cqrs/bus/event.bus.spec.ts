// 事件总线单元测试
// 作者：后端开发团队
// 时间：2025-10-05

// Jest 全局类型声明
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;
declare const jest: any;

import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from './event.bus';
import { EventBase, IEvent } from '../events/event.base';
import { IEventHandler, IEventMiddleware } from '../interfaces/event-handler.interface';
import { TestMocker, TestAssertions, TestDataFactory } from '../test/test-utils';
import { CqrsLoggingService } from '../logging/cqrs-logging.service';
import { CqrsMetricsService } from '../metrics/cqrs-metrics.service';
import { CqrsTracingService } from '../tracing/cqrs-tracing.service';

describe('EventBus', () => {
  let eventBus: EventBus;
  let mockHandler: IEventHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventBus,
        {
          provide: CqrsLoggingService,
          useValue: {
            logEvent: jest.fn(),
            logError: jest.fn(),
          },
        },
        {
          provide: CqrsMetricsService,
          useValue: {
            recordEvent: jest.fn(),
            recordEventMetrics: jest.fn(),
            recordErrorMetrics: jest.fn(),
          },
        },
        {
          provide: CqrsTracingService,
          useValue: {
            startEventSpan: jest.fn().mockReturnValue({}),
            getCurrentContext: jest.fn().mockReturnValue({ traceId: 'test-trace', spanId: 'test-span' }),
            finishSpan: jest.fn(),
          },
        },
      ],
    }).compile();

    eventBus = module.get<EventBus>(EventBus);
    mockHandler = TestMocker.mockEventHandler();
  });

  describe('publish', () => {
    it('应该成功发布事件', async () => {
      // 准备测试数据
      const event = new TestEvent('user-created', 'user-123');
      eventBus.register('user-created', mockHandler);

      // 执行测试
      await eventBus.publish(event);

      // 等待一小段时间以确保异步操作完成
      await new Promise(resolve => setTimeout(resolve, 10));

      // 验证结果
      expect(mockHandler.handle).toHaveBeenCalledWith(event);
    });

    it('应该在没有注册处理器时跳过', async () => {
      // 准备测试数据
      const event = new TestEvent('user-created', 'user-123');

      // 执行测试
      await eventBus.publish(event);

      // 验证结果
      expect(mockHandler.handle).not.toHaveBeenCalled();
    });

    it('应该正确处理处理器异常', async () => {
      // 准备测试数据
      const event = new TestEvent('user-created', 'user-123');
      const error = new Error('Handler error');
      mockHandler.handle = jest.fn().mockRejectedValue(error);

      eventBus.register('user-created', mockHandler);

      // 执行测试 - 应该不会抛出错误，因为EventBus使用Promise.allSettled
      await expect(eventBus.publish(event)).resolves.not.toThrow();

      // 验证结果 - 处理器被调用
      expect(mockHandler.handle).toHaveBeenCalledWith(event);
      
      // 验证处理状态 - 事件应该被标记为失败
      const status = await eventBus.getProcessingStatus(event.id);
      expect(status).toBeDefined();
      expect(status?.status).toBe('failed');
      expect(status?.error).toBe('Handler error');
    });
  });

  describe('publishAsync', () => {
    it('应该异步发布事件', async () => {
      // 准备测试数据
      const event = new TestEvent('user-created', 'user-123');
      eventBus.register('user-created', mockHandler);

      // 执行测试
      await eventBus.publishAsync(event);

      // 等待一小段时间以确保异步操作完成
      await new Promise(resolve => setTimeout(resolve, 10));

      // 验证结果
      expect(mockHandler.handle).toHaveBeenCalledWith(event);
    });

    it('应该并行处理多个处理器', async () => {
      // 准备测试数据
      const event = new TestEvent('user-created', 'user-123');
      const firstHandler = TestMocker.mockEventHandler();
      const secondHandler = TestMocker.mockEventHandler();

      eventBus.register('user-created', firstHandler);
      eventBus.register('user-created', secondHandler);

      // 执行测试
      await eventBus.publishAsync(event);

      // 等待一小段时间以确保异步操作完成
      await new Promise(resolve => setTimeout(resolve, 10));

      // 验证结果
      expect(firstHandler.handle).toHaveBeenCalledWith(event);
      expect(secondHandler.handle).toHaveBeenCalledWith(event);
    });
  });

  describe('register', () => {
    it('应该成功注册事件处理器', () => {
      // 准备测试数据
      const eventType = 'UserCreatedEvent';
      const handler = mockHandler;

      // 执行测试
      eventBus.register(eventType, handler);

      // 验证结果
      const registeredHandlers = eventBus.getHandlers(eventType);
      expect(registeredHandlers).toHaveLength(1);
      expect(registeredHandlers[0]).toBe(handler);
    });

    it('应该覆盖已注册的处理器', () => {
      // 准备测试数据
      const eventType = 'UserCreatedEvent';
      const firstHandler = mockHandler;
      const secondHandler = TestMocker.mockEventHandler();

      // 执行测试
      eventBus.register(eventType, firstHandler);
      eventBus.register(eventType, secondHandler);

      // 验证结果
      const registeredHandlers = eventBus.getHandlers(eventType);
      expect(registeredHandlers).toHaveLength(2);
      expect(registeredHandlers[1]).toBe(secondHandler);
    });

    it('应该支持同一事件的多个处理器', () => {
      // 准备测试数据
      const eventType = 'UserCreatedEvent';
      const firstHandler = mockHandler;
      const secondHandler = TestMocker.mockEventHandler();

      // 执行测试
      eventBus.register(eventType, firstHandler);
      eventBus.register(eventType, secondHandler);

      // 验证结果
      const handlers = eventBus.getHandlers(eventType);
      expect(handlers).toHaveLength(2);
      expect(handlers).toContain(firstHandler);
      expect(handlers).toContain(secondHandler);
    });
  });

  describe('unregister', () => {
    it('应该成功注销事件处理器', () => {
      // 准备测试数据
      const eventType = 'UserCreatedEvent';
      eventBus.register(eventType, mockHandler);

      // 执行测试
      eventBus.unregister(eventType, mockHandler);

      // 验证结果
      const handlers = eventBus.getHandlers(eventType);
      expect(handlers).toHaveLength(0);
    });

    it('应该注销指定的事件类型', () => {
      // 准备测试数据
      const eventType = 'UserCreatedEvent';
      eventBus.register(eventType, mockHandler);

      // 执行测试
      eventBus.unregister(eventType);

      // 验证结果
      const handlers = eventBus.getHandlers(eventType);
      expect(handlers).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('应该清空所有事件处理器', () => {
      // 准备测试数据
      const eventType1 = 'UserCreatedEvent';
      const eventType2 = 'UserUpdatedEvent';
      eventBus.register(eventType1, mockHandler);
      eventBus.register(eventType2, mockHandler);

      // 执行测试
      eventBus.clear();

      // 验证结果
      const eventTypes = eventBus.getRegisteredEventTypes();
      expect(eventTypes.length).toBe(0);
    });
  });

  describe('getRegisteredEventTypes', () => {
    it('应该返回所有注册的事件类型', () => {
      // 准备测试数据
      const eventTypes = ['UserCreatedEvent', 'UserUpdatedEvent'];
      eventTypes.forEach(type => {
        eventBus.register(type, mockHandler);
      });

      // 执行测试
      const registeredTypes = eventBus.getRegisteredEventTypes();

      // 验证结果
      expect(registeredTypes).toHaveLength(2);
      expect(registeredTypes).toContain('UserCreatedEvent');
      expect(registeredTypes).toContain('UserUpdatedEvent');
    });
  });

  describe('getHandlers', () => {
    it('应该返回指定事件类型的处理器', () => {
      // 准备测试数据
      const eventType = 'UserCreatedEvent';
      eventBus.register(eventType, mockHandler);

      // 执行测试
      const handlers = eventBus.getHandlers(eventType);

      // 验证结果
      expect(handlers).toHaveLength(1);
      expect(handlers).toContain(mockHandler);
    });

    it('应该返回空数组对于未注册的事件类型', () => {
      // 执行测试
      const handlers = eventBus.getHandlers('NonExistentEvent');

      // 验证结果
      expect(handlers).toHaveLength(0);
    });
  });

  describe('hasHandlers', () => {
    it('应该检查事件类型是否有处理器', () => {
      // 准备测试数据
      const eventType = 'UserCreatedEvent';
      eventBus.register(eventType, mockHandler);

      // 执行测试
      const hasHandlers = eventBus.hasHandlers(eventType);

      // 验证结果
      expect(hasHandlers).toBe(true);
    });

    it('应该返回false对于未注册的事件类型', () => {
      // 执行测试
      const hasHandlers = eventBus.hasHandlers('NonExistentEvent');

      // 验证结果
      expect(hasHandlers).toBe(false);
    });
  });

  describe('middlewares', () => {
    it('应该在执行事件时调用中间件', async () => {
      const event = new TestEvent('user-created', 'user-123');
      const mw1Fn = jest.fn();
      const mw2Fn = jest.fn();

      const middleware1: IEventMiddleware = {
        name: 'TestEventMiddleware1',
        execute: jest.fn(async (evt, next) => {
          mw1Fn(evt);
          return next();
        }),
      };

      const middleware2: IEventMiddleware = {
        name: 'TestEventMiddleware2',
        execute: jest.fn(async (evt, next) => {
          mw2Fn(evt);
          return next();
        }),
      };

      eventBus.addMiddleware(middleware1);
      eventBus.addMiddleware(middleware2);
      eventBus.register('user-created', mockHandler);

      await eventBus.publish(event);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mw1Fn).toHaveBeenCalledWith(event);
      expect(mw2Fn).toHaveBeenCalledWith(event);
      expect(mockHandler.handle).toHaveBeenCalledWith(event);
    });

    it('应该返回添加的中间件列表', () => {
      const middleware1: IEventMiddleware = { name: 'ListEventMiddleware1', execute: jest.fn(async (_e, next) => next()) };
      const middleware2: IEventMiddleware = { name: 'ListEventMiddleware2', execute: jest.fn(async (_e, next) => next()) };

      eventBus.addMiddleware(middleware1);
      eventBus.addMiddleware(middleware2);

      const middlewares = eventBus.getMiddlewares();
      const names = middlewares.map(m => m.name);
      expect(names).toContain('ListEventMiddleware1');
      expect(names).toContain('ListEventMiddleware2');
    });
  });

  describe('getExecutionStats', () => {
    it('应该返回执行统计信息', () => {
      // 准备测试数据
      const event = new TestEvent('user-created', 'user-123');
      eventBus.register('UserCreatedEvent', mockHandler);

      // 执行测试
      const stats = eventBus.getExecutionStats();

      // 验证结果
      expect(stats).toBeDefined();
      expect(stats.totalPublished).toBe(0);
      expect(stats.totalHandlersExecuted).toBe(0);
      expect(stats.errors).toBe(0);
    });
  });

  describe('resetStats', () => {
    it('应该重置统计信息', () => {
      // 准备测试数据
      const event = new TestEvent('user-created', 'user-123');
      eventBus.register('UserCreatedEvent', mockHandler);

      // 发布事件以增加统计
      eventBus.publish(event);

      // 执行测试
      eventBus.resetStats();

      // 验证结果
      const stats = eventBus.getExecutionStats();
      expect(stats.totalPublished).toBe(0);
      expect(stats.totalHandlersExecuted).toBe(0);
      expect(stats.errors).toBe(0);
    });
  });
});

// 测试事件类
class TestEvent implements IEvent {
  public readonly id: string;
  public readonly timestamp: Date;
  public readonly metadata: Record<string, any>;
  public readonly version: number;
  public readonly streamVersion?: number;

  constructor(
    public readonly eventType: string,
    public readonly aggregateId: string,
    public readonly payload?: any,
  ) {
    this.id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
    this.metadata = { aggregateId };
    this.version = 1;
  }

  /**
   * 获取事件数据
   */
  getData(): Record<string, any> {
    return {
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      payload: this.payload,
    };
  }
}
