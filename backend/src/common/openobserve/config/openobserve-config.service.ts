import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Joi from 'joi';

/**
 * OpenObserve配置接口
 */
export interface OpenObserveConfig {
  enabled: boolean;
  url: string;
  organization: string;
  token?: string;
  username?: string;
  password?: string;
  timeout: number;
  retryCount: number;
  retryDelay: number;
  batchSize: number;
  compression: boolean;
  metrics: {
    enabled: boolean;
    interval: number;
  };
  tracing: {
    enabled: boolean;
    sampleRate: number;
  };
}

/**
 * 配置验证Schema
 */
const OPENOBSERVE_CONFIG_SCHEMA = Joi.object({
  OPENOBSERVE_ENABLED: Joi.boolean().default(false),
  OPENOBSERVE_URL: Joi.when('OPENOBSERVE_ENABLED', {
    is: true,
    then: Joi.string().uri().required(),
    otherwise: Joi.string().uri().default('http://localhost:5080'),
  }),
  OPENOBSERVE_ORGANIZATION: Joi.when('OPENOBSERVE_ENABLED', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().default('default'),
  }),
  OPENOBSERVE_TOKEN: Joi.string().when('OPENOBSERVE_ENABLED', {
    is: true,
    then: Joi.when('OPENOBSERVE_USERNAME', {
      is: Joi.exist(),
      otherwise: Joi.required(),
      then: Joi.optional(),
    }),
    otherwise: Joi.optional(),
  }),
  OPENOBSERVE_USERNAME: Joi.string().when('OPENOBSERVE_ENABLED', {
    is: true,
    then: Joi.when('OPENOBSERVE_TOKEN', {
      is: Joi.exist(),
      otherwise: Joi.required(),
      then: Joi.optional(),
    }),
    otherwise: Joi.optional(),
  }),
  OPENOBSERVE_PASSWORD: Joi.string().when('OPENOBSERVE_ENABLED', {
    is: true,
    then: Joi.when('OPENOBSERVE_USERNAME', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    otherwise: Joi.optional(),
  }),
  OPENOBSERVE_TIMEOUT: Joi.number().integer().min(1000).max(60000).default(10000),
  OPENOBSERVE_RETRY_COUNT: Joi.number().integer().min(0).max(10).default(3),
  OPENOBSERVE_RETRY_DELAY: Joi.number().integer().min(100).max(10000).default(1000),
  OPENOBSERVE_BATCH_SIZE: Joi.number().integer().min(1).max(1000).default(100),
  OPENOBSERVE_COMPRESSION: Joi.boolean().default(true),
  OPENOBSERVE_METRICS_ENABLED: Joi.boolean().default(false),
  OPENOBSERVE_METRICS_INTERVAL: Joi.number().integer().min(1000).max(300000).default(30000),
  OPENOBSERVE_TRACING_ENABLED: Joi.boolean().default(false),
  OPENOBSERVE_TRACING_SAMPLE_RATE: Joi.number().min(0).max(1).default(0.1),
});

/**
 * OpenObserve配置服务
 * 提供配置验证、类型安全和热重载支持
 */
@Injectable()
export class OpenObserveConfigService implements OnModuleInit {
  private config: OpenObserveConfig;
  private configVersion: number = 0;

  constructor(private readonly configService: ConfigService) {}

  /**
   * 模块初始化时验证配置
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.validateAndLoadConfig();
      console.log('[OpenObserveConfig] Configuration loaded successfully');
    } catch (error) {
      console.error('[OpenObserveConfig] Configuration validation failed:', error.message);
      throw error;
    }
  }

  /**
   * 验证并加载配置
   */
  private async validateAndLoadConfig(): Promise<void> {
    // 提取环境变量
    const envVars = {
      OPENOBSERVE_ENABLED: this.configService.get('OPENOBSERVE_ENABLED'),
      OPENOBSERVE_URL: this.configService.get('OPENOBSERVE_URL'),
      OPENOBSERVE_ORGANIZATION: this.configService.get('OPENOBSERVE_ORGANIZATION'),
      OPENOBSERVE_TOKEN: this.configService.get('OPENOBSERVE_TOKEN'),
      OPENOBSERVE_USERNAME: this.configService.get('OPENOBSERVE_USERNAME'),
      OPENOBSERVE_PASSWORD: this.configService.get('OPENOBSERVE_PASSWORD'),
      OPENOBSERVE_TIMEOUT: this.configService.get('OPENOBSERVE_TIMEOUT'),
      OPENOBSERVE_RETRY_COUNT: this.configService.get('OPENOBSERVE_RETRY_COUNT'),
      OPENOBSERVE_RETRY_DELAY: this.configService.get('OPENOBSERVE_RETRY_DELAY'),
      OPENOBSERVE_BATCH_SIZE: this.configService.get('OPENOBSERVE_BATCH_SIZE'),
      OPENOBSERVE_COMPRESSION: this.configService.get('OPENOBSERVE_COMPRESSION'),
      OPENOBSERVE_METRICS_ENABLED: this.configService.get('OPENOBSERVE_METRICS_ENABLED'),
      OPENOBSERVE_METRICS_INTERVAL: this.configService.get('OPENOBSERVE_METRICS_INTERVAL'),
      OPENOBSERVE_TRACING_ENABLED: this.configService.get('OPENOBSERVE_TRACING_ENABLED'),
      OPENOBSERVE_TRACING_SAMPLE_RATE: this.configService.get('OPENOBSERVE_TRACING_SAMPLE_RATE'),
    };

    // 验证配置
    const { error, value } = OPENOBSERVE_CONFIG_SCHEMA.validate(envVars, {
      allowUnknown: true,
      stripUnknown: true,
    });

    if (error) {
      throw new Error(`OpenObserve configuration validation failed: ${error.message}`);
    }

    // 构建配置对象
    this.config = {
      enabled: value.OPENOBSERVE_ENABLED,
      url: this.normalizeUrl(value.OPENOBSERVE_URL),
      organization: value.OPENOBSERVE_ORGANIZATION,
      token: value.OPENOBSERVE_TOKEN,
      username: value.OPENOBSERVE_USERNAME,
      password: value.OPENOBSERVE_PASSWORD,
      timeout: value.OPENOBSERVE_TIMEOUT,
      retryCount: value.OPENOBSERVE_RETRY_COUNT,
      retryDelay: value.OPENOBSERVE_RETRY_DELAY,
      batchSize: value.OPENOBSERVE_BATCH_SIZE,
      compression: value.OPENOBSERVE_COMPRESSION,
      metrics: {
        enabled: value.OPENOBSERVE_METRICS_ENABLED,
        interval: value.OPENOBSERVE_METRICS_INTERVAL,
      },
      tracing: {
        enabled: value.OPENOBSERVE_TRACING_ENABLED,
        sampleRate: value.OPENOBSERVE_TRACING_SAMPLE_RATE,
      },
    };

    // 验证认证配置
    this.validateAuthentication();

    this.configVersion++;
  }

  /**
   * 标准化URL格式
   */
  private normalizeUrl(url: string): string {
    if (!url) return url;
    return url.replace(/\/+$/, ''); // 移除尾部斜杠
  }

  /**
   * 验证认证配置
   */
  private validateAuthentication(): void {
    if (!this.config.enabled) return;

    if (!this.config.token && (!this.config.username || !this.config.password)) {
      throw new Error(
        'OpenObserve authentication configuration is invalid. ' +
        'Either OPENOBSERVE_TOKEN or both OPENOBSERVE_USERNAME and OPENOBSERVE_PASSWORD must be provided.'
      );
    }

    // 记录认证方式
    if (this.config.token) {
      console.log('[OpenObserveConfig] Using token authentication');
    } else {
      console.log('[OpenObserveConfig] Using username/password authentication');
    }
  }

  /**
   * 获取完整配置
   */
  getConfig(): OpenObserveConfig {
    return { ...this.config };
  }

  /**
   * 获取配置版本
   */
  getConfigVersion(): number {
    return this.configVersion;
  }

  /**
   * 检查是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * 获取认证头信息
   */
  getAuthHeaders(): Record<string, string> {
    if (!this.config.enabled) {
      throw new Error('OpenObserve is not enabled');
    }

    const headers: Record<string, string> = {};

    if (this.config.token) {
      // Token认证优先级最高
      headers['Authorization'] = `Bearer ${this.config.token}`;
    } else if (this.config.username && this.config.password) {
      // Basic认证作为备选
      const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    } else {
      throw new Error('No valid authentication configuration found');
    }

    return headers;
  }

  /**
   * 获取API端点
   */
  getApiEndpoint(stream: string): string {
    if (!this.config.enabled) {
      throw new Error('OpenObserve is not enabled');
    }

    return `${this.config.url}/api/${this.config.organization}/${stream}/_json`;
  }

  /**
   * 获取健康检查端点
   */
  getHealthEndpoint(): string {
    if (!this.config.enabled) {
      throw new Error('OpenObserve is not enabled');
    }

    return `${this.config.url}/api/_health`;
  }

  /**
   * 获取搜索端点
   */
  getSearchEndpoint(): string {
    if (!this.config.enabled) {
      throw new Error('OpenObserve is not enabled');
    }

    return `${this.config.url}/api/${this.config.organization}/_search`;
  }

  /**
   * 获取统计端点
   */
  getStatsEndpoint(): string {
    if (!this.config.enabled) {
      throw new Error('OpenObserve is not enabled');
    }

    return `${this.config.url}/api/${this.config.organization}/_stats`;
  }

  /**
   * 验证配置完整性
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.url) {
      errors.push('URL is required');
    }

    if (!this.config.organization) {
      errors.push('Organization is required');
    }

    if (!this.config.token && (!this.config.username || !this.config.password)) {
      errors.push('Either token or username/password is required for authentication');
    }

    if (this.config.timeout <= 0) {
      errors.push('Timeout must be greater than 0');
    }

    if (this.config.retryCount < 0) {
      errors.push('Retry count must be non-negative');
    }

    if (this.config.batchSize <= 0) {
      errors.push('Batch size must be greater than 0');
    }

    if (this.config.metrics.interval <= 0) {
      errors.push('Metrics interval must be greater than 0');
    }

    if (this.config.tracing.sampleRate < 0 || this.config.tracing.sampleRate > 1) {
      errors.push('Tracing sample rate must be between 0 and 1');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 重新加载配置（支持热重载）
   */
  async reloadConfig(): Promise<void> {
    try {
      await this.validateAndLoadConfig();
      console.log('[OpenObserveConfig] Configuration reloaded successfully');
    } catch (error) {
      console.error('[OpenObserveConfig] Configuration reload failed:', error.message);
      throw error;
    }
  }

  /**
   * 获取配置摘要（用于日志和监控）
   */
  getConfigSummary(): Record<string, any> {
    return {
      enabled: this.config.enabled,
      url: this.config.url,
      organization: this.config.organization,
      hasToken: !!this.config.token,
      hasCredentials: !!(this.config.username && this.config.password),
      timeout: this.config.timeout,
      retryCount: this.config.retryCount,
      batchSize: this.config.batchSize,
      compression: this.config.compression,
      metrics: this.config.metrics,
      tracing: this.config.tracing,
      configVersion: this.configVersion,
    };
  }
}