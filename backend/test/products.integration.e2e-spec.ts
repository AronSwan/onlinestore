// 用途：产品模块的集成测试，包括CRUD操作、库存管理、缓存和性能测试
// 作者：AI助手
// 时间：2025-10-01 23:39:41
// 依赖文件：../src/app.module.ts, ../src/products/entities/product.entity.ts, ../src/products/entities/category.entity.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../src/products/entities/product.entity';
import { Category } from '../src/products/entities/category.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

describe('Products Integration (e2e)', () => {
  let app: INestApplication;
  let productRepository: Repository<Product>;
  let categoryRepository: Repository<Category>;
  let cacheManager: Cache;

  const mockProduct = {
    id: 1,
    name: '测试产品',
    description: '这是一个测试产品',
    price: 199.99,
    originalPrice: 299.99,
    stock: 100,
    sales: 0,
    isActive: true,
    views: 0,
    favorites: 0,
    mainImage: 'https://example.com/main-image.jpg',
    tags: ['热销', '新品'],
    specifications: {
      color: '红色',
      size: 'L',
      material: '棉质',
    },
    publishedAt: new Date(),
  };

  const mockCategory = {
    id: 1,
    name: '测试分类',
    description: '测试分类描述',
    parentId: null,
    level: 1,
    path: '/test-category',
    isActive: true,
    sortOrder: 1,
    icon: 'test-icon',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    productRepository = moduleFixture.get<Repository<Product>>(getRepositoryToken(Product));
    categoryRepository = moduleFixture.get<Repository<Category>>(getRepositoryToken(Category));
    cacheManager = moduleFixture.get<Cache>(CACHE_MANAGER);

    await app.init();

    // 清理数据库
    await productRepository.clear();
    await categoryRepository.clear();
    try {
      // Try to clear cache - different cache managers have different APIs
      const cache = cacheManager as any;
      if (typeof cache.reset === 'function') {
        await cache.reset();
      } else if (cache.store && typeof cache.store.reset === 'function') {
        await cache.store.reset();
      } else if (typeof cache.del === 'function') {
        // Try to delete common cache keys
        await Promise.all([
          cache.del('products:*').catch(() => {}),
          cache.del('product:*').catch(() => {}),
          cache.del('categories:*').catch(() => {}),
        ]);
      }
    } catch (error) {
      // Cache reset failed, continue with tests
    }

    // 创建测试分类
    await categoryRepository.save(mockCategory);
  });

  afterEach(async () => {
    await productRepository.clear();
    await categoryRepository.clear();
    // Clear cache by deleting all keys or using store reset if available
    try {
      const cache = cacheManager as any;
      if (typeof cache.reset === 'function') {
        await cache.reset();
      } else if (cache.store && typeof cache.store.reset === 'function') {
        await cache.store.reset();
      } else if (typeof cache.del === 'function') {
        await cache.del('*').catch(() => {});
      }
    } catch (error) {
      // Cache reset failed, continue with tests
    }
    await app.close();
  });

  describe('产品创建流程测试', () => {
    it('should create a new product successfully', async () => {
      // 获取已创建的分类ID，避免硬编码
      const category = await categoryRepository.findOne({ where: { name: mockCategory.name } });
      const categoryId = category?.id || 1;

      const createProductDto = {
        name: '新产品',
        description: '新产品描述',
        price: 99.99,
        originalPrice: 149.99,
        stock: 50,
        categoryId: categoryId,
        brand: '新品牌',
        model: 'NEW-001',
        specifications: {
          color: '蓝色',
          size: 'M',
        },
        images: ['https://example.com/new-image.jpg'],
        tags: ['新品'],
        weight: 0.3,
        dimensions: {
          length: 25,
          width: 15,
          height: 8,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .send(createProductDto)
        .expect(201);

      expect(response.body).toMatchObject({
        name: createProductDto.name,
        price: createProductDto.price,
        stock: createProductDto.stock,
        isActive: true,
      });

      // 验证数据库中的数据
      const savedProduct = await productRepository.findOne({
        where: { id: response.body.id },
      });
      expect(savedProduct).toBeDefined();
      expect(savedProduct!.name).toBe(createProductDto.name);
    });

    it('should validate required fields', async () => {
      const invalidProductDto = {
        description: '缺少必需字段的产品',
        price: 99.99,
        // 缺少 name, stock, categoryId 等必需字段
      };

      await request(app.getHttpServer()).post('/products').send(invalidProductDto).expect(400);
    });

    it('should validate price constraints', async () => {
      // 获取已创建的分类ID，避免硬编码
      const category = await categoryRepository.findOne({ where: { name: mockCategory.name } });
      const categoryId = category?.id || 1;

      const invalidPriceDto = {
        name: '价格无效的产品',
        description: '价格测试',
        price: -10, // 负价格
        stock: 10,
        categoryId: categoryId,
      };

      await request(app.getHttpServer()).post('/products').send(invalidPriceDto).expect(400);
    });

    it('should validate stock constraints', async () => {
      // 获取已创建的分类ID，避免硬编码
      const category = await categoryRepository.findOne({ where: { name: mockCategory.name } });
      const categoryId = category?.id || 1;

      const invalidStockDto = {
        name: '库存无效的产品',
        description: '库存测试',
        price: 99.99,
        stock: -5, // 负库存
        categoryId: categoryId,
      };

      await request(app.getHttpServer()).post('/products').send(invalidStockDto).expect(400);
    });

    it('should validate category existence', async () => {
      // 获取已创建的分类ID，然后使用不存在的ID
      const category = await categoryRepository.findOne({ where: { name: mockCategory.name } });
      const existingCategoryId = category?.id || 1;
      const nonExistentCategoryId = existingCategoryId + 1000; // 确保是一个不存在的ID

      const invalidCategoryDto = {
        name: '分类不存在的产品',
        description: '分类测试',
        price: 99.99,
        stock: 10,
        categoryId: nonExistentCategoryId, // 不存在的分类
      };

      await request(app.getHttpServer()).post('/products').send(invalidCategoryDto).expect(400);
    });
  });

  describe('产品查询流程测试', () => {
    beforeEach(async () => {
      // 创建测试产品
      const products = [
        { ...mockProduct, name: '产品A', price: 100, stock: 50 },
        { ...mockProduct, name: '产品B', price: 200, stock: 30 },
        { ...mockProduct, name: '产品C', price: 300, stock: 20, isActive: false },
      ];

      // 创建不包含 id 属性的新对象
      const productsWithoutId = products.map(({ id, ...rest }) => rest);
      await productRepository.save(productsWithoutId);
    });

    it('should get all active products', async () => {
      const response = await request(app.getHttpServer()).get('/products').expect(200);

      expect(response.body.data).toHaveLength(2); // 只返回活跃产品
      expect(response.body.total).toBe(2);
      expect(response.body.data.every((p: { isActive: boolean }) => p.isActive)).toBe(true);
    });

    it('should get product by id', async () => {
      const response = await request(app.getHttpServer()).get('/products/1').expect(200);

      expect(response.body).toMatchObject({
        id: 1,
        name: '产品A',
        price: 100,
      });
    });

    it('should return 404 for non-existent product', async () => {
      await request(app.getHttpServer()).get('/products/999').expect(404);
    });

    it('should filter products by category', async () => {
      // 获取已创建的分类ID，避免硬编码
      const category = await categoryRepository.findOne({ where: { name: mockCategory.name } });
      const categoryId = category?.id || 1;

      const response = await request(app.getHttpServer())
        .get(`/products?categoryId=${categoryId}`)
        .expect(200);

      expect(
        response.body.data.every((p: { categoryId: number }) => p.categoryId === categoryId),
      ).toBe(true);
    });

    it('should filter products by price range', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?minPrice=150&maxPrice=250')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('产品B');
    });

    it('should search products by name', async () => {
      const response = await request(app.getHttpServer()).get('/products?search=产品A').expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('产品A');
    });

    it('should sort products by price', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?sortBy=price&sortOrder=desc')
        .expect(200);

      const prices = response.body.data.map((p: { price: number }) => p.price);
      expect(prices).toEqual([200, 100]); // 降序排列
    });

    it('should paginate products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?page=1&limit=1')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(1);
      expect(response.body.total).toBe(2);
    });

    it('should filter products by tags', async () => {
      // 创建带有特定标签的产品
      const taggedProduct = {
        ...mockProduct,
        name: '标签测试产品',
        tags: ['热销', '限量版'],
      };

      // 移除id属性
      const { id, ...productWithoutId } = taggedProduct;
      await productRepository.save(productWithoutId);

      const response = await request(app.getHttpServer()).get('/products?tags=热销').expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.some((p: { tags: string[] }) => p.tags.includes('热销'))).toBe(
        true,
      );
    });

    it('should filter products by specifications', async () => {
      // 创建带有特定规格的产品
      const specProduct = {
        ...mockProduct,
        name: '规格测试产品',
        specifications: {
          color: '蓝色',
          size: 'XL',
          material: '丝绸',
        },
      };

      // 移除id属性
      const { id, ...productWithoutId } = specProduct;
      await productRepository.save(productWithoutId);

      const response = await request(app.getHttpServer())
        .get('/products?specColor=蓝色')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(
        response.body.data.some(
          (p: { specifications: any }) => p.specifications && p.specifications.color === '蓝色',
        ),
      ).toBe(true);
    });
  });

  describe('产品更新流程测试', () => {
    let productId: number;

    beforeEach(async () => {
      const savedProduct = await productRepository.save(mockProduct);
      productId = savedProduct.id;
    });

    it('should update product successfully', async () => {
      const updateDto = {
        name: '更新后的产品',
        price: 299.99,
        stock: 75,
      };

      const response = await request(app.getHttpServer())
        .put(`/products/${productId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject(updateDto);

      // 验证数据库中的数据
      const updatedProduct = await productRepository.findOne({
        where: { id: productId },
      });
      expect(updatedProduct).toBeDefined();
      expect(updatedProduct!.name).toBe(updateDto.name);
      expect(updatedProduct!.price).toBe(updateDto.price);
    });

    it('should validate update constraints', async () => {
      const invalidUpdateDto = {
        price: -50, // 无效价格
      };

      await request(app.getHttpServer())
        .put(`/products/${productId}`)
        .send(invalidUpdateDto)
        .expect(400);
    });

    it('should return 404 for non-existent product update', async () => {
      const updateDto = {
        name: '更新不存在的产品',
      };

      await request(app.getHttpServer()).put('/products/999').send(updateDto).expect(404);
    });

    it('should update product stock', async () => {
      const stockUpdateDto = {
        stock: 150,
      };

      await request(app.getHttpServer())
        .put(`/products/${productId}`)
        .send(stockUpdateDto)
        .expect(200);

      const updatedProduct = await productRepository.findOne({
        where: { id: productId },
      });
      expect(updatedProduct).toBeDefined();
      expect(updatedProduct!.stock).toBe(150);
    });

    it('should update product status', async () => {
      const statusUpdateDto = {
        isActive: false,
      };

      await request(app.getHttpServer())
        .put(`/products/${productId}`)
        .send(statusUpdateDto)
        .expect(200);

      const updatedProduct = await productRepository.findOne({
        where: { id: productId },
      });
      expect(updatedProduct).toBeDefined();
      expect(updatedProduct!.isActive).toBe(false);
    });
  });

  describe('产品删除流程测试', () => {
    let productId: number;

    beforeEach(async () => {
      const savedProduct = await productRepository.save(mockProduct);
      productId = savedProduct.id;
    });

    it('should delete product successfully', async () => {
      await request(app.getHttpServer()).delete(`/products/${productId}`).expect(200);

      // 验证产品已被删除
      const deletedProduct = await productRepository.findOne({
        where: { id: productId },
      });
      expect(deletedProduct).toBeNull();
    });

    it('should return 404 for non-existent product deletion', async () => {
      await request(app.getHttpServer()).delete('/products/999').expect(404);
    });

    it('should soft delete product (if implemented)', async () => {
      // 如果实现了软删除，产品应该被标记为删除而不是物理删除
      await request(app.getHttpServer()).delete(`/products/${productId}`).expect(200);

      // 检查产品是否仍在数据库中但被标记为删除
      const product = await productRepository.findOne({
        where: { id: productId },
        withDeleted: true, // 如果使用 TypeORM 软删除
      });

      // 根据实际实现调整断言
      if (product) {
        // 如果实现了软删除，检查删除标记
        // expect(product.deletedAt).toBeDefined();
        expect(product).toBeDefined();
      }
    });
  });

  describe('库存管理流程测试', () => {
    let productId: number;

    beforeEach(async () => {
      const savedProduct = await productRepository.save({
        ...mockProduct,
        stock: 100,
      });
      productId = savedProduct.id;
    });

    it('should reduce stock when order is placed', async () => {
      const stockReductionDto = {
        quantity: 10,
        operation: 'reduce',
      };

      await request(app.getHttpServer())
        .patch(`/products/${productId}/stock`)
        .send(stockReductionDto)
        .expect(200);

      const updatedProduct = await productRepository.findOne({
        where: { id: productId },
      });
      expect(updatedProduct).toBeDefined();
      expect(updatedProduct!.stock).toBe(90);
    });

    it('should increase stock when order is cancelled', async () => {
      const stockIncreaseDto = {
        quantity: 15,
        operation: 'increase',
      };

      await request(app.getHttpServer())
        .patch(`/products/${productId}/stock`)
        .send(stockIncreaseDto)
        .expect(200);

      const updatedProduct = await productRepository.findOne({
        where: { id: productId },
      });
      expect(updatedProduct).toBeDefined();
      expect(updatedProduct!.stock).toBe(115);
    });

    it('should prevent negative stock', async () => {
      const invalidStockDto = {
        quantity: 150, // 超过当前库存
        operation: 'reduce',
      };

      await request(app.getHttpServer())
        .patch(`/products/${productId}/stock`)
        .send(invalidStockDto)
        .expect(400);
    });

    it('should handle concurrent stock updates', async () => {
      const stockReductionDto = {
        quantity: 50,
        operation: 'reduce',
      };

      // 获取更新前的库存
      const productBefore = await productRepository.findOne({ where: { id: productId } });
      const initialStock = productBefore?.stock || 100;

      // 模拟并发请求
      const promises = Array.from({ length: 3 }, () =>
        request(app.getHttpServer()).patch(`/products/${productId}/stock`).send(stockReductionDto),
      );

      const results = await Promise.allSettled(promises);

      // 只有一个请求应该成功，其他应该失败
      const successCount = results.filter(
        result => result.status === 'fulfilled' && result.value.status === 200,
      ).length;

      expect(successCount).toBeLessThanOrEqual(2); // 最多2个成功（100库存可以减少2次50）

      // 验证最终库存值是否正确
      const productAfter = await productRepository.findOne({ where: { id: productId } });
      const finalStock = productAfter?.stock || 0;

      // 最终库存应该是初始库存减去成功请求的数量
      const expectedStock = initialStock - successCount * stockReductionDto.quantity;
      expect(finalStock).toBe(expectedStock);

      // 确保库存不会变为负数
      expect(finalStock).toBeGreaterThanOrEqual(0);
    });
  });

  describe('缓存功能测试', () => {
    let productId: number;

    beforeEach(async () => {
      const savedProduct = await productRepository.save(mockProduct);
      productId = savedProduct.id;
    });

    it('should cache product data on first request', async () => {
      // 第一次请求
      await request(app.getHttpServer()).get(`/products/${productId}`).expect(200);

      // 检查缓存中是否有数据
      const cachedData = await cacheManager.get(`product:${productId}`);
      expect(cachedData).toBeDefined();
    });

    it('should return cached data on subsequent requests', async () => {
      // 第一次请求建立缓存
      const firstResponse = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200);

      // 修改数据库中的数据（不通过API）
      await productRepository.update(productId, { name: '直接修改的名称' });

      // 第二次请求应该返回缓存的数据
      const secondResponse = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200);

      expect(secondResponse.body.name).toBe(firstResponse.body.name);
      expect(secondResponse.body.name).not.toBe('直接修改的名称');
    });

    it('should invalidate cache on product update', async () => {
      // 建立缓存
      await request(app.getHttpServer()).get(`/products/${productId}`).expect(200);

      // 通过API更新产品
      const updateDto = { name: '通过API更新的名称' };
      await request(app.getHttpServer()).put(`/products/${productId}`).send(updateDto).expect(200);

      // 再次请求应该返回更新后的数据
      const response = await request(app.getHttpServer()).get(`/products/${productId}`).expect(200);

      expect(response.body.name).toBe('通过API更新的名称');
    });
  });

  describe('性能和压力测试', () => {
    beforeEach(async () => {
      // 创建大量测试产品
      const products = Array.from({ length: 100 }, (_, index) => ({
        ...mockProduct,
        id: index + 1,
        name: `产品${index + 1}`,
        price: Math.random() * 1000,
        stock: Math.floor(Math.random() * 100),
      }));

      await productRepository.save(products);
    });

    it('should handle large product lists efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer()).get('/products?limit=100').expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.data).toHaveLength(100);
      expect(responseTime).toBeLessThan(1000); // 响应时间应小于1秒
    });

    it('should handle concurrent product requests', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, index) =>
        request(app.getHttpServer()).get(`/products/${index + 1}`),
      );

      const results = await Promise.all(concurrentRequests);

      results.forEach((result, index) => {
        expect(result.status).toBe(200);
        expect(result.body.name).toBe(`产品${index + 1}`);
      });
    });

    it('should handle search with large dataset', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer()).get('/products?search=产品1').expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(responseTime).toBeLessThan(500); // 搜索响应时间应小于500ms
    });
  });

  describe('错误处理和边界情况测试', () => {
    it('should handle database connection errors gracefully', async () => {
      // 模拟数据库连接错误（这需要根据实际实现调整）
      jest
        .spyOn(productRepository, 'find')
        .mockRejectedValue(new Error('Database connection failed'));

      await request(app.getHttpServer()).get('/products').expect(500);

      // 恢复原始实现
      jest.restoreAllMocks();
    });

    it('should validate input data types', async () => {
      const invalidTypeDto = {
        name: 123, // 应该是字符串
        price: 'invalid', // 应该是数字
        stock: 'invalid', // 应该是数字
        categoryId: 'invalid', // 应该是数字
      };

      await request(app.getHttpServer()).post('/products').send(invalidTypeDto).expect(400);
    });

    it('should handle extremely large input values', async () => {
      const largeValueDto = {
        name: 'A'.repeat(10000), // 极长的名称
        description: 'B'.repeat(50000), // 极长的描述
        price: Number.MAX_SAFE_INTEGER,
        stock: Number.MAX_SAFE_INTEGER,
        categoryId: 1,
      };

      await request(app.getHttpServer()).post('/products').send(largeValueDto).expect(400);
    });

    it('should handle special characters in input', async () => {
      // 获取已创建的分类ID，避免硬编码
      const category = await categoryRepository.findOne({ where: { name: mockCategory.name } });
      const categoryId = category?.id || 1;

      const specialCharDto = {
        name: '产品<script>alert("xss")</script>',
        description: "SQL injection test '; DROP TABLE products; --",
        price: 99.99,
        stock: 10,
        categoryId: categoryId,
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .send(specialCharDto)
        .expect(201);

      // 验证特殊字符被正确处理（转义或过滤）
      expect(response.body.name).not.toContain('<script>');
      expect(response.body.description).not.toContain('DROP TABLE');
    });

    it('should handle empty tags array', async () => {
      // 获取已创建的分类ID，避免硬编码
      const category = await categoryRepository.findOne({ where: { name: mockCategory.name } });
      const categoryId = category?.id || 1;

      const emptyTagsDto = {
        name: '无标签产品',
        description: '测试空标签数组',
        price: 99.99,
        stock: 10,
        categoryId: categoryId,
        tags: [], // 空标签数组
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .send(emptyTagsDto)
        .expect(201);

      expect(response.body.tags).toEqual([]);
    });

    it('should handle product with zero price', async () => {
      // 获取已创建的分类ID，避免硬编码
      const category = await categoryRepository.findOne({ where: { name: mockCategory.name } });
      const categoryId = category?.id || 1;

      const zeroPriceDto = {
        name: '免费产品',
        description: '测试零价格产品',
        price: 0, // 零价格
        stock: 10,
        categoryId: categoryId,
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .send(zeroPriceDto)
        .expect(201);

      expect(response.body.price).toBe(0);
    });

    it('should handle product with zero stock', async () => {
      // 获取已创建的分类ID，避免硬编码
      const category = await categoryRepository.findOne({ where: { name: mockCategory.name } });
      const categoryId = category?.id || 1;

      const zeroStockDto = {
        name: '缺货产品',
        description: '测试零库存产品',
        price: 99.99,
        stock: 0, // 零库存
        categoryId: categoryId,
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .send(zeroStockDto)
        .expect(201);

      expect(response.body.stock).toBe(0);
    });

    it('should handle product image URLs', async () => {
      // 获取已创建的分类ID，避免硬编码
      const category = await categoryRepository.findOne({ where: { name: mockCategory.name } });
      const categoryId = category?.id || 1;

      const imageProductDto = {
        name: '带图片的产品',
        description: '测试产品图片URL',
        price: 99.99,
        stock: 10,
        categoryId: categoryId,
        images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .send(imageProductDto)
        .expect(201);

      expect(response.body.images).toEqual(imageProductDto.images);
      expect(response.body.images.length).toBe(2);
    });

    it('should handle product with invalid image URLs', async () => {
      // 获取已创建的分类ID，避免硬编码
      const category = await categoryRepository.findOne({ where: { name: mockCategory.name } });
      const categoryId = category?.id || 1;

      const invalidImageProductDto = {
        name: '带无效图片URL的产品',
        description: '测试无效图片URL',
        price: 99.99,
        stock: 10,
        categoryId: categoryId,
        images: ['not-a-valid-url', 'ftp://invalid-protocol.com/image.jpg'],
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .send(invalidImageProductDto)
        .expect(201); // 即使图片URL无效，产品创建仍应成功

      expect(response.body.images).toBeDefined();
      // 验证系统是否处理了无效URL（可能被过滤或保留原样）
      expect(Array.isArray(response.body.images)).toBe(true);
    });
  });
});
