import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { UnifiedCacheService } from './unified-cache.service';
import { CacheService } from './cache.service';
import { MonitoringModule } from '../monitoring/monitoring.module';

@Global()
@Module({
  imports: [ConfigModule, CacheModule.register(), MonitoringModule],
  providers: [UnifiedCacheService, CacheService],
  exports: [UnifiedCacheService, CacheService],
})
export class UnifiedCacheModule {}
