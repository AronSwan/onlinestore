// 用途：数据库连接和配置模块，支持高并发数据库操作，兼容 MySQL 和 TiDB
// 依赖文件：unified-master.config.ts
// 作者：后端开发团队
// 更新：只支持 TiDB 数据库配置，移除其他数据库选项
// 时间：2025-06-17 10:40:00

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createMasterConfiguration } from '../config/unified-master.config';

// Create configuration instance
const masterConfig = createMasterConfiguration();

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isDev = masterConfig.app.env === 'development';

        // 根据配置使用相应的数据库
        const dbType = masterConfig.database.type;
        const baseConfig = {
          type: dbType as any,
          database: masterConfig.database.database,
        };

        // SQLite不需要网络连接参数
        if (dbType !== 'sqlite') {
          Object.assign(baseConfig, {
            host: masterConfig.database.host,
            port: masterConfig.database.port,
            username: masterConfig.database.username,
            password: masterConfig.database.password,
          });
        }

        return {
          ...baseConfig,
          entities: [
            // 明确包含所有实体路径，确保TypeORM能找到它们
            __dirname + '/../**/*.entity{.ts,.js}',
            // 明确包含用户相关实体
            __dirname + '/../users/domain/entities/*.entity{.ts,.js}',
            __dirname + '/../users/infrastructure/persistence/typeorm/*.entity{.ts,.js}',
            __dirname + '/../users/infrastructure/entities/*.entity{.ts,.js}',
            // 明确包含产品相关实体
            __dirname + '/../products/entities/*.entity{.ts,.js}',
            // 明确包含订单相关实体
            __dirname + '/../orders/entities/*.entity{.ts,.js}',
            // 明确包含支付相关实体
            __dirname + '/../payment/entities/*.entity{.ts,.js}',
            // 明确包含通知相关实体
            __dirname + '/../notification/entities/*.entity{.ts,.js}',
            // 明确包含地址相关实体
            __dirname + '/../address/infrastructure/entities/*.entity{.ts,.js}',
          ],
          synchronize: isDev, // 开发环境自动同步表结构
          logging: isDev, // 开发环境开启日志
          // 数据库连接参数
          extra:
            dbType === 'sqlite'
              ? {
                  // SQLite 特定配置
                  busyTimeout: 30000,
                }
              : dbType === 'postgres'
                ? {
                    // PostgreSQL 特定配置
                    max: masterConfig.database.poolSize,
                    idleTimeoutMillis: masterConfig.database.connectionTimeout,
                    connectionTimeoutMillis: masterConfig.database.acquireTimeout,
                  }
                : {
                    // MySQL/TiDB 特定配置
                    connectionLimit: masterConfig.database.poolSize,
                    acquireTimeout: masterConfig.database.acquireTimeout,
                    connectTimeout: masterConfig.database.connectionTimeout,
                    ssl: process.env.DB_SSL === 'true',
                    supportBigNumbers: true,
                    bigNumberStrings: false,
                    transactionIsolation: 'READ COMMITTED',
                    multipleStatements: true,
                    queueLimit: 1000,
                    idleTimeout: 60000,
                    maxIdle: masterConfig.database.poolSize / 2,
                    minIdle: 10,
                    retryDelay: 200,
                    maxRetries: 3,
                  },
        } as any;
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
