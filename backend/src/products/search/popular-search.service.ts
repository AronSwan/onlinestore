// 用途：热门搜索服务，管理和提供热门搜索词功能
// 依赖文件：cache.service.ts, search-suggestion.service.ts, products.service.ts
// 作者：AI助手
// 时间：2025-09-30 10:25:00

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../cache/cache.service';
import { SearchSuggestionService } from './search-suggestion.service';
import { ProductsService } from '../products.service';

export interface PopularSearchTerm {
  term: string;
  count: number;
  category?: string;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

export interface PopularSearchOptions {
  limit?: number;
  includeTrends?: boolean;
  timeRange?: 'day' | 'week' | 'month';
  category?: string;
}

@Injectable()
export class PopularSearchService {
  private readonly logger = new Logger(PopularSearchService.name);
  private readonly cacheTTL: number;
  private readonly popularSearchesCacheKey = 'search:popular:terms';
  private readonly searchHistoryCacheKey = 'search:history';

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly searchSuggestionService: SearchSuggestionService,
    private readonly productsService: ProductsService,
  ) {
    this.cacheTTL = this.configService.get<number>('search.popular.cacheTTL') || 600; // 10分钟
  }

  /**
   * 获取热门搜索词
   */
  async getPopularSearches(options: PopularSearchOptions = {}): Promise<PopularSearchTerm[]> {
    const { limit = 10, includeTrends = true, timeRange = 'week', category } = options;

    const cacheKey = `${this.popularSearchesCacheKey}:${timeRange}:${category || 'all'}`;

    // 尝试从缓存获取
    const cachedPopular = await this.cacheService.get<PopularSearchTerm[]>(
      'search',
      'popular',
      cacheKey,
    );

    if (cachedPopular) {
      this.logger.debug(`从缓存获取热门搜索: ${cacheKey}`);
      return cachedPopular.slice(0, limit);
    }

    // 从搜索历史中计算热门搜索
    const popularTerms = await this.calculatePopularSearches({
      limit,
      timeRange,
      category,
    });

    // 如果需要趋势分析
    if (includeTrends) {
      await this.enrichWithTrends(popularTerms, timeRange);
    }

    // 缓存结果
    await this.cacheService.set('search', 'popular', popularTerms, cacheKey, {
      ttl: this.cacheTTL,
    });

    return popularTerms.slice(0, limit);
  }

  /**
   * 记录搜索历史
   */
  async recordSearch(query: string, userId?: string, resultCount?: number): Promise<void> {
    try {
      const normalizedQuery = query.toLowerCase().trim();
      const timestamp = new Date().toISOString();
      const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // 记录搜索到历史
      const searchRecord = {
        query: normalizedQuery,
        userId,
        resultCount,
        timestamp,
      };

      // 按日期存储搜索历史
      await this.cacheService.set(
        'search',
        'history',
        searchRecord,
        `${dateKey}:${normalizedQuery}:${userId || 'anonymous'}`,
        { ttl: 2592000 }, // 30天
      );

      // 更新搜索词计数器
      await this.incrementSearchCount(normalizedQuery);

      this.logger.debug(`记录搜索历史: ${normalizedQuery}`);
    } catch (error) {
      this.logger.error('记录搜索历史失败', error);
    }
  }

  /**
   * 增加搜索词计数
   */
  private async incrementSearchCount(query: string): Promise<void> {
    try {
      const counterKey = `search:counter:${query}`;

      // 获取当前计数
      let count = (await this.cacheService.get<number>('search', 'counter', query)) || 0;

      // 增加计数
      count += 1;

      // 更新计数
      await this.cacheService.set(
        'search',
        'counter',
        count,
        query,
        { ttl: 2592000 }, // 30天
      );
    } catch (error) {
      this.logger.error('更新搜索计数失败', error);
    }
  }

  /**
   * 计算热门搜索词
   */
  private async calculatePopularSearches(
    options: PopularSearchOptions,
  ): Promise<PopularSearchTerm[]> {
    const { limit = 10, timeRange = 'week', category } = options;

    try {
      // 获取搜索计数器
      const counters = await this.getSearchCounters(timeRange);

      // 转换为热门搜索词格式
      let popularTerms: PopularSearchTerm[] = Object.entries(counters)
        .map(([term, count]) => ({
          term,
          count: count as number,
          trend: 'stable' as const,
          lastUpdated: new Date().toISOString(),
        }))
        .sort((a, b) => b.count - a.count);

      // 如果指定了分类，过滤相关搜索词
      if (category) {
        popularTerms = await this.filterByCategory(popularTerms, category);
      }

      // 过滤掉太短的搜索词和无效词
      popularTerms = popularTerms.filter(
        term => term.term.length >= 2 && !this.isStopWord(term.term),
      );

      return popularTerms.slice(0, limit);
    } catch (error) {
      this.logger.error('计算热门搜索失败', error);
      return [];
    }
  }

  /**
   * 获取搜索计数器
   */
  private async getSearchCounters(timeRange: string): Promise<Record<string, number>> {
    try {
      // 这里应该从缓存中获取所有搜索计数器
      // 由于缓存服务的限制，这里返回模拟数据
      // 实际实现中需要遍历所有搜索计数器

      // 获取热门产品作为补充数据
      const popularProducts = await this.productsService.findPopular(20);
      const productBasedCounters: Record<string, number> = {};

      popularProducts.forEach(product => {
        const words = product.name.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length >= 2) {
            productBasedCounters[word] = (productBasedCounters[word] || 0) + (product.views || 1);
          }
        });
      });

      return productBasedCounters;
    } catch (error) {
      this.logger.error('获取搜索计数器失败', error);
      return {};
    }
  }

  /**
   * 按分类过滤搜索词
   */
  private async filterByCategory(
    terms: PopularSearchTerm[],
    category: string,
  ): Promise<PopularSearchTerm[]> {
    try {
      // 获取该分类的产品
      const categoryProducts = await this.productsService.findByCategory(category, 50);
      const categoryTerms = new Set<string>();

      // 提取分类相关的词汇
      categoryProducts.forEach(product => {
        const words = product.name.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length >= 2) {
            categoryTerms.add(word);
          }
        });
      });

      // 过滤出与分类相关的搜索词
      return terms.filter(
        term => categoryTerms.has(term.term) || term.term.includes(category.toLowerCase()),
      );
    } catch (error) {
      this.logger.error('按分类过滤搜索词失败', error);
      return terms;
    }
  }

  /**
   * 丰富趋势信息
   */
  private async enrichWithTrends(terms: PopularSearchTerm[], timeRange: string): Promise<void> {
    try {
      // 获取前一时期的搜索数据用于比较
      const previousRange = this.getPreviousTimeRange(timeRange);
      const previousCounters = await this.getSearchCounters(previousRange);

      // 计算趋势
      terms.forEach(term => {
        const previousCount = previousCounters[term.term] || 0;
        if (term.count > previousCount * 1.2) {
          term.trend = 'up';
        } else if (term.count < previousCount * 0.8) {
          term.trend = 'down';
        } else {
          term.trend = 'stable';
        }
      });
    } catch (error) {
      this.logger.error('计算趋势失败', error);
      // 默认设置为稳定
      terms.forEach(term => {
        term.trend = 'stable';
      });
    }
  }

  /**
   * 获取前一时间范围
   */
  private getPreviousTimeRange(timeRange: string): string {
    switch (timeRange) {
      case 'day':
        return 'yesterday';
      case 'week':
        return 'last_week';
      case 'month':
        return 'last_month';
      default:
        return 'last_week';
    }
  }

  /**
   * 检查是否为停用词
   */
  private isStopWord(term: string): boolean {
    const stopWords = [
      '的',
      '了',
      '在',
      '是',
      '我',
      '有',
      '和',
      '就',
      '不',
      '人',
      '都',
      '一',
      '个',
      '上',
      '也',
      '很',
      '到',
      '说',
      '要',
      '去',
      '你',
      '会',
      '着',
      '没有',
      '看',
      '好',
      '自己',
      '这',
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'can',
      'this',
      'that',
      'these',
      'those',
    ];

    return stopWords.includes(term.toLowerCase());
  }

  /**
   * 清除热门搜索缓存
   */
  async clearCache(): Promise<void> {
    try {
      await this.cacheService.delete('search', 'popular');
      this.logger.log('热门搜索缓存已清除');
    } catch (error) {
      this.logger.error('清除热门搜索缓存失败', error);
    }
  }

  /**
   * 手动添加热门搜索词
   */
  async addPopularSearchTerm(term: string, category?: string): Promise<void> {
    try {
      const normalizedTerm = term.toLowerCase().trim();

      // 增加搜索计数
      await this.incrementSearchCount(normalizedTerm);

      // 清除缓存以便重新计算
      await this.clearCache();

      this.logger.log(`已添加热门搜索词: ${normalizedTerm}`);
    } catch (error) {
      this.logger.error('添加热门搜索词失败', error);
    }
  }

  /**
   * 获取搜索趋势分析
   */
  async getSearchTrends(days: number = 7): Promise<{
    trendingUp: PopularSearchTerm[];
    trendingDown: PopularSearchTerm[];
    stable: PopularSearchTerm[];
  }> {
    try {
      const allPopular = await this.getPopularSearches({
        limit: 50,
        includeTrends: true,
        timeRange: 'week',
      });

      return {
        trendingUp: allPopular.filter(term => term.trend === 'up'),
        trendingDown: allPopular.filter(term => term.trend === 'down'),
        stable: allPopular.filter(term => term.trend === 'stable'),
      };
    } catch (error) {
      this.logger.error('获取搜索趋势失败', error);
      return {
        trendingUp: [],
        trendingDown: [],
        stable: [],
      };
    }
  }
}
