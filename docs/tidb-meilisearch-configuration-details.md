# TiDB、Redis、MeiliSearch 详细配置说明

## 概述

本文档详细说明 Caddy Style Shopping Site 中 TiDB 分布式数据库、Redis 缓存和 MeiliSearch 搜索引擎的具体配置和架构。

## 🚀 TiDB 分布式数据库配置

### Docker Compose 配置

```yaml
version: "3.8"
services:
  pd:
    image: pingcap/pd:v7.5.0
    container_name: tidb-pd
    command:
      - --name=pd
      - --client-urls=http://0.0.0.0:2379
      - --peer-urls=http://0.0.0.0:2380
      - --advertise-client-urls=http://pd:2379
      - --advertise-peer-urls=http://pd:2380
      - --initial-cluster=pd=http://pd:2380
      - --data-dir=/data/pd
    ports:
      - "2379:2379"
    volumes:
      - pd-data:/data
    networks: [tidb-net]

  tikv:
    image: pingcap/tikv:v7.5.0
    container_name: tidb-tikv
    command:
      - --addr=0.0.0.0:20160
      - --advertise-addr=tikv:20160
      - --data-dir=/data/tikv
      - --pd=pd:2379
    depends_on: [pd]
    networks: [tidb-net]
    volumes:
      - tikv-data:/data

  tidb:
    image: pingcap/tidb:v7.5.0
    container_name: tidb-server
    command:
      - --store=tikv
      - --path=pd:2379
      - --advertise-address=tidb
      - --log-level=warn
    ports:
      - "4000:4000"
      - "10080:10080"
    depends_on: [pd, tikv]
    networks: [tidb-net]

networks:
  tidb-net:

volumes:
  pd-data:
  tikv-data:
```

### 配置特点

#### 1. 分布式架构
- **PD (Placement Driver)**: 集群调度器，管理元数据
- **TiKV**: 分布式存储引擎，支持事务
- **TiDB**: SQL计算层，兼容MySQL协议

#### 2. 版本选择
- **TiDB v7.5.0**: 最新稳定版本，性能优异
- **分布式特性**: 自动分片、负载均衡、故障转移

#### 3. 网络配置
- **内部网络**: `tidb-net` 集群内部通信
- **端口映射**: 
  - `4000`: TiDB SQL服务端口
  - `10080`: TiDB 状态端口
  - `2379`: PD 客户端端口

### TiDB 架构优势

#### 1. 水平扩展
```sql
-- 自动分片，无需手动分表
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 支持分布式事务
BEGIN;
INSERT INTO orders (user_id, total_amount) VALUES (1, 100.00);
UPDATE products SET stock = stock - 1 WHERE id = 1;
COMMIT;
```

#### 2. 高可用性
- **多副本存储**: 数据自动复制多个副本
- **自动故障转移**: 节点故障自动切换
- **在线扩容**: 无需停机添加节点

#### 3. MySQL 兼容
```typescript
// TypeORM 配置
const dbConfig = {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 4000,
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'shopping_db',
    entities: [/* ... */],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    extra: {
        connectionLimit: 20,
        acquireTimeout: 60000,
        timeout: 30000,
        idleTimeout: 300000,
    }
};
```

### 数据库架构设计

#### 核心业务表结构
```sql
-- 用户系统
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_created_at (created_at)
);

-- 商品系统
CREATE TABLE products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id BIGINT,
    stock INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_products_category_id (category_id),
    INDEX idx_products_is_active (is_active),
    INDEX idx_products_name (name)
);

-- 订单系统
CREATE TABLE orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id BIGINT,
    status VARCHAR(20) DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_orders_user_id (user_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_created_at (created_at)
);
```

## 🔄 Redis 缓存配置

### Docker Compose 配置

```yaml
redis:
  image: redis:7-alpine
  container_name: shopping-redis
  restart: unless-stopped
  command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
  volumes:
    - redis_data:/data
    - ./docker/redis/redis.conf:/etc/redis/redis.conf:ro
  networks:
    - shopping-network
  ports:
    - "6379:6379"
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 10s
```

### Redis 配置文件详解

#### 1. 网络配置
```conf
# 绑定所有网络接口
bind 0.0.0.0
port 6379
timeout 300
tcp-keepalive 60
```

#### 2. 持久化配置
```conf
# RDB 快照配置
save 900 1    # 15分钟内有1个key变化就保存
save 300 10   # 5分钟内有10个key变化就保存
save 60 10000 # 1分钟内有10000个key变化就保存

# AOF 持久化配置
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec  # 每秒同步一次
```

#### 3. 内存管理
```conf
# 最大内存限制
maxmemory 512mb
maxmemory-policy allkeys-lru  # LRU淘汰策略
maxmemory-samples 5
```

### Redis 在系统中的应用

#### 1. 缓存策略
```typescript
// 购物车缓存
const cartKey = `cart:${userId}`;
await redis.setex(cartKey, 3600, JSON.stringify(cartItems));

// 商品信息缓存
const productKey = `product:${productId}`;
await redis.setex(productKey, 1800, JSON.stringify(productInfo));

// 用户会话缓存
const sessionKey = `session:${sessionId}`;
await redis.setex(sessionKey, 86400, JSON.stringify(userData));
```

#### 2. 分布式锁
```typescript
// 购物车操作锁
const lockKey = `lock:cart:${userId}`;
const lockValue = `${Date.now()}-${Math.random()}`;
const lockTTL = 30;

const acquired = await redis.set(lockKey, lockValue, 'PX', lockTTL * 1000, 'NX');
if (acquired) {
    try {
        // 执行购物车操作
        await updateCart(userId, items);
    } finally {
        // 释放锁
        await redis.del(lockKey);
    }
}
```

#### 3. 限流控制
```typescript
// API 限流
const rateLimitKey = `rate_limit:${userId}:${endpoint}`;
const current = await redis.incr(rateLimitKey);
if (current === 1) {
    await redis.expire(rateLimitKey, 60); // 1分钟窗口
}
if (current > limit) {
    throw new RateLimitExceededException();
}
```

## 🔍 MeiliSearch 搜索配置

### Docker Compose 配置

```yaml
meilisearch:
  image: getmeili/meilisearch:v1.5
  container_name: shopping-meilisearch
  restart: unless-stopped
  environment:
    - MEILI_MASTER_KEY=masterKey
    - MEILI_ENV=production
  volumes:
    - meilisearch_data:/meili_data
  networks:
    - shopping-network
  ports:
    - "7700:7700"
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:7700/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 10s
```

### 配置特点

#### 1. 轻量级搜索引擎
- **MeiliSearch v1.5**: 快速、轻量级的全文搜索引擎
- **RESTful API**: 简单易用的HTTP API
- **实时索引**: 数据变更实时可搜索

#### 2. 安全配置
- **主密钥**: `MEILI_MASTER_KEY` 保护API安全
- **生产环境**: `MEILI_ENV=production` 启用安全模式

#### 3. 数据持久化
- **数据卷**: `meilisearch_data` 持久化索引数据
- **健康检查**: 30秒间隔检查服务可用性

### MeiliSearch 搜索架构

#### 1. 商品索引结构
```typescript
// 索引设置
await meiliClient.index('products').updateSettings({
    searchableAttributes: ['name', 'description', 'tags', 'category'],
    filterableAttributes: ['categoryId', 'price', 'tags', 'stock', 'isActive'],
    sortableAttributes: ['price', 'createdAt', 'updatedAt'],
    rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness'
    ],
    stopWords: ['the', 'a', 'an', 'and', 'or', 'but'],
    synonyms: {
        'phone': ['telephone', 'mobile'],
        'laptop': ['notebook', 'computer']
    }
});
```

#### 2. 搜索功能实现
```typescript
@Injectable()
export class MeiliSearchService implements SearchStrategy {
    private baseUrl: string;
    private apiKey: string;
    private indexName = 'products';

    constructor(
        private configService: ConfigService,
        private httpService: HttpService,
    ) {
        this.baseUrl = this.configService.get<string>('search.meilisearch.host') || 'http://localhost:7700';
        this.apiKey = this.configService.get<string>('search.meilisearch.apiKey') || 'masterKey';
    }

    async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
        const url = `${this.baseUrl}/indexes/${this.indexName}/search`;
        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
        };

        const searchOptions: any = {
            q: query,
            limit: options.limit || 20,
            offset: options.offset || 0,
        };

        if (options.filters) {
            searchOptions.filter = this.buildFilters(options.filters);
        }

        if (options.sortBy) {
            searchOptions.sort = [`${options.sortBy}:${options.sortOrder || 'asc'}`];
        }

        const response = await firstValueFrom(
            this.httpService.post(url, searchOptions, { headers }),
        );

        return {
            hits: response.data.hits.map((hit: Record<string, any>) => this.transformHit(hit)),
            total: response.data.estimatedTotalHits || response.data.totalHits || 0,
            processingTimeMs: response.data.processingTimeMs,
            query,
            facets: response.data.facetDistribution,
        };
    }

    private buildFilters(filters: Record<string, any>): string {
        const filterParts: string[] = [];

        if (filters.categoryId) {
            filterParts.push(`categoryId = ${filters.categoryId}`);
        }

        if (filters.minPrice !== undefined) {
            filterParts.push(`price >= ${filters.minPrice}`);
        }

        if (filters.maxPrice !== undefined) {
            filterParts.push(`price <= ${filters.maxPrice}`);
        }

        if (filters.tags && filters.tags.length > 0) {
            const tagFilters = filters.tags.map((tag: string) => `tags = "${tag}"`).join(' OR ');
            filterParts.push(`(${tagFilters})`);
        }

        if (filters.isActive !== undefined) {
            filterParts.push(`isActive = ${filters.isActive}`);
        }

        return filterParts.join(' AND ');
    }
}
```

#### 3. 索引管理
```typescript
// 批量索引产品
async indexProducts(products: ProductIndexData[]): Promise<void> {
    const url = `${this.baseUrl}/indexes/${this.indexName}/documents`;
    const headers = {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
    };

    const documents = products.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice,
        category: product.category,
        categoryId: product.categoryId,
        tags: product.tags,
        stock: product.stock,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        specifications: product.specifications,
    }));

    await firstValueFrom(this.httpService.post(url, documents, { headers }));
}

// 删除产品索引
async deleteProduct(productId: string): Promise<void> {
    const url = `${this.baseUrl}/indexes/${this.indexName}/documents/${productId}`;
    const headers = {
        Authorization: `Bearer ${this.apiKey}`,
    };

    await firstValueFrom(this.httpService.delete(url, { headers }));
}
```

## 🔗 系统集成配置

### 1. 后端应用配置

#### TiDB 连接配置
```typescript
// TypeORM 配置
const dbConfig = {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 4000,
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'shopping_db',
    entities: [User, Product, Order, CartItem, Payment],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    extra: {
        connectionLimit: 20,
        acquireTimeout: 60000,
        timeout: 30000,
        idleTimeout: 300000,
    }
};
```

#### Redis 连接配置
```typescript
// Redis 配置
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB) || 0,
    lazyConnect: true,
    enableOfflineQueue: true,
    retryStrategy: (times) => Math.min(times * 200, 2000),
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    commandTimeout: 5000,
};
```

#### MeiliSearch 连接配置
```typescript
// MeiliSearch 配置
const meilisearchConfig = {
    host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
    apiKey: process.env.MEILISEARCH_API_KEY || 'masterKey',
    indexUid: 'products',
};
```

### 2. 健康检查配置

#### TiDB 健康检查
```typescript
@Injectable()
export class TiDBHealthIndicator implements HealthIndicator {
    async checkHealth(key: string): Promise<HealthIndicatorResult> {
        try {
            await this.dataSource.query('SELECT 1');
            return this.getStatus(key, true, { status: 'healthy' });
        } catch (error) {
            return this.getStatus(key, false, { error: error.message });
        }
    }
}
```

#### Redis 健康检查
```typescript
@Injectable()
export class RedisHealthIndicator implements HealthIndicator {
    async checkHealth(key: string): Promise<HealthIndicatorResult> {
        try {
            await this.redisClient.ping();
            return this.getStatus(key, true, { status: 'healthy' });
        } catch (error) {
            return this.getStatus(key, false, { error: error.message });
        }
    }
}
```

#### MeiliSearch 健康检查
```typescript
@Injectable()
export class MeiliSearchHealthIndicator implements HealthIndicator {
    async checkHealth(key: string): Promise<HealthIndicatorResult> {
        try {
            const response = await this.httpService.get(`${this.meilisearchConfig.host}/health`).toPromise();
            const isHealthy = response.data.status === 'available';
            return this.getStatus(key, isHealthy, { 
                status: response.data.status 
            });
        } catch (error) {
            return this.getStatus(key, false, { error: error.message });
        }
    }
}
```

## 📊 性能监控和优化

### 1. TiDB 性能监控

#### 连接池监控
```typescript
async getDatabaseStats() {
    const pool = this.dataSource.driver;
    return {
        totalConnections: pool.totalCount,
        activeConnections: pool.activeCount,
        idleConnections: pool.idleCount,
        waitingClients: pool.waitingClients
    };
}
```

#### 查询性能分析
```sql
-- 慢查询分析
SELECT query_time, sql_text
FROM information_schema.processlist
WHERE query_time > 1
ORDER BY query_time DESC
LIMIT 10;

-- 表统计信息
SELECT table_name, table_rows, data_length, index_length
FROM information_schema.tables
WHERE table_schema = 'shopping_db'
ORDER BY data_length DESC;
```

### 2. Redis 性能监控

#### Redis 信息监控
```typescript
async getRedisStats() {
    const info = await this.redisClient.info();
    const memory = await this.redisClient.info('memory');
    const stats = await this.redisClient.info('stats');
    
    return {
        memory: this.parseRedisInfo(memory),
        stats: this.parseRedisInfo(stats),
        info: this.parseRedisInfo(info)
    };
}
```

### 3. MeiliSearch 性能监控

#### 搜索统计
```typescript
async getSearchStats() {
    const url = `${this.meilisearchConfig.host}/indexes/${this.meilisearchConfig.indexUid}/stats`;
    const headers = {
        Authorization: `Bearer ${this.meilisearchConfig.apiKey}`,
    };

    const response = await firstValueFrom(this.httpService.get(url, { headers }));
    
    return {
        numberOfDocuments: response.data.numberOfDocuments,
        isIndexing: response.data.isIndexing,
        fieldDistribution: response.data.fieldDistribution,
    };
}
```

## 🚀 部署和运维

### 1. 生产环境部署

#### 环境变量配置
```bash
# TiDB
DB_HOST=tidb
DB_PORT=4000
DB_USERNAME=root
DB_PASSWORD=secure_password_here
DB_DATABASE=shopping_prod

# Redis
REDIS_HOST=redis
REDIS_PASSWORD=redis_secure_password

# MeiliSearch
MEILISEARCH_HOST=http://meilisearch:7700
MEILISEARCH_API_KEY=secure_master_key_here

# 应用配置
NODE_ENV=production
```

#### 备份策略
```bash
# TiDB 备份
docker exec tidb-server mysqldump -u root -p shopping_db > backup_$(date +%Y%m%d).sql

# Redis 备份
docker exec shopping-redis redis-cli BGSAVE
docker cp shopping-redis:/data/dump.rdb ./redis_backup_$(date +%Y%m%d).rdb

# MeiliSearch 备份
docker cp shopping-meilisearch:/meili_data ./meilisearch_backup_$(date +%Y%m%d)
```

### 2. 监控告警

#### Prometheus 指标
```yaml
# TiDB Exporter
- job_name: 'tidb'
  static_configs:
    - targets: ['tidb-exporter:10080']

# Redis Exporter  
- job_name: 'redis'
  static_configs:
    - targets: ['redis-exporter:9121']

# MeiliSearch Exporter
- job_name: 'meilisearch'
  static_configs:
    - targets: ['meilisearch-exporter:7700']
```

#### Grafana 仪表板
- TiDB 连接数、查询性能、集群状态
- Redis 内存使用、缓存命中率、连接数
- MeiliSearch 搜索性能、索引状态、文档数量

## 总结

系统采用了现代化的分布式技术栈组合：

### TiDB 优势
✅ **分布式架构**: 水平扩展，自动分片  
✅ **高可用性**: 多副本，自动故障转移  
✅ **MySQL 兼容**: 无需修改现有代码  
✅ **强一致性**: ACID事务保证  
✅ **实时分析**: HTAP混合事务分析处理  

### Redis 优势
✅ **高性能缓存**: 内存存储，微秒级响应  
✅ **丰富数据结构**: 支持多种数据类型  
✅ **持久化机制**: RDB + AOF 双重保障  
✅ **高可用性**: 支持主从复制、集群模式  

### MeiliSearch 优势
✅ **轻量快速**: 快速部署，毫秒级搜索  
✅ **易于使用**: RESTful API，简单直观  
✅ **实时索引**: 数据变更实时可搜索  
✅ **多语言支持**: 内置多语言分词器  

三者结合构成了一个高性能、高可用、可扩展的现代化电商系统架构，完全满足生产环境的业务需求。TiDB提供强大的分布式数据存储能力，Redis提供高速缓存支持，MeiliSearch提供优秀的搜索体验。
