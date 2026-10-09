import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { MonitoringService } from '../monitoring/monitoring.service';
import { ProductEventsService } from '../messaging/product-events.service';
import { SearchManagerService } from './search/search-manager.service';
import { EmbeddingService } from './search/embedding.service';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { ProductImage } from './entities/product-image.entity';
export interface CreateProductData {
    name: string;
    description: string;
    price: number;
    originalPrice?: number | null;
    stock: number;
    categoryId?: number;
    mainImage?: string;
    tags?: string[];
    specifications?: Record<string, any>;
}
export interface UpdateProductData {
    name?: string;
    description?: string;
    price?: number;
    originalPrice?: number | null;
    stock?: number;
    categoryId?: number;
    mainImage?: string;
    tags?: string[];
    specifications?: Record<string, any>;
    isActive?: boolean;
}
export interface ProductSearchOptions {
    keyword?: string;
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    tags?: string[];
    inStock?: boolean;
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'price' | 'sales' | 'createdAt';
    sortOrder?: 'ASC' | 'DESC';
}
export declare class ProductsService {
    private readonly productRepository;
    private readonly categoryRepository;
    private readonly productImageRepository;
    private cacheManager;
    private readonly configService;
    private readonly monitoring;
    private readonly productEventsService;
    private readonly searchManager;
    private readonly embeddingService;
    constructor(productRepository: Repository<Product>, categoryRepository: Repository<Category>, productImageRepository: Repository<ProductImage>, cacheManager: Cache, configService: ConfigService, monitoring: MonitoringService, productEventsService: ProductEventsService, searchManager: SearchManagerService, embeddingService: EmbeddingService);
    private cacheHits;
    private cacheMisses;
    private listCacheKeys;
    private popularCacheKeys;
    private logCache;
    private cacheTtlMs;
    private assertSpecificationsWithinLimit;
    private invalidateListCache;
    create(productData: CreateProductData): Promise<Product>;
    findById(id: number): Promise<Product | null>;
    search(options: ProductSearchOptions): Promise<{
        products: Product[];
        total: number;
    }>;
    private databaseSearch;
    getPopularProducts(limit?: number): Promise<Product[]>;
    update(id: number, updateData: UpdateProductData): Promise<Product>;
    delete(id: number): Promise<void>;
    incrementViews(id: number): Promise<void>;
    getStatistics(): Promise<{
        totalProducts: number;
        activeProducts: number;
        outOfStockProducts: number;
        totalSales: number;
    }>;
    findAll(options?: {
        page?: number;
        limit?: number;
        search?: string;
        includeInactive?: boolean;
    }): Promise<{
        products: Product[];
        total: number;
    }>;
    findPopular(limit?: number): Promise<Product[]>;
    findOne(id: number): Promise<Product>;
    remove(id: number): Promise<void>;
    recordView(id: number): Promise<void>;
    private publishProductCreatedEvent;
    private publishProductUpdatedEvent;
    private publishProductViewedEvent;
    private publishInventoryUpdatedEvent;
    private indexProductToSearch;
    private deleteProductFromSearch;
    findByCategory(category: string, limit?: number): Promise<Product[]>;
    getCategories(): Promise<Category[]>;
}
