import { Module } from '@nestjs/common';
import { SecurityMonitoringService } from './security-monitoring.service';
import { SecurityMonitoringController } from './security-monitoring.controller';
import { CacheModule } from '../cache/cache.module';
import { ConfigModule } from '@nestjs/config';

/**
 * 安全监控模块
 * 提供安全漏洞数据的监控和管理功能
 */
@Module({
  imports: [ConfigModule, CacheModule],
  controllers: [SecurityMonitoringController],
  providers: [SecurityMonitoringService],
  exports: [SecurityMonitoringService],
})
export class SecurityMonitoringModule {}
