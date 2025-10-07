# NestJS 最佳实践

## 📋 概述
本文档总结了在 Caddy Style Shopping 项目中使用的 NestJS 最佳实践和编码规范。

## 🏗️ 架构设计

### 模块组织
```typescript
// 推荐的项目结构
src/
├── modules/          // 业务模块
├── shared/           // 共享模块
├── config/           // 配置模块
└── main.ts          // 入口文件
```

### 依赖注入
```typescript
// 使用构造函数注入
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly cacheService: CacheService
  ) {}
}
```

## 🔧 代码规范

### 命名约定
- **模块**: 使用复数形式 (`UsersModule`)
- **服务**: 使用单数形式 (`UserService`)
- **控制器**: 使用复数形式 (`UsersController`)

### 错误处理
```typescript
// 使用异常过滤器
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

## 📊 性能优化

### 懒加载模块
```typescript
// 使用懒加载减少启动时间
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
```

### 缓存策略
```typescript
// 使用装饰器缓存
@Cacheable({ ttl: 300 })
async findUserById(id: string): Promise<User> {
  return this.userRepository.findOne(id);
}
```

## 🔒 安全实践

### 输入验证
```typescript
// 使用 class-validator
export class CreateUserDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;
}
```

### 认证授权
```typescript
// 使用守卫保护路由
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@Request() req) {
  return req.user;
}
```

## 📈 监控和日志

### 结构化日志
```typescript
// 使用 Winston 记录结构化日志
const logger = Winston.createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [new transports.Console()],
});
```

### 性能监控
```typescript
// 使用 OpenTelemetry 监控性能
const meter = metrics.getMeter('user-service');
const requestCounter = meter.createCounter('requests');
```

## 📚 学习资源
- [NestJS 官方文档](https://docs.nestjs.com)
- [TypeScript 最佳实践](https://www.typescriptlang.org/docs)
- [Node.js 性能优化](https://nodejs.org/docs)

*最后更新: 2025年10月5日*