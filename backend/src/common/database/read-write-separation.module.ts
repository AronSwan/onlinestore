import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConfigService } from './database-config.service';
import { ReadWriteSeparationService } from './read-write-separation.service';
import {
  ReadWriteInterceptor,
  GlobalReadWriteInterceptor,
} from '../interceptors/read-write.interceptor';
import { TracingModule } from '../tracing/tracing.module';

/**
 * 读写分离模块
 * 提供数据库读写分离功能的完整解决方案
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    TracingModule,
    // 动态配置TypeORM连接
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (databaseConfigService: DatabaseConfigService) => {
        const logger = new Logger('ReadWriteSeparationModule');
        logger.log('Configuring TypeORM with read-write separation...');

        try {
          // 获取主库配置
          const masterConfig = await (databaseConfigService as any).getMasterConfig();
          logger.log('Master database configuration loaded');

          // 获取从库配置
          const slaveConfigs = await (databaseConfigService as any).getSlaveConfigs();
          logger.log(`${slaveConfigs.length} slave database configurations loaded`);

          // 返回主库配置作为默认连接
          return masterConfig;
        } catch (error) {
          logger.error('Failed to configure TypeORM:', error.message);
          throw error;
        }
      },
      inject: [DatabaseConfigService],
    }),
  ],
  providers: [
    DatabaseConfigService,
    ReadWriteSeparationService,
    ReadWriteInterceptor,
    GlobalReadWriteInterceptor,
    {
      provide: 'READ_WRITE_CONFIG',
      useFactory: (databaseConfigService: DatabaseConfigService) => {
        return (databaseConfigService as any).getReadWriteConfig();
      },
      inject: [DatabaseConfigService],
    },
  ],
  exports: [
    DatabaseConfigService,
    ReadWriteSeparationService,
    ReadWriteInterceptor,
    GlobalReadWriteInterceptor,
    'READ_WRITE_CONFIG',
  ],
})
export class ReadWriteSeparationModule {
  private readonly logger = new Logger(ReadWriteSeparationModule.name);

  constructor(
    private readonly databaseConfigService: DatabaseConfigService,
    private readonly readWriteService: ReadWriteSeparationService,
  ) {
    this.logger.log('🔄 Read-Write Separation Module initialized');
    this.logModuleFeatures();
    this.initializeConnections();
  }

  /**
   * 记录模块功能
   */
  private logModuleFeatures(): void {
    const features = [
      '✅ Master-Slave Database Configuration',
      '✅ Automatic Read-Write Operation Routing',
      '✅ Load Balancing for Read Operations',
      '✅ Connection Health Monitoring',
      '✅ Automatic Failover Support',
      '✅ Transaction Management',
      '✅ Query Performance Tracking',
      '✅ Connection Pool Management',
      '✅ Decorator-based Operation Control',
      '✅ Global Request Interceptor',
    ];

    this.logger.log('📋 Available Features:');
    features.forEach(feature => this.logger.log(`   ${feature}`));
  }

  /**
   * 初始化数据库连接
   */
  private async initializeConnections(): Promise<void> {
    try {
      this.logger.log('🔌 Initializing database connections...');

      // 初始化主库连接
      await (this.readWriteService as any).initializeMasterConnection();
      this.logger.log('✅ Master database connection initialized');

      // 初始化从库连接
      await (this.readWriteService as any).initializeSlaveConnections();
      this.logger.log('✅ Slave database connections initialized');

      // 启动健康检查
      (this.readWriteService as any).startHealthCheck();
      this.logger.log('✅ Database health monitoring started');

      this.logger.log('🎉 Read-Write Separation Module fully operational');
    } catch (error) {
      this.logger.error('❌ Failed to initialize database connections:', error.message);
      throw error;
    }
  }
}

/**
 * 读写分离核心模块（不包含TypeORM配置）
 * 用于在已有TypeORM配置的情况下添加读写分离功能
 */
@Global()
@Module({
  imports: [ConfigModule, ScheduleModule.forRoot(), TracingModule],
  providers: [
    DatabaseConfigService,
    ReadWriteSeparationService,
    ReadWriteInterceptor,
    GlobalReadWriteInterceptor,
  ],
  exports: [
    DatabaseConfigService,
    ReadWriteSeparationService,
    ReadWriteInterceptor,
    GlobalReadWriteInterceptor,
  ],
})
export class ReadWriteSeparationCoreModule {
  private readonly logger = new Logger(ReadWriteSeparationCoreModule.name);

  constructor() {
    this.logger.log('🔄 Read-Write Separation Core Module initialized');
  }
}

/**
 * 读写分离配置模块
 * 仅提供配置服务，不包含实际的数据库连接
 */
@Module({
  imports: [ConfigModule],
  providers: [DatabaseConfigService],
  exports: [DatabaseConfigService],
})
export class ReadWriteSeparationConfigModule {
  private readonly logger = new Logger(ReadWriteSeparationConfigModule.name);

  constructor() {
    this.logger.log('⚙️ Read-Write Separation Config Module initialized');
  }
}
