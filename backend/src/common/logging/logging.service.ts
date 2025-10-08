import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import { createLogger, Logger, format, transports } from 'winston';
// import { ElasticsearchTransport } from 'winston-elasticsearch'; // 暂时注释，缺少依赖
import DailyRotateFile from 'winston-daily-rotate-file';
import { AsyncLocalStorage } from 'async_hooks';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';
import * as path from 'path';
import axios from 'axios';

// 日志级别枚举
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly',
}

// 日志上下文接口
export interface LogContext {
  traceId?: string;
  spanId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  correlationId?: string;
  userAgent?: string;
  ip?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  module?: string;
  function?: string;
  line?: number;
  file?: string;
  version?: string;
  environment?: string;
  service?: string;
  instance?: string;
  [key: string]: any;
}

// 日志条目接口
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  meta?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

// 日志配置接口
export interface LoggingConfig {
  level: LogLevel;
  format: 'json' | 'text' | 'combined';
  console: {
    enabled: boolean;
    colorize: boolean;
    timestamp: boolean;
  };
  file: {
    enabled: boolean;
    directory: string;
    filename: string;
    maxSize: string;
    maxFiles: string;
    datePattern: string;
  };
  elasticsearch: {
    enabled: boolean;
    node: string;
    index: string;
    username?: string;
    password?: string;
    apiKey?: string;
  };
  openobserve: {
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
  };
  http: {
    enabled: boolean;
    host: string;
    port: number;
    path: string;
  };
  syslog: {
    enabled: boolean;
    host: string;
    port: number;
    protocol: 'tcp' | 'udp';
    facility: string;
  };
  performance: {
    enableSampling: boolean;
    sampleRate: number;
    maxLogSize: number;
    bufferSize: number;
  };
  security: {
    sanitizeHeaders: boolean;
    sanitizeBody: boolean;
    excludeFields: string[];
    maskFields: string[];
  };
}

// 日志统计接口
export interface LogStats {
  totalLogs: number;
  logsByLevel: Record<LogLevel, number>;
  errorRate: number;
  avgResponseTime: number;
  topErrors: Array<{ message: string; count: number }>;
  recentErrors: LogEntry[];
}

@Injectable({ scope: Scope.DEFAULT })
export class LoggingService implements LoggerService {
  private logger: Logger;
  private config: LoggingConfig;
  private contextStorage = new AsyncLocalStorage<LogContext>();
  private stats: LogStats;
  private errorCache = new Map<string, number>();
  private recentErrors: LogEntry[] = [];

  constructor(private configService: ConfigService) {
    this.initializeConfig();
    this.initializeLogger();
    this.initializeStats();
  }

  private initializeConfig(): void {
    this.config = {
      level: this.configService.get<LogLevel>('LOGGING_LEVEL', LogLevel.INFO),
      format: this.configService.get<'json' | 'text' | 'combined'>('LOGGING_FORMAT', 'json'),
      console: {
        enabled: this.configService.get<boolean>('LOGGING_CONSOLE_ENABLED', true),
        colorize: this.configService.get<boolean>('LOGGING_CONSOLE_COLORIZE', true),
        timestamp: this.configService.get<boolean>('LOGGING_CONSOLE_TIMESTAMP', true),
      },
      file: {
        enabled: this.configService.get<boolean>('LOGGING_FILE_ENABLED', true),
        directory: this.configService.get<string>('LOGGING_FILE_DIRECTORY', './logs'),
        filename: this.configService.get<string>('LOGGING_FILE_FILENAME', 'application-%DATE%.log'),
        maxSize: this.configService.get<string>('LOGGING_FILE_MAX_SIZE', '20m'),
        maxFiles: this.configService.get<string>('LOGGING_FILE_MAX_FILES', '14d'),
        datePattern: this.configService.get<string>('LOGGING_FILE_DATE_PATTERN', 'YYYY-MM-DD'),
      },

      elasticsearch: {
        enabled: false, // 禁用Elasticsearch
        node: this.configService.get<string>('LOGGING_ELASTICSEARCH_NODE', 'http://localhost:9200'),
        index: this.configService.get<string>('LOGGING_ELASTICSEARCH_INDEX', 'application-logs'),
        username: this.configService.get<string>('LOGGING_ELASTICSEARCH_USERNAME'),
        password: this.configService.get<string>('LOGGING_ELASTICSEARCH_PASSWORD'),
        apiKey: this.configService.get<string>('LOGGING_ELASTICSEARCH_API_KEY'),
      },
      openobserve: {
        // 优先使用全局 OPENOBSERVE_ENABLED，其次 LOGGING_OPENOBSERVE_ENABLED
        enabled: (() => {
          const envFlag = process.env.OPENOBSERVE_ENABLED;
          const rawCfg = this.configService.get<string | boolean>(
            'LOGGING_OPENOBSERVE_ENABLED',
            false as any,
          );
          const parseBool = (v: any): boolean => {
            if (typeof v === 'boolean') return v;
            if (typeof v === 'string') {
              const s = v.toLowerCase();
              return s === 'true' || s === '1' || s === 'yes' || s === 'on';
            }
            return false;
          };
          return envFlag !== undefined ? parseBool(envFlag) : parseBool(rawCfg);
        })(),
        url: this.configService.get<string>('LOGGING_OPENOBSERVE_URL', 'http://localhost:5080'),
        organization: this.configService.get<string>('LOGGING_OPENOBSERVE_ORGANIZATION', 'default'),
        stream: this.configService.get<string>('LOGGING_OPENOBSERVE_STREAM', 'application-logs'),
        username: this.configService.get<string>('LOGGING_OPENOBSERVE_USERNAME'),
        password: this.configService.get<string>('LOGGING_OPENOBSERVE_PASSWORD'),
        token: this.configService.get<string>('LOGGING_OPENOBSERVE_TOKEN'),
        batchSize: this.configService.get<number>('LOGGING_OPENOBSERVE_BATCH_SIZE', 100),
        flushInterval: this.configService.get<number>('LOGGING_OPENOBSERVE_FLUSH_INTERVAL', 5000),
        compression: this.configService.get<boolean>('LOGGING_OPENOBSERVE_COMPRESSION', true),
      },
      http: {
        enabled: this.configService.get<boolean>('LOGGING_HTTP_ENABLED', false),
        host: this.configService.get<string>('LOGGING_HTTP_HOST', 'localhost'),
        port: this.configService.get<number>('LOGGING_HTTP_PORT', 3001),
        path: this.configService.get<string>('LOGGING_HTTP_PATH', '/logs'),
      },
      syslog: {
        enabled: this.configService.get<boolean>('LOGGING_SYSLOG_ENABLED', false),
        host: this.configService.get<string>('LOGGING_SYSLOG_HOST', 'localhost'),
        port: this.configService.get<number>('LOGGING_SYSLOG_PORT', 514),
        protocol: this.configService.get<'tcp' | 'udp'>('LOGGING_SYSLOG_PROTOCOL', 'udp'),
        facility: this.configService.get<string>('LOGGING_SYSLOG_FACILITY', 'local0'),
      },
      performance: {
        enableSampling: this.configService.get<boolean>('LOGGING_PERFORMANCE_SAMPLING', false),
        sampleRate: this.configService.get<number>('LOGGING_PERFORMANCE_SAMPLE_RATE', 0.1),
        maxLogSize: this.configService.get<number>('LOGGING_PERFORMANCE_MAX_SIZE', 1024 * 1024),
        bufferSize: this.configService.get<number>('LOGGING_PERFORMANCE_BUFFER_SIZE', 1000),
      },
      security: {
        sanitizeHeaders: this.configService.get<boolean>('LOGGING_SECURITY_SANITIZE_HEADERS', true),
        sanitizeBody: this.configService.get<boolean>('LOGGING_SECURITY_SANITIZE_BODY', true),
        excludeFields: this.configService
          .get<string>('LOGGING_SECURITY_EXCLUDE_FIELDS', 'password,token,secret,key,authorization')
          .split(',')
          .map(field => field.trim()),
        maskFields: this.configService
          .get<string>('LOGGING_SECURITY_MASK_FIELDS', 'email,phone,ssn,credit_card')
          .split(',')
          .map(field => field.trim()),
      },
    };
  }

  private initializeLogger(): void {
    const loggerTransports: any[] = [];

    // Console transport
    if (this.config.console.enabled) {
      loggerTransports.push(
        new transports.Console({
          format: format.combine(
            this.config.console.colorize ? format.colorize() : format.uncolorize(),
            this.config.console.timestamp ? format.timestamp() : format.simple(),
            this.getLogFormat(),
          ),
        }),
      );
    }

    // File transport
    if (this.config.file.enabled) {
      loggerTransports.push(
        new (DailyRotateFile as any)({
          dirname: this.config.file.directory,
          filename: this.config.file.filename,
          datePattern: this.config.file.datePattern,
          maxSize: this.config.file.maxSize,
          maxFiles: this.config.file.maxFiles,
          format: this.getLogFormat(),
        }),
      );
    }

    // Elasticsearch transport - 已禁用
    if (this.config.elasticsearch.enabled) {
      console.warn(
        'Elasticsearch transport is disabled - @elastic/elasticsearch package has been removed',
      );
    }

    // OpenObserve transport
    if (this.config.openobserve.enabled) {
      const openObserveTransport = this.createOpenObserveTransport();
      if (openObserveTransport) {
        loggerTransports.push(openObserveTransport);
      }
    }

    // HTTP transport
    if (this.config.http.enabled) {
      loggerTransports.push(
        new transports.Http({
          host: this.config.http.host,
          port: this.config.http.port,
          path: this.config.http.path,
          format: this.getLogFormat(),
        }),
      );
    }

    // Syslog transport
    if (this.config.syslog.enabled) {
      const Syslog = require('winston-syslog').Syslog;
      loggerTransports.push(
        new Syslog({
          host: this.config.syslog.host,
          port: this.config.syslog.port,
          protocol: this.config.syslog.protocol,
          facility: this.config.syslog.facility,
          format: this.getLogFormat(),
        }),
      );
    }

    this.logger = createLogger({
      level: this.config.level,
      format: this.getLogFormat(),
      transports: loggerTransports,
      exitOnError: false,
      silent: false,
    });
  }

  private getLogFormat() {
    const baseFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      format.errors({ stack: true }),
      format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
    );

    switch (this.config.format) {
      case 'json':
        return format.combine(baseFormat, format.json());
      case 'text':
        return format.combine(baseFormat, format.simple());
      case 'combined':
        return format.combine(
          baseFormat,
          format.printf(({ timestamp, level, message, metadata }) => {
            const meta = Object.keys((metadata as object) || {}).length
              ? JSON.stringify(metadata)
              : '';
            return `${timestamp} [${level.toUpperCase()}] ${message} ${meta}`;
          }),
        );
      default:
        return format.combine(baseFormat, format.json());
    }
  }

  private transformForElasticsearch(logData: any) {
    return {
      '@timestamp': logData.timestamp,
      level: logData.level,
      message: logData.message,
      service: this.configService.get('SERVICE_NAME', 'caddy-shopping-api'),
      environment: this.configService.get('NODE_ENV', 'development'),
      version: this.configService.get('SERVICE_VERSION', '1.0.0'),
      host: os.hostname(),
      pid: process.pid,
      ...logData.metadata,
    };
  }

  private createOpenObserveTransport(): any {
    const config = this.config.openobserve;

    if (!config.enabled) {
      return null;
    }

    // 创建自定义传输器
    class OpenObserveTransport extends transports.Stream {
      private batchBuffer: any[] = [];
      private flushTimer: NodeJS.Timeout | null = null;
      private isFlushing: boolean = false;
      private configService: ConfigService;
      private contextStorage: AsyncLocalStorage<LogContext>;

      constructor(options: any) {
        // 创建一个虚拟的可写流
        const { Writable } = require('stream');
        const dummyStream = new Writable({
          write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void) {
            // 不做任何操作，只是为了满足Stream transport的要求
            callback();
          }
        });

        super({
          name: 'openobserve',
          stream: dummyStream,
          ...options,
        });
        this.configService = options.configService;
        this.contextStorage = options.contextStorage;
      }

      log(info: any, callback: any) {
        this.batchBuffer.push(this.formatOpenObserveLog(info));

        if (this.batchBuffer.length >= config.batchSize) {
          this.flushBatch();
        }

        if (!this.flushTimer) {
          this.flushTimer = setTimeout(() => this.flushBatch(), config.flushInterval);
        }

        callback(null, true);
      }

      async flushBatch() {
        if (this.isFlushing || this.batchBuffer.length === 0) {
          return;
        }

        this.isFlushing = true;
        const batch = [...this.batchBuffer];
        this.batchBuffer = [];

        if (this.flushTimer) {
          clearTimeout(this.flushTimer);
          this.flushTimer = null;
        }

        try {
          await this.sendToOpenObserve(batch);
        } catch (error) {
          console.error('Failed to send logs to OpenObserve:', error);
          // 重新加入缓冲区
          this.batchBuffer.unshift(...batch);
        } finally {
          this.isFlushing = false;
        }
      }

      formatOpenObserveLog(info: any) {
        const context = this.getContext();
        return {
          timestamp: info.timestamp || new Date().toISOString(),
          level: info.level,
          message: info.message,
          service: context.service || this.configService.get('SERVICE_NAME', 'caddy-shopping-api'),
          environment: context.environment || this.configService.get('NODE_ENV', 'development'),
          version: context.version || this.configService.get('SERVICE_VERSION', '1.0.0'),
          host: os.hostname(),
          pid: process.pid,
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
          ...info.metadata,
        };
      }

      async sendToOpenObserve(logs: any[]) {
        const url = `${config.url}/api/${config.organization}/${config.stream}/_json`;

        const headers: any = {
          'Content-Type': 'application/json',
        };

        if (config.token) {
          headers['Authorization'] = `Bearer ${config.token}`;
        } else if (config.username && config.password) {
          const credentials = Buffer.from(`${config.username}:${config.password}`).toString(
            'base64',
          );
          headers['Authorization'] = `Basic ${credentials}`;
        }

        let data = logs;
        if (config.compression) {
          // 这里可以实现压缩逻辑
          headers['Content-Encoding'] = 'gzip';
        }

        const response = await axios.post(url, data, {
          headers,
          timeout: 10000,
        });

        if (response.status !== 200) {
          throw new Error(
            `OpenObserve API returned status ${response.status}: ${response.statusText}`,
          );
        }
      }

      getContext() {
        return this.contextStorage?.getStore() || {};
      }
    }

    return new OpenObserveTransport({
      format: this.getLogFormat(),
      configService: this.configService,
      contextStorage: this.contextStorage,
    });
  }

  private initializeStats(): void {
    this.stats = {
      totalLogs: 0,
      logsByLevel: {
        [LogLevel.ERROR]: 0,
        [LogLevel.WARN]: 0,
        [LogLevel.INFO]: 0,
        [LogLevel.HTTP]: 0,
        [LogLevel.VERBOSE]: 0,
        [LogLevel.DEBUG]: 0,
        [LogLevel.SILLY]: 0,
      },
      errorRate: 0,
      avgResponseTime: 0,
      topErrors: [],
      recentErrors: [],
    };
  }

  // 设置日志上下文
  setContext(context: LogContext): void {
    this.contextStorage.enterWith(context);
  }

  // 获取当前上下文
  getContext(): LogContext | undefined {
    return this.contextStorage.getStore();
  }

  // 从请求创建上下文
  createContextFromRequest(req: Request): LogContext {
    const context: LogContext = {
      requestId: (req.headers['x-request-id'] as string) || uuidv4(),
      traceId: req.headers['x-trace-id'] as string,
      spanId: req.headers['x-span-id'] as string,
      correlationId: req.headers['x-correlation-id'] as string,
      userId: (req as any).user?.id,
      sessionId: (req as any).sessionID,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      method: req.method,
      url: req.url,
      service: this.configService.get('SERVICE_NAME', 'caddy-shopping-api'),
      environment: this.configService.get('NODE_ENV', 'development'),
      version: this.configService.get('SERVICE_VERSION', '1.0.0'),
      instance: os.hostname(),
    };

    return context;
  }

  // 运行带上下文的函数
  runWithContext<T>(context: LogContext, fn: () => T): T {
    return this.contextStorage.run(context, fn);
  }

  // 基础日志方法
  private logWithLevel(
    level: LogLevel,
    message: string,
    meta?: Record<string, any>,
    error?: Error,
  ): void {
    const context = this.getContext();
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: this.sanitizeMessage(message),
      context: context ? this.sanitizeContext(context) : undefined,
      meta: meta ? this.sanitizeMeta(meta) : undefined,
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    // 性能采样
    if (
      this.config.performance.enableSampling &&
      Math.random() > this.config.performance.sampleRate
    ) {
      return;
    }

    // 更新统计
    this.updateStats(logEntry);

    // 记录日志
    this.logger.log(level, message, {
      ...logEntry.context,
      ...logEntry.meta,
      error: logEntry.error,
    });
  }

  // 公共日志方法
  error(message: string, error?: Error, meta?: Record<string, any>): void {
    this.logWithLevel(LogLevel.ERROR, message, meta, error);
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.logWithLevel(LogLevel.WARN, message, meta);
  }

  log(message: string, meta?: Record<string, any>): void {
    this.logWithLevel(LogLevel.INFO, message, meta);
  }

  info(message: string, meta?: Record<string, any>): void {
    this.logWithLevel(LogLevel.INFO, message, meta);
  }

  http(message: string, meta?: Record<string, any>): void {
    this.logWithLevel(LogLevel.HTTP, message, meta);
  }

  verbose(message: string, meta?: Record<string, any>): void {
    this.logWithLevel(LogLevel.VERBOSE, message, meta);
  }

  debug(message: string, meta?: Record<string, any>): void {
    this.logWithLevel(LogLevel.DEBUG, message, meta);
  }

  silly(message: string, meta?: Record<string, any>): void {
    this.logWithLevel(LogLevel.SILLY, message, meta);
  }

  // 结构化日志方法
  logRequest(req: Request, res: any, responseTime: number): void {
    const context = this.createContextFromRequest(req);
    context.statusCode = res.statusCode;
    context.responseTime = responseTime;

    this.runWithContext(context, () => {
      const level = res.statusCode >= 400 ? LogLevel.WARN : LogLevel.HTTP;
      this.logWithLevel(level, `${req.method} ${req.url}`, {
        statusCode: res.statusCode,
        responseTime,
        contentLength: res.get('content-length'),
      });
    });
  }

  logDatabaseQuery(query: string, duration: number, params?: any[]): void {
    this.debug('Database query executed', {
      query: this.sanitizeQuery(query),
      duration,
      paramCount: params?.length || 0,
    });
  }

  logCacheOperation(operation: string, key: string, hit: boolean, duration?: number): void {
    this.debug(`Cache ${operation}`, {
      key: this.sanitizeKey(key),
      hit,
      duration,
    });
  }

  logExternalApiCall(url: string, method: string, statusCode: number, duration: number): void {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    this.logWithLevel(level, `External API call: ${method} ${url}`, {
      statusCode,
      duration,
      external: true,
    });
  }

  logBusinessEvent(event: string, data?: Record<string, any>): void {
    this.info(`Business event: ${event}`, {
      event,
      data: data ? this.sanitizeMeta(data) : undefined,
      business: true,
    });
  }

  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    data?: Record<string, any>,
  ): void {
    const level = severity === 'critical' || severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
    this.logWithLevel(level, `Security event: ${event}`, {
      event,
      severity,
      data: data ? this.sanitizeMeta(data) : undefined,
      security: true,
    });
  }

  logPerformanceMetric(
    metric: string,
    value: number,
    unit: string,
    tags?: Record<string, string>,
  ): void {
    this.logWithLevel(LogLevel.INFO, `Performance metric: ${metric}`, {
      metric,
      value,
      unit,
      tags,
      type: 'performance',
    });
  }

  // HTTP 请求日志记录方法
  logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    userAgent?: string,
    ip?: string,
    userId?: string,
    requestSize?: number,
    responseSize?: number,
    headers?: Record<string, string>,
  ): void {
    const level =
      statusCode >= 500 ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.HTTP;

    this.logWithLevel(level, `HTTP ${method} ${url} ${statusCode}`, {
      http: {
        method,
        url,
        statusCode,
        responseTime,
        userAgent,
        ip,
        userId,
        requestSize,
        responseSize,
        headers: this.sanitizeHeaders(headers),
      },
      type: 'http_request',
    });
  }

  // HTTP 错误日志记录方法
  logHttpError(
    method: string,
    url: string,
    statusCode: number,
    error: Error,
    responseTime: number,
    userAgent?: string,
    ip?: string,
    userId?: string,
  ): void {
    this.logWithLevel(
      LogLevel.ERROR,
      `HTTP Error ${method} ${url} ${statusCode}: ${error.message}`,
      {
        http: {
          method,
          url,
          statusCode,
          responseTime,
          userAgent,
          ip,
          userId,
        },
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        type: 'http_error',
      },
      error,
    );
  }

  // 清理敏感的 HTTP 头信息
  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    if (!headers) return undefined;

    const sanitized = { ...headers };
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'set-cookie',
      'x-api-key',
      'x-auth-token',
      'x-access-token',
      'x-refresh-token',
    ];

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
      if (sanitized[header.toLowerCase()]) {
        sanitized[header.toLowerCase()] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeMessage(message: string): string {
    if (!message) return '';

    // 限制消息长度
    if (message.length > this.config.performance.maxLogSize) {
      return message.substring(0, this.config.performance.maxLogSize) + '...';
    }

    // 移除敏感信息
    let sanitized = message;
    this.config.security.excludeFields.forEach(field => {
      const regex = new RegExp(`${field}[\\s]*[:=][\\s]*[^\\s,}]+`, 'gi');
      sanitized = sanitized.replace(regex, `${field}: [REDACTED]`);
    });

    return sanitized;
  }

  private sanitizeContext(context: LogContext): LogContext {
    const sanitized = { ...context };

    // 清理敏感字段
    this.config.security.excludeFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    // 掩码字段
    this.config.security.maskFields.forEach(field => {
      if (sanitized[field] && typeof sanitized[field] === 'string') {
        const value = sanitized[field] as string;
        sanitized[field] =
          value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
      }
    });

    return sanitized;
  }

  private sanitizeMeta(meta: Record<string, any>): Record<string, any> {
    const sanitized = { ...meta };

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      }

      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (this.config.security.excludeFields.includes(key.toLowerCase())) {
          result[key] = '[REDACTED]';
        } else if (
          this.config.security.maskFields.includes(key.toLowerCase()) &&
          typeof value === 'string'
        ) {
          const strValue = value as string;
          result[key] =
            strValue.substring(0, 2) +
            '*'.repeat(strValue.length - 4) +
            strValue.substring(strValue.length - 2);
        } else {
          result[key] = sanitizeObject(value);
        }
      }
      return result;
    };

    return sanitizeObject(sanitized);
  }

  private sanitizeQuery(query: string): string {
    // 移除SQL查询中的敏感参数
    return query.replace(/('.*?'|".*?")/g, "'[REDACTED]'");
  }

  private sanitizeKey(key: string): string {
    // 只显示缓存键的前缀和后缀
    if (key.length > 20) {
      return key.substring(0, 8) + '...' + key.substring(key.length - 8);
    }
    return key;
  }

  // 统计更新
  private updateStats(logEntry: LogEntry): void {
    this.stats.totalLogs++;
    this.stats.logsByLevel[logEntry.level]++;

    if (logEntry.level === LogLevel.ERROR) {
      // 更新错误缓存
      const errorKey = logEntry.message;
      this.errorCache.set(errorKey, (this.errorCache.get(errorKey) || 0) + 1);

      // 添加到最近错误
      this.recentErrors.unshift(logEntry);
      if (this.recentErrors.length > 100) {
        this.recentErrors = this.recentErrors.slice(0, 100);
      }

      // 更新错误率
      this.stats.errorRate = this.stats.logsByLevel[LogLevel.ERROR] / this.stats.totalLogs;

      // 更新热门错误
      this.updateTopErrors();
    }

    if (logEntry.context?.responseTime) {
      // 更新平均响应时间
      this.stats.avgResponseTime = (this.stats.avgResponseTime + logEntry.context.responseTime) / 2;
    }
  }

  private updateTopErrors(): void {
    this.stats.topErrors = Array.from(this.errorCache.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // 获取统计信息
  getStats(): LogStats {
    return { ...this.stats, recentErrors: [...this.recentErrors] };
  }

  // 清理统计
  clearStats(): void {
    this.initializeStats();
    this.errorCache.clear();
    this.recentErrors = [];
  }

  // 获取配置
  getConfig(): LoggingConfig {
    return { ...this.config };
  }

  // 更新日志级别
  setLogLevel(level: LogLevel): void {
    this.config.level = level;
    this.logger.level = level;
  }

  // 健康检查
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, any> }> {
    try {
      const details: Record<string, any> = {
        level: this.config.level,
        transports: this.logger.transports.length,
        totalLogs: this.stats.totalLogs,
        errorRate: this.stats.errorRate,
        recentErrorCount: this.recentErrors.length,
      };

      // 检查文件传输
      if (this.config.file.enabled) {
        try {
          const logDir = this.config.file.directory;
          const fs = require('fs');
          if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
          }
          details.fileTransport = 'healthy';
        } catch (error) {
          details.fileTransport = 'unhealthy';
          details.fileError = error.message;
        }
      }

      // Elasticsearch已禁用
      if (this.config.elasticsearch.enabled) {
        details.elasticsearchTransport = 'disabled';
      }

      // 检查OpenObserve连接
      if (this.config.openobserve.enabled) {
        try {
          const url = `${this.config.openobserve.url}/api/${this.config.openobserve.organization}/_health`;
          const response = await axios.get(url, { timeout: 5000 });
          details.openobserveTransport = response.status === 200 ? 'healthy' : 'unhealthy';
          details.openobserveStatus = response.status;
        } catch (error) {
          details.openobserveTransport = 'unhealthy';
          details.openobserveError = error.message;
        }
      }

      const isHealthy =
        !details.fileError && !details.openobserveError && this.stats.errorRate < 0.1;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error.message },
      };
    }
  }
}
