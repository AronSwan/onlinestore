// 用途：搜索建议服务，提供智能搜索词建议功能
// 依赖文件：products.service.ts, cache.service.ts, search-manager.service.ts
// 作者：AI助手
// 时间：2025-09-30 10:15:00

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../cache/cache.service';
import { SearchManagerService } from './search-manager.service';
import { ProductsService } from '../products.service';

export interface SearchSuggestion {
  text: string;
  category?: string;
  popularity: number;
  highlight?: string;
}

export interface SearchSuggestionOptions {
  limit?: number;
  includeCategories?: boolean;
  includePopular?: boolean;
  minCharacters?: number;
}

@Injectable()
export class SearchSuggestionService {
  private readonly logger = new Logger(SearchSuggestionService.name);
  private readonly suggestionCacheTTL: number;
  private readonly popularSearchesCacheKey = 'search:suggestions:popular';
  private readonly categorySuggestionsCacheKey = 'search:suggestions:categories';

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly searchManager: SearchManagerService,
    private readonly productsService: ProductsService,
  ) {
    this.suggestionCacheTTL = this.configService.get<number>('search.suggestions.cacheTTL') || 300; // 5分钟
  }

  /**
   * 获取搜索建议
   */
  async getSuggestions(
    query: string,
    options: SearchSuggestionOptions = {},
  ): Promise<SearchSuggestion[]> {
    const {
      limit = 8,
      includeCategories = true,
      includePopular = true,
      minCharacters = 2,
    } = options;

    // 如果查询太短，不提供建议
    if (query.length < minCharacters) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const cacheKey = `search:suggestions:${normalizedQuery}`;

    // 尝试从缓存获取
    const cachedSuggestions = await this.cacheService.get<SearchSuggestion[]>(
      'search',
      'suggestions',
      normalizedQuery,
    );

    if (cachedSuggestions) {
      this.logger.debug(`从缓存获取搜索建议: ${normalizedQuery}`);
      return cachedSuggestions.slice(0, limit);
    }

    // 收集所有建议
    const suggestions: SearchSuggestion[] = [];

    // 1. 获取产品名称建议
    const productSuggestions = await this.getProductSuggestions(
      normalizedQuery,
      Math.floor(limit / 2),
    );
    suggestions.push(...productSuggestions);

    // 2. 获取分类建议
    if (includeCategories) {
      const categorySuggestions = await this.getCategorySuggestions(
        normalizedQuery,
        Math.floor(limit / 4),
      );
      suggestions.push(...categorySuggestions);
    }

    // 3. 获取热门搜索建议
    if (includePopular) {
      const popularSuggestions = await this.getPopularSearchSuggestions(
        normalizedQuery,
        Math.floor(limit / 4),
      );
      suggestions.push(...popularSuggestions);
    }

    // 按流行度排序并限制数量
    const sortedSuggestions = suggestions
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);

    // 缓存结果
    await this.cacheService.set('search', 'suggestions', sortedSuggestions, normalizedQuery, {
      ttl: this.suggestionCacheTTL,
    });

    return sortedSuggestions;
  }

  /**
   * 获取产品名称建议
   */
  private async getProductSuggestions(query: string, limit: number): Promise<SearchSuggestion[]> {
    try {
      // 使用搜索引擎获取产品名称建议
      const searchResult = await this.searchManager.search(query, {
        limit: limit * 2, // 获取更多结果以便筛选
        facets: ['category'],
      });

      // 转换为建议格式
      const suggestions: SearchSuggestion[] = searchResult.hits.map(hit => ({
        text: hit.name,
        category: hit.category,
        popularity: hit.score,
        highlight: this.highlightText(hit.name, query),
      }));

      // 去重
      const uniqueSuggestions = this.deduplicateSuggestions(suggestions);

      return uniqueSuggestions.slice(0, limit);
    } catch (error) {
      this.logger.error('获取产品建议失败', error);
      return [];
    }
  }

  /**
   * 获取分类建议
   */
  private async getCategorySuggestions(query: string, limit: number): Promise<SearchSuggestion[]> {
    try {
      // 尝试从缓存获取分类建议
      const cachedCategories = await this.cacheService.get<SearchSuggestion[]>(
        'search',
        'suggestions',
        'categories',
      );

      if (cachedCategories) {
        return cachedCategories
          .filter(suggestion => suggestion.text.toLowerCase().includes(query))
          .slice(0, limit);
      }

      // 如果缓存中没有，从数据库获取分类
      const categories = await this.productsService.getCategories();
      const suggestions: SearchSuggestion[] = categories
        .filter(category => category.name.toLowerCase().includes(query))
        .map(category => ({
          text: category.name,
          popularity: category.products?.length || 1,
          highlight: this.highlightText(category.name, query),
        }));

      // 缓存分类建议
      await this.cacheService.set(
        'search',
        'suggestions',
        suggestions,
        'categories',
        { ttl: this.suggestionCacheTTL * 2 }, // 分类缓存时间更长
      );

      return suggestions.slice(0, limit);
    } catch (error) {
      this.logger.error('获取分类建议失败', error);
      return [];
    }
  }

  /**
   * 获取热门搜索建议
   */
  private async getPopularSearchSuggestions(
    query: string,
    limit: number,
  ): Promise<SearchSuggestion[]> {
    try {
      // 尝试从缓存获取热门搜索
      const cachedPopular = await this.cacheService.get<SearchSuggestion[]>(
        'search',
        'suggestions',
        'popular',
      );

      if (cachedPopular) {
        return cachedPopular
          .filter(suggestion => suggestion.text.toLowerCase().includes(query))
          .slice(0, limit);
      }

      // 如果缓存中没有，获取热门产品作为热门搜索建议
      const popularProducts = await this.productsService.findPopular(limit * 2);
      const suggestions: SearchSuggestion[] = popularProducts
        .filter(product => product.name.toLowerCase().includes(query))
        .map(product => ({
          text: product.name,
          category: product.category?.name,
          popularity: product.views || product.sales || 1,
          highlight: this.highlightText(product.name, query),
        }));

      // 缓存热门搜索建议
      await this.cacheService.set(
        'search',
        'suggestions',
        suggestions,
        'popular',
        { ttl: this.suggestionCacheTTL * 3 }, // 热门搜索缓存时间最长
      );

      return suggestions.slice(0, limit);
    } catch (error) {
      this.logger.error('获取热门搜索建议失败', error);
      return [];
    }
  }

  /**
   * 高亮显示匹配的文本
   */
  private highlightText(text: string, query: string): string {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
  }

  /**
   * 去重建议
   */
  private deduplicateSuggestions(suggestions: SearchSuggestion[]): SearchSuggestion[] {
    const seen = new Set<string>();
    return suggestions.filter(suggestion => {
      const key = suggestion.text.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 记录用户搜索行为，用于改进建议
   */
  async recordSearch(query: string, userId?: string, resultCount?: number): Promise<void> {
    try {
      const normalizedQuery = query.toLowerCase().trim();
      const timestamp = new Date().toISOString();

      // 记录搜索到缓存，用于分析
      const searchRecord = {
        query: normalizedQuery,
        userId,
        resultCount,
        timestamp,
      };

      // 使用短期缓存存储搜索记录
      await this.cacheService.set(
        'search',
        'records',
        searchRecord,
        `${timestamp}:${normalizedQuery}:${userId || 'anonymous'}`,
        { ttl: 86400 }, // 24小时
      );

      // 如果搜索结果为空，记录零结果搜索
      if (resultCount === 0) {
        await this.cacheService.set(
          'search',
          'zero_results',
          searchRecord,
          normalizedQuery,
          { ttl: 604800 }, // 7天
        );
      }

      this.logger.debug(`记录搜索行为: ${normalizedQuery}`);
    } catch (error) {
      this.logger.error('记录搜索行为失败', error);
    }
  }

  /**
   * 获取零结果搜索查询，用于优化
   */
  async getZeroResultSearches(limit: number = 50): Promise<string[]> {
    try {
      const zeroResults = await this.cacheService.get<Record<string, any>[]>(
        'search',
        'zero_results',
      );

      if (!zeroResults) {
        return [];
      }

      // 统计零结果搜索的频率
      const frequencyMap: Record<string, number> = {};
      zeroResults.forEach(record => {
        const query = record.query;
        frequencyMap[query] = (frequencyMap[query] || 0) + 1;
      });

      // 按频率排序并返回最常见的零结果搜索
      return Object.entries(frequencyMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([query]) => query);
    } catch (error) {
      this.logger.error('获取零结果搜索失败', error);
      return [];
    }
  }

  /**
   * 清除搜索建议缓存
   */
  async clearCache(): Promise<void> {
    try {
      await this.cacheService.delete('search', 'suggestions');
      this.logger.log('搜索建议缓存已清除');
    } catch (error) {
      this.logger.error('清除搜索建议缓存失败', error);
    }
  }
}
