import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from 'src/app.controller';
import { AppService } from 'src/app.service';
import { LoggingModule } from './logging/logging.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { createMasterConfiguration } from './config/unified-master.config';

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
            __dirname + '/users/infrastructure/persistence/typeorm/*.entity{.ts,.js}',
            __dirname + '/users/infrastructure/entities/*.entity{.ts,.js}',
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

    // 监控模块
    MonitoringModule,

    // 其他模块可以在这里添加
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
