import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { trace, context, SpanStatusCode, SpanKind, Span, Context } from '@opentelemetry/api';

/**
 * 追踪上下文信息
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage?: Record<string, string>;
}

/**
 * 自定义Span属性
 */
export interface SpanAttributes {
  [key: string]: string | number | boolean | undefined;
}

/**
 * 分布式追踪服务
 * 基于OpenTelemetry实现链路追踪功能
 */
@Injectable()
export class TracingService {
  private readonly logger = new Logger(TracingService.name);
  private readonly tracer = trace.getTracer('caddy-shopping-site', '1.0.0');
  private readonly serviceName: string;
  private readonly environment: string;

  constructor(private readonly configService: ConfigService) {
    this.serviceName = this.configService.get<string>('app.name', 'caddy-shopping-site');
    this.environment = this.configService.get<string>('app.environment', 'development');
  }

  /**
   * 创建新的Span
   */
  createSpan(
    name: string,
    attributes?: SpanAttributes,
    kind: SpanKind = SpanKind.INTERNAL,
    parentContext?: any,
  ): Span {
    const span = this.tracer.startSpan(
      name,
      {
        kind,
        attributes: {
          'service.name': this.serviceName,
          'service.environment': this.environment,
          ...attributes,
        },
      },
      parentContext,
    );

    this.logger.debug(`Created span: ${name}`, {
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
    });

    return span;
  }

  /**
   * 在指定Span上下文中执行函数
   */
  async withSpan<T>(span: Span, fn: () => Promise<T> | T): Promise<T> {
    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * 创建并执行带追踪的函数
   */
  async trace<T>(
    name: string,
    fn: (span: Span) => Promise<T> | T,
    attributes?: SpanAttributes,
    kind: SpanKind = SpanKind.INTERNAL,
  ): Promise<T> {
    const span = this.createSpan(name, attributes, kind);
    return this.withSpan(span, () => fn(span));
  }

  /**
   * 为HTTP请求创建Span
   */
  createHttpSpan(method: string, url: string, attributes?: SpanAttributes): Span {
    return this.createSpan(
      `HTTP ${method}`,
      {
        'http.method': method,
        'http.url': url,
        'http.scheme': 'http',
        ...attributes,
      },
      SpanKind.SERVER,
    );
  }

  /**
   * 为数据库操作创建Span
   */
  createDatabaseSpan(operation: string, table: string, attributes?: SpanAttributes): Span {
    return this.createSpan(
      `DB ${operation}`,
      {
        'db.operation': operation,
        'db.table': table,
        'db.system': 'mysql',
        'db.name': this.configService.get<string>('database.name', 'shopping_db'),
        ...attributes,
      },
      SpanKind.CLIENT,
    );
  }

  /**
   * 为外部服务调用创建Span
   */
  createExternalSpan(serviceName: string, operation: string, attributes?: SpanAttributes): Span {
    return this.createSpan(
      `External ${serviceName}`,
      {
        'external.service': serviceName,
        'external.operation': operation,
        ...attributes,
      },
      SpanKind.CLIENT,
    );
  }

  /**
   * 添加事件到当前活动的Span
   */
  addEvent(name: string, attributes?: SpanAttributes): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
      this.logger.debug(`Added event to span: ${name}`, attributes);
    }
  }

  /**
   * 设置当前活动Span的属性
   */
  setAttributes(attributes: SpanAttributes): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
      this.logger.debug('Set span attributes', attributes);
    }
  }

  /**
   * 记录异常到当前活动的Span
   */
  recordException(exception: Error, attributes?: SpanAttributes): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.recordException(exception);
      if (attributes) {
        span.setAttributes(attributes);
      }
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: exception.message,
      });
      this.logger.error('Recorded exception to span', {
        error: exception.message,
        stack: exception.stack,
        attributes,
      });
    }
  }

  /**
   * 获取当前追踪上下文
   */
  getCurrentContext(): Context {
    return context.active();
  }

  /**
   * 获取当前活动的Span
   */
  getCurrentSpan(): Span | undefined {
    return trace.getActiveSpan();
  }

  /**
   * 获取追踪ID
   */
  getTraceId(): string | undefined {
    const span = trace.getActiveSpan();
    return span?.spanContext().traceId;
  }

  /**
   * 获取Span ID
   */
  getSpanId(): string | undefined {
    const span = trace.getActiveSpan();
    return span?.spanContext().spanId;
  }

  /**
   * 结束当前活动的Span
   */
  endCurrentSpan(): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.end();
      this.logger.debug('Ended current span');
    }
  }

  /**
   * 开始一个新的Span (兼容旧API)
   */
  startSpan(name: string, attributes?: SpanAttributes, kind: SpanKind = SpanKind.INTERNAL): Span {
    return this.createSpan(name, attributes, kind);
  }

  /**
   * 生成追踪ID (兼容旧API)
   */
  generateTraceId(): string | undefined {
    return this.getTraceId();
  }

  /**
   * 为业务操作创建Span
   */
  createBusinessSpan(operation: string, module: string, attributes?: SpanAttributes): Span {
    return this.createSpan(
      `Business ${operation}`,
      {
        'business.operation': operation,
        'business.module': module,
        ...attributes,
      },
      SpanKind.INTERNAL,
    );
  }

  /**
   * 获取当前追踪上下文
   */
  getCurrentTraceContext(): TraceContext | null {
    const span = trace.getActiveSpan();
    if (!span) {
      return null;
    }

    const spanContext = span.spanContext();
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      parentSpanId: undefined, // 需要从上下文中获取
    };
  }

  /**
   * 从HTTP头部提取追踪上下文
   */
  extractTraceFromHeaders(headers: Record<string, string>): TraceContext | null {
    const traceParent = headers['traceparent'];
    if (!traceParent) {
      return null;
    }

    // 解析W3C Trace Context格式: version-trace_id-parent_id-trace_flags
    const parts = traceParent.split('-');
    if (parts.length !== 4) {
      return null;
    }

    return {
      traceId: parts[1],
      spanId: parts[2],
      parentSpanId: parts[2],
    };
  }

  /**
   * 将追踪上下文注入到HTTP头部
   */
  injectTraceToHeaders(headers: Record<string, string>): void {
    const span = trace.getActiveSpan();
    if (!span) {
      return;
    }

    const spanContext = span.spanContext();
    const traceParent = `00-${spanContext.traceId}-${spanContext.spanId}-01`;
    headers['traceparent'] = traceParent;
  }

  /**
   * 创建子Span (重载版本)
   */
  createChildSpan(
    name: string,
    parentSpan: Span,
    attributes?: SpanAttributes,
    kind?: SpanKind,
  ): Span;
  createChildSpan(name: string, attributes?: SpanAttributes, kind?: SpanKind): Span;
  createChildSpan(
    name: string,
    parentSpanOrAttributes?: Span | SpanAttributes,
    attributesOrKind?: SpanAttributes | SpanKind,
    kind?: SpanKind,
  ): Span {
    const defaultKind = kind || SpanKind.INTERNAL;
    if (parentSpanOrAttributes && 'spanContext' in parentSpanOrAttributes) {
      // 第一个重载：有父Span
      const parentSpan = parentSpanOrAttributes as Span;
      const attributes = attributesOrKind as SpanAttributes;
      return context.with(trace.setSpan(context.active(), parentSpan), () => {
        return this.createSpan(name, attributes, defaultKind);
      });
    } else {
      // 第二个重载：使用当前活动Span作为父Span
      const attributes = parentSpanOrAttributes as SpanAttributes;
      const spanKind = (attributesOrKind as SpanKind) || defaultKind;
      const parentSpan = trace.getActiveSpan();
      const parentContext = parentSpan
        ? trace.setSpan(context.active(), parentSpan)
        : context.active();
      return this.createSpan(name, attributes, spanKind, parentContext);
    }
  }

  /**
   * 批量追踪多个操作
   */
  async traceBatch<T>(
    operations: Array<{
      name: string;
      fn: (span: Span) => Promise<T> | T;
      attributes?: SpanAttributes;
    }>,
  ): Promise<T[]> {
    const parentSpan = this.createSpan('Batch Operations');

    return this.withSpan(parentSpan, async () => {
      const results = await Promise.all(
        operations.map(({ name, fn, attributes }) => {
          const childSpan = this.createChildSpan(name, parentSpan, attributes);
          return this.withSpan(childSpan, () => fn(childSpan));
        }),
      );

      parentSpan.setAttributes({
        'batch.size': operations.length,
        'batch.success': true,
      });

      return results;
    });
  }

  /**
   * 追踪异步操作
   */
  async traceAsync<T>(
    name: string,
    asyncFn: () => Promise<T>,
    attributes?: SpanAttributes,
  ): Promise<T> {
    const span = this.createSpan(name, attributes);

    try {
      const result = await asyncFn();
      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttributes({ 'operation.success': true });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.setAttributes({ 'operation.success': false });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * 获取追踪统计信息
   */
  getTracingStats(): {
    activeSpans: number;
    serviceName: string;
    environment: string;
  } {
    return {
      activeSpans: 0, // 这里需要实际的统计逻辑
      serviceName: this.serviceName,
      environment: this.environment,
    };
  }
}
