// 用途：产品模块端到端测试，验证缓存一致性和业务逻辑
// 依赖文件：products.service.ts, cache.module.ts
// 作者：后端开发团队
// 时间：2025-09-30

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

describe('Products E2E Tests', () => {
  let app: INestApplication;
  let cacheManager: Cache;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    cacheManager = app.get(CACHE_MANAGER);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('缓存一致性测试', () => {
    it('创建产品后应清除相关缓存', async () => {
      // 1. 先获取产品列表，确保缓存存在
      const listResponse = await request(app.getHttpServer()).get('/api/v1/products').expect(200);

      const keyPrefix = 'caddy_shopping';
      const listCacheKey = `${keyPrefix}:products:list:1:20:`;

      // 2. 验证列表缓存存在
      const cachedList = await cacheManager.get(listCacheKey);
      expect(cachedList).toBeDefined();

      // 3. 创建新产品
      const newProduct = {
        name: '测试产品',
        description: '测试描述',
        price: 100,
        stock: 10,
        categoryId: 1,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/products')
        .send(newProduct)
        .expect(201);

      const productId = createResponse.body.id;

      // 4. 验证缓存已被清除
      const clearedListCache = await cacheManager.get(listCacheKey);
      expect(clearedListCache).toBeUndefined();

      // 5. 验证产品详情缓存不存在（新创建的产品）
      const detailCacheKey = `${keyPrefix}:product:${productId}`;
      const detailCache = await cacheManager.get(detailCacheKey);
      expect(detailCache).toBeUndefined();
    });

    it('更新产品后应清除详情和列表缓存', async () => {
      // 1. 获取产品详情，确保缓存存在
      const productResponse = await request(app.getHttpServer())
        .get('/api/v1/products/1')
        .expect(200);

      const keyPrefix = 'caddy_shopping';
      const detailCacheKey = `${keyPrefix}:product:1`;

      // 2. 验证详情缓存存在
      const cachedDetail = await cacheManager.get(detailCacheKey);
      expect(cachedDetail).toBeDefined();

      // 3. 更新产品
      const updateData = {
        name: '更新后的产品名称',
        price: 150,
      };

      await request(app.getHttpServer()).patch('/api/v1/products/1').send(updateData).expect(200);

      // 4. 验证详情缓存已被清除
      const clearedDetailCache = await cacheManager.get(detailCacheKey);
      expect(clearedDetailCache).toBeUndefined();

      // 5. 验证列表缓存也被清除
      const listCacheKey = `${keyPrefix}:products:list:1:20:`;
      const clearedListCache = await cacheManager.get(listCacheKey);
      expect(clearedListCache).toBeUndefined();
    });

    it('删除产品后应清除所有相关缓存', async () => {
      // 1. 先创建测试产品
      const newProduct = {
        name: '待删除产品',
        description: '测试删除功能',
        price: 200,
        stock: 5,
        categoryId: 1,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/products')
        .send(newProduct)
        .expect(201);

      const productId = createResponse.body.id;

      // 2. 获取产品详情，确保缓存存在
      await request(app.getHttpServer()).get(`/api/v1/products/${productId}`).expect(200);

      const keyPrefix = 'caddy_shopping';
      const detailCacheKey = `${keyPrefix}:product:${productId}`;

      // 3. 验证详情缓存存在
      const cachedDetail = await cacheManager.get(detailCacheKey);
      expect(cachedDetail).toBeDefined();

      // 4. 删除产品
      await request(app.getHttpServer()).delete(`/api/v1/products/${productId}`).expect(200);

      // 5. 验证详情缓存已被清除
      const clearedDetailCache = await cacheManager.get(detailCacheKey);
      expect(clearedDetailCache).toBeUndefined();
    });
  });

  describe('业务逻辑测试', () => {
    it('搜索产品应返回正确结果', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products/search?keyword=测试')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.products)).toBe(true);
    });

    it('获取热门产品应返回排序结果', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products/popular?limit=5')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // 验证产品按销量排序
      if (response.body.length > 1) {
        const sales = response.body.map((p: { sales: number }) => p.sales);
        const sortedSales = [...sales].sort((a, b) => b - a);
        expect(sales).toEqual(sortedSales);
      }
    });
  });

  describe('性能测试', () => {
    it('缓存命中应显著提高响应速度', async () => {
      // 第一次请求（缓存未命中）
      const start1 = Date.now();
      await request(app.getHttpServer()).get('/api/v1/products/1').expect(200);
      const duration1 = Date.now() - start1;

      // 第二次请求（缓存命中）
      const start2 = Date.now();
      await request(app.getHttpServer()).get('/api/v1/products/1').expect(200);
      const duration2 = Date.now() - start2;

      // 缓存命中应该比未命中快
      expect(duration2).toBeLessThan(duration1);
    });
  });
});
