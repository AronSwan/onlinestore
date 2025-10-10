
# CQRS 模块全面优化实施方案

## 概述

本文档提供了一个全面的 CQRS 模块优化实施方案，基于对现有实现的深入分析和 OpenObserve 集成计划，旨在提升系统的性能、可靠性和可观测性。

## 目标与原则

### 优化目标
- 提升系统性能：查询 p95 < 300ms、命令 p95 < 500ms
- 增强可靠性：错误率 < 1%、缓存命中率 > 80%
- 完善可观测性：日志覆盖率 100%、告警命中率 > 95%
- 提高开发效率：减少调试时间，简化维护工作

### 设计原则
- 渐进式改进：分阶段实施，确保系统稳定
- 向后兼容：保持现有 API 不变
- 可观测性优先：所有操作均可观测、可追踪
- 自动化驱动：减少手动操作，提高自动化程度

## 现状分析

### 优势
- 完整的 CQRS 模式实现
- 丰富的装饰器系统
- TanStack Query 深度集成
- 良好的 TypeScript 类型支持

### 问题
- 性能瓶颈：内存泄漏、缓存机制不完善
- 可观测性不足：缺少结构化日志、追踪和指标
- 工程实践问题：依赖注入、配置管理不规范
- 错误处理不完善：缺少统一的错误处理机制

## 优化方案详解

### 阶段一：紧急修复（第1-2周）

#### 1.1 修复 TanStack Query 关键问题

**文件**：`backend/src/cqrs/tanstack-query.integration.ts`

**问题**：
- 重试机制使用递归 setTimeout，易产生状态漂移
- 缓存配置问题：`cacheTime=0` 被 `(cacheTime || 300)` 覆盖
- 后台刷新定时器未保留句柄，存在内存泄漏风险
- 变量赋值错误：`refetchOnWindowFocus` 误赋值为 `config.refetchOnReconnect`

**解决方案**：
```typescript
// 引入 p-retry 库
import pRetry from 'p-retry';

@Injectable()
export class TanStackQueryIntegrationService implements ITanStackQueryClient {
  private readonly intervals = new Map<string, NodeJS.Timeout>();
  private readonly logger = new Logger(TanStackQueryIntegrationService.name);
  private readonly queryCache = new Map<string, TanStackQueryState>();
  private readonly config: TanStackQueryConfig;

  // 修复重试机制
  async query<T>(options: TanStackQueryOptions): Promise<TanStackQueryState<T>> {
    const {
      queryKey,
      queryFn,
      cacheTime = this.config.defaultCacheTime,
      staleTime = this.config.defaultStaleTime,
      enableBackgroundRefresh = this.config.enableBackgroundRefresh,
      refreshInterval = this.config.refreshInterval,
      retry = this.config.retry,
      retryDelay = this.config.retryDelay,
      refetchOnWindowFocus = this.config.refetchOnWindowFocus, // 修复这里
      refetchOnReconnect = this.config.refetchOnReconnect,
      enabled = true,
      select,
    } = options;

    // ... 现有代码

    // 修复重试逻辑
    if (retry && retry > 0) {
      this.logger.debug(`Retrying query: ${cacheKey}, attempts left: ${retry}`);
      
      try {
        const retryOptions = { ...options, retry: retry - 1 };
        return await pRetry(() => this.query(retryOptions), {
          retries: retry,
          minTimeout: retryDelay,
          onFailedAttempt: (error) => {
            this.logger.error(
              `Query attempt ${error.attemptNumber} failed: ${cacheKey}`,
              error,
            );
          },
        });
      } catch (retryError) {
        this.logger.error(`Query failed after retries: ${cacheKey}`, retryError);
        return errorState;
      }
    }
    
    return errorState;
  }

  // 修复缓存 0 值处理
  private createSuccessState<T>(
    data: T,
    cacheTime: number | undefined,
    cacheKey: string,
    queryKey: string[],
  ): TanStackQueryState<T> {
    // 修复：cacheTime=0 严格禁用缓存
    const expiresMs = cacheTime === 0 ? 0 : (cacheTime || this.config.defaultCacheTime || 300) * 1000;
    const cacheExpiresAt = expiresMs ? new Date(Date.now() + expiresMs) : undefined;

    return {
      data,
      isLoading: false,
      isFetching: false,
      isSuccess: true,
      isError: false,
      isFromCache: false,
      cacheExpiresAt,
      lastUpdated: new Date(),
      queryKey,
    };
  }

  // 修复后台刷新清理机制
  private setupBackgroundRefresh(
    cacheKey: string,
    options: TanStackQueryOptions,
    interval: number,
  ): void {
    // 清理已存在的定时器
    if (this.intervals.has(cacheKey)) {
      clearInterval(this.intervals.get(cacheKey)!);
    }
    
    const timer = setInterval(async () => {
      this.logger.debug(`Background refresh for query: ${cacheKey}`);
      try {
        await this.query(options);
      } catch (error) {
        this.logger.error(`Background refresh failed for query: ${cacheKey}`, error);
      }
    }, interval * 1000);
    
    this.intervals.set(cacheKey, timer);
  }

  // 添加清理方法
  async invalidateQueries(queryKey: string[]): Promise<void> {
    const cacheKey = queryKey.join('.');
    
    // 清理后台刷新定时器
    if (this.intervals.has(cacheKey)) {
      clearInterval(this.intervals.get(cacheKey)!);
      this.intervals.delete(cacheKey);
    }
    
    // 从缓存中删除
    this.queryCache.delete(cacheKey);
    
    // 调用查询总线失效（如果需要）
    const [queryType, ...cacheKeyParts] = queryKey;
    if (queryType) {
      await this.queryBus.invalidateCache(queryType, cacheKeyParts.join('_'));
    }
    
    this.logger.debug(`Invalidated query: ${cacheKey}`);
  }

  async resetQueries(queryKey: string[]): Promise<void> {
    const cacheKey = queryKey.join('.');
    
    // 清理后台刷新定时器
    if (this.intervals.has(cacheKey)) {
      clearInterval(this.intervals.get(cacheKey)!);
      this.intervals.delete(cacheKey);
    }
    
    this.queryCache.delete(cacheKey);
    this.logger.debug(`Reset query: ${cacheKey}`);
  }

  onModuleDestroy(): void {
    // 清理所有定时器
    for (const [cacheKey, timer] of this.intervals.entries()) {
      clearInterval(timer);
      this.logger.debug(`Cleaned up background refresh for query: ${cacheKey}`);
    }
    this.intervals.clear();
  }
}
```

#### 1.2 修复依赖注入问题

**文件**：`backend/src/cqrs/cqrs.module.ts`

**问题**：
- 模块选项未生效：`onModuleInit` 无视 `enableDefaultMiddleware`/`autoDiscoverHandlers`
- 通过 `DiscoveryService.getProviders` 查找 `IQueryCache` 脆弱且耦合内部结构

**解决方案**：
```typescript
import { DynamicModule, Module, OnModuleInit, OnModuleDestroy, Provider } from '@nestjs/common';
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
  enableCommandBus?: boolean;
  enableQueryBus?: boolean;
  enableEventBus?: boolean;
  queryCache?: IQueryCache;
  enableDefaultMiddleware?: boolean;
  autoDiscoverHandlers?: boolean;
  customCommandBus?: any;
  customQueryBus?: any;
  customEventBus?: any;
}

/**
 * CQRS模块选项提供者
 */
export const CQRS_MODULE_OPTIONS = 'CQRS_MODULE_OPTIONS';

@Module({})
export class CqrsModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly commandBus?: CommandBus,
    private readonly queryBus?: QueryBus,
    private readonly eventBus?: EventBus,
    @Inject('IQueryCache') private readonly queryCache?: IQueryCache,
    @Inject(CQRS_MODULE_OPTIONS) private readonly options: CqrsModuleOptions,
  ) {}

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

    // 添加模块选项
    providers.push({
      provide: CQRS_MODULE_OPTIONS,
      useValue: options,
    });

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
      global: false, // 默认不设为全局模块
    };
  }

  async onModuleInit(): Promise<void> {
    // 尊重配置选项
    if (this.options.autoDiscoverHandlers !== false) {
      await this.discoverHandlers();
    }
    
    if (this.options.enableDefaultMiddleware !== false) {
      this.setupDefaultMiddleware();
    }
  }

  async onModuleDestroy(): Promise<void> {
    // 清理资源
    if (this.queryBus && 'onModuleDestroy' in this.queryBus) {
      (this.queryBus as any).onModuleDestroy();
    }
  }

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
        this.logger.debug(`Registered command handler for ${commandType}`);
      }

      // 发现查询处理器
      const queryType = this.reflector.get<string>(QUERY_HANDLER_METADATA, provider.metatype);
      if (queryType && this.queryBus && provider.instance.handle) {
        this.queryBus.register(queryType, provider.instance);
        this.logger.debug(`Registered query handler for ${queryType}`);
      }

      // 发现事件处理器
      const eventType = this.reflector.get<string>(EVENT_HANDLER_METADATA, provider.metatype);
      if (eventType && this.eventBus && provider.instance.handle) {
        this.eventBus.register(eventType, provider.instance);
        this.logger.debug(`Registered event handler for ${eventType}`);
      }
    }
  }

  private setupDefaultMiddleware(): void {
    // 为命令总线添加默认中间件
    if (this.commandBus) {
      this.commandBus.addMiddleware(new LoggingMiddleware());
      this.commandBus.addMiddleware(new MetricsMiddleware());
      this.logger.debug('Command bus initialized with default middleware');
    }

    // 为查询总线添加默认中间件
    if (this.queryBus) {
      this.queryBus.addMiddleware(new QueryLoggingMiddleware());
      this.queryBus.addMiddleware(new PerformanceMonitoringMiddleware());
      
      // 设置查询缓存（如果提供了）
      if (this.queryCache) {
        this.queryBus.setQueryCache(this.queryCache);
        this.logger.debug('Query cache configured for query bus');
      }
      
      this.logger.debug('Query bus initialized with default middleware');
    }

    // 为事件总线添加默认中间件
    if (this.eventBus) {
      this.eventBus.addMiddleware(new EventLoggingMiddleware());
      this.eventBus.addMiddleware(new RetryMiddleware());
      this.logger.debug('Event bus initialized with default middleware');
    }
  }
}
```

#### 1.3 修复导出和配置问题

**文件**：`backend/src/cqrs/index.ts`

**问题**：Barrel 导出使用 `.js` 扩展名，TypeScript 编译前不应带 `.js`

**解决方案**：
```typescript
// 用途：CQRS模块入口文件
// 作者：后端开发团队
// 时间：2025-10-05

export * from './commands/command.base';
export * from './queries/query.base';
export * from './events/event.base';
export * from './interfaces/command-handler.interface';
export * from './interfaces/query-handler.interface';
export * from './interfaces/event-handler.interface';
export * from './bus/command.bus';
export * from './bus/query.bus';
export * from './bus/event.bus';
export * from './decorators/command-handler.decorator';
export * from './decorators/query-handler.decorator';
export * from './decorators/event-handler.decorator';
export * from './cqrs.module';
export * from './tanstack-query.integration';
```

**文件**：`backend/src/cqrs/jest.config.js`

**问题**：`moduleNameMapping` 应为 `moduleNameMapper`，目录不一致问题

**解决方案**：
```javascript
module.exports = {
  displayName: 'CQRS',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: [
    '<rootDir>/src/cqrs/**/*.spec.ts',
    '<rootDir>/src/cqrs/**/*.test.ts',
    '<rootDir>/test/**/*.spec.ts',
    '<rootDir>/test/**/*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    '<rootDir>/src/cqrs/**/*.ts',
    '!<rootDir>/src/cqrs/**/*.d.ts',
    '!<rootDir>/src/cqrs/index.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@cqrs/(.*)$': '<rootDir>/src/cqrs/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 10000,
};
```

### 阶段二：OpenObserve 集成（第3-4周）

#### 2.1 环境变量配置

**文件**：`backend/src/config/cqrs-openobserve.config.ts`

```typescript
import { registerAs } from '@nestjs/config';
import { OPENOBSERVE_URL, OPENOBSERVE_ORGANIZATION, OPENOBSERVE_TOKEN } from '../../../scripts/openobserve/env-adapter';

export default registerAs('cqrsOpenObserve', () => ({
  baseUrl: OPENOBSERVE_URL,
  organization: OPENOBSERVE_ORGANIZATION,
  token: OPENOBSERVE_TOKEN,
  streams: {
    commands: process.env.CQRS_STREAM_COMMANDS || 'cqrs-commands',
    queries: process.env.CQRS_STREAM_QUERIES || 'cqrs-queries',
    events: process.env.CQRS_STREAM_EVENTS || 'cqrs-events',
    metrics: process.env.CQRS_STREAM_METRICS || 'cqrs-metrics',
    traces: process.env.CQRS_STREAM_TRACES || 'traces',
  },
  endpoints: {
    logs: `${OPENOBSERVE_URL}/otlp/v1/logs`,
    metrics: `${OPENOBSERVE_URL}/otlp/v1/metrics`,
    traces: `${OPENOBSERVE_URL}/otlp/v1/traces`,
  },
  performance: {
    batchSize: parseInt(process.env.OPENOBSERVE_BATCH_SIZE || '100', 10),
    flushInterval: parseInt(process.env.OPENOBSERVE_FLUSH_INTERVAL || '5000', 10),
    maxRetries: parseInt(process.env.OPENOBSERVE_MAX_RETRIES || '3', 10),
    timeout: parseInt(process.env.OPENOBSERVE_TIMEOUT || '10000', 10),
  },
  tracing: {
    enabled: process.env.OPENOBSERVE_TRACING_ENABLED !== 'false',
    samplingRate: parseFloat(process.env.OPENOBSERVE_TRACING_SAMPLING_RATE || '0.1'),
  },
  alerts: {
    enabled: process.env.OPENOBSERVE_ALERTS_ENABLED !== 'false',
    evaluationInterval: parseInt(process.env.OPENOBSERVE_ALERTS_EVALUATION_INTERVAL || '60000', 10),
  },
}));
```

#### 2.2 结构化日志服务

**文件**：`backend/src/cqrs/logging/cqrs-logging.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessLoggerService } from '../../logging/business-logger.service';
import { CqrsOpenObserveConfig } from '../../config/cqrs-openobserve.config';

export interface CQRSLogContext {
  traceId?: string;
  spanId?: string;
  requestId?: string;
  tenant?: string;
  userId?: string;
  type?: string;
  id?: string;
  handler?: string;
  cacheKey?: string;
  cacheHit?: boolean;
  retryCount?: number;
  durationMs?: number;
  errorCode?: string;
  status?: 'start' | 'success' | 'error' | 'published' | 'handled';
  subscriber?: string;
  dlq?: boolean;
}

@Injectable()
export class CqrsLoggingService {
  private readonly logger = new Logger(CqrsLoggingService.name);
  private readonly config: CqrsOpenObserveConfig;

  constructor(
    private readonly businessLogger: BusinessLoggerService,
    private readonly configService: ConfigService,
  ) {
    this.config = this.configService.get<CqrsOpenObserveConfig>('cqrsOpenObserve');
  }

  /**
   * 记录命令日志
   */
  logCommand(context: CQRSLogContext, message?: string, error?: Error): void {
    const logData = {
      timestamp: new Date().toISOString(),
      level: error ? 'ERROR' : 'INFO',
      service: process.env.SERVICE_NAME || 'backend',
      source: process.env.SERVICE_SOURCE || 'apiserver',
      env: process.env.NODE_ENV || 'development',
      version: process.env.SERVICE_VERSION || '1.0.0',
      bus: 'command',
      type: context.type,
      id: context.id,
      status: context.status,
      handler: context.handler,
      duration_ms: context.durationMs,
      retry_count: context.retryCount || 0,
      error_code: error?.name,
      error_message: error?.message,
      traceId: context.traceId,
      spanId: context.spanId,
      requestId: context.requestId,
      tenant: context.tenant,
      userId: context.userId,
    };

    if (message) {
      logData.message = message;
    }

    // 写入 BusinessLogger
    this.businessLogger.log(logData, this.config.streams.commands);

    // 同时写入 Nest Logger
    if (error) {
      this.logger.error(`Command ${context.type} failed: ${message}`, error);
    } else {
      this.logger.log(`Command ${context.type} ${context.status}: ${message}`);
    }
  }

  /**
   * 记录查询日志
   */
  logQuery(context: CQRSLogContext, message?: string, error?: Error): void {
    const logData = {
      timestamp: new Date().toISOString(),
      level: error ? 'ERROR' : 'INFO',
      service: process.env.SERVICE_NAME || 'backend',
      source: process.env.SERVICE_SOURCE || 'apiserver',
      env: process.env.NODE_ENV || 'development',
      version: process.env.SERVICE_VERSION || '1.0.0',
      bus: 'query',
      type: context.type,
      cache_key: context.cacheKey,
      cache_hit: context.cacheHit,
      stale: context.cacheHit && context.durationMs > 0, // 简化判断
      duration_ms: context.durationMs,
      result_size: 0, // 需要从结果中计算
      handler: context.handler,
      error_code: error?.name,
      error_message: error?.message,
      traceId: context.traceId,
      spanId: context.spanId,
      requestId: context.requestId,
      tenant: context.tenant,
      userId: context.userId,
    };

    if (message) {
      logData.message = message;
    }

    // 写入 BusinessLogger
    this.businessLogger.log(logData, this.config.streams.queries);

    // 同时写入 Nest Logger
    if (error) {
      this.logger.error(`Query ${context.type} failed: ${message}`, error);
    } else {
      this.logger.debug(`Query ${context.type} success in ${context.durationMs}ms`);
    }
  }

  /**
   * 记录事件日志
   */
  logEvent(context: CQRSLogContext, message?: string, error?: Error): void {
    const logData = {
      timestamp: new Date().toISOString(),
      level: error ? 'ERROR' : 'INFO',
      service: process.env.SERVICE_NAME || 'backend',
      source: process.env.SERVICE_SOURCE || 'apiserver',
      env: process.env.NODE_ENV || 'development',
      version: process.env.SERVICE_VERSION || '1.0.0',
      bus: 'event',
      type: context.type,
      status: context.status,
      subscriber: context.subscriber,
      duration_ms: context.durationMs,
      dlq: context.dlq || false,
      error_code: error?.name,
      error_message: error?.message,
      traceId: context.traceId,
      spanId: context.spanId,
      requestId: context.requestId,
      tenant: context.tenant,
      userId: context.userId,
    };

    if (message) {
      logData.message = message;
    }

    // 写入 BusinessLogger
    this.businessLogger.log(logData, this.config.streams.events);

    // 同时写入 Nest Logger
    if (error) {
      this.logger.error(`Event ${context.type} failed: ${message}`, error);
    } else {
      this.logger.debug(`Event ${context.type} ${context.status}: ${message}`);
    }
  }
}
```

#### 2.3 指标收集服务

**文件**：`backend/src/cqrs/metrics/cqrs-metrics.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsOpenObserveConfig } from '../../config/cqrs-openobserve.config';
import { BusinessLoggerService } from '../../logging/business-logger.service';

export interface MetricData {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp?: Date;
}

@Injectable()
export class CqrsMetricsService {
  private readonly logger = new Logger(CqrsMetricsService.name);
  private readonly config: CqrsOpenObserveConfig;
  private readonly metricsBuffer: MetricData[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(
    private readonly businessLogger: BusinessLoggerService,
    private readonly configService: ConfigService,
  ) {
    this.config = this.configService.get<CqrsOpenObserveConfig>('cqrsOpenObserve');
    this.setupFlushTimer();
  }

  /**
   * 记录计数器指标
   */
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    this.addMetric({
      name,
      value,
      labels,
      timestamp: new Date(),
    });
  }

  /**
   * 记录直方图指标
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.addMetric({
      name,
      value,
      labels,
      timestamp: new Date(),
    });
  }

  /**
   * 记录命令指标
   */
  recordCommand(type: string, status: 'success' | 'error', durationMs: number, handler: string, retryCount: number = 0): void {
    this.incrementCounter('cqrs_command_total', 1, { type, status });
    this.recordHistogram('cqrs_command_duration_ms', durationMs, { type, handler });
    
    if (retryCount > 0) {
      this.incrementCounter('cqrs_command_retry_total', 1, { type });
      this.recordHistogram('cqrs_command_retry_count', retryCount, { type });
    }
  }

  /**
   * 记录查询指标
   */
  recordQuery(type: string, cacheHit: boolean, durationMs: number, handler: string): void {
    this.incrementCounter('cqrs_query_total', 1, { type, cache_hit: cacheHit.toString() });
    this.recordHistogram('cqrs_query_duration_ms', durationMs, { type, handler });
  }

  /**
   * 记录事件指标
   */
  recordEvent(type: string, status: 'published' | 'handled' | 'error', durationMs: number, subscriber?: string): void {
    this.incrementCounter('cqrs_event_published_total', 1, { type });
    
    if (status === 'handled') {
      this.incrementCounter('cqrs_event_handle_total', 1, { type, status, subscriber: subscriber || 'unknown' });
      this.recordHistogram('cqrs_event_handle_duration_ms', durationMs, { type, subscriber: subscriber || 'unknown' });
    } else if (status === 'error') {
      this.incrementCounter('cqrs_event_dlq_total', 1, { type });
    }
  }

  /**
   * 记录运行时指标
   */
  recordRuntimeMetric(kind: string, name: string, value: number, labels?: Record<string, string>): void {
    this.recordHistogram(`cqrs_${kind}_${name}`, value, labels || {});
  }

  /**
   * 添加指标到缓冲区
   */
  private addMetric(metric: MetricData): void {
    this.metricsBuffer.push(metric);
    
    // 如果缓冲区满了，立即刷新
    if (this.metricsBuffer.length >= this.config.performance.batchSize) {
      this.flushMetrics();
    }
  }

  /**
   * 设置定时刷新
   */
  private setupFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushMetrics();
    }, this.config.performance.flushInterval);
  }

  /**
   * 刷新指标到 OpenObserve
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer.length = 0;

    try {
      // 将指标转换为 OpenObserve 格式
      const logData = metrics.map(metric => ({
        timestamp: metric.timestamp?.toISOString() || new Date().toISOString(),
        level: 'INFO',
        service: process.env.SERVICE_NAME || 'backend',
        source: 'metrics',
        env: process.env.NODE_ENV || 'development',
        version: process.env.SERVICE_VERSION || '1.0.0',
        metric_name: metric.name,
        metric_value: metric.value,
        ...metric.labels,
      }));

      // 批量写入
      await this.businessLogger.batchLog(logData, this.config.streams.metrics);
      this.logger.debug(`Flushed ${metrics.length} metrics to OpenObserve`);
    } catch (error) {
      this.logger.error('Failed to flush metrics to OpenObserve', error);
      
      // 将指标放回缓冲区，以便下次重试
      this.metricsBuffer.unshift(...metrics);
    }
  }

  /**
   * 清理资源
   */
  onModuleDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // 刷新剩余指标
    this.flushMetrics();
  }
}
```

#### 2.4 分布式追踪服务

**文件**：`backend/src/cq
#### 2.4 分布式追踪服务

**文件**：`backend/src/cqrs/tracing/cqrs-tracing.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { trace, SpanKind, SpanStatusCode, Context } from '@opentelemetry/api';
import { ConfigService } from '@nestjs/config';
import { CqrsOpenObserveConfig } from '../../config/cqrs-openobserve.config';

@Injectable()
export class CqrsTracingService {
  private readonly logger = new Logger(CqrsTracingService.name);
  private readonly tracer = trace.getTracer('cqrs-service');
  private readonly config: CqrsOpenObserveConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<CqrsOpenObserveConfig>('cqrsOpenObserve');
  }

  /**
   * 创建命令 Span
   */
  startCommandSpan(commandType: string, commandId: string, handler?: string): any {
    if (!this.config.tracing.enabled) {
      return null;
    }

    const span = this.tracer.startSpan(`command.${commandType}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'service.name': process.env.SERVICE_NAME || 'backend',
        'service.version': process.env.SERVICE_VERSION || '1.0.0',
        'command.id': commandId,
        'command.type': commandType,
        'command.handler': handler || 'unknown',
      },
    });

    return span;
  }

  /**
   * 创建查询 Span
   */
  startQuerySpan(queryType: string, cacheKey?: string, handler?: string): any {
    if (!this.config.tracing.enabled) {
      return null;
    }

    const span = this.tracer.startSpan(`query.${queryType}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'service.name': process.env.SERVICE_NAME || 'backend',
        'service.version': process.env.SERVICE_VERSION || '1.0.0',
        'query.type': queryType,
        'query.cache_key': cacheKey || 'unknown',
        'query.handler': handler || 'unknown',
      },
    });

    return span;
  }

  /**
   * 创建事件 Span
   */
  startEventSpan(eventType: string, eventId: string, subscriber?: string): any {
    if (!this.config.tracing.enabled) {
      return null;
    }

    const span = this.tracer.startSpan(`event.${eventType}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'service.name': process.env.SERVICE_NAME || 'backend',
        'service.version': process.env.SERVICE_VERSION || '1.0.0',
        'event.id': eventId,
        'event.type': eventType,
        'event.subscriber': subscriber || 'unknown',
      },
    });

    return span;
  }

  /**
   * 完成 Span
   */
  finishSpan(span: any, success: boolean, error?: Error, additionalAttributes?: Record<string, any>): void {
    if (!span) {
      return;
    }

    // 添加额外属性
    if (additionalAttributes) {
      span.setAttributes(additionalAttributes);
    }

    // 设置状态
    if (success) {
      span.setStatus({ code: SpanStatusCode.OK });
    } else {
      if (error) {
        span.recordException(error);
      }
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error?.message || 'Unknown error' 
      });
    }

    span.end();
  }

  /**
   * 获取当前上下文信息
   */
  getCurrentContext(): { traceId?: string; spanId?: string } {
    const activeSpan = trace.getActiveSpan();
    if (!activeSpan) {
      return {};
    }

    const spanContext = trace.getSpanContext(activeSpan);
    if (!spanContext) {
      return {};
    }

    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  }
}
```

#### 2.5 更新总线实现以集成可观测性

**文件**：`backend/src/cqrs/bus/command.bus.ts` (更新部分)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ICommand, ICommandResult } from '../commands/command.base';
import {
  ICommandHandler,
  ICommandHandlerFactory,
  ICommandMiddleware,
  ICommandPipeline,
  CommandExecutionStatus,
  CommandExecutionStatusInfo,
} from '../interfaces/command-handler.interface';
import { CqrsLoggingService } from '../logging/cqrs-logging.service';
import { CqrsMetricsService } from '../metrics/cqrs-metrics.service';
import { CqrsTracingService } from '../tracing/cqrs-tracing.service';

@Injectable()
export class CommandBus implements ICommandBus, ICommandPipeline {
  private readonly logger = new Logger(CommandBus.name);
  private readonly handlers = new Map<string, ICommandHandler>();
  private readonly middlewares: ICommandMiddleware[] = [];
  private readonly executionStatus = new Map<string, CommandExecutionStatusInfo>();

  constructor(
    private readonly cqrsLoggingService: CqrsLoggingService,
    private readonly cqrsMetricsService: CqrsMetricsService,
    private readonly cqrsTracingService: CqrsTracingService,
  ) {}

  async execute<TCommand extends ICommand>(command: TCommand): Promise<ICommandResult> {
    const commandName = command.constructor.name;
    const commandId = command.id;
    const handlerName = this.getHandlerName(commandName);
    
    // 获取追踪上下文
    const span = this.cqrsTracingService.startCommandSpan(commandName, commandId, handlerName);
    const { traceId, spanId } = this.cqrsTracingService.getCurrentContext();
    
    // 记录开始日志
    this.cqrsLoggingService.logCommand({
      type: commandName,
      id: commandId,
      status: 'start',
      handler: handlerName,
      traceId,
      spanId,
    });

    const startTime = Date.now();
    let retryCount = 0;

    try {
      // 获取命令处理器
      const handler = this.handlers.get(commandName);
      if (!handler) {
        const error = `No handler registered for command: ${commandName}`;
        
        // 记录错误日志
        this.cqrsLoggingService.logCommand({
          type: commandName,
          id: commandId,
          status: 'error',
          handler: handlerName,
          traceId,
          spanId,
          errorCode: 'HANDLER_NOT_FOUND',
          durationMs: Date.now() - startTime,
        }, error);

        // 记录指标
        this.cqrsMetricsService.recordCommand(commandName, 'error', Date.now() - startTime, handlerName, retryCount);
        
        // 完成追踪
        this.cqrsTracingService.finishSpan(span, false, new Error(error), {
          'command.error_code': 'HANDLER_NOT_FOUND',
          'command.duration_ms': Date.now() - startTime,
        });

        return {
          success: false,
          error,
          errorCode: 'HANDLER_NOT_FOUND',
        };
      }

      // 执行中间件管道
      const result = await this.executePipeline(command, handler, {
        traceId,
        spanId,
        commandName,
        commandId,
        handlerName,
        startTime,
        retryCount,
      });
      
      const durationMs = Date.now() - startTime;

      // 记录成功日志
      this.cqrsLoggingService.logCommand({
        type: commandName,
        id: commandId,
        status: 'success',
        handler: handlerName,
        traceId,
        spanId,
        durationMs,
      });

      // 记录指标
      this.cqrsMetricsService.recordCommand(commandName, 'success', durationMs, handlerName, retryCount);
      
      // 完成追踪
      this.cqrsTracingService.finishSpan(span, true, undefined, {
        'command.success': result.success,
        'command.duration_ms': durationMs,
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      // 记录错误日志
      this.cqrsLoggingService.logCommand({
        type: commandName,
        id: commandId,
        status: 'error',
        handler: handlerName,
        traceId,
        spanId,
        durationMs,
        errorCode: error.name,
      }, error as Error);

      // 记录指标
      this.cqrsMetricsService.recordCommand(commandName, 'error', durationMs, handlerName, retryCount);
      
      // 完成追踪
      this.cqrsTracingService.finishSpan(span, false, error as Error, {
        'command.error_code': error.name,
        'command.duration_ms': durationMs,
      });

      this.logger.error(`Error executing command ${commandName}:`, error);
      
      return {
        success: false,
        error: (error as Error).message,
        errorCode: 'EXECUTION_ERROR',
      };
    }
  }

  // 更新执行管道方法，传递日志上下文
  async executePipeline<TCommand extends ICommand>(
    command: TCommand,
    handler: ICommandHandler<TCommand>,
    context: any = {},
  ): Promise<ICommandResult> {
    let index = 0;
    const { traceId, spanId, commandName, commandId, handlerName, startTime, retryCount } = context;

    const executeNext = async (): Promise<ICommandResult> => {
      if (index >= this.middlewares.length) {
        // 所有中间件执行完毕，执行处理器
        const commandId = command.id;
        const status = this.executionStatus.get(commandId);
        if (status) {
          status.status = CommandExecutionStatus.RUNNING;
        }

        return await handler.handle(command);
      }

      const middleware = this.middlewares[index++];
      this.logger.debug(`Executing middleware: ${middleware.name}`);

      return await middleware.execute(command, executeNext, {
        traceId,
        spanId,
        commandName,
        commandId,
        handlerName,
      });
    };

    return await executeNext();
  }

  private getHandlerName(commandType: string): string {
    const handler = this.handlers.get(commandType);
    return handler?.getName() || 'unknown';
  }

  // ... 其余现有方法保持不变
}
```

**文件**：`backend/src/cqrs/bus/query.bus.ts` (更新部分)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { IQuery, IQueryResult } from '../queries/query.base';
import {
  IQueryHandler,
  IQueryHandlerFactory,
  IQueryMiddleware,
  IQueryPipeline,
  IQueryCache,
  QueryCacheStats,
} from '../interfaces/query-handler.interface';
import { CqrsLoggingService } from '../logging/cqrs-logging.service';
import { CqrsMetricsService } from '../metrics/cqrs-metrics.service';
import { CqrsTracingService } from '../tracing/cqrs-tracing.service';

@Injectable()
export class QueryBus implements IQueryBus, IQueryPipeline {
  private readonly logger = new Logger(QueryBus.name);
  private readonly handlers = new Map<string, IQueryHandler>();
  private readonly middlewares: IQueryMiddleware[] = [];
  private queryCache: IQueryCache | null = null;
  private cacheStats = {
    hits: 0,
    misses: 0,
  };

  constructor(
    private readonly cqrsLoggingService: CqrsLoggingService,
    private readonly cqrsMetricsService: CqrsMetricsService,
    private readonly cqrsTracingService: CqrsTracingService,
  ) {}

  async execute<TQuery extends IQuery, TResult = any>(
    query: TQuery,
  ): Promise<IQueryResult<TResult>> {
    const queryName = query.constructor.name;
    const queryId = query.id;
    const cacheKey = query.cacheKey || this.generateCacheKey(query);
    const handlerName = this.getHandlerName(queryName);
    
    // 获取追踪上下文
    const span = this.cqrsTracingService.startQuerySpan(queryName, cacheKey, handlerName);
    const { traceId, spanId } = this.cqrsTracingService.getCurrentContext();

    // 记录开始日志
    this.cqrsLoggingService.logQuery({
      type: queryName,
      cacheKey,
      traceId,
      spanId,
      handler: handlerName,
    });

    const startTime = Date.now();
    let fromCache = false;

    try {
      // 获取查询处理器
      const handler = this.handlers.get(queryName);
      if (!handler) {
        const error = `No handler registered for query: ${queryName}`;
        
        // 记录错误日志
        this.cqrsLoggingService.logQuery({
          type: queryName,
          cacheKey,
          traceId,
          spanId,
          handler: handlerName,
          durationMs: Date.now() - startTime,
          errorCode: 'HANDLER_NOT_FOUND',
        }, new Error(error));

        // 记录指标
        this.cqrsMetricsService.recordQuery(queryName, false, Date.now() - startTime, handlerName);
        
        // 完成追踪
        this.cqrsTracingService.finishSpan(span, false, new Error(error), {
          'query.error_code': 'HANDLER_NOT_FOUND',
          'query.duration_ms': Date.now() - startTime,
        });

        return {
          success: false,
          error,
          errorCode: 'HANDLER_NOT_FOUND',
        };
      }

      // 执行中间件管道
      const result = await this.executePipeline(query, handler, {
        traceId,
        spanId,
        queryName,
        cacheKey,
        handlerName,
        startTime,
      });
      
      const durationMs = Date.now() - startTime;
      fromCache = result.fromCache || false;

      // 记录成功日志
      this.cqrsLoggingService.logQuery({
        type: queryName,
        cacheKey,
        cacheHit: fromCache,
        traceId,
        spanId,
        handler: handlerName,
        durationMs,
      });

      // 记录指标
      this.cqrsMetricsService.recordQuery(queryName, fromCache, durationMs, handlerName);
      
      // 完成追踪
      this.cqrsTracingService.finishSpan(span, true, undefined, {
        'query.success': result.success,
        'query.duration_ms': durationMs,
        'query.from_cache': fromCache,
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      // 记录错误日志
      this.cqrsLoggingService.logQuery({
        type: queryName,
        cacheKey,
        cacheHit: fromCache,
        traceId,
        spanId,
        handler: handlerName,
        durationMs,
        errorCode: (error as Error).name,
      }, error as Error);

      // 记录指标
      this.cqrsMetricsService.recordQuery(queryName, fromCache, durationMs, handlerName);
      
      // 完成追踪
      this.cqrsTracingService.finishSpan(span, false, error as Error, {
        'query.error_code': (error as Error).name,
        'query.duration_ms': durationMs,
      });

      this.logger.error(`Error executing query ${queryName}:`, error);
      
      return {
        success: false,
        error: (error as Error).message,
        errorCode: 'EXECUTION_ERROR',
      };
    }
  }

  // 更新执行管道方法，传递日志上下文
  async executePipeline<TQuery extends IQuery, TResult = any>(
    query: TQuery,
    handler: IQueryHandler<TQuery, TResult>,
    context: any = {},
  ): Promise<IQueryResult<TResult>> {
    let index = 0;
    const { traceId, spanId, queryName, cacheKey, handlerName, startTime } = context;

    const executeNext = async (): Promise<IQueryResult<TResult>> => {
      if (index >= this.middlewares.length) {
        // 所有中间件执行完毕，执行处理器
        return await handler.handle(query);
      }

      const middleware = this.middlewares[index++];
      this.logger.debug(`Executing middleware: ${middleware.name}`);

      return await middleware.execute(query, executeNext, {
        traceId,
        spanId,
        queryName,
        cacheKey,
        handlerName,
      });
    };

    return await executeNext();
  }

  private getHandlerName(queryType: string): string {
    const handler = this.handlers.get(queryType);
    return handler?.getName() || 'unknown';
  }

  // ... 其余现有方法保持不变
}
```

### 阶段三：性能优化（第5-6周）

#### 3.1 实现 SWR 和并发去重

**文件**：`backend/src/cqrs/cache/swr.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { IQueryCache } from '../interfaces/query-handler.interface';

export interface SWROptions {
  ttl?: number;
  staleWhileRevalidate?: boolean;
  staleTime?: number;
}

export interface CacheEntry<T> {
  data: T;
  expiresAt: Date;
  staleAt?: Date;
}

export interface PendingQuery<T> {
  promise: Promise<T>;
  createdAt: Date;
}

@Injectable()
export class SWRService {
  private readonly logger = new Logger(SWRService.name);
  private readonly pendingQueries = new Map<string, PendingQuery<any>>();

  constructor(private readonly queryCache: IQueryCache) {}

  /**
   * 获取支持 SWR 的数据
   */
  async getWithSWR<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: SWROptions = {},
  ): Promise<{ data: T; fromCache: boolean; isStale: boolean }> {
    const { ttl = 300, staleWhileRevalidate = true, staleTime = 60 } = options;
    const now = new Date();

    try {
      // 检查并发查询
      const existingPending = this.pendingQueries.get(key);
      if (existingPending) {
        this.logger.debug(`Duplicating query for key: ${key}`);
        const data = await existingPending.promise;
        return { data, fromCache: true, isStale: false };
      }

      // 尝试从缓存获取
      const cached = await this.queryCache.get<CacheEntry<T>>(key);
      if (cached) {
        const isExpired = cached.expiresAt <= now;
        const isStale = cached.staleAt ? cached.staleAt <= now : isExpired;

        if (!isExpired) {
          // 缓存未过期，直接返回
          return { data: cached.data, fromCache: true, isStale: false };
        }

        // 缓存过期但数据仍然可用
        if (staleWhileRevalidate && !isStale) {
          // 后台刷新
          this.backgroundRefresh(key, fetcher, { ttl, staleTime });
          return { data: cached.data, fromCache: true, isStale: true };
        }
      }

      // 执行查询
      const pendingQuery = this.createPendingQuery(fetcher);
      this.pendingQueries.set(key, pendingQuery);

      try {
        const data = await pendingQuery.promise;
        
        // 保存到缓存
        const expiresAt = new Date(now.getTime() + ttl * 1000);
        const staleAt = staleTime ? new Date(now.getTime() + staleTime * 1000) : expiresAt;
        
        await this.queryCache.set(key, { data, expiresAt, staleAt });
        
        return { data, fromCache: false, isStale: false };
      } finally {
        // 清理待处理查询
        this.pendingQueries.delete(key);
      }
    } catch (error) {
      // 发生错误时尝试返回过期缓存
      const cached = await this.queryCache.get<CacheEntry<T>>(key);
      if (cached) {
        this.logger.warn(`Returning stale cache due to error for key: ${key}`, error);
        return { data: cached.data, fromCache: true, isStale: true };
      }
      
      throw error;
    }
  }

  /**
   * 后台刷新
   */
  private async backgroundRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { ttl: number; staleTime?: number },
  ): Promise<void> {
    try {
      this.logger.debug(`Background refresh for key: ${key}`);
      
      const data = await fetcher();
      const now = new Date();
      const { ttl, staleTime } = options;
      
      const expiresAt = new Date(now.getTime() + ttl * 1000);
      const staleAt = staleTime ? new Date(now.getTime() + staleTime * 1000) : expiresAt;
      
      await this.queryCache.set(key, { data, expiresAt, staleAt });
      
      this.logger.debug(`Background refresh completed for key: ${key}`);
    } catch (error) {
      this.logger.error(`Background refresh failed for key: ${key}`, error);
    }
  }

  /**
   * 创建待处理查询
   */
  private createPendingQuery<T>(fetcher: () => Promise<T>): PendingQuery<T> {
    const promise = fetcher();
    return {
      promise,
      createdAt: new Date(),
    };
  }

  /**
   * 失效缓存
   */
  async invalidate(key: string): Promise<void> {
    await this.queryCache.delete(key);
    this.logger.debug(`Invalidated cache for key: ${key}`);
  }

  /**
   * 批量失效缓存
   */
  async invalidatePattern(pattern: string): Promise<void> {
    await this.queryCache.clearPattern(pattern);
    this.logger.debug(`Invalidated cache pattern: ${pattern}`);
  }

  /**
   * 清理过期的待处理查询（防止内存泄漏）
   */
  cleanupPendingQueries(maxAge: number = 60000): void {
    const now = new Date();
    
    for (const [key, pending] of this.pendingQueries.entries()) {
      if (now.getTime() - pending.createdAt.getTime() > maxAge) {
        this.pendingQueries.delete(key);
        this.logger.debug(`Cleaned up pending query for key: ${key}`);
      }
    }
  }
}
```

#### 3.2 更新查询总线以集成 SWR

**文件**：`backend/src/cqrs/bus/query.bus.ts` (更新部分)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { IQuery, IQueryResult } from '../queries/query.base';
import {
  IQueryHandler,
  IQueryHandlerFactory,
  IQueryMiddleware,
  IQueryPipeline,
  IQueryCache,
  QueryCacheStats,
} from '../interfaces/query-handler.interface';
import { CqrsLoggingService } from '../logging/cqrs-logging.service';
import { CqrsMetricsService } from '../metrics/cqrs-metrics.service';
import { CqrsTracingService } from '../tracing/cqrs-tracing.service';
import { SWRService } from '../cache/swr.service';

@Injectable()
export class QueryBus implements IQueryBus, IQueryPipeline {
  private readonly logger = new Logger(QueryBus.name);
  private readonly handlers = new Map<string, IQueryHandler>();
  private readonly middlewares: IQueryMiddleware[] = [];
  private queryCache: IQueryCache | null = null;
  private swrService: SWRService | null = null;

  constructor(
    private readonly cqrsLoggingService: CqrsLoggingService,
    private readonly cqrsMetricsService: CqrsMetricsService,
    private readonly cqrsTracingService: CqrsTracingService,
    @Inject('IQueryCache') queryCache?: IQueryCache,
  ) {
    this.queryCache = queryCache || null;
    
    // 如果有缓存，创建 SWR 服务
    if (this.queryCache) {
      this.swrService = new SWRService(this.queryCache);
    }
  }

  async execute<TQuery extends IQuery, TResult = any>(
    query: TQuery,
  ): Promise<IQueryResult<TResult>> {
    const queryName = query.constructor.name;
    const handler = this.handlers.get(queryName);
    
    if (!handler) {
      return {
        success: false,
        error: `No handler registered for query: ${queryName}`,
        errorCode: 'HANDLER_NOT_FOUND',
      };
    }

    // 如果没有 SWR 服务，使用原始执行方式
    if (!this.swrService) {
      return this.executeWithoutSWR(query, handler);
    }

    // 使用 SWR 执行查询
    return this.executeWithSWR(query, handler);
  }

  /**
   * 使用 SWR 执行查询
   */
  private async executeWithSWR<TQuery extends IQuery, TResult = any>(
    query: TQuery,
    handler: IQueryHandler<TQuery, TResult>,
  ): Promise<IQueryResult<TResult>> {
    const queryName = query.constructor.name;
    const cacheKey = this.generateCacheKey(query);
    const handlerName = this.getHandlerName(queryName);
    
    // 获取追踪上下文
    const span = this.cqrsTracingService.startQuerySpan(queryName, cacheKey, handlerName);
    const { traceId, spanId } = this.cqrsTracingService.getCurrentContext();

    // 记录开始日志
    this.cqrsLoggingService.logQuery({
      type: queryName,
      cacheKey,
      traceId,
      spanId,
      handler: handlerName,
    });

    const startTime = Date.now();

    try {
      // 使用 SWR 获取数据
      const result = await this.swrService.getWithSWR(
        cacheKey,
        () => handler.handle(query),
        {
          ttl: query.cacheTime || 300,
          staleWhileRevalidate: true,
          staleTime: query.staleTime || 60,
        },
      );
      
      const durationMs = Date.now() - startTime;

      // 记录成功日志
      this.cqrsLoggingService.logQuery({
        type: queryName,
        cacheKey,
        cacheHit: result.fromCache,
        traceId,
        spanId,
        handler: handlerName,
        durationMs,
      });

      // 记录指标
      this.cqrsMetricsService.recordQuery(queryName, result.fromCache, durationMs, handlerName);
      
      // 完成追踪
      this.cqrsTracingService.finishSpan(span, true, undefined, {
        'query.success': true,
        'query.duration_ms': durationMs,
        'query.from_cache': result.fromCache,
        'query.is_stale': result.isStale,
      });

      return {
        success: true,
        data: result.data,
        fromCache: result.fromCache,
        isStale: result.isStale,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;

      // 记录错误日志
      this.cqrsLoggingService.logQuery({
        type: queryName,
        cacheKey,
        cacheHit: false,
        traceId,
        spanId,
        handler: handlerName,
        durationMs,
        errorCode: (error as Error).name,
      }, error as Error);

      // 记录指标
      this.cqrsMetricsService.recordQuery(queryName, false, durationMs, handlerName);
      
      // 完成追踪
      this.cqrsTracingService.finishSpan(span, false, error as Error, {
        'query.error_code': (error as Error).name,
        'query.duration_ms': durationMs,
      });

      return {
        success: false,
        error: (error as Error).message,
        errorCode: 'EXECUTION_ERROR',
      };
    }
  }

  /**
   * 不使用 SWR 执行查询
   */
  private async executeWithoutSWR<TQuery extends IQuery, TResult = any>(
    query: TQuery,
    handler: IQueryHandler<TQuery, TResult>,
  ): Promise<IQueryResult<TResult>> {
    // 原始实现，与之前相同
    const queryName = query.constructor.name;
    const queryId = query.id;
    const cacheKey = query.cacheKey || this.generateCacheKey(query);
    const handlerName = this.getHandlerName(queryName);
    
    // 获取追踪上下文
    const span = this.cqrsTracingService.startQuerySpan(queryName, cacheKey, handlerName);
    const { traceId, spanId } = this.cqrsTracingService.getCurrentContext();

    // 记录开始日志
    this.cqrsLoggingService.logQuery({
      type: queryName,
      cacheKey,
      traceId,
      spanId,
      handler: handlerName,
    });

    const startTime = Date.now();

    try {
      // 执行中间件管道
      const result = await this.executePipeline(query, handler, {
        traceId,
        spanId,
        queryName,
        cacheKey,
        handlerName,
        startTime,
      });
      
      const durationMs = Date.now() - startTime;

      // 记录成功日志
      this.cqrsLoggingService.logQuery({
        type: queryName,
        cacheKey,
        cacheHit: result.fromCache || false,
        traceId,
        spanId,
        handler: handlerName,
        durationMs,
      });

      // 记录指标
      this.cqrsMetricsService.recordQuery(queryName, result.fromCache || false, durationMs, handlerName);
      
      // 完成追踪
      this.cqrsTracingService.finishSpan(span, true, undefined, {
        'query.success': result.success,
        'query.duration_ms': durationMs,
        'query.from_cache': result.fromCache || false,
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      // 记录错误日志
      this.cqrsLoggingService.logQuery({
        type: queryName,
        cacheKey,
        cacheHit: false,
        traceId,
        spanId,
        handler: handlerName,
        durationMs,
        errorCode: (error as Error).name,
      }, error as Error);

      // 记录指标
      this.cqrsMetricsService.recordQuery(queryName, false, durationMs, handlerName);
      
      // 完成追踪
      this.cqrsTracingService.finishSpan(span, false, error as Error, {
        'query.error_code': (error as Error).name,
        'query.duration_ms': durationMs,
      });

      return {
        success: false,
        error: (error as Error).message,
        errorCode: 'EXECUTION_ERROR',
      };
    }
  }

  /**
   * 预加载查询
   */
  async prefetch<TQuery extends IQuery, TResult = any>(query: TQuery): Promise<void> {
    if (!this.swrService) {
      return;
    }

    const queryName = query.constructor.name;
    const handler = this.handlers.get(queryName);
    
    if (!handler) {
      this.logger.warn(`Cannot prefetch query: no handler for ${queryName}`);
      return;
    }

    const cacheKey = this.generateCacheKey(query);
    
    try {
      await this.swrService.getWithSWR(
        cacheKey,
        () => handler.handle(query),
        {
          ttl: query.cacheTime || 300,
          staleWhileRevalidate: true,
          staleTime: query.staleTime || 60,
        },
      );
      
      this.logger.debug(`Prefetched query: ${queryName}`);
    } catch (error) {
      this.logger.error(`Failed to prefetch query: ${queryName}`, error);
    }
  }

  /**
   * 使缓存失效
   */
  async invalidateCache(queryType: string, cacheKey?: string): Promise<void> {
    if (!this.swrService) {
      return;
    }

    if (cacheKey) {
      // 使特定缓存键失效
      await this.swrService.invalidate(cacheKey);
      this.logger.debug(`Invalidated cache key: ${cacheKey}`);
    } else {
      // 使查询类型的所有缓存失效
      const pattern = `${queryType}_*`;
      await this.swrService.invalidatePattern(pattern);
      this.logger.debug(`Invalidated cache pattern: ${pattern}`);
    }
  }

  // ... 其余现有方法保持不变
}
```

### 阶段四：监控与告警（第7-8周）

#### 4.1 OpenObserve 初始化脚本

**文件**：`scripts/openobserve/init-cqrs-streams.ts`

```typescript
#!/usr/bin/env ts-node

import fetch from 'node-fetch';
import { 
  OPENOBSERVE_URL, 
  OPENOBSERVE_ORGANIZATION, 
  OPENOBSERVE_TOKEN 
} from './env-adapter';

/**
 * 创建 CQRS 相关的 OpenObserve 流
 */
async function createStream(name: string, type: 'logs' | 'metrics' | 'traces'): Promise<void> {
  const url = `${OPENOBSERVE_URL}/api/${OPENOBSERVE_ORGANIZATION}`;
  
  const response = await fetch(`${url}/streams`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${OPENOBSERVE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      name, 
      stream_type: type,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    
    // 如果是流已存在，忽略错误
    if (response.status === 409 && errorText.includes('already exists')) {
      console.log(`✓ Stream ${name} (${type}) already exists`);
      return;
    }
    
    throw new Error(`Failed to create stream ${name} (${type}): ${response.status} ${errorText}`);
  }
  
  console.log(`✓ Created stream ${name} (${type})`);
}

/**
 * 初始化 CQRS 流
 */
async function initCQRSStreams(): Promise<void> {
  if (!OPENOBSERVE_URL || !OPENOBSERVE_ORGANIZATION || !OPENOBSERVE_TOKEN) {
    throw new Error('Missing required environment variables: OPENOBSERVE_URL, OPENOBSERVE_ORGANIZATION, OPENOBSERVE_TOKEN');
  }

  console.log('Initializing CQRS streams...');
  
  const streams = [
    { name: 'cqrs-commands', type: 'logs' },
    { name: 'cqrs-queries', type: 'logs' },
    { name: 'cqrs-events', type: 'logs' },
    { name: 'cqrs-metrics', type: 'metrics' },
    { name: 'traces', type: 'traces' },
  ] as const;

  for (const { name, type } of streams) {
    try {
      await createStream(name, type);
    } catch (error) {
      console.error(`Failed to initialize stream ${name}:`, error);
      process.exit(1);
    }
  }

  console.log('✓ CQRS streams initialized successfully');
}

/**
 * 创建告警规则
 */
async function createAlertRules(): Promise<void> {
  const url = `${OPENOBSERVE_URL}/api/${OPENOBSERVE_ORGANIZATION}/alerts`;
  
  const alerts = [
    {
      name: 'CQRS Command Error Rate',
      condition: 'avg_over_time(rate(cqrs_command_total{status="error"}[5m])) > 0.01',
      severity: 'critical',
      message: 'CQRS command error rate is above 1%',
      duration: '5m',
    },
    {
      name: 'CQRS Command P95 Latency',
      condition: 'histogram_quantile(0.95, rate(cqrs_command_duration_ms_bucket[10m])) > 500',
      severity: 'high',
      message: 'CQRS command P95 latency is above 500ms',
      duration: '10m',
    },
    {
      name: 'CQRS Query P95 Latency',
      condition: 'histogram_quantile(0.95, rate(cqrs_query_duration_ms_bucket[10m])) > 300',
      severity: 'high',
      message: 'CQRS query P95 latency is above 300ms',
      duration: '10m',
    },
    {
      name: 'CQRS Query Cache Hit Rate',
      condition: 'sum(rate(cqrs_query_total{cache_hit="true"}[15m])) / sum(rate(cqrs_query_total[15m])) < 0.5',
      severity: 'medium',
      message: 'CQRS query cache hit rate is below 50%',
      duration: '15m',
    },
    {
      name: 'CQRS Event DLQ',
      condition: 'increase(cqrs_event_dlq_total[1m]) > 0',
      severity: 'critical',
      message: 'CQRS events in dead letter queue',
      duration: '1m',
    },
  ];

  for (const alert of alerts) {
    try {
      const response = await fetch(`${url}/rules`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${OPENOBSERVE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // 如果是规则已存在，忽略错误
        if (response.status === 409 && errorText.includes('already exists')) {
          console.log(`✓ Alert rule ${alert.name} already exists`);
          continue;
        }
        
        throw new Error(`Failed to create alert rule ${alert.name}: ${response.status} ${errorText}`);
      }
      
      console.log(`✓ Created alert rule: ${alert.name}`);
    } catch (error) {
      console.error(`Failed to create alert rule ${alert.name}:`, error);
      // 不退出进程，继续创建其他规则
    }
  }

  console.log('✓ Alert rules created successfully');
}

/**
 * 创建仪表板
 */
async function createDashboards(): Promise<void> {
  const url = `${OPENOBSERVE_URL}/api/${OPENOBSERVE_ORGANIZATION}/dashboards`;
  
  // 命令仪表板
  const commandDashboard = {
    title: 'CQRS Commands Dashboard',
    description: 'Monitoring dashboard for CQRS command processing',
    panels: [
      {
        title: 'Command Execution Trend',
        type: 'time-series',
        query: 'sum(rate(cqrs_command_total[5m])) by (type)',
        unit: 'reqps',
      },
      {
        title: 'Command Success Rate',
        type: 'stat',
        query: 'sum(rate(cqrs_command_total{status="success"}[5m])) / sum(rate(cqrs_command_total[5m]))',
        unit: 'percent',
      },
      {
        title: 'Command P95 Latency',
        type: 'time-series',
        query: 'histogram_quantile(0.95, rate(cqrs_command_duration_ms_bucket[10m])) by (type)',
        unit: 'ms',
      },
      {
        title: 'Command Error Rate',
        type: 'time-series',
        query: 'sum(rate(cqrs_command_total{status="error"}[5m])) / sum(rate(cqrs_command_total[5m]))',
        unit: 'percent',
      },
    ],
  };

  // 查询仪表板
  const queryDashboard = {
    title: 'CQRS Queries Dashboard',
    description: 'Monitoring dashboard for CQRS query processing',
    panels: [
      {
        title: 'Query Execution Trend',
        type: 'time-series',
        query: 'sum(rate(cqrs_query_total[5m])) by (type)',
        unit: 'reqps',
      },
      {
        title: 'Query Cache Hit Rate',
        type: 'time-series',
        query: 'sum(rate(cqrs_query_total{cache_hit="true"}[5m])) / sum(rate(cqrs_query_total[5m]))',
        unit: 'percent',
      },
      {
        title: 'Query P95 Latency',
        type: 'time-series',
        query: 'histogram_quantile(0.95, rate(cqrs_query_duration_ms_bucket[10m])) by (type)',
        unit: 'ms',
      },
    ],
  };

  // 事件仪表板
  const eventDashboard = {
    title: 'CQRS Events Dashboard',
    description: 'Monitoring dashboard for CQRS event processing',
    panels: [
      {
        title: 'Event Published Trend',
        type: 'time-series',
        query: 'sum(rate(cqrs_event_published_total[5m])) by (type)',
        unit: 'eps',
      },
      {
        title: 'Event Processing Time',
        type: 'time-series',
        query: 'histogram_quantile(0.95, rate(cqrs_event_handle_duration_ms_bucket[10m])) by (type)',
        unit: 'ms',
      },
      {
        title: 'Event DLQ Count',
        type: 'stat',
        query: 'sum(rate(cqrs_event_dlq_total[5m]))',
        unit: 'eps',
      },
    ],
  };

  for (const dashboard of [commandDashboard, queryDashboard, eventDashboard]) {
    try {
      const response = await fetch(`${url}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${OPENOBSERVE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dashboard),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create dashboard ${dashboard.title}: ${response.status} ${errorText}`);
      }
      
      console.log(`✓ Created dashboard: ${dashboard.title}`);
    } catch (error) {
      console.error(`Failed to create dashboard ${dashboard.title}:`, error);
      // 不退出进程，继续创建其他仪表板
    }
  }

  console.log('✓ Dashboards created successfully');
}

// 主函数
async function main(): Promise<void> {
  try {
    await initCQRSStreams();
    await createAlertRules();
    await createDashboards();
    console.log('✓ CQRS OpenObserve setup completed successfully');
  } catch (error) {
    console.error('✗ Failed to setup CQRS OpenObserve:', error);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}
```

#### 4.2 测试脚本

**文件**：`scripts/openobserve/test-cqrs-integration.ts`

```typescript
#!/usr/bin/env ts-node

import { performance } from 'perf_hooks';
import fetch from 'node-fetch';
import { 
  OPENOBSERVE_URL, 
  OPENOBSERVE_ORGANIZATION, 
  OPENOBSERVE_TOKEN 
} from './env-adapter';

interface TestData {
  timestamp: string;
  level: string;
  service: string;
  source: string;
  bus: string;
  type: string;
  status: string;
  duration_ms: number;
  traceId: string;
  spanId: string;
}

/**
 * 发送测试数据
 */
async function sendTestData(stream: string, data: any[]): Promise<void> {
  const url = `${OPENOBSERVE_URL}/api/${OPENOBSERVE_ORGANIZATION}/${stream}/_json`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${OPENOBSERVE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send test data to ${stream}: ${response.status} ${errorText}`);
  }
  
  console.log(`✓ Sent test data to ${stream}`);
}

/**
 * 测试日志采集
 */
async function testLogIngestion(): Promise<void> {
  console.log('Testing log ingestion...');
  
  const now = new Date();
  const testCommands: TestData[] = [];
  const testQueries: TestData[] = [];
  const testEvents: TestData[] = [];
  
  // 生成测试数据
  for (let i = 0; i < 50; i++) {
    const baseData = {
      timestamp: new Date(now.getTime() + i * 1000).toISOString(),
      level: i % 10 === 0 ? 'ERROR' : 'INFO',
      service: 'backend',
      source: 'apiserver',
      env: 'test',
      version: '1.0.0',
      traceId: `trace-${i}`,
      spanId: `span-${i}`,
    };
    
    // 命令测试数据
    testCommands.push({
      ...baseData,
      bus: 'command',
      type: `CreateOrder${i % 5}`,
      id: `cmd-${i}`,
      status: i % 10 === 0 ? 'error' : 'success',
      duration_ms: 100 + Math.random() * 400, // 100-500ms
      handler: `CreateOrderHandler`,
    });
    
    // 查询测试数据
    testQueries.push({
      ...baseData,
      bus: 'query',
      type: `GetOrder${i % 3}`,
      cacheKey: `order-${i}`,
      cacheHit: i % 3 === 0,
      stale: false,
      duration_ms: 50 + Math.random() * 250, // 50-300ms
      handler: `GetOrderHandler`,
    });
    
    // 事件测试数据
    testEvents.push({
      ...baseData,
      bus: 'event',
      type: `OrderCreated${i % 2}`,
      status: 'published',
      subscriber: `OrderEventHandler`,
      duration_ms: 30 + Math.random() * 120, // 30-150ms
    });
  }
  
  // 发送测试数据
  await sendTestData('cqrs-commands', testCommands);
  await sendTestData('cqrs-queries', testQueries);
  await sendTestData('cqrs-events', testEvents);
  
  console.log('✓ Log ingestion test completed');
}

/**
 * 测试指标采集
 */
async function testMetricIngestion(): Promise<void> {
  console.log('Testing metric ingestion...');
  
  const now = new Date();
  const testMetrics: any[] = [];
  
  // 生成测试指标数据
  for (let i = 0; i < 100; i++) {
    testMetrics.push({
      timestamp: new Date(now.getTime() + i * 1000).toISOString(),
      level: 'INFO',
      service: 'backend',
      source: 'metrics',
      env: 'test',
      version: '1.0.0',
      metric_name: i % 20 === 0 ? 'cqrs_command_duration_ms' : 
                    i % 20 === 1 ? 'cqrs_query_duration_ms' : 
                    i % 20 === 2 ? 'cqrs_command_total' : 
                    i % 20 === 3 ? 'cqrs_query_total' : 
                    'cqrs_event_published_total',
      metric_value: Math.random() * 1000,
      type: i % 20 === 0 ? `CreateOrder${i % 5}` : 
            i % 20 === 1 ? `GetOrder${i % 3}` : 
            i % 20 === 2 ? `CreateOrder${i % 5}` : 
            i % 20 === 3 ? `GetOrder${i % 3}` : 
            `OrderCreated${i % 2}`,
      status: i % 10 === 0 ? 'error' : 'success',
      cache_hit: i % 3 === 0,
      handler: i % 10 === 0 ? `CreateOrderHandler` : 
              i % 10 === 1 ? `GetOrderHandler` : 
              'OrderEventHandler',
    });
  }
  
  // 发送测试指标
  await sendTestData('cqrs-metrics', testMetrics);
  
  console.log('✓ Metric ingestion test completed');
}

/**
 * 查询测试数据
 */
async function queryTestData(): Promise<void> {
  console.log('Querying test data...');
  
  // 等待数据被处理
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // 查询命令日志
  try {
    const commandQuery = encodeURIComponent(`
      SELECT type, status, avg(duration_ms) as avg_duration
      FROM "cqrs-commands"
      WHERE timestamp >= NOW() - INTERVAL 1 HOUR
      GROUP BY type, status
      ORDER BY avg_duration DESC
      LIMIT 10
    `);
    
    const commandUrl = `${OPENOBSERVE_URL}/api/${OPENOBSERVE_ORGANIZATION}/_search?type=SQL&sql=${commandQuery}`;
    
    const commandResponse = await fetch(commandUrl, {
      headers: { 
        'Authorization': `Bearer ${OPENOBSERVE_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (commandResponse.ok) {
      const commandResult = await commandResponse.json();
      console.log('✓ Command logs query result:', commandResult.hits?.slice(0, 5));
    } else {
      console.warn('Failed to query command logs');
    }
  } catch (error) {
    console.warn('Error querying command logs:', error);
  }
  
  // 查询指标
  try {
    const metricQuery = encodeURIComponent(`
      SELECT metric_name, type, avg(metric_value) as avg_value
      FROM "cqrs-metrics"
      WHERE timestamp >= NOW() - INTERVAL 1 HOUR
        AND metric_name LIKE '%duration_ms%'
      GROUP BY metric_name, type
      ORDER BY avg_value DESC
      LIMIT 10
    `);
    
    const metricUrl = `${OPENOBSERVE_URL}/api/${OPENOBSERVE_ORGANIZATION}/_search?type=SQL&sql=${metricQuery}`;
    
    const metricResponse = await fetch(metricUrl, {
      headers: { 
        'Authorization': `Bearer ${OPENOBSERVE_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (metricResponse.ok) {
      const metricResult = await metricResponse.json();
      console.log('✓ Metrics query result:', metricResult.hits?.slice(0, 5));
    } else {
      console.warn('Failed to query metrics');
    }
  } catch (error) {
    console.warn('Error querying metrics:', error);
  }
  
  console.log('✓ Query test completed');
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  if (!OPENOBSERVE_URL || !OPENOBSERVE_ORGANIZATION || !OPENOBSERVE_TOKEN) {
    throw new Error('Missing required environment variables: OPENOBSERVE_URL, OPENOBSERVE_ORGANIZATION, OPENOBSERVE_TOKEN');
  }
  
  console.log('Starting CQRS OpenObserve integration test...');
  const startTime = performance.now();
  
  try {
    await testLogIngestion();
    await testMetricIngestion();
    await queryTestData();
    
    const duration = performance.now() - startTime;
    console.log(`✓ CQRS OpenObserve integration test completed in ${duration.toFixed(2)}ms`);
  } catch (error) {
    console.error('✗ CQRS OpenObserve integration test failed:', error);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}
```

## 实施计划与时间表

### 第1-2周：紧急修复
1. **第1天**：修复 TanStack Query 关键问题（重试机制、内存泄漏、缓存配置）
2. **第2天**：修复依赖注入和模块选项问题
3. **第3天**：修复导出和 Jest 配置问题
4. **第4-5天**：编写和运行回归测试，确保修复有效

### 第3-4周：OpenObserve 集成
1. **第6天**：创建环境变量配置和适配器
2. **第7-8天**：实现结构化日志服务
3. **第9天**：实现指标收集服务
4. **第10天**：实现分布式追踪服务
5. **第11-12天**：更新总线实现以集成可观测性
6. **第13-14天**：编写和运行集成测试

### 第5-6周：性能优化
1. **第15-16天**：实现 SWR 和并发去重服务
2. **第17-18天**：更新查询总线以集成 SWR
3. **第19-20天**：性能测试和优化
4. **第21天**：编写和运行性能测试

### 第7-8周：监控与告警
1. **第22-23天**：创建 OpenObserve 初始化脚本
2. **第24-25天**：创建测试脚本
3. **第26-27天**：配置告警规则和仪表板
4. **第28天**：端到端测试和文档更新

## 验收标准

1. **功能验收**
   - 所有原有功能正常工作
   - 新功能按设计实现
   - 性能指标达标（查询 p95 < 300ms、命令 p95 < 500ms）

2. **可观测性验收**
   - 日志结构化并正确写入 OpenObserve
   - 指标收集并可视化展示
   - 分布式追踪完整且关联正确
   - 告警规则触发且通知正确

3. **代码质量验收**
   - 单元测试覆盖率 > 90%
   - 集成测试覆盖关键路径
   - 代码审查通过
   - 文档更新完整

## 风险评估与缓解措施

### 高风险
1. **迁移复杂性**：从自实现到优化实现的迁移可能影响现有功能
   - **缓解**：分阶段实施，充分测试，保留回滚机制

2. **性能影响**：新引入的可观测性可能影响性能
   - **缓解**：异步批量处理、采样控制、性能监控

### 中风险
1. **学习曲线**：团队需要学习新的最佳实践
   - **缓解**：提供详细文档、培训和示例

2. **调试复杂性**：分布式追踪和中间件可能增加调试难度
   - **缓解**：完善的日志和追踪、调试工具和文档

### 低风险
1. **依赖冲突**：新依赖可能与现有依赖冲突
   - **缓解**：依赖版本锁定、兼容性测试

2. **配置复杂性**：新功能可能增加配置复杂度
   - **缓解**：统一配置管理、默认值、验证机制

## 总结

本优化方案通过分阶段实施，逐步解决当前 CQRS 实现中的问题，重点提升性能、可靠性和可观测性。通过与 OpenObserve 的深度集成，建立一个"日志-指标-追踪"三位一体的可观测性体系，显著提升问题定位效率与性能治理能力，同时控制存储与运维成本，助力系统稳定演进。

建议按照计划逐步实施，每个阶段完成后进行充分测试和验证，确保系统稳定性和功能完整性。