// 用途：CQRS模块结构化日志服务
// 作者：后端开发团队
// 时间：2025-10-09

import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessLoggerService } from '../../logging/business-logger.service';
import { CqrsOpenObserveConfig } from '../../config/cqrs-openobserve.config';
import OpenObserveTransport from '../../logging/openobserve-transport';
import { EnvironmentAdapter } from '../../config/environment-adapter';

export interface CQRSLogContext {
  traceId?: string;
  spanId?: string;
  requestId?: string;
  tenant?: string;
  userId?: string;
  type?: string;
  id?: string;
  handler?: string;
  cacheKey?: string;
  cacheHit?: boolean;
  retryCount?: number;
  durationMs?: number;
  errorCode?: string;
  status?: 'start' | 'success' | 'error' | 'published' | 'handled';
  subscriber?: string;
  dlq?: boolean;
}

@Injectable()
export class CqrsLoggingService {
  private readonly logger = new Logger(CqrsLoggingService.name);
  private readonly config: CqrsOpenObserveConfig;

  constructor(
    private readonly businessLogger: BusinessLoggerService,
    private readonly configService: ConfigService,
  ) {
    this.config =
      this.configService.get<CqrsOpenObserveConfig>('cqrsOpenObserve') ||
      (EnvironmentAdapter as any)?.getOpenObserve?.();
  }

  /**
   * 记录命令日志
   */
  logCommand(context: CQRSLogContext, message?: string, error?: Error): void {
    const logData = {
      timestamp: new Date().toISOString(),
      level: error ? 'ERROR' : 'INFO',
      service: process.env.SERVICE_NAME || 'backend',
      source: process.env.SERVICE_SOURCE || 'apiserver',
      env: process.env.NODE_ENV || 'development',
      version: process.env.SERVICE_VERSION || '1.0.0',
      bus: 'command',
      type: context.type,
      id: context.id,
      status: context.status,
      handler: context.handler,
      duration_ms: context.durationMs,
      retry_count: context.retryCount || 0,
      error_code: error?.name,
      error_message: error?.message,
      traceId: context.traceId,
      spanId: context.spanId,
      requestId: context.requestId,
      tenant: context.tenant,
      userId: context.userId,
    };

    if (message) {
      (logData as any).message = message;
    }

    // 写入 BusinessLogger
    this.businessLogger.logSystemEvent('CQRS_COMMAND', error ? 'ERROR' : 'INFO', logData);

    // 同时写入 Nest Logger
    if (error) {
      this.logger.error(`Command ${context.type} failed: ${message}`, error);
    } else {
      this.logger.log(`Command ${context.type} ${context.status}: ${message}`);
    }
  }

  /**
   * 记录查询日志
   */
  logQuery(context: CQRSLogContext, message?: string, error?: Error): void {
    const logData = {
      timestamp: new Date().toISOString(),
      level: error ? 'ERROR' : 'INFO',
      service: process.env.SERVICE_NAME || 'backend',
      source: process.env.SERVICE_SOURCE || 'apiserver',
      env: process.env.NODE_ENV || 'development',
      version: process.env.SERVICE_VERSION || '1.0.0',
      bus: 'query',
      type: context.type,
      cache_key: context.cacheKey,
      cache_hit: context.cacheHit,
      stale: !!context.cacheHit && (context.durationMs ?? 0) > 0, // 简化判断
      duration_ms: context.durationMs ?? 0,
      result_size: 0, // 需要从结果中计算
      handler: context.handler,
      error_code: error?.name,
      error_message: error?.message,
      traceId: context.traceId,
      spanId: context.spanId,
      requestId: context.requestId,
      tenant: context.tenant,
      userId: context.userId,
    };

    if (message) {
      (logData as any).message = message;
    }

    // 写入 BusinessLogger
    this.businessLogger.logSystemEvent('CQRS_QUERY', error ? 'ERROR' : 'INFO', logData);

    // 同时写入 Nest Logger
    if (error) {
      this.logger.error(`Query ${context.type} failed: ${message}`, error);
    } else {
      this.logger.debug(`Query ${context.type} success in ${context.durationMs}ms`);
    }
  }

  /**
   * 记录事件日志
   */
  logEvent(context: CQRSLogContext, message?: string, error?: Error): void {
    const logData = {
      timestamp: new Date().toISOString(),
      level: error ? 'ERROR' : 'INFO',
      service: process.env.SERVICE_NAME || 'backend',
      source: process.env.SERVICE_SOURCE || 'apiserver',
      env: process.env.NODE_ENV || 'development',
      version: process.env.SERVICE_VERSION || '1.0.0',
      bus: 'event',
      type: context.type,
      status: context.status,
      subscriber: context.subscriber,
      duration_ms: context.durationMs ?? 0,
      dlq: context.dlq || false,
      error_code: error?.name,
      error_message: error?.message,
      traceId: context.traceId,
      spanId: context.spanId,
      requestId: context.requestId,
      tenant: context.tenant,
      userId: context.userId,
    };

    if (message) {
      (logData as any).message = message;
    }

    // 写入 BusinessLogger
    this.businessLogger.logSystemEvent('CQRS_EVENT', error ? 'ERROR' : 'INFO', logData);

    // 同时写入 Nest Logger
    if (error) {
      this.logger.error(`Event ${context.type} failed: ${message}`, error);
    } else {
      this.logger.debug(`Event ${context.type} ${context.status}: ${message}`);
    }
  }
}
