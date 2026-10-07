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
  /** 查询语义向量（2026-10-07 “智能且快”批）：存在时 Meili 走 hybrid，不支持的引擎自然忽略 */
  queryVector?: number[];
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
  /** 商品语义向量（EmbeddingService 预算，灌索引时随文档存 _vectors） */
  embedding?: number[];
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
