import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LoggingService } from '../logging/logging.service';
import { TracingService } from '../tracing/tracing.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  constructor(
    private readonly loggingService: LoggingService,
    private readonly tracingService: TracingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // 创建请求上下文
    const requestContext = this.loggingService.createContextFromRequest(request);

    // 设置追踪信息
    const span = this.tracingService.startSpan(
      `HTTP ${request.method} ${request.route?.path || request.url}`,
    );
    span.setAttributes({
      'http.method': request.method,
      'http.url': request.url,
      'http.user_agent': request.headers['user-agent'] || '',
      'http.remote_addr': request.ip,
      'user.id': (request as any).user?.id || '',
    });

    // 记录请求开始
    this.loggingService.runWithContext(requestContext, () => {
      this.loggingService.info(`Incoming request: ${request.method} ${request.url}`, {
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        userId: (request as any).user?.id,
        headers: this.sanitizeHeaders(request.headers),
        query: request.query,
        params: request.params,
        requestSize: this.getRequestSize(request),
      });
    });

    return next.handle().pipe(
      tap(data => {
        const responseTime = Date.now() - startTime;
        const responseSize = this.getResponseSize(response, data);

        // 记录成功响应
        this.loggingService.runWithContext(requestContext, () => {
          this.loggingService.logHttpRequest(
            request.method,
            request.url,
            response.statusCode,
            responseTime,
            request.headers['user-agent'],
            request.ip,
            (request as any).user?.id,
            this.getRequestSize(request),
            responseSize,
            request.headers as Record<string, string>,
          );
        });

        // 设置追踪属性
        span.setAttributes({
          'http.status_code': response.statusCode,
          'http.response_time': responseTime,
          'http.response_size': responseSize,
        });
        span.setStatus({ code: 1 }); // OK
        span.end();
      }),
      catchError(error => {
        const responseTime = Date.now() - startTime;

        // 记录错误响应
        this.loggingService.runWithContext(requestContext, () => {
          this.loggingService.logHttpError(
            request.method,
            request.url,
            response.statusCode || 500,
            error,
            responseTime,
            request.headers['user-agent'],
            request.ip,
            (request as any).user?.id,
          );
        });

        // 设置追踪错误
        span.setAttributes({
          'http.status_code': response.statusCode || 500,
          'http.response_time': responseTime,
          error: true,
          'error.name': error.name,
          'error.message': error.message,
        });
        span.setStatus({ code: 2, message: error.message }); // ERROR
        span.end();

        return throwError(() => error);
      }),
    );
  }

  private sanitizeHeaders(headers: any): Record<string, string> {
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

  private getRequestSize(request: Request): number {
    const contentLength = request.headers['content-length'];
    return contentLength ? parseInt(contentLength, 10) : 0;
  }

  private getResponseSize(response: Response, data?: any): number {
    const contentLength = response.get('content-length');
    if (contentLength) {
      return parseInt(contentLength, 10);
    }

    // 估算响应大小
    if (data) {
      try {
        return JSON.stringify(data).length;
      } catch {
        return 0;
      }
    }

    return 0;
  }
}
