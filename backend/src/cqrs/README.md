# CQRS模块与TanStack Query集成

本模块实现了完整的CQRS（命令查询责任分离）模式，并集成了TanStack Query功能，为NestJS应用提供了强大的数据管理和缓存能力。

## 目录结构

```
cqrs/
├── commands/                 # 命令相关
│   └── command.base.ts      # 命令基类
├── queries/                  # 查询相关
│   └── query.base.ts        # 查询基类
├── events/                   # 事件相关
│   └── event.base.ts        # 事件基类
├── interfaces/               # 接口定义
│   ├── command-handler.interface.ts
│   ├── query-handler.interface.ts
│   └── event-handler.interface.ts
├── bus/                      # 总线实现
│   ├── command.bus.ts       # 命令总线
│   ├── query.bus.ts         # 查询总线
│   └── event.bus.ts         # 事件总线
├── decorators/               # 装饰器
│   ├── command-handler.decorator.ts
│   ├── query-handler.decorator.ts
│   └── event-handler.decorator.ts
├── examples/                 # 示例
│   ├── create-user.command.ts
│   ├── get-user.query.ts
│   ├── user-created.event.ts
│   └── create-user.handler.ts
├── tanstack-query.integration.ts  # TanStack Query集成
├── cqrs.module.ts           # CQRS模块
└── index.ts                 # 导出文件
```

## 核心概念

### 命令（Commands）
命令表示改变系统状态的操作，它们总是返回结果或错误。

```typescript
export class CreateUserCommand extends CommandBase {
  constructor(public readonly userData: UserData) {
    super();
  }
  
  protected getData(): Record<string, any> {
    return { userData: this.userData };
  }
}
```

### 查询（Queries）
查询表示从系统获取数据的操作，它们不会改变系统状态。

```typescript
export class GetUserQuery extends QueryBase {
  constructor(public readonly userId: string) {
    super({
      cacheKey: `user_${userId}`,
      cacheTime: 300, // 5分钟缓存
      staleTime: 60   // 1分钟后数据过期
    });
  }
  
  protected getData(): Record<string, any> {
    return { userId: this.userId };
  }
}
```

### 事件（Events）
事件表示系统中发生的重要事情，用于解耦不同的组件。

```typescript
export class UserCreatedEvent extends DomainEventBase {
  constructor(public readonly userId: string, public readonly userData: UserData) {
    super('UserCreated', { aggregateId: userId });
  }
}
```

## 使用方法

### 1. 安装和配置模块

```typescript
import { Module } from '@nestjs/common';
import { CqrsModule } from './cqrs/cqrs.module';

@Module({
  imports: [
    CqrsModule.forRoot({
      enableCommandBus: true,
      enableQueryBus: true,
      enableEventBus: true,
      enableDefaultMiddleware: true,
      autoDiscoverHandlers: true
    })
  ]
})
export class AppModule {}
```

### 2. 创建命令处理器

```typescript
@Injectable()
@CommandHandler(CreateUserCommand)
@CommandHandlerOptions({
  retry: true,
  maxRetries: 3,
  timeout: 10000
})
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(private readonly eventBus: IEventBus) {}
  
  async handle(command: CreateUserCommand): Promise<ICommandResult> {
    // 处理命令逻辑
    const user = await this.userService.create(command.userData);
    
    // 发布事件
    await this.eventBus.publish(new UserCreatedEvent(user.id, user));
    
    return { success: true, data: user };
  }
}
```

### 3. 创建查询处理器

```typescript
@Injectable()
@QueryHandler(GetUserQuery)
@QueryCache({
  ttl: 300,
  staleTime: 60,
  byUser: true
})
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  async handle(query: GetUserQuery): Promise<IQueryResult> {
    // 处理查询逻辑
    const user = await this.userService.findById(query.userId);
    return { success: true, data: user };
  }
}
```

### 4. 创建事件处理器

```typescript
@Injectable()
@EventHandler(UserCreatedEvent)
@EventRetry({
  maxAttempts: 3,
  exponentialBackoff: true
})
export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  async handle(event: UserCreatedEvent): Promise<IEventHandlerResult> {
    // 处理事件逻辑
    await this.emailService.sendWelcomeEmail(event.userData.email);
    return { success: true };
  }
}
```

### 5. 在控制器中使用

```typescript
@Controller('users')
export class UserController {
  constructor(
    private readonly commandBus: ICommandBus,
    private readonly queryBus: IQueryBus
  ) {}
  
  @Post()
  async createUser(@Body() userData: UserData) {
    const command = new CreateUserCommand(userData);
    return await this.commandBus.execute(command);
  }
  
  @Get(':id')
  async getUser(@Param('id') id: string) {
    const query = new GetUserQuery(id);
    return await this.queryBus.execute(query);
  }
}
```

## TanStack Query集成

本模块提供了与TanStack Query的深度集成，支持以下功能：

### 1. 查询缓存

```typescript
// 查询会自动缓存，支持TTL和stale time
const query = new GetUserQuery(userId, {
  cacheTime: 300,    // 缓存5分钟
  staleTime: 60     // 1分钟后数据过期
});

const result = await queryBus.executeWithCache(query);
```

### 2. 预加载

```typescript
// 预加载查询以提高性能
await queryBus.prefetch(new GetUserQuery(userId));
```

### 3. 缓存失效

```typescript
// 使特定查询缓存失效
await queryBus.invalidateCache('GetUserQuery', `user_${userId}`);

// 使所有用户查询缓存失效
await queryBus.invalidateCache('GetUserQuery');
```

### 4. TanStack Query适配器

```typescript
import { TanStackQueryIntegrationService } from './cqrs/tanstack-query.integration';

const tanStackClient = new TanStackQueryIntegrationService(queryBus, {
  defaultCacheTime: 300,
  defaultStaleTime: 60,
  enableBackgroundRefresh: true
});

// 使用TanStack Query风格的方法
const result = await tanStackClient.query({
  queryKey: ['user', userId],
  queryFn: () => queryBus.execute(new GetUserQuery(userId))
});
```

## 装饰器

### 命令装饰器

- `@CommandHandler()` - 标记类为命令处理器
- `@CommandHandlerOptions()` - 配置命令处理器选项
- `@CommandValidate()` - 配置命令验证
- `@CommandPermissions()` - 配置所需权限
- `@CommandTransaction()` - 配置事务支持
- `@CommandRetry()` - 配置重试策略

### 查询装饰器

- `@QueryHandler()` - 标记类为查询处理器
- `@QueryCache()` - 配置查询缓存
- `@QueryPrefetch()` - 配置预加载
- `@QueryDataSource()` - 配置数据源
- `@QueryPagination()` - 配置分页支持

### 事件装饰器

- `@EventHandler()` - 标记类为事件处理器
- `@EventRetry()` - 配置重试策略
- `@EventDeadLetter()` - 配置死信队列
- `@EventConcurrency()` - 配置并发控制
- `@EventRateLimit()` - 配置限流

## 中间件

### 命令中间件

```typescript
// 添加自定义命令中间件
commandBus.addMiddleware(new CustomCommandMiddleware());
```

### 查询中间件

```typescript
// 添加自定义查询中间件
queryBus.addMiddleware(new CustomQueryMiddleware());
```

### 事件中间件

```typescript
// 添加自定义事件中间件
eventBus.addMiddleware(new CustomEventMiddleware());
```

## 最佳实践

1. **命令设计**：命令应该是意图明确的，包含执行操作所需的所有数据
2. **查询设计**：查询应该是只读的，根据需要配置适当的缓存策略
3. **事件设计**：事件应该是不可变的，包含足够的信息用于处理
4. **错误处理**：使用适当的错误码和错误消息
5. **验证**：在处理器中实现验证逻辑
6. **日志记录**：使用装饰器启用适当的日志记录
7. **缓存策略**：根据数据特性配置合适的缓存时间

## 性能优化

1. **查询缓存**：合理配置缓存时间，减少数据库访问
2. **预加载**：在适当时机预加载可能需要的数据
3. **批量操作**：使用事件总线进行批量操作
4. **异步处理**：对于耗时操作使用异步命令处理器
5. **连接池**：配置适当的数据库连接池大小

## 监控和调试

1. **日志记录**：启用适当的日志级别
2. **指标收集**：使用装饰器收集性能指标
3. **健康检查**：定期检查总线状态
4. **缓存统计**：监控缓存命中率
5. **错误追踪**：记录和分析错误模式

## 扩展性

本模块设计为高度可扩展的：

1. **自定义总线**：可以提供自定义的总线实现
2. **自定义中间件**：可以添加自定义中间件
3. **自定义装饰器**：可以创建自定义装饰器
4. **插件系统**：支持插件式扩展
5. **多数据源**：支持多种数据源

## 故障排除

1. **处理器注册失败**：检查装饰器使用是否正确
2. **缓存问题**：检查缓存配置和键生成策略
3. **事件处理失败**：检查事件处理器配置和重试策略
4. **性能问题**：使用日志和指标分析瓶颈
5. **内存泄漏**：定期清理过期缓存和状态

## 示例项目

查看 `examples/` 目录中的完整示例，了解如何在实际项目中使用此CQRS系统。