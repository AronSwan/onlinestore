/**
 * MeiliSearch 前端客户端
 * 提供搜索功能给前端使用
 */

import { MeiliSearch } from '@meilisearch/browser';

class MeiliSearchClient {
  constructor() {
    this.client = new MeiliSearch({
      host: 'http://localhost:7700',
      apiKey: 'masterKey'
    });
    this.index = this.client.index('products');
  }

  /**
   * 基本搜索
   */
  async search(query, options = {}) {
    try {
      const searchParams = {
        q: query,
        limit: options.limit || 10,
        offset: options.offset || 0,
        attributesToRetrieve: ['id', 'name', 'description', 'price', 'category', 'image'],
        attributesToHighlight: ['name', 'description'],
        ...options
      };

      const response = await this.index.search(searchParams.q, searchParams);
      return this.formatSearchResponse(response);
    } catch (error) {
      console.error('搜索失败:', error);
      return { hits: [], totalHits: 0, query };
    }
  }

  /**
   * 分类过滤搜索
   */
  async searchByCategory(category, query = '', options = {}) {
    try {
      const filter = `category = "${category}"`;
      const searchParams = {
        q: query,
        filter: filter,
        limit: options.limit || 10,
        attributesToRetrieve: ['id', 'name', 'description', 'price', 'category', 'image'],
        ...options
      };

      const response = await this.index.search(searchParams.q, searchParams);
      return this.formatSearchResponse(response);
    } catch (error) {
      console.error('分类搜索失败:', error);
      return { hits: [], totalHits: 0, query, category };
    }
  }

  /**
   * 价格范围搜索
   */
  async searchByPriceRange(minPrice, maxPrice, query = '', options = {}) {
    try {
      const filter = `price >= ${minPrice} AND price <= ${maxPrice}`;
      const searchParams = {
        q: query,
        filter: filter,
        sort: ['price:asc'],
        limit: options.limit || 10,
        attributesToRetrieve: ['id', 'name', 'description', 'price', 'category', 'image'],
        ...options
      };

      const response = await this.index.search(searchParams.q, searchParams);
      return this.formatSearchResponse(response);
    } catch (error) {
      console.error('价格搜索失败:', error);
      return { hits: [], totalHits: 0, query, priceRange: { min: minPrice, max: maxPrice } };
    }
  }

  /**
   * 获取搜索建议
   */
  async getSearchSuggestions(query, limit = 5) {
    try {
      const response = await this.index.search(query, {
        limit: limit,
        attributesToRetrieve: ['name'],
        sort: ['frequency:desc']
      });

      return response.hits.map(hit => hit.name);
    } catch (error) {
      console.error('获取搜索建议失败:', error);
      return [];
    }
  }

  /**
   * 获取热门搜索
   */
  async getPopularSearches(limit = 10) {
    try {
      // 这里假设有一个专门的索引存储热门搜索
      // 或者通过查询统计信息来实现
      const response = await this.index.search('', {
        limit: limit,
        sort: ['hits:desc']
      });

      return response.hits.map(hit => ({
        term: hit.name,
        count: hit.hits || 0
      }));
    } catch (error) {
      console.error('获取热门搜索失败:', error);
      return [];
    }
  }

  /**
   * 获取分类列表
   */
  async getCategories() {
    try {
      // 使用聚合查询获取分类
      const response = await this.index.search('', {
        facets: ['category'],
        limit: 0
      });

      return response.facets.category || [];
    } catch (error) {
      console.error('获取分类列表失败:', error);
      return [];
    }
  }

  /**
   * 格式化搜索响应
   */
  formatSearchResponse(response) {
    return {
      hits: response.hits.map(hit => ({
        id: hit.id,
        name: hit.name,
        description: hit.description,
        price: hit.price,
        originalPrice: hit.originalPrice,
        category: hit.category,
        image: hit.image || '/images/default-product.png',
        highlights: hit._formatted || {},
        url: `/products/${hit.id}`
      })),
      totalHits: response.totalHits,
      query: response.query,
      processingTimeMs: response.processingTimeMs
    };
  }

  /**
   * 搜索结果分页
   */
  async searchWithPagination(query, page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;
    const response = await this.search(query, { limit: pageSize, offset });
    
    return {
      ...response,
      pagination: {
        currentPage: page,
        pageSize: pageSize,
        totalPages: Math.ceil(response.totalHits / pageSize),
        hasNext: offset + pageSize < response.totalHits,
        hasPrev: page > 1
      }
    };
  }

  /**
   * 实时搜索（防抖处理）
   */
  debounceSearch(func, delay = 300) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * 搜索结果缓存
   */
  searchCache = new Map();
  
  async cachedSearch(query, options = {}) {
    const cacheKey = JSON.stringify({ query, options });
    
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey);
    }

    const result = await this.search(query, options);
    this.searchCache.set(cacheKey, result);
    
    // 设置缓存过期时间（5分钟）
    setTimeout(() => {
      this.searchCache.delete(cacheKey);
    }, 5 * 60 * 1000);

    return result;
  }
}

// 创建全局实例
const meilisearchClient = new MeiliSearchClient();

export default meilisearchClient;
