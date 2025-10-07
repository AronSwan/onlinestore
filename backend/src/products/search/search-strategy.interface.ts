// 搜索策略接口定义
export interface SearchStrategy {
  /**
   * 搜索产品
   */
  search(query: string, options?: SearchOptions): Promise<SearchResult>;

  /**
   * 索引产品
   */
  indexProduct(product: ProductIndexData): Promise<void>;

  /**
   * 批量索引产品
   */
  indexProducts(products: ProductIndexData[]): Promise<void>;

  /**
   * 删除产品索引
   */
  deleteProduct(productId: string): Promise<void>;

  /**
   * 检查服务健康状态
   */
  healthCheck(): Promise<boolean>;

  /**
   * 获取服务名称
   */
  getName(): string;
}

export interface SearchOptions {
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  offset?: number;
  facets?: string[];
}

export interface SearchResult {
  hits: ProductHit[];
  total: number;
  processingTimeMs: number;
  query: string;
  facets?: Record<string, any>;
}

export interface ProductHit {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  score: number;
  highlight?: Record<string, string[]>;
}

export interface ProductIndexData {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  categoryId: number;
  tags: string[];
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  specifications?: Record<string, any>;
}
