import { Module, Global } from '@nestjs/common';
import { RedisCacheService } from './redis-cache.service';

@Global()
@Module({
  providers: [RedisCacheService],
  exports: [RedisCacheService],
})
export class CacheModule {
  static forRoot(options?: any) {
    return {
      module: CacheModule,
      providers: [RedisCacheService],
      exports: [RedisCacheService],
    };
  }

  static forRootAsync(options?: any) {
    return {
      module: CacheModule,
      providers: [RedisCacheService],
      exports: [RedisCacheService],
    };
  }
}
