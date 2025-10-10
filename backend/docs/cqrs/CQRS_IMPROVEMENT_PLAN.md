# CQRS 模块改进方案

## 概述

本文档详细描述了对 `backend/src/cqrs` 模块的改进方案，旨在解决当前实现中的工程实践问题，提升可维护性、健壮性和一致性。

## 验收标准与检查清单
为确保改进“可落地、可度量、可验收”，引入以下标准与检查项：

- 构建与导出
  - Barrel 导出不再使用 .js 后缀；TS 构建通过且无路径映射异常
  - Jest 配置修正（moduleNameMapper 等），测试套件可运行通过
- 模块选项与注入
  - onModuleInit 尊重 enableDefaultMiddleware/autoDiscoverHandlers（默认启用，可显式关闭）
  - IQueryCache 通过 DI 注入，无“扫描 providers”耦合，且缺失时有清晰告警
- 处理器发现与注册
  - 命令/查询处理器重复注册有明确策略（报错或警告并覆盖），事件允许多订阅并记录 subscriber
  - 注册过程生成结构化日志（type、handler、status），错误有统一错误码
- 查询缓存语义
  - 明确 cacheTime/staleTime 行为；cacheTime=0 严格禁用缓存
  - SWR 落地：过期返回旧值并后台刷新；同 key in-flight 去重；对“空结果”做短 TTL 防穿透
- TanStack Query 集成行为
  - 支持 retry/指数退避与抖动；支持 AbortSignal 取消；严谨传递 variables
  - queryKey 类型安全（tuple 校验）；invalidate/reset 能清理后台刷新定时器句柄
- 日志、指标、追踪
  - 统一使用 Nest Logger；日志字段统一（service, version, env, bus, type, handler, cache_key, cache_hit, retries, duration_ms, error_code）
  - 指标：命令/查询/事件计数与耗时直方图、缓存命中率；追踪：command.*, query.*, event.* 统一 span 命名与属性
- 测试覆盖
  - 处理器注册/冲突、缓存/失效、TanStack 行为（重试/取消/SWR/去重）均有测试
  - 中间件链的日志/指标/验证路径有最小可用测试

检查清单（发布或周检）
- [ ] TS 构建通过；index.ts 导出无 .js 后缀
- [ ] Jest 测试通过；新增/修复的测试用例覆盖关键路径
- [ ] IQueryCache 通过 DI 注入；缺失时有清晰日志/告警
- [ ] 命令/查询/事件注册日志可见；重复注册策略生效
- [ ] 缓存语义符合预期（含 cacheTime=0、SWR、in-flight 去重、防穿透）
- [ ] TanStack 集成的重试/取消/失效清理行为抽测通过
- [ ] 指标与日志结构化输出可在仪表板/查询中验证
- [ ] 追踪覆盖抽样（≥20 条），错误记录与日志 traceId/spanId 关联

## 环境变量适配器统一引用说明
为避免环境变量命名差异导致的配置漂移，所有与 OpenObserve 交互的脚本/服务统一引入仓库适配器常量，而非直接读 process.env：

- 适配器路径（示例）：scripts/openobserve/env-adapter.js
- 字段：OPENOBSERVE_URL、OPENOBSERVE_ORGANIZATION、OPENOBSERVE_TOKEN、OPENOBSERVE_ENABLED
- 回退映射：OPENOBSERVE_URL ||= OPENOBSERVE_BASE_URL；OPENOBSERVE_ORGANIZATION ||= OPENOBSERVE_ORG
- 用法示例：
  \`\`\`javascript
  const { OPENOBSERVE_URL, OPENOBSERVE_ORGANIZATION, OPENOBSERVE_TOKEN } =
    require('../../scripts/openobserve/env-adapter');
  const baseUrl = OPENOBSERVE_URL.replace(/\/+$/, '');
  \`\`\`

请在 TanStack Query 集成、Streams 初始化、仪表板导入等脚本中统一改为引入适配器，减少多处配置源造成的偏差。

## 当前问题分析

### 1. 配置与依赖注入问题

- **模块选项未生效**：`onModuleInit` 无视 `enableDefaultMiddleware`/`autoDiscoverHandlers`
- **注入方式不规范**：通过 `DiscoveryService.getProviders` 查找 `IQueryCache` 脆弱且耦合内部结构
- **全局模块污染**：`global: true` 会污染应用范围

### 2. 构建与配置错误

- **Barrel 导出错误**：`index.ts` 中使用 `.js` 扩展名，TypeScript 编译前不应带 `.js`
- **Jest 配置错误**：`moduleNameMapping` 应为 `moduleNameMapper`，目录不一致问题

### 3. TanStack Query 集成逻辑问题

- **重试机制缺陷**：`setTimeout` 后不返回/不 await，易产生并发与状态漂移
- **变量赋值错误**：`refetchOnWindowFocus` 误赋值为 `config.refetchOnReconnect`
- **内存泄漏风险**：`setInterval` 未保留/清理句柄
- **缓存配置问题**：`cacheTime=0` 被 `(cacheTime || 300)` 覆盖，无法关闭缓存
- **变量传递缺失**：`mutate` 未向 `mutationFn` 传递 `variables`
- **查询键设计不一致**：假定 `queryKey[0]` 为查询类型名称，与 TanStack 风格不符
- **缺少 SWR 和并发去重**：没有实现 stale-while-revalidate 和 in-flight 去重

### 4. 日志与可观测性不足

- **使用 console.log**：未使用 Nest Logger，未接入 OpenTelemetry
- **中间件管线不完整**：仅预留注释，缺少实际实现

### 5. 类型安全与注册机制

- **元数据类型缺失**：装饰器元数据缺少类型校验
- **重复注册风险**：发现与注册无卸载机制，热重载时易重复注册

## 改进方案

### 阶段一：紧急修复（1-2天）

#### 1.1 修复依赖注入问题

**文件**：`backend/src/cqrs/cqrs.module.ts`

```typescript
// 修复前
constructor(
  private readonly discoveryService: DiscoveryService,
  private readonly reflector: Reflector,
  private readonly commandBus?: CommandBus,
  private readonly queryBus?: QueryBus,
  private readonly eventBus?: EventBus,
) {}

// 修复后
constructor(
  private readonly discoveryService: DiscoveryService,
  private readonly reflector: Reflector,
  private readonly commandBus?: CommandBus,
  private readonly queryBus?: QueryBus,
  private readonly eventBus?: EventBus,
  @Inject('IQueryCache') private readonly queryCache?: IQueryCache,
) {}

// 保存模块选项 - 直接注入更安全
constructor(
  private readonly discoveryService: DiscoveryService,
  private readonly reflector: Reflector,
  private readonly commandBus?: CommandBus,
  private readonly queryBus?: QueryBus,
  private readonly eventBus?: EventBus,
  @Inject('IQueryCache') private readonly queryCache?: IQueryCache,
  @Inject('CQRS_MODULE_OPTIONS') private readonly options: CqrsModuleOptions,
) {}

// 修复 onModuleInit
async onModuleInit(): Promise<void> {
  if (this.options.autoDiscoverHandlers !== false) {
    await this.discoverHandlers();
  }
  
  if (this.options.enableDefaultMiddleware !== false) {
    this.setupDefaultMiddleware();
  }
}
```

#### 1.2 修复导出问题

**文件**：`backend/src/cqrs/index.ts`

```typescript
// 修复前
export * from './commands/command.base.js';
export * from './queries/query.base.js';
// ... 其余导出

// 修复后
export * from './commands/command.base';
export * from './queries/query.base';
// ... 其余导出
```

#### 1.3 修复 Jest 配置

**文件**：`backend/src/cqrs/jest.config.js`

```javascript
// 修复前
module.exports = {
  moduleNameMapping: {
    '^@/(.*)$': '/src/$1'
  },
  roots: ['<rootDir>/src'],
  testMatch: ['<rootDir>/src/cqrs/**/*.spec.ts'],
  // ... 其余配置
};

// 修复后
module.exports = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: [
    '<rootDir>/src/cqrs/**/*.spec.ts',
    '<rootDir>/src/cqrs/**/*.test.ts',
    '<rootDir>/test/**/*.spec.ts',
    '<rootDir>/test/**/*.test.ts'
  ],
  // ... 其余配置
};
```

#### 1.4 修复 TanStack Query 关键问题

**文件**：`backend/src/cqrs/tanstack-query.integration.ts`

```typescript
// 修复重试机制
import pRetry from 'p-retry';

async query<T>(options: TanStackQueryOptions): Promise<TanStackQueryState<T>> {
  // ... 现有代码
  
  // 修复重试逻辑
  if (retry && retry > 0) {
    this.logger.debug(`Retrying query: ${cacheKey}, attempts left: ${retry}`);
    
    try {
      const retryOptions = { ...options, retry: retry - 1 };
      return await pRetry(() => this.query(retryOptions), {
        retries: retry,
        minTimeout: retryDelay,
      });
    } catch (retryError) {
      this.logger.error(`Query failed after retries: ${cacheKey}`, retryError);
      return errorState;
    }
  }
  
  return errorState;
}

// 修复变量赋值错误
const {
  refetchOnWindowFocus = this.config.refetchOnWindowFocus, // 修复这里
  refetchOnReconnect = this.config.refetchOnReconnect,
  // ... 其余解构
} = options;

// 修复缓存 0 值处理
const expiresMs = cacheTime === 0 ? 0 : (cacheTime || this.config.defaultCacheTime || 300) * 1000;
const cacheExpiresAt = expiresMs ? new Date(Date.now() + expiresMs) : undefined;

// 修复 mutate 变量传递
async mutate<T, V>(options: TanStackMutationOptions<T, V>): Promise<TanStackMutationState<T>> {
  const {
    mutationFn,
    variables,
    onSuccess,
    onError,
    onSettled,
    retry = this.config.retry,
    retryDelay = this.config.retryDelay,
  } = options;

  this.logger.debug('Executing mutation');

  const state: TanStackMutationState<T> = {
    isLoading: true,
    isError: false,
    isReset: false,
    variables, // 添加变量
  };

  try {
    // 修复：正确传递变量
    const result = await mutationFn(variables as V);
    // ... 其余逻辑
  } catch (error) {
    // ... 错误处理
    
    // 修复重试逻辑
    if (retry && retry > 0) {
      this.logger.debug(`Retrying mutation, attempts left: ${retry}`);
      
      try {
        const retryOptions = { ...options, retry: retry - 1 };
        return await pRetry(() => this.mutate(retryOptions), {
          retries: retry,
          minTimeout: retryDelay,
        });
      } catch (retryError) {
        this.logger.error('Mutation failed after retries', retryError);
        return errorState;
      }
    }
    
    return errorState;
  }
}

// 添加后台刷新清理机制
private intervals = new Map<string, NodeJS.Timeout>();

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

// 添加清理方法
onModuleDestroy(): void {
  // 清理所有定时器
  for (const [cacheKey, timer] of this.intervals.entries()) {
    clearInterval(timer);
    this.logger.debug(`Cleaned up background refresh for query: ${cacheKey}`);
  }
  this.intervals.clear();
}
```

### 阶段二：引入成熟库（3-5天）

#### 2.1 引入 @nestjs/cqrs

**安装依赖**
```bash
npm install @nestjs/cqrs
```

**迁移步骤**

1. **替换模块导入**
```typescript
// app.module.ts
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [
    CqrsModule,
    // ... 其他模块
  ],
})
export class AppModule {}
```

2. **迁移命令处理器**
```typescript
// create-user.handler.ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateUserCommand } from './create-user.command';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(private readonly eventBus: EventBus) {}

  async execute(command: CreateUserCommand) {
    // 处理逻辑
    // 注意：方法名从 handle 改为 execute
  }
}
```

3. **迁移查询处理器**
```typescript
// get-user.handler.ts
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetUserQuery } from './get-user.query';

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  async execute(query: GetUserQuery) {
    // 处理逻辑
    // 注意：方法名从 handle 改为 execute
  }
}
```

4. **迁移事件处理器**
```typescript
// user-created.handler.ts
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserCreatedEvent } from './user-created.event';

@EventsHandler(UserCreatedEvent)
export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  handle(event: UserCreatedEvent) {
    // 处理逻辑
    // 注意：方法名从 handle 改为 handle（保持一致）
  }
}
```

#### 2.2 引入缓存管理库

**安装依赖**
```bash
npm install cache-manager @cache-manager/redis-store
npm install async-cache-dedupe
```

**配置缓存**
```typescript
// cache.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.register({
      store: redisStore,
      host: 'localhost',
      port: 6379,
      ttl: 300, // 5分钟
    }),
  ],
  exports: [CacheModule],
})
export class AppCacheModule {}
```

**更新 TanStack 集成**
```typescript
// tanstack-query.integration.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class TanStackQueryIntegrationService implements ITanStackQueryClient {
  constructor(
    private readonly queryBus: QueryBus,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    config: TanStackQueryConfig = {},
  ) {
    // ... 初始化逻辑
  }

  async get<T>(key: string): Promise<T | null> {
    return await this.cacheManager.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, { ttl });
  }

  async delete(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  // ... 其余方法
}
```

#### 2.3 引入重试库

**安装依赖**
```bash
npm install p-retry
```

**更新重试逻辑**
```typescript
// 在 TanStackQueryIntegrationService 中
import pRetry from 'p-retry';

async query<T>(options: TanStackQueryOptions): Promise<TanStackQueryState<T>> {
  // ... 现有代码

  try {
    const result = await pRetry(
      async () => {
        const res = await queryFn();
        if (select) {
          return select(res);
        }
        return res;
      },
      {
        retries: retry,
        minTimeout: retryDelay,
        onFailedAttempt: (error) => {
          this.logger.error(
            `Query attempt ${error.attemptNumber} failed: ${cacheKey}`,
            error,
          );
        },
      }
    );

    // ... 处理成功结果
  } catch (error) {
    // ... 处理错误
  }
}
```

### 阶段三：增强可观测性（2-3天）

#### 3.1 集成 OpenTelemetry

**安装依赖**
```bash
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
npm install @opentelemetry/exporter-jaeger @opentelemetry/exporter-prometheus
```

**配置追踪**
```typescript
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
  traceExporter: new JaegerExporter({
    endpoint: 'http://localhost:14268/api/traces',
  }),
  metricExporter: new PrometheusExporter({
    port: 9464,
  }),
});

sdk.start();
```

**在 CQRS 中添加追踪**
```typescript
// command.bus.ts
import { trace } from '@opentelemetry/api';

@Injectable()
export class CommandBus implements ICommandBus {
  private readonly tracer = trace.getTracer('command-bus');

  async execute<TCommand extends ICommand>(command: TCommand): Promise<ICommandResult> {
    const span = this.tracer.startSpan(`command.${command.constructor.name}`);
    
    try {
      span.setAttributes({
        'command.id': command.id,
        'command.type': command.constructor.name,
      });

      // ... 执行逻辑
      
      span.setAttributes({
        'command.success': result.success,
        'command.duration': Date.now() - startTime,
      });
      
      return result;
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }
}
```

#### 3.2 统一日志记录

**替换 console.log**
```typescript
// 在所有总线类中
import { Logger } from '@nestjs/common';

@Injectable()
export class CommandBus {
  private readonly logger = new Logger(CommandBus.name);

  // 替换所有 console.log 为 this.logger
}
```

#### 3.3 OpenObserve 集成规范（与集成方案一致）
- 数据通道与流命名
  - logs：cqrs-commands、cqrs-queries、cqrs-events
  - metrics：cqrs-metrics
  - traces：traces（OTLP）
  - Ingest 端点：HTTP {BASE}/api/{org}/{stream}/_json；OTLP {BASE}/otlp/v1/{logs|metrics|traces}
- 结构化日志（公共字段）
  - timestamp（UTC ISO8601）、env、service、version、source、traceId、spanId、requestId、tenant、userId
  - 命令：type、id、status(start/success/error)、duration_ms、retry_count、error_code、payload_size、handler
  - 查询：type、cache_key、cache_hit、stale、duration_ms、result_size、handler
  - 事件：type、status(published/handled/error)、subscriber、duration_ms、dlq
- 指标命名与维度
  - 命令：cqrs_command_total{type,status}；cqrs_command_duration_ms{type,handler} histogram；cqrs_command_retry_total{type}
  - 查询：cqrs_query_total{type,cache_hit}；cqrs_query_duration_ms{type,handler} histogram；cqrs_query_cache_hit_ratio{type}
  - 事件：cqrs_event_published_total{type}；cqrs_event_handle_total{type,status}；cqrs_event_dlq_total{type}
  - 运行时：cqrs_inflight_operations{kind}；cqrs_background_refresh_active{type}
- 告警阈值
  - 错误率：commands error_rate > 1% 持续5m（critical）；event DLQ > 0（critical）
  - 性能：p95 cqrs_query_duration_ms > 300ms 持续10m（high）；p95 cqrs_command_duration_ms > 500ms 持续10m（high）
  - 缓存：cqrs_query_cache_hit_ratio < 50% 持续15m（medium）
- 分布式追踪（OTLP）
  - span 命名：command.{Type} / query.{Type} / event.{Type}
  - attributes：命令（command.id/type/handler/retry_count），查询（query.type/cache_hit/cache_key/handler），事件（event.type/subscriber/status）
  - 错误：recordException + status=ERROR；日志携带 traceId/spanId 与追踪关联
- Pipeline（VRL）脱敏与富化
  - PII 局部掩码（邮箱/手机号），统一 timestamp、env、service、region
  - 错误日志转指标字段（metric_name/metric_value）便于 PromQL 与看板

### 阶段四：完善中间件系统（3-4天）

#### 4.1 实现中间件接口

```typescript
// middleware.interface.ts
export interface ICqrsMiddleware<T = any, R = any> {
  name: string;
  execute(context: T, next: () => Promise<R>): Promise<R>;
}

export interface IMiddlewareContext<T = any> {
  target: T;
  metadata: Record<string, any>;
  startTime: number;
  span?: Span;
}
```

#### 4.2 实现常用中间件

```typescript
// logging.middleware.ts
@Injectable()
export class LoggingMiddleware implements ICqrsMiddleware {
  public readonly name = 'LoggingMiddleware';

  async execute(context: IMiddlewareContext, next: () => Promise<any>): Promise<any> {
    const { target, startTime } = context;
    const targetName = target.constructor.name;
    
    this.logger.debug(`[START] Processing ${targetName}`);

    try {
      const result = await next();
      const duration = Date.now() - startTime;
      
      this.logger.debug(`[SUCCESS] ${targetName} completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[ERROR] ${targetName} failed in ${duration}ms:`, error);
      throw error;
    }
  }
}

// validation.middleware.ts
@Injectable()
export class ValidationMiddleware implements ICqrsMiddleware {
  public readonly name = 'ValidationMiddleware';

  async execute(context: IMiddlewareContext, next: () => Promise<any>): Promise<any> {
    const { target } = context;
    
    // 使用 class-validator 进行验证
    const errors = await validate(target);
    if (errors.length > 0) {
      throw new ValidationException(errors);
    }

    return await next();
  }
}

// metrics.middleware.ts
@Injectable()
export class MetricsMiddleware implements ICqrsMiddleware {
  public readonly name = 'MetricsMiddleware';

  constructor(private readonly meter: Meter) {
    this.commandCounter = this.meter.createCounter('cqrs.commands.total');
    this.commandDuration = this.meter.createHistogram('cqrs.commands.duration');
  }

  private commandCounter: Counter;
  private commandDuration: Histogram;

  async execute(context: IMiddlewareContext, next: () => Promise<any>): Promise<any> {
    const { target, startTime } = context;
    const targetName = target.constructor.name;

    this.commandCounter.add(1, { type: targetName });

    try {
      const result = await next();
      const duration = Date.now() - startTime;
      
      this.commandDuration.record(duration, { type: targetName, status: 'success' });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.commandDuration.record(duration, { type: targetName, status: 'error' });
      throw error;
    }
  }
}
```

#### 4.3 集成中间件到总线

```typescript
// command.bus.ts
@Injectable()
export class CommandBus {
  private middlewares: ICqrsMiddleware[] = [];

  constructor(
    @Inject('CQRS_MIDDLEWARES') middlewares: ICqrsMiddleware[] = [],
  ) {
    this.middlewares = middlewares;
  }

  async execute<TCommand extends ICommand>(command: TCommand): Promise<ICommandResult> {
    const context: IMiddlewareContext<TCommand> = {
      target: command,
      metadata: {},
      startTime: Date.now(),
    };

    let index = 0;
    const executeNext = async (): Promise<ICommandResult> => {
      if (index >= this.middlewares.length) {
        // 执行实际命令处理
        return await this.executeCommand(command);
      }

      const middleware = this.middlewares[index++];
      return await middleware.execute(context, executeNext);
    };

    return await executeNext();
  }

  private async executeCommand(command: ICommand): Promise<ICommandResult> {
    // 实际命令执行逻辑
  }
}
```

### 阶段五：实现 SWR 和并发去重（2-3天）

#### 5.1 实现并发去重

```typescript
// deduplication.service.ts
@Injectable()
export class DeduplicationService {
  private pendingQueries = new Map<string, Promise<any>>();

  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.pendingQueries.has(key)) {
      return this.pendingQueries.get(key) as Promise<T>;
    }

    const promise = fn().finally(() => {
      this.pendingQueries.delete(key);
    });

    this.pendingQueries.set(key, promise);
    return promise;
  }
}
```

#### 5.2 实现 SWR

```typescript
// swr.service.ts
@Injectable()
export class SWRService {
  constructor(
    private readonly cacheManager: Cache,
    private readonly deduplicationService: DeduplicationService,
  ) {}

  async getWithSWR<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { ttl?: number; staleWhileRevalidate?: boolean } = {},
  ): Promise<T> {
    const { ttl = 300, staleWhileRevalidate = true } = options;

    // 尝试从缓存获取
    const cached = await this.cacheManager.get<T>(key);
    
    if (cached) {
      // 检查是否过期
      const isExpired = await this.isExpired(key);
      
      if (!isExpired) {
        return cached;
      }
      
      // 如果启用 SWR，返回缓存数据并在后台更新
      if (staleWhileRevalidate) {
        this.deduplicationService.dedupe(`swr:${key}`, async () => {
          try {
            const fresh = await fetcher();
            await this.cacheManager.set(key, fresh, { ttl });
            return fresh;
          } catch (error) {
            // 后台更新失败，不影响返回的缓存数据
            console.error(`SWR update failed for key: ${key}`, error);
          }
        });
        
        return cached;
      }
    }

    // 没有缓存或过期且未启用 SWR，直接获取
    const result = await this.deduplicationService.dedupe(key, fetcher);
    await this.cacheManager.set(key, result, { ttl });
    return result;
  }

  private async isExpired(key: string): Promise<boolean> {
    // 实现过期检查逻辑
    // 可以通过缓存元数据或单独的过期时间表实现
    return false;
  }
}
```

#### 5.3 集成到查询总线

```typescript
// query.bus.ts
@Injectable()
export class QueryBus {
  constructor(
    private readonly swrService: SWRService,
    // ... 其他依赖
  ) {}

  async execute<TQuery extends IQuery, TResult = any>(
    query: TQuery,
  ): Promise<IQueryResult<TResult>> {
    const queryName = query.constructor.name;
    const cacheKey = `${queryName}_${Buffer.from(JSON.stringify(query)).toString('base64')}`;

    try {
      const handler = this.handlers.get(queryName);
      if (!handler) {
        return {
          success: false,
          error: `No handler registered for query: ${queryName}`,
          errorCode: 'HANDLER_NOT_FOUND',
        };
      }

      // 使用 SWR 获取数据
      const data = await this.swrService.getWithSWR(
        cacheKey,
        () => handler.handle(query),
        {
          ttl: query.cacheTime || 300,
          staleWhileRevalidate: true,
        },
      );

      return {
        success: true,
        data,
        fromCache: true, // SWR 可能返回缓存数据
      };
    } catch (error) {
      this.logger.error(`Error executing query ${queryName}:`, error);
      return {
        success: false,
        error: error.message,
        errorCode: 'EXECUTION_ERROR',
      };
    }
  }
}
```

## 实施计划

### 第一周
- **第1-2天**：修复紧急问题（依赖注入、导出、Jest配置）
- **第3-5天**：修复 TanStack Query 关键问题，添加测试
- OpenObserve 基础落地（并行推进）
  - 创建并初始化 Streams：cqrs-commands/cqrs-queries/cqrs-events/cqrs-metrics/traces
  - 配置 Ingest/OTLP 端点与 Token（env 注入、禁用明文）
  - 在 CommandBus/QueryBus 替换 console.log 为 Nest Logger，增加 BusinessLogger 最小写入到 cqrs-commands/queries/events
  - 冒烟测试：日志成功入库与基本查询可用（SQL/PromQL 简单查询）

### 第二周
- **第1-2天**：引入 @nestjs/cqrs，迁移核心总线
- **第3-3天**：引入缓存管理库，更新 TanStack 集成
- OpenObserve 日志规范与中间件
  - 落地结构化日志公共字段：timestamp/env/service/source/traceId/spanId/requestId/tenant/userId
  - 命令/查询/事件日志字段标准（type/id/status/duration_ms/cache_hit 等）统一由 LoggingMiddleware 采集
  - 单元与集成测试：验证日志字段完整性与关联 traceId/spanId

### 第三周
- **第1-2天**：集成 OpenTelemetry，实现追踪和指标
- **第3-4天**：完善中间件系统，实现常用中间件
- OpenObserve 追踪与指标
  - OTLP Trace 导出到 OpenObserve，关键路径创建 span（command.{Type}/query.{Type}/event.{Type}）
  - 日志与追踪关联：日志携带 traceId/spanId 并在 O2 中验证链路可视化
  - 指标采集：cqrs_command_total/cqrs_query_duration_ms 等核心指标上报 cqrs-metrics（直方图桶配置）
  - 仪表板初版：命令/查询/事件三类看板（成功率、p95 时延、缓存命中率）

### 第四周
- **第1-2天**：实现 SWR 和并发去重
- **第3-5天**：完善测试覆盖，性能优化，文档更新
- OpenObserve 告警与 Pipeline
  - 告警规则上线：错误率>1%（5m）、查询 p95>300ms（10m）、命令 p95>500ms（10m）、缓存命中率<50%（15m）、DLQ>0（即时）
  - Ingest Pipeline（VRL）脱敏与富化：邮箱/手机号局部掩码、统一 timestamp/env/service/region、错误日志转指标（metric_name/metric_value）
  - 成本与可靠性：批量摄取（100–1000/批，5 并发）、指数退避+抖动重试、采样与保留策略文档
  - 压测与演练：触发告警回归、检查链路与看板；交付部署脚本与告警/仪表板清单

## 验收标准

1. 功能完整性
- 所有原有功能正常工作，新功能按设计实现；@nestjs/cqrs 迁移后命令/查询/事件处理器行为一致

2. 性能与缓存
- 查询 p95 响应时间 < 300ms；命令 p95 响应时间 < 500ms
- 缓存命中率 > 80%；支持 cacheTime=0 关闭缓存；后台刷新无泄漏（定时器可清理）

3. 可观测性一致性（与 OpenObserve 集成方案一致）
- 日志：命令/查询/事件按规范结构化采集到 cqrs-commands/cqrs-queries/cqrs-events，公共字段齐全（traceId/spanId/tenant 等）
- 指标：按命名规范采集 cqrs_command_total、cqrs_query_duration_ms 等核心指标到 cqrs-metrics，直方图桶合理
- 追踪：关键路径创建 span 并关联日志；错误记录异常，OTLP 端可查看链路
- 告警：错误率、性能、缓存命中率三类告警规则启用且命中测试通过

4. 测试覆盖
- 单元测试覆盖率 > 90%；集成测试覆盖：装饰器发现注册、重试与错误分支、SWR 与去重、缓存失效与后台刷新清理、OpenObserve 上报

5. 文档与部署资产
- 文档更新完成：改进方案与集成方案一致；包含流命名与字段规范、仪表板与告警清单、Pipeline 脱敏示例
- 部署脚本与配置可用：OpenObserve Streams 初始化、Token/端点配置、安全与保留策略说明

## 风险评估

### 高风险
- **迁移复杂性**：从自实现到 @nestjs/cqrs 的迁移可能影响现有功能
- **性能影响**：新引入的库可能影响性能

### 中风险
- **学习曲线**：团队需要学习新库和最佳实践
- **调试复杂性**：分布式追踪和中间件可能增加调试难度

### 低风险
- **依赖冲突**：新依赖可能与现有依赖冲突
- **配置复杂性**：新功能可能增加配置复杂度

## 部署与运维（OpenObserve）

### 环境变量约定（与现有站点统一）
- OPENOBSERVE_URL：OpenObserve 基础地址（例：https://o2.example.com）
- OPENOBSERVE_ORGANIZATION：组织名（例：default）
- OPENOBSERVE_TOKEN：访问令牌（建议通过环境变量+密钥管理，不落盘）
- CQRS_STREAM_COMMANDS：cqrs-commands
- CQRS_STREAM_QUERIES：cqrs-queries
- CQRS_STREAM_EVENTS：cqrs-events
- CQRS_STREAM_METRICS：cqrs-metrics
- CQRS_STREAM_TRACES：traces
- OTLP_LOGS_ENDPOINT：{OPENOBSERVE_URL}/otlp/v1/logs
- OTLP_METRICS_ENDPOINT：{OPENOBSERVE_URL}/otlp/v1/metrics
- OTLP_TRACES_ENDPOINT：{OPENOBSERVE_URL}/otlp/v1/traces

Windows PowerShell 示例（本地开发）
```powershell
$env:OPENOBSERVE_URL = "http://localhost:5080"
$env:OPENOBSERVE_ORGANIZATION = "default"
$env:OPENOBSERVE_TOKEN = "REDACTED"
$env:CQRS_STREAM_COMMANDS = "cqrs-commands"
$env:CQRS_STREAM_QUERIES = "cqrs-queries"
$env:CQRS_STREAM_EVENTS = "cqrs-events"
$env:CQRS_STREAM_METRICS = "cqrs-metrics"
$env:CQRS_STREAM_TRACES = "traces"
$env:OTLP_TRACES_ENDPOINT = "$env:OPENOBSERVE_URL/otlp/v1/traces"
```

### 初始化与运维脚本
- scripts/openobserve/init-streams.ts：创建与校验 Streams
```typescript
import fetch from 'node-fetch';

async function createStream(name: string, type: 'logs'|'metrics'|'traces') {
  const url = `${process.env.OPENOBSERVE_URL}/api/${process.env.OPENOBSERVE_ORGANIZATION}/${name}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENOBSERVE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ stream_type: type }),
  });
  if (!res.ok) throw new Error(`Create stream failed: ${name} ${res.status}`);
}

(async () => {
  const streams = [
    ['cqrs-commands', 'logs'],
    ['cqrs-queries', 'logs'],
    ['cqrs-events', 'logs'],
    ['cqrs-metrics', 'metrics'],
    ['traces', 'traces'],
  ] as const;
  for (const [name, type] of streams) {
    await createStream(name, type);
    console.log(`Created/verified stream: ${name}`);
  }
})();
```

- scripts/openobserve/send-batch.ts：批量写入日志（用于冒烟或演练）
```typescript
import fetch from 'node-fetch';

async function ingest(stream: string, events: any[]) {
  const url = `${process.env.OPENOBSERVE_URL}/api/${process.env.OPENOBSERVE_ORGANIZATION}/${stream}/_json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENOBSERVE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(events),
  });
  if (!res.ok) throw new Error(`Ingest failed: ${stream} ${res.status}`);
}

(async () => {
  const now = new Date().toISOString();
  await ingest(process.env.CQRS_STREAM_COMMANDS!, [
    { timestamp: now, service: 'backend', type: 'CreateOrder', status: 'start' },
    { timestamp: now, service: 'backend', type: 'CreateOrder', status: 'success', duration_ms: 42 },
  ]);
  console.log('Batch ingest completed.');
})();
```

### 运维要点与运行手册
- 批量与并发：100–1000/批，5 并发起步；超时 5–10s；指数退避+抖动重试
- 分流与限流：高噪声源独立 stream；入口限流与鉴权开启
- 数据保留：按数据类型设置保留策略（日志短、指标中、追踪短/采样）
- 安全与合规：环境变量注入、禁用明文 token；Pipeline 做 PII 脱敏与标签统一
- 变更与演练：仪表与告警定期演练；版本变更前后进行冒烟与回归

## 集成测试清单（OpenObserve）
- 日志上报与字段完整性
  - 命令/查询/事件三类日志能写入对应 streams（cqrs-commands/queries/events）
  - 公共字段齐全：timestamp/env/service/source/traceId/spanId/requestId/tenant/userId
  - 字段校验：status/duration_ms/cache_hit/cache_key 等符合规范
- 指标与直方图
  - 采集 cqrs_command_total/cqrs_query_duration_ms 等核心指标
  - 直方图桶配置合理，能在 O2 仪表中查看 p50/p95/p99
- 追踪链路
  - 关键路径创建 span（command.{Type}/query.{Type}/event.{Type}）
  - 日志携带 traceId/spanId 可在 O2 端正确关联
- 告警触发与恢复
  - 人工制造错误率>1%（5m），验证告警触发与恢复
  - 制造查询 p95>300ms（10m）与命令 p95>500ms（10m）性能退化，验证告警
  - 缓存命中率<50%（15m）场景验证
  - 事件 DLQ>0 即时告警验证
- Pipeline 脱敏与富化
  - 邮箱/手机号掩码规则生效；统一 timestamp/env/service/region 标签
  - 错误日志转指标字段（metric_name/metric_value）可在查询中聚合

## 仪表板与告警简表
为便于运维快速核对，建议在 OpenObserve 中建立以下看板与告警规则（与集成方案阈值一致）：

- 命令监控仪表板
  - 视图：命令执行趋势、成功率、时长直方图、Top 慢命令
  - 关键查询（示例，最近15分钟 p95）：
    - SQL: 参考 cqrs_command_duration_ms 直方图聚合
  - 告警：
    - p95 cqrs_command_duration_ms > 500ms 持续 10m（high）
    - cqrs_command_total{status="error"} / cqrs_command_total > 1% 持续 5m（critical）

- 查询性能仪表板
  - 视图：响应时间趋势、缓存命中率、热门查询、类型对比
  - 关键查询（示例，最近15分钟命中率）：
    - SQL:
      ```
      SELECT type,
        SUM(CASE WHEN cache_hit = true THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS hit_ratio
      FROM "cqrs-queries"
      WHERE timestamp >= NOW() - INTERVAL 15 MINUTE
      GROUP BY type
      ORDER BY hit_ratio DESC;
      ```
  - 告警：
    - p95 cqrs_query_duration_ms > 300ms 持续 10m（high）
    - cqrs_query_cache_hit_ratio < 50% 持续 15m（medium）

- 事件处理仪表板
  - 视图：发布速率、处理延迟、成功率、DLQ 计数
  - 告警：
    - cqrs_event_dlq_total{type} > 0（critical，即时）

- 运行时与后台刷新
  - 视图：cqrs_inflight_operations{kind}、cqrs_background_refresh_active{type}
  - 用途：观察 in-flight 去重与 SWR 后台刷新是否稳定

备注：
- 视图需支持近 15m/1h/24h 预设窗口
- 维度标签统一：{type, handler, status}

## 故障排除（FAQ）
常见问题与排查步骤：

1) OpenObserve 连接失败或 401/403
- 检查环境变量：OPENOBSERVE_URL / OPENOBSERVE_ORGANIZATION / OPENOBSERVE_TOKEN 是否存在且正确
- 统一使用适配器：scripts/openobserve/env-adapter 引入常量，避免直接读 process.env 导致漂移
- 本地开发：确认 URL 去除多余斜杠（例如 `OPENOBSERVE_URL.replace(/\/+$/, '')`）

2) 缓存行为异常（命中率骤降或无法关闭缓存）
- 确认 cacheTime=0 行为：表示禁用缓存，而非使用默认值；代码中严禁 `(cacheTime || default)` 覆盖 0
- 检查 SWR：过期返回旧值并后台刷新是否生效；后台刷新定时器在 invalidate/reset 时是否清理
- 检查 in-flight 去重：同 key 并发是否复用 Promise，避免击穿

3) TanStack 集成重试/取消无效
- 确认使用 p-retry（指数退避+抖动），避免递归 setTimeout 漂移
- 传递 AbortSignal：确保 query/mutation 支持取消，避免悬挂请求
- 变量传递：mutationFn 必须接收 variables；queryFn 输入校验

4) 处理器注册冲突或缺失
- 命令/查询：重复注册策略明确（报错或覆盖并告警）
- 事件：允许多订阅；subscriber 字段在日志中记录
- 自动发现：检查装饰器与元数据是否正确，onModuleInit 是否尊重 autoDiscoverHandlers

5) 可观测性数据缺失或字段不完整
- 日志：统一结构化字段（service, version, env, bus, type, handler, cache_key, cache_hit, retries, duration_ms, error_code）
- 指标：直方图桶选择合理；确保在仪表板上能查看 p50/p95/p99
- 追踪：command.*, query.*, event.* 三类 span 覆盖；错误记录 recordException并关联日志 traceId/spanId

6) OTLP 链路不通或数据不显示
- 端点：确认 {OPENOBSERVE_URL}/otlp/v1/{logs|metrics|traces} 可达
- 头部：Authorization: Bearer {token}；网络与 HTTPS 配置是否正确
- 采样率：生产可适度降低，避免数据量过大；先在开发环境验证完整链路

7) 定时器泄漏或后台刷新异常
- 在 invalidate/reset 时清理对应定时器句柄；模块销毁 onModuleDestroy 清理全部
- 为后台刷新添加错误日志与重试（p-retry），避免无声失败

参考：
- 仪表与告警清单应在运维台账中登记，并定期演练
- 所有脚本/服务统一从适配器读取环境常量，减少配置漂移

## 发布与回滚流程简表
- 发布前检查
  - 配置核对：OPENOBSERVE_URL/ORGANIZATION/TOKEN 与 Streams 名称一致
  - 健康检查：OTLP 联通性、写入权限、指标/告警可用
  - 变更评审：影响面、回滚方案、演练记录
- 发布流程（建议）
  - 灰度/金丝雀：按流量 5%→25%→50%→100% 递增，观察 15–30 分钟
  - 观测窗口：关键指标（p95 查询/命令时长、错误率、缓存命中率）、告警命中
  - 验收口径：达到文档“验收标准与检查清单”的阈值
- 回滚触发（示例阈值）
  - p95 查询 > 300ms 持续 10m 或 错误率 > 1% 持续 5m
  - 告警“DLQ>0”触发 或 关键仪表板异常（写入失败/高延迟）
- 回滚步骤
  - 立即切回上一版本（保留配置），停用新中间件/适配器
  - 关闭新增采集或降低采样/批量；清理后台刷新与队列堆积
  - 启动排障流程并记录事件（时间线、指标、原因）
- 发布后复盘
  - 收敛问题项与修复计划；更新文档阈值与演练脚本；补充测试覆盖

## RACI职责表
- 研发（R：Responsible）
  - 实现与单/集成测试；性能与可观测性埋点；发布包与回滚脚本维护
- 测试（A：Accountable）
  - 验收标准把关；告警演练与回归用例；性能与稳定性评估报告
- 运维（C：Consulted）
  - 部署/监控/告警配置；容量与成本治理；故障处理与工单
- 产品/负责人（I：Informed）
  - 发布窗口与风险评估；变更通知与影响面确认；复盘决策与优先级

## 快速核对清单（一页）
- 配置一致性
  - OPENOBSERVE_URL/ORGANIZATION/TOKEN 已配置且可用（本地/测试/生产一致）
  - Streams 存在：cqrs-commands/cqrs-queries/cqrs-events/cqrs-metrics/traces
  - OTLP 端点连通：logs/metrics/traces 均返回 2xx
- 架构与实现
  - 命令/查询/事件处理器自动发现生效，无冲突或已记录策略
  - 中间件启用：Logging/Validation/Metrics/Retry（命令/事件）、缓存与去重（查询）
  - 查询缓存语义清晰：cacheTime 与 staleTime 正确，cacheTime=0 禁用缓存
- 可观测性
  - 结构化日志字段完整：type/handler/status/duration_ms/retry_count/cache_hit 等
  - 指标上报：命令/查询/事件计数与耗时直方图，命中率与后台刷新指标
  - 追踪：command.* / query.* / event.* span 覆盖，错误 recordException 与关联 traceId
- 仪表板与告警
  - 仪表板加载正常：命令/查询/事件三类视图与钻取可用
  - 告警阈值已启用：p95 时长、错误率、DLQ、缓存命中率
- Pipeline 与安全
  - 脱敏规则生效（邮箱/手机号等），时间戳/标签统一
  - Token 管理与传输安全（HTTPS/限流/鉴权）到位
- 测试与演练
  - 单/集成测试覆盖：处理器注册/缓存与失效/中间件行为
  - 告警演练与回滚演练完成，记录留存
- 发布门禁（示例阈值）
  - p95 查询 <= 300ms、命令 <= 500ms；错误率 <= 1%；缓存命中率 >= 50%
  - 无 DLQ 新增；OTLP 与 Ingest 稳定；后台刷新受控
  - 通过 RACI 责任核对与变更评审
## 总结

本改进方案通过分阶段实施，逐步解决当前 CQRS 实现中的问题，提升系统的健壮性、可维护性和可观测性。通过引入成熟的库和最佳实践，可以降低维护成本，提高开发效率，同时保持系统的灵活性和扩展性。

建议按照计划逐步实施，每个阶段完成后进行充分测试和验证，确保系统稳定性和功能完整性。