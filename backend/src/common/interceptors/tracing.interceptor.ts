import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { trace, context as otelContext, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { TracingService } from '../tracing/tracing.service';

/**
 * 分布式追踪拦截器
 * 自动为HTTP请求创建和管理追踪Span
 */
@Injectable()
export class TracingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TracingInterceptor.name);
  private readonly tracer = trace.getTracer('caddy-shopping-site-http');

  constructor(private readonly tracingService: TracingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const handler = context.getHandler();
    const controller = context.getClass();

    // 创建HTTP请求的根Span
    const spanName = `${request.method} ${this.getRoutePath(request)}`;
    const span = this.tracer.startSpan(spanName, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': request.method,
        'http.url': request.url,
        'http.scheme': request.protocol,
        'http.host': request.get('host'),
        'http.user_agent': request.get('user-agent'),
        'http.route': this.getRoutePath(request),
        'controller.name': controller.name,
        'handler.name': handler.name,
        'request.id': this.generateRequestId(),
      },
    });

    // 从请求头中提取追踪上下文
    this.extractTraceContext(request, span);

    // 将追踪信息注入到响应头
    this.injectTraceContext(response, span);

    // 记录请求开始时间
    const startTime = Date.now();

    return otelContext.with(trace.setSpan(otelContext.active(), span), () => {
      return next.handle().pipe(
        tap(data => {
          // 请求成功处理
          const duration = Date.now() - startTime;

          span.setAttributes({
            'http.status_code': response.statusCode,
            'http.response.size': this.getResponseSize(data),
            'request.duration_ms': duration,
            'response.success': true,
          });

          // 记录业务相关的属性
          this.addBusinessAttributes(span, request, data);

          span.setStatus({ code: SpanStatusCode.OK });

          this.logger.debug(`Request completed successfully`, {
            method: request.method,
            url: request.url,
            statusCode: response.statusCode,
            duration,
            traceId: span.spanContext().traceId,
          });
        }),
        catchError(error => {
          // 请求错误处理
          const duration = Date.now() - startTime;

          span.recordException(error);
          span.setAttributes({
            'http.status_code': response.statusCode || 500,
            'request.duration_ms': duration,
            'response.success': false,
            'error.name': error.constructor.name,
            'error.message': error.message,
          });

          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });

          this.logger.error(`Request failed`, {
            method: request.method,
            url: request.url,
            error: error.message,
            duration,
            traceId: span.spanContext().traceId,
          });

          throw error;
        }),
        tap({
          finalize: () => {
            // 确保Span被正确结束
            span.end();
          },
        }),
      );
    });
  }

  /**
   * 从请求头中提取追踪上下文
   */
  private extractTraceContext(request: Request, span: any): void {
    const traceParent = request.get('traceparent');
    const traceState = request.get('tracestate');

    if (traceParent) {
      span.setAttributes({
        'trace.parent': traceParent,
      });
    }

    if (traceState) {
      span.setAttributes({
        'trace.state': traceState,
      });
    }

    // 提取自定义追踪头
    const correlationId = request.get('x-correlation-id');
    const sessionId = request.get('x-session-id');
    const userId = request.get('x-user-id');

    if (correlationId) {
      span.setAttributes({ 'correlation.id': correlationId });
    }
    if (sessionId) {
      span.setAttributes({ 'session.id': sessionId });
    }
    if (userId) {
      span.setAttributes({ 'user.id': userId });
    }
  }

  /**
   * 将追踪上下文注入到响应头
   */
  private injectTraceContext(response: Response, span: any): void {
    const spanContext = span.spanContext();

    // 注入W3C Trace Context
    const traceParent = `00-${spanContext.traceId}-${spanContext.spanId}-01`;
    response.setHeader('traceparent', traceParent);

    // 注入自定义追踪头
    response.setHeader('x-trace-id', spanContext.traceId);
    response.setHeader('x-span-id', spanContext.spanId);
  }

  /**
   * 获取路由路径
   */
  private getRoutePath(request: Request): string {
    // 尝试获取路由模式，如果没有则使用URL路径
    return (request as any).route?.path || request.path || request.url;
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取响应大小
   */
  private getResponseSize(data: any): number {
    if (!data) return 0;

    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  /**
   * 添加业务相关的属性
   */
  private addBusinessAttributes(span: any, request: Request, responseData: any): void {
    // 用户相关属性
    const user = (request as any).user;
    if (user) {
      span.setAttributes({
        'user.id': user.id,
        'user.role': user.role,
        'user.email': user.email,
      });
    }

    // 业务操作属性
    const method = request.method.toLowerCase();
    const path = request.path;

    // 根据路径和方法推断业务操作
    if (path.includes('/products')) {
      span.setAttributes({
        'business.domain': 'product',
        'business.operation': this.getProductOperation(method, path),
      });
    } else if (path.includes('/orders')) {
      span.setAttributes({
        'business.domain': 'order',
        'business.operation': this.getOrderOperation(method, path),
      });
    } else if (path.includes('/users')) {
      span.setAttributes({
        'business.domain': 'user',
        'business.operation': this.getUserOperation(method, path),
      });
    } else if (path.includes('/auth')) {
      span.setAttributes({
        'business.domain': 'auth',
        'business.operation': this.getAuthOperation(method, path),
      });
    }

    // 响应数据属性
    if (responseData && typeof responseData === 'object') {
      if (Array.isArray(responseData.data)) {
        span.setAttributes({
          'response.items.count': responseData.data.length,
        });
      }

      if (responseData.pagination) {
        span.setAttributes({
          'response.pagination.page': responseData.pagination.page,
          'response.pagination.limit': responseData.pagination.limit,
          'response.pagination.total': responseData.pagination.total,
        });
      }
    }
  }

  /**
   * 获取产品相关操作
   */
  private getProductOperation(method: string, path: string): string {
    if (method === 'get' && path.includes('/search')) return 'search';
    if (method === 'get' && path.match(/\/\d+$/)) return 'get_by_id';
    if (method === 'get') return 'list';
    if (method === 'post') return 'create';
    if (method === 'put' || method === 'patch') return 'update';
    if (method === 'delete') return 'delete';
    return 'unknown';
  }

  /**
   * 获取订单相关操作
   */
  private getOrderOperation(method: string, path: string): string {
    if (method === 'post' && path.includes('/checkout')) return 'checkout';
    if (method === 'post' && path.includes('/cancel')) return 'cancel';
    if (method === 'post' && path.includes('/refund')) return 'refund';
    if (method === 'get' && path.match(/\/\d+$/)) return 'get_by_id';
    if (method === 'get') return 'list';
    if (method === 'post') return 'create';
    if (method === 'put' || method === 'patch') return 'update';
    return 'unknown';
  }

  /**
   * 获取用户相关操作
   */
  private getUserOperation(method: string, path: string): string {
    if (method === 'get' && path.includes('/profile')) return 'get_profile';
    if (method === 'put' && path.includes('/profile')) return 'update_profile';
    if (method === 'post' && path.includes('/register')) return 'register';
    if (method === 'get' && path.match(/\/\d+$/)) return 'get_by_id';
    if (method === 'get') return 'list';
    if (method === 'post') return 'create';
    if (method === 'put' || method === 'patch') return 'update';
    if (method === 'delete') return 'delete';
    return 'unknown';
  }

  /**
   * 获取认证相关操作
   */
  private getAuthOperation(method: string, path: string): string {
    if (path.includes('/login')) return 'login';
    if (path.includes('/logout')) return 'logout';
    if (path.includes('/register')) return 'register';
    if (path.includes('/refresh')) return 'refresh_token';
    if (path.includes('/forgot-password')) return 'forgot_password';
    if (path.includes('/reset-password')) return 'reset_password';
    if (path.includes('/verify')) return 'verify_email';
    return 'unknown';
  }
}
