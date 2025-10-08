import { Module } from '@nestjs/common';
import { ApiKeyGuard } from './guards/api-key.guard';
import { TracingModule } from './tracing/tracing.module';
import { CacheModule } from './cache/cache.module';
import { RedisModule } from '../redis/redis.module';
import { ExceptionsModule } from './exceptions/exceptions.module';

@Module({
  imports: [
    TracingModule,       // 先导入TracingModule
    RedisModule,         // 再导入RedisModule
    CacheModule,         // 然后导入CacheModule
    ExceptionsModule,     // 最后导入ExceptionsModule
  ],
  providers: [ApiKeyGuard],
  exports: [ApiKeyGuard, TracingModule, RedisModule, CacheModule, ExceptionsModule],
})
export class CommonModule {}
