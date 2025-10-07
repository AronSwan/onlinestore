import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { TracingService } from '../tracing/tracing.service';
import {
  CIRCUIT_BREAKER_METADATA,
  CircuitBreakerOptions,
} from '../decorators/circuit-breaker.decorator';

/**
 * 熔断器拦截器
 * 自动为带有熔断器装饰器的方法提供熔断保护
 */
@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CircuitBreakerInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly tracingService: TracingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const target = context.getClass();

    // 获取熔断器配置
    const options = this.reflector.get<CircuitBreakerOptions>(CIRCUIT_BREAKER_METADATA, handler);

    // 如果没有熔断器配置或被禁用，直接执行
    if (!options || options.enabled === false) {
      return next.handle();
    }

    const span = this.tracingService.startSpan('circuit-breaker-interceptor');
    const className = target.name;
    const methodName = handler.name;
    const circuitBreakerName = options.name || `${className}.${methodName}`;

    span?.setAttributes({
      'circuit-breaker.name': circuitBreakerName,
      'circuit-breaker.class': className,
      'circuit-breaker.method': methodName,
    });

    try {
      // 获取熔断器实例
      const circuitBreaker = this.circuitBreakerService.getCircuitBreaker(
        circuitBreakerName,
        options,
      );

      // 执行受保护的调用
      return new Observable(observer => {
        circuitBreaker
          .call(async () => {
            return new Promise((resolve, reject) => {
              const subscription = next.handle().subscribe({
                next: value => {
                  resolve(value);
                  observer.next(value);
                  observer.complete();
                },
                error: error => {
                  reject(error);
                  this.handleError(error, options, observer, span);
                },
              });

              // 清理订阅
              return () => subscription.unsubscribe();
            });
          })
          .catch(error => {
            this.handleError(error, options, observer, span);
          });
      });
    } catch (error) {
      this.handleError(error, options, null, span);
      return throwError(() => error);
    } finally {
      span?.end();
    }
  }

  /**
   * 处理错误和降级逻辑
   */
  private handleError(error: any, options: CircuitBreakerOptions, observer: any, span: any): void {
    const isCircuitBreakerError =
      error.message?.includes('熔断器') || error.message?.includes('circuit breaker');

    // 记录错误
    if (options.logErrors !== false) {
      this.logger.error(`熔断器拦截器捕获错误: ${error.message}`, error.stack);
    }

    span?.recordException(error);
    span?.setStatus({ code: 2, message: error.message });

    // 如果是熔断器错误，尝试使用降级策略
    if (isCircuitBreakerError) {
      const fallbackResult = this.getFallbackResult(error, options);

      if (fallbackResult !== undefined) {
        if (observer) {
          observer.next(fallbackResult);
          observer.complete();
        }
        return;
      }
    }

    // 转换为HTTP异常
    const httpException = this.convertToHttpException(error, isCircuitBreakerError);

    if (observer) {
      observer.error(httpException);
    } else {
      throw httpException;
    }
  }

  /**
   * 获取降级结果
   */
  private getFallbackResult(error: any, options: CircuitBreakerOptions): any {
    // 优先使用降级函数
    if (options.fallback && typeof options.fallback === 'function') {
      try {
        return options.fallback(error);
      } catch (fallbackError) {
        this.logger.error(`降级函数执行失败: ${fallbackError.message}`, fallbackError.stack);
      }
    }

    // 使用降级值
    if (options.fallbackValue !== undefined) {
      return options.fallbackValue;
    }

    return undefined;
  }

  /**
   * 转换为HTTP异常
   */
  private convertToHttpException(error: any, isCircuitBreakerError: boolean): HttpException {
    // 如果已经是HTTP异常，直接返回
    if (error instanceof HttpException) {
      return error;
    }

    // 根据错误类型确定状态码
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = error.message || '服务暂时不可用';

    if (isCircuitBreakerError) {
      statusCode = HttpStatus.SERVICE_UNAVAILABLE;
      message = '服务熔断中，请稍后重试';
    } else if (error.message?.includes('超时') || error.message?.includes('timeout')) {
      statusCode = HttpStatus.REQUEST_TIMEOUT;
      message = '请求超时';
    } else if (error.message?.includes('连接') || error.message?.includes('connection')) {
      statusCode = HttpStatus.BAD_GATEWAY;
      message = '服务连接失败';
    }

    return new HttpException(
      {
        statusCode,
        message,
        error: error.name || 'CircuitBreakerError',
        timestamp: new Date().toISOString(),
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      statusCode,
    );
  }
}

/**
 * 全局熔断器拦截器
 * 为所有HTTP请求提供熔断保护
 */
@Injectable()
export class GlobalCircuitBreakerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(GlobalCircuitBreakerInterceptor.name);

  constructor(
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly tracingService: TracingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // 获取路由信息
    const route = request.route?.path || request.url;
    const method = request.method;
    const circuitBreakerName = `http-${method}-${route}`;

    const span = this.tracingService.startSpan('global-circuit-breaker');
    span?.setAttributes({
      'http.method': method,
      'http.route': route,
      'circuit-breaker.name': circuitBreakerName,
    });

    // 为HTTP请求配置熔断器
    const config = {
      failureThreshold: 60,
      timeout: 30000,
      resetTimeout: 60000,
      minimumNumberOfCalls: 5,
      slowCallDurationThreshold: 10000,
      slowCallRateThreshold: 70,
    };

    try {
      const circuitBreaker = this.circuitBreakerService.getCircuitBreaker(
        circuitBreakerName,
        config,
      );

      return new Observable(observer => {
        circuitBreaker
          .call(async () => {
            return new Promise((resolve, reject) => {
              const subscription = next.handle().subscribe({
                next: value => {
                  resolve(value);
                  observer.next(value);
                  observer.complete();
                },
                error: error => {
                  reject(error);
                  this.handleHttpError(error, response, observer, span);
                },
              });

              return () => subscription.unsubscribe();
            });
          })
          .catch(error => {
            this.handleHttpError(error, response, observer, span);
          });
      });
    } catch (error) {
      this.handleHttpError(error, response, null, span);
      return throwError(() => error);
    } finally {
      span?.end();
    }
  }

  /**
   * 处理HTTP错误
   */
  private handleHttpError(error: any, response: any, observer: any, span: any): void {
    const isCircuitBreakerError = error.message?.includes('熔断器');

    span?.recordException(error);
    span?.setStatus({ code: 2, message: error.message });

    if (isCircuitBreakerError) {
      const fallbackResponse = {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: '服务暂时不可用，请稍后重试',
        error: 'Service Unavailable',
        timestamp: new Date().toISOString(),
      };

      if (observer) {
        observer.next(fallbackResponse);
        observer.complete();
      }
      return;
    }

    // 其他错误正常处理
    if (observer) {
      observer.error(error);
    } else {
      throw error;
    }
  }
}
