import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenObserveConfigService } from './config/openobserve-config.service';
import { OpenObserveService } from './openobserve.service';
import { OpenObserveController } from './openobserve.controller';
import { FieldWhitelistService } from './config/field-whitelist.service';
import { MetricsCollector } from './utils/metrics-collector';
import { BatchWriter } from './utils/batch-writer';
import { ResponseWrapperService } from './utils/response-wrapper.service';
import { ValidationPipe } from '@nestjs/common';

/**
 * 改进的OpenObserve模块
 * 集成配置验证、DTO验证和错误处理
 */
@Module({
  imports: [ConfigModule],
  controllers: [OpenObserveController],
  providers: [
    OpenObserveConfigService,
    OpenObserveService,
    FieldWhitelistService,
    MetricsCollector,
    BatchWriter,
    ResponseWrapperService,
  ],
  exports: [
    OpenObserveService,
    OpenObserveConfigService,
    FieldWhitelistService,
    MetricsCollector,
    BatchWriter,
    ResponseWrapperService,
  ],
})
export class OpenObserveModule {
  constructor(private readonly configService: OpenObserveConfigService) {}

  /**
   * 配置全局验证管道
   */
  static configureValidationPipe(): ValidationPipe {
    return new ValidationPipe({
      transform: true, // 自动转换类型
      whitelist: true, // 只保留DTO中定义的属性
      forbidNonWhitelisted: true, // 拒绝非白名单属性
      transformOptions: {
        enableImplicitConversion: true, // 启用隐式类型转换
      },
      exceptionFactory: (errors) => {
        const errorMessages = errors.map(error => ({
          field: error.property,
          message: Object.values(error.constraints || {}).join(', '),
          value: error.value,
        }));
        
        return {
          name: 'ValidationError',
          message: 'Validation failed',
          details: errorMessages,
        };
      },
    });
  }
}
