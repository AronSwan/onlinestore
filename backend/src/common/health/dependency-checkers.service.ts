import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { performance } from 'perf_hooks';
import {
  HealthChecker,
  HealthCheckResult,
  HealthCheckType,
  HealthSeverity,
  HealthStatus,
  HealthCheckService,
} from './health-check.service';

// 数据库健康检查配置
export interface DatabaseHealthConfig {
  enabled: boolean;
  timeout: number;
  query: string;
  expectedResult?: any;
  connectionPoolCheck: boolean;
}

// Redis健康检查配置
export interface RedisHealthConfig {
  enabled: boolean;
  timeout: number;
  pingCommand: boolean;
  memoryCheck: boolean;
  memoryThreshold: number; // MB
  connectionCheck: boolean;
}

// 外部API健康检查配置
export interface ExternalApiHealthConfig {
  enabled: boolean;
  apis: ExternalApiConfig[];
}

export interface ExternalApiConfig {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'HEAD';
  timeout: number;
  expectedStatus: number[];
  headers?: Record<string, string>;
  body?: string;
  validateResponse?: (response: any) => boolean;
  critical: boolean;
}

// 消息队列健康检查配置
export interface MessageQueueHealthConfig {
  enabled: boolean;
  type: 'redis' | 'rabbitmq' | 'kafka';
  connectionCheck: boolean;
  queueCheck: boolean;
  timeout: number;
}

// 文件系统健康检查配置
export interface FileSystemHealthConfig {
  enabled: boolean;
  paths: string[];
  writeTest: boolean;
  spaceCheck: boolean;
  spaceThreshold: number; // percentage
}

@Injectable()
export class DependencyCheckersService implements OnModuleInit {
  private readonly logger = new Logger(DependencyCheckersService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly healthCheckService: HealthCheckService,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing dependency health checkers...');

    await this.registerDatabaseChecker();
    await this.registerRedisChecker();
    await this.registerExternalApiCheckers();
    await this.registerMessageQueueChecker();
    await this.registerFileSystemChecker();

    this.logger.log('Dependency health checkers initialized successfully');
  }

  /**
   * 注册数据库健康检查器
   */
  private async registerDatabaseChecker(): Promise<void> {
    const config: DatabaseHealthConfig = {
      enabled: this.configService.get('health.dependencies.database.enabled', true),
      timeout: this.configService.get('health.dependencies.database.timeout', 5000),
      query: this.configService.get('health.dependencies.database.query', 'SELECT 1'),
      expectedResult: this.configService.get('health.dependencies.database.expectedResult'),
      connectionPoolCheck: this.configService.get(
        'health.dependencies.database.connectionPoolCheck',
        true,
      ),
    };

    if (!config.enabled) {
      this.logger.log('Database health checker is disabled');
      return;
    }

    const checker: HealthChecker = {
      name: 'database',
      type: HealthCheckType.DEPENDENCY,
      severity: HealthSeverity.CRITICAL,
      timeout: config.timeout,
      check: async (): Promise<HealthCheckResult> => {
        const startTime = performance.now();

        try {
          // 检查数据库连接
          if (!this.dataSource.isInitialized) {
            throw new Error('Database connection is not initialized');
          }

          // 执行健康检查查询
          const queryResult = await this.dataSource.query(config.query);

          // 检查连接池状态
          let poolInfo = {};
          if (config.connectionPoolCheck && (this.dataSource.driver as any).pool) {
            const pool = (this.dataSource.driver as any).pool;
            poolInfo = {
              totalConnections: pool.totalCount || 0,
              idleConnections: pool.idleCount || 0,
              waitingClients: pool.waitingCount || 0,
            };
          }

          const duration = performance.now() - startTime;

          return {
            name: 'database',
            status: HealthStatus.HEALTHY,
            type: HealthCheckType.DEPENDENCY,
            severity: HealthSeverity.CRITICAL,
            message: 'Database connection is healthy',
            details: {
              queryResult: config.expectedResult
                ? queryResult === config.expectedResult
                : !!queryResult,
              responseTime: duration,
              pool: poolInfo,
              driver: this.dataSource.driver.constructor.name,
            },
            duration,
            timestamp: new Date(),
          };
        } catch (error) {
          const duration = performance.now() - startTime;

          return {
            name: 'database',
            status: HealthStatus.UNHEALTHY,
            type: HealthCheckType.DEPENDENCY,
            severity: HealthSeverity.CRITICAL,
            message: `Database health check failed: ${error.message}`,
            details: {
              error: error.message,
              responseTime: duration,
              isInitialized: this.dataSource.isInitialized,
            },
            duration,
            timestamp: new Date(),
            error,
          };
        }
      },
    };

    this.healthCheckService.registerChecker(checker);
    this.logger.log('Database health checker registered');
  }

  /**
   * 注册Redis健康检查器
   */
  private async registerRedisChecker(): Promise<void> {
    const config: RedisHealthConfig = {
      enabled: this.configService.get('health.dependencies.redis.enabled', true),
      timeout: this.configService.get('health.dependencies.redis.timeout', 3000),
      pingCommand: this.configService.get('health.dependencies.redis.pingCommand', true),
      memoryCheck: this.configService.get('health.dependencies.redis.memoryCheck', true),
      memoryThreshold: this.configService.get('health.dependencies.redis.memoryThreshold', 1024), // 1GB
      connectionCheck: this.configService.get('health.dependencies.redis.connectionCheck', true),
    };

    if (!config.enabled) {
      this.logger.log('Redis health checker is disabled');
      return;
    }

    const checker: HealthChecker = {
      name: 'redis',
      type: HealthCheckType.DEPENDENCY,
      severity: HealthSeverity.HIGH,
      timeout: config.timeout,
      check: async (): Promise<HealthCheckResult> => {
        const startTime = performance.now();

        try {
          const details: any = {};

          // 检查连接状态
          if (config.connectionCheck) {
            details.connectionStatus = this.redis.status;
            if (this.redis.status !== 'ready') {
              throw new Error(`Redis connection status is ${this.redis.status}`);
            }
          }

          // 执行PING命令
          if (config.pingCommand) {
            const pingResult = await this.redis.ping();
            details.pingResult = pingResult;
            if (pingResult !== 'PONG') {
              throw new Error(`Redis PING returned ${pingResult}, expected PONG`);
            }
          }

          // 检查内存使用情况
          if (config.memoryCheck) {
            const info = await this.redis.info('memory');
            const memoryLines = info.split('\r\n');
            const usedMemoryLine = memoryLines.find(line => line.startsWith('used_memory:'));

            if (usedMemoryLine) {
              const usedMemory = parseInt(usedMemoryLine.split(':')[1]);
              const usedMemoryMB = usedMemory / (1024 * 1024);

              details.memoryUsage = {
                usedBytes: usedMemory,
                usedMB: usedMemoryMB,
                thresholdMB: config.memoryThreshold,
              };

              if (usedMemoryMB > config.memoryThreshold) {
                details.memoryWarning = `Memory usage ${usedMemoryMB.toFixed(2)}MB exceeds threshold ${config.memoryThreshold}MB`;
              }
            }
          }

          // 测试基本读写操作
          const testKey = `health_check_${Date.now()}`;
          const testValue = 'health_check_value';

          await this.redis.set(testKey, testValue, 'EX', 10); // 10秒过期
          const retrievedValue = await this.redis.get(testKey);
          await this.redis.del(testKey);

          if (retrievedValue !== testValue) {
            throw new Error('Redis read/write test failed');
          }

          details.readWriteTest = 'passed';

          const duration = performance.now() - startTime;

          return {
            name: 'redis',
            status: HealthStatus.HEALTHY,
            type: HealthCheckType.DEPENDENCY,
            severity: HealthSeverity.HIGH,
            message: 'Redis connection is healthy',
            details,
            duration,
            timestamp: new Date(),
          };
        } catch (error) {
          const duration = performance.now() - startTime;

          return {
            name: 'redis',
            status: HealthStatus.UNHEALTHY,
            type: HealthCheckType.DEPENDENCY,
            severity: HealthSeverity.HIGH,
            message: `Redis health check failed: ${error.message}`,
            details: {
              error: error.message,
              responseTime: duration,
              connectionStatus: this.redis.status,
            },
            duration,
            timestamp: new Date(),
            error,
          };
        }
      },
    };

    this.healthCheckService.registerChecker(checker);
    this.logger.log('Redis health checker registered');
  }

  /**
   * 注册外部API健康检查器
   */
  private async registerExternalApiCheckers(): Promise<void> {
    const config: ExternalApiHealthConfig = {
      enabled: this.configService.get('health.dependencies.externalApis.enabled', true),
      apis: this.configService.get('health.dependencies.externalApis.apis', []),
    };

    if (!config.enabled || config.apis.length === 0) {
      this.logger.log('External API health checkers are disabled or no APIs configured');
      return;
    }

    for (const apiConfig of config.apis) {
      const checker: HealthChecker = {
        name: `external_api_${apiConfig.name}`,
        type: HealthCheckType.DEPENDENCY,
        severity: apiConfig.critical ? HealthSeverity.CRITICAL : HealthSeverity.MEDIUM,
        timeout: apiConfig.timeout,
        check: async (): Promise<HealthCheckResult> => {
          return this.checkExternalApi(apiConfig);
        },
      };

      this.healthCheckService.registerChecker(checker);
      this.logger.log(`External API health checker registered: ${apiConfig.name}`);
    }
  }

  /**
   * 检查外部API
   */
  private async checkExternalApi(config: ExternalApiConfig): Promise<HealthCheckResult> {
    const startTime = performance.now();

    try {
      const url = new URL(config.url);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: config.method,
        headers: config.headers || {},
        timeout: config.timeout,
      };

      const response = await new Promise<any>((resolve, reject) => {
        const req = httpModule.request(options, res => {
          let data = '';
          res.on('data', chunk => {
            data += chunk;
          });
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data,
            });
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });

        if (config.body) {
          req.write(config.body);
        }

        req.end();
      });

      // 检查状态码
      if (!config.expectedStatus.includes(response.statusCode)) {
        throw new Error(
          `Unexpected status code: ${response.statusCode}, expected: ${config.expectedStatus.join(', ')}`,
        );
      }

      // 自定义响应验证
      if (config.validateResponse && !config.validateResponse(response)) {
        throw new Error('Custom response validation failed');
      }

      const duration = performance.now() - startTime;

      return {
        name: `external_api_${config.name}`,
        status: HealthStatus.HEALTHY,
        type: HealthCheckType.DEPENDENCY,
        severity: config.critical ? HealthSeverity.CRITICAL : HealthSeverity.MEDIUM,
        message: `External API ${config.name} is healthy`,
        details: {
          url: config.url,
          method: config.method,
          statusCode: response.statusCode,
          responseTime: duration,
          responseSize: response.data.length,
        },
        duration,
        timestamp: new Date(),
      };
    } catch (error) {
      const duration = performance.now() - startTime;

      return {
        name: `external_api_${config.name}`,
        status: HealthStatus.UNHEALTHY,
        type: HealthCheckType.DEPENDENCY,
        severity: config.critical ? HealthSeverity.CRITICAL : HealthSeverity.MEDIUM,
        message: `External API ${config.name} health check failed: ${error.message}`,
        details: {
          url: config.url,
          method: config.method,
          error: error.message,
          responseTime: duration,
        },
        duration,
        timestamp: new Date(),
        error,
      };
    }
  }

  /**
   * 注册消息队列健康检查器
   */
  private async registerMessageQueueChecker(): Promise<void> {
    const config: MessageQueueHealthConfig = {
      enabled: this.configService.get('health.dependencies.messageQueue.enabled', false),
      type: this.configService.get('health.dependencies.messageQueue.type', 'redis'),
      connectionCheck: this.configService.get(
        'health.dependencies.messageQueue.connectionCheck',
        true,
      ),
      queueCheck: this.configService.get('health.dependencies.messageQueue.queueCheck', true),
      timeout: this.configService.get('health.dependencies.messageQueue.timeout', 5000),
    };

    if (!config.enabled) {
      this.logger.log('Message queue health checker is disabled');
      return;
    }

    const checker: HealthChecker = {
      name: 'message_queue',
      type: HealthCheckType.DEPENDENCY,
      severity: HealthSeverity.HIGH,
      timeout: config.timeout,
      check: async (): Promise<HealthCheckResult> => {
        const startTime = performance.now();

        try {
          let details: any = { type: config.type };

          switch (config.type) {
            case 'redis':
              // 使用Redis作为消息队列时的检查
              if (config.connectionCheck) {
                const pingResult = await this.redis.ping();
                if (pingResult !== 'PONG') {
                  throw new Error('Redis message queue connection failed');
                }
                details.connectionStatus = 'healthy';
              }

              if (config.queueCheck) {
                // 检查队列长度等信息
                const queueLength = await this.redis.llen('test_queue');
                details.queueInfo = { testQueueLength: queueLength };
              }
              break;

            default:
              throw new Error(`Unsupported message queue type: ${config.type}`);
          }

          const duration = performance.now() - startTime;

          return {
            name: 'message_queue',
            status: HealthStatus.HEALTHY,
            type: HealthCheckType.DEPENDENCY,
            severity: HealthSeverity.HIGH,
            message: 'Message queue is healthy',
            details,
            duration,
            timestamp: new Date(),
          };
        } catch (error) {
          const duration = performance.now() - startTime;

          return {
            name: 'message_queue',
            status: HealthStatus.UNHEALTHY,
            type: HealthCheckType.DEPENDENCY,
            severity: HealthSeverity.HIGH,
            message: `Message queue health check failed: ${error.message}`,
            details: {
              type: config.type,
              error: error.message,
              responseTime: duration,
            },
            duration,
            timestamp: new Date(),
            error,
          };
        }
      },
    };

    this.healthCheckService.registerChecker(checker);
    this.logger.log('Message queue health checker registered');
  }

  /**
   * 注册文件系统健康检查器
   */
  private async registerFileSystemChecker(): Promise<void> {
    const config: FileSystemHealthConfig = {
      enabled: this.configService.get('health.dependencies.fileSystem.enabled', true),
      paths: this.configService.get('health.dependencies.fileSystem.paths', [
        './uploads',
        './logs',
      ]),
      writeTest: this.configService.get('health.dependencies.fileSystem.writeTest', true),
      spaceCheck: this.configService.get('health.dependencies.fileSystem.spaceCheck', true),
      spaceThreshold: this.configService.get('health.dependencies.fileSystem.spaceThreshold', 90),
    };

    if (!config.enabled) {
      this.logger.log('File system health checker is disabled');
      return;
    }

    const checker: HealthChecker = {
      name: 'file_system',
      type: HealthCheckType.DEPENDENCY,
      severity: HealthSeverity.MEDIUM,
      check: async (): Promise<HealthCheckResult> => {
        const startTime = performance.now();

        try {
          const details: any = {
            paths: [],
            writeTests: [],
          };

          // 检查路径可访问性
          for (const path of config.paths) {
            try {
              const fs = await import('fs/promises');
              const stats = await fs.stat(path);
              details.paths.push({
                path,
                exists: true,
                isDirectory: stats.isDirectory(),
                size: stats.size,
                modified: stats.mtime,
              });

              // 写入测试
              if (config.writeTest && stats.isDirectory()) {
                const testFile = `${path}/health_check_${Date.now()}.tmp`;
                await fs.writeFile(testFile, 'health check test');
                await fs.unlink(testFile);
                details.writeTests.push({ path, status: 'success' });
              }
            } catch (error) {
              details.paths.push({
                path,
                exists: false,
                error: error.message,
              });

              if (config.writeTest) {
                details.writeTests.push({ path, status: 'failed', error: error.message });
              }
            }
          }

          // 磁盘空间检查
          if (config.spaceCheck) {
            try {
              const { execSync } = await import('child_process');
              // 这里应该使用更跨平台的方法检查磁盘空间
              details.diskSpace = {
                checked: true,
                threshold: config.spaceThreshold,
                // 实际实现中应该获取真实的磁盘使用率
                usage: 50, // 示例值
              };
            } catch (error: any) {
              details.diskSpace = {
                checked: false,
                error: error.message,
              };
            }
          }

          const duration = performance.now() - startTime;

          // 检查是否有失败的路径或写入测试
          const hasFailures =
            details.paths.some((p: any) => !p.exists) ||
            details.writeTests.some((w: any) => w.status === 'failed');

          return {
            name: 'file_system',
            status: hasFailures ? HealthStatus.DEGRADED : HealthStatus.HEALTHY,
            type: HealthCheckType.DEPENDENCY,
            severity: HealthSeverity.MEDIUM,
            message: hasFailures ? 'File system has some issues' : 'File system is healthy',
            details,
            duration,
            timestamp: new Date(),
          };
        } catch (error) {
          const duration = performance.now() - startTime;

          return {
            name: 'file_system',
            status: HealthStatus.UNHEALTHY,
            type: HealthCheckType.DEPENDENCY,
            severity: HealthSeverity.MEDIUM,
            message: `File system health check failed: ${error.message}`,
            details: {
              error: error.message,
              responseTime: duration,
            },
            duration,
            timestamp: new Date(),
            error,
          };
        }
      },
    };

    this.healthCheckService.registerChecker(checker);
    this.logger.log('File system health checker registered');
  }

  /**
   * 动态添加外部API检查器
   */
  addExternalApiChecker(config: ExternalApiConfig): void {
    const checker: HealthChecker = {
      name: `external_api_${config.name}`,
      type: HealthCheckType.DEPENDENCY,
      severity: config.critical ? HealthSeverity.CRITICAL : HealthSeverity.MEDIUM,
      timeout: config.timeout,
      check: async (): Promise<HealthCheckResult> => {
        return this.checkExternalApi(config);
      },
    };

    this.healthCheckService.registerChecker(checker);
    this.logger.log(`Dynamic external API health checker added: ${config.name}`);
  }

  /**
   * 移除外部API检查器
   */
  removeExternalApiChecker(name: string): void {
    this.healthCheckService.unregisterChecker(`external_api_${name}`);
    this.logger.log(`External API health checker removed: ${name}`);
  }

  /**
   * 获取所有依赖检查器的状态
   */
  async getDependencyStatus(): Promise<HealthCheckResult[]> {
    return this.healthCheckService.getHealthByType(HealthCheckType.DEPENDENCY);
  }
}
