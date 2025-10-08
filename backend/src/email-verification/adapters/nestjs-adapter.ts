/**
 * NestJS Adapter for Email Verification Service
 * 
 * 功能特性：
 * - NestJS装饰器集成
 * - 依赖注入支持
 * - 模块和服务封装
 * - 中间件和拦截器
 */

import { 
  Injectable, 
  Module, 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  Param, 
  HttpCode, 
  HttpStatus, 
  CallHandler, 
  ExecutionContext, 
  NestInterceptor, 
  Catch, 
  ExceptionFilter, 
  HttpException, 
  ArgumentsHost, 
  Logger, 
  PipeTransform, 
  ArgumentMetadata, 
  BadRequestException, 
  Inject,
  UseFilters,
  UseInterceptors,
  UsePipes,
  SetMetadata
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { tap } from 'rxjs/operators';

// 动态导入 CommonJS 模块
const EnhancedEmailVerifierService = require('../enhanced-email-verifier-service');
const OpenObserveService = require('../openobserve-service');

// 邮箱验证请求DTO
export class VerifyEmailDto {
  email: string;
  options?: {
    timeout?: number;
    skipProxy?: boolean;
    requestId?: string;
  };
}

// 批量邮箱验证请求DTO
export class VerifyBatchEmailDto {
  emails: string[];
  options?: {
    batchSize?: number;
    batchDelay?: number;
    requestId?: string;
  };
}

// 验证结果接口
export interface VerificationResult {
  email: string;
  valid: boolean;
  reason: string;
  code: string;
  duration_ms: number;
  timestamp: string;
  details?: any;
  fromCache?: boolean;
}

// 批量验证结果接口
export interface BatchVerificationResult {
  total: number;
  success: number;
  errors: number;
  results: VerificationResult[];
  duration: number;
  timestamp: string;
}

// 健康检查结果接口
export interface HealthCheckResult {
  status: string;
  timestamp: string;
  version: string;
  uptime: number;
  checks: any;
}

// API 响应接口
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

// 错误响应接口
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  timestamp: string;
  path?: string;
}

// 服务提供者令牌
export const ENHANCED_EMAIL_VERIFIER_SERVICE_TOKEN = 'EnhancedEmailVerifierService';
export const OPEN_OBSERVE_SERVICE_TOKEN = 'OpenObserveService';

// 自定义装饰器元数据键
const EMAIL_VERIFICATION_FILTER = 'emailVerificationFilter';
const EMAIL_VERIFICATION_INTERCEPTOR = 'emailVerificationInterceptor';
const EMAIL_VERIFICATION_PIPE = 'emailVerificationPipe';

/**
 * 邮箱验证服务（NestJS封装）
 */
@Injectable()
export class EmailVerificationService {
  private enhancedService: any;
  private openObserveService: any;

  constructor(@Inject(ENHANCED_EMAIL_VERIFIER_SERVICE_TOKEN) enhancedService: any,
              @Inject(OPEN_OBSERVE_SERVICE_TOKEN) openObserveService: any) {
    this.enhancedService = enhancedService;
    this.openObserveService = openObserveService;
  }

  /**
   * 验证单个邮箱地址
   */
  async verifyEmail(email: string, options: any = {}): Promise<VerificationResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.enhancedService.verifyEmail(email, options);
      
      // 发送到OpenObserve
      await this.openObserveService.recordVerificationResult(
        email, 
        result, 
        Date.now() - startTime,
        { framework: 'nestjs' }
      );
      
      return result;
    } catch (error) {
      // 发送错误到OpenObserve
      await this.openObserveService.recordVerificationError(
        email, 
        error, 
        Date.now() - startTime,
        { framework: 'nestjs' }
      );
      
      throw error;
    }
  }

  /**
   * 批量验证邮箱地址
   */
  async verifyEmailBatch(emails: string[], options: any = {}): Promise<BatchVerificationResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.enhancedService.verifyEmailBatch(emails, options);
      
      // 发送批量结果到OpenObserve
      await this.openObserveService.recordBatchResult(
        `nestjs_${Date.now()}`,
        emails,
        result.results,
        Date.now() - startTime,
        { framework: 'nestjs' }
      );
      
      return result;
    } catch (error) {
      // 发送错误到OpenObserve
      await this.openObserveService.recordVerificationError(
        'batch',
        error,
        Date.now() - startTime,
        { framework: 'nestjs' }
      );
      
      throw error;
    }
  }

  /**
   * 获取服务健康状态
   */
  async getHealthStatus(): Promise<HealthCheckResult> {
    const health = await this.enhancedService.getHealthStatus();
    
    // 发送健康检查结果到OpenObserve
    await this.openObserveService.recordHealthCheck(
      health,
      { framework: 'nestjs' }
    );
    
    return health;
  }

  /**
   * 清理缓存
   */
  async clearCache(): Promise<{ message: string }> {
    await this.enhancedService.clearCache();
    
    // 发送缓存清理事件到OpenObserve
    await this.openObserveService.recordCacheEvent(
      'cleared',
      { type: 'nestjs', size: 0 }
    );
    
    return { message: 'Cache cleared successfully' };
  }

  /**
   * 获取验证配置
   */
  getConfig() {
    return {
      rules: this.enhancedService.rules,
      cache: {
        enabled: this.enhancedService.enableCache,
        expiry: this.enhancedService.cacheExpiry,
      },
      timeout: this.enhancedService.timeout,
    };
  }

  /**
   * 获取性能指标
   */
  getMetrics() {
    const metrics = this.enhancedService.getMetrics();
    
    // 发送性能指标到OpenObserve
    this.openObserveService.recordPerformanceMetrics(
      metrics,
      { framework: 'nestjs' }
    );
    
    return metrics;
  }
}

/**
 * 邮箱验证拦截器（用于监控和日志）
 */
@Injectable()
export class EmailVerificationInterceptor implements NestInterceptor {
  private openObserveService: any;

  constructor(@Inject(OPEN_OBSERVE_SERVICE_TOKEN) openObserveService: any) {
    this.openObserveService = openObserveService;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();
    
    // 记录请求开始
    this.openObserveService.recordPerformanceMetrics({
      endpoint: `${request.method} ${request.path}`,
      statusCode: 0,
      duration: 0,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    }, { framework: 'nestjs', interceptor: 'pre' });

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        
        // 记录请求完成
        this.openObserveService.recordPerformanceMetrics({
          endpoint: `${request.method} ${request.path}`,
          statusCode: context.switchToHttp().getResponse().statusCode,
          duration,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        }, { framework: 'nestjs', interceptor: 'post' });
      }),
    );
  }
}

/**
 * 邮箱验证异常过滤器
 */
@Catch(HttpException)
export class EmailVerificationExceptionFilter implements ExceptionFilter {
  private logger = new Logger(EmailVerificationExceptionFilter.name);
  private openObserveService: any;

  constructor(@Inject(OPEN_OBSERVE_SERVICE_TOKEN) openObserveService: any) {
    this.openObserveService = openObserveService;
  }

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    
    // 记录错误
    this.logger.error(
      `${request.method} ${request.path} - ${status} - ${JSON.stringify(exceptionResponse)}`,
    );
    
    // 发送错误到OpenObserve
    this.openObserveService.recordVerificationError(
      request.body?.email || 'unknown',
      exception,
      0,
      { 
        framework: 'nestjs', 
        endpoint: `${request.method} ${request.path}`,
        statusCode: status,
      }
    );
    
    // 返回错误响应
    const errorResponse: ErrorResponse = {
      success: false,
      error: typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any).message || 'Internal server error',
      code: (exceptionResponse as any).code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }
}

/**
 * 邮箱验证管道（用于参数验证）
 */
@Injectable()
export class EmailValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): any {
    if (metadata.type === 'body') {
      // 验证邮箱验证请求
      if (metadata.metatype?.name === 'VerifyEmailDto') {
        return this.validateVerifyEmailDto(value);
      }
      
      // 验证批量邮箱验证请求
      if (metadata.metatype?.name === 'VerifyBatchEmailDto') {
        return this.validateVerifyBatchEmailDto(value);
      }
    }
    
    return value;
  }
  
  private validateVerifyEmailDto(value: any): VerifyEmailDto {
    if (!value.email || typeof value.email !== 'string') {
      throw new BadRequestException('Email address is required and must be a string');
    }
    
    if (value.email.length > 254) {
      throw new BadRequestException('Email address too long');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value.email)) {
      throw new BadRequestException('Invalid email format');
    }
    
    return value;
  }
  
  private validateVerifyBatchEmailDto(value: any): VerifyBatchEmailDto {
    if (!Array.isArray(value.emails)) {
      throw new BadRequestException('Emails must be an array');
    }
    
    if (value.emails.length === 0) {
      throw new BadRequestException('Emails array cannot be empty');
    }
    
    if (value.emails.length > 1000) {
      throw new BadRequestException('Maximum 1000 emails per batch');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (let i = 0; i < value.emails.length; i++) {
      const email = value.emails[i];
      
      if (typeof email !== 'string') {
        throw new BadRequestException(`Email at index ${i} must be a string`);
      }
      
      if (email.length > 254) {
        throw new BadRequestException(`Email at index ${i} too long`);
      }
      
      if (!emailRegex.test(email)) {
        throw new BadRequestException(`Email at index ${i} has invalid format`);
      }
    }
    
    return value;
  }
}

// 自定义装饰器函数
export function EmailVerificationControllerDecorator() {
  return function(target: any) {
    SetMetadata(EMAIL_VERIFICATION_FILTER, EmailVerificationExceptionFilter)(target);
    SetMetadata(EMAIL_VERIFICATION_INTERCEPTOR, EmailVerificationInterceptor)(target);
    SetMetadata(EMAIL_VERIFICATION_PIPE, EmailValidationPipe)(target);
  };
}

/**
 * 邮箱验证控制器
 */
@Controller('api/v1/email')
@EmailVerificationControllerDecorator()
export class EmailVerificationController {
  private emailVerificationService: EmailVerificationService;

  constructor(emailVerificationService: EmailVerificationService) {
    this.emailVerificationService = emailVerificationService;
  }

  /**
   * 验证单个邮箱地址
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<ApiResponse<VerificationResult>> {
    const result = await this.emailVerificationService.verifyEmail(
      verifyEmailDto.email,
      verifyEmailDto.options,
    );

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 批量验证邮箱地址
   */
  @Post('verify-batch')
  @HttpCode(HttpStatus.OK)
  async verifyEmailBatch(verifyBatchEmailDto: VerifyBatchEmailDto): Promise<ApiResponse<BatchVerificationResult & { batchId: string }>> {
    const result = await this.emailVerificationService.verifyEmailBatch(
      verifyBatchEmailDto.emails,
      verifyBatchEmailDto.options,
    );

    return {
      success: true,
      data: {
        batchId: `nestjs_${Date.now()}`,
        ...result,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取服务健康状态
   */
  @Get('health')
  async getHealth(): Promise<ApiResponse<HealthCheckResult>> {
    const health = await this.emailVerificationService.getHealthStatus();

    return {
      success: true,
      data: health,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取性能指标
   */
  @Get('metrics')
  async getMetrics(): Promise<ApiResponse<any>> {
    const metrics = this.emailVerificationService.getMetrics();

    return {
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取验证配置
   */
  @Get('config')
  async getConfig(): Promise<ApiResponse<any>> {
    const config = this.emailVerificationService.getConfig();

    return {
      success: true,
      data: config,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 清理缓存
   */
  @Post('cache/clear')
  @HttpCode(HttpStatus.OK)
  async clearCache(): Promise<ApiResponse<{ message: string }>> {
    const result = await this.emailVerificationService.clearCache();

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * 邮箱验证模块
 */
@Module({
  controllers: [EmailVerificationController],
  providers: [
    EmailVerificationService,
    {
      provide: ENHANCED_EMAIL_VERIFIER_SERVICE_TOKEN,
      useFactory: () => new EnhancedEmailVerifierService(),
    },
    {
      provide: OPEN_OBSERVE_SERVICE_TOKEN,
      useFactory: () => new OpenObserveService(),
    },
    EmailVerificationInterceptor,
    EmailVerificationExceptionFilter,
    EmailValidationPipe,
  ],
  exports: [EmailVerificationService],
})
export class EmailVerificationModule {}
