import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * 数据库连接类型
 */
export enum DatabaseConnectionType {
  MASTER = 'master',
  SLAVE = 'slave',
}

/**
 * 数据库连接配置
 */
export interface DatabaseConnectionConfig {
  type: 'mysql' | 'postgres' | 'mariadb';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  charset?: string;
  timezone?: string;
  ssl?: boolean | object;
  extra?: any;
}

/**
 * 读写分离配置
 */
export interface ReadWriteSeparationConfig {
  enabled: boolean;
  master: DatabaseConnectionConfig;
  slaves: DatabaseConnectionConfig[];
  loadBalancing: 'round-robin' | 'random' | 'least-connections';
  healthCheck: {
    enabled: boolean;
    interval: number;
    timeout: number;
    retries: number;
  };
  fallback: {
    enabled: boolean;
    fallbackToMaster: boolean;
  };
}

/**
 * 数据库配置服务
 *
 * 负责管理主从数据库连接配置，支持：
 * - 主从数据库连接配置
 * - 负载均衡策略
 * - 健康检查配置
 * - 故障转移配置
 */
@Injectable()
export class DatabaseConfigService {
  private readonly logger = new Logger(DatabaseConfigService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * 获取读写分离配置
   */
  getReadWriteSeparationConfig(): ReadWriteSeparationConfig {
    const enabled = this.configService.get<boolean>(
      'DATABASE_READ_WRITE_SEPARATION_ENABLED',
      false,
    );

    if (!enabled) {
      this.logger.log('读写分离未启用，使用单一数据库连接');
      return this.getSingleDatabaseConfig();
    }

    const config: ReadWriteSeparationConfig = {
      enabled: true,
      master: this.getMasterConfig(),
      slaves: this.getSlaveConfigs(),
      loadBalancing: this.configService.get('DATABASE_LOAD_BALANCING', 'round-robin') as any,
      healthCheck: {
        enabled: this.configService.get<boolean>('DATABASE_HEALTH_CHECK_ENABLED', true),
        interval: this.configService.get<number>('DATABASE_HEALTH_CHECK_INTERVAL', 30000),
        timeout: this.configService.get<number>('DATABASE_HEALTH_CHECK_TIMEOUT', 5000),
        retries: this.configService.get<number>('DATABASE_HEALTH_CHECK_RETRIES', 3),
      },
      fallback: {
        enabled: this.configService.get<boolean>('DATABASE_FALLBACK_ENABLED', true),
        fallbackToMaster: this.configService.get<boolean>('DATABASE_FALLBACK_TO_MASTER', true),
      },
    };

    this.logger.log(
      `读写分离配置: 主库1个, 从库${config.slaves.length}个, 负载均衡: ${config.loadBalancing}`,
    );
    return config;
  }

  /**
   * 获取主库配置
   */
  private getMasterConfig(): DatabaseConnectionConfig {
    return {
      type: this.configService.get('DATABASE_TYPE', 'mysql') as 'mysql' | 'postgres' | 'mariadb',
      host:
        this.configService.get('DATABASE_MASTER_HOST') ||
        this.configService.get('DATABASE_HOST', 'localhost'),
      port:
        this.configService.get<number>('DATABASE_MASTER_PORT') ||
        this.configService.get<number>('DATABASE_PORT', 3306),
      username:
        this.configService.get('DATABASE_MASTER_USERNAME') ||
        this.configService.get('DATABASE_USERNAME', 'root'),
      password:
        this.configService.get('DATABASE_MASTER_PASSWORD') ||
        this.configService.get('DATABASE_PASSWORD', ''),
      database:
        this.configService.get('DATABASE_MASTER_NAME') ||
        this.configService.get('DATABASE_NAME', 'shopping_site'),
      charset: this.configService.get('DATABASE_CHARSET', 'utf8mb4'),
      timezone: this.configService.get('DEFAULT_TIMEZONE', 'UTC'),
      ssl: this.getDatabaseSSLConfig('MASTER'),
      extra: this.getDatabaseExtraConfig('MASTER'),
    };
  }

  /**
   * 获取从库配置列表
   */
  private getSlaveConfigs(): DatabaseConnectionConfig[] {
    const slaveCount = this.configService.get<number>('DATABASE_SLAVE_COUNT', 0);
    const slaves: DatabaseConnectionConfig[] = [];

    for (let i = 1; i <= slaveCount; i++) {
      const slaveConfig: DatabaseConnectionConfig = {
        type: this.configService.get('DATABASE_TYPE', 'mysql') as 'mysql' | 'postgres' | 'mariadb',
        host:
          this.configService.get(`DATABASE_SLAVE_${i}_HOST`) ||
          this.configService.get('DATABASE_HOST', 'localhost'),
        port:
          this.configService.get<number>(`DATABASE_SLAVE_${i}_PORT`) ||
          this.configService.get<number>('DATABASE_PORT', 3306),
        username:
          this.configService.get(`DATABASE_SLAVE_${i}_USERNAME`) ||
          this.configService.get('DATABASE_USERNAME', 'root'),
        password:
          this.configService.get(`DATABASE_SLAVE_${i}_PASSWORD`) ||
          this.configService.get('DATABASE_PASSWORD', ''),
        database:
          this.configService.get(`DATABASE_SLAVE_${i}_NAME`) ||
          this.configService.get('DATABASE_NAME', 'shopping_site'),
        charset: this.configService.get('DATABASE_CHARSET', 'utf8mb4'),
        timezone: this.configService.get('DEFAULT_TIMEZONE', 'UTC'),
        ssl: this.getDatabaseSSLConfig(`SLAVE_${i}`),
        extra: this.getDatabaseExtraConfig(`SLAVE_${i}`),
      };
      slaves.push(slaveConfig);
    }

    return slaves;
  }

  /**
   * 获取单一数据库配置（未启用读写分离时）
   */
  private getSingleDatabaseConfig(): ReadWriteSeparationConfig {
    const masterConfig = this.getMasterConfig();

    return {
      enabled: false,
      master: masterConfig,
      slaves: [],
      loadBalancing: 'round-robin',
      healthCheck: {
        enabled: false,
        interval: 30000,
        timeout: 5000,
        retries: 3,
      },
      fallback: {
        enabled: false,
        fallbackToMaster: false,
      },
    };
  }

  /**
   * 获取数据库SSL配置
   */
  private getDatabaseSSLConfig(prefix: string): boolean | object {
    const sslEnabled = this.configService.get<boolean>(`DATABASE_${prefix}_SSL_ENABLED`, false);

    if (!sslEnabled) {
      return false;
    }

    return {
      ca: this.configService.get(`DATABASE_${prefix}_SSL_CA`),
      cert: this.configService.get(`DATABASE_${prefix}_SSL_CERT`),
      key: this.configService.get(`DATABASE_${prefix}_SSL_KEY`),
      rejectUnauthorized: this.configService.get<boolean>(
        `DATABASE_${prefix}_SSL_REJECT_UNAUTHORIZED`,
        true,
      ),
    };
  }

  /**
   * 获取数据库额外配置
   */
  private getDatabaseExtraConfig(prefix: string): any {
    return {
      connectionLimit: this.configService.get<number>(`DATABASE_${prefix}_CONNECTION_LIMIT`, 20),
      acquireTimeout: this.configService.get<number>(`DATABASE_${prefix}_ACQUIRE_TIMEOUT`, 60000),
      timeout: this.configService.get<number>(`DATABASE_${prefix}_TIMEOUT`, 30000),
      idleTimeout: this.configService.get<number>(`DATABASE_${prefix}_IDLE_TIMEOUT`, 300000),
      // 连接池配置
      max: this.configService.get<number>(`DATABASE_${prefix}_POOL_MAX`, 20),
      min: this.configService.get<number>(`DATABASE_${prefix}_POOL_MIN`, 2),
      idle: this.configService.get<number>(`DATABASE_${prefix}_POOL_IDLE`, 10000),
      acquire: this.configService.get<number>(`DATABASE_${prefix}_POOL_ACQUIRE`, 60000),
      evict: this.configService.get<number>(`DATABASE_${prefix}_POOL_EVICT`, 1000),
    };
  }

  /**
   * 获取TypeORM配置（主库）
   */
  getMasterTypeOrmConfig(): TypeOrmModuleOptions {
    const config = this.getReadWriteSeparationConfig();
    const masterConfig = config.master;

    return {
      type: masterConfig.type as any,
      host: masterConfig.host,
      port: masterConfig.port,
      username: masterConfig.username,
      password: masterConfig.password,
      database: masterConfig.database,
      charset: masterConfig.charset,
      timezone: masterConfig.timezone,
      ssl: masterConfig.ssl,
      extra: masterConfig.extra,
      synchronize: this.configService.get('NODE_ENV') === 'development',
      logging: this.configService.get('NODE_ENV') === 'development',
      entities: [], // 将在模块中设置
      name: 'master', // 连接名称
    };
  }

  /**
   * 获取TypeORM配置（从库）
   */
  getSlaveTypeOrmConfigs(): TypeOrmModuleOptions[] {
    const config = this.getReadWriteSeparationConfig();

    if (!config.enabled || config.slaves.length === 0) {
      return [];
    }

    return config.slaves.map((slaveConfig, index) => ({
      type: slaveConfig.type as any,
      host: slaveConfig.host,
      port: slaveConfig.port,
      username: slaveConfig.username,
      password: slaveConfig.password,
      database: slaveConfig.database,
      charset: slaveConfig.charset,
      timezone: slaveConfig.timezone,
      ssl: slaveConfig.ssl,
      extra: slaveConfig.extra,
      synchronize: false, // 从库不同步
      logging: this.configService.get('NODE_ENV') === 'development',
      entities: [], // 将在模块中设置
      name: `slave_${index + 1}`, // 连接名称
    }));
  }

  /**
   * 验证配置有效性
   */
  validateConfig(): boolean {
    try {
      const config = this.getReadWriteSeparationConfig();

      // 验证主库配置
      if (!config.master.host || !config.master.database) {
        this.logger.error('主库配置无效：缺少主机或数据库名称');
        return false;
      }

      // 验证从库配置
      if (config.enabled && config.slaves.length > 0) {
        for (const slave of config.slaves) {
          if (!slave.host || !slave.database) {
            this.logger.error('从库配置无效：缺少主机或数据库名称');
            return false;
          }
        }
      }

      this.logger.log('数据库配置验证通过');
      return true;
    } catch (error) {
      this.logger.error('数据库配置验证失败', error);
      return false;
    }
  }
}
