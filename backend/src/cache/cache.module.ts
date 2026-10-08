import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import { MonitoringModule } from '../monitoring/monitoring.module';

// 第九批清理(2026-10-08)：UnifiedCacheService 摘除——全仓零注入（唯一"消费者"
// 是本模块的 providers 注册），且其在无 Redis 环境下持续重连刷错误日志
// （双盲B1席实测单审计窗 769 条）。缓存链现由 CacheService(cache-manager
// 内存 store)单独承担。
@Global()
@Module({
  imports: [ConfigModule, CacheModule.register(), MonitoringModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class UnifiedCacheModule {}
