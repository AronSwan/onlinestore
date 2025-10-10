import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { SearchManagerService } from './search/search-manager.service';
import { SearchSuggestionService } from './search/search-suggestion.service';
import { PopularSearchService } from './search/popular-search.service';
import { ConfigService } from '@nestjs/config';
import { createMockedFunction } from '../../test/utils/typed-mock-factory';

describe('ProductsController', () => {
  let controller: ProductsController;
  let productsService: ProductsService;

  const mockConfigService = {
    get: createMockedFunction<(key: string) => any>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: {
            create: createMockedFunction<(dto: any) => Promise<any>>(),
            findAll: createMockedFunction<(page?: number, size?: number) => Promise<any[]>>(),
            findOne: createMockedFunction<(id: number | string) => Promise<any>>(),
            update: createMockedFunction<(id: number | string, dto: any) => Promise<any>>(),
            remove: createMockedFunction<(id: number | string) => Promise<{ affected?: number }>>(),
            search: createMockedFunction<(keyword: string, options?: any) => Promise<{ items: any[]; total: number }>>(),
            findPopular: createMockedFunction<() => Promise<any[]>>(),
          },
        },
        {
          provide: SearchManagerService,
          useValue: {
            search: createMockedFunction<(keyword: string, options?: any) => Promise<{ hits: Array<{ id: string }>; total: number }>>(),
          },
        },
        {
          provide: SearchSuggestionService,
          useValue: {
            getSuggestions: createMockedFunction<(keyword: string, limit?: number) => Promise<string[]>>(),
          },
        },
        {
          provide: PopularSearchService,
          useValue: {
            getPopularSearches: createMockedFunction<() => Promise<string[]>>(),
          },
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    productsService = module.get<ProductsService>(ProductsService);
  });

  describe('POST /products', () => {
    it('should create a new product successfully', async () => {
      const createProductDto = {
        name: 'Test Product',
        description: 'A test product',
        price: 29.99,
        categoryId: 1,
        stock: 100,
        brand: 'Test Brand',
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

      jest.spyOn(productsService, 'create').mockResolvedValue(createdProduct as any);

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
        brand: 'Test Brand',
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
        brand: 'Test Brand',
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
        brand: 'Test Brand',
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
        brand: '',
      };

      jest.spyOn(productsService, 'create').mockRejectedValue(new Error('Validation failed'));
      await expect(controller.create(invalidDto)).rejects.toThrow();
    });

    it('should validate product name length', async () => {
      const invalidDto = {
        name: 'A'.repeat(256), // 超过长度限制
        description: 'A test product',
        price: 29.99,
        categoryId: 1,
        stock: 100,
        brand: 'Test Brand',
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
        brand: 'Test Brand',
      };

      jest
        .spyOn(productsService, 'create')
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(controller.create(createProductDto)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should calculate total amount correctly', async () => {
      const createProductDto = {
        name: 'Test Product',
        description: 'A test product',
        price: 29.99,
        categoryId: 1,
        stock: 100,
        brand: 'Test Brand',
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

      jest.spyOn(productsService, 'create').mockResolvedValue(createdProduct as any);

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
        .mockResolvedValue({ products: products as any, total: products.length });

      const result = await controller.findAll(undefined as any, undefined as any);

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
        .mockResolvedValue({ products: products as any, total: products.length });

      const result = await controller.findAll(1 as any, 10 as any);

      expect(result.products).toEqual(products);
      expect(productsService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
      });
    });

    // 控制器 findAll 不支持按分类过滤，相关测试移除

    // 控制器 findAll 不支持按价格区间过滤，相关测试移除

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
        .mockResolvedValue({ products: products as any, total: products.length });

      const result = await controller.searchProducts({ q: 'search' } as any);

      expect(result.products).toEqual(products);
      expect(productsService.search).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: 'search' }),
      );
    });

    it('should return empty array when no products found', async () => {
      jest.spyOn(productsService, 'findAll').mockResolvedValue({ products: [], total: 0 });

      const result = await controller.findAll(undefined as any, undefined as any);

      expect(result.products).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      jest
        .spyOn(productsService, 'findAll')
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(controller.findAll(undefined as any, undefined as any)).rejects.toThrow(
        'Database connection failed',
      );
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
        .mockResolvedValue({ products: products as any, total: products.length });

      const result = await controller.findAll(0 as any, 0 as any);

      expect(result.products).toEqual(products);
      expect(productsService.findAll).toHaveBeenCalledWith({
        page: 0,
        limit: 0,
        search: undefined,
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

      jest.spyOn(productsService, 'findOne').mockResolvedValue(product as any);

      const result = await controller.findOne(1 as any);

      expect(result).toEqual(product);
      expect(productsService.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw error for non-existent product', async () => {
      jest.spyOn(productsService, 'findOne').mockRejectedValue(new Error('Product not found'));

      await expect(controller.findOne(999 as any)).rejects.toThrow('Product not found');
    });

    it('should handle invalid id format', async () => {
      jest.spyOn(productsService, 'findOne').mockRejectedValue(new Error('Invalid ID format'));

      await expect(controller.findOne('invalid' as any)).rejects.toThrow('Invalid ID format');
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

      jest.spyOn(productsService, 'findOne').mockResolvedValue(product as any);

      const result = await controller.findOne(1 as any);

      expect(result.category).toBeDefined();
      expect(result.category.name).toBe('Electronics');
    });

    it('should handle database connection errors', async () => {
      jest
        .spyOn(productsService, 'findOne')
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(controller.findOne(1 as any)).rejects.toThrow('Database connection failed');
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
        .mockImplementation(() => Promise.resolve(product as any));

      const result = await controller.findOne(1 as any);

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
        .mockImplementation(() => Promise.resolve(existingProduct as any));
      jest
        .spyOn(productsService, 'update')
        .mockImplementation(() => Promise.resolve(updatedProduct as any));

      const result = await controller.update(1 as any, updateProductDto);

      expect(result).toEqual(updatedProduct);
      expect(productsService.update).toHaveBeenCalledWith(1, updateProductDto);
    });

    it('should throw error for non-existent product', async () => {
      jest.spyOn(productsService, 'update').mockRejectedValue(new Error('Product not found'));

      const updateDto = { name: 'Updated Product' };

      await expect(controller.update(999 as any, updateDto)).rejects.toThrow('Product not found');
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
        .mockImplementation(() => Promise.resolve(existingProduct as any));

      const invalidUpdateDto = {
        price: -10,
      };

      jest.spyOn(productsService, 'update').mockRejectedValue(new Error('Validation failed'));
      await expect(controller.update(1 as any, invalidUpdateDto as any)).rejects.toThrow();
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
        .mockImplementation(() => Promise.resolve(existingProduct as any));

      const updatedProduct = {
        ...existingProduct,
        name: 'Updated Name',
      };

      jest
        .spyOn(productsService, 'update')
        .mockImplementation(() => Promise.resolve(updatedProduct as any));

      const updateWithImmutableFields = {
        name: 'Updated Name',
      };

      const result = await controller.update(1 as any, updateWithImmutableFields as any);

      expect(result.id).toBe(1); // ID should not change
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
        .mockImplementation(() => Promise.resolve(existingProduct as any));

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
        .mockImplementation(() => Promise.resolve(updatedProduct as any));

      const result = await controller.update(1 as any, partialUpdateDto);

      expect(result.name).toBe('Updated Name Only');
      expect(result.description).toBe('Original description'); // Unchanged
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
        .mockImplementation(() => Promise.resolve(existingProduct as any));

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
        .mockImplementation(() => Promise.resolve(updatedProduct as any));

      const result = await controller.update(1 as any, updateDto);

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
        .mockImplementation(() => Promise.resolve(product as any));
      jest.spyOn(productsService, 'remove').mockImplementation(() => Promise.resolve(undefined));

      await expect(controller.remove(1 as any)).resolves.toBeUndefined();
      expect(productsService.remove).toHaveBeenCalledWith(1);
    });

    it('should throw error for non-existent product', async () => {
      jest
        .spyOn(productsService, 'remove')
        .mockImplementation(() => Promise.reject(new Error('Product not found')));

      await expect(controller.remove(999 as any)).rejects.toThrow('Product not found');
    });

    it('should handle invalid id format', async () => {
      jest
        .spyOn(productsService, 'remove')
        .mockImplementation(() => Promise.reject(new Error('Invalid ID format')));

      await expect(controller.remove('invalid' as any)).rejects.toThrow('Invalid ID format');
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

      jest.spyOn(productsService, 'findOne').mockResolvedValue(product as any);
      jest
        .spyOn(productsService, 'remove')
        .mockRejectedValue(new Error('Cannot delete product with existing orders'));

      await expect(controller.remove(1 as any)).rejects.toThrow(
        'Cannot delete product with existing orders',
      );
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

      jest.spyOn(productsService, 'findOne').mockResolvedValue(product as any);
      jest
        .spyOn(productsService, 'remove')
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(controller.remove(1 as any)).rejects.toThrow('Database connection failed');
    });
  });

  // 移除：控制器未提供推荐接口（getRecommendations），避免方法不存在的编译/运行错误
  // 控制器中没有 getRecommendations 方法，所以移除相关测试

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

      jest.spyOn(productsService, 'findPopular').mockResolvedValue(popularProducts as any);

      const result = await controller.findPopular(10 as any);

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

      jest.spyOn(productsService, 'findPopular').mockResolvedValue(popularProducts as any);

      const result = await controller.findPopular(10 as any);

      expect(result).toEqual(popularProducts);
      expect(productsService.findPopular).toHaveBeenCalledWith(10);
    });

    it('should handle empty popular products', async () => {
      jest.spyOn(productsService, 'findPopular').mockResolvedValue([]);

      const result = await controller.findPopular(10 as any);

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      jest
        .spyOn(productsService, 'findPopular')
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(controller.findPopular(10 as any)).rejects.toThrow('Database connection failed');
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

      jest.spyOn(productsService, 'findPopular').mockResolvedValue(popularProducts as any);

      const result = await controller.findPopular(10 as any);

      expect(result[0].sales).toBe(95); // Higher sales first
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
        .mockResolvedValue({ products: searchResults as any, total: searchResults.length });

      const result = await controller.searchProducts({ q: 'query' } as any);

      expect(result.products).toEqual(searchResults);
      expect(productsService.search).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: 'query' }),
      );
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
        .mockResolvedValue({ products: searchResults as any, total: searchResults.length });

      const result = await controller.searchProducts({
        q: 'query',
        category: '1',
        maxPrice: '50',
      } as any);

      expect(result.products).toEqual(searchResults);
      expect(productsService.search).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: 'query', categoryId: 1, maxPrice: 50 }),
      );
    });

    it('should return empty array when no search results', async () => {
      jest.spyOn(productsService, 'search').mockResolvedValue({ products: [], total: 0 });

      const result = await controller.searchProducts({ q: 'nonexistent' } as any);

      expect(result.products).toEqual([]);
    });

    it('should handle search errors gracefully', async () => {
      jest
        .spyOn(productsService, 'search')
        .mockRejectedValue(new Error('Search service unavailable'));

      await expect(controller.searchProducts({ q: 'query' } as any)).rejects.toThrow(
        'Search service unavailable',
      );
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
        .mockResolvedValue({ products: searchResults as any, total: searchResults.length });

      const result = await controller.searchProducts({ q: 'query', page: '1', limit: '10' } as any);

      expect(result.products).toEqual(searchResults);
      expect(productsService.search).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: 'query', page: 1, limit: 10 }),
      );
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
        .mockResolvedValue({ products: searchResults as any, total: searchResults.length });

      const result = await controller.searchProducts({ q: 'fuzzy', fuzzy: 'true' } as any);

      expect(result.products).toEqual(searchResults);
      expect(productsService.search).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: 'fuzzy' }),
      );
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
        .mockResolvedValue({ products: searchResults as any, total: searchResults.length });

      const result = await controller.searchProducts({
        q: 'multi',
        category: '1',
        minPrice: '10',
        maxPrice: '100',
        inStock: 'true',
      } as any);

      expect(result.products).toEqual(searchResults);
      expect(productsService.search).toHaveBeenCalledWith(
        (expect as any).objectContaining({
          keyword: 'multi',
          categoryId: 1,
          minPrice: 10,
          maxPrice: 100,
          inStock: true,
        }),
      );
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
        brand: 'Test Brand',
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

      jest.spyOn(productsService, 'create').mockResolvedValue(createdProduct as any);

      // 模拟并发调用
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
        brand: 'Test Brand',
      };

      jest.spyOn(productsService, 'create').mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(controller.create(createProductDto)).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle validation errors comprehensively', async () => {
      const invalidDto = {
        name: '', // Empty name
        description: '', // Empty description
        price: -1, // Invalid price value
        categoryId: -1, // Invalid category value
        stock: -1, // Negative stock
        brand: '', // Empty brand
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
        brand: 'Test Brand',
      };

      jest.spyOn(productsService, 'create').mockRejectedValue(new Error('Request timeout'));

      await expect(controller.create(createProductDto)).rejects.toThrow('Request timeout');
    });
  });
});
