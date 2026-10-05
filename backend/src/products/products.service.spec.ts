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
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

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

/** 四修 P2：create 面最小合法载荷（specifications 大小用例的基线） */
const createValidData = {
  name: '测试产品',
  description: '测试产品描述',
  price: 100,
  stock: 50,
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

/**
 * 三修 P1-1：update 路径现在消费 QueryBuilder 更新链（update().set().where().execute()）。
 * 外层 beforeEach 的 mockReset() 会剥掉 createMockQueryBuilder 预置的 mockReturnThis，
 * 链式方法回归 undefined 返回——凡走 QB 链的用例须先恢复链式自返回。
 */
const restoreQbChain = () => {
  for (const method of ['update', 'set', 'where', 'andWhere', 'leftJoinAndSelect', 'orderBy', 'skip', 'take']) {
    const m = (mockQueryBuilder as any)[method];
    if (typeof m?.mockReturnThis === 'function') m.mockReturnThis();
  }
};

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

    // M1-B2(2026-10-04)：categoryId 可选——未传时不校验分类直接创建；
    // "传了但不存在" 的 404 行为由上一用例保留。
    it('should create product without categoryId (category optional)', async () => {
      const dataWithoutCategory = { ...createProductData, categoryId: undefined };
      mockProductRepository.create.mockReturnValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(mockProduct);
      mockCacheManager.del.mockResolvedValue(true);
      mockProductEventsService.publishProductCreated.mockResolvedValue(undefined);
      mockSearchManagerService.indexProduct.mockResolvedValue(undefined);

      const result = await service.create(dataWithoutCategory);

      expect(result).toEqual(mockProduct);
      expect(mockCategoryRepository.findOne).not.toHaveBeenCalled();
      expect(mockProductRepository.create).toHaveBeenCalledWith({
        ...dataWithoutCategory,
        category: undefined,
        publishedAt: expect.any(Date),
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
        300000,
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

    // R3(反查 P2-2)：引擎在线路径的 DB 回填必须复检 isActive——引擎索引与 DB 短暂不一致时
    // （下架事件异步、索引写失败重试中），下架品不得借搜索结果回流给前台。
    it('should re-check isActive when backfilling products from search engine hits', async () => {
      const activeProduct = { ...mockProduct, id: 1, isActive: true };
      const searchResult = {
        hits: [{ id: '1' }, { id: '2' }], // 引擎返回了已下架的 id=2
        total: 2,
      };

      mockSearchManagerService.search.mockResolvedValue(searchResult);
      // DB 复检后只有 id=1 在售（模拟 id=2 已下架被 where isActive:true 过滤）
      mockProductRepository.find.mockResolvedValue([activeProduct]);

      const result = await service.search(searchOptions);

      expect(mockProductRepository.find).toHaveBeenCalledWith({
        where: { id: In([1, 2]), isActive: true },
        relations: ['category', 'images'],
      });
      expect(result.products).toEqual([activeProduct]);
      expect(result.products.every((p: Product) => p.isActive !== false)).toBe(true);
    });

    // M1-B7(2026-10-04)：databaseSearch 的 tags 过滤双方言——
    // SQLite/Postgres 用 (',' || tags || ',') LIKE '%,tag,%'，MySQL/TiDB 保留 FIND_IN_SET。
    describe('tags 过滤方言（B7）', () => {
      const tagOptions = { tags: ['真皮', '手提'], page: 1, limit: 10 };

      it('SQLite（默认/未知类型）走 LIKE 等值匹配，不用 FIND_IN_SET', async () => {
        // mockConfigService 默认对 master.database.type 返回 null → service 按 sqlite 分支
        const qb = createMockQueryBuilder<Product>();
        qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);
        mockProductRepository.createQueryBuilder.mockReturnValue(qb);

        const result = await service.search(tagOptions);

        expect(result.total).toBe(1);
        expect(qb.andWhere).toHaveBeenCalledWith("(',' || product.tags || ',') LIKE :tag0", {
          tag0: '%,真皮,%',
        });
        expect(qb.andWhere).toHaveBeenCalledWith("(',' || product.tags || ',') LIKE :tag1", {
          tag1: '%,手提,%',
        });
        const findInSetCalls = qb.andWhere.mock.calls.filter(([sql]: [string]) =>
          String(sql).includes('FIND_IN_SET'),
        );
        expect(findInSetCalls).toHaveLength(0);
      });

      it('MySQL/TiDB 保留 FIND_IN_SET 方言', async () => {
        mockConfigService.get.mockImplementation((key: string) =>
          key === 'master.database.type' ? 'mysql' : null,
        );
        const qb = createMockQueryBuilder<Product>();
        qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);
        mockProductRepository.createQueryBuilder.mockReturnValue(qb);

        await service.search(tagOptions);

        expect(qb.andWhere).toHaveBeenCalledWith('FIND_IN_SET(:tag0, product.tags)', {
          tag0: '真皮',
        });
        expect(qb.andWhere).toHaveBeenCalledWith('FIND_IN_SET(:tag1, product.tags)', {
          tag1: '手提',
        });
      });
    });
  });

  // M1-B3(2026-10-04)：公开 findOne 对下架品 404——与列表 isActive 过滤同一语义。
  describe('Find One (public)', () => {
    it('should return active product', async () => {
      mockCacheManager.get.mockResolvedValue(mockProduct);

      const result = await service.findOne(1);

      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException for inactive product', async () => {
      mockCacheManager.get.mockResolvedValue({ ...mockProduct, isActive: false });

      await expect(service.findOne(1)).rejects.toThrow(new NotFoundException());
    });

    it('should throw NotFoundException for missing product', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(new NotFoundException());
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
        600000,
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
      // 三修 P1-1：价格字段（price:120 ≤ 存量划线价 120 合法）走条件 UPDATE
      restoreQbChain();
      mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });

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
      // 条件 UPDATE 写价格（守卫随语句原子生效）
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ price: 120 });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'id = :id AND (originalPrice IS NULL OR originalPrice >= :guardPrice)',
        { id: 1, guardPrice: 120 },
      );
      // 其余字段经普通 update（价格已剥离，防二次无守卫写入）
      expect(mockProductRepository.update).toHaveBeenCalledWith(1, {
        name: '更新后的产品',
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

  // ─────────────────────────────────────────────────────────────
  // R1（P1·二次修复 2026-10-05）：PATCH 跨字段合并校验——
  // DTO 的 ValidatorConstraint 只看请求自带字段，单值 PATCH 跳过跨字段约束，
  // originalPrice<price 倒挂落库（X1 实锤 DB）。service 在 repository.update
  // 前构造「存量+增量」合并视图复检 originalPrice>=price（双方均非 null 时）。
  // 存量基线：mockProduct.price=100 / originalPrice=120。
  // ─────────────────────────────────────────────────────────────
  describe('Update Product R1 价格不变式（合并视图）', () => {
    beforeEach(() => {
      mockCacheManager.get.mockResolvedValue(null); // 缓存未命中，走 DB
      mockProductRepository.findOne.mockResolvedValue(mockProduct); // 存量价 100/120
      mockProductRepository.update.mockResolvedValue({ affected: 1 });
      mockCacheManager.del.mockResolvedValue(true);
      mockProductEventsService.publishProductUpdated.mockResolvedValue(undefined);
      mockSearchManagerService.indexProduct.mockResolvedValue(undefined);
      // 三修 P1-1：合法价格路径走条件 UPDATE，默认放行（affected=1）
      restoreQbChain();
      mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });
    });

    it('R1：单传 originalPrice=50（低于存量 price=100）→ 400，不落库', async () => {
      await expect(service.update(1, { originalPrice: 50 } as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mockProductRepository.update).not.toHaveBeenCalled();
      expect(mockQueryBuilder.execute).not.toHaveBeenCalled();
    });

    it('R1：单抬 price=150（高于存量 originalPrice=120）→ 400，不落库', async () => {
      await expect(service.update(1, { price: 150 } as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mockProductRepository.update).not.toHaveBeenCalled();
      expect(mockQueryBuilder.execute).not.toHaveBeenCalled();
    });

    it('R1：违例报文带字段明细（存量/提交/合并后三态）', async () => {
      let caught: any;
      try {
        await service.update(1, { originalPrice: 99.5 } as any);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(BadRequestException);
      expect(caught.getStatus()).toBe(400);
      const body = caught.getResponse();
      expect(body.message).toContain('划线原价不能低于现价');
      expect(body.details.price).toEqual({ stored: 100, submitted: undefined, effective: 100 });
      expect(body.details.originalPrice).toEqual({
        stored: 120,
        submitted: 99.5,
        effective: 99.5,
      });
    });

    it('R1：双向合法——originalPrice=130 走条件 UPDATE（守卫存量现价），不再经普通 update', async () => {
      await expect(service.update(1, { originalPrice: 130 } as any)).resolves.toBeDefined();
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ originalPrice: 130 });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'id = :id AND (price IS NULL OR price <= :guardOriginalPrice)',
        { id: 1, guardOriginalPrice: 130 },
      );
      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });

    it('R1：单抬 price=90（≤存量划线价）走条件 UPDATE（守卫存量划线价）', async () => {
      await expect(service.update(1, { price: 90 } as any)).resolves.toBeDefined();
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ price: 90 });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'id = :id AND (originalPrice IS NULL OR originalPrice >= :guardPrice)',
        { id: 1, guardPrice: 90 },
      );
      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });

    it('R1：originalPrice 显式传 null=清除划线价 → 合法透传（清除后无不变式，不经条件 UPDATE）', async () => {
      await expect(service.update(1, { originalPrice: null } as any)).resolves.toBeDefined();
      expect(mockQueryBuilder.execute).not.toHaveBeenCalled();
      expect(mockProductRepository.update).toHaveBeenCalledWith(1, { originalPrice: null });
    });

    it('R1：price 抬到恰等于存量 originalPrice（=120）走条件 UPDATE；同传双值合法走配对守卫', async () => {
      await expect(service.update(1, { price: 120 } as any)).resolves.toBeDefined();
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ price: 120 });
      await expect(
        service.update(1, { price: 150, originalPrice: 150 } as any),
      ).resolves.toBeDefined();
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ price: 150, originalPrice: 150 });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'id = :id AND (:pairOriginalPrice IS NULL OR :pairPrice IS NULL OR :pairOriginalPrice >= :pairPrice)',
        { id: 1, pairOriginalPrice: 150, pairPrice: 150 },
      );
      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });

    it('R1：抬价 + 显式清除划线价 → 单语句原子落库（无存量守卫，防误伤 409）', async () => {
      await expect(service.update(1, { price: 150, originalPrice: null } as any)).resolves.toBeDefined();
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ price: 150, originalPrice: null });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id', { id: 1 });
    });

    it('R1：不涉价格字段的 PATCH 不受影响（仍走普通 update）', async () => {
      await expect(service.update(1, { name: '新名字' } as any)).resolves.toBeDefined();
      expect(mockQueryBuilder.execute).not.toHaveBeenCalled();
      expect(mockProductRepository.update).toHaveBeenCalledWith(1, { name: '新名字' });
    });

    // M5(2026-10-05)：补货不自动上架——库归零自动下架后，管理员只 PATCH stock
    // 补货时不得连带 isActive=true（重新上架是人工决定，走 admin「上架」按钮）。
    // 锁在载荷形状：stock-only PATCH 的写库载荷不得出现 isActive 键。
    it('M5：补货只传 stock → 写库载荷不含 isActive（重新上架是人工决定）', async () => {
      await expect(service.update(1, { stock: 50 } as any)).resolves.toBeDefined();
      expect(mockProductRepository.update).toHaveBeenCalledWith(1, { stock: 50 });
      const payload = (mockProductRepository.update as any).mock.calls[0][1];
      expect('isActive' in payload).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // R2（P2·二次修复 2026-10-05）：specifications 浅合并——
  // 原实现整体替换，PATCH {specifications:{}} 把存量 factCard 静默清空，
  // 闸的合并视图随之后续取不到（两步废掉词表冲突检查，X1 实锤）。
  // 存量基线：mockProduct.specifications={color:'红色', size:'M'}。
  // ─────────────────────────────────────────────────────────────
  describe('Update Product R2 specifications 浅合并', () => {
    beforeEach(() => {
      mockCacheManager.get.mockResolvedValue(null);
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockProductRepository.update.mockResolvedValue({ affected: 1 });
      mockCacheManager.del.mockResolvedValue(true);
      mockProductEventsService.publishProductUpdated.mockResolvedValue(undefined);
      mockSearchManagerService.indexProduct.mockResolvedValue(undefined);
      // 三修 P1-1：涉价格载荷走条件 UPDATE
      restoreQbChain();
      mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });
    });

    it('R2：PATCH {specifications:{}} → 存量键全保留（factCard 不再被静默清空）', async () => {
      await service.update(1, { specifications: {} } as any);
      expect(mockProductRepository.update).toHaveBeenCalledWith(1, {
        specifications: { color: '红色', size: 'M' },
      });
    });

    it('R2：dto 键覆盖存量同名键、未提及键保留（浅合并语义）', async () => {
      await service.update(1, { specifications: { color: '蓝色', factCard: { bagType: '凯莉' } } } as any);
      expect(mockProductRepository.update).toHaveBeenCalledWith(1, {
        specifications: {
          color: '蓝色', // 覆盖
          size: 'M', // 保留
          factCard: { bagType: '凯莉' }, // 新增
        },
      });
    });

    it('R2：显式传 null=整体清空（合法语义原样透传）', async () => {
      await service.update(1, { specifications: null } as any);
      expect(mockProductRepository.update).toHaveBeenCalledWith(1, { specifications: null });
    });

    it('R2：不传 specifications（undefined）→ 不合并不动库内值（价格载荷走条件 UPDATE，set 面无 specifications）', async () => {
      await service.update(1, { price: 88 } as any);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ price: 88 });
      expect(mockProductRepository.update).not.toHaveBeenCalled();
      const setPayload = (mockQueryBuilder.set as any).mock.calls[0][0];
      expect('specifications' in setPayload).toBe(false);
    });

    it('R2：存量 specifications 为 null（旧数据）时浅合并从空对象起步', async () => {
      mockProductRepository.findOne.mockResolvedValue({ ...mockProduct, specifications: null } as any);
      await service.update(1, { specifications: { factCard: { bagType: '托特' } } } as any);
      expect(mockProductRepository.update).toHaveBeenCalledWith(1, {
        specifications: { factCard: { bagType: '托特' } },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // P1-1（三修 2026-10-05，fix2 §三 1）：并发 TOCTOU——条件 UPDATE 兜底。
  // check-then-act 无事务，两个各自合法的单字段 PATCH 并发交错可 DB 倒挂
  // （X1 4/5、X2 10/10 实锤）。价格写入改单条条件 UPDATE：守卫与写入同语句
  // 原子，affected=0 → 重读复检 → 409 带明细（与顺序面 400 区分）。
  // ─────────────────────────────────────────────────────────────
  describe('Update Product P1-1 条件 UPDATE 兜底（TOCTOU）', () => {
    beforeEach(() => {
      mockCacheManager.get.mockResolvedValue(null);
      mockProductRepository.findOne.mockResolvedValue(mockProduct); // 存量 100/120
      mockProductRepository.update.mockResolvedValue({ affected: 1 });
      mockCacheManager.del.mockResolvedValue(true);
      mockProductEventsService.publishProductUpdated.mockResolvedValue(undefined);
      mockSearchManagerService.indexProduct.mockResolvedValue(undefined);
      restoreQbChain();
      mockQueryBuilder.execute.mockResolvedValue({ affected: 1 }); // 默认放行，affected=0 用例内覆写
    });

    it('affected=0（并发写先行落库）→ 409 ConflictException，普通 update 不再执行', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 0 });
      // 首读（合并视图依据）：存量 100/120，price=115 合法；
      // 复检重读：另一并发写已把 originalPrice 降到 110（< 本次提交 115）→ 409 明细给真值
      mockProductRepository.findOne
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValue({ ...mockProduct, price: 100, originalPrice: 110 } as any);

      let caught: any;
      try {
        await service.update(1, { price: 115 } as any);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(ConflictException);
      expect(caught.getStatus()).toBe(409);
      expect(caught.getResponse().message).toContain('并发冲突');
      expect(caught.getResponse().details.originalPrice).toEqual({
        stored: 110,
        submitted: undefined,
        effective: 110,
      });
      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });

    it('affected=0 且行已消失（并发删除）→ 404 NotFoundException', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 0 });
      mockProductRepository.findOne
        .mockResolvedValueOnce(mockProduct) // 首读存在
        .mockResolvedValue(null); // 复检重读：已删
      await expect(service.update(1, { price: 115 } as any)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('affected=1 → 价格落库走条件 UPDATE，其余字段普通 update，两者载荷互斥', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });
      await service.update(1, { price: 110, name: '并发安全' } as any);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ price: 110 });
      expect(mockProductRepository.update).toHaveBeenCalledWith(1, { name: '并发安全' });
      const updatePayload = (mockProductRepository.update as any).mock.calls[0][1];
      expect('price' in updatePayload).toBe(false);
    });

    it('纯价格单字段 PATCH（无其余字段）→ 普通 update 整体跳过（空载荷不写）', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });
      await expect(service.update(1, { price: 110 } as any)).resolves.toBeDefined();
      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // P1-3（三修 2026-10-05，fix2 §三 3）：postgres 可移植——
  // PG decimal 列经 node-postgres 返回字符串，原 typeof==='number' 守卫
  // 在 PG 部署形态静默失效（Y1 P1）。合并视图 Number() 强转归一后两种
  // 部署形态等值（本块用字符串型存量/提交 mock 锁定）。
  // ─────────────────────────────────────────────────────────────
  describe('Update Product P1-3 PG 可移植（价格守卫 Number 归一）', () => {
    beforeEach(() => {
      mockCacheManager.get.mockResolvedValue(null);
      // PG 形态存量：decimal 列读出为字符串
      mockProductRepository.findOne.mockResolvedValue({
        ...mockProduct,
        price: '100.00',
        originalPrice: '120.00',
      } as any);
      mockProductRepository.update.mockResolvedValue({ affected: 1 });
      mockCacheManager.del.mockResolvedValue(true);
      mockProductEventsService.publishProductUpdated.mockResolvedValue(undefined);
      mockSearchManagerService.indexProduct.mockResolvedValue(undefined);
      restoreQbChain();
      mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });
    });

    it('字符串型存量 + 单传 originalPrice=50 → 合并视图归一后照常 400（PG 下不再静默失效）', async () => {
      await expect(service.update(1, { originalPrice: 50 } as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mockQueryBuilder.execute).not.toHaveBeenCalled();
    });

    it('字符串型存量 + 单抬 price=150 → 归一后照常 400', async () => {
      await expect(service.update(1, { price: 150 } as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mockQueryBuilder.execute).not.toHaveBeenCalled();
    });

    it('合法路径在字符串存量下照常走条件 UPDATE（守卫参数为归一后的数字）', async () => {
      await expect(service.update(1, { originalPrice: 130 } as any)).resolves.toBeDefined();
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ originalPrice: 130 });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'id = :id AND (price IS NULL OR price <= :guardOriginalPrice)',
        { id: 1, guardOriginalPrice: 130 },
      );
    });

    it('提交非法形状（非数字串/对象）→ 400 fail-clean（不落库不 500）', async () => {
      let caught: any;
      try {
        await service.update(1, { price: 'abc' } as any);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(BadRequestException);
      expect(caught.getResponse().message).toContain('price');
      await expect(service.update(1, { originalPrice: {} } as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('提交 price=null → 400 fail-clean（直调面兜底，防 NOT NULL 列 500）', async () => {
      await expect(service.update(1, { price: null } as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // P1-2（四修，fix3 裁定）：事件载荷快照——updateDataForEvent 必须在价格
  // 剥离【之前】取样。三修放在剥离后，纯价格 PATCH 的更新事件丢 price 字段
  // （publishProductUpdatedEvent 读 updateData.price=undefined，注释却写
  // "按提交意图报文"，Y1/Y2 源码级实证注释与代码相反）。上轮无测试覆盖
  // 事件载荷的 price——本块即防回归断言。
  // 存量基线：mockProduct.price=100 / originalPrice=120。
  // ─────────────────────────────────────────────────────────────
  describe('Update Product P1-2 事件载荷快照（价格剥离前取样）', () => {
    beforeEach(() => {
      mockCacheManager.get.mockResolvedValue(null);
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockProductRepository.update.mockResolvedValue({ affected: 1 });
      mockCacheManager.del.mockResolvedValue(true);
      mockProductEventsService.publishProductUpdated.mockResolvedValue(undefined);
      mockSearchManagerService.indexProduct.mockResolvedValue(undefined);
      restoreQbChain();
      mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });
    });

    it('纯价格 PATCH：事件载荷含 price（新价）与 oldPrice（存量价）——快照不被键剥离吃掉', async () => {
      await expect(service.update(1, { price: 110 } as any)).resolves.toBeDefined();
      expect(mockProductEventsService.publishProductUpdated).toHaveBeenCalledTimes(1);
      const event = mockProductEventsService.publishProductUpdated.mock.calls[0][0];
      expect(event.price).toBe(110); // 三修缺陷面：此处曾为 undefined
      expect(event.oldPrice).toBe(100);
      expect(event.productId).toBe(1);
      expect(typeof event.timestamp).toBe('string');
    });

    it('branch2（抬价+清划线）：事件载荷含 price=150（意图完整报文）', async () => {
      await expect(service.update(1, { price: 150, originalPrice: null } as any)).resolves.toBeDefined();
      const event = mockProductEventsService.publishProductUpdated.mock.calls[0][0];
      expect(event.price).toBe(150);
      expect(event.oldPrice).toBe(100);
    });

    it('混合载荷（price+name）：事件含 price 与 name，普通写载荷已剥离 price（两层各司其职）', async () => {
      await expect(service.update(1, { price: 90, name: '并发安全' } as any)).resolves.toBeDefined();
      const event = mockProductEventsService.publishProductUpdated.mock.calls[0][0];
      expect(event.price).toBe(90);
      expect(event.name).toBe('并发安全');
      // 写路径：价格走条件 UPDATE，普通 update 载荷无 price（P1-1 语义不回退）
      expect(mockProductRepository.update).toHaveBeenCalledWith(1, { name: '并发安全' });
    });

    it('不涉价格的 PATCH：事件 price 为 undefined（无价格提交，与旧契约一致）', async () => {
      await expect(service.update(1, { name: '新名字' } as any)).resolves.toBeDefined();
      const event = mockProductEventsService.publishProductUpdated.mock.calls[0][0];
      expect(event.price).toBeUndefined();
      expect(event.name).toBe('新名字');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 四修 P2：specifications 序列化 ≤10KB（service 层 400）。
  // create 按提交校验；update 按浅合并后的落库形状校验（合并视图才是真值）。
  // ─────────────────────────────────────────────────────────────
  describe('Update Product 四修 P2 specifications 10KB 上限', () => {
    beforeEach(() => {
      mockCacheManager.get.mockResolvedValue(null);
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockProductRepository.update.mockResolvedValue({ affected: 1 });
      mockCacheManager.del.mockResolvedValue(true);
      mockProductEventsService.publishProductUpdated.mockResolvedValue(undefined);
      mockSearchManagerService.indexProduct.mockResolvedValue(undefined);
    });

    it('create：>10KB 规格 → 400 fail-clean（不落库）', async () => {
      await expect(
        service.create({ ...createValidData, specifications: { blob: 'x'.repeat(10 * 1024) } } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockProductRepository.create).not.toHaveBeenCalled();
    });

    it('create：恰好 10KB 边界放行（≤10240 字符）', async () => {
      mockProductRepository.save.mockResolvedValue({ ...mockProduct, id: 2 });
      await expect(
        service.create({ ...createValidData, specifications: { blob: 'x'.repeat(10 * 1024 - 15) } } as any),
      ).resolves.toBeDefined();
    });

    it('update：浅合并后超限 → 400（提交小增量+存量近限=落库形状超限）', async () => {
      // 存量 10KB-50，提交增量 100 字符 → 合并后 10KB+50 → 400
      mockProductRepository.findOne.mockResolvedValue({
        ...mockProduct,
        specifications: { blob: 'x'.repeat(10 * 1024 - 50) },
      } as any);
      await expect(
        service.update(1, { specifications: { extra: 'y'.repeat(100) } } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });

    it('update：显式 null（整体清空）不校验大小——清空语义优先', async () => {
      mockProductRepository.findOne.mockResolvedValue({
        ...mockProduct,
        specifications: { blob: 'x'.repeat(11 * 1024) }, // 超限存量被显式清空
      } as any);
      await expect(service.update(1, { specifications: null } as any)).resolves.toBeDefined();
      expect(mockProductRepository.update).toHaveBeenCalledWith(1, { specifications: null });
    });
  });

  describe('Delete Product', () => {
    // M2-B6(2026-10-04)：DELETE 改软删——order_items→products FK NO ACTION 硬删必败，
    // 下架（isActive=false）即删除语义；repository.delete 不应再被调用。
    it('should soft-delete product by setting isActive=false', async () => {
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockProductRepository.update.mockResolvedValue({ affected: 1 });
      mockCacheManager.del.mockResolvedValue(true);
      mockSearchManagerService.deleteProduct.mockResolvedValue(undefined);

      await service.delete(1);

      expect(mockProductRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['category', 'images'],
      });
      expect(mockProductRepository.update).toHaveBeenCalledWith(1, { isActive: false });
      expect(mockProductRepository.delete).not.toHaveBeenCalled();
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

    // R1(反查 P2-1)：cache-manager@7（Keyv）TTL 单位为毫秒——list 30s 必须以 30000 落库，
    // 且配置缺省时默认值同样按秒换算（300 → 300000），防止 30-600ms 条目闪蒸发、零命中。
    it('should set list cache TTL in milliseconds even when config is missing', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'redis.keyPrefix') return 'caddy_shopping';
        return null; // performance.cache.ttl.list 未配置 → 默认 30s
      });
      mockCacheManager.get.mockResolvedValue(null);
      const qb = createMockQueryBuilder<Product>();
      qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);
      mockProductRepository.createQueryBuilder.mockReturnValue(qb);
      mockCacheManager.set.mockResolvedValue(true);

      await service.findAll({ page: 1, limit: 20 });

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'caddy_shopping:products:list:1:20:',
        { products: [mockProduct], total: 1 },
        30000,
      );
    });

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
        30000,
      );
      expect(mockMonitoringService.recordCacheMiss).toHaveBeenCalledWith(
        'caddy_shopping:products:list:1:20:测试',
      );
    });

    // M1-B3(2026-10-04)：公开列表必须过滤 isActive=true（下架品不得漏给前台）；
    // 管理端 includeInactive:true 不过滤，且走独立缓存键段防互相污染。
    it('should filter isActive=true by default (public list)', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      const qb = createMockQueryBuilder<Product>();
      qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);
      mockProductRepository.createQueryBuilder.mockReturnValue(qb);
      mockCacheManager.set.mockResolvedValue(true);

      await service.findAll({ page: 1, limit: 20 });

      expect(qb.where).toHaveBeenCalledWith('product.isActive = :isActive', { isActive: true });
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'caddy_shopping:products:list:1:20:',
        { products: [mockProduct], total: 1 },
        30000,
      );
    });

    it('should append search with andWhere on top of isActive filter', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      const qb = createMockQueryBuilder<Product>();
      qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);
      mockProductRepository.createQueryBuilder.mockReturnValue(qb);
      mockCacheManager.set.mockResolvedValue(true);

      await service.findAll(findAllOptions);

      expect(qb.where).toHaveBeenCalledWith('product.isActive = :isActive', { isActive: true });
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(product.name LIKE :search OR product.description LIKE :search)',
        { search: '%测试%' },
      );
    });

    it('should not filter isActive when includeInactive=true (admin list)', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      const qb = createMockQueryBuilder<Product>();
      qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);
      mockProductRepository.createQueryBuilder.mockReturnValue(qb);
      mockCacheManager.set.mockResolvedValue(true);

      const result = await service.findAll({ page: 1, limit: 50, includeInactive: true });

      expect(result.total).toBe(1);
      const isActiveCalls = qb.where.mock.calls.filter(([sql]: [string]) =>
        String(sql).includes('isActive'),
      );
      expect(isActiveCalls).toHaveLength(0);
      // 管理端变体使用独立缓存键段
      expect(mockCacheManager.get).toHaveBeenCalledWith('caddy_shopping:products:list:admin:1:50:');
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'caddy_shopping:products:list:admin:1:50:',
        { products: [mockProduct], total: 1 },
        30000,
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
        30000,
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
        60000,
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
