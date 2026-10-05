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
 * M6(2026-10-05)：摘除构造器里的启动 cleanupLogs——链式台账删行即断链，
 * 启动即删更会在每次重启时制造 UNCHAINED/BREAK。保留 AuditService.cleanupLogs
 * 方法壳（带链化守卫），使 POST /audit/cleanup 与每日 cron 成为诚实 no-op。
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity]), ScheduleModule.forRoot(), TracingModule],
  providers: [AuditService, AuditInterceptor],
  controllers: [AuditController],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
