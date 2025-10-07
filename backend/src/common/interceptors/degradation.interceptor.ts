import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, throwError, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { DegradationService } from '../degradation/degradation.service';

/**
 * 降级拦截器
 */
@Injectable()
export class DegradationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DegradationInterceptor.name);

  constructor(private readonly degradationService: DegradationService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const serviceName = this.getServiceName(context);

    // 检查是否需要降级
    if (this.degradationService.shouldDegrade(serviceName)) {
      this.logger.warn(`Service ${serviceName} is degraded, returning fallback response`);
      return of(this.getFallbackResponse(serviceName, request));
    }

    // 正常处理请求，但添加超时和错误处理
    return next.handle().pipe(
      timeout(this.degradationService.getTimeout(serviceName)),
      catchError(error => {
        this.logger.error(`Service ${serviceName} error:`, error);

        // 根据错误类型决定是否触发降级
        if (this.shouldTriggerDegradation(error)) {
          this.degradationService.triggerDegradation(serviceName, error);
          return of(this.getFallbackResponse(serviceName, request));
        }

        return throwError(error);
      }),
    );
  }

  /**
   * 获取服务名称
   */
  private getServiceName(context: ExecutionContext): string {
    const handler = context.getHandler();
    const controller = context.getClass();
    return `${controller.name}.${handler.name}`;
  }

  /**
   * 获取降级响应
   */
  private getFallbackResponse(serviceName: string, request: any): any {
    return {
      success: false,
      message: 'Service temporarily unavailable',
      data: null,
      degraded: true,
      service: serviceName,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 判断是否应该触发降级
   */
  private shouldTriggerDegradation(error: any): boolean {
    // 网络错误、超时错误、服务不可用等应该触发降级
    return error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.status >= 500;
  }
}
