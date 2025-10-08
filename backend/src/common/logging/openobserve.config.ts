// OpenObserve日志配置
// 用途：OpenObserve日志传输器配置
// 依赖文件：logging.service.ts
// 作者：后端开发团队
// 时间：2025-10-06

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as zlib from 'zlib';

export interface OpenObserveConfig {
  enabled: boolean;
  url: string;
  organization: string;
  stream: string;
  username?: string;
  password?: string;
  token?: string;
  batchSize: number;
  flushInterval: number;
  compression: boolean;
  timeout: number;
  retryCount: number;
  retryDelay: number;
}

export interface OpenObserveLogEntry {
  timestamp: string;
  level: string;
  message: string;
  service: string;
  environment: string;
  version: string;
  host: string;
  pid: number;
  traceId?: string;
  spanId?: string;
  userId?: string;
  requestId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  userAgent?: string;
  ip?: string;
  [key: string]: any;
}

@Injectable()
export class OpenObserveConfigService {
  private config: OpenObserveConfig;

  constructor(private configService: ConfigService) {
    this.initializeConfig();
  }

  private initializeConfig(): void {
    // 计算启用开关：优先使用全局 OPENOBSERVE_ENABLED，其次 LOGGING_OPENOBSERVE_ENABLED
    const envFlag = process.env.OPENOBSERVE_ENABLED;
    const rawCfg = this.configService.get<string | boolean>('LOGGING_OPENOBSERVE_ENABLED', false as any);
    const parseBool = (v: any): boolean => {
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') {
        const s = v.toLowerCase();
        return s === 'true' || s === '1' || s === 'yes' || s === 'on';
      }
      return false;
    };
    const enabled = envFlag !== undefined ? parseBool(envFlag) : parseBool(rawCfg);

    this.config = {
      enabled,
      url: this.configService.get<string>('LOGGING_OPENOBSERVE_URL', 'http://localhost:5080'),
      organization: this.configService.get<string>('LOGGING_OPENOBSERVE_ORGANIZATION', 'default'),
      stream: this.configService.get<string>('LOGGING_OPENOBSERVE_STREAM', 'application-logs'),
      username: this.configService.get<string>('LOGGING_OPENOBSERVE_USERNAME'),
      password: this.configService.get<string>('LOGGING_OPENOBSERVE_PASSWORD'),
      token: this.configService.get<string>('LOGGING_OPENOBSERVE_TOKEN'),
      batchSize: this.configService.get<number>('LOGGING_OPENOBSERVE_BATCH_SIZE', 100),
      flushInterval: this.configService.get<number>('LOGGING_OPENOBSERVE_FLUSH_INTERVAL', 5000),
      compression: this.configService.get<boolean>('LOGGING_OPENOBSERVE_COMPRESSION', true),
      timeout: this.configService.get<number>('LOGGING_OPENOBSERVE_TIMEOUT', 10000),
      retryCount: this.configService.get<number>('LOGGING_OPENOBSERVE_RETRY_COUNT', 3),
      retryDelay: this.configService.get<number>('LOGGING_OPENOBSERVE_RETRY_DELAY', 1000),
    };
  }

  getConfig(): OpenObserveConfig {
    return { ...this.config };
  }

  // 验证配置
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.url) {
      errors.push('OpenObserve URL is required');
    }

    if (!this.config.organization) {
      errors.push('OpenObserve organization is required');
    }

    if (!this.config.stream) {
      errors.push('OpenObserve stream name is required');
    }

    if (!this.config.token && (!this.config.username || !this.config.password)) {
      errors.push('Either token or username/password is required for authentication');
    }

    if (this.config.batchSize <= 0) {
      errors.push('Batch size must be greater than 0');
    }

    if (this.config.flushInterval <= 0) {
      errors.push('Flush interval must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // 测试连接
  async testConnection(): Promise<{ success: boolean; message: string; responseTime?: number }> {
    if (!this.config.enabled) {
      return { success: false, message: 'OpenObserve logging is disabled' };
    }

    const validation = this.validateConfig();
    if (!validation.isValid) {
      return { success: false, message: `Configuration errors: ${validation.errors.join(', ')}` };
    }

    try {
      const startTime = Date.now();
      const url = `${this.config.url}/api/${this.config.organization}/_health`;

      const headers: any = {};
      if (this.config.token) {
        headers['Authorization'] = `Bearer ${this.config.token}`;
      } else if (this.config.username && this.config.password) {
        const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString(
          'base64',
        );
        headers['Authorization'] = `Basic ${credentials}`;
      }

      const response = await axios.get(url, {
        headers,
        timeout: this.config.timeout,
      });

      const responseTime = Date.now() - startTime;

      if (response.status === 200) {
        return {
          success: true,
          message: 'Successfully connected to OpenObserve',
          responseTime,
        };
      } else {
        return {
          success: false,
          message: `OpenObserve returned status ${response.status}: ${response.statusText}`,
          responseTime,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to connect to OpenObserve: ${error.message}`,
      };
    }
  }

  // 获取API端点
  getApiEndpoint(): string {
    return `${this.config.url}/api/${this.config.organization}/${this.config.stream}/_json`;
  }

  // 获取认证头信息
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.token) {
      headers['Authorization'] = `Bearer ${this.config.token}`;
    } else if (this.config.username && this.config.password) {
      const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString(
        'base64',
      );
      headers['Authorization'] = `Basic ${credentials}`;
    }

    return headers;
  }

  // 压缩数据
  compressData(data: any): Buffer {
    const jsonString = JSON.stringify(data);
    return zlib.gzipSync(jsonString);
  }

  // 格式化日志条目
  formatLogEntry(logData: any, context: any = {}): OpenObserveLogEntry {
    return {
      timestamp: logData.timestamp || new Date().toISOString(),
      level: logData.level,
      message: logData.message,
      service: context.service || this.configService.get('SERVICE_NAME', 'caddy-shopping-api'),
      environment: context.environment || this.configService.get('NODE_ENV', 'development'),
      version: context.version || this.configService.get('SERVICE_VERSION', '1.0.0'),
      host: context.host || require('os').hostname(),
      pid: context.pid || process.pid,
      traceId: context.traceId,
      spanId: context.spanId,
      userId: context.userId,
      requestId: context.requestId,
      method: context.method,
      url: context.url,
      statusCode: context.statusCode,
      responseTime: context.responseTime,
      userAgent: context.userAgent,
      ip: context.ip,
      ...logData.metadata,
    };
  }

  // 批量发送日志
  async sendBatch(logs: OpenObserveLogEntry[]): Promise<void> {
    if (logs.length === 0) {
      return;
    }

    const url = this.getApiEndpoint();
    const headers = this.getAuthHeaders();

    let data: any = logs;
    if (this.config.compression) {
      data = this.compressData(logs);
      headers['Content-Encoding'] = 'gzip';
    }

    for (let attempt = 1; attempt <= this.config.retryCount; attempt++) {
      try {
        const response = await axios.post(url, data, {
          headers,
          timeout: this.config.timeout,
        });

        if (response.status === 200) {
          return; // 成功发送
        }

        if (attempt < this.config.retryCount) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
        }
      } catch (error: any) {
        if (attempt === this.config.retryCount) {
          throw new Error(
            `Failed to send logs to OpenObserve after ${this.config.retryCount} attempts: ${error.message}`,
          );
        }
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
      }
    }
  }

  // 获取统计信息
  async getStatistics(
    timeRange: { from: string; to: string } = { from: 'now-1h', to: 'now' },
  ): Promise<any> {
    if (!this.config.enabled) {
      throw new Error('OpenObserve logging is disabled');
    }

    const url = `${this.config.url}/api/${this.config.organization}/${this.config.stream}/_search`;
    const headers = this.getAuthHeaders();

    const query = {
      query: {
        bool: {
          filter: [
            {
              range: {
                timestamp: {
                  gte: timeRange.from,
                  lte: timeRange.to,
                },
              },
            },
          ],
        },
      },
      aggs: {
        logs_by_level: {
          terms: { field: 'level' },
        },
        logs_by_service: {
          terms: { field: 'service' },
        },
        error_count: {
          filter: { term: { level: 'error' } },
        },
        avg_response_time: {
          avg: { field: 'responseTime' },
        },
      },
      size: 0,
    };

    try {
      const response = await axios.post(url, query, {
        headers,
        timeout: this.config.timeout,
      });

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get statistics from OpenObserve: ${error.message}`);
    }
  }
}
