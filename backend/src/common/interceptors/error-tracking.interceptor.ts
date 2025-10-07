import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { EnhancedBusinessException } from '../exceptions/enhanced-business.exception';
import { ERROR_CODES } from '../constants/error-codes';

/**
 * 错误追踪拦截器
 * 负责统一的错误监控、指标收集和错误上下文增强
 */
@Injectable()
export class ErrorTrackingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorTrackingInterceptor.name);
  private readonly errorMetrics = new Map<string, number>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // 生成请求ID和追踪ID
    const requestId = this.generateRequestId();
    const traceId = (request.headers['x-trace-id'] as string) || this.generateTraceId();

    // 将ID注入到请求对象中
    (request as any).requestId = requestId;
    (request as any).traceId = traceId;

    // 设置响应头
    response.setHeader('X-Request-ID', requestId);
    response.setHeader('X-Trace-ID', traceId);

    return next.handle().pipe(
      tap(() => {
        // 记录成功请求的指标
        const duration = Date.now() - startTime;
        this.recordSuccessMetrics(request, duration);
      }),
      catchError(error => {
        const duration = Date.now() - startTime;

        // 增强错误信息
        const enhancedError = this.enhanceError(error, request, duration);

        // 记录错误指标
        this.recordErrorMetrics(enhancedError, request, duration);

        // 发送错误告警（如果需要）
        this.sendErrorAlert(enhancedError, request);

        return throwError(() => enhancedError);
      }),
    );
  }

  /**
   * 增强错误信息
   */
  private enhanceError(error: any, request: Request, duration: number): any {
    // 如果已经是增强业务异常，直接返回
    if (error instanceof EnhancedBusinessException) {
      return error;
    }

    // 构建错误上下文
    const errorContext = {
      requestId: (request as any).requestId,
      traceId: (request as any).traceId,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
      userId: (request as any).user?.id,
      duration,
    };

    // 根据错误类型创建相应的增强异常
    if (error.name === 'ValidationError') {
      return new EnhancedBusinessException(
        ERROR_CODES.VALIDATION_ERROR,
        '请求参数验证失败',
        [{ field: 'validationErrors', message: 'Validation failed', value: error.details }],
        errorContext,
        error,
        false,
      );
    }

    if (error.name === 'UnauthorizedError' || error.status === 401) {
      return new EnhancedBusinessException(
        ERROR_CODES.UNAUTHORIZED,
        '身份验证失败',
        undefined,
        errorContext,
        error,
        false,
      );
    }

    if (error.name === 'ForbiddenError' || error.status === 403) {
      return new EnhancedBusinessException(
        ERROR_CODES.FORBIDDEN,
        '权限不足',
        undefined,
        errorContext,
        error,
        false,
      );
    }

    if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
      return new EnhancedBusinessException(
        ERROR_CODES.TIMEOUT_ERROR,
        '请求超时',
        [{ field: 'timeout', value: duration }],
        errorContext,
        error,
        true,
      );
    }

    if (error.name === 'DatabaseError' || error.code?.startsWith('ER_')) {
      return new EnhancedBusinessException(
        ERROR_CODES.DATABASE_ERROR,
        '数据库操作失败',
        [{ field: 'dbError', message: 'Database error', value: error.code }],
        errorContext,
        error,
        true,
      );
    }

    // 默认为内部服务器错误
    return new EnhancedBusinessException(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      '服务器内部错误',
      undefined,
      errorContext,
      error,
      true,
    );
  }

  /**
   * 记录成功请求指标
   */
  private recordSuccessMetrics(request: Request, duration: number): void {
    const endpoint = `${request.method} ${request.route?.path || request.url}`;

    this.logger.debug(`Request completed successfully`, {
      endpoint,
      duration,
      requestId: (request as any).requestId,
      traceId: (request as any).traceId,
    });

    // 这里可以集成到监控系统（如 Prometheus）
    // prometheus.register.getSingleMetric('http_request_duration_seconds')?.observe(duration / 1000);
  }

  /**
   * 记录错误指标
   */
  private recordErrorMetrics(
    error: EnhancedBusinessException,
    request: Request,
    duration: number,
  ): void {
    const endpoint = `${request.method} ${request.route?.path || request.url}`;
    const errorKey = `${endpoint}:${error.errorCode}`;

    // 更新错误计数
    const currentCount = this.errorMetrics.get(errorKey) || 0;
    this.errorMetrics.set(errorKey, currentCount + 1);

    this.logger.warn(`Request failed with error`, {
      endpoint,
      errorCode: error.errorCode,
      category: error.category,
      duration,
      retryable: error.retryable,
      requestId: (request as any).requestId,
      traceId: (request as any).traceId,
      errorCount: currentCount + 1,
    });

    // 这里可以集成到监控系统
    // prometheus.register.getSingleMetric('http_request_errors_total')?.inc({ endpoint, error_code: error.errorCode });
  }

  /**
   * 发送错误告警
   */
  private sendErrorAlert(error: EnhancedBusinessException, request: Request): void {
    // 只对严重错误发送告警
    if (error.category === 'system' || error.category === 'external') {
      const alertData = {
        errorCode: error.errorCode,
        message: error.message,
        endpoint: `${request.method} ${request.url}`,
        timestamp: new Date().toISOString(),
        requestId: (request as any).requestId,
        traceId: (request as any).traceId,
        userId: (request as any).user?.id,
      };

      // 这里可以集成到告警系统（如钉钉、企业微信、邮件等）
      this.logger.error(`Critical error alert`, alertData);
    }
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成追踪ID
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取错误统计信息
   */
  getErrorMetrics(): Map<string, number> {
    return new Map(this.errorMetrics);
  }

  /**
   * 清理错误统计信息
   */
  clearErrorMetrics(): void {
    this.errorMetrics.clear();
  }
}
