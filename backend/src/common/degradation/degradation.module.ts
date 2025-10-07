import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DegradationService } from './degradation.service';
import { DegradationController } from './degradation.controller';
import { DegradationInterceptor } from '../interceptors/degradation.interceptor';
import { TracingModule } from '../tracing/tracing.module';

/**
 * 优雅降级模块
 * 提供系统降级管理功能
 */
@Global()
@Module({
  imports: [ConfigModule, ScheduleModule.forRoot(), TracingModule],
  providers: [DegradationService, DegradationInterceptor],
  controllers: [DegradationController],
  exports: [DegradationService, DegradationInterceptor],
})
export class DegradationModule {
  constructor(private readonly degradationService: DegradationService) {
    // 模块初始化时记录日志
    console.log('DegradationModule initialized');
  }
}
