export interface SearchStrategy {
    search(query: string, options?: SearchOptions): Promise<SearchResult>;
    indexProduct(product: ProductIndexData): Promise<void>;
    indexProducts(products: ProductIndexData[]): Promise<void>;
    deleteProduct(productId: string): Promise<void>;
    healthCheck(): Promise<boolean>;
    getName(): string;
}
export interface SearchOptions {
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
