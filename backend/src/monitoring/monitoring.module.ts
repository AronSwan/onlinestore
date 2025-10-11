import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MonitoringService, Metric } from './monitoring.service';
import { MetricsService } from './metrics.service';
import { AlertService } from './alert.service';
import { MonitoringController } from './monitoring.controller';
import { AlertController } from './alert.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { NotificationModule } from '../notification/notification.module';

/**
 * 监控模块
 * 提供应用监控、指标收集、性能分析和告警功能
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Metric]),
    ScheduleModule.forRoot(),
    forwardRef(() => NotificationModule),
  ],
  controllers: [MonitoringController, AlertController],
  providers: [
    MonitoringService,
    MetricsService,
    AlertService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [MonitoringService, MetricsService, AlertService],
})
export class MonitoringModule {}
