import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { resolve } from 'path';
import { existsSync, statSync } from 'fs';
import * as net from 'net';
import { DataSource } from 'typeorm';
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
import { HealthModule } from './common/health/health.module';
import { RbacModule } from './auth/rbac/rbac.module';
import { Metric } from './monitoring/monitoring.service';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: (() => {
        const candidates = [
          resolve(process.cwd(), '.env'),
          resolve(process.cwd(), '.env.local'),
          resolve(process.cwd(), '../.env'),
        ];
        const found = candidates.filter(p => {
          try {
            return existsSync(p) && statSync(p).isFile();
          } catch {
            return false;
          }
        });
        return found.length > 0 ? found : undefined;
      })(),
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

    // 健康检查模块（使用通用健康模块，启用控制器，禁用依赖检查器以避免Redis）
    HealthModule.forRoot({
      global: true,
      enableController: true,
      enableDependencyCheckers: false,
    }),

    // 数据库模块（支持 TiDB→Postgres 自动回退）
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const env = (key: string, def?: any) => configService.get(key, def);
        const wantedType = env('DB_TYPE', 'sqlite') as 'mysql' | 'postgres' | 'sqlite' | 'tidb';

        // 构造按驱动分支的 extra 选项，避免驱动警告
        const buildExtra = (driver: 'mysql' | 'postgres' | 'sqlite') => {
          if (driver === 'mysql') {
            return {
              // mysql2 options
              connectionLimit: env('DATABASE_CONNECTION_LIMIT', 20),
              connectTimeout: env('DB_CONNECTION_TIMEOUT', env('DATABASE_TIMEOUT', 30000)),
              waitForConnections: true,
              queueLimit: 1000,
            };
          }
          if (driver === 'postgres') {
            return {
              // pg-pool options
              max: env('DATABASE_CONNECTION_LIMIT', 20),
              idleTimeoutMillis: env(
                'DB_IDLE_TIMEOUT_MILLIS',
                env('DATABASE_IDLE_TIMEOUT', 300000),
              ),
              connectionTimeoutMillis: env('DB_CONNECTION_TIMEOUT', env('DATABASE_TIMEOUT', 30000)),
            };
          }
          return { busyTimeout: 30000 };
        };

        const makeConfig = (
          driver: 'mysql' | 'postgres' | 'sqlite',
          source: 'primary' | 'fallback',
        ) => {
          const cfg: any = {
            type: driver,
            database:
              driver === 'sqlite'
                ? env('DB_DATABASE', './data/caddy_shopping.db')
                : source === 'primary'
                  ? env('DB_DATABASE', 'shopping_db')
                  : env('PG_DATABASE', env('DB_DATABASE', 'shopping_db')),
            ssl: env('DATABASE_SSL') === 'true' ? { rejectUnauthorized: false } : false,
            entities: [
              CartItemEntity,
              ReceiveAddressEntity,
              RegionInfoEntity,
              UserSessionEntity,
              RoleEntity,
              PermissionEntity,
              UserRoleEntity,
              RolePermissionEntity,
              Metric,
            ],
            synchronize: env('NODE_ENV') === 'development',
            logging: env('NODE_ENV') === 'development',
            charset: 'utf8mb4',
            timezone: env('DEFAULT_TIMEZONE', 'UTC'),
            extra: buildExtra(driver),
          };
          if (driver !== 'sqlite') {
            cfg.host =
              source === 'primary'
                ? env('DB_HOST', 'localhost')
                : env('PG_HOST', env('DB_HOST', 'localhost'));
            cfg.port =
              source === 'primary'
                ? env(
                    'DB_PORT',
                    wantedType === 'postgres' ? 5432 : wantedType === 'tidb' ? 4000 : 3306,
                  )
                : env('PG_PORT', 5432);
            cfg.username =
              source === 'primary'
                ? env('DB_USERNAME', 'root')
                : env('PG_USERNAME', env('DB_USERNAME', 'postgres'));
            cfg.password =
              source === 'primary'
                ? env('DB_PASSWORD', '123456')
                : env('PG_PASSWORD', env('DB_PASSWORD', 'postgres'));
          }
          return cfg;
        };

        // 目标驱动解析（TiDB 使用 mysql 驱动）
        const driver = wantedType === 'tidb' ? 'mysql' : wantedType;
        let finalConfig = makeConfig(driver, 'primary');

        // 当期望 TiDB 时尝试快速 TCP 检测，不可达则回退到 Postgres（若 PG_* 变量存在），否则回退到 SQLite
        if (wantedType === 'tidb') {
          const host = env('DB_HOST', 'localhost');
          const port = Number(env('DB_PORT', 4000));

          const canReach = await new Promise<boolean>(resolve => {
            const socket = new net.Socket();
            const timeout = setTimeout(
              () => {
                try {
                  socket.destroy();
                } catch {}
                resolve(false);
              },
              Number(env('DB_CONNECTION_TIMEOUT', env('DATABASE_TIMEOUT', 3000))),
            );
            socket.once('error', () => {
              clearTimeout(timeout);
              resolve(false);
            });
            socket.connect(port, host, () => {
              clearTimeout(timeout);
              socket.end();
              resolve(true);
            });
          });

          if (!canReach) {
            // Prefer Postgres fallback when PG_* present
            const hasPg = !!env('PG_HOST') || env('DB_TYPE') === 'postgres';
            if (hasPg) {
              finalConfig = makeConfig('postgres', 'fallback');
            } else {
              finalConfig = makeConfig('sqlite', 'fallback');
            }
          }
        }

        return finalConfig;
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
