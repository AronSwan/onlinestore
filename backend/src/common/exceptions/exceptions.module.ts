import { Module } from '@nestjs/common';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { FileUploadInterceptor } from '../interceptors/file-upload.interceptor';

/**
 * 全局异常处理模块
 * 提供统一的异常处理、日志记录和文件上传安全验证
 */
@Module({
  providers: [
    GlobalExceptionFilter,
    LoggingInterceptor,
    FileUploadInterceptor,
  ],
  exports: [
    GlobalExceptionFilter,
    LoggingInterceptor,
    FileUploadInterceptor,
  ],
})
export class ExceptionsModule {}