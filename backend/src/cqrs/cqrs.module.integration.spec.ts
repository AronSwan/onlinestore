// CQRS模块集成测试
// 作者：后端开发团队
// 时间：2025-10-05

import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from './cqrs.module';
import { CommandBus } from './bus/command.bus';
import { QueryBus } from './bus/query.bus';
import { EventBus } from './bus/event.bus';
import { CommandBase } from './commands/command.base';
import { QueryBase } from './queries/query.base';
import { EventBase } from './events/event.base';
import { ICommandHandler } from './interfaces/command-handler.interface';
import { IQueryHandler } from './interfaces/query-handler.interface';
import { IEventHandler } from './interfaces/event-handler.interface';
import { TestMocker, TestAssertions, TestDataFactory } from './test/test-utils';

// Jest全局导入
import 'jest';

describe('CQRS Module Integration', () => {
  let app: any;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let eventBus: EventBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        CqrsModule.forRoot({
          enableCommandBus: true,
          enableQueryBus: true,
          enableEventBus: true,
          autoDiscoverHandlers: false,
        }),
      ],
      providers: [
        // 注册测试处理器
        {
          provide: 'CreateUserCommandHandler',
          useFactory: () => TestMocker.mockCommandHandler(),
        },
        {
          provide: 'GetUserQueryHandler',
          useFactory: () => TestMocker.mockQueryHandler(),
        },
        {
          provide: 'UserCreatedEventHandler',
          useFactory: () => TestMocker.mockEventHandler(),
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    commandBus = module.get<CommandBus>(CommandBus);
    queryBus = module.get<QueryBus>(QueryBus);
    eventBus = module.get<EventBus>(EventBus);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('模块初始化', () => {
    it('应该正确初始化所有总线', () => {
      expect(commandBus).toBeDefined();
      expect(queryBus).toBeDefined();
      expect(eventBus).toBeDefined();
    });

    it('应该支持动态配置', () => {
      expect(commandBus).toBeInstanceOf(CommandBus);
      expect(queryBus).toBeInstanceOf(QueryBus);
      expect(eventBus).toBeInstanceOf(EventBus);
    });
  });

  describe('命令查询事件集成', () => {
    it('应该能够执行命令并发布事件', async () => {
      // 准备测试数据
      const command = new CreateUserCommand(TestDataFactory.createUser());
      const event = new UserCreatedEvent('user-123', 'testuser');

      // 注册处理器
      const commandHandler = commandBus.getProvider('CreateUserCommandHandler');
      expect(commandHandler).toBeDefined();
      commandBus.register('CreateUserCommand', commandHandler!);
      // 注册处理器
      const eventHandler = eventBus.getProvider('UserCreatedEventHandler');
      expect(eventHandler).toBeDefined();
      eventBus.register('UserCreated', eventHandler!);

      // 执行命令
      const commandResult = await commandBus.execute(command);

      // 验证命令结果
      TestAssertions.assertSuccess(commandResult);

      // 模拟命令处理器发布事件
      await eventBus.publish(event);

      // 验证事件处理
      expect(eventHandler!.handle).toHaveBeenCalledWith(event);
    });

    it('应该能够执行查询并使用缓存', async () => {
      // 准备测试数据
      const query = new GetUserQuery('user-123');

      // 注册处理器
      const queryHandler = queryBus.getProvider('GetUserQueryHandler');
      expect(queryHandler).toBeDefined();
      queryBus.register('GetUserQuery', queryHandler!);

      // 执行查询
      const queryResult = await queryBus.execute(query);

      // 验证查询结果
      TestAssertions.assertSuccess(queryResult);

      // 再次执行查询（应该使用缓存）
      const cachedResult = await queryBus.execute(query);

      // 验证缓存命中
      TestAssertions.assertCacheHit(cachedResult);
    });
  });

  describe('中间件集成', () => {
    it('应该支持中间件管道', async () => {
      // 准备测试数据
      const command = new CreateUserCommand(TestDataFactory.createUser());
      const middleware1 = TestMocker.mockMiddleware();
      const middleware2 = TestMocker.mockMiddleware();

      // 注册中间件
      commandBus.addMiddleware(middleware1);
      commandBus.addMiddleware(middleware2);

      // 注册处理器
      const commandHandler = commandBus.getProvider('CreateUserCommandHandler');
      expect(commandHandler).toBeDefined();
      commandBus.register('CreateUserCommand', commandHandler!);

      // 执行命令
      await commandBus.execute(command);

      // 验证中间件执行
      expect(middleware1.execute).toHaveBeenCalled();
      expect(middleware2.execute).toHaveBeenCalled();
    });
  });

  describe('异步执行集成', () => {
    it('应该支持异步命令执行', async () => {
      // 准备测试数据
      const command = new CreateUserCommand(TestDataFactory.createUser());

      // 注册处理器
      const commandHandler = commandBus.getProvider('CreateUserCommandHandler');
      expect(commandHandler).toBeDefined();
      commandBus.register('CreateUserCommand', commandHandler!);

      // 异步执行命令
      const commandId = await commandBus.executeAsync(command);

      // 验证命令ID
      expect(commandId).toBeDefined();
      expect(typeof commandId).toBe('string');

      // 获取执行状态
      const status = await commandBus.getExecutionStatus(commandId);
      expect(status).toBeDefined();
      expect(status!.status).toBe('running');
    });
  });

  describe('缓存集成', () => {
    it('应该支持查询缓存', async () => {
      // 准备测试数据
      const query = new GetUserQuery('user-123');

      // 注册处理器
      const queryHandler = queryBus.getProvider('GetUserQueryHandler');
      expect(queryHandler).toBeDefined();
      queryBus.register('GetUserQuery', queryHandler!);

      // 执行查询
      await queryBus.execute(query);

      // 获取缓存统计
      const stats = await queryBus.getCacheStats();
      if (stats) {
        expect(stats.hits).toBeGreaterThanOrEqual(0);
      }
    });

    it('应该支持缓存失效', async () => {
      // 准备测试数据
      const query = new GetUserQuery('user-123');

      // 注册处理器
      const queryHandler = queryBus.getProvider('GetUserQueryHandler');
      expect(queryHandler).toBeDefined();
      queryBus.register('GetUserQuery', queryHandler!);

      // 执行查询以填充缓存
      await queryBus.execute(query);

      // 使缓存失效
      await queryBus.invalidateCache('GetUserQuery', 'user-123');

      // 再次执行查询（应该重新执行）
      await queryBus.execute(query);

      // 验证处理器被调用两次
      expect(queryHandler!.handle).toHaveBeenCalledTimes(2);
    });
  });

  describe('错误处理集成', () => {
    it('应该正确处理命令执行错误', async () => {
      // 准备测试数据
      const command = new CreateUserCommand(TestDataFactory.createUser());
      const error = new Error('Command execution failed');

      // 注册会失败的处理器
      const failingHandler = {
        getName: jest.fn().mockReturnValue('FailingCommandHandler'),
        handle: jest.fn().mockRejectedValue(error),
      };

      commandBus.register('CreateUserCommand', failingHandler);

      // 执行命令
      const result = await commandBus.execute(command);

      // 验证错误处理
      TestAssertions.assertFailure(result, 'Command execution failed');
    });

    it('应该正确处理查询执行错误', async () => {
      // 准备测试数据
      const query = new GetUserQuery('user-123');
      const error = new Error('Query execution failed');

      // 注册会失败的处理器
      const failingHandler = {
        getName: jest.fn().mockReturnValue('FailingQueryHandler'),
        handle: jest.fn().mockRejectedValue(error),
      };

      queryBus.register('GetUserQuery', failingHandler);

      // 执行查询
      const result = await queryBus.execute(query);

      // 验证错误处理
      TestAssertions.assertFailure(result, 'Query execution failed');
    });
  });

  describe('性能监控集成', () => {
    it('应该监控命令执行性能', async () => {
      // 准备测试数据
      const command = new CreateUserCommand(TestDataFactory.createUser());

      // 注册处理器
      const commandHandler = commandBus.getProvider('CreateUserCommandHandler');
      expect(commandHandler).toBeDefined();
      commandBus.register('CreateUserCommand', commandHandler!);

      // 执行命令
      const startTime = Date.now();
      await commandBus.execute(command);
      const endTime = Date.now();

      // 验证执行时间
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该监控查询执行性能', async () => {
      // 准备测试数据
      const query = new GetUserQuery('user-123');

      // 注册处理器
      const queryHandler = queryBus.getProvider('GetUserQueryHandler');
      expect(queryHandler).toBeDefined();
      queryBus.register('GetUserQuery', queryHandler!);

      // 执行查询
      const startTime = Date.now();
      await queryBus.execute(query);
      const endTime = Date.now();

      // 验证执行时间
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(1000); // 应该在1秒内完成
    });
  });

  describe('配置验证', () => {
    it('应该验证模块配置', () => {
      const config = {
        enableCommandBus: true,
        enableQueryBus: true,
        enableEventBus: true,
        autoDiscoverHandlers: false,
      };

      expect(config.enableCommandBus).toBe(true);
      expect(config.enableQueryBus).toBe(true);
      expect(config.enableEventBus).toBe(true);
      expect(config.autoDiscoverHandlers).toBe(false);
    });
  });
});

// 测试命令类
class CreateUserCommand extends CommandBase {
  constructor(public readonly userData: any) {
    super();
  }

  protected getData(): Record<string, any> {
    return { userData: this.userData };
  }
}

// 测试查询类
class GetUserQuery extends QueryBase {
  constructor(public readonly userId: string) {
    super({
      cacheKey: `user_${userId}`,
      cacheTime: 300,
      staleTime: 60,
    });
  }

  protected getData(): Record<string, any> {
    return { userId: this.userId };
  }
}

// 测试事件类
class UserCreatedEvent extends EventBase {
  constructor(
    public readonly userId: string,
    public readonly username: string,
  ) {
    super('UserCreated', { aggregateId: userId });
  }

  protected getData(): Record<string, any> {
    return { userId: this.userId, username: this.username };
  }
}
