import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditLogEntity } from './entities/audit-log.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from '../interceptors/audit.interceptor';
import { TracingModule } from '../tracing/tracing.module';

/**
 * 审计模块
 * 提供完整的审计日志功能，包括自动记录、查询、统计和清理
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity]), ScheduleModule.forRoot(), TracingModule],
  providers: [AuditService, AuditInterceptor],
  controllers: [AuditController],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {
  constructor(private readonly auditService: AuditService) {
    // 启动时清理过期日志
    this.cleanupExpiredLogs();
  }

  private async cleanupExpiredLogs(): Promise<void> {
    try {
      const deletedCount = await this.auditService.cleanupLogs(90); // 保留 90 天
      console.log(`Cleaned up ${deletedCount} expired audit logs on startup`);
    } catch (error) {
      console.error('Failed to cleanup expired audit logs on startup:', error);
    }
  }
}
