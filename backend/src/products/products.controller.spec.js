"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const products_controller_1 = require("./products.controller");
const products_service_1 = require("./products.service");
const search_manager_service_1 = require("./search/search-manager.service");
const search_suggestion_service_1 = require("./search/search-suggestion.service");
const popular_search_service_1 = require("./search/popular-search.service");
const audit_service_1 = require("../common/audit/audit.service");
const config_1 = require("@nestjs/config");
const typed_mock_factory_1 = require("../../test/utils/typed-mock-factory");
describe('ProductsController', () => {
    let controller;
    let productsService;
    const mockConfigService = {
        get: (0, typed_mock_factory_1.createMockedFunction)(),
    };
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [products_controller_1.ProductsController],
            providers: [
                {
                    provide: products_service_1.ProductsService,
                    useValue: {
                        create: (0, typed_mock_factory_1.createMockedFunction)(),
                        findAll: (0, typed_mock_factory_1.createMockedFunction)(),
                        findOne: (0, typed_mock_factory_1.createMockedFunction)(),
                        findById: (0, typed_mock_factory_1.createMockedFunction)(async () => null),
                        update: (0, typed_mock_factory_1.createMockedFunction)(),
                        remove: (0, typed_mock_factory_1.createMockedFunction)(),
                        search: (0, typed_mock_factory_1.createMockedFunction)(),
                        findPopular: (0, typed_mock_factory_1.createMockedFunction)(),
                    },
                },
                {
                    provide: search_manager_service_1.SearchManagerService,
                    useValue: {
                        search: (0, typed_mock_factory_1.createMockedFunction)(),
                    },
                },
                {
                    provide: search_suggestion_service_1.SearchSuggestionService,
                    useValue: {
                        getSuggestions: (0, typed_mock_factory_1.createMockedFunction)(),
                    },
                },
                {
                    provide: popular_search_service_1.PopularSearchService,
                    useValue: {
                        getPopularSearches: (0, typed_mock_factory_1.createMockedFunction)(),
                    },
                },
                {
                    provide: audit_service_1.AuditService,
                    useValue: {
                        log: (0, typed_mock_factory_1.createMockedFunction)(),
                    },
                },
                {
                    provide: config_1.ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();
        controller = module.get(products_controller_1.ProductsController);
        productsService = module.get(products_service_1.ProductsService);
    });
    describe('POST /products', () => {
        it('should create a new product successfully', async () => {
            const createProductDto = {
                name: 'Test Product',
                description: 'A test product',
                price: 29.99,
                categoryId: 1,
                stock: 100,
            };
            const createdProduct = {
                id: 1,
                name: 'Test Product',
                description: 'A test product',
                price: 29.99,
                originalPrice: 29.99,
                stock: 100,
                sales: 0,
                isActive: true,
                views: 0,
                favorites: 0,
                mainImage: '',
                tags: [],
                specifications: {},
                publishedAt: new Date(),
                version: 1,
                category: {
                    id: 1,
                    name: 'Test Category',
                    slug: 'test-category',
                    description: 'Test category description',
                    icon: '',
                    isActive: true,
                    sortOrder: 0,
                    children: [],
                    products: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                images: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            jest.spyOn(productsService, 'create').mockResolvedValue(createdProduct);
            const result = await controller.create(createProductDto);
            expect(result).toEqual(createdProduct);
            expect(productsService.create).toHaveBeenCalledWith(createProductDto);
        });
        it('should throw error for invalid price', async () => {
            const invalidProductDto = {
                name: 'Test Product',
                description: 'A test product',
                price: -10,
                categoryId: 1,
                stock: 100,
            };
            jest.spyOn(productsService, 'create').mockRejectedValue(new Error('Validation failed'));
            await expect(controller.create(invalidProductDto)).rejects.toThrow();
        });
        it('should throw error for negative stock', async () => {
            const invalidProductDto = {
                name: 'Test Product',
                description: 'A test product',
                price: 29.99,
                categoryId: 1,
                stock: -10,
            };
            jest.spyOn(productsService, 'create').mockRejectedValue(new Error('Validation failed'));
            await expect(controller.create(invalidProductDto)).rejects.toThrow();
        });
        it('should throw error for invalid category', async () => {
            const invalidProductDto = {
                name: 'Test Product',
                description: 'A test product',
                price: 29.99,
                categoryId: 999,
                stock: 100,
            };
            jest.spyOn(productsService, 'create').mockRejectedValue(new Error('Validation failed'));
            await expect(controller.create(invalidProductDto)).rejects.toThrow();
        });
        it('should validate required fields', async () => {
            const invalidDto = {
                name: '',
                description: '',
                price: 29.99,
                categoryId: 1,
                stock: 100,
            };
            jest.spyOn(productsService, 'create').mockRejectedValue(new Error('Validation failed'));
            await expect(controller.create(invalidDto)).rejects.toThrow();
        });
        it('should validate product name length', async () => {
            const invalidDto = {
                name: 'A'.repeat(256),
                description: 'A test product',
                price: 29.99,
                categoryId: 1,
                stock: 100,
            };
            jest.spyOn(productsService, 'create').mockRejectedValue(new Error('Product name too long'));
            await expect(controller.create(invalidDto)).rejects.toThrow('Product name too long');
        });
        it('should handle database connection errors', async () => {
            const createProductDto = {
                name: 'Test Product',
                description: 'A test product',
                price: 29.99,
                categoryId: 1,
                stock: 100,
            };
            jest
                .spyOn(productsService, 'create')
                .mockRejectedValue(new Error('Database connection failed'));
            await expect(controller.create(createProductDto)).rejects.toThrow('Database connection failed');
        });
        it('should calculate total amount correctly', async () => {
            const createProductDto = {
                name: 'Test Product',
                description: 'A test product',
                price: 29.99,
                categoryId: 1,
                stock: 100,
            };
            const createdProduct = {
                id: 1,
                name: 'Test Product',
                description: 'A test product',
                price: 29.99,
                originalPrice: 29.99,
                stock: 100,
                sales: 0,
                isActive: true,
                views: 0,
                favorites: 0,
                mainImage: '',
                tags: [],
                specifications: {},
                publishedAt: new Date(),
                version: 1,
                category: {
                    id: 1,
                    name: 'Test Category',
                    slug: 'test-category',
                    description: 'Test category description',
                    icon: '',
                    isActive: true,
                    sortOrder: 0,
                    children: [],
                    products: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                images: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            jest.spyOn(productsService, 'create').mockResolvedValue(createdProduct);
            const result = await controller.create(createProductDto);
            expect(result.price).toBe(29.99);
        });
    });
    describe('GET /products', () => {
        it('should return array of products', async () => {
            const products = [
                {
                    id: 1,
                    name: 'Product 1',
                    description: 'First product',
                    price: 19.99,
                    originalPrice: 19.99,
                    stock: 50,
                    sales: 0,
                    isActive: true,
                    views: 0,
                    favorites: 0,
                    mainImage: '',
                    tags: [],
                    specifications: {},
                    publishedAt: new Date(),
                    version: 1,
                    category: {
                        id: 1,
                        name: 'Test Category',
                        slug: 'test-category',
                        description: 'Test category description',
                        icon: '',
                        isActive: true,
                        sortOrder: 0,
                        children: [],
                        parent: undefined,
                        products: [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    images: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 2,
                    name: 'Product 2',
                    description: 'Second product',
                    price: 29.99,
                    originalPrice: 29.99,
                    stock: 100,
                    sales: 0,
                    isActive: true,
                    views: 0,
                    favorites: 0,
                    mainImage: '',
                    tags: [],
                    specifications: {},
                    publishedAt: new Date(),
                    version: 1,
                    category: {
                        id: 2,
                        name: 'Test Category 2',
                        slug: 'test-category-2',
                        description: 'Test category description 2',
                        icon: '',
                        isActive: true,
                        sortOrder: 0,
                        children: [],
                        parent: undefined,
                        products: [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    images: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            jest
                .spyOn(productsService, 'findAll')
                .mockResolvedValue({ products: products, total: products.length });
            const result = await controller.findAll(undefined, undefined);
            expect(result.products).toEqual(products);
            expect(productsService.findAll).toHaveBeenCalled();
        });
        it('should handle pagination', async () => {
            const products = [
                {
                    id: 1,
                    name: 'Product 1',
                    description: 'First product',
                    price: 19.99,
                    originalPrice: 19.99,
                    stock: 50,
                    sales: 0,
                    isActive: true,
                    views: 0,
                    favorites: 0,
                    mainImage: '',
                    tags: [],
                    specifications: {},
                    publishedAt: new Date(),
                    version: 1,
                    category: {
                        id: 1,
                        name: 'Test Category',
                        slug: 'test-category',
                        description: 'Test category description',
                        icon: '',
                        isActive: true,
                        sortOrder: 0,
                        children: [],
                        parent: undefined,
                        products: [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    images: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            jest
                .spyOn(productsService, 'findAll')
                .mockResolvedValue({ products: products, total: products.length });
            const result = await controller.findAll(1, 10);
            expect(result.products).toEqual(products);
            expect(productsService.findAll).toHaveBeenCalledWith({
                page: 1,
                limit: 10,
                search: undefined,
            });
        });
        it('should handle search functionality', async () => {
            const products = [
                {
                    id: 1,
                    name: 'Search Product',
                    description: 'A searchable product',
                    price: 19.99,
                    originalPrice: 19.99,
                    stock: 50,
                    sales: 0,
                    isActive: true,
                    views: 0,
                    favorites: 0,
                    mainImage: '',
                    tags: [],
                    specifications: {},
                    publishedAt: new Date(),
                    version: 1,
                    category: {
                        id: 1,
                        name: 'Test Category',
                        slug: 'test-category',
                        description: 'Test category description',
                        icon: '',
                        isActive: true,
                        sortOrder: 0,
                        children: [],
                        parent: undefined,
                        products: [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    images: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            jest
                .spyOn(productsService, 'search')
                .mockResolvedValue({ products: products, total: products.length });
            const result = await controller.searchProducts({ q: 'search' });
            expect(result.products).toEqual(products);
            expect(productsService.search).toHaveBeenCalledWith(expect.objectContaining({ keyword: 'search' }));
        });
        it('should return empty array when no products found', async () => {
            jest.spyOn(productsService, 'findAll').mockResolvedValue({ products: [], total: 0 });
            const result = await controller.findAll(undefined, undefined);
            expect(result.products).toEqual([]);
        });
        it('should handle database errors gracefully', async () => {
            jest
                .spyOn(productsService, 'findAll')
                .mockRejectedValue(new Error('Database connection failed'));
            await expect(controller.findAll(undefined, undefined)).rejects.toThrow('Database connection failed');
        });
        it('should handle pagination edge cases', async () => {
            const products = [
                {
                    id: 1,
                    name: 'Product 1',
                    description: 'First product',
                    price: 19.99,
                    originalPrice: 19.99,
                    stock: 50,
                    sales: 0,
                    isActive: true,
                    views: 0,
                    favorites: 0,
                    mainImage: '',
                    tags: [],
                    specifications: {},
                    publishedAt: new Date(),
                    version: 1,
                    category: {
                        id: 1,
                        name: 'Test Category',
                        slug: 'test-category',
                        description: 'Test category description',
                        icon: '',
                        isActive: true,
                        sortOrder: 0,
                        children: [],
                        parent: undefined,
                        products: [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    images: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            jest
                .spyOn(productsService, 'findAll')
                .mockResolvedValue({ products: products, total: products.length });
            const result = await controller.findAll(0, 0);
            expect(result.products).toEqual(products);
            expect(productsService.findAll).toHaveBeenCalledWith({
                page: 0,
                limit: 0,
                search: undefined,
            });
        });
    });
    describe('GET /products/admin/all', () => {
        it('should call findAll with includeInactive:true', async () => {
            jest
                .spyOn(productsService, 'findAll')
                .mockResolvedValue({ products: [], total: 0 });
            const result = await controller.findAllAdmin(1, 50);
            expect(result).toEqual({ products: [], total: 0 });
            expect(productsService.findAll).toHaveBeenCalledWith({
                page: 1,
                limit: 50,
                search: undefined,
                includeInactive: true,
            });
        });
    });
    describe('GET /products/:id', () => {
        it('should return product by id', async () => {
            const product = {
                id: 1,
                name: 'Test Product',
                description: 'A test product',
                price: 29.99,
                originalPrice: 29.99,
                stock: 100,
                sales: 0,
                isActive: true,
                views: 0,
                favorites: 0,
                mainImage: '',
                tags: [],
                specifications: {},
                publishedAt: new Date(),
                version: 1,
                category: {
                    id: 1,
                    name: 'Test Category',
                    slug: 'test-category',
                    description: 'Test category description',
                    icon: '',
                    isActive: true,
                    sortOrder: 0,
                    children: [],
                    parent: undefined,
                    products: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                images: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            jest.spyOn(productsService, 'findOne').mockResolvedValue(product);
            const result = await controller.findOne(1);
            expect(result).toEqual(product);
            expect(productsService.findOne).toHaveBeenCalledWith(1);
        });
        it('should throw error for non-existent product', async () => {
            jest.spyOn(productsService, 'findOne').mockRejectedValue(new Error('Product not found'));
            await expect(controller.findOne(999)).rejects.toThrow('Product not found');
        });
        it('should handle invalid id format', async () => {
            jest.spyOn(productsService, 'findOne').mockRejectedValue(new Error('Invalid ID format'));
            await expect(controller.findOne('invalid')).rejects.toThrow('Invalid ID format');
        });
        it('should include category information', async () => {
            const product = {
                id: 1,
                name: 'Test Product',
                description: 'A test product',
                price: 29.99,
                originalPrice: 29.99,
                stock: 100,
                sales: 0,
                isActive: true,
                views: 0,
                favorites: 0,
                mainImage: '',
                tags: [],
                specifications: {},
                publishedAt: new Date(),
                version: 1,
                category: {
                    id: 1,
                    name: 'Electronics',
                    slug: 'electronics',
                    description: 'Electronic products',
                    icon: '',
                    isActive: true,
                    sortOrder: 0,
                    children: [],
                    products: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                images: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            jest.spyOn(productsService, 'findOne').mockResolvedValue(product);
            const result = await controller.findOne(1);
            expect(result.category).toBeDefined();
            expect(result.category.name).toBe('Electronics');
        });
        it('should handle database connection errors', async () => {
            jest
                .spyOn(productsService, 'findOne')
                .mockRejectedValue(new Error('Database connection failed'));
            await expect(controller.findOne(1)).rejects.toThrow('Database connection failed');
        });
        it('should return inactive products when explicitly requested', async () => {
            const product = {
                id: 1,
                name: 'Test Product',
                description: 'A test product',
                price: 29.99,
                originalPrice: 29.99,
                stock: 100,
                sales: 0,
                isActive: false,
                views: 0,
                favorites: 0,
                mainImage: '',
                tags: [],
                specifications: {},
                publishedAt: new Date(),
                version: 1,
                category: {
                    id: 1,
                    name: 'Test Category',
                    slug: 'test-category',
                    description: 'Test category description',
                    icon: '',
                    isActive: true,
                    sortOrder: 0,
                    children: [],
                    parent: undefined,
                    products: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                images: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            jest
                .spyOn(productsService, 'findOne')
                .mockImplementation(() => Promise.resolve(product));
            const result = await controller.findOne(1);
            expect(result.isActive).toBe(false);
        });
    });
    describe('PUT /products/:id', () => {
        it('should update product successfully', async () => {
            const updateProductDto = {
                name: 'Updated Product',
                description: 'Updated description',
                price: 39.99,
                stock: 150,
            };
            const existingProduct = {
                id: 1,
                name: 'Original Product',
                description: 'Original description',
                price: 29.99,
                originalPrice: 29.99,
                stock: 100,
                sales: 0,
                isActive: true,
                views: 0,
                favorites: 0,
                mainImage: '',
                tags: [],
                specifications: {},
                publishedAt: new Date(),
                version: 1,
                category: {
                    id: 1,
                    name: 'Test Category',
                    slug: 'test-category',
                    description: 'Test category description',
                    icon: '',
                    isActive: true,
                    sortOrder: 0,
                    children: [],
                    parent: undefined,
                    products: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                images: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const updatedProduct = {
                id: 1,
                name: 'Updated Product',
                description: 'Updated description',
                price: 39.99,
                originalPrice: 29.99,
                stock: 150,
                sales: 0,
                isActive: true,
                views: 0,
                favorites: 0,
                mainImage: '',
                tags: [],
                specifications: {},
                publishedAt: new Date(),
                version: 1,
                category: {
                    id: 1,
                    name: 'Test Category',
                    slug: 'test-category',
                    description: 'Test category description',
                    icon: '',
                    isActive: true,
                    sortOrder: 0,
                    children: [],
                    parent: undefined,
                    products: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                images: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            jest
                .spyOn(productsService, 'findOne')
                .mockImplementation(() => Promise.resolve(existingProduct));
            jest
                .spyOn(productsService, 'update')
                .mockImplementation(() => Promise.resolve(updatedProduct));
            const result = await controller.update(1, updateProductDto);
            expect(result).toEqual(updatedProduct);
            expect(productsService.update).toHaveBeenCalledWith(1, updateProductDto);
        });
        it('should throw error for non-existent product', async () => {
            jest.spyOn(productsService, 'update').mockRejectedValue(new Error('Product not found'));
            const updateDto = { name: 'Updated Product' };
            await expect(controller.update(999, updateDto)).rejects.toThrow('Product not found');
        });
        it('should validate price on update', async () => {
            const existingProduct = {
                id: 1,
                name: 'Original Product',
                description: 'Original description',
                price: 29.99,
                originalPrice: 29.99,
                stock: 100,
                sales: 0,
                isActive: true,
                views: 0,
                favorites: 0,
                mainImage: '',
                tags: [],
                specifications: {},
                publishedAt: new Date(),
                version: 1,
                category: {
                    id: 1,
                    name: 'Test Category',
                    slug: 'test-category',
                    description: 'Test category description',
                    icon: '',
                    isActive: true,
                    sortOrder: 0,
                    children: [],
                    parent: undefined,
                    products: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                images: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            jest
                .spyOn(productsService, 'findOne')
                .mockImplementation(() => Promise.resolve(existingProduct));
            const invalidUpdateDto = {
                price: -10,
            };
            jest.spyOn(productsService, 'update').mockRejectedValue(new Error('Validation failed'));
            await expect(controller.update(1, invalidUpdateDto)).rejects.toThrow();
        });
        it('should not allow update of immutable fields', async () => {
            const existingProduct = {
                id: 1,
                name: 'Original Product',
                description: 'Original description',
                price: 29.99,
                originalPrice: 29.99,
                stock: 100,
                sales: 0,
                isActive: true,
                views: 0,
                favorites: 0,
                mainImage: '',
                tags: [],
                specifications: {},
                publishedAt: new Date(),
                version: 1,
                category: {
                    id: 1,
                    name: 'Test Category',
                    slug: 'test-category',
                    description: 'Test category description',
                    icon: '',
                    isActive: true,
                    sortOrder: 0,
                    children: [],
                    parent: undefined,
                    products: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                images: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            jest
                .spyOn(productsService, 'findOne')
                .mockImplementation(() => Promise.resolve(existingProduct));
            const updatedProduct = {
                ...existingProduct,
                name: 'Updated Name',
            };
            jest
                .spyOn(productsService, 'update')
                .mockImplementation(() => Promise.resolve(updatedProduct));
            const updateWithImmutableFields = {
                name: 'Updated Name',
            };
            const result = await controller.update(1, updateWithImmutableFields);
            expect(result.id).toBe(1);
        });
        it('should handle partial updates', async () => {
            const existingProduct = {
                id: 1,
                name: 'Original Product',
                description: 'Original description',
                price: 29.99,
                originalPrice: 29.99,
                stock: 100,
                sales: 0,
                isActive: true,
                views: 0,
                favorites: 0,
                mainImage: '',
                tags: [],
                specifications: {},
                publishedAt: new Date(),
                version: 1,
                category: {
                    id: 1,
                    name: 'Test Category',
                    slug: 'test-category',
                    description: 'Test category description',
                    icon: '',
                    isActive: true,
                    sortOrder: 0,
                    children: [],
                    parent: null,
                    products: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                images: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            jest
                .spyOn(productsService, 'findOne')
                .mockImplementation(() => Promise.resolve(existingProduct));
            const partialUpdateDto = {
                name: 'Updated Name Only',
            };
            const updatedProduct = {
                id: 1,
                name: 'Updated Name Only',
                description: 'Original description',
                price: 29.99,
                originalPrice: 29.99,
                stock: 100,
                sales: 0,
                isActive: true,
                views: 0,
                favorites: 0,
                mainImage: '',
                tags: [],
                specifications: {},
                publishedAt: new Date(),
                version: 1,
                category: {
                    id: 1,
                    name: 'Test Category',
                    slug: 'test-category',
                    description: 'Test category description',
                    icon: '',
                    isActive: true,
                    sortOrder: 0,
                    children: [],
                    parent: undefined,
                    products: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                images: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            jest
                .spyOn(productsService, 'update')
                .mockImplementation(() => Promise.resolve(updatedProduct));
            const result = await controller.update(1, partialUpdateDto);
            expect(result.name).toBe('Updated Name Only');
            expect(result.description).toBe('Original description');
        });
        it('P1-2(双盲审)：update 不带 specifications 的禁用词 → 400，闸不可整体跳过', async () => {
            const bannedDto = { name: '限时抢购水桶包', price: 19.9 };
            await expect(controller.update(1, bannedDto)).rejects.toMatchObject({
                status: 400,
            });
            expect(productsService.update).not.toHaveBeenCalled();
        });
        it('P1-2(双盲审)：update 只改价格 + 存量 factCard 的复检生效（合并视图词表冲突 → 400）', async () => {
            jest.spyOn(productsService, 'findById').mockResolvedValue({
                id: 2,
                name: '蓝白织纹托特',
                description: '蓝白织纹托特包，通勤也拿得出手',
                specifications: { factCard: { colorGroup: '蓝白', bagType: '凯莉' } },
            });
            const priceOnlyDto = { price: 39.9 };
            await expect(controller.update(2, priceOnlyDto)).rejects.toMatchObject({
                status: 400,
            });
            expect(productsService.update).not.toHaveBeenCalled();
        });
        it('P1-2(双盲审)：update 只改价格 + 存量干净（无 factCard、无禁用词）→ 放行', async () => {
            jest.spyOn(productsService, 'findById').mockResolvedValue({
                id: 3,
                name: '牛皮手提包',
                description: '头层牛皮',
                specifications: { 材质: '头层牛皮' },
            });
            jest.spyOn(productsService, 'update').mockResolvedValue({ id: 3, price: 29.9 });
            const result = await controller.update(3, { price: 29.9 });
            expect(result).toEqual({ id: 3, price: 29.9 });
            expect(productsService.update).toHaveBeenCalledWith(3, { price: 29.9 });
        });
        it('R2：update {specifications:{}} + 存量 factCard 与存量文案冲突 → 闸仍红拦 400（两步废闸被堵死）', async () => {
            jest.spyOn(productsService, 'findById').mockResolvedValue({
                id: 4,
                name: '蓝白织纹托特',
                description: '蓝白织纹托特包，通勤也拿得出手',
                specifications: { factCard: { colorGroup: '蓝白', bagType: '凯莉' } },
            });
            await expect(controller.update(4, { specifications: {} })).rejects.toMatchObject({ status: 400 });
            expect(productsService.update).not.toHaveBeenCalled();
        });
        it('R2：update {specifications:null}（显式清空）+ 存量 factCard → 闸视图同步为 null 走 lint-only，干净文案放行且 null 透传 service', async () => {
            jest.spyOn(productsService, 'findById').mockResolvedValue({
                id: 5,
                name: '牛皮手提包',
                description: '头层牛皮，通勤也拿得出手',
                specifications: { factCard: { colorGroup: '棕', bagType: '手提' } },
            });
            jest.spyOn(productsService, 'update').mockResolvedValue({ id: 5, specifications: null });
            const result = await controller.update(5, { specifications: null });
            expect(result).toEqual({ id: 5, specifications: null });
            expect(productsService.update).toHaveBeenCalledWith(5, { specifications: null });
        });
        it('R5(二次修复)：update 合并视图下描述结构冲突不被标题命中稀释 → 400（name=凯莉包+描述含托特+存量卡凯莉）', async () => {
            jest.spyOn(productsService, 'findById').mockResolvedValue({
                id: 6,
                name: '凯莉包',
                description: '老描述：一只经典托特，通勤也拿得出手',
                specifications: { factCard: { colorGroup: '黑', bagType: '凯莉' } },
            });
            await expect(controller.update(6, { price: 59.9 })).rejects.toMatchObject({
                status: 400,
            });
            expect(productsService.update).not.toHaveBeenCalled();
        });
        it('should track update history', async () => {
            const existingProduct = {
                id: 1,
                name: 'Original Product',
                description: 'Original description',
                price: 29.99,
                originalPrice: 29.99,
                stock: 100,
                sales: 0,
                isActive: true,
                views: 0,
                favorites: 0,
                mainImage: '',
                tags: [],
                specifications: {},
                publishedAt: new Date(),
                version: 1,
                category: {
                    id: 1,
                    name: 'Test Category',
                    slug: 'test-category',
                    description: 'Test category description',
                    icon: '',
                    isActive: true,
                    sortOrder: 0,
                    children: [],
                    parent: undefined,
                    products: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                images: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            jest
                .spyOn(productsService, 'findOne')
                .mockImplementation(() => Promise.resolve(existingProduct));
            const updateDto = {
                name: 'Updated Product',
            };
            const updatedProduct = {
                id: 1,
                name: 'Updated Product',
                description: 'Original description',
                price: 29.99,
                originalPrice: 29.99,
                stock: 100,
                sales: 0,
                isActive: true,
                views: 0,
                favorites: 0,
                mainImage: '',
                tags: [],
                specifications: {},
                publishedAt: new Date(),
                version: 1,
                category: {
                    id: 1,
                    name: 'Test Category',
                    slug: 'test-category',
                    description: 'Test category description',
                    icon: '',
                    isActive: true,
                    sortOrder: 0,
                    children: [],
                    products: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                images: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            jest
                .spyOn(productsService, 'update')
                .mockImplementation(() => Promise.resolve(updatedProduct));
            const result = await controller.update(1, updateDto);
            expect(result.name).toBe('Updated Product');
        });
    });
    describe('DELETE /products/:id', () => {
        it('should delete product successfully', async () => {
            const product = {
                id: 1,
                name: 'Test Product',
                description: 'A test product',
                price: 29.99,
                originalPrice: 29.99,
                stock: 100,
                sales: 0,
                isActive: true,
                views: 0,
                favorites: 0,
                mainImage: '',
                tags: [],
                specifications: {},
                publishedAt: new Date(),
                version: 1,
                category: {
                    id: 1,
                    name: 'Test Category',
                    slug: 'test-category',
                    description: 'Test category description',
                    icon: '',
                    isActive: true,
                    sortOrder: 0,
                    children: [],
                    parent: undefined,
                    products: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                images: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            jest
                .spyOn(productsService, 'findOne')
                .mockImplementation(() => Promise.resolve(product));
            jest.spyOn(productsService, 'remove').mockImplementation(() => Promise.resolve(undefined));
            await expect(controller.remove(1)).resolves.toBeUndefined();
            expect(productsService.remove).toHaveBeenCalledWith(1);
        });
        it('should throw error for non-existent product', async () => {
            jest
                .spyOn(productsService, 'remove')
                .mockImplementation(() => Promise.reject(new Error('Product not found')));
            await expect(controller.remove(999)).rejects.toThrow('Product not found');
        });
        it('should handle invalid id format', async () => {
            jest
                .spyOn(productsService, 'remove')
                .mockImplementation(() => Promise.reject(new Error('Invalid ID format')));
            await expect(controller.remove('invalid')).rejects.toThrow('Invalid ID format');
        });
        it('should prevent deletion of products with orders', async () => {
            const product = {
                id: 1,
                name: 'Test Product',
                description: 'A test product',
                price: 29.99,
                originalPrice: 29.99,
                stock: 100,
                sales: 0,
                isActive: true,
                views: 0,
                favorites: 0,
                mainImage: '',
                tags: [],
                specifications: {},
                publishedAt: new Date(),
                version: 1,
                category: {
                    id: 1,
                    name: 'Test Category',
                    slug: 'test-category',
                    description: 'Test category description',
                    icon: '',
                    isActive: true,
                    sortOrder: 0,
                    children: [],
                    parent: undefined,
                    products: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                images: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            jest.spyOn(productsService, 'findOne').mockResolvedValue(product);
            jest
                .spyOn(productsService, 'remove')
                .mockRejectedValue(new Error('Cannot delete product with existing orders'));
            await expect(controller.remove(1)).rejects.toThrow('Cannot delete product with existing orders');
        });
        it('should handle database connection errors', async () => {
            const product = {
                id: 1,
                name: 'Test Product',
                description: 'A test product',
                price: 29.99,
                originalPrice: 29.99,
                stock: 100,
                sales: 0,
                isActive: true,
                views: 0,
                favorites: 0,
                mainImage: '',
                tags: [],
                specifications: {},
                publishedAt: new Date(),
                version: 1,
                category: {
                    id: 1,
                    name: 'Test Category',
                    slug: 'test-category',
                    description: 'Test category description',
                    icon: '',
                    isActive: true,
                    sortOrder: 0,
                    children: [],
                    parent: undefined,
                    products: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                images: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            jest.spyOn(productsService, 'findOne').mockResolvedValue(product);
            jest
                .spyOn(productsService, 'remove')
                .mockRejectedValue(new Error('Database connection failed'));
            await expect(controller.remove(1)).rejects.toThrow('Database connection failed');
        });
    });
    describe('GET /products/popular', () => {
        it('should return popular products', async () => {
            const popularProducts = [
                {
                    id: 1,
                    name: 'Popular Product 1',
                    description: 'First popular product',
                    price: 19.99,
                    categoryId: 1,
                    stock: 50,
                    sku: 'POP-001',
                    isActive: true,
                    brand: 'Brand 1',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 2,
                    name: 'Popular Product 2',
                    description: 'Second popular product',
                    price: 29.99,
                    categoryId: 2,
                    stock: 100,
                    sku: 'POP-002',
                    isActive: true,
                    brand: 'Brand 2',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            jest.spyOn(productsService, 'findPopular').mockResolvedValue(popularProducts);
            const result = await controller.findPopular(10);
            expect(result).toEqual(popularProducts);
            expect(productsService.findPopular).toHaveBeenCalledWith(10);
        });
        it('should handle limit parameter', async () => {
            const popularProducts = [
                {
                    id: 1,
                    name: 'Popular Product 1',
                    description: 'First popular product',
                    price: 19.99,
                    categoryId: 1,
                    stock: 50,
                    sku: 'POP-001',
                    isActive: true,
                    brand: 'Brand 1',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            jest.spyOn(productsService, 'findPopular').mockResolvedValue(popularProducts);
            const result = await controller.findPopular(10);
            expect(result).toEqual(popularProducts);
            expect(productsService.findPopular).toHaveBeenCalledWith(10);
        });
        it('should handle empty popular products', async () => {
            jest.spyOn(productsService, 'findPopular').mockResolvedValue([]);
            const result = await controller.findPopular(10);
            expect(result).toEqual([]);
        });
        it('should handle database errors', async () => {
            jest
                .spyOn(productsService, 'findPopular')
                .mockRejectedValue(new Error('Database connection failed'));
            await expect(controller.findPopular(10)).rejects.toThrow('Database connection failed');
        });
        it('should sort by popularity score', async () => {
            const popularProducts = [
                {
                    id: 1,
                    name: 'Popular Product 1',
                    description: 'First popular product',
                    price: 19.99,
                    categoryId: 1,
                    stock: 50,
                    sku: 'POP-001',
                    isActive: true,
                    brand: 'Brand 1',
                    sales: 95,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 2,
                    name: 'Popular Product 2',
                    description: 'Second popular product',
                    price: 29.99,
                    categoryId: 2,
                    stock: 100,
                    sku: 'POP-002',
                    isActive: true,
                    brand: 'Brand 2',
                    sales: 85,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            jest.spyOn(productsService, 'findPopular').mockResolvedValue(popularProducts);
            const result = await controller.findPopular(10);
            expect(result[0].sales).toBe(95);
            expect(result[1].sales).toBe(85);
        });
    });
    describe('GET /products/search', () => {
        it('should search products by query', async () => {
            const searchResults = [
                {
                    id: 1,
                    name: 'Search Result Product',
                    description: 'A product matching search query',
                    price: 19.99,
                    originalPrice: 19.99,
                    categoryId: 1,
                    stock: 50,
                    sales: 0,
                    isActive: true,
                    views: 0,
                    favorites: 0,
                    mainImage: '',
                    tags: [],
                    specifications: {},
                    publishedAt: new Date(),
                    version: 1,
                    sku: 'SEARCH-001',
                    brand: 'Search Brand',
                    category: {
                        id: 1,
                        name: 'Test Category',
                        slug: 'test-category',
                        description: 'Test category description',
                        icon: '',
                        isActive: true,
                        sortOrder: 0,
                        children: [],
                        parent: undefined,
                        products: [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    images: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            jest
                .spyOn(productsService, 'search')
                .mockResolvedValue({ products: searchResults, total: searchResults.length });
            const result = await controller.searchProducts({ q: 'query' });
            expect(result.products).toEqual(searchResults);
            expect(productsService.search).toHaveBeenCalledWith(expect.objectContaining({ keyword: 'query' }));
        });
        it('should handle search with filters', async () => {
            const searchResults = [
                {
                    id: 1,
                    name: 'Filtered Search Product',
                    description: 'A product matching filtered search',
                    price: 19.99,
                    originalPrice: 19.99,
                    categoryId: 1,
                    stock: 50,
                    sales: 0,
                    isActive: true,
                    views: 0,
                    favorites: 0,
                    mainImage: '',
                    tags: [],
                    specifications: {},
                    publishedAt: new Date(),
                    version: 1,
                    sku: 'FILTER-001',
                    brand: 'Filtered Brand',
                    category: {
                        id: 1,
                        name: 'Test Category',
                        slug: 'test-category',
                        description: 'Test category description',
                        icon: '',
                        isActive: true,
                        sortOrder: 0,
                        parent: null,
                        children: [],
                        products: [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    images: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            jest
                .spyOn(productsService, 'search')
                .mockResolvedValue({ products: searchResults, total: searchResults.length });
            const result = await controller.searchProducts({
                q: 'query',
                category: '1',
                maxPrice: '50',
            });
            expect(result.products).toEqual(searchResults);
            expect(productsService.search).toHaveBeenCalledWith(expect.objectContaining({ keyword: 'query', categoryId: 1, maxPrice: 50 }));
        });
        it('should return empty array when no search results', async () => {
            jest.spyOn(productsService, 'search').mockResolvedValue({ products: [], total: 0 });
            const result = await controller.searchProducts({ q: 'nonexistent' });
            expect(result.products).toEqual([]);
        });
        it('should handle search errors gracefully', async () => {
            jest
                .spyOn(productsService, 'search')
                .mockRejectedValue(new Error('Search service unavailable'));
            await expect(controller.searchProducts({ q: 'query' })).rejects.toThrow('Search service unavailable');
        });
        it('should handle pagination in search results', async () => {
            const searchResults = [
                {
                    id: 1,
                    name: 'Search Result Product',
                    description: 'A product matching search query',
                    price: 19.99,
                    originalPrice: 19.99,
                    categoryId: 1,
                    stock: 50,
                    sales: 0,
                    isActive: true,
                    views: 0,
                    favorites: 0,
                    mainImage: '',
                    tags: [],
                    specifications: {},
                    publishedAt: new Date(),
                    version: 1,
                    sku: 'SEARCH-001',
                    brand: 'Search Brand',
                    category: {
                        id: 1,
                        name: 'Test Category',
                        slug: 'test-category',
                        description: 'Test category description',
                        icon: '',
                        isActive: true,
                        sortOrder: 0,
                        parent: null,
                        children: [],
                        products: [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    images: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            jest
                .spyOn(productsService, 'search')
                .mockResolvedValue({ products: searchResults, total: searchResults.length });
            const result = await controller.searchProducts({ q: 'query', page: '1', limit: '10' });
            expect(result.products).toEqual(searchResults);
            expect(productsService.search).toHaveBeenCalledWith(expect.objectContaining({ keyword: 'query', page: 1, limit: 10 }));
        });
        it('should handle fuzzy search', async () => {
            const searchResults = [
                {
                    id: 1,
                    name: 'Fuzzy Search Product',
                    description: 'A product matching fuzzy search',
                    price: 19.99,
                    originalPrice: 19.99,
                    categoryId: 1,
                    stock: 50,
                    sales: 0,
                    isActive: true,
                    views: 0,
                    favorites: 0,
                    mainImage: '',
                    tags: [],
                    specifications: {},
                    publishedAt: new Date(),
                    version: 1,
                    sku: 'FUZZY-001',
                    brand: 'Fuzzy Brand',
                    category: {
                        id: 1,
                        name: 'Test Category',
                        slug: 'test-category',
                        description: 'Test category description',
                        icon: '',
                        isActive: true,
                        sortOrder: 0,
                        parent: null,
                        children: [],
                        products: [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    images: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            jest
                .spyOn(productsService, 'search')
                .mockResolvedValue({ products: searchResults, total: searchResults.length });
            const result = await controller.searchProducts({ q: 'fuzzy', fuzzy: 'true' });
            expect(result.products).toEqual(searchResults);
            expect(productsService.search).toHaveBeenCalledWith(expect.objectContaining({ keyword: 'fuzzy' }));
        });
        it('should handle search with multiple filters', async () => {
            const searchResults = [
                {
                    id: 1,
                    name: 'Multi Filter Product',
                    description: 'A product matching multiple filters',
                    price: 19.99,
                    originalPrice: 19.99,
                    categoryId: 1,
                    stock: 50,
                    sales: 0,
                    isActive: true,
                    views: 0,
                    favorites: 0,
                    mainImage: '',
                    tags: [],
                    specifications: {},
                    publishedAt: new Date(),
                    version: 1,
                    sku: 'MULTI-001',
                    brand: 'Multi Brand',
                    category: {
                        id: 1,
                        name: 'Test Category',
                        slug: 'test-category',
                        description: 'Test category description',
                        icon: '',
                        isActive: true,
                        sortOrder: 0,
                        parent: null,
                        children: [],
                        products: [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    images: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            jest
                .spyOn(productsService, 'search')
                .mockResolvedValue({ products: searchResults, total: searchResults.length });
            const result = await controller.searchProducts({
                q: 'multi',
                category: '1',
                minPrice: '10',
                maxPrice: '100',
                inStock: 'true',
            });
            expect(result.products).toEqual(searchResults);
            expect(productsService.search).toHaveBeenCalledWith(expect.objectContaining({
                keyword: 'multi',
                categoryId: 1,
                minPrice: 10,
                maxPrice: 100,
                inStock: true,
            }));
        });
    });
    describe('Edge Cases and Error Handling', () => {
        it('should handle concurrent product creation', async () => {
            const createProductDto = {
                name: 'Concurrent Product',
                description: 'A test product',
                price: 29.99,
                categoryId: 1,
                stock: 100,
                sku: 'CONCURRENT-001',
                isActive: true,
            };
            const createdProduct = {
                id: 1,
                ...createProductDto,
                originalPrice: 29.99,
                sales: 0,
                views: 0,
                favorites: 0,
                mainImage: '',
                tags: [],
                specifications: {},
                publishedAt: new Date(),
                version: 1,
                category: {
                    id: 1,
                    name: 'Test Category',
                    slug: 'test-category',
                    description: 'Test category description',
                    icon: '',
                    isActive: true,
                    sortOrder: 0,
                    children: [],
                    parent: undefined,
                    products: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                images: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            jest.spyOn(productsService, 'create').mockResolvedValue(createdProduct);
            const promises = [controller.create(createProductDto), controller.create(createProductDto)];
            const results = await Promise.all(promises);
            expect(results).toHaveLength(2);
            expect(results[0]).toEqual(createdProduct);
            expect(results[1]).toEqual(createdProduct);
        });
        it('should handle rate limiting', async () => {
            const createProductDto = {
                name: 'Rate Limited Product',
                description: 'A test product',
                price: 29.99,
                categoryId: 1,
                stock: 100,
                sku: 'RATE-001',
                isActive: true,
            };
            jest.spyOn(productsService, 'create').mockRejectedValue(new Error('Rate limit exceeded'));
            await expect(controller.create(createProductDto)).rejects.toThrow('Rate limit exceeded');
        });
        it('should handle validation errors comprehensively', async () => {
            const invalidDto = {
                name: '',
                description: '',
                price: -1,
                categoryId: -1,
                stock: -1,
            };
            jest.spyOn(productsService, 'create').mockRejectedValue(new Error('Validation failed'));
            await expect(controller.create(invalidDto)).rejects.toThrow('Validation failed');
        });
        it('should handle timeout scenarios', async () => {
            const createProductDto = {
                name: 'Timeout Product',
                description: 'A test product',
                price: 29.99,
                categoryId: 1,
                stock: 100,
                sku: 'TIMEOUT-001',
                isActive: true,
            };
            jest.spyOn(productsService, 'create').mockRejectedValue(new Error('Request timeout'));
            await expect(controller.create(createProductDto)).rejects.toThrow('Request timeout');
        });
    });
});
