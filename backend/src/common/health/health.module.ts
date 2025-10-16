import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HealthCheckService } from './health-check.service';
import { DependencyCheckersService } from './dependency-checkers.service';
import { NoopDependencyCheckersService } from './dependency-checkers.noop.service';
import { HealthController } from './health.controller';

// 健康检查模块配置选项
export interface HealthModuleOptions {
  // 是否启用全局健康检查
  global?: boolean;

  // 是否启用控制器
  enableController?: boolean;

  // 是否启用依赖检查器
  enableDependencyCheckers?: boolean;

  // 自定义配置
  config?: {
    // 检查间隔（毫秒）
    checkInterval?: number;

    // 系统检查间隔（毫秒）
    systemCheckInterval?: number;

    // 是否启用文件监控
    enableFileWatcher?: boolean;

    // 监控配置
    monitoring?: {
      enabled?: boolean;
      metricsEndpoint?: string;
      alertWebhook?: string;
    };

    // 依赖检查配置
    dependencies?: {
      database?: {
        enabled?: boolean;
        timeout?: number;
        query?: string;
      };
      redis?: {
        enabled?: boolean;
        timeout?: number;
        memoryThreshold?: number;
      };
      externalApis?: Array<{
        name: string;
        url: string;
        method?: 'GET' | 'POST' | 'HEAD';
        timeout?: number;
        expectedStatus?: number[];
        critical?: boolean;
      }>;
      messageQueue?: {
        enabled?: boolean;
        timeout?: number;
      };
      fileSystem?: {
        enabled?: boolean;
        paths?: string[];
      };
    };
  };
}

// 异步配置选项
export interface HealthModuleAsyncOptions {
  global?: boolean;
  enableController?: boolean;
  enableDependencyCheckers?: boolean;
  useFactory?: (
    ...args: any[]
  ) => Promise<HealthModuleOptions['config']> | HealthModuleOptions['config'];
  inject?: any[];
}

@Global()
@Module({})
export class HealthModule {
  /**
   * 同步配置健康检查模块
   */
  static forRoot(options: HealthModuleOptions = {}): DynamicModule {
    const {
      global = true,
      enableController = true,
      enableDependencyCheckers = true,
      config = {},
    } = options;

    const providers: any[] = [
      HealthCheckService,
      {
        provide: 'HEALTH_MODULE_CONFIG',
        useValue: config,
      },
    ];

    const controllers: any[] = [];
    const exports: any[] = [HealthCheckService];

    // 添加依赖检查器服务或提供 Noop 后备
    if (enableDependencyCheckers) {
      providers.push(DependencyCheckersService);
      exports.push(DependencyCheckersService);
    } else {
      providers.push({
        provide: DependencyCheckersService,
        useClass: NoopDependencyCheckersService,
      });
      exports.push(DependencyCheckersService);
    }

    // 添加控制器
    if (enableController) {
      controllers.push(HealthController);
    }

    return {
      module: HealthModule,
      global,
      imports: [
        ConfigModule,
        ScheduleModule.forRoot(),
        EventEmitterModule.forRoot({
          wildcard: true,
          delimiter: '.',
          newListener: false,
          removeListener: false,
          maxListeners: 20,
          verboseMemoryLeak: false,
          ignoreErrors: false,
        }),
      ],
      providers,
      controllers,
      exports,
    };
  }

  /**
   * 异步配置健康检查模块
   */
  static forRootAsync(options: HealthModuleAsyncOptions): DynamicModule {
    const {
      global = true,
      enableController = true,
      enableDependencyCheckers = true,
      useFactory,
      inject = [],
    } = options;

    const providers: any[] = [
      HealthCheckService,
      {
        provide: 'HEALTH_MODULE_CONFIG',
        useFactory: useFactory || (() => ({})),
        inject,
      },
    ];

    const controllers: any[] = [];
    const exports: any[] = [HealthCheckService];

    // 添加依赖检查器服务或提供 Noop 后备
    if (enableDependencyCheckers) {
      providers.push(DependencyCheckersService);
      exports.push(DependencyCheckersService);
    } else {
      providers.push({
        provide: DependencyCheckersService,
        useClass: NoopDependencyCheckersService,
      });
      exports.push(DependencyCheckersService);
    }

    // 添加控制器
    if (enableController) {
      controllers.push(HealthController);
    }

    return {
      module: HealthModule,
      global,
      imports: [
        ConfigModule,
        ScheduleModule.forRoot(),
        EventEmitterModule.forRoot({
          wildcard: true,
          delimiter: '.',
          newListener: false,
          removeListener: false,
          maxListeners: 20,
          verboseMemoryLeak: false,
          ignoreErrors: false,
        }),
      ],
      providers,
      controllers,
      exports,
    };
  }

  /**
   * 创建用于特定功能模块的健康检查模块
   */
  static forFeature(
    options: {
      checkers?: Array<{
        name: string;
        type: string;
        checker: any;
      }>;
    } = {},
  ): DynamicModule {
    const providers: any[] = [];

    // 如果提供了自定义检查器，注册它们
    if (options.checkers && options.checkers.length > 0) {
      options.checkers.forEach(({ name, checker }) => {
        providers.push({
          provide: `HEALTH_CHECKER_${name.toUpperCase()}`,
          useValue: checker,
        });
      });
    }

    return {
      module: HealthModule,
      providers,
      exports: providers,
    };
  }
}

// 健康检查配置工厂
export class HealthConfigFactory {
  /**
   * 创建默认配置
   */
  static createDefaultConfig(): HealthModuleOptions['config'] {
    return {
      checkInterval: 30000, // 30秒
      systemCheckInterval: 60000, // 1分钟
      enableFileWatcher: true,
      monitoring: {
        enabled: true,
        metricsEndpoint: '/metrics',
        alertWebhook: process.env.HEALTH_ALERT_WEBHOOK,
      },
      dependencies: {
        database: {
          enabled: true,
          timeout: 5000,
          query: 'SELECT 1',
        },
        redis: {
          enabled: true,
          timeout: 3000,
          memoryThreshold: 0.8, // 80%
        },
        externalApis: [],
        messageQueue: {
          enabled: false,
          timeout: 5000,
        },
        fileSystem: {
          enabled: true,
          paths: ['./uploads', './logs', './temp'],
        },
      },
    };
  }

  /**
   * 从环境变量创建配置
   */
  static createFromEnvironment(configService: ConfigService): HealthModuleOptions['config'] {
    return {
      checkInterval: configService.get<number>('HEALTH_CHECK_INTERVAL', 30000),
      systemCheckInterval: configService.get<number>('HEALTH_SYSTEM_CHECK_INTERVAL', 60000),
      enableFileWatcher: configService.get<boolean>('HEALTH_ENABLE_FILE_WATCHER', true),
      monitoring: {
        enabled: configService.get<boolean>('HEALTH_MONITORING_ENABLED', true),
        metricsEndpoint: configService.get<string>('HEALTH_METRICS_ENDPOINT', '/metrics'),
        alertWebhook: configService.get<string>('HEALTH_ALERT_WEBHOOK'),
      },
      dependencies: {
        database: {
          enabled: configService.get<boolean>('HEALTH_DB_CHECK_ENABLED', true),
          timeout: configService.get<number>('HEALTH_DB_TIMEOUT', 5000),
          query: configService.get<string>('HEALTH_DB_QUERY', 'SELECT 1'),
        },
        redis: {
          enabled: configService.get<boolean>('HEALTH_REDIS_CHECK_ENABLED', true),
          timeout: configService.get<number>('HEALTH_REDIS_TIMEOUT', 3000),
          memoryThreshold: configService.get<number>('HEALTH_REDIS_MEMORY_THRESHOLD', 0.8),
        },
        externalApis: this.parseExternalApis(configService.get<string>('HEALTH_EXTERNAL_APIS', '')),
        messageQueue: {
          enabled: configService.get<boolean>('HEALTH_MQ_CHECK_ENABLED', false),
          timeout: configService.get<number>('HEALTH_MQ_TIMEOUT', 5000),
        },
        fileSystem: {
          enabled: configService.get<boolean>('HEALTH_FS_CHECK_ENABLED', true),
          paths: configService.get<string>('HEALTH_FS_PATHS', './uploads,./logs,./temp').split(','),
        },
      },
    };
  }

  /**
   * 解析外部API配置
   */
  private static parseExternalApis(apisString: string): Array<any> {
    if (!apisString) return [];

    try {
      return JSON.parse(apisString);
    } catch (error) {
      console.warn('Failed to parse HEALTH_EXTERNAL_APIS:', error);
      return [];
    }
  }

  /**
   * 创建生产环境配置
   */
  static createProductionConfig(): HealthModuleOptions['config'] {
    return {
      checkInterval: 60000, // 1分钟
      systemCheckInterval: 300000, // 5分钟
      enableFileWatcher: false, // 生产环境禁用文件监控
      monitoring: {
        enabled: true,
        metricsEndpoint: '/metrics',
        alertWebhook: process.env.HEALTH_ALERT_WEBHOOK,
      },
      dependencies: {
        database: {
          enabled: true,
          timeout: 10000,
          query: 'SELECT 1',
        },
        redis: {
          enabled: true,
          timeout: 5000,
          memoryThreshold: 0.9, // 90%
        },
        externalApis: [],
        messageQueue: {
          enabled: true,
          timeout: 10000,
        },
        fileSystem: {
          enabled: true,
          paths: ['./uploads', './logs'],
        },
      },
    };
  }

  /**
   * 创建开发环境配置
   */
  static createDevelopmentConfig(): HealthModuleOptions['config'] {
    return {
      checkInterval: 15000, // 15秒
      systemCheckInterval: 30000, // 30秒
      enableFileWatcher: true,
      monitoring: {
        enabled: true,
        metricsEndpoint: '/metrics',
        alertWebhook: undefined,
      },
      dependencies: {
        database: {
          enabled: true,
          timeout: 3000,
          query: 'SELECT 1',
        },
        redis: {
          enabled: true,
          timeout: 2000,
          memoryThreshold: 0.7, // 70%
        },
        externalApis: [
          {
            name: 'test-api',
            url: 'https://httpbin.org/status/200',
            method: 'GET',
            timeout: 5000,
            expectedStatus: [200],
            critical: false,
          },
        ],
        messageQueue: {
          enabled: false,
          timeout: 3000,
        },
        fileSystem: {
          enabled: true,
          paths: ['./uploads', './logs', './temp'],
        },
      },
    };
  }
}

// 导出类型
export { HealthCheckService, DependencyCheckersService, HealthController };
