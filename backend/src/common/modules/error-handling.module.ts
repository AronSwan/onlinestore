import { Module, Global } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import { ErrorTrackingInterceptor } from '../interceptors/error-tracking.interceptor';
import { ErrorReporterService } from '../services/error-reporter.service';

/**
 * 错误处理模块
 * 统一管理所有错误处理相关的服务、拦截器和过滤器
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    // 错误报告服务
    ErrorReporterService,

    // 全局异常过滤器
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },

    // 错误追踪拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorTrackingInterceptor,
    },
  ],
  exports: [ErrorReporterService],
})
export class ErrorHandlingModule {
  constructor(private readonly errorReporter: ErrorReporterService) {
    // 启动时清理旧的错误数据
    this.errorReporter.cleanup();

    // 设置定期清理任务（每小时清理一次）
    setInterval(() => {
      this.errorReporter.cleanup();
    }, 3600000); // 1小时
  }
}
