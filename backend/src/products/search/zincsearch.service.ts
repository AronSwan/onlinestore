import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SearchStrategy,
  SearchOptions,
  SearchResult,
  ProductIndexData,
  ProductHit,
} from './search-strategy.interface';

@Injectable()
export class ZincSearchService implements SearchStrategy {
  private readonly logger = new Logger(ZincSearchService.name);
  private baseUrl: string;
  private indexName = 'products';
  private username: string;
  private password: string;
  private isConnected = false;

  constructor(private configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      this.baseUrl =
        this.configService.get<string>('search.zincsearch.host') || 'http://localhost:4080';
      this.username = this.configService.get<string>('search.zincsearch.username') || 'admin';
      this.password =
        this.configService.get<string>('search.zincsearch.password') || 'Complexpass#123';

      this.logger.log(`ZincSearch客户端初始化成功: ${this.baseUrl}`);
      this.isConnected = true;
    } catch (error) {
      this.logger.error('ZincSearch客户端初始化失败', error);
      this.isConnected = false;
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    // SSRF防护：验证URL只允许连接到配置的ZincSearch服务
    const url = `${this.baseUrl}${endpoint}`;

    // 验证URL是否指向配置的服务器
    if (!this.isValidUrl(url)) {
      throw new Error('SSRF防护：不允许访问外部服务器');
    }

    const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');

    const defaultOptions: RequestInit = {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, { ...defaultOptions, ...options });

    if (!response.ok) {
      throw new Error(`ZincSearch请求失败: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * SSRF防护：验证URL是否只允许访问配置的服务器
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);

      // 只允许访问配置的ZincSearch服务器
      const allowedHost = this.baseUrl.replace('http://', '').replace('https://', '').split('/')[0];
      const requestHost = urlObj.hostname;

      // 检查主机名是否匹配
      if (requestHost !== allowedHost) {
        this.logger.warn(`SSRF防护阻止了到 ${requestHost} 的请求，只允许访问 ${allowedHost}`);
        return false;
      }

      // 检查是否使用HTTPS（生产环境）
      if (process.env.NODE_ENV === 'production' && urlObj.protocol !== 'https:') {
        this.logger.warn('生产环境要求使用HTTPS');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('URL验证失败', error);
      return false;
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    if (!this.isConnected) {
      throw new Error('ZincSearch服务未连接');
    }

    try {
      const searchBody: any = {
        search_type: 'match',
        query: {
          term: query,
        },
        from: options.offset || 0,
        max_results: options.limit || 20,
        _source: ['id', 'name', 'description', 'price', 'category', 'tags', 'stock', 'isActive'],
      };

      if (options.filters) {
        searchBody.query = this.buildQueryWithFilters(query, options.filters);
      }

      if (options.sortBy) {
        searchBody.sort_fields = [`-${options.sortBy}`];
        if (options.sortOrder === 'asc') {
          searchBody.sort_fields = [`${options.sortBy}`];
        }
      }

      const response = await this.makeRequest(`/api/${this.indexName}/_search`, {
        method: 'POST',
        body: JSON.stringify(searchBody),
      });

      return {
        hits: response.hits.hits.map((hit: any) => this.transformHit(hit)),
        total: response.hits.total.value,
        processingTimeMs: response.took,
        query,
      };
    } catch (error) {
      this.logger.error('ZincSearch搜索失败', error);
      throw new Error(`搜索失败: ${error.message}`);
    }
  }

  async indexProduct(product: ProductIndexData): Promise<void> {
    if (!this.isConnected) {
      throw new Error('ZincSearch服务未连接');
    }

    try {
      await this.makeRequest(`/api/${this.indexName}/_doc/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify(this.transformProductForIndexing(product)),
      });
      this.logger.log(`产品索引成功: ${product.id}`);
    } catch (error) {
      this.logger.error('产品索引失败', error);
      throw new Error(`索引失败: ${error.message}`);
    }
  }

  async indexProducts(products: ProductIndexData[]): Promise<void> {
    if (!this.isConnected) {
      throw new Error('ZincSearch服务未连接');
    }

    try {
      // ZincSearch支持批量索引
      const bulkData = products.map(product => ({
        index: { _index: this.indexName, _id: product.id },
        ...this.transformProductForIndexing(product),
      }));

      const bulkBody = bulkData.map(item => JSON.stringify(item)).join('\n') + '\n';

      await this.makeRequest('/api/_bulk', {
        method: 'POST',
        body: bulkBody,
        headers: {
          'Content-Type': 'application/x-ndjson',
        },
      });

      this.logger.log(`批量索引成功: ${products.length}个产品`);
    } catch (error) {
      this.logger.error('批量索引失败', error);
      throw new Error(`批量索引失败: ${error.message}`);
    }
  }

  async deleteProduct(productId: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('ZincSearch服务未连接');
    }

    try {
      await this.makeRequest(`/api/${this.indexName}/_doc/${productId}`, {
        method: 'DELETE',
      });
      this.logger.log(`产品索引删除成功: ${productId}`);
    } catch (error) {
      this.logger.error('产品索引删除失败', error);
      throw new Error(`删除失败: ${error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.baseUrl) {
      return false;
    }

    try {
      await this.makeRequest('/api/health', { method: 'GET' });
      this.isConnected = true;
      return true;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }

  getName(): string {
    return 'ZincSearch';
  }

  private buildQueryWithFilters(query: string, filters: Record<string, any>): any {
    const mustClauses: any[] = [
      {
        match: {
          query: query,
        },
      },
    ];

    const filterClauses: any[] = [];

    if (filters.categoryId) {
      filterClauses.push({
        term: {
          categoryId: filters.categoryId,
        },
      });
    }

    if (filters.minPrice !== undefined) {
      filterClauses.push({
        range: {
          price: {
            gte: filters.minPrice,
          },
        },
      });
    }

    if (filters.maxPrice !== undefined) {
      filterClauses.push({
        range: {
          price: {
            lte: filters.maxPrice,
          },
        },
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      filterClauses.push({
        terms: {
          tags: filters.tags,
        },
      });
    }

    if (filters.inStock) {
      filterClauses.push({
        range: {
          stock: {
            gt: 0,
          },
        },
      });
    }

    if (filters.isActive !== undefined) {
      filterClauses.push({
        term: {
          isActive: filters.isActive,
        },
      });
    }

    return {
      bool: {
        must: mustClauses,
        filter: filterClauses,
      },
    };
  }

  private transformHit(hit: any): ProductHit {
    return {
      id: hit._id,
      name: hit._source.name,
      description: hit._source.description,
      price: hit._source.price,
      category: hit._source.category,
      tags: hit._source.tags || [],
      score: hit._score || 0,
    };
  }

  private transformProductForIndexing(product: ProductIndexData): any {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      originalPrice: product.originalPrice,
      category: product.category,
      categoryId: product.categoryId,
      tags: product.tags,
      stock: product.stock,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      specifications: product.specifications,
    };
  }

  /**
   * 创建索引映射
   */
  async createIndexMapping(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('ZincSearch服务未连接');
    }

    try {
      const mapping = {
        name: this.indexName,
        storage_type: 'disk',
        mappings: {
          properties: {
            id: { type: 'text' },
            name: { type: 'text', analyzer: 'standard' },
            description: { type: 'text', analyzer: 'standard' },
            price: { type: 'numeric' },
            originalPrice: { type: 'numeric' },
            category: { type: 'text' },
            categoryId: { type: 'numeric' },
            tags: { type: 'keyword' },
            stock: { type: 'numeric' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
            specifications: { type: 'object' },
          },
        },
      };

      await this.makeRequest(`/api/index`, {
        method: 'POST',
        body: JSON.stringify(mapping),
      });

      this.logger.log('ZincSearch索引映射创建成功');
    } catch (error) {
      this.logger.error('索引映射创建失败', error);
      throw error;
    }
  }
}
