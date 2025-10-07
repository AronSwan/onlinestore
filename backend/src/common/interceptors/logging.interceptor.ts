import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    // 生成请求ID
    const requestId = this.generateRequestId();
    (request as any).requestId = requestId;

    this.logger.log({
      message: 'Incoming request',
      method,
      url,
      ip,
      userAgent,
      requestId,
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap({
        next: data => {
          const duration = Date.now() - startTime;
          this.logger.log({
            message: 'Request completed',
            method,
            url,
            statusCode: response.statusCode,
            duration: `${duration}ms`,
            requestId,
            timestamp: new Date().toISOString(),
          });
        },
        error: error => {
          const duration = Date.now() - startTime;
          this.logger.error({
            message: 'Request failed',
            method,
            url,
            statusCode: response.statusCode,
            duration: `${duration}ms`,
            error: error.message,
            requestId,
            timestamp: new Date().toISOString(),
          });
        },
      }),
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
