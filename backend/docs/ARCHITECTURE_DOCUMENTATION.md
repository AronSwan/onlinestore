# 架构文档和代码注释规范

## 📋 概述

本文档详细描述后端系统的架构设计、代码规范和注释标准，确保代码质量和可维护性。

## 🏗️ 系统架构

### 整体架构图
```
┌─────────────────────────────────────────────────────────────────┐
│                          客户端层                                │
│                    (Web/Mobile/API)                            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                        API网关层                                │
│              (Nginx反向代理 + 负载均衡)                         │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                       应用服务层                                │
│          (NestJS应用集群 + 进程管理)                           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                       业务逻辑层                                │
│        (控制器 + 服务 + 实体 + 中间件)                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────┬───────────────┬───────────────┬───────────────────┐
│   缓存层    │   消息队列     │   数据库层     │    外部服务       │
│   (Redis)   │  (Redpanda)   │   (MySQL)     │   (支付/短信)     │
└─────────────┴───────────────┴───────────────┴───────────────────┘
```

### 技术栈说明

#### 核心框架
- **NestJS**: 企业级Node.js框架，提供完整的MVC架构
- **TypeORM**: 类型安全的ORM，支持MySQL、PostgreSQL等
- **TypeScript**: 强类型JavaScript超集，提高代码质量

#### 数据存储
- **TiDB**: 分布式关系型数据库（生产环境）
- **MySQL**: 开发环境数据库
- **Redis**: 缓存和会话存储
- **Redpanda**: 高性能消息队列（Kafka兼容）

#### 基础设施
- **Kubernetes**: 容器编排和分布式部署
- **PM2**: 进程管理和监控
- **Nginx**: 反向代理和负载均衡

## 📁 项目结构

### 目录结构说明
```
backend/
├── src/                          # 源代码目录
│   ├── auth/                     # 认证模块
│   │   ├── auth.controller.ts    # 认证控制器
│   │   ├── auth.service.ts       # 认证服务
│   │   ├── guards/               # 认证守卫
│   │   ├── strategies/           # 认证策略
│   │   └── dto/                  # 数据传输对象
│   ├── products/                # 商品模块
│   │   ├── products.controller.ts
│   │   ├── products.service.ts
│   │   ├── entities/             # 实体定义
│   │   └── dto/
│   ├── orders/                   # 订单模块
│   ├── users/                    # 用户模块
│   ├── common/                   # 公共模块
│   │   ├── filters/              # 异常过滤器
│   │   ├── interceptors/         # 拦截器
│   │   ├── decorators/           # 装饰器
│   │   └── pipes/                # 管道
│   ├── config/                   # 配置模块
│   ├── database/                 # 数据库配置
│   ├── cache/                    # 缓存模块
│   ├── messaging/                # 消息队列模块
│   └── main.ts                   # 应用入口
├── test/                         # 测试代码
├── dist/                         # 编译输出
├── logs/                         # 日志文件
└── docs/                         # 项目文档
```

### 模块依赖关系
```
main.ts
  └── AppModule
      ├── AuthModule
      ├── ProductsModule
      ├── OrdersModule
      ├── UsersModule
      ├── DatabaseModule
      ├── CacheModule
      └── MessagingModule
```

## 💻 代码注释规范

### 文件头注释
```typescript
/**
 * @file 商品服务模块
 * @description 提供商品相关的业务逻辑处理，包括CRUD操作、库存管理、缓存策略等
 * @author 开发团队
 * @version 1.0.0
 * @created 2025-09-30
 * @updated 2025-09-30
 */
```

### 类注释
```typescript
/**
 * 商品服务类
 * 
 * 负责处理商品相关的业务逻辑，包括：
 * - 商品信息的增删改查
 * - 库存管理和验证
 * - 价格计算和优惠处理
 * - 缓存策略实现
 * 
 * @example
 * ```typescript
 * const productService = new ProductsService();
 * const products = await productService.findAll({ page: 1, limit: 20 });
 * ```
 * 
 * @class ProductsService
 * @Injectable
 */
@Injectable()
export class ProductsService {
  // 类实现
}
```

### 方法注释
```typescript
/**
 * 根据ID获取商品详情
 * 
 * 该方法会优先从缓存中获取商品信息，如果缓存不存在则查询数据库，
 * 并将结果缓存起来以提高后续访问性能。
 * 
 * @param {number} id - 商品ID
 * @param {boolean} [useCache=true] - 是否使用缓存，默认为true
 * 
 * @returns {Promise<Product>} 商品实体对象
 * 
 * @throws {NotFoundException} 当商品不存在时抛出
 * @throws {DatabaseException} 当数据库查询失败时抛出
 * 
 * @example
 * ```typescript
 * const product = await productsService.findById(1);
 * console.log(product.name); // 输出商品名称
 * ```
 * 
 * @async
 */
async findById(id: number, useCache: boolean = true): Promise<Product> {
  // 方法实现
}
```

### 属性注释
```typescript
/**
 * 商品库存数量
 * 
 * 该属性表示商品的当前库存数量，当库存为0时商品将自动下架。
 * 库存变更时会触发相应的事件通知。
 * 
 * @type {number}
 * @default 0
 * @min 0
 * @max 1000000
 */
@Column({ type: 'int', default: 0 })
stock: number;
```

### 接口注释
```typescript
/**
 * 商品查询参数接口
 * 
 * 定义商品列表查询时支持的参数类型和约束条件。
 * 
 * @interface ProductQueryParams
 */
interface ProductQueryParams {
  /**
   * 页码，从1开始
   * @type {number}
   * @default 1
   * @minimum 1
   */
  page?: number;
  
  /**
   * 每页数量
   * @type {number}
   * @default 20
   * @minimum 1
   * @maximum 100
   */
  limit?: number;
  
  /**
   * 分类筛选
   * @type {string}
   */
  category?: string;
}
```

## 🔧 核心模块详解

### 认证模块 (AuthModule)

#### 功能职责
- 用户注册和登录
- JWT令牌生成和验证
- 权限控制和角色管理
- 会话管理和安全防护

#### 核心组件
```typescript
/**
 * JWT认证守卫
 * 
 * 保护需要认证的接口，验证JWT令牌的有效性。
 * 如果令牌无效或过期，将返回401错误。
 * 
 * @class JwtAuthGuard
 * @extends AuthGuard('jwt')
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // 实现细节
}
```

### 商品模块 (ProductsModule)

#### 功能职责
- 商品信息管理
- 库存跟踪和预警
- 价格策略和优惠
- 分类和标签管理

#### 缓存策略
```typescript
/**
 * 商品缓存键生成器
 * 
 * 统一管理商品相关的缓存键命名规则，确保键的唯一性和可读性。
 * 
 * @class ProductCacheKeys
 */
export class ProductCacheKeys {
  /**
   * 生成商品详情缓存键
   * @param id 商品ID
   * @returns 缓存键
   */
  static productDetail(id: number): string {
    return `product:detail:${id}`;
  }
  
  /**
   * 生成商品列表缓存键
   * @param params 查询参数
   * @returns 缓存键
   */
  static productList(params: ProductQueryParams): string {
    const key = Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&');
    return `product:list:${Buffer.from(key).toString('base64')}`;
  }
}
```

### 订单模块 (OrdersModule)

#### 功能职责
- 订单创建和处理
- 支付集成和验证
- 库存扣减和恢复
- 订单状态跟踪

#### 事务处理
```typescript
/**
 * 订单创建服务
 * 
 * 处理订单创建的完整业务流程，包括库存验证、价格计算、
 * 支付预处理等，所有操作在数据库事务中执行以确保数据一致性。
 * 
 * @class OrderCreationService
 * @Injectable
 */
@Injectable()
export class OrderCreationService {
  /**
   * 创建新订单
   * 
   * 该方法执行以下步骤：
   * 1. 开启数据库事务
   * 2. 验证商品库存
   * 3. 计算订单总价
   * 4. 创建订单记录
   * 5. 扣减商品库存
   * 6. 提交事务或回滚
   * 
   * @param orderData 订单数据
   * @returns 创建的订单
   */
  async createOrder(orderData: CreateOrderDto): Promise<Order> {
    // 实现细节
  }
}
```

## 🚀 性能优化策略

### 数据库优化
```typescript
/**
 * 数据库查询优化器
 * 
 * 提供高效的数据库查询方法，包括：
 * - 分页查询优化
 * - 关联查询预加载
 * - 查询结果缓存
 * - 慢查询监控
 * 
 * @class QueryOptimizer
 */
export class QueryOptimizer {
  /**
   * 优化分页查询
   * 
   * 使用游标分页替代偏移分页，提高大数据量下的查询性能。
   * 
   * @param queryBuilder 查询构建器
   * @param cursor 游标值
   * @param limit 每页数量
   * @returns 优化后的查询
   */
  optimizePagination(
    queryBuilder: SelectQueryBuilder<any>,
    cursor: string,
    limit: number
  ): SelectQueryBuilder<any> {
    // 实现细节
  }
}
```

### 缓存策略
```typescript
/**
 * 多级缓存管理器
 * 
 * 实现内存缓存 + Redis缓存的二级缓存策略，提供：
 * - 本地内存缓存（快速访问）
 * - Redis分布式缓存（数据共享）
 * - 缓存穿透防护
 * - 缓存雪崩防护
 * 
 * @class MultiLevelCacheManager
 * @Injectable
 */
@Injectable()
export class MultiLevelCacheManager {
  /**
   * 获取缓存数据
   * 
   * 优先从内存缓存获取，如果不存在则查询Redis，
   * 如果Redis也不存在则执行回调函数获取数据并缓存。
   * 
   * @param key 缓存键
   * @param callback 数据获取回调
   * @param ttl 缓存时间（秒）
   * @returns 缓存数据
   */
  async get<T>(key: string, callback: () => Promise<T>, ttl: number): Promise<T> {
    // 实现细节
  }
}
```

## 🔒 安全考虑

### 输入验证
```typescript
/**
 * 安全输入验证管道
 * 
 * 对用户输入进行严格验证，防止SQL注入、XSS攻击等安全威胁。
 * 
 * @class ValidationPipe
 * @extends Built-in ValidationPipe
 */
export class SecureValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,        // 移除不在DTO中的属性
      forbidNonWhitelisted: true, // 禁止未知属性
      transform: true,        // 自动类型转换
      forbidUnknownValues: true, // 禁止未知值
    });
  }
}
```

### 速率限制
```typescript
/**
 * 智能速率限制器
 * 
 * 根据用户行为和IP地址实施动态速率限制，防止恶意请求和DDoS攻击。
 * 
 * @class SmartThrottlerGuard
 * @Injectable
 */
@Injectable()
export class SmartThrottlerGuard {
  /**
   * 检查请求频率
   * 
   * 根据用户ID、IP地址和接口类型计算请求频率，
   * 如果超过阈值则拒绝请求。
   * 
   * @param context 执行上下文
   * @returns 是否允许请求
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 实现细节
  }
}
```

## 📊 监控和日志

### 性能监控
```typescript
/**
 * 性能监控中间件
 * 
 * 记录每个API请求的执行时间、内存使用等性能指标，
 * 并上报到监控系统。
 * 
 * @class PerformanceMiddleware
 * @Injectable
 */
@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const memoryUsage = process.memoryUsage();
      
      // 记录性能指标
      this.metrics.recordApiCall({
        method: req.method,
        path: req.path,
        duration,
        memory: memoryUsage.heapUsed,
        statusCode: res.statusCode,
      });
    });
    
    next();
  }
}
```

### 结构化日志
```typescript
/**
 * 结构化日志服务
 * 
 * 提供统一的日志记录接口，支持不同日志级别和结构化数据输出。
 * 
 * @class StructuredLogger
 * @Injectable
 */
@Injectable()
export class StructuredLogger {
  /**
   * 记录业务日志
   * 
   * @param level 日志级别
   * @param message 日志消息
   * @param context 日志上下文
   * @param metadata 元数据
   */
  log(level: LogLevel, message: string, context?: any, metadata?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      metadata,
      pid: process.pid,
    };
    
    // 输出到文件和控制台
    console.log(JSON.stringify(logEntry));
  }
}
```

## 🔄 部署和运维

### 健康检查
```typescript
/**
 * 综合健康检查服务
 * 
 * 检查应用各个组件的健康状态，包括：
 * - 数据库连接
 * - Redis连接
 * - 外部服务依赖
 * - 系统资源使用
 * 
 * @class HealthCheckService
 * @Injectable
 */
@Injectable()
export class HealthCheckService {
  /**
   * 执行健康检查
   * 
   * @returns 健康检查结果
   */
  async check(): Promise<HealthCheckResult> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        memory: this.checkMemory(),
        disk: this.checkDisk(),
      },
    };
  }
}
```

---

**最后更新**: 2025-09-30  
**文档版本**: v1.0.0