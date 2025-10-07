// 用途：产品服务，处理商品相关的业务逻辑
// 依赖文件：product.entity.ts, category.entity.ts, product-image.entity.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:23:30

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, In, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { MonitoringService } from '../monitoring/monitoring.service';
import { ProductEventsService } from '../messaging/product-events.service';
import { SearchManagerService } from './search/search-manager.service';
import { ProductIndexData } from './search/search-strategy.interface';

import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { ProductImage } from './entities/product-image.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

export interface CreateProductData {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  stock: number;
  categoryId: number;
  mainImage?: string;
  tags?: string[];
  specifications?: Record<string, any>;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number;
  originalPrice?: number;
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

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly monitoring: MonitoringService,
    private readonly productEventsService: ProductEventsService,
    private readonly searchManager: SearchManagerService,
  ) {}

  // 缓存观测与列表键索引
  private cacheHits = 0;
  private cacheMisses = 0;
  private listCacheKeys = new Set<string>();
  private popularCacheKeys = new Set<string>();

  private logCache(event: 'hit' | 'miss', key: string) {
    if (event === 'hit') this.cacheHits++;
    else this.cacheMisses++;
    console.log('[cache]', { key, event, hits: this.cacheHits, misses: this.cacheMisses });
  }

  private async invalidateListCache() {
    const keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';

    // 清除所有产品列表相关缓存
    const patterns = [
      `${keyPrefix}:products:list:*`,
      `${keyPrefix}:popular:products:*`,
      `${keyPrefix}:search:products:*`,
    ];

    for (const pattern of patterns) {
      try {
        // 使用更可靠的缓存键管理策略
        const keysToDelete = [];

        // 首先清除已知的缓存键
        for (const key of this.listCacheKeys) {
          if (key.startsWith(pattern.replace('*', ''))) {
            keysToDelete.push(key);
          }
        }

        for (const key of this.popularCacheKeys) {
          if (key.startsWith(pattern.replace('*', ''))) {
            keysToDelete.push(key);
          }
        }

        // 批量删除缓存键
        for (const key of keysToDelete) {
          try {
            await this.cacheManager.del(key);
          } catch (e) {
            console.warn('删除缓存键失败', { key, error: (e as Error).message });
          }
        }
      } catch (e) {
        console.warn('清除缓存模式失败', { pattern, error: (e as Error).message });
      }
    }

    // 清空缓存键集合
    this.listCacheKeys.clear();
    this.popularCacheKeys.clear();
  }

  /**
   * 创建产品
   */
  async create(productData: CreateProductData): Promise<Product> {
    const category = await this.categoryRepository.findOne({
      where: { id: productData.categoryId },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    const product = this.productRepository.create({
      ...productData,
      category,
      publishedAt: new Date(),
    });

    const saved = await this.productRepository.save(product);

    // 写操作后失效相关缓存
    const keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';

    // 清除产品详情缓存
    try {
      await this.cacheManager.del(`${keyPrefix}:product:${saved.id}`);
    } catch (e) {}

    // 清除热门产品缓存
    for (const key of this.popularCacheKeys) {
      try {
        await this.cacheManager.del(key);
      } catch (e) {}
    }

    // 清除所有列表缓存
    await this.invalidateListCache();

    // 异步发布产品创建事件
    this.publishProductCreatedEvent(saved).catch((error: Error) => {
      console.error('发布产品创建事件失败:', error);
    });

    // 异步索引产品到搜索引擎
    this.indexProductToSearch(saved).catch((error: Error) => {
      console.error('产品搜索索引失败:', error);
    });

    return saved;
  }

  /**
   * 根据ID查找产品
   */
  async findById(id: number): Promise<Product | null> {
    const keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';
    const cacheKey = `${keyPrefix}:product:${id}`;

    // 尝试从缓存获取，如果失败则继续到数据库查询
    let cached: Product | undefined = undefined;
    try {
      const startGet = process.hrtime.bigint();
      cached = await this.cacheManager.get<Product>(cacheKey);
      const endGet = process.hrtime.bigint();
      this.monitoring.observeRedisDuration('get', Number(endGet - startGet) / 1_000_000_000);

      if (cached) {
        this.logCache('hit', cacheKey);
        this.monitoring.recordCacheHit(cacheKey);
        return cached;
      }
    } catch (error) {
      console.error('缓存获取失败:', error);
      // 继续到数据库查询
    }

    this.logCache('miss', cacheKey);
    this.monitoring.recordCacheMiss(cacheKey);

    const startDb = process.hrtime.bigint();
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'images'],
    });
    const endDb = process.hrtime.bigint();
    this.monitoring.observeDbQuery('detail', 'products', Number(endDb - startDb) / 1_000_000_000);

    if (product) {
      const ttl = this.configService.get<number>('performance.cache.ttl.detail') || 300;
      try {
        const startSet = process.hrtime.bigint();
        await this.cacheManager.set(cacheKey, product, ttl);
        const endSet = process.hrtime.bigint();
        this.monitoring.observeRedisDuration('set', Number(endSet - startSet) / 1_000_000_000);
      } catch (error) {
        console.error('缓存设置失败:', error);
        // 不影响主流程，继续返回产品
      }
    }

    return product;
  }

  /**
   * 搜索产品 - 使用搜索引擎进行全文搜索
   */
  // @CacheSearch({ ttl: 300 }) // 缓存5分钟 - 暂时注释掉，需要修复导入
  async search(options: ProductSearchOptions): Promise<{ products: Product[]; total: number }> {
    const {
      keyword,
      categoryId,
      minPrice,
      maxPrice,
      tags,
      inStock,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = options;

    // 如果没有关键词，使用数据库搜索
    if (!keyword) {
      return this.databaseSearch(options);
    }

    try {
      // 使用搜索引擎进行全文搜索
      const searchOptions = {
        filters: {
          categoryId,
          minPrice,
          maxPrice,
          tags,
          inStock,
          isActive: true,
        },
        sortBy: sortBy === 'sales' ? undefined : sortBy, // 搜索引擎可能不支持sales排序
        sortOrder: sortOrder.toLowerCase() as 'asc' | 'desc',
        page,
        limit,
      };

      const searchResult = await this.searchManager.search(keyword, searchOptions);

      // 根据搜索结果从数据库获取完整的产品信息
      const productIds = searchResult.hits.map(hit => parseInt(hit.id));

      if (productIds.length === 0) {
        return { products: [], total: 0 };
      }

      const products = await this.productRepository.find({
        where: { id: In(productIds) },
        relations: ['category', 'images'],
      });

      // 保持搜索结果的排序
      const productMap = new Map(products.map(p => [p.id, p]));
      const sortedProducts = productIds.map(id => productMap.get(id)).filter(Boolean) as Product[];

      return {
        products: sortedProducts,
        total: searchResult.total,
      };
    } catch (error) {
      console.warn('搜索引擎搜索失败，回退到数据库搜索:', error);
      // 搜索引擎失败时回退到数据库搜索
      return this.databaseSearch(options);
    }
  }

  /**
   * 数据库搜索 - 搜索引擎不可用时的备用方案
   */
  private async databaseSearch(
    options: ProductSearchOptions,
  ): Promise<{ products: Product[]; total: number }> {
    const {
      keyword,
      categoryId,
      minPrice,
      maxPrice,
      tags,
      inStock,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = options;

    // 确保productRepository存在
    if (!this.productRepository) {
      throw new Error('Product repository not available');
    }

    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .where('product.isActive = :isActive', { isActive: true });

    if (keyword) {
      query.andWhere('(product.name LIKE :keyword OR product.description LIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    if (categoryId) {
      query.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (minPrice !== undefined) {
      query.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      query.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (tags && tags.length > 0) {
      tags.forEach((tag, index) => {
        query.andWhere(`FIND_IN_SET(:tag${index}, product.tags)`, { [`tag${index}`]: tag });
      });
    }

    if (inStock) {
      query.andWhere('product.stock > 0');
    }

    const [products, total] = await query
      .orderBy(`product.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { products, total };
  }

  /**
   * 获取热门产品
   */
  async getPopularProducts(limit: number = 10): Promise<Product[]> {
    const keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';
    const cacheKey = `${keyPrefix}:popular:products:${limit}`;
    const startGet = process.hrtime.bigint();
    const cached = await this.cacheManager.get<Product[]>(cacheKey);
    const endGet = process.hrtime.bigint();
    this.monitoring.observeRedisDuration('get', Number(endGet - startGet) / 1_000_000_000);

    if (cached) {
      this.logCache('hit', cacheKey);
      this.monitoring.recordCacheHit(cacheKey);
      return cached;
    }
    this.logCache('miss', cacheKey);
    this.monitoring.recordCacheMiss(cacheKey);

    const startDb = process.hrtime.bigint();
    const products = await this.productRepository.find({
      where: { isActive: true },
      order: { sales: 'DESC' },
      take: limit,
      relations: ['category', 'images'],
    });
    const endDb = process.hrtime.bigint();
    this.monitoring.observeDbQuery(
      'aggregation',
      'products',
      Number(endDb - startDb) / 1_000_000_000,
    );

    const ttl = this.configService.get<number>('performance.cache.ttl.popular') || 600;
    const startSet = process.hrtime.bigint();
    await this.cacheManager.set(cacheKey, products, ttl);
    const endSet = process.hrtime.bigint();
    this.monitoring.observeRedisDuration('set', Number(endSet - startSet) / 1_000_000_000);
    this.popularCacheKeys.add(cacheKey as string);

    return products;
  }

  /**
   * 更新产品信息
   */
  async update(id: number, updateData: UpdateProductData): Promise<Product> {
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundException('产品不存在');
    }

    if (updateData.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateData.categoryId },
      });

      if (!category) {
        throw new NotFoundException('分类不存在');
      }

      // 创建新的updateData对象，避免修改原对象
      const { categoryId, ...restData } = updateData;
      updateData = { ...restData, category } as any;
    }

    const oldProduct = await this.findById(id);
    await this.productRepository.update(id, updateData);

    // 清除缓存（统一前缀与热门键集合）
    const keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';
    try {
      await this.cacheManager.del(`${keyPrefix}:product:${id}`);
    } catch (e) {}
    for (const key of this.popularCacheKeys) {
      try {
        await this.cacheManager.del(key);
      } catch (e) {}
    }
    await this.invalidateListCache();

    const updatedProduct = await this.findById(id);

    // 异步发布产品更新事件
    if (oldProduct && updatedProduct) {
      this.publishProductUpdatedEvent(oldProduct, updatedProduct, updateData).catch(error => {
        console.error('发布产品更新事件失败:', error);
      });
    }

    // 异步更新产品搜索索引
    if (updatedProduct) {
      this.indexProductToSearch(updatedProduct).catch((error: Error) => {
        console.error('产品搜索索引更新失败:', error);
      });
    }

    return updatedProduct!;
  }

  /**
   * 删除产品
   */
  async delete(id: number): Promise<void> {
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundException('产品不存在');
    }

    await this.productRepository.delete(id);

    // 清除缓存（统一前缀与热门键集合）
    const keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';
    try {
      await this.cacheManager.del(`${keyPrefix}:product:${id}`);
    } catch (e) {}
    for (const key of this.popularCacheKeys) {
      try {
        await this.cacheManager.del(key);
      } catch (e) {}
    }
    await this.invalidateListCache();
  }

  /**
   * 增加产品浏览量
   */
  async incrementViews(id: number): Promise<void> {
    await this.productRepository.increment({ id }, 'views', 1);

    // 异步发布产品浏览事件
    this.publishProductViewedEvent(id).catch(error => {
      console.error('发布产品浏览事件失败:', error);
    });
  }

  /**
   * 更新产品库存
   */
  async updateStock(id: number, quantity: number): Promise<void> {
    const oldProduct = await this.findById(id);
    const oldStock = oldProduct?.stock || 0;

    await this.productRepository.update(id, {
      stock: () => `stock + ${quantity}`,
    });

    // 清除缓存（统一前缀）
    const keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';
    try {
      await this.cacheManager.del(`${keyPrefix}:product:${id}`);
    } catch (e) {}
    await this.invalidateListCache();

    // 异步发布库存更新事件
    this.publishInventoryUpdatedEvent(id, oldStock, oldStock + quantity, quantity, 'system').catch(
      error => {
        console.error('发布库存更新事件失败:', error);
      },
    );
  }

  /**
   * 获取产品统计信息
   */
  async getStatistics(): Promise<{
    totalProducts: number;
    activeProducts: number;
    outOfStockProducts: number;
    totalSales: number;
  }> {
    // 确保productRepository存在
    if (!this.productRepository) {
      throw new Error('Product repository not available');
    }

    const totalProducts = await this.productRepository.count();
    const activeProducts = await this.productRepository.count({ where: { isActive: true } });
    const outOfStockProducts = await this.productRepository.count({
      where: { stock: 0, isActive: true },
    });

    const result = await this.productRepository
      .createQueryBuilder('product')
      .select('SUM(product.sales)', 'totalSales')
      .getRawOne();

    return {
      totalProducts,
      activeProducts,
      outOfStockProducts,
      totalSales: parseInt(result.totalSales) || 0,
    };
  }

  /**
   * 获取所有产品（分页）
   */
  async findAll(
    options: { page?: number; limit?: number; search?: string } = {},
  ): Promise<{ products: Product[]; total: number }> {
    const { page = 1, limit = 20, search } = options;
    const keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';
    const cacheKey = `${keyPrefix}:products:list:${page}:${limit}:${search || ''}`;
    const startGet = process.hrtime.bigint();
    const cached = await this.cacheManager.get<{ products: Product[]; total: number }>(cacheKey);
    const endGet = process.hrtime.bigint();
    this.monitoring.observeRedisDuration('get', Number(endGet - startGet) / 1_000_000_000);
    if (cached) {
      this.logCache('hit', cacheKey);
      this.monitoring.recordCacheHit(cacheKey);
      return cached;
    }
    this.logCache('miss', cacheKey);
    this.monitoring.recordCacheMiss(cacheKey);

    // 确保productRepository存在
    if (!this.productRepository) {
      throw new Error('Product repository not available');
    }

    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images');

    if (search) {
      query.where('(product.name LIKE :search OR product.description LIKE :search)', {
        search: `%${search}%`,
      });
    }

    const startDb = process.hrtime.bigint();
    const [products, total] = await query
      .orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const endDb = process.hrtime.bigint();
    this.monitoring.observeDbQuery('list', 'products', Number(endDb - startDb) / 1_000_000_000);
    const result = { products, total };
    const ttl = this.configService.get<number>('performance.cache.ttl.list') || 30;
    const startSet = process.hrtime.bigint();
    await this.cacheManager.set(cacheKey, result, ttl);
    const endSet = process.hrtime.bigint();
    this.monitoring.observeRedisDuration('set', Number(endSet - startSet) / 1_000_000_000);
    this.listCacheKeys.add(cacheKey as string);
    return result;
  }

  /**
   * 查找热门产品
   */
  async findPopular(limit: number = 10): Promise<Product[]> {
    return this.getPopularProducts(limit);
  }

  /**
   * 根据ID查找单个产品
   */
  async findOne(id: number): Promise<Product> {
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundException('产品不存在');
    }
    return product;
  }

  /**
   * 删除产品
   */
  async remove(id: number): Promise<void> {
    return this.delete(id);
  }

  /**
   * 记录产品浏览量
   */
  async recordView(id: number): Promise<void> {
    return this.incrementViews(id);
  }

  /**
   * 发布产品创建事件
   */
  private async publishProductCreatedEvent(product: Product): Promise<void> {
    const event = {
      productId: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      timestamp: new Date().toISOString(),
    };

    await this.productEventsService.publishProductCreated(event);
  }

  /**
   * 发布产品更新事件
   */
  private async publishProductUpdatedEvent(
    oldProduct: Product | null,
    newProduct: Product,
    updateData: UpdateProductData,
  ): Promise<void> {
    const event = {
      productId: newProduct.id,
      name: updateData.name,
      price: updateData.price,
      stock: updateData.stock,
      oldPrice: oldProduct?.price,
      timestamp: new Date().toISOString(),
    };

    await this.productEventsService.publishProductUpdated(event);
  }

  /**
   * 发布产品浏览事件
   */
  private async publishProductViewedEvent(productId: number): Promise<void> {
    const event = {
      productId: productId,
      timestamp: new Date().toISOString(),
    };

    await this.productEventsService.publishProductViewed(event);
  }

  /**
   * 发布库存更新事件
   */
  private async publishInventoryUpdatedEvent(
    productId: number,
    oldStock: number,
    newStock: number,
    change: number,
    reason: 'order' | 'manual' | 'system',
  ): Promise<void> {
    const event = {
      productId: productId,
      oldStock: oldStock,
      newStock: newStock,
      change: change,
      reason: reason,
      timestamp: new Date().toISOString(),
    };

    await this.productEventsService.publishInventoryUpdated(event);
  }

  /**
   * 索引产品到搜索引擎
   */
  private async indexProductToSearch(product: Product): Promise<void> {
    try {
      const indexData: ProductIndexData = {
        id: product.id.toString(),
        name: product.name,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice,
        category: product.category?.name || '',
        categoryId: product.category?.id || 0,
        tags: product.tags || [],
        stock: product.stock,
        isActive: product.isActive,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        specifications: product.specifications,
      };

      await this.searchManager.indexProduct(indexData);
    } catch (error) {
      console.error('产品搜索索引失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 从搜索引擎删除产品索引
   */
  private async deleteProductFromSearch(productId: number): Promise<void> {
    try {
      await this.searchManager.deleteProduct(productId.toString());
    } catch (error) {
      console.error('产品搜索索引删除失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 批量索引所有产品到搜索引擎
   */
  async reindexAllProducts(): Promise<{ success: number; failed: number }> {
    try {
      const products = await this.productRepository.find({
        relations: ['category'],
      });

      const indexData: ProductIndexData[] = products.map(product => ({
        id: product.id.toString(),
        name: product.name,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice,
        category: product.category?.name || '',
        categoryId: product.category?.id || 0,
        tags: product.tags || [],
        stock: product.stock,
        isActive: product.isActive,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        specifications: product.specifications,
      }));

      await this.searchManager.indexProducts(indexData);

      return { success: products.length, failed: 0 };
    } catch (error) {
      console.error('批量重新索引失败:', error);
      throw new Error(`批量重新索引失败: ${error.message}`);
    }
  }

  /**
   * 根据分类查找产品
   */
  async findByCategory(category: string, limit: number = 10): Promise<Product[]> {
    const keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';
    const cacheKey = `${keyPrefix}:products:category:${category}:${limit}`;
    const startGet = process.hrtime.bigint();
    const cached = await this.cacheManager.get<Product[]>(cacheKey);
    const endGet = process.hrtime.bigint();
    this.monitoring.observeRedisDuration('get', Number(endGet - startGet) / 1_000_000_000);

    if (cached) {
      this.logCache('hit', cacheKey);
      this.monitoring.recordCacheHit(cacheKey);
      return cached;
    }

    this.logCache('miss', cacheKey);
    this.monitoring.recordCacheMiss(cacheKey);

    // 确保productRepository存在
    if (!this.productRepository) {
      throw new Error('Product repository not available');
    }

    const startDb = process.hrtime.bigint();
    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .where('category.name = :category', { category })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .orderBy('product.sales', 'DESC')
      .take(limit)
      .getMany();
    const endDb = process.hrtime.bigint();
    this.monitoring.observeDbQuery('list', 'products', Number(endDb - startDb) / 1_000_000_000);

    const ttl = this.configService.get<number>('performance.cache.ttl.list') || 30;
    const startSet = process.hrtime.bigint();
    await this.cacheManager.set(cacheKey, products, ttl);
    const endSet = process.hrtime.bigint();
    this.monitoring.observeRedisDuration('set', Number(endSet - startSet) / 1_000_000_000);
    this.listCacheKeys.add(cacheKey as string);

    return products;
  }

  /**
   * 获取搜索引擎状态
   */
  async getSearchEngineStatus(): Promise<any> {
    try {
      return this.searchManager.getStatus();
    } catch (error) {
      console.error('获取搜索引擎状态失败:', error);
      throw new Error(`获取搜索引擎状态失败: ${error.message}`);
    }
  }

  /**
   * 获取所有分类
   * 作者：后端开发团队
   * 时间：2025-09-26 18:30:00
   */
  async getCategories(): Promise<Category[]> {
    const keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';
    const cacheKey = `${keyPrefix}:categories:all`;

    // 尝试从缓存获取
    const startGet = process.hrtime.bigint();
    const cached = await this.cacheManager.get<Category[]>(cacheKey);
    const endGet = process.hrtime.bigint();
    this.monitoring.observeRedisDuration('get', Number(endGet - startGet) / 1_000_000_000);

    if (cached) {
      this.logCache('hit', cacheKey);
      this.monitoring.recordCacheHit(cacheKey);
      return cached;
    }

    this.logCache('miss', cacheKey);
    this.monitoring.recordCacheMiss(cacheKey);

    // 从数据库获取分类
    const startDb = process.hrtime.bigint();
    const categories = await this.categoryRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
      relations: ['products'],
    });
    const endDb = process.hrtime.bigint();
    this.monitoring.observeDbQuery('list', 'categories', Number(endDb - startDb) / 1_000_000_000);

    // 缓存分类数据
    const ttl = this.configService.get<number>('performance.cache.ttl.list') || 30;
    const startSet = process.hrtime.bigint();
    await this.cacheManager.set(cacheKey, categories, ttl * 2); // 分类缓存时间更长
    const endSet = process.hrtime.bigint();
    this.monitoring.observeRedisDuration('set', Number(endSet - startSet) / 1_000_000_000);

    return categories;
  }
}
