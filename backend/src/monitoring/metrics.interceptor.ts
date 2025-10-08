import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MonitoringService } from './monitoring.service';

/**
 * 监控指标拦截器
 * 自动收集HTTP请求指标
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MetricsInterceptor.name);

  constructor(private readonly monitoringService: MonitoringService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url } = request;
    const startTime = Date.now();

    // 增加活跃连接数
    this.monitoringService.incrementActiveConnections();

    return next.handle().pipe(
      tap({
        next: data => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          // 记录API调用指标
          this.monitoringService.recordApiCall(method, url, statusCode, duration);

          // 记录慢请求
          if (duration > 1000) {
            this.logger.warn(`Slow request detected: ${method} ${url} - ${duration}ms`);
          }

          // 减少活跃连接数
          this.monitoringService.decrementActiveConnections();

          this.logger.debug(`Request completed: ${method} ${url} - ${statusCode} (${duration}ms)`);
        },
        error: error => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode || 500;

          // 记录API调用指标
          this.monitoringService.recordApiCall(method, url, statusCode, duration);

          // 减少活跃连接数
          this.monitoringService.decrementActiveConnections();

          this.logger.error(`Request failed: ${method} ${url} - ${statusCode} (${duration}ms)`, error.stack);
        },
      }),
    );
  }
}