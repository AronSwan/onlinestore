import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CartModule } from './cart/cart.module';
import { CartItemEntity } from './cart/infrastructure/entities/cart-item.entity';
import { AddressModule } from './address/address.module';
import { BasicDataModule } from './basic-data/basic-data.module';
import { ReceiveAddressEntity } from './address/infrastructure/entities/receive-address.entity';
import { RegionInfoEntity } from './basic-data/infrastructure/entities/region-info.entity';
import { UserSessionEntity } from './auth/entities/user-session.entity';
import { RoleEntity } from './auth/rbac/entities/role.entity';
import { PermissionEntity } from './auth/rbac/entities/permission.entity';
import { UserRoleEntity } from './auth/rbac/entities/user-role.entity';
import { RolePermissionEntity } from './auth/rbac/entities/role-permission.entity';
import { LoggerModule } from './common/logger/logger.module';
import { HealthModule } from './health/health.module';
import { RbacModule } from './auth/rbac/rbac.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // 限流模块
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLER_TTL', 60) * 1000,
          limit: configService.get<number>('THROTTLER_LIMIT', 100),
        },
      ],
    }),

    // 日志模块
    LoggerModule,

    // 健康检查模块
    HealthModule,

    // 数据库模块
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
          ssl: configService.get('DATABASE_SSL') === 'true' ? { rejectUnauthorized: false } : false,
          entities: [
            CartItemEntity,
            ReceiveAddressEntity,
            RegionInfoEntity,
            UserSessionEntity,
            RoleEntity,
            PermissionEntity,
            UserRoleEntity,
            RolePermissionEntity,
          ],
          synchronize: configService.get('NODE_ENV') === 'development',
          logging: configService.get('NODE_ENV') === 'development',
          charset: 'utf8mb4',
          timezone: configService.get('DEFAULT_TIMEZONE', 'UTC'),
          extra: {
            connectionLimit: configService.get('DATABASE_CONNECTION_LIMIT', 20),
            acquireTimeout: configService.get('DATABASE_ACQUIRE_TIMEOUT', 60000),
            timeout: configService.get('DATABASE_TIMEOUT', 30000),
            idleTimeout: configService.get('DATABASE_IDLE_TIMEOUT', 300000),
          },
        };
      },
    }),

    // 业务模块
    CartModule,
    AddressModule,
    BasicDataModule,
    RbacModule,
  ],
  controllers: [],
  providers: [
    // 全局限流守卫
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppMinimalModule {}
