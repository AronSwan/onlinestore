// 用途：消息队列模块，集成Redpanda流处理
// 依赖文件：redpanda.service.ts
// 作者：后端开发团队
// 时间：2025-09-30 00:00:00

import { Module } from '@nestjs/common';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { ConfigModule } from '@nestjs/config';
import { RedpandaService } from './redpanda.service';

@Module({
  imports: [ConfigModule, MonitoringModule],
  providers: [RedpandaService],
  exports: [RedpandaService],
})
export class MessagingModule {}
