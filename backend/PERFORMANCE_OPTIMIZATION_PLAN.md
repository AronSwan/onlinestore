# 性能优化详细方案

> 🚀 **目标**: API响应时间减少40%，并发能力提升3倍  
> 📊 **当前基线**: 建立性能基准测试  
> 🎯 **预期收益**: 用户体验显著提升，系统承载能力大幅增强

## 🎯 性能优化目标

### 核心指标
| 性能指标 | 当前状态 | 目标状态 | 改进幅度 |
|---------|----------|----------|----------|
| API平均响应时间 | 基准值 | -40% | 显著提升 |
| 并发用户数 | 300用户 | 1000用户 | 233%提升 |
| 数据库查询时间 | 基准值 | -50% | 大幅优化 |
| 内存使用峰值 | 基准值 | -30% | 资源优化 |
| CPU使用率 | 基准值 | -25% | 效率提升 |

## 🗄️ 数据库性能优化

### 1. 查询优化策略

#### N+1查询问题解决
```typescript
// ❌ 优化前：N+1查询问题
async getOrdersWithItems() {
  const orders = await this.orderRepository.find();
  for (const order of orders) {
    order.items = await this.orderItemRepository.find({ 
      where: { orderId: order.id } 
    });
  }
  return orders;
}

// ✅ 优化后：使用关联查询
async getOrdersWithItems() {
  return await this.orderRepository.find({
    relations: ['items', 'user', 'payment'],
    select: {
      id: true,
      status: true,
      total: true,
      items: {
        id: true,
        productName: true,
        quantity: true,
        price: true
      }
    }
  });
}
```

#### 分页查询优化
```typescript
// ✅ 高效分页实现
@Injectable()
export class OptimizedPaginationService {
  async findWithCursorPagination<T>(
    repository: Repository<T>,
    options: {
      cursor?: string;
      limit: number;
      orderBy: string;
      where?: any;
    }
  ) {
    const queryBuilder = repository.createQueryBuilder('entity');
    
    if (options.where) {
      queryBuilder.where(options.where);
    }
    
    if (options.cursor) {
      queryBuilder.andWhere(`entity.${options.orderBy} > :cursor`, {
        cursor: options.cursor
      });
    }
    
    const items = await queryBuilder
      .orderBy(`entity.${options.orderBy}`, 'ASC')
      .limit(options.limit + 1)
      .getMany();
    
    const hasNextPage = items.length > options.limit;
    if (hasNextPage) items.pop();
    
    return {
      items,
      hasNextPage,
      nextCursor: hasNextPage ? items[items.length - 1][options.orderBy] : null
    };
  }
}
```

### 2. 索引优化策略

#### 复合索引设计
```sql
-- 购物车表索引优化
CREATE INDEX idx_cart_user_select_created ON cart_items(customer_user_id, select_flag, created_at);
CREATE INDEX idx_cart_product_sku ON cart_items(product_id, product_sku_id);
CREATE INDEX idx_cart_user_updated ON cart_items(customer_user_id, updated_at DESC);

-- 订单表索引优化
CREATE INDEX idx_order_user_status_created ON orders(user_id, status, created_at DESC);
CREATE INDEX idx_order_status_updated ON orders(status, updated_at DESC);
CREATE INDEX idx_order_total_created ON orders(total_amount, created_at DESC);

-- 产品表索引优化
CREATE INDEX idx_product_category_price ON products(category_id, price);
CREATE INDEX idx_product_brand_status ON products(brand, status);
CREATE INDEX idx_product_search_text ON products USING GIN(to_tsvector('english', name || ' ' || description));
```

### 3. 连接池优化
```typescript
// config/database.config.ts
export const databaseConfig = {
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  
  // 连接池优化配置
  extra: {
    connectionLimit: 20,        // 最大连接数
    acquireTimeout: 60000,      // 获取连接超时时间
    timeout: 60000,             // 查询超时时间
    reconnect: true,            // 自动重连
    idleTimeout: 300000,        // 空闲连接超时
    maxReusedConnections: 100,  // 连接复用次数
  },
  
  // 查询优化
  cache: {
    duration: 30000, // 30秒查询缓存
  },
  
  // 日志优化
  logging: process.env.NODE_ENV === 'development' ? 'all' : ['error'],
  maxQueryExecutionTime: 1000, // 慢查询阈值
};
```

## 🚀 缓存策略优化

### 1. 多级缓存架构

#### L1缓存：应用内存缓存
```typescript
@Injectable()
export class L1CacheService {
  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly defaultTTL = 60000; // 1分钟

  set(key: string, value: any, ttl = this.defaultTTL): void {
    this.cache.set(key, {
      data: value,
      expiry: Date.now() + ttl
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  // 定期清理过期缓存
  @Cron('*/5 * * * *') // 每5分钟清理一次
  cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}
```

#### L2缓存：Redis分布式缓存
```typescript
@Injectable()
export class OptimizedCacheService {
  constructor(
    private readonly l1Cache: L1CacheService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    // 1. 先查L1缓存
    const l1Result = this.l1Cache.get<T>(key);
    if (l1Result) {
      return l1Result;
    }

    // 2. 查L2缓存
    const l2Result = await this.redis.get(key);
    if (l2Result) {
      const parsed = JSON.parse(l2Result);
      // 回填L1缓存
      this.l1Cache.set(key, parsed, 30000); // 30秒
      return parsed;
    }

    return null;
  }

  async set(key: string, value: any, ttl = 3600): Promise<void> {
    // 同时设置L1和L2缓存
    this.l1Cache.set(key, value, Math.min(ttl * 1000, 60000));
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    // 清除L2缓存
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    
    // 清除L1缓存（简单实现，生产环境可优化）
    this.l1Cache.clear();
  }
}
```

### 2. 缓存策略实现

#### 查询结果缓存
```typescript
@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: Repository<Product>,
    private readonly cacheService: OptimizedCacheService,
  ) {}

  async findById(id: string): Promise<Product | null> {
    const cacheKey = `product:${id}`;
    
    // 先查缓存
    const cached = await this.cacheService.get<Product>(cacheKey);
    if (cached) {
      return cached;
    }

    // 查数据库
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'brand']
    });

    if (product) {
      // 缓存结果，TTL 1小时
      await this.cacheService.set(cacheKey, product, 3600);
    }

    return product;
  }

  async updateProduct(id: string, updateData: Partial<Product>): Promise<Product> {
    const product = await this.productRepository.save({ id, ...updateData });
    
    // 更新后清除相关缓存
    await this.cacheService.invalidate(`product:${id}`);
    await this.cacheService.invalidate(`products:category:${product.categoryId}*`);
    
    return product;
  }
}
```

## 🔄 API响应优化

### 1. 响应压缩和格式优化

#### 全局压缩中间件
```typescript
// main.ts
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 启用压缩
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 1024, // 只压缩大于1KB的响应
  }));
  
  await app.listen(3000);
}
```

#### 响应格式标准化
```typescript
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        const response = context.switchToHttp().getResponse();
        const request = context.switchToHttp().getRequest();
        
        // 标准化响应格式
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
          path: request.url,
          ...(data?.pagination && { pagination: data.pagination }),
        };
      }),
      catchError(error => {
        throw error;
      })
    );
  }
}
```

### 2. 分页和过滤优化

#### 智能分页实现
```typescript
@Controller('api/v1/products')
export class ProductController {
  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5分钟缓存
  async getProducts(
    @Query() query: ProductQueryDto,
  ): Promise<PaginatedResponse<Product>> {
    const {
      page = 1,
      limit = 20,
      category,
      brand,
      minPrice,
      maxPrice,
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = query;

    // 构建查询条件
    const where: any = {};
    if (category) where.categoryId = category;
    if (brand) where.brand = brand;
    if (minPrice || maxPrice) {
      where.price = Between(minPrice || 0, maxPrice || 999999);
    }

    // 执行查询
    const [items, total] = await this.productService.findAndCount({
      where,
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['category', 'brand'],
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }
}
```

## 🔧 应用层优化

### 1. 异步处理优化

#### 队列处理系统
```typescript
@Processor('email')
export class EmailProcessor {
  @Process('send-welcome')
  async sendWelcomeEmail(job: Job<{ userId: string; email: string }>) {
    const { userId, email } = job.data;
    
    try {
      await this.emailService.sendWelcomeEmail(email);
      
      // 更新用户状态
      await this.userService.markEmailSent(userId);
      
    } catch (error) {
      // 重试机制
      if (job.attemptsMade < 3) {
        throw error; // 触发重试
      }
      
      // 记录失败
      await this.logService.logEmailFailure(userId, error);
    }
  }
}

// 使用队列
@Injectable()
export class UserService {
  constructor(
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  async createUser(userData: CreateUserDto): Promise<User> {
    const user = await this.userRepository.save(userData);
    
    // 异步发送欢迎邮件
    await this.emailQueue.add('send-welcome', {
      userId: user.id,
      email: user.email,
    }, {
      delay: 1000, // 1秒后执行
      attempts: 3,
      backoff: 'exponential',
    });
    
    return user;
  }
}
```

### 2. 内存优化

#### 对象池模式
```typescript
@Injectable()
export class ObjectPoolService<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    maxSize = 100
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }
}

// 使用示例：数据库连接池
@Injectable()
export class DatabaseService {
  private connectionPool = new ObjectPoolService(
    () => new DatabaseConnection(),
    (conn) => conn.reset(),
    20
  );

  async executeQuery(sql: string): Promise<any> {
    const connection = this.connectionPool.acquire();
    try {
      return await connection.query(sql);
    } finally {
      this.connectionPool.release(connection);
    }
  }
}
```

## 📊 性能监控

### 1. 性能指标收集

#### 自定义性能监控
```typescript
@Injectable()
export class PerformanceMonitoringService {
  private readonly histogram = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5],
  });

  private readonly counter = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
  });

  recordRequest(method: string, route: string, status: number, duration: number): void {
    this.histogram.labels(method, route, status.toString()).observe(duration);
    this.counter.labels(method, route, status.toString()).inc();
  }

  @Cron('*/30 * * * * *') // 每30秒
  async collectSystemMetrics(): Promise<void> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // 记录系统指标
    await this.metricsService.recordSystemMetrics({
      memoryUsed: memUsage.heapUsed,
      memoryTotal: memUsage.heapTotal,
      cpuUser: cpuUsage.user,
      cpuSystem: cpuUsage.system,
    });
  }
}
```

### 2. 性能基准测试

#### 自动化性能测试
```typescript
// test/performance/api-performance.spec.ts
describe('API Performance Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should handle 100 concurrent product requests under 500ms', async () => {
    const requests = Array(100).fill(null).map(() =>
      request(app.getHttpServer())
        .get('/api/v1/products')
        .expect(200)
    );

    const startTime = Date.now();
    await Promise.all(requests);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(500);
  });

  it('should maintain response time under load', async () => {
    const results: number[] = [];
    
    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();
      await request(app.getHttpServer())
        .get('/api/v1/products/1')
        .expect(200);
      results.push(Date.now() - startTime);
    }

    const avgResponseTime = results.reduce((a, b) => a + b) / results.length;
    expect(avgResponseTime).toBeLessThan(100); // 平均响应时间小于100ms
  });
});
```

## 🎯 实施计划

### Week 1-2: 数据库优化
- **Day 1-3**: 索引分析和优化
- **Day 4-6**: 查询优化和连接池配置
- **Day 7**: 性能测试和验证

### Week 3-4: 缓存系统
- **Day 1-3**: 多级缓存架构实现
- **Day 4-6**: 缓存策略优化
- **Day 7**: 缓存效果验证

### Week 5-6: API优化
- **Day 1-3**: 响应格式和压缩优化
- **Day 4-6**: 分页和过滤优化
- **Day 7**: API性能测试

### 验收标准
- [ ] API平均响应时间减少40%
- [ ] 并发用户数支持1000+
- [ ] 数据库慢查询减少80%
- [ ] 内存使用峰值降低30%
- [ ] 所有性能测试通过

---

**文档版本**: v1.0  
**最后更新**: 2025-10-07  
**负责人**: 性能优化团队