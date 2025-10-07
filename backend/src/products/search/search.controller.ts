// 用途：搜索控制器，提供搜索相关API接口
// 依赖文件：search-manager.service.ts, search-suggestion.service.ts, popular-search.service.ts
// 作者：AI助手
// 时间：2025-09-30 10:30:00

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SearchManagerService } from './search-manager.service';
import { SearchSuggestionService } from './search-suggestion.service';
import { PopularSearchService, PopularSearchOptions } from './popular-search.service';
import { SearchOptions, SearchResult } from './search-strategy.interface';
import { ApiDocs, ApiPaginatedQuery } from '../../common/decorators/api-docs.decorator';

@ApiTags('搜索')
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchManagerService: SearchManagerService,
    private readonly searchSuggestionService: SearchSuggestionService,
    private readonly popularSearchService: PopularSearchService,
  ) {}

  @ApiPaginatedQuery(Object, '执行搜索')
  @Get()
  async search(
    @Query('q') q: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ): Promise<SearchResult> {
    const options: SearchOptions = {
      limit,
      offset,
      filters: {},
    };

    // 添加过滤条件
    if (category) {
      options.filters!.category = category;
    }
    if (minPrice) {
      options.filters!.minPrice = parseFloat(minPrice);
    }
    if (maxPrice) {
      options.filters!.maxPrice = parseFloat(maxPrice);
    }

    // 执行搜索
    const result = await this.searchManagerService.search(q, options);

    // 记录搜索历史
    await this.popularSearchService.recordSearch(q, undefined, result.hits.length);

    return result;
  }

  @ApiDocs({
    summary: '获取搜索建议',
    description: '根据输入的关键词前缀获取搜索建议',
    queries: [
      { name: 'q', required: true, description: '搜索关键词前缀' },
      { name: 'limit', required: false, description: '返回建议数量限制，默认10' },
    ],
  })
  @Get('suggestions')
  async getSuggestions(
    @Query('q') q: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<string[]> {
    const suggestions = await this.searchSuggestionService.getSuggestions(q, {
      limit,
    });
    return suggestions.map(suggestion => suggestion.text);
  }

  @ApiDocs({
    summary: '获取热门搜索',
    description: '获取热门搜索词列表，支持时间范围和分类过滤',
    queries: [
      { name: 'limit', required: false, description: '返回热门搜索数量限制，默认10' },
      { name: 'includeTrends', required: false, description: '是否包含趋势信息，默认true' },
      { name: 'timeRange', required: false, type: 'string', description: '时间范围，默认week' },
      { name: 'category', required: false, description: '分类过滤' },
    ],
  })
  @Get('popular')
  async getPopularSearches(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('includeTrends', new DefaultValuePipe(true)) includeTrends: boolean,
    @Query('timeRange', new DefaultValuePipe('week')) timeRange: 'day' | 'week' | 'month',
    @Query('category') category?: string,
  ) {
    const options: PopularSearchOptions = {
      limit,
      includeTrends,
      timeRange,
      category,
    };

    return this.popularSearchService.getPopularSearches(options);
  }

  @ApiDocs({
    summary: '记录搜索历史',
    description: '记录用户搜索历史，用于统计和分析',
    body: {
      type: Object,
      description: '搜索历史数据',
    },
  })
  @Post('history')
  async recordSearchHistory(
    @Body() body: { query: string; userId?: string; resultCount?: number },
  ) {
    const { query, userId, resultCount } = body;
    await this.popularSearchService.recordSearch(query, userId, resultCount);
    return { success: true };
  }

  @ApiDocs({
    summary: '获取搜索趋势分析',
    description: '获取指定天数内的搜索趋势分析数据',
    queries: [{ name: 'days', required: false, description: '分析天数，默认7天' }],
  })
  @Get('trends')
  async getSearchTrends(@Query('days', new DefaultValuePipe('7')) days: string) {
    return this.popularSearchService.getSearchTrends(parseInt(days, 10));
  }

  @ApiDocs({
    summary: '添加热门搜索词',
    description: '手动添加热门搜索词到系统',
    body: {
      type: Object,
      description: '热门搜索词数据',
    },
  })
  @Post('popular')
  async addPopularSearchTerm(@Body() body: { term: string; category?: string }) {
    const { term, category } = body;
    await this.popularSearchService.addPopularSearchTerm(term, category);
    return { success: true };
  }

  @ApiDocs({
    summary: '清除搜索缓存',
    description: '清除所有搜索相关的缓存数据',
  })
  @Delete('cache')
  async clearSearchCache() {
    await this.searchSuggestionService.clearCache();
    await this.popularSearchService.clearCache();
    return { success: true };
  }

  @ApiDocs({
    summary: '获取搜索系统状态',
    description: '获取搜索系统的运行状态和统计信息',
  })
  @Get('status')
  async getSearchStatus() {
    return this.searchManagerService.getStatus();
  }

  @ApiDocs({
    summary: '手动切换搜索引擎',
    description: '手动切换到指定的搜索引擎',
    params: [{ name: 'engine', required: true, description: '搜索引擎名称' }],
  })
  @Post('switch/:engine')
  async switchSearchEngine(@Param('engine') engine: string) {
    return this.searchManagerService.switchEngine(engine as any);
  }

  @ApiDocs({
    summary: '重新初始化搜索引擎',
    description: '重新初始化搜索引擎，重建索引和配置',
  })
  @Post('reinitialize')
  async reinitializeSearchEngine() {
    return this.searchManagerService.reinitialize();
  }
}
