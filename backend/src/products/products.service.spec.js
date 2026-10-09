"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const cache_manager_1 = require("@nestjs/cache-manager");
const config_1 = require("@nestjs/config");
const common_1 = require("@nestjs/common");
const products_service_1 = require("./products.service");
const typed_mock_factory_1 = require("../../test/utils/typed-mock-factory");
const index_1 = require("../../test/utils/index");
const product_entity_1 = require("./entities/product.entity");
const category_entity_1 = require("./entities/category.entity");
const product_image_entity_1 = require("./entities/product-image.entity");
const monitoring_service_1 = require("../monitoring/monitoring.service");
const product_events_service_1 = require("../messaging/product-events.service");
const search_manager_service_1 = require("./search/search-manager.service");
const embedding_service_1 = require("./search/embedding.service");
const mockCategory = {
    id: 1,
    name: '测试分类',
    description: '测试分类描述',
    slug: 'test-category',
    isActive: true,
    sortOrder: 1,
    icon: '',
    children: [],
    parent: undefined,
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
const mockProductRepository = {
    create: (0, typed_mock_factory_1.createMockedFunction)(),
    save: (0, typed_mock_factory_1.createMockedFunction)(),
    findOne: (0, typed_mock_factory_1.createMockedFunction)(),
    find: (0, typed_mock_factory_1.createMockedFunction)(),
    update: (0, typed_mock_factory_1.createMockedFunction)(),
    delete: (0, typed_mock_factory_1.createMockedFunction)(),
    increment: (0, typed_mock_factory_1.createMockedFunction)(),
    count: (0, typed_mock_factory_1.createMockedFunction)(),
    createQueryBuilder: (0, typed_mock_factory_1.createMockedFunction)(),
};
const mockCategoryRepository = {
    findOne: (0, typed_mock_factory_1.createMockedFunction)(),
    find: (0, typed_mock_factory_1.createMockedFunction)(),
};
const mockProductImageRepository = {
    find: (0, typed_mock_factory_1.createMockedFunction)(),
};
const mockCacheManager = {
    get: (0, typed_mock_factory_1.createMockedFunction)(),
    set: (0, typed_mock_factory_1.createMockedFunction)(),
    del: (0, typed_mock_factory_1.createMockedFunction)(),
};
const mockConfigService = {
    get: (0, typed_mock_factory_1.createMockedFunction)(),
};
const mockMonitoringService = {
    observeRedisDuration: (0, typed_mock_factory_1.createMockedFunction)(),
    recordCacheHit: (0, typed_mock_factory_1.createMockedFunction)(),
    recordCacheMiss: (0, typed_mock_factory_1.createMockedFunction)(),
    observeDbQuery: (0, typed_mock_factory_1.createMockedFunction)(),
};
const mockProductEventsService = {
    publishProductCreated: (0, typed_mock_factory_1.createMockedFunction)(),
    publishProductUpdated: (0, typed_mock_factory_1.createMockedFunction)(),
    publishProductViewed: (0, typed_mock_factory_1.createMockedFunction)(),
    publishInventoryUpdated: (0, typed_mock_factory_1.createMockedFunction)(),
};
const mockEmbeddingService = { embedOne: jest.fn().mockResolvedValue([]), embed: jest.fn().mockResolvedValue([]) };
const mockSearchManagerService = {
    search: (0, typed_mock_factory_1.createMockedFunction)(),
    indexProduct: (0, typed_mock_factory_1.createMockedFunction)(),
    deleteProduct: (0, typed_mock_factory_1.createMockedFunction)(),
    indexProducts: (0, typed_mock_factory_1.createMockedFunction)(),
    getStatus: (0, typed_mock_factory_1.createMockedFunction)(),
};
const mockQueryBuilder = (0, index_1.createMockQueryBuilder)();
const restoreQbChain = () => {
    for (const method of ['update', 'set', 'where', 'andWhere', 'leftJoinAndSelect', 'orderBy', 'skip', 'take']) {
        const m = mockQueryBuilder[method];
        if (typeof m?.mockReturnThis === 'function')
            m.mockReturnThis();
    }
};
describe('ProductsService', () => {
    let service;
    let productRepository;
    let categoryRepository;
    let productImageRepository;
    let cacheManager;
    let configService;
    let monitoringService;
    let productEventsService;
    let searchManagerService;
    const originalEnv = process.env;
    beforeEach(async () => {
        jest.resetModules();
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                products_service_1.ProductsService,
                {
                    provide: (0, typeorm_2.getRepositoryToken)(product_entity_1.Product),
                    useValue: mockProductRepository,
                },
                {
                    provide: (0, typeorm_2.getRepositoryToken)(category_entity_1.Category),
                    useValue: mockCategoryRepository,
                },
                {
                    provide: (0, typeorm_2.getRepositoryToken)(product_image_entity_1.ProductImage),
                    useValue: mockProductImageRepository,
                },
                {
                    provide: cache_manager_1.CACHE_MANAGER,
                    useValue: mockCacheManager,
                },
                {
                    provide: config_1.ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: monitoring_service_1.MonitoringService,
                    useValue: mockMonitoringService,
                },
                {
                    provide: product_events_service_1.ProductEventsService,
                    useValue: mockProductEventsService,
                },
                {
                    provide: search_manager_service_1.SearchManagerService,
                    useValue: mockSearchManagerService,
                },
                { provide: embedding_service_1.EmbeddingService, useValue: mockEmbeddingService },
            ],
        }).compile();
        service = module.get(products_service_1.ProductsService);
        productRepository = module.get((0, typeorm_2.getRepositoryToken)(product_entity_1.Product));
        categoryRepository = module.get((0, typeorm_2.getRepositoryToken)(category_entity_1.Category));
        productImageRepository = module.get((0, typeorm_2.getRepositoryToken)(product_image_entity_1.ProductImage));
        cacheManager = module.get(cache_manager_1.CACHE_MANAGER);
        configService = module.get(config_1.ConfigService);
        monitoringService = module.get(monitoring_service_1.MonitoringService);
        productEventsService = module.get(product_events_service_1.ProductEventsService);
        searchManagerService = module.get(search_manager_service_1.SearchManagerService);
        Object.values(mockProductRepository).forEach(mock => mock.mockReset());
        Object.values(mockCategoryRepository).forEach(mock => mock.mockReset());
        Object.values(mockProductImageRepository).forEach(mock => mock.mockReset());
        Object.values(mockCacheManager).forEach(mock => mock.mockReset());
        Object.values(mockConfigService).forEach(mock => mock.mockReset());
        Object.values(mockMonitoringService).forEach(mock => mock.mockReset());
        Object.values(mockProductEventsService).forEach(mock => mock.mockReset());
        Object.values(mockSearchManagerService).forEach(mock => mock.mockReset());
        Object.values(mockQueryBuilder).forEach((mock) => mock.mockReset());
        mockConfigService.get.mockImplementation((key) => {
            const defaults = {
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
            await expect(service.create(createProductData)).rejects.toThrow(new common_1.NotFoundException());
            expect(mockCategoryRepository.findOne).toHaveBeenCalledWith({
                where: { id: createProductData.categoryId },
            });
        });
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
                relations: { category: true, images: true },
            });
            expect(mockCacheManager.set).toHaveBeenCalledWith('caddy_shopping:product:1', mockProduct, 300000);
            expect(mockMonitoringService.recordCacheMiss).toHaveBeenCalledWith('caddy_shopping:product:1');
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
            sortBy: 'name',
            sortOrder: 'ASC',
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
            const qb = (0, index_1.createMockQueryBuilder)();
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
            const qb = (0, index_1.createMockQueryBuilder)();
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
        it('should re-check isActive when backfilling products from search engine hits', async () => {
            const activeProduct = { ...mockProduct, id: 1, isActive: true };
            const searchResult = {
                hits: [{ id: '1' }, { id: '2' }],
                total: 2,
            };
            mockSearchManagerService.search.mockResolvedValue(searchResult);
            mockProductRepository.find.mockResolvedValue([activeProduct]);
            const result = await service.search(searchOptions);
            expect(mockProductRepository.find).toHaveBeenCalledWith({
                where: { id: (0, typeorm_1.In)([1, 2]), isActive: true },
                relations: { category: true, images: true },
            });
            expect(result.products).toEqual([activeProduct]);
            expect(result.products.every((p) => p.isActive !== false)).toBe(true);
        });
        describe('tags 过滤方言（B7）', () => {
            const tagOptions = { tags: ['真皮', '手提'], page: 1, limit: 10 };
            it('SQLite（默认/未知类型）走 LIKE 等值匹配，不用 FIND_IN_SET', async () => {
                const qb = (0, index_1.createMockQueryBuilder)();
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
                const findInSetCalls = qb.andWhere.mock.calls.filter(([sql]) => String(sql).includes('FIND_IN_SET'));
                expect(findInSetCalls).toHaveLength(0);
            });
            it('MySQL/TiDB 保留 FIND_IN_SET 方言', async () => {
                mockConfigService.get.mockImplementation((key) => key === 'master.database.type' ? 'mysql' : null);
                const qb = (0, index_1.createMockQueryBuilder)();
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
    describe('Find One (public)', () => {
        it('should return active product', async () => {
            mockCacheManager.get.mockResolvedValue(mockProduct);
            const result = await service.findOne(1);
            expect(result).toEqual(mockProduct);
        });
        it('should throw NotFoundException for inactive product', async () => {
            mockCacheManager.get.mockResolvedValue({ ...mockProduct, isActive: false });
            await expect(service.findOne(1)).rejects.toThrow(new common_1.NotFoundException());
        });
        it('should throw NotFoundException for missing product', async () => {
            mockCacheManager.get.mockResolvedValue(null);
            mockProductRepository.findOne.mockResolvedValue(null);
            await expect(service.findOne(999)).rejects.toThrow(new common_1.NotFoundException());
        });
    });
    describe('Get Popular Products', () => {
        it('should return cached popular products when available', async () => {
            mockCacheManager.get.mockResolvedValue([mockProduct]);
            mockMonitoringService.recordCacheHit.mockResolvedValue(undefined);
            const result = await service.getPopularProducts(10);
            expect(result).toEqual([mockProduct]);
            expect(mockCacheManager.get).toHaveBeenCalledWith('caddy_shopping:popular:products:10');
            expect(mockMonitoringService.recordCacheHit).toHaveBeenCalledWith('caddy_shopping:popular:products:10');
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
                relations: { category: true, images: true },
            });
            expect(mockCacheManager.set).toHaveBeenCalledWith('caddy_shopping:popular:products:10', [mockProduct], 600000);
            expect(mockMonitoringService.recordCacheMiss).toHaveBeenCalledWith('caddy_shopping:popular:products:10');
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
            restoreQbChain();
            mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });
            let callCount = 0;
            mockProductRepository.findOne.mockImplementation(() => {
                callCount++;
                return Promise.resolve(callCount === 1 ? mockProduct : { ...mockProduct, name: '更新后的产品' });
            });
            const result = await service.update(1, updateProductData);
            expect(result).toEqual({ ...mockProduct, name: '更新后的产品' });
            expect(mockQueryBuilder.update).toHaveBeenCalled();
            expect(mockQueryBuilder.set).toHaveBeenCalledWith({ price: 120 });
            expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id AND (originalPrice IS NULL OR originalPrice >= :guardPrice)', { id: 1, guardPrice: 120 });
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
            mockCacheManager.get.mockResolvedValue(null);
            mockProductRepository.findOne.mockResolvedValue(null);
            await expect(service.update(999, updateProductData)).rejects.toThrow(new common_1.NotFoundException());
        });
        it('should throw NotFoundException when new category does not exist', async () => {
            mockProductRepository.findOne.mockResolvedValueOnce(mockProduct);
            mockCategoryRepository.findOne.mockResolvedValue(null);
            try {
                await service.update(1, updateProductData);
                expect(true).toBe(false);
            }
            catch (error) {
                expect(error).toBeInstanceOf(common_1.NotFoundException);
            }
        });
    });
    describe('Update Product R1 价格不变式（合并视图）', () => {
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
        it('R1：单传 originalPrice=50（低于存量 price=100）→ 400，不落库', async () => {
            await expect(service.update(1, { originalPrice: 50 })).rejects.toBeInstanceOf(common_1.BadRequestException);
            expect(mockProductRepository.update).not.toHaveBeenCalled();
            expect(mockQueryBuilder.execute).not.toHaveBeenCalled();
        });
        it('R1：单抬 price=150（高于存量 originalPrice=120）→ 400，不落库', async () => {
            await expect(service.update(1, { price: 150 })).rejects.toBeInstanceOf(common_1.BadRequestException);
            expect(mockProductRepository.update).not.toHaveBeenCalled();
            expect(mockQueryBuilder.execute).not.toHaveBeenCalled();
        });
        it('R1：违例报文带字段明细（存量/提交/合并后三态）', async () => {
            let caught;
            try {
                await service.update(1, { originalPrice: 99.5 });
            }
            catch (e) {
                caught = e;
            }
            expect(caught).toBeInstanceOf(common_1.BadRequestException);
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
            await expect(service.update(1, { originalPrice: 130 })).resolves.toBeDefined();
            expect(mockQueryBuilder.set).toHaveBeenCalledWith({ originalPrice: 130 });
            expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id AND (price IS NULL OR price <= :guardOriginalPrice)', { id: 1, guardOriginalPrice: 130 });
            expect(mockProductRepository.update).not.toHaveBeenCalled();
        });
        it('R1：单抬 price=90（≤存量划线价）走条件 UPDATE（守卫存量划线价）', async () => {
            await expect(service.update(1, { price: 90 })).resolves.toBeDefined();
            expect(mockQueryBuilder.set).toHaveBeenCalledWith({ price: 90 });
            expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id AND (originalPrice IS NULL OR originalPrice >= :guardPrice)', { id: 1, guardPrice: 90 });
            expect(mockProductRepository.update).not.toHaveBeenCalled();
        });
        it('R1：originalPrice 显式传 null=清除划线价 → 合法透传（清除后无不变式，不经条件 UPDATE）', async () => {
            await expect(service.update(1, { originalPrice: null })).resolves.toBeDefined();
            expect(mockQueryBuilder.execute).not.toHaveBeenCalled();
            expect(mockProductRepository.update).toHaveBeenCalledWith(1, { originalPrice: null });
        });
        it('R1：price 抬到恰等于存量 originalPrice（=120）走条件 UPDATE；同传双值合法走配对守卫', async () => {
            await expect(service.update(1, { price: 120 })).resolves.toBeDefined();
            expect(mockQueryBuilder.set).toHaveBeenCalledWith({ price: 120 });
            await expect(service.update(1, { price: 150, originalPrice: 150 })).resolves.toBeDefined();
            expect(mockQueryBuilder.set).toHaveBeenCalledWith({ price: 150, originalPrice: 150 });
            expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id AND (:pairOriginalPrice IS NULL OR :pairPrice IS NULL OR :pairOriginalPrice >= :pairPrice)', { id: 1, pairOriginalPrice: 150, pairPrice: 150 });
            expect(mockProductRepository.update).not.toHaveBeenCalled();
        });
        it('R1：抬价 + 显式清除划线价 → 单语句原子落库（无存量守卫，防误伤 409）', async () => {
            await expect(service.update(1, { price: 150, originalPrice: null })).resolves.toBeDefined();
            expect(mockQueryBuilder.set).toHaveBeenCalledWith({ price: 150, originalPrice: null });
            expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id', { id: 1 });
        });
        it('R1：不涉价格字段的 PATCH 不受影响（仍走普通 update）', async () => {
            await expect(service.update(1, { name: '新名字' })).resolves.toBeDefined();
            expect(mockQueryBuilder.execute).not.toHaveBeenCalled();
            expect(mockProductRepository.update).toHaveBeenCalledWith(1, { name: '新名字' });
        });
        it('M5：补货只传 stock → 写库载荷不含 isActive（重新上架是人工决定）', async () => {
            await expect(service.update(1, { stock: 50 })).resolves.toBeDefined();
            expect(mockProductRepository.update).toHaveBeenCalledWith(1, { stock: 50 });
            const payload = mockProductRepository.update.mock.calls[0][1];
            expect('isActive' in payload).toBe(false);
        });
    });
    describe('Update Product R2 specifications 浅合并', () => {
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
        it('R2：PATCH {specifications:{}} → 存量键全保留（factCard 不再被静默清空）', async () => {
            await service.update(1, { specifications: {} });
            expect(mockProductRepository.update).toHaveBeenCalledWith(1, {
                specifications: { color: '红色', size: 'M' },
            });
        });
        it('R2：dto 键覆盖存量同名键、未提及键保留（浅合并语义）', async () => {
            await service.update(1, { specifications: { color: '蓝色', factCard: { bagType: '凯莉' } } });
            expect(mockProductRepository.update).toHaveBeenCalledWith(1, {
                specifications: {
                    color: '蓝色',
                    size: 'M',
                    factCard: { bagType: '凯莉' },
                },
            });
        });
        it('R2：显式传 null=整体清空（合法语义原样透传）', async () => {
            await service.update(1, { specifications: null });
            expect(mockProductRepository.update).toHaveBeenCalledWith(1, { specifications: null });
        });
        it('R2：不传 specifications（undefined）→ 不合并不动库内值（价格载荷走条件 UPDATE，set 面无 specifications）', async () => {
            await service.update(1, { price: 88 });
            expect(mockQueryBuilder.set).toHaveBeenCalledWith({ price: 88 });
            expect(mockProductRepository.update).not.toHaveBeenCalled();
            const setPayload = mockQueryBuilder.set.mock.calls[0][0];
            expect('specifications' in setPayload).toBe(false);
        });
        it('R2：存量 specifications 为 null（旧数据）时浅合并从空对象起步', async () => {
            mockProductRepository.findOne.mockResolvedValue({ ...mockProduct, specifications: null });
            await service.update(1, { specifications: { factCard: { bagType: '托特' } } });
            expect(mockProductRepository.update).toHaveBeenCalledWith(1, {
                specifications: { factCard: { bagType: '托特' } },
            });
        });
    });
    describe('Update Product P1-1 条件 UPDATE 兜底（TOCTOU）', () => {
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
        it('affected=0（并发写先行落库）→ 409 ConflictException，普通 update 不再执行', async () => {
            mockQueryBuilder.execute.mockResolvedValue({ affected: 0 });
            mockProductRepository.findOne
                .mockResolvedValueOnce(mockProduct)
                .mockResolvedValue({ ...mockProduct, price: 100, originalPrice: 110 });
            let caught;
            try {
                await service.update(1, { price: 115 });
            }
            catch (e) {
                caught = e;
            }
            expect(caught).toBeInstanceOf(common_1.ConflictException);
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
                .mockResolvedValueOnce(mockProduct)
                .mockResolvedValue(null);
            await expect(service.update(1, { price: 115 })).rejects.toBeInstanceOf(common_1.NotFoundException);
        });
        it('affected=1 → 价格落库走条件 UPDATE，其余字段普通 update，两者载荷互斥', async () => {
            mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });
            await service.update(1, { price: 110, name: '并发安全' });
            expect(mockQueryBuilder.set).toHaveBeenCalledWith({ price: 110 });
            expect(mockProductRepository.update).toHaveBeenCalledWith(1, { name: '并发安全' });
            const updatePayload = mockProductRepository.update.mock.calls[0][1];
            expect('price' in updatePayload).toBe(false);
        });
        it('纯价格单字段 PATCH（无其余字段）→ 普通 update 整体跳过（空载荷不写）', async () => {
            mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });
            await expect(service.update(1, { price: 110 })).resolves.toBeDefined();
            expect(mockProductRepository.update).not.toHaveBeenCalled();
        });
    });
    describe('Update Product P1-3 PG 可移植（价格守卫 Number 归一）', () => {
        beforeEach(() => {
            mockCacheManager.get.mockResolvedValue(null);
            mockProductRepository.findOne.mockResolvedValue({
                ...mockProduct,
                price: '100.00',
                originalPrice: '120.00',
            });
            mockProductRepository.update.mockResolvedValue({ affected: 1 });
            mockCacheManager.del.mockResolvedValue(true);
            mockProductEventsService.publishProductUpdated.mockResolvedValue(undefined);
            mockSearchManagerService.indexProduct.mockResolvedValue(undefined);
            restoreQbChain();
            mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });
        });
        it('字符串型存量 + 单传 originalPrice=50 → 合并视图归一后照常 400（PG 下不再静默失效）', async () => {
            await expect(service.update(1, { originalPrice: 50 })).rejects.toBeInstanceOf(common_1.BadRequestException);
            expect(mockQueryBuilder.execute).not.toHaveBeenCalled();
        });
        it('字符串型存量 + 单抬 price=150 → 归一后照常 400', async () => {
            await expect(service.update(1, { price: 150 })).rejects.toBeInstanceOf(common_1.BadRequestException);
            expect(mockQueryBuilder.execute).not.toHaveBeenCalled();
        });
        it('合法路径在字符串存量下照常走条件 UPDATE（守卫参数为归一后的数字）', async () => {
            await expect(service.update(1, { originalPrice: 130 })).resolves.toBeDefined();
            expect(mockQueryBuilder.set).toHaveBeenCalledWith({ originalPrice: 130 });
            expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id AND (price IS NULL OR price <= :guardOriginalPrice)', { id: 1, guardOriginalPrice: 130 });
        });
        it('提交非法形状（非数字串/对象）→ 400 fail-clean（不落库不 500）', async () => {
            let caught;
            try {
                await service.update(1, { price: 'abc' });
            }
            catch (e) {
                caught = e;
            }
            expect(caught).toBeInstanceOf(common_1.BadRequestException);
            expect(caught.getResponse().message).toContain('price');
            await expect(service.update(1, { originalPrice: {} })).rejects.toBeInstanceOf(common_1.BadRequestException);
        });
        it('提交 price=null → 400 fail-clean（直调面兜底，防 NOT NULL 列 500）', async () => {
            await expect(service.update(1, { price: null })).rejects.toBeInstanceOf(common_1.BadRequestException);
        });
    });
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
            await expect(service.update(1, { price: 110 })).resolves.toBeDefined();
            expect(mockProductEventsService.publishProductUpdated).toHaveBeenCalledTimes(1);
            const event = mockProductEventsService.publishProductUpdated.mock.calls[0][0];
            expect(event.price).toBe(110);
            expect(event.oldPrice).toBe(100);
            expect(event.productId).toBe(1);
            expect(typeof event.timestamp).toBe('string');
        });
        it('branch2（抬价+清划线）：事件载荷含 price=150（意图完整报文）', async () => {
            await expect(service.update(1, { price: 150, originalPrice: null })).resolves.toBeDefined();
            const event = mockProductEventsService.publishProductUpdated.mock.calls[0][0];
            expect(event.price).toBe(150);
            expect(event.oldPrice).toBe(100);
        });
        it('混合载荷（price+name）：事件含 price 与 name，普通写载荷已剥离 price（两层各司其职）', async () => {
            await expect(service.update(1, { price: 90, name: '并发安全' })).resolves.toBeDefined();
            const event = mockProductEventsService.publishProductUpdated.mock.calls[0][0];
            expect(event.price).toBe(90);
            expect(event.name).toBe('并发安全');
            expect(mockProductRepository.update).toHaveBeenCalledWith(1, { name: '并发安全' });
        });
        it('不涉价格的 PATCH：事件 price 为 undefined（无价格提交，与旧契约一致）', async () => {
            await expect(service.update(1, { name: '新名字' })).resolves.toBeDefined();
            const event = mockProductEventsService.publishProductUpdated.mock.calls[0][0];
            expect(event.price).toBeUndefined();
            expect(event.name).toBe('新名字');
        });
    });
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
            await expect(service.create({ ...createValidData, specifications: { blob: 'x'.repeat(10 * 1024) } })).rejects.toBeInstanceOf(common_1.BadRequestException);
            expect(mockProductRepository.create).not.toHaveBeenCalled();
        });
        it('create：恰好 10KB 边界放行（≤10240 字符）', async () => {
            mockProductRepository.save.mockResolvedValue({ ...mockProduct, id: 2 });
            await expect(service.create({ ...createValidData, specifications: { blob: 'x'.repeat(10 * 1024 - 15) } })).resolves.toBeDefined();
        });
        it('update：浅合并后超限 → 400（提交小增量+存量近限=落库形状超限）', async () => {
            mockProductRepository.findOne.mockResolvedValue({
                ...mockProduct,
                specifications: { blob: 'x'.repeat(10 * 1024 - 50) },
            });
            await expect(service.update(1, { specifications: { extra: 'y'.repeat(100) } })).rejects.toBeInstanceOf(common_1.BadRequestException);
            expect(mockProductRepository.update).not.toHaveBeenCalled();
        });
        it('update：显式 null（整体清空）不校验大小——清空语义优先', async () => {
            mockProductRepository.findOne.mockResolvedValue({
                ...mockProduct,
                specifications: { blob: 'x'.repeat(11 * 1024) },
            });
            await expect(service.update(1, { specifications: null })).resolves.toBeDefined();
            expect(mockProductRepository.update).toHaveBeenCalledWith(1, { specifications: null });
        });
    });
    describe('Delete Product', () => {
        it('should soft-delete product by setting isActive=false', async () => {
            mockProductRepository.findOne.mockResolvedValue(mockProduct);
            mockProductRepository.update.mockResolvedValue({ affected: 1 });
            mockCacheManager.del.mockResolvedValue(true);
            mockSearchManagerService.deleteProduct.mockResolvedValue(undefined);
            await service.delete(1);
            expect(mockProductRepository.findOne).toHaveBeenCalledWith({
                where: { id: 1 },
                relations: { category: true, images: true },
            });
            expect(mockProductRepository.update).toHaveBeenCalledWith(1, { isActive: false });
            expect(mockProductRepository.delete).not.toHaveBeenCalled();
            expect(mockCacheManager.del).toHaveBeenCalledWith('caddy_shopping:product:1');
        });
        it('should throw NotFoundException when product does not exist', async () => {
            mockProductRepository.findOne.mockResolvedValue(null);
            await expect(service.delete(999)).rejects.toThrow(new common_1.NotFoundException());
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
    describe('Get Statistics', () => {
        it('should return product statistics', async () => {
            mockProductRepository.count.mockReset();
            mockProductRepository.count
                .mockResolvedValueOnce(100)
                .mockResolvedValueOnce(80)
                .mockResolvedValueOnce(5);
            const qb = (0, index_1.createMockQueryBuilder)();
            qb.select.mockReturnThis();
            qb.getRawOne.mockResolvedValue({ totalSales: '1000' });
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
        it('should set list cache TTL in milliseconds even when config is missing', async () => {
            mockConfigService.get.mockImplementation((key) => {
                if (key === 'redis.keyPrefix')
                    return 'caddy_shopping';
                return null;
            });
            mockCacheManager.get.mockResolvedValue(null);
            const qb = (0, index_1.createMockQueryBuilder)();
            qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);
            mockProductRepository.createQueryBuilder.mockReturnValue(qb);
            mockCacheManager.set.mockResolvedValue(true);
            await service.findAll({ page: 1, limit: 20 });
            expect(mockCacheManager.set).toHaveBeenCalledWith('caddy_shopping:products:list:1:20:', { products: [mockProduct], total: 1 }, 30000);
        });
        it('should return cached products when available', async () => {
            const cachedResult = { products: [mockProduct], total: 1 };
            mockCacheManager.get.mockResolvedValue(cachedResult);
            mockMonitoringService.recordCacheHit.mockResolvedValue(undefined);
            const result = await service.findAll(findAllOptions);
            expect(result).toEqual(cachedResult);
            expect(mockCacheManager.get).toHaveBeenCalledWith('caddy_shopping:products:list:1:20:测试');
            expect(mockMonitoringService.recordCacheHit).toHaveBeenCalledWith('caddy_shopping:products:list:1:20:测试');
            expect(mockQueryBuilder.getManyAndCount).not.toHaveBeenCalled();
        });
        it('should fetch from database when not cached', async () => {
            mockCacheManager.get.mockResolvedValue(null);
            const qb = (0, index_1.createMockQueryBuilder)();
            qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);
            mockProductRepository.createQueryBuilder.mockReturnValue(qb);
            mockCacheManager.set.mockResolvedValue(true);
            mockMonitoringService.recordCacheMiss.mockResolvedValue(undefined);
            const result = await service.findAll(findAllOptions);
            expect(result).toEqual({ products: [mockProduct], total: 1 });
            expect(qb.getManyAndCount).toHaveBeenCalled();
            expect(mockCacheManager.set).toHaveBeenCalledWith('caddy_shopping:products:list:1:20:测试', { products: [mockProduct], total: 1 }, 30000);
            expect(mockMonitoringService.recordCacheMiss).toHaveBeenCalledWith('caddy_shopping:products:list:1:20:测试');
        });
        it('should filter isActive=true by default (public list)', async () => {
            mockCacheManager.get.mockResolvedValue(null);
            const qb = (0, index_1.createMockQueryBuilder)();
            qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);
            mockProductRepository.createQueryBuilder.mockReturnValue(qb);
            mockCacheManager.set.mockResolvedValue(true);
            await service.findAll({ page: 1, limit: 20 });
            expect(qb.where).toHaveBeenCalledWith('product.isActive = :isActive', { isActive: true });
            expect(qb.andWhere).not.toHaveBeenCalled();
            expect(mockCacheManager.set).toHaveBeenCalledWith('caddy_shopping:products:list:1:20:', { products: [mockProduct], total: 1 }, 30000);
        });
        it('should append search with andWhere on top of isActive filter', async () => {
            mockCacheManager.get.mockResolvedValue(null);
            const qb = (0, index_1.createMockQueryBuilder)();
            qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);
            mockProductRepository.createQueryBuilder.mockReturnValue(qb);
            mockCacheManager.set.mockResolvedValue(true);
            await service.findAll(findAllOptions);
            expect(qb.where).toHaveBeenCalledWith('product.isActive = :isActive', { isActive: true });
            expect(qb.andWhere).toHaveBeenCalledWith('(product.name LIKE :search OR product.description LIKE :search)', { search: '%测试%' });
        });
        it('should not filter isActive when includeInactive=true (admin list)', async () => {
            mockCacheManager.get.mockResolvedValue(null);
            const qb = (0, index_1.createMockQueryBuilder)();
            qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);
            mockProductRepository.createQueryBuilder.mockReturnValue(qb);
            mockCacheManager.set.mockResolvedValue(true);
            const result = await service.findAll({ page: 1, limit: 50, includeInactive: true });
            expect(result.total).toBe(1);
            const isActiveCalls = qb.where.mock.calls.filter(([sql]) => String(sql).includes('isActive'));
            expect(isActiveCalls).toHaveLength(0);
            expect(mockCacheManager.get).toHaveBeenCalledWith('caddy_shopping:products:list:admin:1:50:');
            expect(mockCacheManager.set).toHaveBeenCalledWith('caddy_shopping:products:list:admin:1:50:', { products: [mockProduct], total: 1 }, 30000);
        });
    });
    describe('Find By Category', () => {
        it('should return cached products when available', async () => {
            mockCacheManager.get.mockResolvedValue([mockProduct]);
            mockMonitoringService.recordCacheHit.mockResolvedValue(undefined);
            const result = await service.findByCategory('测试分类', 10);
            expect(result).toEqual([mockProduct]);
            expect(mockCacheManager.get).toHaveBeenCalledWith('caddy_shopping:products:category:测试分类:10');
            expect(mockMonitoringService.recordCacheHit).toHaveBeenCalledWith('caddy_shopping:products:category:测试分类:10');
            expect(mockQueryBuilder.getMany).not.toHaveBeenCalled();
        });
        it('should fetch from database when not cached', async () => {
            mockCacheManager.get.mockResolvedValue(null);
            const qb = (0, index_1.createMockQueryBuilder)();
            qb.getMany.mockResolvedValue([mockProduct]);
            mockProductRepository.createQueryBuilder.mockReturnValue(qb);
            mockCacheManager.set.mockResolvedValue(true);
            mockMonitoringService.recordCacheMiss.mockResolvedValue(undefined);
            const result = await service.findByCategory('测试分类', 10);
            expect(result).toEqual([mockProduct]);
            expect(qb.getMany).toHaveBeenCalled();
            expect(mockCacheManager.set).toHaveBeenCalledWith('caddy_shopping:products:category:测试分类:10', [mockProduct], 30000);
            expect(mockMonitoringService.recordCacheMiss).toHaveBeenCalledWith('caddy_shopping:products:category:测试分类:10');
        });
    });
    describe('Get Categories', () => {
        it('should return cached categories when available', async () => {
            mockCacheManager.get.mockResolvedValue([mockCategory]);
            mockMonitoringService.recordCacheHit.mockResolvedValue(undefined);
            const result = await service.getCategories();
            expect(result).toEqual([mockCategory]);
            expect(mockCacheManager.get).toHaveBeenCalledWith('caddy_shopping:categories:all');
            expect(mockMonitoringService.recordCacheHit).toHaveBeenCalledWith('caddy_shopping:categories:all');
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
                relations: { products: true },
            });
            expect(mockCacheManager.set).toHaveBeenCalledWith('caddy_shopping:categories:all', [mockCategory], 60000);
            expect(mockMonitoringService.recordCacheMiss).toHaveBeenCalledWith('caddy_shopping:categories:all');
        });
    });
    describe('Integration Scenarios', () => {
        it('should handle complete product lifecycle', async () => {
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
            mockCacheManager.get.mockResolvedValue(null);
            mockProductRepository.findOne.mockResolvedValue(mockProduct);
            mockCacheManager.set.mockResolvedValue(true);
            const found = await service.findById(1);
            expect(found).toEqual(mockProduct);
            mockProductRepository.findOne.mockResolvedValue(mockProduct);
            mockCategoryRepository.findOne.mockResolvedValue(mockCategory);
            mockProductRepository.update.mockResolvedValue({ affected: 1 });
            mockProductEventsService.publishProductUpdated.mockResolvedValue(undefined);
            mockSearchManagerService.indexProduct.mockResolvedValue(undefined);
            const updated = await service.update(1, { name: '更新产品' });
            expect(updated).toBeDefined();
            mockProductRepository.findOne.mockResolvedValue(mockProduct);
            mockProductRepository.delete.mockResolvedValue({ affected: 1 });
            await service.delete(1);
        });
        it('should handle cache invalidation across operations', async () => {
            mockCategoryRepository.findOne.mockResolvedValue(mockCategory);
            mockProductRepository.create.mockReturnValue(mockProduct);
            mockProductRepository.save.mockResolvedValue(mockProduct);
            mockCacheManager.del.mockResolvedValue(true);
            mockProductEventsService.publishProductCreated.mockResolvedValue(undefined);
            mockSearchManagerService.indexProduct.mockResolvedValue(undefined);
            await service.create({
                name: '新产品',
                description: '描述',
                price: 100,
                stock: 50,
                categoryId: 1,
            });
            expect(mockCacheManager.del).toHaveBeenCalledWith('caddy_shopping:product:1');
        });
    });
    describe('Error Handling', () => {
        it('should handle cache errors gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            mockCacheManager.get.mockRejectedValue(new Error('Cache error'));
            mockProductRepository.findOne.mockResolvedValue(mockProduct);
            mockCacheManager.set.mockResolvedValue(true);
            mockMonitoringService.recordCacheMiss.mockResolvedValue(undefined);
            const result = await service.findById(1);
            expect(result).toEqual(mockProduct);
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
            const qb = (0, index_1.createMockQueryBuilder)();
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
            expect(mockMonitoringService.recordCacheMiss).toHaveBeenCalledWith('caddy_shopping:product:1');
        });
        it('should record database query metrics', async () => {
            mockCacheManager.get.mockResolvedValue(null);
            mockProductRepository.findOne.mockResolvedValue(mockProduct);
            mockCacheManager.set.mockResolvedValue(true);
            mockMonitoringService.recordCacheMiss.mockResolvedValue(undefined);
            await service.findById(1);
            expect(mockMonitoringService.observeDbQuery).toHaveBeenCalledWith('detail', 'products', expect.any(Number));
        });
    });
});
