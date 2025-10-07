# 配置管理系统文档

## 概述

配置管理系统提供了一个全面的、类型安全的配置管理解决方案，支持动态配置、环境配置和配置验证。系统设计用于支持多环境部署、运行时配置更新和配置验证。

## 核心特性

### 1. 动态配置管理
- **运行时配置更新**：支持在不重启应用的情况下更新配置
- **多源配置**：支持文件、环境变量、Redis、数据库、Consul、etcd、HTTP等配置源
- **配置监听**：自动监听配置文件变化并实时更新
- **配置缓存**：内存缓存提高配置访问性能
- **配置持久化**：支持配置状态的持久化存储

### 2. 环境配置管理
- **多环境支持**：支持development、testing、staging、production等环境
- **环境隔离**：不同环境的配置完全隔离
- **特性标志**：支持基于环境的特性开关
- **配置继承**：支持环境配置的继承和覆盖

### 3. 配置验证
- **类型安全**：使用TypeScript和Joi提供类型安全的配置
- **实时验证**：配置更新时自动验证
- **自定义规则**：支持自定义验证规则
- **错误报告**：详细的配置错误报告

### 4. 安全特性
- **敏感数据保护**：自动识别和保护敏感配置
- **数据加密**：支持配置数据的加密存储
- **访问控制**：配置访问权限控制
- **审计日志**：完整的配置变更审计日志

## 快速开始

### 1. 环境配置

复制环境变量示例文件：
```bash
cp .env.config.example .env.config
```

根据实际环境修改配置值：
```bash
# 基础配置
NODE_ENV=development
APP_NAME=Shopping App
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shopping_app
DB_USERNAME=postgres
DB_PASSWORD=password

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
```

### 2. 模块集成

#### 同步配置
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from './common/config/config.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env.config', '.env'],
      isGlobal: true,
      validation: {
        enabled: true,
      },
      dynamicConfig: {
        enabled: true,
        sources: [
          {
            type: 'FILE',
            path: './config/dynamic.yaml',
            watch: true,
          },
        ],
      },
    }),
  ],
})
export class AppModule {}
```

#### 异步配置
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from './common/config/config.module';

@Module({
  imports: [
    ConfigModule.forRootAsync({
      useFactory: async () => ({
        envFilePath: ['.env.config', '.env'],
        isGlobal: true,
        validation: {
          enabled: true,
        },
        dynamicConfig: {
          enabled: true,
          sources: [
            {
              type: 'REDIS',
              host: 'localhost',
              port: 6379,
              key: 'app:config',
            },
          ],
        },
      }),
    }),
  ],
})
export class AppModule {}
```

## 使用指南

### 1. 动态配置服务

#### 基础用法
```typescript
import { Injectable } from '@nestjs/common';
import { DynamicConfigService } from './common/config/config.service';

@Injectable()
export class UserService {
  constructor(
    private readonly configService: DynamicConfigService,
  ) {}

  async getUsers() {
    // 获取配置值
    const pageSize = await this.configService.get('pagination.pageSize', 10);
    const enableCache = await this.configService.get('features.cache.enabled', false);
    
    // 检查配置是否存在
    const hasCustomConfig = await this.configService.has('custom.userSettings');
    
    // 获取所有配置
    const allConfig = await this.configService.getAll();
    
    return { pageSize, enableCache, hasCustomConfig, allConfig };
  }

  async updateConfig() {
    // 设置配置值
    await this.configService.set('pagination.pageSize', 20);
    
    // 删除配置值
    await this.configService.delete('temporary.setting');
  }
}
```

#### 监听配置变更
```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DynamicConfigService } from './common/config/config.service';

@Injectable()
export class CacheService implements OnModuleInit {
  constructor(
    private readonly configService: DynamicConfigService,
  ) {}

  onModuleInit() {
    // 监听特定配置变更
    this.configService.onConfigChange('cache.ttl', (newValue, oldValue) => {
      console.log(`Cache TTL changed from ${oldValue} to ${newValue}`);
      this.updateCacheTTL(newValue);
    });

    // 监听所有配置变更
    this.configService.onConfigChange('*', (key, newValue, oldValue) => {
      console.log(`Config ${key} changed from ${oldValue} to ${newValue}`);
    });
  }

  private updateCacheTTL(ttl: number) {
    // 更新缓存TTL逻辑
  }
}
```

### 2. 环境配置服务

#### 环境检测和配置
```typescript
import { Injectable } from '@nestjs/common';
import { EnvironmentService } from './common/config/environment.service';

@Injectable()
export class DatabaseService {
  constructor(
    private readonly envService: EnvironmentService,
  ) {}

  async getConnection() {
    // 获取当前环境
    const currentEnv = this.envService.getCurrentEnvironment();
    
    // 获取环境配置
    const dbConfig = this.envService.getEnvironmentConfig('database');
    
    // 检查特性标志
    const useReadReplica = this.envService.isFeatureEnabled('database.readReplica');
    
    // 获取环境特定配置
    const config = this.envService.getConfig();
    
    return {
      environment: currentEnv,
      database: dbConfig,
      useReadReplica,
      config,
    };
  }
}
```

#### 特性标志管理
```typescript
import { Injectable } from '@nestjs/common';
import { EnvironmentService } from './common/config/environment.service';

@Injectable()
export class FeatureService {
  constructor(
    private readonly envService: EnvironmentService,
  ) {}

  async getUserFeatures(userId: string) {
    const features = {
      // 全局特性标志
      newUI: this.envService.isFeatureEnabled('ui.newDesign'),
      
      // 基于环境的特性
      debugMode: this.envService.isFeatureEnabled('debug.enabled'),
      
      // 复杂特性标志（支持用户级别）
      betaFeatures: this.envService.isFeatureEnabled('beta.features', {
        userId,
        userType: 'premium',
      }),
    };

    return features;
  }
}
```

### 3. 配置验证服务

#### 配置验证
```typescript
import { Injectable } from '@nestjs/common';
import { ConfigValidationService } from './common/config/config-validation.service';

@Injectable()
export class ConfigService {
  constructor(
    private readonly validationService: ConfigValidationService,
  ) {}

  async validateAppConfig(config: any) {
    // 验证应用配置
    const appResult = await this.validationService.validateAppConfig(config);
    
    if (!appResult.isValid) {
      console.error('App config validation failed:', appResult.errors);
      throw new Error('Invalid app configuration');
    }

    // 验证环境变量
    const envResult = await this.validationService.validateEnvironmentVariables();
    
    if (!envResult.isValid) {
      console.error('Environment validation failed:', envResult.errors);
    }

    return { appResult, envResult };
  }

  async addCustomValidation() {
    // 添加自定义验证规则
    await this.validationService.addValidationRule('custom.rule', {
      type: 'JOI',
      schema: Joi.object({
        apiKey: Joi.string().required(),
        timeout: Joi.number().min(1000).max(30000),
      }),
    });

    // 验证自定义配置
    const result = await this.validationService.validateConfig('custom.rule', {
      apiKey: 'test-key',
      timeout: 5000,
    });

    return result;
  }
}
```

## 详细配置

### 1. 动态配置源

#### 文件配置源
```yaml
# config/dynamic.yaml
pagination:
  pageSize: 20
  maxPageSize: 100

features:
  cache:
    enabled: true
    ttl: 3600
  newUI:
    enabled: false
    rolloutPercentage: 10

database:
  poolSize: 10
  timeout: 30000

api:
  rateLimit:
    enabled: true
    windowMs: 900000
    max: 100
```

#### Redis配置源
```typescript
// Redis配置源配置
{
  type: 'REDIS',
  host: 'localhost',
  port: 6379,
  key: 'app:config',
  format: 'JSON',
  watch: true,
  watchInterval: 5000,
}
```

#### HTTP配置源
```typescript
// HTTP配置源配置
{
  type: 'HTTP',
  url: 'http://config-server/api/config',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer token',
  },
  format: 'JSON',
  refreshInterval: 60000,
}
```

### 2. 环境配置

#### 环境配置文件结构
```
config/
├── environments/
│   ├── development.yaml
│   ├── testing.yaml
│   ├── staging.yaml
│   └── production.yaml
├── dynamic.yaml
└── validation-rules.yaml
```

#### 开发环境配置
```yaml
# config/environments/development.yaml
environment: development
debug: true

database:
  primary:
    host: localhost
    port: 5432
    database: shopping_app_dev
    poolSize: 5
  
redis:
  host: localhost
  port: 6379
  database: 0

features:
  cache:
    enabled: true
    ttl: 300
  debug:
    enabled: true
  newUI:
    enabled: true

security:
  cors:
    enabled: true
    origins: ['http://localhost:3000']
  rateLimit:
    enabled: false

monitoring:
  enabled: true
  prometheus:
    enabled: false
  jaeger:
    enabled: false
```

#### 生产环境配置
```yaml
# config/environments/production.yaml
environment: production
debug: false

database:
  primary:
    host: prod-db.example.com
    port: 5432
    database: shopping_app
    poolSize: 20
    ssl: true
  replica:
    host: prod-db-replica.example.com
    port: 5432
    database: shopping_app
    poolSize: 10
    ssl: true

redis:
  cluster:
    enabled: true
    nodes:
      - host: redis-1.example.com
        port: 6379
      - host: redis-2.example.com
        port: 6379

features:
  cache:
    enabled: true
    ttl: 3600
  debug:
    enabled: false
  newUI:
    enabled: true

security:
  cors:
    enabled: true
    origins: ['https://app.example.com']
  rateLimit:
    enabled: true
    windowMs: 900000
    max: 1000

monitoring:
  enabled: true
  prometheus:
    enabled: true
    port: 9090
  jaeger:
    enabled: true
    endpoint: 'https://jaeger.example.com'
```

### 3. 配置验证规则

#### 自定义验证规则
```yaml
# config/validation-rules.yaml
rules:
  database:
    type: JOI
    schema:
      host:
        type: string
        required: true
      port:
        type: number
        min: 1
        max: 65535
      poolSize:
        type: number
        min: 1
        max: 100

  redis:
    type: JSON_SCHEMA
    schema:
      type: object
      properties:
        host:
          type: string
        port:
          type: number
          minimum: 1
          maximum: 65535
      required: [host, port]

  features:
    type: CUSTOM
    validator: validateFeatures
```

## 最佳实践

### 1. 配置设计原则

#### 配置分层
```typescript
// 推荐的配置分层结构
interface AppConfig {
  // 应用层配置
  app: {
    name: string;
    version: string;
    environment: string;
  };
  
  // 基础设施层配置
  infrastructure: {
    database: DatabaseConfig;
    redis: RedisConfig;
    messaging: MessagingConfig;
  };
  
  // 业务层配置
  business: {
    features: FeatureFlags;
    rules: BusinessRules;
    limits: BusinessLimits;
  };
  
  // 集成层配置
  integrations: {
    payment: PaymentConfig;
    notification: NotificationConfig;
    analytics: AnalyticsConfig;
  };
}
```

#### 配置命名规范
```typescript
// 好的配置命名
const config = {
  database: {
    primary: {
      host: 'localhost',
      port: 5432,
      connectionPool: {
        min: 5,
        max: 20,
        idleTimeout: 30000,
      },
    },
  },
  features: {
    userManagement: {
      registration: {
        enabled: true,
        requireEmailVerification: true,
      },
    },
  },
};

// 避免的配置命名
const badConfig = {
  db_host: 'localhost', // 使用下划线
  DB_PORT: 5432, // 全大写
  feat1: true, // 不明确的名称
  temp_setting: 'value', // 临时配置
};
```

### 2. 错误处理

#### 配置错误处理
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { DynamicConfigService } from './common/config/config.service';

@Injectable()
export class ConfigErrorHandler {
  private readonly logger = new Logger(ConfigErrorHandler.name);

  constructor(
    private readonly configService: DynamicConfigService,
  ) {
    this.setupErrorHandling();
  }

  private setupErrorHandling() {
    // 监听配置错误
    this.configService.onConfigError((error, context) => {
      this.logger.error(`Config error: ${error.message}`, {
        error: error.stack,
        context,
      });

      // 根据错误类型采取不同的处理策略
      switch (error.type) {
        case 'VALIDATION_ERROR':
          this.handleValidationError(error);
          break;
        case 'SOURCE_ERROR':
          this.handleSourceError(error);
          break;
        case 'NETWORK_ERROR':
          this.handleNetworkError(error);
          break;
        default:
          this.handleGenericError(error);
      }
    });
  }

  private handleValidationError(error: any) {
    // 配置验证错误处理
    this.logger.warn('Using fallback configuration due to validation error');
    // 可以选择使用默认配置或者停止应用
  }

  private handleSourceError(error: any) {
    // 配置源错误处理
    this.logger.warn('Configuration source unavailable, using cached config');
    // 使用缓存的配置继续运行
  }

  private handleNetworkError(error: any) {
    // 网络错误处理
    this.logger.warn('Network error accessing config source, retrying...');
    // 实现重试逻辑
  }

  private handleGenericError(error: any) {
    // 通用错误处理
    this.logger.error('Unexpected configuration error', error);
  }
}
```

### 3. 性能优化

#### 配置缓存策略
```typescript
import { Injectable } from '@nestjs/common';
import { DynamicConfigService } from './common/config/config.service';

@Injectable()
export class ConfigCacheOptimizer {
  constructor(
    private readonly configService: DynamicConfigService,
  ) {}

  async optimizeConfigAccess() {
    // 预加载常用配置
    const criticalConfigs = [
      'database.primary',
      'redis.host',
      'features.cache.enabled',
      'security.jwt.secret',
    ];

    for (const configKey of criticalConfigs) {
      await this.configService.get(configKey);
    }

    // 设置配置预取
    this.configService.prefetchConfigs([
      'pagination.*',
      'features.*',
      'limits.*',
    ]);

    // 配置批量获取
    const batchConfigs = await this.configService.getBatch([
      'app.name',
      'app.version',
      'app.environment',
    ]);

    return batchConfigs;
  }
}
```

### 4. 监控和告警

#### 配置监控
```typescript
import { Injectable } from '@nestjs/common';
import { DynamicConfigService } from './common/config/config.service';
import { PrometheusService } from './monitoring/prometheus.service';

@Injectable()
export class ConfigMonitoring {
  constructor(
    private readonly configService: DynamicConfigService,
    private readonly prometheusService: PrometheusService,
  ) {
    this.setupMonitoring();
  }

  private setupMonitoring() {
    // 监控配置变更
    this.configService.onConfigChange('*', (key, newValue, oldValue) => {
      this.prometheusService.incrementCounter('config_changes_total', {
        key,
        environment: process.env.NODE_ENV,
      });
    });

    // 监控配置错误
    this.configService.onConfigError((error) => {
      this.prometheusService.incrementCounter('config_errors_total', {
        type: error.type,
        environment: process.env.NODE_ENV,
      });
    });

    // 定期报告配置统计
    setInterval(() => {
      const stats = this.configService.getStats();
      this.prometheusService.setGauge('config_cache_size', stats.cacheSize);
      this.prometheusService.setGauge('config_sources_count', stats.sourcesCount);
    }, 60000);
  }
}
```

## 故障排除

### 常见问题

#### 1. 配置加载失败
```bash
# 检查配置文件是否存在
ls -la config/

# 检查配置文件格式
yamllint config/dynamic.yaml

# 检查环境变量
env | grep -E "(DB_|REDIS_|JWT_)"

# 检查配置验证
npm run config:validate
```

#### 2. 动态配置不更新
```typescript
// 检查配置源状态
const sources = await configService.getSourcesStatus();
console.log('Config sources status:', sources);

// 手动刷新配置
await configService.refreshConfig();

// 检查文件监听
const watchStatus = await configService.getWatchStatus();
console.log('File watch status:', watchStatus);
```

#### 3. 配置验证错误
```typescript
// 获取详细的验证错误
const validationResult = await validationService.validateAllConfigs();
if (!validationResult.isValid) {
  console.error('Validation errors:', validationResult.errors);
  
  // 获取配置模板
  const template = await validationService.generateConfigTemplate();
  console.log('Expected config structure:', template);
}
```

### 调试工具

#### 配置调试命令
```bash
# 显示当前配置
npm run config:show

# 验证配置
npm run config:validate

# 显示配置源状态
npm run config:sources

# 显示配置统计
npm run config:stats

# 导出配置快照
npm run config:snapshot
```

#### 配置健康检查
```typescript
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { DynamicConfigService } from './common/config/config.service';

@Injectable()
export class ConfigHealthIndicator extends HealthIndicator {
  constructor(
    private readonly configService: DynamicConfigService,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const health = await this.configService.getHealth();
      
      const isHealthy = health.status === 'healthy';
      const result = this.getStatus(key, isHealthy, {
        sources: health.sources,
        cache: health.cache,
        lastUpdate: health.lastUpdate,
      });

      return result;
    } catch (error) {
      throw this.getStatus(key, false, {
        error: error.message,
      });
    }
  }
}
```

## API参考

### DynamicConfigService

#### 方法列表
- `get(key: string, defaultValue?: any): Promise<any>` - 获取配置值
- `set(key: string, value: any): Promise<void>` - 设置配置值
- `delete(key: string): Promise<void>` - 删除配置值
- `has(key: string): Promise<boolean>` - 检查配置是否存在
- `getAll(): Promise<Record<string, any>>` - 获取所有配置
- `getBatch(keys: string[]): Promise<Record<string, any>>` - 批量获取配置
- `onConfigChange(key: string, callback: Function): void` - 监听配置变更
- `refreshConfig(): Promise<void>` - 刷新配置
- `getStats(): ConfigStats` - 获取配置统计
- `getHealth(): Promise<ConfigHealth>` - 获取健康状态

### EnvironmentService

#### 方法列表
- `getCurrentEnvironment(): Environment` - 获取当前环境
- `getEnvironmentConfig(section?: string): any` - 获取环境配置
- `isFeatureEnabled(feature: string, context?: any): boolean` - 检查特性是否启用
- `getConfig(): EnvironmentConfig` - 获取完整配置
- `compareEnvironments(env1: Environment, env2: Environment): EnvironmentComparison` - 比较环境
- `validateConfig(): ValidationResult` - 验证配置
- `getHealth(): Promise<any>` - 获取健康状态

### ConfigValidationService

#### 方法列表
- `validateConfig(ruleName: string, config: any): Promise<ValidationResult>` - 验证配置
- `validateAppConfig(config: any): Promise<ValidationResult>` - 验证应用配置
- `validateEnvironmentVariables(): Promise<ValidationResult>` - 验证环境变量
- `addValidationRule(name: string, rule: ValidationRule): Promise<void>` - 添加验证规则
- `removeValidationRule(name: string): Promise<void>` - 移除验证规则
- `generateConfigTemplate(): Promise<any>` - 生成配置模板
- `getHealth(): Promise<any>` - 获取健康状态

## 代码示例

### 完整的控制器示例
```typescript
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { DynamicConfigService } from '../common/config/config.service';
import { EnvironmentService } from '../common/config/environment.service';
import { ConfigValidationService } from '../common/config/config-validation.service';

@Controller('config')
export class ConfigController {
  constructor(
    private readonly configService: DynamicConfigService,
    private readonly envService: EnvironmentService,
    private readonly validationService: ConfigValidationService,
  ) {}

  @Get('current')
  async getCurrentConfig() {
    const config = await this.configService.getAll();
    const environment = this.envService.getCurrentEnvironment();
    
    return {
      environment,
      config,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('feature/:name')
  async getFeatureFlag(@Param('name') name: string) {
    const enabled = this.envService.isFeatureEnabled(name);
    const config = await this.configService.get(`features.${name}`);
    
    return {
      feature: name,
      enabled,
      config,
    };
  }

  @Post('validate')
  async validateConfig(@Body() config: any) {
    const result = await this.validationService.validateAppConfig(config);
    
    return {
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.warnings,
    };
  }

  @Get('health')
  async getConfigHealth() {
    const configHealth = await this.configService.getHealth();
    const envHealth = await this.envService.getHealth();
    const validationHealth = await this.validationService.getHealth();
    
    return {
      config: configHealth,
      environment: envHealth,
      validation: validationHealth,
      overall: 'healthy',
    };
  }

  @Get('stats')
  async getConfigStats() {
    const stats = this.configService.getStats();
    
    return {
      ...stats,
      environment: this.envService.getCurrentEnvironment(),
      timestamp: new Date().toISOString(),
    };
  }
}
```

### 服务集成示例
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DynamicConfigService } from '../common/config/config.service';
import { EnvironmentService } from '../common/config/environment.service';

@Injectable()
export class UserService implements OnModuleInit, OnModuleDestroy {
  private configSubscriptions: Array<() => void> = [];

  constructor(
    private readonly configService: DynamicConfigService,
    private readonly envService: EnvironmentService,
  ) {}

  async onModuleInit() {
    // 监听分页配置变更
    const unsubscribePagination = this.configService.onConfigChange(
      'pagination.pageSize',
      (newValue) => {
        console.log(`Page size updated to: ${newValue}`);
        this.updatePaginationSettings(newValue);
      },
    );
    this.configSubscriptions.push(unsubscribePagination);

    // 监听缓存配置变更
    const unsubscribeCache = this.configService.onConfigChange(
      'features.cache.enabled',
      (enabled) => {
        console.log(`Cache ${enabled ? 'enabled' : 'disabled'}`);
        this.toggleCache(enabled);
      },
    );
    this.configSubscriptions.push(unsubscribeCache);
  }

  onModuleDestroy() {
    // 清理配置监听
    this.configSubscriptions.forEach(unsubscribe => unsubscribe());
  }

  async getUsers(page: number = 1) {
    // 获取动态配置
    const pageSize = await this.configService.get('pagination.pageSize', 10);
    const cacheEnabled = this.envService.isFeatureEnabled('cache.users');
    
    // 使用配置
    const offset = (page - 1) * pageSize;
    
    if (cacheEnabled) {
      // 使用缓存逻辑
      return this.getUsersFromCache(offset, pageSize);
    } else {
      // 直接查询数据库
      return this.getUsersFromDatabase(offset, pageSize);
    }
  }

  private updatePaginationSettings(pageSize: number) {
    // 更新分页设置的逻辑
  }

  private toggleCache(enabled: boolean) {
    // 切换缓存的逻辑
  }

  private async getUsersFromCache(offset: number, limit: number) {
    // 从缓存获取用户的逻辑
  }

  private async getUsersFromDatabase(offset: number, limit: number) {
    // 从数据库获取用户的逻辑
  }
}
```

这个配置管理系统提供了一个完整的、生产就绪的配置管理解决方案，支持动态配置、环境管理和配置验证，确保应用程序的配置安全、可靠和易于管理。
### 📝 环境变量列表

以下是项目中使用的所有环境变量：

| 变量名 | 默认值 | 说明 | 必需 |
|--------|--------|------|------|
| `DATABASE_HOST` | `localhost` | 数据库主机地址 | ✅ |
| `DATABASE_PORT` | `3306` | 数据库端口号 | ✅ |
| `DATABASE_USERNAME` | `root` | 数据库用户名 | ✅ |
| `DATABASE_PASSWORD` | `password` | 数据库密码 | ✅ |
| `DATABASE_NAME` | `shopping_site` | 数据库名称 | ✅ |
| `DATABASE_SYNCHRONIZE` | `false` | 是否自动同步数据库结构 | ❌ |
| `DATABASE_LOGGING` | `true` | 是否启用数据库日志 | ❌ |
| `REDIS_HOST` | `localhost` | Redis 主机地址 | ❌ |
| `REDIS_PORT` | `6379` | Redis 端口号 | ❌ |
| `REDIS_PASSWORD` | `` | Redis 密码 | ❌ |
| `CART_REDIS_DB` | `1` | 配置项说明 | ❌ |
| `CART_CACHE_REDIS_DB` | `2` | 配置项说明 | ❌ |
| `CART_CACHE_TTL` | `3600` | 配置项说明 | ❌ |
| `CART_LOCK_TIMEOUT` | `30000` | 配置项说明 | ❌ |
| `CART_LOCK_RETRY_DELAY` | `100` | 配置项说明 | ❌ |
| `CART_LOCK_RETRY_COUNT` | `10` | 配置项说明 | ❌ |
| `JWT_SECRET` | `your-secret-key` | JWT 密钥 | ✅ |
| `JWT_EXPIRES_IN` | `7d` | JWT 过期时间 | ❌ |
| `JWT_MIN_SECRET_LENGTH` | `32` | 配置项说明 | ❌ |
| `JWT_ALGORITHM` | `RS256` | 配置项说明 | ❌ |
| `JWT_ISSUER` | `caddy-shopping-api` | 配置项说明 | ❌ |
| `JWT_AUDIENCE` | `caddy-shopping-clien...` | 配置项说明 | ❌ |
| `JWT_KEY_SIZE` | `2048` | 配置项说明 | ❌ |
| `JWT_KEY_FORMAT` | `pkcs8` | 配置项说明 | ❌ |
| `JWT_PUBLIC_KEY_FORMAT` | `spki` | 配置项说明 | ❌ |
| `JWT_TOKEN_EXPIRY` | `1h` | 配置项说明 | ❌ |
| `JWT_REFRESH_TOKEN_EXPIRY` | `7d` | 配置项说明 | ❌ |
| `NODE_ENV` | `development` | 运行环境 | ✅ |
| `PORT` | `3000` | 应用端口号 | ❌ |
| `API_PREFIX` | `api` | API 路径前缀 | ❌ |
| `LOG_LEVEL` | `debug` | 日志级别 | ❌ |
| `LOG_FILE_PATH` | `./logs` | 配置项说明 | ❌ |
| `SHARDING_ENABLED` | `false` | 配置项说明 | ❌ |
| `SHARDING_DATABASES` | `2` | 配置项说明 | ❌ |
| `SHARDING_TABLES` | `4` | 配置项说明 | ❌ |
| `METRICS_ENABLED` | `true` | 配置项说明 | ❌ |
| `HEALTH_CHECK_ENABLED` | `true` | 配置项说明 | ❌ |
| `CACHE_TTL` | `300` | 配置项说明 | ❌ |
| `CACHE_MAX_ITEMS` | `1000` | 配置项说明 | ❌ |
| `UPLOAD_DEST` | `./uploads` | 配置项说明 | ❌ |
| `MAX_FILE_SIZE` | `10485760` | 配置项说明 | ❌ |
| `CORS_ORIGIN` | `http://localhost:300...` | 配置项说明 | ❌ |
| `CORS_CREDENTIALS` | `true` | 配置项说明 | ❌ |
| `PAYMENT_MAX_AMOUNT` | `1000000` | 配置项说明 | ❌ |
| `PAYMENT_MAX_RETRY_COUNT` | `3` | 配置项说明 | ❌ |
| `PAYMENT_CALLBACK_TIMEOUT_MINUTES` | `15` | 配置项说明 | ❌ |
| `PAYMENT_NONCE_EXPIRY_MINUTES` | `15` | 配置项说明 | ❌ |
| `PAYMENT_RATE_LIMIT_CREATE_TTL` | `60` | 配置项说明 | ❌ |
| `PAYMENT_RATE_LIMIT_CREATE_LIMIT` | `10` | 配置项说明 | ❌ |
| `PAYMENT_RATE_LIMIT_CALLBACK_TTL` | `60` | 配置项说明 | ❌ |
| `PAYMENT_RATE_LIMIT_CALLBACK_LIMIT` | `100` | 配置项说明 | ❌ |
| `PAYMENT_RATE_LIMIT_QUERY_TTL` | `60` | 配置项说明 | ❌ |
| `PAYMENT_RATE_LIMIT_QUERY_LIMIT` | `60` | 配置项说明 | ❌ |
| `ENCRYPTION_ALGORITHM` | `aes-256-gcm` | 配置项说明 | ❌ |
| `ENCRYPTION_KEY_LENGTH` | `32` | 配置项说明 | ❌ |
| `ENCRYPTION_IV_LENGTH` | `12` | 配置项说明 | ❌ |
| `ENCRYPTION_TAG_LENGTH` | `16` | 配置项说明 | ❌ |
| `LOG_MASK_SENSITIVE_FIELDS` | `password,secret,toke...` | 配置项说明 | ❌ |
| `LOG_MASK_CHAR` | `*` | 配置项说明 | ❌ |
| `LOG_MASK_VISIBLE_CHARS` | `4` | 配置项说明 | ❌ |
| `REQUEST_MAX_PAYLOAD_SIZE` | `10mb` | 配置项说明 | ❌ |
| `ALLOWED_ORIGINS` | `http://localhost:300...` | 配置项说明 | ❌ |
| `CSRF_COOKIE_NAME` | `csrf-token` | 配置项说明 | ❌ |
| `SECURITY_CHECK_ENABLED` | `true` | 配置项说明 | ❌ |
| `SECURITY_CHECK_FAIL_ON_HIGH` | `true` | 配置项说明 | ❌ |
| `SECURITY_CHECK_SCAN_TIMEOUT` | `300000` | 配置项说明 | ❌ |
| `SECURITY_CHECK_CACHE_ENABLED` | `true` | 配置项说明 | ❌ |
| `SECURITY_CHECK_CACHE_DIR` | `.security-cache` | 配置项说明 | ❌ |
| `SECURITY_MONITORING_ENABLED` | `true` | 配置项说明 | ❌ |
| `SECURITY_ALERT_THRESHOLD` | `5` | 配置项说明 | ❌ |
| `SECURITY_LOG_RETENTION_DAYS` | `30` | 配置项说明 | ❌ |
