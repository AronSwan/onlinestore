import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UnifiedCacheService } from './unified-cache.service';
import { CacheController } from './cache.controller';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [UnifiedCacheService],
  controllers: [CacheController],
  exports: [UnifiedCacheService],
})
export class UnifiedCacheModule {}
