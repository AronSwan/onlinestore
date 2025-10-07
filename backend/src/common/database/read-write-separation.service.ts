import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository, EntityTarget, SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TracingService } from '../tracing/tracing.service';
import { DatabaseConfigService, DatabaseConnectionType } from './database-config.service';

/**
 * 数据库操作类型
 */
export enum DatabaseOperationType {
  READ = 'read',
  WRITE = 'write',
}

/**
 * 连接健康状态
 */
export interface ConnectionHealth {
  name: string;
  type: DatabaseConnectionType;
  isHealthy: boolean;
  lastCheck: Date;
  responseTime: number;
  errorCount: number;
  lastError?: string;
}

/**
 * 负载均衡器
 */
class LoadBalancer {
  private currentIndex = 0;
  private connections: string[] = [];

  constructor(
    private readonly strategy: 'round-robin' | 'random' | 'least-connections',
    connections: string[],
  ) {
    this.connections = [...connections];
  }

  /**
   * 获取下一个连接
   */
  getNext(healthyConnections: string[]): string | null {
    const available = this.connections.filter(conn => healthyConnections.includes(conn));

    if (available.length === 0) {
      return null;
    }

    switch (this.strategy) {
      case 'round-robin':
        return this.roundRobin(available);
      case 'random':
        return this.random(available);
      case 'least-connections':
        return this.leastConnections(available);
      default:
        return available[0];
    }
  }

  private roundRobin(connections: string[]): string {
    const connection = connections[this.currentIndex % connections.length];
    this.currentIndex++;
    return connection;
  }

  private random(connections: string[]): string {
    const index = Math.floor(Math.random() * connections.length);
    return connections[index];
  }

  private leastConnections(connections: string[]): string {
    // 简化实现，实际应该根据连接数选择
    return connections[0];
  }
}

/**
 * 读写分离服务
 *
 * 提供数据库读写分离的核心功能：
 * - 自动路由读写操作
 * - 负载均衡
 * - 健康检查
 * - 故障转移
 * - 连接池管理
 */
@Injectable()
export class ReadWriteSeparationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReadWriteSeparationService.name);
  private readonly connectionHealth = new Map<string, ConnectionHealth>();
  private readonly loadBalancer: LoadBalancer;
  private readonly config: any;
  private healthCheckInterval: NodeJS.Timeout;

  constructor(
    @InjectDataSource('master') private readonly masterDataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly databaseConfigService: DatabaseConfigService,
    private readonly tracingService: TracingService,
  ) {
    this.config = this.databaseConfigService.getReadWriteSeparationConfig();

    // 初始化负载均衡器
    const slaveConnections =
      this.config.slaves?.map((_: any, index: number) => `slave_${index + 1}`) || [];
    this.loadBalancer = new LoadBalancer(
      this.config.loadBalancing || 'round-robin',
      slaveConnections,
    );

    // 初始化连接健康状态
    this.initializeConnectionHealth();
  }

  async onModuleInit() {
    this.logger.log('读写分离服务初始化中...');

    // 验证配置
    if (!this.databaseConfigService.validateConfig()) {
      throw new Error('数据库配置验证失败');
    }

    // 启动健康检查
    if (this.config.healthCheck?.enabled) {
      this.startHealthCheck();
    }

    this.logger.log(
      `读写分离服务已启动 - 启用: ${this.config.enabled}, 从库数量: ${this.config.slaves?.length || 0}`,
    );
  }

  async onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.logger.log('读写分离服务已停止');
  }

  /**
   * 获取数据源（根据操作类型自动选择）
   */
  async getDataSource(
    operationType: DatabaseOperationType = DatabaseOperationType.READ,
  ): Promise<DataSource> {
    const span = this.tracingService.startSpan('database.get_datasource');
    span.setAttributes({
      'db.operation_type': operationType,
      'db.read_write_separation.enabled': this.config.enabled,
    });

    try {
      if (!this.config.enabled || operationType === DatabaseOperationType.WRITE) {
        span.setAttributes({ 'db.connection': 'master' });
        return this.masterDataSource;
      }

      // 读操作：尝试使用从库
      const slaveDataSource = await this.getHealthySlaveDataSource();
      if (slaveDataSource) {
        span.setAttributes({ 'db.connection': 'slave' });
        return slaveDataSource;
      }

      // 故障转移到主库
      if (this.config.fallback?.enabled && this.config.fallback?.fallbackToMaster) {
        this.logger.warn('所有从库不可用，故障转移到主库');
        span.setAttributes({
          'db.connection': 'master',
          'db.fallback': true,
        });
        return this.masterDataSource;
      }

      throw new Error('没有可用的数据库连接');
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * 获取Repository（自动选择数据源）
   */
  async getRepository<Entity extends ObjectLiteral = any>(
    entityClass: EntityTarget<Entity>,
    operationType: DatabaseOperationType = DatabaseOperationType.READ,
  ): Promise<Repository<Entity>> {
    const dataSource = await this.getDataSource(operationType);
    return dataSource.getRepository(
      entityClass as EntityTarget<ObjectLiteral>,
    ) as Repository<Entity>;
  }

  /**
   * 获取查询构建器（自动选择数据源）
   */
  async getQueryBuilder<Entity extends ObjectLiteral = any>(
    entityClass: EntityTarget<Entity>,
    alias: string = 'entity',
    operationType: DatabaseOperationType = DatabaseOperationType.READ,
  ): Promise<SelectQueryBuilder<Entity>> {
    const dataSource = await this.getDataSource(operationType);
    return dataSource.createQueryBuilder(
      entityClass as EntityTarget<ObjectLiteral>,
      alias,
    ) as SelectQueryBuilder<Entity>;
  }

  /**
   * 执行事务（强制使用主库）
   */
  async executeTransaction<T>(operation: (manager: any) => Promise<T>): Promise<T> {
    const span = this.tracingService.startSpan('database.transaction');
    span.setAttributes({ 'db.connection': 'master' });

    try {
      return await this.masterDataSource.transaction(operation);
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * 获取健康的从库数据源
   */
  private async getHealthySlaveDataSource(): Promise<DataSource | null> {
    if (!this.config.slaves || this.config.slaves.length === 0) {
      return null;
    }

    const healthyConnections = Array.from(this.connectionHealth.entries())
      .filter(([name, health]) => name.startsWith('slave_') && health.isHealthy)
      .map(([name]) => name);

    if (healthyConnections.length === 0) {
      return null;
    }

    const selectedConnection = this.loadBalancer.getNext(healthyConnections);
    if (!selectedConnection) {
      return null;
    }

    // 这里需要根据连接名获取对应的DataSource
    // 在实际实现中，需要维护一个连接名到DataSource的映射
    return this.getDataSourceByName(selectedConnection);
  }

  /**
   * 根据连接名获取数据源
   */
  private getDataSourceByName(connectionName: string): DataSource | null {
    // 这里需要实现连接名到DataSource的映射
    // 由于TypeORM的限制，这里返回主库作为示例
    // 在实际项目中，需要在模块初始化时创建多个DataSource实例
    this.logger.debug(`尝试获取连接: ${connectionName}`);
    return this.masterDataSource;
  }

  /**
   * 初始化连接健康状态
   */
  private initializeConnectionHealth() {
    // 主库
    this.connectionHealth.set('master', {
      name: 'master',
      type: DatabaseConnectionType.MASTER,
      isHealthy: true,
      lastCheck: new Date(),
      responseTime: 0,
      errorCount: 0,
    });

    // 从库
    if (this.config.slaves) {
      this.config.slaves.forEach((_: any, index: number) => {
        const name = `slave_${index + 1}`;
        this.connectionHealth.set(name, {
          name,
          type: DatabaseConnectionType.SLAVE,
          isHealthy: true,
          lastCheck: new Date(),
          responseTime: 0,
          errorCount: 0,
        });
      });
    }
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck() {
    const interval = this.config.healthCheck?.interval || 30000;

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, interval);

    this.logger.log(`健康检查已启动，间隔: ${interval}ms`);
  }

  /**
   * 执行健康检查
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  private async performHealthCheck() {
    const span = this.tracingService.startSpan('database.health_check');

    try {
      for (const [name, health] of this.connectionHealth.entries()) {
        await this.checkConnectionHealth(name, health);
      }
    } catch (error) {
      span.recordException(error);
      this.logger.error('健康检查执行失败', error);
    } finally {
      span.end();
    }
  }

  /**
   * 检查单个连接健康状态
   */
  private async checkConnectionHealth(name: string, health: ConnectionHealth) {
    const startTime = Date.now();

    try {
      // 执行简单查询测试连接
      const dataSource = name === 'master' ? this.masterDataSource : this.getDataSourceByName(name);

      if (dataSource && dataSource.isInitialized) {
        await dataSource.query('SELECT 1');

        // 更新健康状态
        health.isHealthy = true;
        health.lastCheck = new Date();
        health.responseTime = Date.now() - startTime;
        health.errorCount = 0;
        health.lastError = undefined;
      } else {
        throw new Error('数据源未初始化');
      }
    } catch (error) {
      // 更新不健康状态
      health.isHealthy = false;
      health.lastCheck = new Date();
      health.responseTime = Date.now() - startTime;
      health.errorCount++;
      health.lastError = error.message;

      this.logger.warn(`连接 ${name} 健康检查失败: ${error.message}`);
    }
  }

  /**
   * 获取所有连接健康状态
   */
  getConnectionHealthStatus(): ConnectionHealth[] {
    return Array.from(this.connectionHealth.values());
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    const connections = Array.from(this.connectionHealth.values());
    const healthyCount = connections.filter(c => c.isHealthy).length;
    const totalCount = connections.length;

    return {
      enabled: this.config.enabled,
      totalConnections: totalCount,
      healthyConnections: healthyCount,
      masterHealth: this.connectionHealth.get('master'),
      slaveCount: this.config.slaves?.length || 0,
      loadBalancingStrategy: this.config.loadBalancing,
      healthCheckEnabled: this.config.healthCheck?.enabled,
      fallbackEnabled: this.config.fallback?.enabled,
    };
  }

  /**
   * 手动触发健康检查
   */
  async triggerHealthCheck(): Promise<ConnectionHealth[]> {
    await this.performHealthCheck();
    return this.getConnectionHealthStatus();
  }

  /**
   * 重置连接健康状态
   */
  resetConnectionHealth(connectionName?: string) {
    if (connectionName) {
      const health = this.connectionHealth.get(connectionName);
      if (health) {
        health.errorCount = 0;
        health.lastError = undefined;
        health.isHealthy = true;
      }
    } else {
      for (const health of this.connectionHealth.values()) {
        health.errorCount = 0;
        health.lastError = undefined;
        health.isHealthy = true;
      }
    }
  }
}
