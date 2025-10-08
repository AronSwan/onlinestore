// 用途：缓存策略模块，提供智能缓存管理
// 依赖文件：cache.service.ts
// 作者：后端开发团队
// 时间：2025-09-30

import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { UnifiedCacheModule } from '../cache/cache.module';
import { CacheService } from '../cache/cache.service';
import { MonitoringModule } from '../monitoring/monitoring.module';

@Module({
  imports: [UnifiedCacheModule, MonitoringModule, CacheModule.register()],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheStrategiesModule {}
