import { Controller, Get, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiGetResource,
  ApiDeleteResource,
  ApiCreateResource,
} from '../common/decorators/api-docs.decorator';
import { UnifiedCacheService } from './unified-cache.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiDeleteResource('删除资源')
  async flushByTag(@Param('tag') tag: string) {
    const count = await this.cacheService.flushByTag(tag);
    return { deletedCount: count };
  }

  @Post('stats/reset')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiCreateResource(Object, Object, '创建资源')
  resetStats() {
    this.cacheService.resetStats();
    return { message: '缓存统计已重置' };
  }
}
