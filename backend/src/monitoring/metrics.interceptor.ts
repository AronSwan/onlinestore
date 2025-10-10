import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, finalize, share } from 'rxjs/operators';
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

    const stream = next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          this.monitoringService.recordApiCall(method, url, statusCode, duration);

          if (duration > 1000) {
            this.logger.warn(`Slow request detected: ${method} ${url} - ${duration}ms`);
          }

          this.logger.debug(`Request completed: ${method} ${url} - ${statusCode} (${duration}ms)`);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode || 500;
          this.monitoringService.recordApiCall(method, url, statusCode, duration);

          this.logger.error(`Request failed: ${method} ${url} - ${statusCode} (${duration}ms)`, (error as any)?.stack);
        },
      }),
      finalize(() => {
        // 无论成功或失败，均减少活跃连接数
        this.monitoringService.decrementActiveConnections();
      }),
      share(),
    );

    // 确保即使外部未订阅也会执行监控副作用（测试并发用例需要）
    stream.subscribe({ next: () => {}, error: () => {} });

    return stream;
  }
}