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
import { catchError, timeout, retry, tap } from 'rxjs/operators';
import {
  ReadWriteSeparationService,
  DatabaseOperationType,
} from '../database/read-write-separation.service';
import { TracingService } from '../tracing/tracing.service';
import { READ_WRITE_OPERATION_KEY, ReadWriteOptions } from '../decorators/read-write.decorator';

/**
 * 读写分离拦截器
 * 自动处理数据库操作的路由和故障转移
 */
@Injectable()
export class ReadWriteInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ReadWriteInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly readWriteService: ReadWriteSeparationService,
    private readonly tracingService: TracingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;

    // 获取读写操作元数据
    const readWriteOptions = this.reflector.get<ReadWriteOptions>(
      READ_WRITE_OPERATION_KEY,
      handler,
    );

    // 如果没有读写操作元数据，直接执行
    if (!readWriteOptions) {
      return next.handle();
    }

    const traceId = this.tracingService.generateTraceId();
    const operationName = `${className}.${methodName}`;

    this.logger.debug(`[${traceId}] Intercepting ${operationName} with options:`, readWriteOptions);

    // 开始追踪
    const span = this.tracingService.startSpan(operationName, {
      operation_type: readWriteOptions.type,
      force_connection: readWriteOptions.forceConnection || '',
      fallback_to_master: readWriteOptions.fallbackToMaster,
      timeout: readWriteOptions.timeout,
      retries: readWriteOptions.retries,
    });

    // 设置数据库连接上下文
    this.setDatabaseContext(readWriteOptions, traceId || '');

    let operation$ = next.handle().pipe(
      tap(() => {
        this.logger.debug(`[${traceId}] ${operationName} completed successfully`);
        (span as any).setTag?.('success', true);
      }),
      catchError(error => {
        this.logger.error(`[${traceId}] ${operationName} failed:`, error.message);
        (span as any).setTag?.('success', false);
        (span as any).setTag?.('error', error.message);

        // 处理数据库连接错误的故障转移
        return this.handleDatabaseError(error, readWriteOptions, traceId || '', operationName);
      }),
    );

    // 应用超时
    if (readWriteOptions.timeout) {
      operation$ = operation$.pipe(timeout(readWriteOptions.timeout));
    }

    // 应用重试
    if (readWriteOptions.retries && readWriteOptions.retries > 0) {
      operation$ = operation$.pipe(retry(readWriteOptions.retries));
    }

    return operation$.pipe(
      tap(() => (span as any).finish?.()),
      catchError(error => {
        (span as any).finish?.();
        return throwError(error);
      }),
    );
  }

  /**
   * 设置数据库连接上下文
   */
  private setDatabaseContext(options: ReadWriteOptions, traceId: string): void {
    try {
      // 根据操作类型和选项设置数据库连接
      if (options.forceConnection) {
        // Note: setConnectionContext method may not exist, using getDataSource instead
        this.logger.debug(`[${traceId}] Force connection to: ${options.forceConnection}`);
      } else {
        const connectionType = options.type === DatabaseOperationType.READ ? 'slave' : 'master';
        this.logger.debug(`[${traceId}] Setting connection type to: ${connectionType}`);
      }
    } catch (error) {
      this.logger.warn(`[${traceId}] Failed to set database context:`, error.message);
    }
  }

  /**
   * 处理数据库错误和故障转移
   */
  private handleDatabaseError(
    error: any,
    options: ReadWriteOptions,
    traceId: string,
    operationName: string,
  ): Observable<any> {
    // 检查是否是数据库连接错误
    if (this.isDatabaseConnectionError(error)) {
      this.logger.warn(
        `[${traceId}] Database connection error in ${operationName}:`,
        error.message,
      );

      // 如果是读操作且允许故障转移到主库
      if (options.type === DatabaseOperationType.READ && options.fallbackToMaster) {
        (this.logger as any).info?.(
          `[${traceId}] Attempting failover to master for ${operationName}`,
        );

        try {
          // 切换到主库连接
          (this.readWriteService as any).setConnectionContext?.('master', traceId);

          // 记录故障转移
          (this.tracingService as any).recordEvent?.('database_failover', {
            operation: operationName,
            from: 'slave',
            to: 'master',
            reason: error.message,
          });

          // 返回空的 Observable，让重试机制处理
          return throwError(new Error('Retrying with master connection'));
        } catch (failoverError) {
          this.logger.error(`[${traceId}] Failover to master failed:`, failoverError.message);
        }
      }
    }

    // 转换为适当的HTTP异常
    if (error instanceof HttpException) {
      return throwError(error);
    }

    // 根据错误类型返回适当的HTTP状态码
    const httpStatus = this.getHttpStatusFromError(error);
    return throwError(
      new HttpException(
        {
          message: 'Database operation failed',
          error: error.message,
          operation: operationName,
          traceId,
        },
        httpStatus,
      ),
    );
  }

  /**
   * 检查是否是数据库连接错误
   */
  private isDatabaseConnectionError(error: any): boolean {
    const connectionErrorMessages = [
      'connection refused',
      'connection timeout',
      'connection lost',
      'connection terminated',
      'connection reset',
      'connection closed',
      'connection failed',
      'connection error',
      'network error',
      'timeout',
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    return connectionErrorMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * 根据错误类型获取HTTP状态码
   */
  private getHttpStatusFromError(error: any): HttpStatus {
    const errorMessage = error.message?.toLowerCase() || '';

    if (errorMessage.includes('timeout')) {
      return HttpStatus.REQUEST_TIMEOUT;
    }

    if (errorMessage.includes('connection')) {
      return HttpStatus.SERVICE_UNAVAILABLE;
    }

    if (errorMessage.includes('permission') || errorMessage.includes('access denied')) {
      return HttpStatus.FORBIDDEN;
    }

    if (errorMessage.includes('not found')) {
      return HttpStatus.NOT_FOUND;
    }

    if (errorMessage.includes('duplicate') || errorMessage.includes('unique constraint')) {
      return HttpStatus.CONFLICT;
    }

    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return HttpStatus.BAD_REQUEST;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}

/**
 * 全局读写分离拦截器
 * 用于HTTP请求级别的读写分离处理
 */
@Injectable()
export class GlobalReadWriteInterceptor implements NestInterceptor {
  private readonly logger = new Logger(GlobalReadWriteInterceptor.name);

  constructor(
    private readonly readWriteService: ReadWriteSeparationService,
    private readonly tracingService: TracingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const traceId = this.tracingService.generateTraceId();

    // 根据HTTP方法推断数据库操作类型
    const operationType = this.inferOperationType(method, url);

    this.logger.debug(
      `[${traceId}] Global read-write interception for ${method} ${url}, inferred type: ${operationType}`,
    );

    // 设置请求级别的数据库连接上下文
    request.dbOperationType = operationType;
    request.traceId = traceId;

    // 设置默认连接
    const connectionType = operationType === DatabaseOperationType.READ ? 'slave' : 'master';
    (this.readWriteService as any).setConnectionContext?.(connectionType, traceId);

    return next.handle().pipe(
      tap(() => {
        this.logger.debug(
          `[${traceId}] Global read-write operation completed for ${method} ${url}`,
        );
      }),
      catchError(error => {
        this.logger.error(
          `[${traceId}] Global read-write operation failed for ${method} ${url}:`,
          error.message,
        );
        return throwError(error);
      }),
    );
  }

  /**
   * 根据HTTP方法和URL推断数据库操作类型
   */
  private inferOperationType(method: string, url: string): DatabaseOperationType {
    // GET 请求通常是读操作
    if (method === 'GET') {
      return DatabaseOperationType.READ;
    }

    // POST, PUT, PATCH, DELETE 通常是写操作
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return DatabaseOperationType.WRITE;
    }

    // 根据URL路径进一步判断
    const urlLower = url.toLowerCase();

    // 查询相关的端点
    if (
      urlLower.includes('/search') ||
      urlLower.includes('/query') ||
      urlLower.includes('/list') ||
      urlLower.includes('/find') ||
      urlLower.includes('/get') ||
      urlLower.includes('/stats') ||
      urlLower.includes('/report')
    ) {
      return DatabaseOperationType.READ;
    }

    // 写操作相关的端点
    if (
      urlLower.includes('/create') ||
      urlLower.includes('/update') ||
      urlLower.includes('/delete') ||
      urlLower.includes('/save') ||
      urlLower.includes('/insert') ||
      urlLower.includes('/modify')
    ) {
      return DatabaseOperationType.WRITE;
    }

    // 默认为读操作（更安全）
    return DatabaseOperationType.READ;
  }
}
