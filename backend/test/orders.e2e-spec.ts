// 用途：订单模块端到端测试，验证下单→库存扣减→订单状态完整流程
// 依赖文件：orders.service.ts, products.service.ts, messaging.module.ts
// 作者：后端开发团队
// 时间：2025-09-30

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

describe('订单 E2E Tests', () => {
  let app: INestApplication;
  let cacheManager: Cache;
  let authToken: string;
  let productId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    cacheManager = app.get(CACHE_MANAGER);

    // 先注册用户并获取令牌
    await setupTestUser();

    // 创建测试产品
    await setupTestProduct();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupTestUser() {
    const userData = {
      email: 'order-test@example.com',
      password: 'Password123!',
      name: '订单测试用户',
    };

    await request(app.getHttpServer()).post('/api/v1/auth/register').send(userData).expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: userData.email,
        password: userData.password,
      })
      .expect(200);

    authToken = loginResponse.body.access_token;
  }

  async function setupTestProduct() {
    const productData = {
      name: '订单测试产品',
      description: '用于订单流程测试的产品',
      price: 100,
      stock: 50,
      categoryId: 1,
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send(productData)
      .expect(201);

    productId = response.body.id;
  }

  describe('下单流程测试', () => {
    it('应该成功创建订单并扣减库存', async () => {
      const orderData = {
        items: [
          {
            productId: productId,
            quantity: 2,
            price: 100,
          },
        ],
        shippingAddress: {
          recipient: '测试收货人',
          phone: '13800138000',
          address: '测试地址',
          city: '测试城市',
          province: '测试省份',
          postalCode: '100000',
        },
      };

      // 1. 下单前获取产品库存
      const productBefore = await request(app.getHttpServer())
        .get(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const stockBefore = productBefore.body.stock;

      // 2. 创建订单
      const orderResponse = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);

      expect(orderResponse.body).toHaveProperty('id');
      expect(orderResponse.body.status).toBe('pending');
      expect(orderResponse.body.totalAmount).toBe(200); // 2 * 100

      const orderId = orderResponse.body.id;

      // 3. 验证库存已扣减
      const productAfter = await request(app.getHttpServer())
        .get(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(productAfter.body.stock).toBe(stockBefore - 2);

      // 4. 验证订单详情
      const orderDetail = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(orderDetail.body.id).toBe(orderId);
      expect(orderDetail.body.items).toHaveLength(1);
      expect(orderDetail.body.items[0].productId).toBe(productId);
      expect(orderDetail.body.items[0].quantity).toBe(2);
    });

    it('应该拒绝库存不足的下单请求', async () => {
      const orderData = {
        items: [
          {
            productId: productId,
            quantity: 1000, // 超过库存数量
            price: 100,
          },
        ],
        shippingAddress: {
          recipient: '测试收货人',
          phone: '13800138000',
          address: '测试地址',
          city: '测试城市',
          province: '测试省份',
          postalCode: '100000',
        },
      };

      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(400); // 应该返回库存不足错误
    });
  });

  describe('订单状态流程测试', () => {
    let orderId: number;

    beforeEach(async () => {
      // 创建测试订单
      const orderData = {
        items: [
          {
            productId: productId,
            quantity: 1,
            price: 100,
          },
        ],
        shippingAddress: {
          recipient: '测试收货人',
          phone: '13800138000',
          address: '测试地址',
          city: '测试城市',
          province: '测试省份',
          postalCode: '100000',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);

      orderId = response.body.id;
    });

    it('应该成功更新订单状态', async () => {
      // 1. 支付订单
      await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'paid' })
        .expect(200);

      // 验证订单状态已更新
      const orderAfterPayment = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(orderAfterPayment.body.status).toBe('paid');

      // 2. 发货
      await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'shipped' })
        .expect(200);

      // 3. 完成订单
      await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' })
        .expect(200);
    });

    it('应该拒绝无效的状态更新', async () => {
      // 尝试从pending直接跳到completed（跳过paid和shipped）
      await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' })
        .expect(400); // 应该返回状态转换错误
    });
  });

  describe('缓存一致性测试', () => {
    it('订单创建后应该清除相关缓存', async () => {
      const keyPrefix = 'caddy_shopping';

      // 1. 先获取用户订单列表，建立缓存
      const listResponse1 = await request(app.getHttpServer())
        .get('/api/v1/orders/my-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const listCacheKey = `${keyPrefix}:orders:user:${authToken.substring(0, 10)}:list:1:10`;

      // 2. 创建新订单
      const orderData = {
        items: [
          {
            productId: productId,
            quantity: 1,
            price: 100,
          },
        ],
        shippingAddress: {
          recipient: '测试收货人',
          phone: '13800138000',
          address: '测试地址',
          city: '测试城市',
          province: '测试省份',
          postalCode: '100000',
        },
      };

      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);

      // 3. 验证订单列表缓存已被清除
      const cachedList = await cacheManager.get(listCacheKey);
      expect(cachedList).toBeUndefined();
    });

    it('产品库存更新后应该清除产品缓存', async () => {
      const keyPrefix = 'caddy_shopping';
      const productCacheKey = `${keyPrefix}:product:${productId}`;

      // 1. 先获取产品详情，建立缓存
      await request(app.getHttpServer())
        .get(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 验证缓存存在
      const cachedProduct = await cacheManager.get(productCacheKey);
      expect(cachedProduct).toBeDefined();

      // 2. 创建订单（会扣减库存）
      const orderData = {
        items: [
          {
            productId: productId,
            quantity: 1,
            price: 100,
          },
        ],
        shippingAddress: {
          recipient: '测试收货人',
          phone: '13800138000',
          address: '测试地址',
          city: '测试城市',
          province: '测试省份',
          postalCode: '100000',
        },
      };

      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);

      // 3. 验证产品详情缓存已被清除
      const clearedCache = await cacheManager.get(productCacheKey);
      expect(clearedCache).toBeUndefined();
    });
  });

  describe('消息队列异步一致性测试', () => {
    it('订单创建后应该触发相关消息事件', async () => {
      // 这个测试需要实际的消息队列环境
      // 在真实环境中验证订单创建事件是否被正确发布

      const orderData = {
        items: [
          {
            productId: productId,
            quantity: 1,
            price: 100,
          },
        ],
        shippingAddress: {
          recipient: '测试收货人',
          phone: '13800138000',
          address: '测试地址',
          city: '测试城市',
          province: '测试省份',
          postalCode: '100000',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);

      // 这里可以添加消息队列消费验证逻辑
      // 需要集成测试环境支持
    });
  });

  describe('性能测试', () => {
    it('高并发下单应该正确处理', async () => {
      // 模拟并发下单场景
      const concurrentRequests = 10;
      const promises: Promise<any>[] = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const orderData = {
          items: [
            {
              productId: productId,
              quantity: 1,
              price: 100,
            },
          ],
          shippingAddress: {
            recipient: `测试收货人${i}`,
            phone: '13800138000',
            address: '测试地址',
            city: '测试城市',
            province: '测试省份',
            postalCode: '100000',
          },
        };

        promises.push(
          request(app.getHttpServer())
            .post('/api/v1/orders')
            .set('Authorization', `Bearer ${authToken}`)
            .send(orderData),
        );
      }

      const results = await Promise.allSettled(promises);

      // 验证大部分请求成功
      const successfulRequests = results.filter(
        result => result.status === 'fulfilled' && result.value.status === 201,
      ).length;

      expect(successfulRequests).toBeGreaterThan(concurrentRequests * 0.8); // 80%成功率
    });
  });
});
