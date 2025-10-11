// 用途：CQRS模块分布式追踪服务
// 作者：后端开发团队
// 时间：2025-10-09

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { CqrsOpenObserveConfig } from '../../config/cqrs-openobserve.config';
import { EnvironmentAdapter } from '../../config/environment-adapter';

@Injectable()
export class CqrsTracingService {
  private readonly logger = new Logger(CqrsTracingService.name);
  private readonly tracer = trace.getTracer('cqrs-service');
  private readonly config: CqrsOpenObserveConfig;

  constructor(private readonly configService: ConfigService) {
    const config =
      this.configService.get<CqrsOpenObserveConfig>('cqrsOpenObserve') ??
      ((EnvironmentAdapter as any)?.getOpenObserve?.() as unknown as CqrsOpenObserveConfig);
    if (!config) {
      throw new Error('CQRS OpenObserve configuration not found');
    }
    this.config = config;
  }

  /**
   * 创建命令 Span
   */
  startCommandSpan(commandType: string, commandId: string, handler?: string): any {
    if (!this.config.tracing.enabled) {
      return null;
    }

    const span = this.tracer.startSpan(`command.${commandType}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'service.name': process.env.SERVICE_NAME || 'backend',
        'service.version': process.env.SERVICE_VERSION || '1.0.0',
        'command.id': commandId,
        'command.type': commandType,
        'command.handler': handler || 'unknown',
      },
    });

    return span;
  }

  /**
   * 创建查询 Span
   */
  startQuerySpan(queryType: string, cacheKey?: string, handler?: string): any {
    if (!this.config.tracing.enabled) {
      return null;
    }

    const span = this.tracer.startSpan(`query.${queryType}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'service.name': process.env.SERVICE_NAME || 'backend',
        'service.version': process.env.SERVICE_VERSION || '1.0.0',
        'query.type': queryType,
        'query.cache_key': cacheKey || 'unknown',
        'query.handler': handler || 'unknown',
      },
    });

    return span;
  }

  /**
   * 创建事件 Span
   */
  startEventSpan(eventType: string, eventId: string, subscriber?: string): any {
    if (!this.config.tracing.enabled) {
      return null;
    }

    const span = this.tracer.startSpan(`event.${eventType}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'service.name': process.env.SERVICE_NAME || 'backend',
        'service.version': process.env.SERVICE_VERSION || '1.0.0',
        'event.id': eventId,
        'event.type': eventType,
        'event.subscriber': subscriber || 'unknown',
      },
    });

    return span;
  }

  /**
   * 完成 Span
   */
  finishSpan(
    span: any,
    success: boolean,
    error?: Error,
    additionalAttributes?: Record<string, any>,
  ): void {
    if (!span) {
      return;
    }

    // 添加额外属性
    if (additionalAttributes) {
      span.setAttributes(additionalAttributes);
    }

    // 设置状态
    if (success) {
      span.setStatus({ code: SpanStatusCode.OK });
    } else {
      if (error) {
        span.recordException(error);
      }
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error?.message || 'Unknown error',
      });
    }

    span.end();
  }

  /**
   * 获取当前上下文信息
   */
  getCurrentContext(): { traceId?: string; spanId?: string } {
    const activeSpan = trace.getActiveSpan();
    if (!activeSpan) {
      return {};
    }

    const spanContext = activeSpan.spanContext();
    if (!spanContext) {
      return {};
    }

    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  }

  /**
   * 创建子 Span
   */
  startChildSpan(parentSpan: any, name: string, attributes?: Record<string, any>): any {
    if (!this.config.tracing.enabled) {
      return null;
    }

    // 简化实现，不设置父级上下文
    const span = this.tracer.startSpan(name, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'service.name': process.env.SERVICE_NAME || 'backend',
        'service.version': process.env.SERVICE_VERSION || '1.0.0',
        ...attributes,
      },
    });

    return span;
  }

  /**
   * 设置 Span 属性
   */
  setSpanAttributes(span: any, attributes: Record<string, any>): void {
    if (!span || !attributes) {
      return;
    }

    span.setAttributes(attributes);
  }

  /**
   * 添加事件到 Span
   */
  addSpanEvent(span: any, name: string, attributes?: Record<string, any>): void {
    if (!span) {
      return;
    }

    span.addEvent(name, attributes);
  }
}
