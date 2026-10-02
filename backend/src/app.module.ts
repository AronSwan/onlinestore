import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from 'src/app.controller';
import { AppService } from 'src/app.service';
import { LoggingModule } from './logging/logging.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { createMasterConfiguration } from './config/unified-master.config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { CartModule } from './cart/cart.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      // 加载环境变量文件，优先级从高到低
      envFilePath: ['.env.local', '.env', '../.env'],
      // 不忽略环境文件，确保变量被加载
      ignoreEnvFile: false,
      load: [createMasterConfiguration],
    }),

    // 数据库模块
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // 使用统一主配置
        const masterConfig = configService.get('master');
        const dbConfig = masterConfig?.database;

        if (!dbConfig) {
          throw new Error('数据库配置未找到');
        }

        const config = {
          type: dbConfig.type,
          database: dbConfig.database,
          entities: [
            // 使用基础设施层的 TypeORM 实体
            // 注意：users/infrastructure/persistence/typeorm 下的实体与 users/entities、
            // users/infrastructure/entities 存在同表名冲突（TypeORM 同表多实体会破坏
            // synchronize），且没有任何 forFeature 使用它们，故不再注册。
            //
            // Blocker 1（2026-10-02）：摘除 users/infrastructure/entities glob——该目录的
            // UserEntity（@PrimaryGeneratedColumn('uuid')）与 users/entities 的 User
            // （@PrimaryGeneratedColumn() 自增 int）同为 @Entity('users')，双注册导致
            // SQLite synchronize 建出的 users 表 id 为 varchar NOT NULL，认证链路的
            // 自增 INSERT 缺 id 直接 500。其唯一真实消费方（EnhancedUsersRepository
            // CQRS 链）已改用规范 User 实体，见 typeorm-enhanced-users.repository.ts。
            __dirname + '/users/entities/*.entity{.ts,.js}',
            // users/domain/entities 下的 Address('user_addresses')、CustomerProfile('customer_profiles')
            // 是 User 实体 addresses/customerProfile 关联的目标实体，必须注册；
            // 该目录其余导出为无 @Entity 装饰器的领域类，TypeORM 会自动忽略。
            __dirname + '/users/domain/entities/*.entity{.ts,.js}',
            __dirname + '/address/infrastructure/entities/*.entity{.ts,.js}',
            __dirname + '/basic-data/infrastructure/entities/*.entity{.ts,.js}',
            __dirname + '/cart/infrastructure/entities/*.entity{.ts,.js}',
            __dirname + '/auth/**/*.entity{.ts,.js}',
            __dirname + '/orders/entities/*.entity{.ts,.js}',
            __dirname + '/products/entities/*.entity{.ts,.js}',
            __dirname + '/payment/entities/*.entity{.ts,.js}',
            __dirname + '/notification/entities/*.entity{.ts,.js}',
            __dirname + '/common/audit/entities/*.entity{.ts,.js}',
            __dirname + '/monitoring/*.service{.ts,.js}',
          ],
          synchronize: dbConfig.synchronize,
          logging: dbConfig.logging,
        };

        // 非 SQLite 数据库需要连接参数
        if (dbConfig.type !== 'sqlite') {
          Object.assign(config, {
            host: dbConfig.host,
            port: dbConfig.port,
            username: dbConfig.username,
            password: dbConfig.password,
          });
        }

        return config;
      },
      inject: [ConfigService],
    }),

    // 日志模块
    LoggingModule,

    // 限流模块(S3-min): 全局 300 次/60s, 可通过 THROTTLER_LIMIT/THROTTLER_TTL 环境变量覆盖
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLER_TTL', 60) * 1000,
          limit: configService.get<number>('THROTTLER_LIMIT', 300),
        },
      ],
    }),

    // 监控模块
    MonitoringModule,

    // 业务模块
    AuthModule,
    UsersModule,
    ProductsModule,
    OrdersModule,
    CartModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 全局限流守卫(S3-min)
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
