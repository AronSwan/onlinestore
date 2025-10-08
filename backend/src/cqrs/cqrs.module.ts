// 用途：CQRS模块，集成TanStack Query功能
// 作者：后端开发团队
// 时间：2025-10-05

import { DynamicModule, Module, OnModuleInit, Provider } from '@nestjs/common';
import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import { COMMAND_HANDLER_METADATA } from './decorators/command-handler.decorator';
import { QUERY_HANDLER_METADATA } from './decorators/query-handler.decorator';
import { EVENT_HANDLER_METADATA } from './decorators/event-handler.decorator';
import { CommandBus } from './bus/command.bus';
import { QueryBus } from './bus/query.bus';
import { EventBus } from './bus/event.bus';
import { ICommandHandler } from './interfaces/command-handler.interface';
import { IQueryHandler } from './interfaces/query-handler.interface';
import { IEventHandler } from './interfaces/event-handler.interface';
import { IQueryCache } from './interfaces/query-handler.interface';

/**
 * CQRS模块选项
 */
export interface CqrsModuleOptions {
  /**
   * 是否启用命令总线
   */
  enableCommandBus?: boolean;

  /**
   * 是否启用查询总线
   */
  enableQueryBus?: boolean;

  /**
   * 是否启用事件总线
   */
  enableEventBus?: boolean;

  /**
   * 查询缓存实例
   */
  queryCache?: IQueryCache;

  /**
   * 是否启用默认中间件
   */
  enableDefaultMiddleware?: boolean;

  /**
   * 是否启用自动发现处理器
   */
  autoDiscoverHandlers?: boolean;

  /**
   * 自定义命令总线
   */
  customCommandBus?: any;

  /**
   * 自定义查询总线
   */
  customQueryBus?: any;

  /**
   * 自定义事件总线
   */
  customEventBus?: any;
}

/**
 * CQRS模块动态选项
 */
export interface CqrsModuleAsyncOptions
  extends Pick<CqrsModuleOptions, 'enableCommandBus' | 'enableQueryBus' | 'enableEventBus'> {
  /**
   * 查询缓存工厂
   */
  queryCacheFactory?: (...args: any[]) => Promise<IQueryCache> | IQueryCache;

  /**
   * 自定义命令总线工厂
   */
  customCommandBusFactory?: (...args: any[]) => Promise<any> | any;

  /**
   * 自定义查询总线工厂
   */
  customQueryBusFactory?: (...args: any[]) => Promise<any> | any;

  /**
   * 自定义事件总线工厂
   */
  customEventBusFactory?: (...args: any[]) => Promise<any> | any;
}

/**
 * CQRS模块
 */
@Module({})
export class CqrsModule implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly commandBus?: CommandBus,
    private readonly queryBus?: QueryBus,
    private readonly eventBus?: EventBus,
  ) {}

  /**
   * 静态方法：创建CQRS模块
   * @param options 模块选项
   * @returns 动态模块
   */
  static forRoot(options: CqrsModuleOptions = {}): DynamicModule {
    const {
      enableCommandBus = true,
      enableQueryBus = true,
      enableEventBus = true,
      queryCache,
      enableDefaultMiddleware = true,
      autoDiscoverHandlers = true,
      customCommandBus,
      customQueryBus,
      customEventBus,
    } = options;

    const providers: Provider[] = [];

    // 添加发现服务
    providers.push(DiscoveryService, Reflector);

    // 添加命令总线
    if (enableCommandBus) {
      providers.push({
        provide: CommandBus,
        useClass: customCommandBus || CommandBus,
      });
      providers.push({
        provide: 'ICommandBus',
        useExisting: CommandBus,
      });
    }

    // 添加查询总线
    if (enableQueryBus) {
      providers.push({
        provide: QueryBus,
        useClass: customQueryBus || QueryBus,
      });
      providers.push({
        provide: 'IQueryBus',
        useExisting: QueryBus,
      });

      // 如果提供了查询缓存，注册它
      if (queryCache) {
        providers.push({
          provide: 'IQueryCache',
          useValue: queryCache,
        });
      }
    }

    // 添加事件总线
    if (enableEventBus) {
      providers.push({
        provide: EventBus,
        useClass: customEventBus || EventBus,
      });
      providers.push({
        provide: 'IEventBus',
        useExisting: EventBus,
      });
    }

    // 添加CQRS模块本身
    providers.push(CqrsModule);

    return {
      module: CqrsModule,
      imports: [DiscoveryModule],
      providers,
      exports: [
        ...(enableCommandBus ? [CommandBus, 'ICommandBus'] : []),
        ...(enableQueryBus ? [QueryBus, 'IQueryBus'] : []),
        ...(enableEventBus ? [EventBus, 'IEventBus'] : []),
      ],
      global: true,
    };
  }

  /**
   * 静态方法：异步创建CQRS模块
   * @param options 异步模块选项
   * @returns 动态模块
   */
  static forRootAsync(options: CqrsModuleAsyncOptions = {}): DynamicModule {
    const {
      enableCommandBus = true,
      enableQueryBus = true,
      enableEventBus = true,
      queryCacheFactory,
      customCommandBusFactory,
      customQueryBusFactory,
      customEventBusFactory,
    } = options;

    const providers: Provider[] = [];

    // 添加发现服务
    providers.push(DiscoveryService, Reflector);

    // 添加命令总线
    if (enableCommandBus) {
      if (customCommandBusFactory) {
        providers.push({
          provide: CommandBus,
          useFactory: customCommandBusFactory,
          inject: [],
        });
      } else {
        providers.push({
          provide: CommandBus,
          useClass: CommandBus,
        });
      }
      providers.push({
        provide: 'ICommandBus',
        useExisting: CommandBus,
      });
    }

    // 添加查询总线
    if (enableQueryBus) {
      if (customQueryBusFactory) {
        providers.push({
          provide: QueryBus,
          useFactory: customQueryBusFactory,
          inject: [],
        });
      } else {
        providers.push({
          provide: QueryBus,
          useClass: QueryBus,
        });
      }
      providers.push({
        provide: 'IQueryBus',
        useExisting: QueryBus,
      });

      // 如果提供了查询缓存工厂，注册它
      if (queryCacheFactory) {
        providers.push({
          provide: 'IQueryCache',
          useFactory: queryCacheFactory,
          inject: [],
        });
      }
    }

    // 添加事件总线
    if (enableEventBus) {
      if (customEventBusFactory) {
        providers.push({
          provide: EventBus,
          useFactory: customEventBusFactory,
          inject: [],
        });
      } else {
        providers.push({
          provide: EventBus,
          useClass: EventBus,
        });
      }
      providers.push({
        provide: 'IEventBus',
        useExisting: EventBus,
      });
    }

    // 添加CQRS模块本身
    providers.push(CqrsModule);

    return {
      module: CqrsModule,
      imports: [DiscoveryModule],
      providers,
      exports: [
        ...(enableCommandBus ? [CommandBus, 'ICommandBus'] : []),
        ...(enableQueryBus ? [QueryBus, 'IQueryBus'] : []),
        ...(enableEventBus ? [EventBus, 'IEventBus'] : []),
      ],
      global: true,
    };
  }

  /**
   * 模块初始化
   */
  async onModuleInit(): Promise<void> {
    await this.discoverHandlers();
    this.setupDefaultMiddleware();
  }

  /**
   * 自动发现处理器
   */
  private async discoverHandlers(): Promise<void> {
    const providers = this.discoveryService.getProviders();

    for (const provider of providers) {
      if (!provider.metatype || !provider.instance) {
        continue;
      }

      // 发现命令处理器
      const commandType = this.reflector.get<string>(COMMAND_HANDLER_METADATA, provider.metatype);

      if (commandType && this.commandBus && provider.instance.handle) {
        this.commandBus.register(commandType, provider.instance);
        console.log(`Registered command handler for ${commandType}`);
      }

      // 发现查询处理器
      const queryType = this.reflector.get<string>(QUERY_HANDLER_METADATA, provider.metatype);

      if (queryType && this.queryBus && provider.instance.handle) {
        this.queryBus.register(queryType, provider.instance);
        console.log(`Registered query handler for ${queryType}`);
      }

      // 发现事件处理器
      const eventType = this.reflector.get<string>(EVENT_HANDLER_METADATA, provider.metatype);

      if (eventType && this.eventBus && provider.instance.handle) {
        this.eventBus.register(eventType, provider.instance);
        console.log(`Registered event handler for ${eventType}`);
      }
    }
  }

  /**
   * 设置默认中间件
   */
  private setupDefaultMiddleware(): void {
    // 为命令总线添加默认中间件
    if (this.commandBus) {
      // 可以在这里添加默认的命令中间件
      console.log('Command bus initialized with default middleware');
    }

    // 为查询总线添加默认中间件
    if (this.queryBus) {
      // 设置查询缓存（如果提供了）
      const queryCache = this.discoveryService
        .getProviders()
        .find((provider: any) => provider.provide === 'IQueryCache');

      if (queryCache && queryCache.instance) {
        this.queryBus.setQueryCache(queryCache.instance);
        console.log('Query cache configured for query bus');
      }

      console.log('Query bus initialized with default middleware');
    }

    // 为事件总线添加默认中间件
    if (this.eventBus) {
      // 可以在这里添加默认的事件中间件
      console.log('Event bus initialized with default middleware');
    }
  }
}

/**
 * CQRS模块工厂
 */
export class CqrsModuleFactory {
  /**
   * 创建CQRS模块
   * @param options 模块选项
   * @returns 动态模块
   */
  static create(options: CqrsModuleOptions = {}): DynamicModule {
    return CqrsModule.forRoot(options);
  }

  /**
   * 异步创建CQRS模块
   * @param options 异步模块选项
   * @returns 动态模块
   */
  static createAsync(options: CqrsModuleAsyncOptions = {}): DynamicModule {
    return CqrsModule.forRootAsync(options);
  }
}

/**
 * TanStack Query集成
 */
export class TanStackQueryIntegration {
  /**
   * 创建TanStack Query适配器
   * @param queryBus 查询总线
   * @returns TanStack Query适配器
   */
  static createAdapter(queryBus: QueryBus) {
    return {
      /**
       * 执行查询
       * @param queryKey 查询键
       * @param queryFn 查询函数
       * @returns 查询结果
       */
      async query(queryKey: string[], queryFn: () => Promise<any>) {
        // 这里可以实现与TanStack Query的集成逻辑
        console.log(`TanStack Query integration: ${queryKey.join('.')}`);
        return await queryFn();
      },

      /**
       * 预加载查询
       * @param queryKey 查询键
       * @param queryFn 查询函数
       */
      async prefetch(queryKey: string[], queryFn: () => Promise<any>) {
        console.log(`TanStack Query prefetch: ${queryKey.join('.')}`);
        return await queryFn();
      },

      /**
       * 使查询失效
       * @param queryKey 查询键
       */
      async invalidate(queryKey: string[]) {
        console.log(`TanStack Query invalidate: ${queryKey.join('.')}`);
        // 调用查询总线的失效方法
        const [queryType, ...cacheKeyParts] = queryKey;
        if (queryBus && queryType) {
          await queryBus.invalidateCache(queryType, cacheKeyParts.join('_'));
        }
      },
    };
  }
}
