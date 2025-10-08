import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as Joi from 'joi';
import { Redis } from 'ioredis';
/* fallback to require to avoid TS2307 resolution issues during build */
const { watch } = require('chokidar');

// 配置源类型
export enum ConfigSourceType {
  FILE = 'file',
  ENVIRONMENT = 'environment',
  REDIS = 'redis',
  DATABASE = 'database',
  CONSUL = 'consul',
  ETCD = 'etcd',
  HTTP = 'http',
}

// 配置格式
export enum ConfigFormat {
  JSON = 'json',
  YAML = 'yaml',
  TOML = 'toml',
  INI = 'ini',
  ENV = 'env',
}

// 配置源接口
export interface ConfigSource {
  type: ConfigSourceType;
  name: string;
  priority: number;
  enabled: boolean;
  format?: ConfigFormat;
  path?: string;
  url?: string;
  options?: any;
  watchEnabled?: boolean;
  refreshInterval?: number;
}

// 配置变更事件
export interface ConfigChangeEvent {
  key: string;
  oldValue: any;
  newValue: any;
  source: string;
  timestamp: Date;
  environment: string;
}

// 配置验证规则
export interface ConfigValidationRule {
  key: string;
  schema: Joi.Schema;
  required?: boolean;
  description?: string;
}

// 配置元数据
export interface ConfigMetadata {
  key: string;
  type: string;
  description: string;
  defaultValue: any;
  environment: string;
  source: string;
  lastUpdated: Date;
  version: string;
}

// 配置快照
export interface ConfigSnapshot {
  id: string;
  timestamp: Date;
  environment: string;
  config: Record<string, any>;
  metadata: ConfigMetadata[];
  checksum: string;
}

// 配置统计
export interface ConfigStats {
  totalKeys: number;
  sourceStats: Record<string, number>;
  environmentStats: Record<string, number>;
  lastRefresh: Date;
  refreshCount: number;
  errorCount: number;
  changeCount: number;
}

// 配置服务配置
export interface DynamicConfigServiceConfig {
  environment: string;
  sources: ConfigSource[];
  validation: {
    enabled: boolean;
    rules: ConfigValidationRule[];
    strictMode: boolean;
  };
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  persistence: {
    enabled: boolean;
    snapshotInterval: number;
    maxSnapshots: number;
    storageType: 'file' | 'redis' | 'database';
    storagePath?: string;
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    alertThresholds: {
      errorRate: number;
      refreshFailures: number;
    };
  };
  security: {
    encryption: {
      enabled: boolean;
      algorithm: string;
      key?: string;
    };
    masking: {
      enabled: boolean;
      patterns: string[];
    };
  };
}

@Injectable()
export class DynamicConfigService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DynamicConfigService.name);
  private readonly configCache = new Map<string, any>();
  private readonly configMetadata = new Map<string, ConfigMetadata>();
  private readonly watchers = new Map<string, any>();
  private readonly refreshTimers = new Map<string, NodeJS.Timeout>();

  private config: DynamicConfigServiceConfig;
  private redis: Redis;
  private stats: ConfigStats;
  private isInitialized = false;

  constructor(
    private readonly nestConfigService: NestConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.stats = {
      totalKeys: 0,
      sourceStats: {},
      environmentStats: {},
      lastRefresh: new Date(),
      refreshCount: 0,
      errorCount: 0,
      changeCount: 0,
    };
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.initialize();
      this.logger.log('Dynamic config service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize dynamic config service', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.cleanup();
  }

  private async initialize(): Promise<void> {
    // 加载配置
    this.config = await this.loadServiceConfig();

    // 初始化Redis连接
    if (this.hasRedisSource() || this.config.persistence.storageType === 'redis') {
      const redisOptions = this.nestConfigService.get('redis');
      if (redisOptions) {
        this.redis = new Redis(redisOptions);
      }
    }

    // 加载所有配置源
    await this.loadAllSources();

    // 验证配置
    if (this.config.validation.enabled) {
      await this.validateAllConfigs();
    }

    // 设置文件监听
    this.setupFileWatchers();

    // 设置定时刷新
    this.setupRefreshTimers();

    // 创建初始快照
    if (this.config.persistence.enabled) {
      await this.createSnapshot();
    }

    this.isInitialized = true;
  }

  private async loadServiceConfig(): Promise<DynamicConfigServiceConfig> {
    const defaultConfig: DynamicConfigServiceConfig = {
      environment: this.nestConfigService.get('NODE_ENV', 'development'),
      sources: [
        {
          type: ConfigSourceType.ENVIRONMENT,
          name: 'environment',
          priority: 1,
          enabled: true,
        },
        {
          type: ConfigSourceType.FILE,
          name: 'app-config',
          priority: 2,
          enabled: true,
          format: ConfigFormat.YAML,
          path: './config/app.yaml',
          watchEnabled: true,
        },
      ],
      validation: {
        enabled: this.nestConfigService.get('CONFIG_VALIDATION_ENABLED', true),
        rules: [],
        strictMode: this.nestConfigService.get('CONFIG_STRICT_MODE', false),
      },
      caching: {
        enabled: true,
        ttl: 300000, // 5 minutes
        maxSize: 1000,
      },
      persistence: {
        enabled: this.nestConfigService.get('CONFIG_PERSISTENCE_ENABLED', true),
        snapshotInterval: 3600000, // 1 hour
        maxSnapshots: 24,
        storageType: 'file',
        storagePath: './config/snapshots',
      },
      monitoring: {
        enabled: true,
        metricsInterval: 60000, // 1 minute
        alertThresholds: {
          errorRate: 0.1,
          refreshFailures: 5,
        },
      },
      security: {
        encryption: {
          enabled: this.nestConfigService.get('CONFIG_ENCRYPTION_ENABLED', false),
          algorithm: 'aes-256-gcm',
          key: this.nestConfigService.get('CONFIG_ENCRYPTION_KEY'),
        },
        masking: {
          enabled: true,
          patterns: ['password', 'secret', 'key', 'token', 'credential'],
        },
      },
    };

    // 尝试从文件加载配置
    try {
      const configPath = this.nestConfigService.get(
        'CONFIG_SERVICE_CONFIG_PATH',
        './config/config-service.yaml',
      );
      const configFile = await fs.readFile(configPath, 'utf-8');
      const fileConfig = yaml.load(configFile) as Partial<DynamicConfigServiceConfig>;

      return { ...defaultConfig, ...fileConfig };
    } catch (error) {
      this.logger.warn('Could not load config service configuration file, using defaults');
      return defaultConfig;
    }
  }

  private async loadAllSources(): Promise<void> {
    const sortedSources = this.config.sources
      .filter(source => source.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const source of sortedSources) {
      try {
        await this.loadConfigSource(source);
        this.stats.sourceStats[source.name] = (this.stats.sourceStats[source.name] || 0) + 1;
      } catch (error) {
        this.logger.error(`Failed to load config source: ${source.name}`, error);
        this.stats.errorCount++;
      }
    }

    this.stats.totalKeys = this.configCache.size;
    this.stats.lastRefresh = new Date();
    this.stats.refreshCount++;
  }

  private async loadConfigSource(source: ConfigSource): Promise<void> {
    this.logger.debug(`Loading config source: ${source.name} (${source.type})`);

    switch (source.type) {
      case ConfigSourceType.FILE:
        await this.loadFileSource(source);
        break;
      case ConfigSourceType.ENVIRONMENT:
        await this.loadEnvironmentSource(source);
        break;
      case ConfigSourceType.REDIS:
        await this.loadRedisSource(source);
        break;
      case ConfigSourceType.HTTP:
        await this.loadHttpSource(source);
        break;
      default:
        throw new Error(`Unsupported config source type: ${source.type}`);
    }
  }

  private async loadFileSource(source: ConfigSource): Promise<void> {
    if (!source.path) {
      throw new Error('File source requires path');
    }

    try {
      const filePath = path.resolve(source.path);
      const content = await fs.readFile(filePath, 'utf-8');
      const config = this.parseConfigContent(content, source.format || ConfigFormat.YAML);

      this.mergeConfig(config, source.name);

      this.logger.debug(`Loaded ${Object.keys(config).length} keys from file: ${source.path}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.warn(`Config file not found: ${source.path}`);
      } else {
        throw error;
      }
    }
  }

  private async loadEnvironmentSource(source: ConfigSource): Promise<void> {
    const envConfig: Record<string, any> = {};

    // 加载所有环境变量
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        envConfig[key] = this.parseEnvironmentValue(value);
      }
    }

    this.mergeConfig(envConfig, source.name);
    this.logger.debug(`Loaded ${Object.keys(envConfig).length} environment variables`);
  }

  private async loadRedisSource(source: ConfigSource): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis not initialized for Redis config source');
    }

    const pattern = source.options?.pattern || 'config:*';
    const keys = await this.redis.keys(pattern);
    const config: Record<string, any> = {};

    for (const key of keys) {
      const value = await this.redis.get(key);
      if (value) {
        const configKey = key.replace(/^config:/, '');
        config[configKey] = this.parseConfigValue(value);
      }
    }

    this.mergeConfig(config, source.name);
    this.logger.debug(`Loaded ${Object.keys(config).length} keys from Redis`);
  }

  private async loadHttpSource(source: ConfigSource): Promise<void> {
    if (!source.url) {
      throw new Error('HTTP source requires URL');
    }

    try {
      const response = await fetch(source.url, {
        headers: source.options?.headers || {},
        signal: AbortSignal.timeout(source.options?.timeout || 5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      const config = this.parseConfigContent(content, source.format || ConfigFormat.JSON);

      this.mergeConfig(config, source.name);
      this.logger.debug(`Loaded ${Object.keys(config).length} keys from HTTP: ${source.url}`);
    } catch (error) {
      throw new Error(`Failed to load HTTP config from ${source.url}: ${error.message}`);
    }
  }

  private parseConfigContent(content: string, format: ConfigFormat): Record<string, any> {
    switch (format) {
      case ConfigFormat.JSON:
        return JSON.parse(content);
      case ConfigFormat.YAML:
        return yaml.load(content) as Record<string, any>;
      case ConfigFormat.ENV:
        return this.parseEnvContent(content);
      default:
        throw new Error(`Unsupported config format: ${format}`);
    }
  }

  private parseEnvContent(content: string): Record<string, any> {
    const config: Record<string, any> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          config[key.trim()] = this.parseEnvironmentValue(value.trim());
        }
      }
    }

    return config;
  }

  private parseEnvironmentValue(value: string): any {
    // 移除引号
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // 尝试解析为JSON
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    // 解析布尔值
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // 解析数字
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

    return value;
  }

  private parseConfigValue(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private mergeConfig(config: Record<string, any>, sourceName: string): void {
    for (const [key, value] of Object.entries(config)) {
      const oldValue = this.configCache.get(key);

      if (oldValue !== value) {
        this.configCache.set(key, value);

        // 更新元数据
        this.configMetadata.set(key, {
          key,
          type: typeof value,
          description: '',
          defaultValue: value,
          environment: this.config.environment,
          source: sourceName,
          lastUpdated: new Date(),
          version: '1.0.0',
        });

        // 发送变更事件
        if (oldValue !== undefined) {
          this.emitConfigChange(key, oldValue, value, sourceName);
          this.stats.changeCount++;
        }
      }
    }
  }

  private emitConfigChange(key: string, oldValue: any, newValue: any, source: string): void {
    const event: ConfigChangeEvent = {
      key,
      oldValue,
      newValue,
      source,
      timestamp: new Date(),
      environment: this.config.environment,
    };

    this.eventEmitter.emit('config.changed', event);
    this.eventEmitter.emit(`config.changed.${key}`, event);

    this.logger.debug(
      `Config changed: ${key} = ${this.maskSensitiveValue(key, newValue)} (source: ${source})`,
    );
  }

  private setupFileWatchers(): void {
    const fileSources = this.config.sources.filter(
      source => source.type === ConfigSourceType.FILE && source.watchEnabled,
    );

    for (const source of fileSources) {
      if (source.path) {
        const watcher = watch(source.path, {
          persistent: true,
          ignoreInitial: true,
        });

        watcher.on('change', async () => {
          this.logger.debug(`Config file changed: ${source.path}`);
          try {
            await this.loadConfigSource(source);
          } catch (error) {
            this.logger.error(`Failed to reload config file: ${source.path}`, error);
            this.stats.errorCount++;
          }
        });

        this.watchers.set(source.name, watcher);
      }
    }
  }

  private setupRefreshTimers(): void {
    const refreshSources = this.config.sources.filter(
      source => source.refreshInterval && source.refreshInterval > 0,
    );

    for (const source of refreshSources) {
      const timer = setInterval(async () => {
        try {
          await this.loadConfigSource(source);
        } catch (error) {
          this.logger.error(`Failed to refresh config source: ${source.name}`, error);
          this.stats.errorCount++;
        }
      }, source.refreshInterval);

      this.refreshTimers.set(source.name, timer);
    }
  }

  private async validateAllConfigs(): Promise<void> {
    if (!this.config.validation.rules.length) {
      return;
    }

    const errors: string[] = [];

    for (const rule of this.config.validation.rules) {
      try {
        const value = this.get(rule.key);

        if (rule.required && (value === undefined || value === null)) {
          errors.push(`Required config key missing: ${rule.key}`);
          continue;
        }

        if (value !== undefined && value !== null) {
          const { error } = rule.schema.validate(value);
          if (error) {
            errors.push(`Config validation failed for ${rule.key}: ${error.message}`);
          }
        }
      } catch (error) {
        errors.push(`Config validation error for ${rule.key}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      const message = `Config validation failed:\n${errors.join('\n')}`;

      if (this.config.validation.strictMode) {
        throw new Error(message);
      } else {
        this.logger.warn(message);
      }
    }
  }

  private hasRedisSource(): boolean {
    return this.config.sources.some(source => source.type === ConfigSourceType.REDIS);
  }

  private maskSensitiveValue(key: string, value: any): any {
    if (!this.config.security.masking.enabled) {
      return value;
    }

    const keyLower = key.toLowerCase();
    const isSensitive = this.config.security.masking.patterns.some(pattern =>
      keyLower.includes(pattern.toLowerCase()),
    );

    if (isSensitive && typeof value === 'string') {
      return '*'.repeat(Math.min(value.length, 8));
    }

    return value;
  }

  // 公共API方法

  /**
   * 获取配置值
   */
  get<T = any>(key: string, defaultValue?: T): T {
    const value = this.configCache.get(key);
    return (value !== undefined ? value : defaultValue) as T;
  }

  /**
   * 设置配置值
   */
  async set(key: string, value: any, source = 'runtime'): Promise<void> {
    const oldValue = this.configCache.get(key);
    this.configCache.set(key, value);

    // 更新元数据
    this.configMetadata.set(key, {
      key,
      type: typeof value,
      description: '',
      defaultValue: value,
      environment: this.config.environment,
      source,
      lastUpdated: new Date(),
      version: '1.0.0',
    });

    // 持久化到Redis
    if (this.redis && source === 'runtime') {
      await this.redis.set(`config:${key}`, JSON.stringify(value));
    }

    // 发送变更事件
    this.emitConfigChange(key, oldValue, value, source);
    this.stats.changeCount++;
  }

  /**
   * 删除配置值
   */
  async delete(key: string): Promise<boolean> {
    const existed = this.configCache.has(key);

    if (existed) {
      const oldValue = this.configCache.get(key);
      this.configCache.delete(key);
      this.configMetadata.delete(key);

      // 从Redis删除
      if (this.redis) {
        await this.redis.del(`config:${key}`);
      }

      // 发送变更事件
      this.emitConfigChange(key, oldValue, undefined, 'runtime');
      this.stats.changeCount++;
    }

    return existed;
  }

  /**
   * 检查配置键是否存在
   */
  has(key: string): boolean {
    return this.configCache.has(key);
  }

  /**
   * 获取所有配置键
   */
  keys(): string[] {
    return Array.from(this.configCache.keys());
  }

  /**
   * 获取所有配置
   */
  getAll(): Record<string, any> {
    const config: Record<string, any> = {};

    for (const [key, value] of this.configCache.entries()) {
      config[key] = value;
    }

    return config;
  }

  /**
   * 获取配置元数据
   */
  getMetadata(key?: string): ConfigMetadata | ConfigMetadata[] {
    if (key) {
      const metadata = this.configMetadata.get(key);
      if (!metadata) {
        throw new Error(`Configuration metadata not found for key: ${key}`);
      }
      return metadata;
    }

    return Array.from(this.configMetadata.values());
  }

  /**
   * 刷新所有配置源
   */
  async refresh(): Promise<void> {
    this.logger.log('Refreshing all config sources');
    await this.loadAllSources();
  }

  /**
   * 刷新特定配置源
   */
  async refreshSource(sourceName: string): Promise<void> {
    const source = this.config.sources.find(s => s.name === sourceName);

    if (!source) {
      throw new Error(`Config source not found: ${sourceName}`);
    }

    await this.loadConfigSource(source);
  }

  /**
   * 创建配置快照
   */
  async createSnapshot(): Promise<ConfigSnapshot> {
    const snapshot: ConfigSnapshot = {
      id: `snapshot-${Date.now()}`,
      timestamp: new Date(),
      environment: this.config.environment,
      config: this.getAll(),
      metadata: Array.from(this.configMetadata.values()),
      checksum: this.calculateChecksum(this.getAll()),
    };

    if (this.config.persistence.enabled) {
      await this.saveSnapshot(snapshot);
    }

    return snapshot;
  }

  /**
   * 恢复配置快照
   */
  async restoreSnapshot(snapshotId: string): Promise<void> {
    const snapshot = await this.loadSnapshot(snapshotId);

    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    // 清空当前配置
    this.configCache.clear();
    this.configMetadata.clear();

    // 恢复配置
    for (const [key, value] of Object.entries(snapshot.config)) {
      this.configCache.set(key, value);
    }

    for (const metadata of snapshot.metadata) {
      this.configMetadata.set(metadata.key, metadata);
    }

    this.logger.log(`Restored config from snapshot: ${snapshotId}`);
  }

  /**
   * 获取配置统计
   */
  getStats(): ConfigStats {
    return { ...this.stats };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    const details: any = {
      initialized: this.isInitialized,
      totalKeys: this.configCache.size,
      sources: this.config.sources.length,
      errorRate: this.stats.refreshCount > 0 ? this.stats.errorCount / this.stats.refreshCount : 0,
    };

    // 检查Redis连接
    if (this.redis) {
      try {
        await this.redis.ping();
        details.redis = 'connected';
      } catch (error) {
        details.redis = 'disconnected';
        details.redisError = error.message;
      }
    }

    const status =
      details.errorRate > this.config.monitoring.alertThresholds.errorRate
        ? 'unhealthy'
        : 'healthy';

    return { status, details };
  }

  // 定时任务

  @Cron(CronExpression.EVERY_HOUR)
  async createPeriodicSnapshot(): Promise<void> {
    if (this.config.persistence.enabled) {
      try {
        await this.createSnapshot();
        await this.cleanupOldSnapshots();
      } catch (error) {
        this.logger.error('Failed to create periodic snapshot', error);
      }
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async updateMetrics(): Promise<void> {
    if (this.config.monitoring.enabled) {
      this.stats.totalKeys = this.configCache.size;
      this.stats.environmentStats[this.config.environment] = this.configCache.size;
    }
  }

  // 私有辅助方法

  private calculateChecksum(config: Record<string, any>): string {
    const crypto = require('crypto');
    const content = JSON.stringify(config, Object.keys(config).sort());
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private async saveSnapshot(snapshot: ConfigSnapshot): Promise<void> {
    switch (this.config.persistence.storageType) {
      case 'file':
        await this.saveSnapshotToFile(snapshot);
        break;
      case 'redis':
        await this.saveSnapshotToRedis(snapshot);
        break;
      default:
        throw new Error(`Unsupported storage type: ${this.config.persistence.storageType}`);
    }
  }

  private async saveSnapshotToFile(snapshot: ConfigSnapshot): Promise<void> {
    const dir = this.config.persistence.storagePath || './config/snapshots';
    await fs.mkdir(dir, { recursive: true });

    const filePath = path.join(dir, `${snapshot.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2));
  }

  private async saveSnapshotToRedis(snapshot: ConfigSnapshot): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis not available for snapshot storage');
    }

    await this.redis.set(`snapshot:${snapshot.id}`, JSON.stringify(snapshot));
    await this.redis.expire(`snapshot:${snapshot.id}`, 86400 * 7); // 7 days
  }

  private async loadSnapshot(snapshotId: string): Promise<ConfigSnapshot | null> {
    switch (this.config.persistence.storageType) {
      case 'file':
        return await this.loadSnapshotFromFile(snapshotId);
      case 'redis':
        return await this.loadSnapshotFromRedis(snapshotId);
      default:
        throw new Error(`Unsupported storage type: ${this.config.persistence.storageType}`);
    }
  }

  private async loadSnapshotFromFile(snapshotId: string): Promise<ConfigSnapshot | null> {
    try {
      const dir = this.config.persistence.storagePath || './config/snapshots';
      const filePath = path.join(dir, `${snapshotId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  private async loadSnapshotFromRedis(snapshotId: string): Promise<ConfigSnapshot | null> {
    if (!this.redis) {
      return null;
    }

    const content = await this.redis.get(`snapshot:${snapshotId}`);
    return content ? JSON.parse(content) : null;
  }

  private async cleanupOldSnapshots(): Promise<void> {
    // 实现快照清理逻辑
    // 这里简化实现，实际应该根据配置清理旧快照
  }

  private async cleanup(): Promise<void> {
    // 关闭文件监听器
    for (const watcher of this.watchers.values()) {
      await watcher.close();
    }
    this.watchers.clear();

    // 清除定时器
    for (const timer of this.refreshTimers.values()) {
      clearInterval(timer);
    }
    this.refreshTimers.clear();

    // 关闭Redis连接
    if (this.redis) {
      await this.redis.disconnect();
    }

    this.logger.log('Dynamic config service cleaned up');
  }
}
