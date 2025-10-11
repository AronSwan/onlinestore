// 用途：产品服务单元测试
// 依赖文件：products.service.ts, product.entity.ts, category.entity.ts
// 作者：后端开发团队
// 时间：2025-10-01 00:22:00

import { Test, TestingModule } from '@nestjs/testing';
import { Repository, In, QueryBuilder } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';

import { ProductsService } from './products.service';
import { createMockedFunction } from '../../test/utils/typed-mock-factory';
import { createMockQueryBuilder } from '../../test/utils/index';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { ProductImage } from './entities/product-image.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { MonitoringService } from '../monitoring/monitoring.service';
import { ProductEventsService } from '../messaging/product-events.service';
import { SearchManagerService } from './search/search-manager.service';

// Mock entities
const mockCategory = {
  id: 1,
  name: '测试分类',
  description: '测试分类描述',
  slug: 'test-category',
  isActive: true,
  sortOrder: 1,
  icon: '',
  children: [],
  parent: undefined as any,
  products: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProduct = {
  id: 1,
  name: '测试产品',
  description: '测试产品描述',
  price: 100,
  originalPrice: 120,
  stock: 50,
  views: 100,
  sales: 20,
  isActive: true,
  favorites: 0,
  mainImage: '',
  publishedAt: new Date(),
  tags: ['标签1', '标签2'],
  specifications: { color: '红色', size: 'M' },
  category: mockCategory,
  images: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
};

const mockProductImage = {
  id: 1,
  product: mockProduct,
  productId: 1,
  url: 'https://example.com/image.jpg',
  title: '产品图片',
  description: '产品图片描述',
  sortOrder: 1,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock repositories
const mockProductRepository = {
  create: createMockedFunction<(dto: Partial<Product>) => Product>(),
  save: createMockedFunction<(entity: Product) => Promise<Product>>(),
  findOne: createMockedFunction<(options: any) => Promise<Product | null>>(),
  find: createMockedFunction<(options: any) => Promise<Product[]>>(),
  update:
    createMockedFunction<
      (id: number | any, partial: Partial<Product>) => Promise<{ affected?: number }>
    >(),
  delete: createMockedFunction<(id: number | any) => Promise<{ affected?: number }>>(),
  increment:
    createMockedFunction<
      (
        criteria: any,
        property: keyof Product | string,
        value: number,
      ) => Promise<{ affected?: number }>
    >(),
  count: createMockedFunction<(options?: any) => Promise<number>>(),
  createQueryBuilder: createMockedFunction<(alias?: string) => any>(),
};

const mockCategoryRepository = {
  findOne: createMockedFunction<(options: any) => Promise<Category | null>>(),
  find: createMockedFunction<(options?: any) => Promise<Category[]>>(),
};

const mockProductImageRepository = {
  find: createMockedFunction<(options?: any) => Promise<ProductImage[]>>(),
};

// Mock services
const mockCacheManager = {
  get: createMockedFunction<(key: string) => Promise<any>>(),
  set: createMockedFunction<(key: string, value: any, ttl?: number) => Promise<boolean>>(),
  del: createMockedFunction<(key: string) => Promise<boolean>>(),
};

const mockConfigService = {
  get: createMockedFunction<(key: string) => any>(),
};

const mockMonitoringService = {
  observeRedisDuration:
    createMockedFunction<(metric: string, durationMs: number) => Promise<void>>(),
  recordCacheHit: createMockedFunction<(key: string) => Promise<void>>(),
  recordCacheMiss: createMockedFunction<(key: string) => Promise<void>>(),
  observeDbQuery: createMockedFunction<(queryName: string, durationMs: number) => Promise<void>>(),
};

const mockProductEventsService = {
  publishProductCreated: createMockedFunction<(payload: any) => Promise<void>>(),
  publishProductUpdated: createMockedFunction<(payload: any) => Promise<void>>(),
  publishProductViewed: createMockedFunction<(payload: any) => Promise<void>>(),
  publishInventoryUpdated: createMockedFunction<(payload: any) => Promise<void>>(),
};

const mockSearchManagerService = {
  search:
    createMockedFunction<
      (keyword: string, options: any) => Promise<{ hits: Array<{ id: string }>; total: number }>
    >(),
  indexProduct: createMockedFunction<(product: Product) => Promise<void>>(),
  deleteProduct: createMockedFunction<(productId: number) => Promise<void>>(),
  indexProducts: createMockedFunction<(products: Product[]) => Promise<void>>(),
  getStatus: createMockedFunction<() => Promise<{ healthy: boolean }>>(),
};

// Mock QueryBuilder（类型化封装，保留链式调用）
const mockQueryBuilder = createMockQueryBuilder<Product>();

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepository: Repository<Product>;
  let categoryRepository: Repository<Category>;
  let productImageRepository: Repository<ProductImage>;
  let cacheManager: Cache;
  let configService: ConfigService;
  let monitoringService: MonitoringService;
  let productEventsService: ProductEventsService;
  let searchManagerService: SearchManagerService;

  const originalEnv = process.env;

  beforeEach(async () => {
    (jest as any).resetModules();
    (jest as any).clearAllMocks();
    process.env = { ...originalEnv };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepository,
        },
        {
          provide: getRepositoryToken(ProductImage),
          useValue: mockProductImageRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: MonitoringService,
          useValue: mockMonitoringService,
        },
        {
          provide: ProductEventsService,
          useValue: mockProductEventsService,
        },
        {
          provide: SearchManagerService,
          useValue: mockSearchManagerService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
    categoryRepository = module.get<Repository<Category>>(getRepositoryToken(Category));
    productImageRepository = module.get<Repository<ProductImage>>(getRepositoryToken(ProductImage));
    cacheManager = module.get<Cache>(CACHE_MANAGER);
    configService = module.get<ConfigService>(ConfigService);
    monitoringService = module.get<MonitoringService>(MonitoringService);
    productEventsService = module.get<ProductEventsService>(ProductEventsService);
    searchManagerService = module.get<SearchManagerService>(SearchManagerService);

    // Reset all mock functions
    Object.values(mockProductRepository).forEach(mock => mock.mockReset());
    Object.values(mockCategoryRepository).forEach(mock => mock.mockReset());
    Object.values(mockProductImageRepository).forEach(mock => mock.mockReset());
    Object.values(mockCacheManager).forEach(mock => mock.mockReset());
    Object.values(mockConfigService).forEach(mock => mock.mockReset());
    Object.values(mockMonitoringService).forEach(mock => mock.mockReset());
    Object.values(mockProductEventsService).forEach(mock => mock.mockReset());
    Object.values(mockSearchManagerService).forEach(mock => mock.mockReset());
    Object.values(mockQueryBuilder).forEach((mock: any) => mock.mockReset());

    // Setup default mock returns
    mockConfigService.get.mockImplementation((key: string) => {
      const defaults: Record<string, any> = {
        'redis.keyPrefix': 'caddy_shopping',
        'performance.cache.ttl.detail': 300,
        'performance.cache.ttl.popular': 600,
        'performance.cache.ttl.list': 30,
      };
      return defaults[key] || null;
    });

    mockProductRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have all dependencies injected', () => {
      expect(productRepository).toBeDefined();
      expect(categoryRepository).toBeDefined();
      expect(productImageRepository).toBeDefined();
      expect(cacheManager).toBeDefined();
      expect(configService).toBeDefined();
      expect(monitoringService).toBeDefined();
      expect(productEventsService).toBeDefined();
      expect(searchManagerService).toBeDefined();
    });
  });

  describe('Create Product', () => {
    const createProductData = {
      name: '新产品',
      description: '新产品描述',
      price: 150,
      originalPrice: 180,
      stock: 30,
      categoryId: 1,
      mainImage: 'https://example.com/main.jpg',
      tags: ['新品', '热销'],
      specifications: { color: '蓝色', size: 'L' },
    };

    it('should successfully create a new product', async () => {
      // Setup mocks
      mockCategoryRepository.findOne.mockResolvedValue(mockCategory);
      mockProductRepository.create.mockReturnValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(mockProduct);
      mockCacheManager.del.mockResolvedValue(true);
      mockProductEventsService.publishProductCreated.mockResolvedValue(undefined);
      mockSearchManagerService.indexProduct.mockResolvedValue(undefined);

      const result = await service.create(createProductData);

      expect(result).toEqual(mockProduct);
      expect(mockCategoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: createProductData.categoryId },
      });
      expect(mockProductRepository.create).toHaveBeenCalledWith({
        ...createProductData,
        category: mockCategory,
        publishedAt: expect.any(Date),
      });
      expect(mockProductRepository.save).toHaveBeenCalledWith(mockProduct);
      expect(mockCacheManager.del).toHaveBeenCalledWith('caddy_shopping:product:1');
      expect(mockProductEventsService.publishProductCreated).toHaveBeenCalled();
      expect(mockSearchManagerService.indexProduct).toHaveBeenCalled();
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createProductData)).rejects.toThrow(new NotFoundException());
      expect(mockCategoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: createProductData.categoryId },
      });
    });

    it('should handle cache deletion errors gracefully', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(mockCategory);
      mockProductRepository.create.mockReturnValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(mockProduct);
      mockCacheManager.del.mockRejectedValue(new Error('Cache deletion failed'));
      mockProductEventsService.publishProductCreated.mockResolvedValue(undefined);
      mockSearchManagerService.indexProduct.mockResolvedValue(undefined);

      const result = await service.create(createProductData);

      expect(result).toEqual(mockProduct);
      expect(mockProductEventsService.publishProductCreated).toHaveBeenCalled();
    });

    it('should handle event publishing errors gracefully', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(mockCategory);
      mockProductRepository.create.mockReturnValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(mockProduct);
      mockCacheManager.del.mockResolvedValue(true);
      mockProductEventsService.publishProductCreated.mockRejectedValue(new Error('Event failed'));
      mockSearchManagerService.indexProduct.mockResolvedValue(undefined);

      const result = await service.create(createProductData);

      expect(result).toEqual(mockProduct);
      expect(mockSearchManagerService.indexProduct).toHaveBeenCalled();
    });
  });

  describe('Find Product By ID', () => {
    it('should return cached product when available', async () => {
      mockCacheManager.get.mockResolvedValue(mockProduct);
      mockMonitoringService.recordCacheHit.mockResolvedValue(undefined);

      const result = await service.findById(1);

      expect(result).toEqual(mockProduct);
      expect(mockCacheManager.get).toHaveBeenCalledWith('caddy_shopping:product:1');
      expect(mockMonitoringService.recordCacheHit).toHaveBeenCalledWith('caddy_shopping:product:1');
      expect(mockProductRepository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from database when not cached', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockCacheManager.set.mockResolvedValue(true);
      mockMonitoringService.recordCacheMiss.mockResolvedValue(undefined);

      const result = await service.findById(1);

      expect(result).toEqual(mockProduct);
      expect(mockCacheManager.get).toHaveBeenCalledWith('caddy_shopping:product:1');
      expect(mockProductRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['category', 'images'],
      });
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'caddy_shopping:product:1',
        mockProduct,
        300,
      );
      expect(mockMonitoringService.recordCacheMiss).toHaveBeenCalledWith(
        'caddy_shopping:product:1',
      );
    });

    it('should return null when product does not exist', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockProductRepository.findOne.mockResolvedValue(null);
      mockMonitoringService.recordCacheMiss.mockResolvedValue(undefined);

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('Search Products', () => {
    const searchOptions = {
      keyword: '测试',
      categoryId: 1,
      minPrice: 50,
      maxPrice: 200,
      tags: ['标签1'],
      inStock: true,
      page: 1,
      limit: 10,
      sortBy: 'name' as const,
      sortOrder: 'ASC' as const,
    };

    it('should use search engine when keyword is provided', async () => {
      const searchResult = {
        hits: [{ id: '1' }],
        total: 1,
      };

      mockSearchManagerService.search.mockResolvedValue(searchResult);
      mockProductRepository.find.mockResolvedValue([mockProduct]);

      const result = await service.search(searchOptions);

      expect(result).toEqual({
        products: [mockProduct],
        total: 1,
      });
      expect(mockSearchManagerService.search).toHaveBeenCalledWith('测试', {
        filters: {
          categoryId: 1,
          minPrice: 50,
          maxPrice: 200,
          tags: ['标签1'],
          inStock: true,
          isActive: true,
        },
        sortBy: 'name',
        sortOrder: 'asc',
        page: 1,
        limit: 10,
      });
    });

    it('should fallback to database search when search engine fails', async () => {
      mockSearchManagerService.search.mockRejectedValue(new Error('Search failed'));

      // 使用统一的 QueryBuilder 工厂，确保链式方法和返回类型一致
      const qb = createMockQueryBuilder<Product>();
      qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);
      mockProductRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.search(searchOptions);

      expect(result).toEqual({
        products: [mockProduct],
        total: 1,
      });
      expect(mockSearchManagerService.search).toHaveBeenCalled();
    });

    it('should use database search when no keyword is provided', async () => {
      const optionsWithoutKeyword = { ...searchOptions, keyword: undefined };

      // 使用统一的 QueryBuilder 工厂，确保链式方法和返回类型一致
      const qb = createMockQueryBuilder<Product>();
      qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);
      mockProductRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.search(optionsWithoutKeyword);

      expect(result).toEqual({
        products: [mockProduct],
        total: 1,
      });
      expect(mockSearchManagerService.search).not.toHaveBeenCalled();
    });

    it('should return empty result when search finds no products', async () => {
      const searchResult = {
        hits: [],
        total: 0,
      };

      mockSearchManagerService.search.mockResolvedValue(searchResult);

      const result = await service.search(searchOptions);

      expect(result).toEqual({
        products: [],
        total: 0,
      });
    });
  });

  describe('Get Popular Products', () => {
    it('should return cached popular products when available', async () => {
      mockCacheManager.get.mockResolvedValue([mockProduct]);
      mockMonitoringService.recordCacheHit.mockResolvedValue(undefined);

      const result = await service.getPopularProducts(10);

      expect(result).toEqual([mockProduct]);
      expect(mockCacheManager.get).toHaveBeenCalledWith('caddy_shopping:popular:products:10');
      expect(mockMonitoringService.recordCacheHit).toHaveBeenCalledWith(
        'caddy_shopping:popular:products:10',
      );
      expect(mockProductRepository.find).not.toHaveBeenCalled();
    });

    it('should fetch from database when not cached', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockProductRepository.find.mockResolvedValue([mockProduct]);
      mockCacheManager.set.mockResolvedValue(true);
      mockMonitoringService.recordCacheMiss.mockResolvedValue(undefined);

      const result = await service.getPopularProducts(10);

      expect(result).toEqual([mockProduct]);
      expect(mockProductRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { sales: 'DESC' },
        take: 10,
        relations: ['category', 'images'],
      });
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'caddy_shopping:popular:products:10',
        [mockProduct],
        600,
      );
      expect(mockMonitoringService.recordCacheMiss).toHaveBeenCalledWith(
        'caddy_shopping:popular:products:10',
      );
    });
  });

  describe('Update Product', () => {
    const updateProductData = {
      name: '更新后的产品',
      price: 120,
      stock: 40,
      categoryId: 1,
    };

    it('should successfully update product', async () => {
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockCategoryRepository.findOne.mockResolvedValue(mockCategory);
      mockProductRepository.update.mockResolvedValue({ affected: 1 });
      mockCacheManager.del.mockResolvedValue(true);
      mockProductEventsService.publishProductUpdated.mockResolvedValue(undefined);
      mockSearchManagerService.indexProduct.mockResolvedValue(undefined);

      // Mock findById calls
      let callCount = 0;
      mockProductRepository.findOne.mockImplementation(() => {
        callCount++;
        return Promise.resolve(
          callCount === 1 ? mockProduct : { ...mockProduct, name: '更新后的产品' },
        );
      });

      const result = await service.update(1, updateProductData);

      expect(result).toEqual({ ...mockProduct, name: '更新后的产品' });
      expect(mockProductRepository.update).toHaveBeenCalledWith(1, {
        name: '更新后的产品',
        price: 120,
        stock: 40,
        category: mockCategory,
      });
      expect(mockCacheManager.del).toHaveBeenCalledWith('caddy_shopping:product:1');
      expect(mockProductEventsService.publishProductUpdated).toHaveBeenCalled();
      expect(mockSearchManagerService.indexProduct).toHaveBeenCalled();
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockCacheManager.get.mockResolvedValue(null); // 确保缓存未命中
      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, updateProductData)).rejects.toThrow(new NotFoundException());
    });

    it('should throw NotFoundException when new category does not exist', async () => {
      // 先模拟findById返回产品
      mockProductRepository.findOne.mockResolvedValueOnce(mockProduct);
      // 然后模拟分类查找返回null
      mockCategoryRepository.findOne.mockResolvedValue(null);

      // 使用async/await方式检查异常
      try {
        await service.update(1, updateProductData);
        expect(true).toBe(false); // Expected NotFoundException to be thrown
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('Delete Product', () => {
    it('should successfully delete product', async () => {
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockProductRepository.delete.mockResolvedValue({ affected: 1 });
      mockCacheManager.del.mockResolvedValue(true);

      await service.delete(1);

      expect(mockProductRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['category', 'images'],
      });
      expect(mockProductRepository.delete).toHaveBeenCalledWith(1);
      expect(mockCacheManager.del).toHaveBeenCalledWith('caddy_shopping:product:1');
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(new NotFoundException());
    });
  });

  describe('Increment Views', () => {
    it('should successfully increment product views', async () => {
      mockProductRepository.increment.mockResolvedValue({ affected: 1 });
      mockProductEventsService.publishProductViewed.mockResolvedValue(undefined);

      await service.incrementViews(1);

      expect(mockProductRepository.increment).toHaveBeenCalledWith({ id: 1 }, 'views', 1);
      expect(mockProductEventsService.publishProductViewed).toHaveBeenCalledWith({
        productId: 1,
        timestamp: expect.any(String),
      });
    });
  });

  describe('Update Stock', () => {
    it('should successfully update product stock', async () => {
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockProductRepository.update.mockResolvedValue({ affected: 1 });
      mockCacheManager.del.mockResolvedValue(true);
      mockProductEventsService.publishInventoryUpdated.mockResolvedValue(undefined);

      await service.updateStock(1, 10);

      expect(mockProductRepository.update).toHaveBeenCalledWith(1, {
        stock: expect.any(Function),
      });
      expect(mockCacheManager.del).toHaveBeenCalledWith('caddy_shopping:product:1');
      expect(mockProductEventsService.publishInventoryUpdated).toHaveBeenCalledWith({
        productId: 1,
        oldStock: 50,
        newStock: 60,
        change: 10,
        reason: 'system',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Get Statistics', () => {
    it('should return product statistics', async () => {
      // 重置mock调用计数
      mockProductRepository.count.mockReset();

      // 设置mock返回值
      mockProductRepository.count
        .mockResolvedValueOnce(100) // totalProducts
        .mockResolvedValueOnce(80) // activeProducts
        .mockResolvedValueOnce(5); // outOfStockProducts

      // 使用统一的 QueryBuilder 工厂，确保链式方法和返回类型一致
      const qb = createMockQueryBuilder<Product>();
      qb.select.mockReturnThis();
      qb.getRawOne.mockResolvedValue({ totalSales: '1000' } as any);
      mockProductRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getStatistics();

      expect(result).toEqual({
        totalProducts: 100,
        activeProducts: 80,
        outOfStockProducts: 5,
        totalSales: 1000,
      });
    });
  });

  describe('Find All Products', () => {
    const findAllOptions = {
      page: 1,
      limit: 20,
      search: '测试',
    };

    it('should return cached products when available', async () => {
      const cachedResult = { products: [mockProduct], total: 1 };
      mockCacheManager.get.mockResolvedValue(cachedResult);
      mockMonitoringService.recordCacheHit.mockResolvedValue(undefined);

      const result = await service.findAll(findAllOptions);

      expect(result).toEqual(cachedResult);
      expect(mockCacheManager.get).toHaveBeenCalledWith('caddy_shopping:products:list:1:20:测试');
      expect(mockMonitoringService.recordCacheHit).toHaveBeenCalledWith(
        'caddy_shopping:products:list:1:20:测试',
      );
      expect(mockQueryBuilder.getManyAndCount).not.toHaveBeenCalled();
    });

    it('should fetch from database when not cached', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      // 使用统一的 QueryBuilder 工厂，确保链式方法和返回类型一致
      const qb = createMockQueryBuilder<Product>();
      qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);
      mockProductRepository.createQueryBuilder.mockReturnValue(qb);
      mockCacheManager.set.mockResolvedValue(true);
      mockMonitoringService.recordCacheMiss.mockResolvedValue(undefined);

      const result = await service.findAll(findAllOptions);

      expect(result).toEqual({ products: [mockProduct], total: 1 });
      expect(qb.getManyAndCount).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'caddy_shopping:products:list:1:20:测试',
        { products: [mockProduct], total: 1 },
        30,
      );
      expect(mockMonitoringService.recordCacheMiss).toHaveBeenCalledWith(
        'caddy_shopping:products:list:1:20:测试',
      );
    });
  });

  describe('Find By Category', () => {
    it('should return cached products when available', async () => {
      mockCacheManager.get.mockResolvedValue([mockProduct]);
      mockMonitoringService.recordCacheHit.mockResolvedValue(undefined);

      const result = await service.findByCategory('测试分类', 10);

      expect(result).toEqual([mockProduct]);
      expect(mockCacheManager.get).toHaveBeenCalledWith(
        'caddy_shopping:products:category:测试分类:10',
      );
      expect(mockMonitoringService.recordCacheHit).toHaveBeenCalledWith(
        'caddy_shopping:products:category:测试分类:10',
      );
      expect(mockQueryBuilder.getMany).not.toHaveBeenCalled();
    });

    it('should fetch from database when not cached', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      // 使用统一的 QueryBuilder 工厂，确保链式方法和返回类型一致
      const qb = createMockQueryBuilder<Product>();
      qb.getMany.mockResolvedValue([mockProduct]);
      mockProductRepository.createQueryBuilder.mockReturnValue(qb);
      mockCacheManager.set.mockResolvedValue(true);
      mockMonitoringService.recordCacheMiss.mockResolvedValue(undefined);

      const result = await service.findByCategory('测试分类', 10);

      expect(result).toEqual([mockProduct]);
      expect(qb.getMany).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'caddy_shopping:products:category:测试分类:10',
        [mockProduct],
        30,
      );
      expect(mockMonitoringService.recordCacheMiss).toHaveBeenCalledWith(
        'caddy_shopping:products:category:测试分类:10',
      );
    });
  });

  describe('Get Categories', () => {
    it('should return cached categories when available', async () => {
      mockCacheManager.get.mockResolvedValue([mockCategory]);
      mockMonitoringService.recordCacheHit.mockResolvedValue(undefined);

      const result = await service.getCategories();

      expect(result).toEqual([mockCategory]);
      expect(mockCacheManager.get).toHaveBeenCalledWith('caddy_shopping:categories:all');
      expect(mockMonitoringService.recordCacheHit).toHaveBeenCalledWith(
        'caddy_shopping:categories:all',
      );
      expect(mockCategoryRepository.find).not.toHaveBeenCalled();
    });

    it('should fetch from database when not cached', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockCategoryRepository.find.mockResolvedValue([mockCategory]);
      mockCacheManager.set.mockResolvedValue(true);
      mockMonitoringService.recordCacheMiss.mockResolvedValue(undefined);

      const result = await service.getCategories();

      expect(result).toEqual([mockCategory]);
      expect(mockCategoryRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { sortOrder: 'ASC', name: 'ASC' },
        relations: ['products'],
      });
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'caddy_shopping:categories:all',
        [mockCategory],
        60,
      );
      expect(mockMonitoringService.recordCacheMiss).toHaveBeenCalledWith(
        'caddy_shopping:categories:all',
      );
    });
  });

  describe('Reindex All Products', () => {
    it('should successfully reindex all products', async () => {
      mockProductRepository.find.mockResolvedValue([mockProduct]);
      mockSearchManagerService.indexProducts.mockResolvedValue(undefined);

      const result = await service.reindexAllProducts();

      expect(result).toEqual({ success: 1, failed: 0 });
      expect(mockProductRepository.find).toHaveBeenCalledWith({
        relations: ['category'],
      });
      expect(mockSearchManagerService.indexProducts).toHaveBeenCalledWith([
        {
          id: '1',
          name: '测试产品',
          description: '测试产品描述',
          price: 100,
          originalPrice: 120,
          category: '测试分类',
          categoryId: 1,
          tags: ['标签1', '标签2'],
          stock: 50,
          isActive: true,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          specifications: { color: '红色', size: 'M' },
        },
      ]);
    });

    it('should throw error when reindexing fails', async () => {
      mockProductRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.reindexAllProducts()).rejects.toThrow(
        '批量重新索引失败: Database error',
      );
    });
  });

  describe('Get Search Engine Status', () => {
    it('should return search engine status', async () => {
      const status = { status: 'healthy', uptime: 3600 };
      mockSearchManagerService.getStatus.mockResolvedValue({ healthy: true });

      const result = await service.getSearchEngineStatus();

      expect(result).toEqual(status);
      expect(mockSearchManagerService.getStatus).toHaveBeenCalled();
    });

    it('should throw error when getting status fails', async () => {
      mockSearchManagerService.getStatus.mockRejectedValue(new Error('Status error'));

      await expect(service.getSearchEngineStatus()).rejects.toThrow('Status error');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete product lifecycle', async () => {
      // Create
      mockCategoryRepository.findOne.mockResolvedValue(mockCategory);
      mockProductRepository.create.mockReturnValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(mockProduct);
      mockCacheManager.del.mockResolvedValue(true);
      mockProductEventsService.publishProductCreated.mockResolvedValue(undefined);
      mockSearchManagerService.indexProduct.mockResolvedValue(undefined);

      const created = await service.create({
        name: '新产品',
        description: '描述',
        price: 100,
        stock: 50,
        categoryId: 1,
      });

      expect(created).toBeDefined();

      // Find
      mockCacheManager.get.mockResolvedValue(null);
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockCacheManager.set.mockResolvedValue(true);

      const found = await service.findById(1);
      expect(found).toEqual(mockProduct);

      // Update
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockCategoryRepository.findOne.mockResolvedValue(mockCategory);
      mockProductRepository.update.mockResolvedValue({ affected: 1 });
      mockProductEventsService.publishProductUpdated.mockResolvedValue(undefined);
      mockSearchManagerService.indexProduct.mockResolvedValue(undefined);

      const updated = await service.update(1, { name: '更新产品' });
      expect(updated).toBeDefined();

      // Delete
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockProductRepository.delete.mockResolvedValue({ affected: 1 });

      await service.delete(1);
    });

    it('should handle cache invalidation across operations', async () => {
      // Setup
      mockCategoryRepository.findOne.mockResolvedValue(mockCategory);
      mockProductRepository.create.mockReturnValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(mockProduct);
      mockCacheManager.del.mockResolvedValue(true);
      mockProductEventsService.publishProductCreated.mockResolvedValue(undefined);
      mockSearchManagerService.indexProduct.mockResolvedValue(undefined);

      // Create product
      await service.create({
        name: '新产品',
        description: '描述',
        price: 100,
        stock: 50,
        categoryId: 1,
      });

      // Verify cache invalidation
      expect(mockCacheManager.del).toHaveBeenCalledWith('caddy_shopping:product:1');
    });
  });

  describe('Error Handling', () => {
    it('should handle cache errors gracefully', async () => {
      // 捕获console.error以避免测试输出中的错误信息
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockCacheManager.set.mockResolvedValue(true);
      mockMonitoringService.recordCacheMiss.mockResolvedValue(undefined);

      const result = await service.findById(1);

      expect(result).toEqual(mockProduct);

      // 恢复console.error
      consoleSpy.mockRestore();
    });

    it('should handle database errors gracefully', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockProductRepository.findOne.mockRejectedValue(new Error('Database error'));
      mockMonitoringService.recordCacheMiss.mockResolvedValue(undefined);

      await expect(service.findById(1)).rejects.toThrow('Database error');
    });

    it('should handle search engine errors gracefully', async () => {
      const searchOptions = { keyword: '测试' };
      mockSearchManagerService.search.mockRejectedValue(new Error('Search error'));
      // 使用统一的 QueryBuilder 工厂，确保链式方法和返回类型一致
      const qb = createMockQueryBuilder<Product>();
      qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);
      mockProductRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.search(searchOptions);

      expect(result).toEqual({
        products: [mockProduct],
        total: 1,
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should record cache hit metrics', async () => {
      mockCacheManager.get.mockResolvedValue(mockProduct);
      mockMonitoringService.recordCacheHit.mockResolvedValue(undefined);

      await service.findById(1);

      expect(mockMonitoringService.recordCacheHit).toHaveBeenCalledWith('caddy_shopping:product:1');
    });

    it('should record cache miss metrics', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockCacheManager.set.mockResolvedValue(true);
      mockMonitoringService.recordCacheMiss.mockResolvedValue(undefined);

      await service.findById(1);

      expect(mockMonitoringService.recordCacheMiss).toHaveBeenCalledWith(
        'caddy_shopping:product:1',
      );
    });

    it('should record database query metrics', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockCacheManager.set.mockResolvedValue(true);
      mockMonitoringService.recordCacheMiss.mockResolvedValue(undefined);

      await service.findById(1);

      expect(mockMonitoringService.observeDbQuery).toHaveBeenCalledWith(
        'detail',
        'products',
        expect.any(Number),
      );
    });
  });
});
