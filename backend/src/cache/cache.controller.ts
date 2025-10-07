import { Controller, Get, Delete, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiGetResource,
  ApiDeleteResource,
  ApiCreateResource,
} from '../common/decorators/api-docs.decorator';
import { UnifiedCacheService } from './unified-cache.service';

@ApiTags('cache')
@Controller('cache')
export class CacheController {
  constructor(private readonly cacheService: UnifiedCacheService) {}

  @Get('stats')
  @ApiGetResource(Object, 'API接口')
  getStats() {
    return this.cacheService.getStats();
  }

  @Get('health')
  @ApiGetResource(Object, 'API接口')
  async healthCheck() {
    return await this.cacheService.healthCheck();
  }

  @Delete('flush/:tag')
  @ApiDeleteResource('删除资源')
  async flushByTag(@Param('tag') tag: string) {
    const count = await this.cacheService.flushByTag(tag);
    return { deletedCount: count };
  }

  @Post('stats/reset')
  @ApiCreateResource(Object, Object, '创建资源')
  resetStats() {
    this.cacheService.resetStats();
    return { message: '缓存统计已重置' };
  }
}
