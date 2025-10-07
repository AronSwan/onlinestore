import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  SearchStrategy,
  SearchOptions,
  SearchResult,
  ProductIndexData,
  ProductHit,
} from './search-strategy.interface';

interface MeiliSearchResponse {
  hits: any[];
  estimatedTotalHits?: number;
  totalHits?: number;
  processingTimeMs: number;
  facetDistribution?: Record<string, any>;
}

@Injectable()
export class MeiliSearchService implements SearchStrategy {
  private readonly logger = new Logger(MeiliSearchService.name);
  private baseUrl: string;
  private apiKey: string;
  private indexName = 'products';
  private isConnected = false;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      this.baseUrl =
        this.configService.get<string>('search.meilisearch.host') || 'http://localhost:7700';
      this.apiKey = this.configService.get<string>('search.meilisearch.apiKey') || 'masterKey';

      this.logger.log(`MeiliSearch客户端初始化成功: ${this.baseUrl}`);
      this.isConnected = true;
    } catch (error) {
      this.logger.error('MeiliSearch客户端初始化失败', error);
      this.isConnected = false;
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    if (!this.isConnected) {
      throw new Error('MeiliSearch服务未连接');
    }

    try {
      const url = `${this.baseUrl}/indexes/${this.indexName}/search`;
      const headers = {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      };

      const searchOptions: any = {
        q: query,
        limit: options.limit || 20,
        offset: options.offset || 0,
      };

      if (options.filters) {
        searchOptions.filter = this.buildFilters(options.filters);
      }

      if (options.sortBy) {
        searchOptions.sort = [`${options.sortBy}:${options.sortOrder || 'asc'}`];
      }

      const response = await firstValueFrom(
        this.httpService.post<MeiliSearchResponse>(url, searchOptions, { headers }),
      );

      return {
        hits: response.data.hits.map((hit: Record<string, any>) => this.transformHit(hit)),
        total: response.data.estimatedTotalHits || response.data.totalHits || 0,
        processingTimeMs: response.data.processingTimeMs,
        query,
        facets: response.data.facetDistribution,
      };
    } catch (error) {
      this.logger.error('MeiliSearch搜索失败', error);
      throw new Error(`搜索失败: ${error.message}`);
    }
  }

  async indexProduct(product: ProductIndexData): Promise<void> {
    if (!this.isConnected) {
      throw new Error('MeiliSearch服务未连接');
    }

    try {
      const url = `${this.baseUrl}/indexes/${this.indexName}/documents`;
      const headers = {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      };

      const document = this.transformProductForIndexing(product);

      await firstValueFrom(this.httpService.post(url, [document], { headers }));

      this.logger.log(`产品索引成功: ${product.id}`);
    } catch (error) {
      this.logger.error('产品索引失败', error);
      throw new Error(`索引失败: ${error.message}`);
    }
  }

  async indexProducts(products: ProductIndexData[]): Promise<void> {
    if (!this.isConnected) {
      throw new Error('MeiliSearch服务未连接');
    }

    try {
      const url = `${this.baseUrl}/indexes/${this.indexName}/documents`;
      const headers = {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      };

      const documents = products.map(product => this.transformProductForIndexing(product));

      await firstValueFrom(this.httpService.post(url, documents, { headers }));

      this.logger.log(`批量索引成功: ${products.length}个产品`);
    } catch (error) {
      this.logger.error('批量索引失败', error);
      throw new Error(`批量索引失败: ${error.message}`);
    }
  }

  async deleteProduct(productId: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('MeiliSearch服务未连接');
    }

    try {
      const url = `${this.baseUrl}/indexes/${this.indexName}/documents/${productId}`;
      const headers = {
        Authorization: `Bearer ${this.apiKey}`,
      };

      await firstValueFrom(this.httpService.delete(url, { headers }));

      this.logger.log(`产品索引删除成功: ${productId}`);
    } catch (error) {
      this.logger.error('产品索引删除失败', error);
      throw new Error(`删除失败: ${error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const url = `${this.baseUrl}/health`;
      const response = await firstValueFrom(this.httpService.get(url));

      this.isConnected = response.data.status === 'available';
      return this.isConnected;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }

  getName(): string {
    return 'MeiliSearch';
  }

  private buildFilters(filters: Record<string, any>): string {
    const filterParts: string[] = [];

    if (filters.categoryId) {
      filterParts.push(`categoryId = ${filters.categoryId}`);
    }

    if (filters.minPrice !== undefined) {
      filterParts.push(`price >= ${filters.minPrice}`);
    }

    if (filters.maxPrice !== undefined) {
      filterParts.push(`price <= ${filters.maxPrice}`);
    }

    if (filters.tags && filters.tags.length > 0) {
      const tagFilters = filters.tags.map((tag: string) => `tags = "${tag}"`).join(' OR ');
      filterParts.push(`(${tagFilters})`);
    }

    if (filters.inStock) {
      filterParts.push('stock > 0');
    }

    if (filters.isActive !== undefined) {
      filterParts.push(`isActive = ${filters.isActive}`);
    }

    return filterParts.join(' AND ');
  }

  private transformHit(hit: Record<string, any>): ProductHit {
    return {
      id: hit.id,
      name: hit.name,
      description: hit.description,
      price: hit.price,
      category: hit.category,
      tags: hit.tags || [],
      score: hit._score || 0,
      highlight: hit._formatted,
    };
  }

  private transformProductForIndexing(product: ProductIndexData): Record<string, any> {
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
   * 初始化索引设置
   */
  async initializeIndexSettings(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('MeiliSearch服务未连接');
    }

    try {
      // 设置搜索属性
      await this.updateSearchableAttributes(['name', 'description', 'tags', 'category']);

      // 设置过滤属性
      await this.updateFilterableAttributes(['categoryId', 'price', 'tags', 'stock', 'isActive']);

      // 设置排序属性
      await this.updateSortableAttributes(['price', 'createdAt', 'updatedAt']);

      this.logger.log('MeiliSearch索引设置初始化成功');
    } catch (error) {
      this.logger.error('索引设置初始化失败', error);
      throw error;
    }
  }

  private async updateSearchableAttributes(attributes: string[]): Promise<void> {
    const url = `${this.baseUrl}/indexes/${this.indexName}/settings/searchable-attributes`;
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    await firstValueFrom(this.httpService.put(url, attributes, { headers }));
  }

  private async updateFilterableAttributes(attributes: string[]): Promise<void> {
    const url = `${this.baseUrl}/indexes/${this.indexName}/settings/filterable-attributes`;
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    await firstValueFrom(this.httpService.put(url, attributes, { headers }));
  }

  private async updateSortableAttributes(attributes: string[]): Promise<void> {
    const url = `${this.baseUrl}/indexes/${this.indexName}/settings/sortable-attributes`;
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    await firstValueFrom(this.httpService.put(url, attributes, { headers }));
  }
}
