import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from 'src/app.controller';
import { AppService } from 'src/app.service';
import { MonitoringModule } from './monitoring/monitoring.module';
import { createMasterConfiguration } from './config/unified-master.config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { CartModule } from './cart/cart.module';
import { AuditModule } from './common/audit/audit.module';
// 电商基本模块恢复挂载（2026-10-08 用户令"电商网站该有的基本模块要有"——
// 此前清理批按代码消费面误判为死码删除，现按产品功能完整性恢复）
import { PaymentModule } from './payment/payment.module';
import { AddressModule } from './address/address.module';
import { BasicDataModule } from './basic-data/basic-data.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    // 事件总线（payment 恢复挂载所需，2026-10-08）
    EventEmitterModule.forRoot(),

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
            __dirname + '/cart/infrastructure/entities/*.entity{.ts,.js}',
            __dirname + '/auth/**/*.entity{.ts,.js}',
            __dirname + '/orders/entities/*.entity{.ts,.js}',
            __dirname + '/products/entities/*.entity{.ts,.js}',
            __dirname + '/common/audit/entities/*.entity{.ts,.js}',
            __dirname + '/monitoring/*.service{.ts,.js}',
            // 电商基本模块恢复(2026-10-08)：支付/地址/基础数据/通知的实体
            __dirname + '/payment/**/*.entity{.ts,.js}',
            __dirname + '/address/**/*.entity{.ts,.js}',
            __dirname + '/basic-data/**/*.entity{.ts,.js}',
            __dirname + '/notification/**/*.entity{.ts,.js}',
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

    // 审计模块(M1-B4, 2026-10-04)：实体/服务/控制器/表早已齐备但从未接线（audit_logs 0 行）；
    // @Global 模块，接线后 AuditService 全局可注入（products 写操作审计即消费方）。
    // 其控制器查询面按 logging.controller 同规挂类级 admin 守卫（见 audit.controller.ts）。
    AuditModule,

    // 电商基本模块（2026-10-08 用户令恢复——支付/收货地址/基础数据/通知中心）
    PaymentModule,
    AddressModule,
    BasicDataModule,
    NotificationModule,
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
