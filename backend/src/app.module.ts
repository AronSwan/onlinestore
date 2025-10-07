import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CartModule } from './cart/cart.module';
import { CartItemEntity } from './cart/infrastructure/entities/cart-item.entity';
import { AddressModule } from './address/address.module';
import { BasicDataModule } from './basic-data/basic-data.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationModule } from './notification/notification.module';
import { GatewayModule } from './gateway/gateway.module';
import { AggregationModule } from './aggregation/aggregation.module';
import { BffModule } from './bff/bff.module';
import { ReceiveAddressEntity } from './address/infrastructure/entities/receive-address.entity';
import { RegionInfoEntity } from './basic-data/infrastructure/entities/region-info.entity';
import { Payment } from './payment/entities/payment.entity';
import { Notification } from './notification/entities/notification.entity';
import { UserSessionEntity } from './auth/entities/user-session.entity';
import { RoleEntity } from './auth/rbac/entities/role.entity';
import { PermissionEntity } from './auth/rbac/entities/permission.entity';
import { UserRoleEntity } from './auth/rbac/entities/user-role.entity';
import { RolePermissionEntity } from './auth/rbac/entities/role-permission.entity';
import { LoggingModule } from './common/logging/logging.module';
import { HealthModule } from './health/health.module';
import { MessagingModule } from './messaging/messaging.module';
import { SecurityModule } from './common/security/security.module';
import { TracingModule } from './common/tracing/tracing.module';
import { ErrorHandlingModule } from './common/modules/error-handling.module';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { AuditModule } from './common/audit/audit.module';
import { AuditLogEntity } from './common/audit/entities/audit-log.entity';
import { DegradationModule } from './common/degradation/degradation.module';
import { CircuitBreakerModule } from './common/circuit-breaker/circuit-breaker.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // 事件发射器模块（全局）
    EventEmitterModule.forRoot(),

    // 限流模块
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLER_TTL', 60) * 1000, // 转换为毫秒
          limit: configService.get<number>('THROTTLER_LIMIT', 100),
        },
      ],
    }),

    // 日志模块（完整版，包含聚合、安全、保留策略）
    LoggingModule.forRoot({
      // 基础配置
      isGlobal: true,

      // 日志配置
      logging: {
        level: 'info',
        format: 'json',
        colorize: true,
        timestamp: true,

        // 控制台输出
        console: {
          enabled: true,
          colorize: true,
          timestamp: true,
        },

        // 文件输出
        file: {
          enabled: true,
          filename: 'application.log',
          dirname: './logs',
          maxSize: '20m',
          maxFiles: 5,
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
        },

        // Elasticsearch输出 - 已禁用
        elasticsearch: {
          enabled: false,
          clientOpts: {
            nodes: [process.env.ELASTICSEARCH_URL || 'http://localhost:9200'],
            username: process.env.ELASTICSEARCH_USERNAME,
            password: process.env.ELASTICSEARCH_PASSWORD,
          },
          indexPrefix: 'logs',
          indexSuffixPattern: 'YYYY.MM.DD',
        },
      },

      // 聚合配置
      aggregation: {
        enabled: true,

        // Elasticsearch配置 - 已禁用
        elasticsearch: {
          enabled: false,
          nodes: [process.env.ELASTICSEARCH_URL || 'http://localhost:9200'],
          username: process.env.ELASTICSEARCH_USERNAME,
          password: process.env.ELASTICSEARCH_PASSWORD,
          indexPrefix: 'logs',
          indexPattern: 'logs-*',
          rollover: {
            maxSize: '1gb',
            maxAge: '30d',
            maxDocs: 1000000,
          },
          bulk: {
            size: 100,
            flushInterval: 5000,
            maxRetries: 3,
          },
        },

        // Kibana配置
        kibana: {
          enabled: true,
          host: process.env.KIBANA_URL || 'http://localhost:5601',
          username: process.env.KIBANA_USERNAME,
          password: process.env.KIBANA_PASSWORD,
          dashboards: {
            autoCreate: true,
            templates: ['application-logs', 'error-tracking'],
          },
        },
      },

      // 安全配置
      security: {
        sanitization: {
          enabled: true,
          fields: ['password', 'token', 'secret', 'key', 'authorization'],
          replacement: '[REDACTED]',
        },
        masking: {
          enabled: true,
          fields: ['email', 'phone', 'ssn', 'creditCard', 'bankAccount'],
          maskChar: '*',
          showFirst: 2,
          showLast: 2,
        },
      },

      // 追踪配置
      tracing: {
        enabled: true,
        serviceName: 'caddy-shopping-backend',
        serviceVersion: '1.0.0',
        environment: process.env.NODE_ENV || 'development',

        // Jaeger配置
        jaeger: {
          enabled: true,
          endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
        },

        // OTLP配置
        otlp: {
          enabled: true,
          endpoint: process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
        },
      },

      // 性能配置
      performance: {
        asyncLogging: true,
        bufferSize: 1000,
        flushInterval: 5000,
        maxMemoryUsage: '100mb',
        compression: true,
        sampling: {
          enabled: true,
          rate: 0.1,
        },
      },
    }),

    // 分布式追踪模块
    TracingModule,

    // 错误处理模块
    ErrorHandlingModule,

    // 健康检查模块
    HealthModule,

    // 数据库模块 - 支持多种数据库类型
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get('DB_TYPE', 'sqlite') as
          | 'mysql'
          | 'postgres'
          | 'sqlite'
          | 'tidb';
        const baseConfig: any = {
          type: dbType === 'tidb' ? 'mysql' : dbType,
          database: configService.get('DB_DATABASE', './data/caddy_shopping.db'),
        };

        // 只有非SQLite数据库才需要连接参数
        if (dbType !== 'sqlite') {
          baseConfig.host = configService.get('DB_HOST', 'localhost');
          baseConfig.port = configService.get('DB_PORT', dbType === 'postgres' ? 5432 : 3306);
          baseConfig.username = configService.get('DB_USERNAME', 'root');
          baseConfig.password = configService.get('DB_PASSWORD', '123456');
        }

        return {
          ...baseConfig,
          ssl:
            configService.get('DATABASE_SSL') === 'true'
              ? {
                  rejectUnauthorized: false,
                }
              : false,
          entities: [
            CartItemEntity,
            ReceiveAddressEntity,
            RegionInfoEntity,
            Payment,
            Notification,
            UserSessionEntity,
            RoleEntity,
            PermissionEntity,
            UserRoleEntity,
            RolePermissionEntity,
            AuditLogEntity,
          ],
          synchronize: configService.get('NODE_ENV') === 'development',
          logging: configService.get('NODE_ENV') === 'development',
          // 数据库连接配置
          charset: 'utf8mb4',
          timezone: configService.get('DEFAULT_TIMEZONE', 'UTC'),
          // 连接池配置（国际网络优化）
          extra: {
            connectionLimit: configService.get('DATABASE_CONNECTION_LIMIT', 20),
            acquireTimeout: configService.get('DATABASE_ACQUIRE_TIMEOUT', 60000),
            timeout: configService.get('DATABASE_TIMEOUT', 30000),
            idleTimeout: configService.get('DATABASE_IDLE_TIMEOUT', 300000),
          },
        };
      },
    }),

    // 购物车业务模块
    CartModule,

    // 用户地址模块
    AddressModule,

    // 基础数据模块（行政区划）
    BasicDataModule,

    // 支付模块
    PaymentModule,

    // 通知模块
    NotificationModule,

    // API网关模块
    GatewayModule,

    // 数据聚合模块
    AggregationModule,

    // BFF模块 (Backend for Frontend)
    BffModule,

    // 消息模块（Redpanda / Kafka 协议）
    MessagingModule,

    // 安全模块（全局安全服务）
    SecurityModule,

    // 审计模块
    AuditModule,

    // 降级模块
    DegradationModule,

    // 熔断器模块
    CircuitBreakerModule,

    // 认证模块
    AuthModule,

    // 用户模块
    UsersModule,

    // Redis模块
    RedisModule,
  ],
  controllers: [],
  providers: [
    // 全局限流守卫
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // 全局请求日志拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
  ],
})
export class AppModule {}
