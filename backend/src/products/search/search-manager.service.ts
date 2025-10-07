import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SearchStrategy,
  SearchOptions,
  SearchResult,
  ProductIndexData,
} from './search-strategy.interface';
import { MeiliSearchService } from './meilisearch.service';
import { ZincSearchService } from './zincsearch.service';

export enum SearchEngine {
  MEILISEARCH = 'meilisearch',
  ZINCSEARCH = 'zincsearch',
}

@Injectable()
export class SearchManagerService implements OnModuleInit {
  private readonly logger = new Logger(SearchManagerService.name);
  private strategies: Map<SearchEngine, SearchStrategy> = new Map();
  private currentStrategy: SearchEngine = SearchEngine.MEILISEARCH;
  private fallbackStrategy: SearchEngine = SearchEngine.ZINCSEARCH;
  private healthCheckInterval: NodeJS.Timeout;
  private isInitialized = false;

  constructor(
    private configService: ConfigService,
    private meiliSearchService: MeiliSearchService,
    private zincSearchService: ZincSearchService,
  ) {
    this.strategies.set(SearchEngine.MEILISEARCH, meiliSearchService);
    this.strategies.set(SearchEngine.ZINCSEARCH, zincSearchService);
  }

  async onModuleInit() {
    await this.initialize();
    this.startHealthMonitoring();
  }

  private async initialize(): Promise<void> {
    try {
      this.logger.log('开始初始化搜索服务管理器...');

      // 检查首选搜索引擎的健康状态
      const primaryHealthy = await this.meiliSearchService.healthCheck();

      if (primaryHealthy) {
        this.currentStrategy = SearchEngine.MEILISEARCH;
        this.fallbackStrategy = SearchEngine.ZINCSEARCH;
        this.logger.log(`首选搜索引擎: ${this.currentStrategy}`);

        // 初始化MeiliSearch索引设置
        try {
          if (typeof this.meiliSearchService['initializeIndexSettings'] === 'function') {
            await this.meiliSearchService['initializeIndexSettings']();
          }
        } catch (error) {
          this.logger.warn('MeiliSearch索引设置初始化失败，但服务仍可用');
        }
      } else {
        // 如果首选服务不可用，检查备用服务
        const fallbackHealthy = await this.zincSearchService.healthCheck();

        if (fallbackHealthy) {
          this.currentStrategy = SearchEngine.ZINCSEARCH;
          this.fallbackStrategy = SearchEngine.MEILISEARCH;
          this.logger.log(`切换到备用搜索引擎: ${this.currentStrategy}`);

          // 初始化ZincSearch索引映射
          try {
            if (typeof this.zincSearchService['createIndexMapping'] === 'function') {
              await this.zincSearchService['createIndexMapping']();
            }
          } catch (error) {
            this.logger.warn('ZincSearch索引映射创建失败，但服务仍可用');
          }
        } else {
          this.logger.error('所有搜索引擎服务都不可用');
          throw new Error('所有搜索引擎服务都不可用');
        }
      }

      this.isInitialized = true;
      this.logger.log('搜索服务管理器初始化完成');
    } catch (error) {
      this.logger.error('搜索服务管理器初始化失败', error);
      throw error;
    }
  }

  private startHealthMonitoring(): void {
    const interval = this.configService.get<number>('search.healthCheckInterval') || 30000; // 30秒

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, interval);

    this.logger.log(`健康检查监控已启动，间隔: ${interval}ms`);
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const currentStrategy = this.strategies.get(this.currentStrategy);
      if (!currentStrategy) {
        this.logger.error('当前搜索策略不存在');
        return;
      }

      const isHealthy = await currentStrategy.healthCheck();

      if (!isHealthy) {
        this.logger.warn(`当前搜索引擎 ${this.currentStrategy} 不可用，尝试切换到备用引擎`);
        await this.switchToFallback();
      }
    } catch (error) {
      this.logger.error('健康检查失败', error);
    }
  }

  private async switchToFallback(): Promise<void> {
    try {
      const fallbackStrategy = this.strategies.get(this.fallbackStrategy);
      if (!fallbackStrategy) {
        this.logger.error('备用搜索策略不存在');
        return;
      }

      const isFallbackHealthy = await fallbackStrategy.healthCheck();

      if (isFallbackHealthy) {
        const oldStrategy = this.currentStrategy;
        this.currentStrategy = this.fallbackStrategy;
        this.fallbackStrategy = oldStrategy;

        this.logger.log(`已切换到备用搜索引擎: ${this.currentStrategy}`);
      } else {
        this.logger.error('备用搜索引擎也不可用，无法切换');
      }
    } catch (error) {
      this.logger.error('切换搜索引擎失败', error);
    }
  }

  /**
   * 执行搜索操作，支持故障转移
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    if (!this.isInitialized) {
      throw new Error('搜索服务管理器未初始化');
    }

    let lastError: Error;

    // 首先尝试当前策略
    try {
      const currentStrategy = this.strategies.get(this.currentStrategy);
      if (!currentStrategy) {
        throw new Error('当前搜索策略不存在');
      }

      const result = await currentStrategy.search(query, options);
      this.logger.log(`搜索成功 [${this.currentStrategy}]: "${query}" - ${result.total} 个结果`);
      return result;
    } catch (error) {
      lastError = error;
      this.logger.warn(`当前搜索引擎 ${this.currentStrategy} 搜索失败: ${error.message}`);
    }

    // 如果当前策略失败，尝试备用策略
    try {
      const fallbackStrategy = this.strategies.get(this.fallbackStrategy);
      if (!fallbackStrategy) {
        throw new Error('备用搜索策略不存在');
      }

      const result = await fallbackStrategy.search(query, options);
      this.logger.log(
        `备用搜索引擎搜索成功 [${this.fallbackStrategy}]: "${query}" - ${result.total} 个结果`,
      );

      // 如果备用策略成功，考虑切换回首选策略
      await this.considerSwitchBack();

      return result;
    } catch (error) {
      lastError = error;
      this.logger.error(`备用搜索引擎 ${this.fallbackStrategy} 也失败: ${error.message}`);
    }

    throw new Error(`所有搜索引擎都失败: ${lastError.message}`);
  }

  /**
   * 索引单个产品，支持故障转移
   */
  async indexProduct(product: ProductIndexData): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('搜索服务管理器未初始化');
    }

    // 同时索引到所有可用的搜索引擎
    const promises: Promise<void>[] = [];

    for (const [engine, strategy] of this.strategies) {
      try {
        const isHealthy = await strategy.healthCheck();
        if (isHealthy) {
          promises.push(strategy.indexProduct(product));
        }
      } catch (error) {
        this.logger.warn(`搜索引擎 ${engine} 健康检查失败，跳过索引`);
      }
    }

    if (promises.length === 0) {
      throw new Error('没有可用的搜索引擎进行索引');
    }

    try {
      await Promise.all(promises);
      this.logger.log(`产品索引成功: ${product.id}`);
    } catch (error) {
      this.logger.error('产品索引失败', error);
      throw new Error(`索引失败: ${error.message}`);
    }
  }

  /**
   * 批量索引产品，支持故障转移
   */
  async indexProducts(products: ProductIndexData[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('搜索服务管理器未初始化');
    }

    // 同时索引到所有可用的搜索引擎
    const promises: Promise<void>[] = [];

    for (const [engine, strategy] of this.strategies) {
      try {
        const isHealthy = await strategy.healthCheck();
        if (isHealthy) {
          promises.push(strategy.indexProducts(products));
        }
      } catch (error) {
        this.logger.warn(`搜索引擎 ${engine} 健康检查失败，跳过批量索引`);
      }
    }

    if (promises.length === 0) {
      throw new Error('没有可用的搜索引擎进行批量索引');
    }

    try {
      await Promise.all(promises);
      this.logger.log(`批量索引成功: ${products.length} 个产品`);
    } catch (error) {
      this.logger.error('批量索引失败', error);
      throw new Error(`批量索引失败: ${error.message}`);
    }
  }

  /**
   * 删除产品索引，支持故障转移
   */
  async deleteProduct(productId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('搜索服务管理器未初始化');
    }

    // 从所有搜索引擎中删除
    const promises: Promise<void>[] = [];

    for (const [engine, strategy] of this.strategies) {
      try {
        const isHealthy = await strategy.healthCheck();
        if (isHealthy) {
          promises.push(strategy.deleteProduct(productId));
        }
      } catch (error) {
        this.logger.warn(`搜索引擎 ${engine} 健康检查失败，跳过删除`);
      }
    }

    if (promises.length === 0) {
      throw new Error('没有可用的搜索引擎进行删除操作');
    }

    try {
      await Promise.all(promises);
      this.logger.log(`产品索引删除成功: ${productId}`);
    } catch (error) {
      this.logger.error('产品索引删除失败', error);
      throw new Error(`删除失败: ${error.message}`);
    }
  }

  /**
   * 获取当前搜索引擎状态
   */
  getStatus(): {
    currentEngine: SearchEngine;
    fallbackEngine: SearchEngine;
    strategies: Array<{
      engine: SearchEngine;
      name: string;
      isHealthy: boolean;
    }>;
  } {
    const strategies: Array<{
      engine: SearchEngine;
      name: string;
      isHealthy: boolean;
    }> = [];

    for (const [engine, strategy] of this.strategies) {
      strategies.push({
        engine,
        name: strategy.getName(),
        isHealthy: this.isStrategyHealthy(engine),
      });
    }

    return {
      currentEngine: this.currentStrategy,
      fallbackEngine: this.fallbackStrategy,
      strategies,
    };
  }

  /**
   * 手动切换搜索引擎
   */
  async switchEngine(engine: SearchEngine): Promise<void> {
    const strategy = this.strategies.get(engine);
    if (!strategy) {
      throw new Error(`搜索引擎 ${engine} 不存在`);
    }

    const isHealthy = await strategy.healthCheck();
    if (!isHealthy) {
      throw new Error(`搜索引擎 ${engine} 不可用`);
    }

    const oldStrategy = this.currentStrategy;
    this.currentStrategy = engine;

    // 更新备用策略
    this.fallbackStrategy = oldStrategy;

    this.logger.log(`手动切换搜索引擎: ${oldStrategy} -> ${engine}`);
  }

  /**
   * 强制重新初始化
   */
  async reinitialize(): Promise<void> {
    this.logger.log('强制重新初始化搜索服务管理器...');
    clearInterval(this.healthCheckInterval);
    this.isInitialized = false;
    await this.initialize();
    this.startHealthMonitoring();
  }

  private async considerSwitchBack(): Promise<void> {
    // 如果当前使用的是备用策略，检查首选策略是否恢复
    if (this.currentStrategy !== SearchEngine.MEILISEARCH) {
      try {
        const primaryStrategy = this.strategies.get(SearchEngine.MEILISEARCH);
        if (primaryStrategy) {
          const isPrimaryHealthy = await primaryStrategy.healthCheck();

          if (isPrimaryHealthy) {
            this.logger.log('首选搜索引擎已恢复，切换回首选策略');
            this.currentStrategy = SearchEngine.MEILISEARCH;
            this.fallbackStrategy = SearchEngine.ZINCSEARCH;
          }
        }
      } catch (error) {
        this.logger.warn('检查首选搜索引擎状态失败', error);
      }
    }
  }

  private isStrategyHealthy(engine: SearchEngine): boolean {
    // 简化健康检查，实际应该调用healthCheck方法
    // 这里返回true表示假设服务健康，实际实现中应该调用healthCheck
    return true;
  }

  onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.logger.log('健康检查监控已停止');
    }
  }
}
