// 用途：购物车到支付完整流程集成测试，验证从添加商品→结算→下单→支付的完整业务链路
// 依赖文件：cart.service.ts, orders.service.ts, payment.service.ts, products.service.ts
// 作者：后端开发团队
// 时间：2025-01-26

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DataSource } from 'typeorm';

describe('购物车到支付完整流程 E2E Tests', () => {
  let app: INestApplication;
  let cacheManager: Cache;
  let dataSource: DataSource;
  let authToken: string;
  let testUserId: number;
  let testProducts: any[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    cacheManager = app.get(CACHE_MANAGER);
    dataSource = app.get(DataSource);

    // 清理测试数据
    await cleanupTestData();

    // 设置测试环境
    await setupTestUser();
    await setupTestProducts();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  beforeEach(async () => {
    // 清理缓存和购物车
    await cacheManager.clear();
    await clearUserCart();
  });

  async function cleanupTestData() {
    try {
      // 清理支付记录
      await dataSource.query('DELETE FROM payments WHERE order_id LIKE ?', ['CART_TEST_%']);
      // 清理订单记录
      await dataSource.query('DELETE FROM orders WHERE order_id LIKE ?', ['CART_TEST_%']);
      // 清理购物车
      await dataSource.query(
        'DELETE FROM cart_items WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)',
        ['cart-payment-test%'],
      );
      // 清理测试用户
      await dataSource.query('DELETE FROM users WHERE email LIKE ?', ['cart-payment-test%']);
      // 清理测试产品
      await dataSource.query('DELETE FROM products WHERE name LIKE ?', ['购物车测试产品%']);
    } catch (error) {
      console.log('清理测试数据时出错:', error.message);
    }
  }

  async function setupTestUser() {
    const userData = {
      email: 'cart-payment-test@example.com',
      password: 'Password123!',
      username: '购物车支付测试用户',
    };

    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(userData)
      .expect(201);

    testUserId = registerResponse.body.data.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: userData.email,
        password: userData.password,
      })
      .expect(200);

    authToken = loginResponse.body.data.access_token;
  }

  async function setupTestProducts() {
    const products = [
      {
        name: '购物车测试产品1',
        description: '用于购物车测试的产品1',
        price: 99.99,
        stock: 100,
        category: 'electronics',
      },
      {
        name: '购物车测试产品2',
        description: '用于购物车测试的产品2',
        price: 149.99,
        stock: 50,
        category: 'clothing',
      },
      {
        name: '购物车测试产品3',
        description: '用于购物车测试的产品3',
        price: 79.99,
        stock: 200,
        category: 'books',
      },
    ];

    for (const productData of products) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(201);

      testProducts.push(response.body.data);
    }
  }

  async function clearUserCart() {
    await request(app.getHttpServer())
      .delete('/api/v1/cart/clear')
      .set('Authorization', `Bearer ${authToken}`);
  }

  describe('完整购物流程测试', () => {
    it('应该完成从添加商品到支付成功的完整流程', async () => {
      // 步骤1: 添加商品到购物车
      const addToCartData1 = {
        productId: testProducts[0].id,
        quantity: 2,
      };

      const addToCartData2 = {
        productId: testProducts[1].id,
        quantity: 1,
      };

      await request(app.getHttpServer())
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send(addToCartData1)
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send(addToCartData2)
        .expect(201);

      // 步骤2: 查看购物车内容
      const cartResponse = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cartResponse.body.data.items).toHaveLength(2);
      expect(cartResponse.body.data.totalAmount).toBe(349.97); // 99.99*2 + 149.99*1

      // 步骤3: 更新购物车商品数量
      const updateCartData = {
        productId: testProducts[0].id,
        quantity: 3,
      };

      await request(app.getHttpServer())
        .put('/api/v1/cart/update')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateCartData)
        .expect(200);

      // 步骤4: 再次查看购物车，验证更新
      const updatedCartResponse = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(updatedCartResponse.body.data.totalAmount).toBe(449.96); // 99.99*3 + 149.99*1

      // 步骤5: 结算购物车，创建订单
      const checkoutData = {
        shippingAddress: {
          name: '测试用户',
          phone: '13800138000',
          address: '测试地址123号',
          city: '测试城市',
          province: '测试省份',
          postalCode: '100000',
        },
        paymentMethod: 'alipay',
        couponCode: null,
      };

      const checkoutResponse = await request(app.getHttpServer())
        .post('/api/v1/cart/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      const orderId = checkoutResponse.body.data.orderId;
      expect(orderId).toBeDefined();
      expect(checkoutResponse.body.data.totalAmount).toBe(449.96);

      // 步骤6: 验证购物车已清空
      const emptyCartResponse = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(emptyCartResponse.body.data.items).toHaveLength(0);

      // 步骤7: 创建支付
      const paymentData = {
        orderId: orderId,
        amount: 449.96,
        currency: 'CNY',
        method: 'alipay',
        returnUrl: 'https://example.com/return',
        notifyUrl: 'https://example.com/notify',
      };

      const paymentResponse = await request(app.getHttpServer())
        .post('/api/v1/payment/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(201);

      const paymentId = paymentResponse.body.data.paymentId;
      expect(paymentId).toBeDefined();
      expect(paymentResponse.body.data.paymentUrl).toBeDefined();

      // 步骤8: 模拟支付成功回调
      const callbackData = {
        out_trade_no: paymentId,
        trade_no: 'ALIPAY_TRADE_CART_TEST_123456',
        trade_status: 'TRADE_SUCCESS',
        total_amount: '449.96',
        buyer_email: 'buyer@example.com',
        gmt_payment: '2025-01-26 10:00:00',
        sign: 'mock_signature',
      };

      await request(app.getHttpServer())
        .post('/api/v1/payment/callback/alipay')
        .send(callbackData)
        .expect(200);

      // 步骤9: 验证支付状态
      const paymentStatusResponse = await request(app.getHttpServer())
        .get(`/api/v1/payment/${paymentId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(paymentStatusResponse.body.data.status).toBe('success');

      // 步骤10: 验证订单状态
      const orderStatusResponse = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(orderStatusResponse.body.data.status).toBe('paid');
      expect(orderStatusResponse.body.data.paymentStatus).toBe('success');
    });

    it('应该正确处理库存不足的情况', async () => {
      // 添加超过库存的商品数量
      const addToCartData = {
        productId: testProducts[1].id, // 库存为50
        quantity: 60, // 超过库存
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send(addToCartData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('库存不足');
    });

    it('应该正确处理商品价格变动', async () => {
      // 添加商品到购物车
      const addToCartData = {
        productId: testProducts[2].id,
        quantity: 2,
      };

      await request(app.getHttpServer())
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send(addToCartData)
        .expect(201);

      // 模拟商品价格变动
      const updateProductData = {
        price: 89.99, // 从79.99变为89.99
      };

      await request(app.getHttpServer())
        .patch(`/api/v1/products/${testProducts[2].id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateProductData)
        .expect(200);

      // 结算时应该使用最新价格
      const checkoutData = {
        shippingAddress: {
          name: '测试用户',
          phone: '13800138000',
          address: '测试地址123号',
          city: '测试城市',
          province: '测试省份',
          postalCode: '100000',
        },
        paymentMethod: 'alipay',
      };

      const checkoutResponse = await request(app.getHttpServer())
        .post('/api/v1/cart/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      expect(checkoutResponse.body.data.totalAmount).toBe(179.98); // 89.99 * 2
    });
  });

  describe('购物车并发操作测试', () => {
    it('应该正确处理并发添加相同商品', async () => {
      const addToCartData = {
        productId: testProducts[0].id,
        quantity: 1,
      };

      // 并发添加相同商品
      const promises = Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .post('/api/v1/cart/add')
          .set('Authorization', `Bearer ${authToken}`)
          .send(addToCartData),
      );

      const responses = await Promise.all(promises);

      // 至少有一个请求成功
      const successCount = responses.filter(r => r.status === 201).length;
      expect(successCount).toBeGreaterThan(0);

      // 验证购物车中的数量正确
      const cartResponse = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const cartItem = cartResponse.body.data.items.find(
        (item: any) => item.productId === testProducts[0].id,
      );
      expect(cartItem.quantity).toBe(successCount);
    });

    it('应该正确处理并发结算操作', async () => {
      // 先添加商品到购物车
      const addToCartData = {
        productId: testProducts[0].id,
        quantity: 1,
      };

      await request(app.getHttpServer())
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send(addToCartData)
        .expect(201);

      const checkoutData = {
        shippingAddress: {
          name: '测试用户',
          phone: '13800138000',
          address: '测试地址123号',
          city: '测试城市',
          province: '测试省份',
          postalCode: '100000',
        },
        paymentMethod: 'alipay',
      };

      // 并发结算
      const promises = Array.from({ length: 3 }, () =>
        request(app.getHttpServer())
          .post('/api/v1/cart/checkout')
          .set('Authorization', `Bearer ${authToken}`)
          .send(checkoutData),
      );

      const responses = await Promise.all(promises);

      // 只有一个请求应该成功
      const successCount = responses.filter(r => r.status === 201).length;
      expect(successCount).toBe(1);

      // 其他请求应该返回购物车为空的错误
      const failedResponses = responses.filter(r => r.status !== 201);
      failedResponses.forEach(response => {
        expect(response.body.message).toContain('购物车为空');
      });
    });
  });

  describe('优惠券和促销测试', () => {
    it('应该正确应用优惠券折扣', async () => {
      // 添加商品到购物车
      const addToCartData = {
        productId: testProducts[0].id,
        quantity: 2,
      };

      await request(app.getHttpServer())
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send(addToCartData)
        .expect(201);

      // 结算时使用优惠券
      const checkoutData = {
        shippingAddress: {
          name: '测试用户',
          phone: '13800138000',
          address: '测试地址123号',
          city: '测试城市',
          province: '测试省份',
          postalCode: '100000',
        },
        paymentMethod: 'alipay',
        couponCode: 'DISCOUNT10', // 假设这是一个10%折扣的优惠券
      };

      const checkoutResponse = await request(app.getHttpServer())
        .post('/api/v1/cart/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      // 验证折扣已应用
      const originalAmount = 199.98; // 99.99 * 2
      const discountedAmount = checkoutResponse.body.data.totalAmount;
      expect(discountedAmount).toBeLessThan(originalAmount);
      expect(checkoutResponse.body.data.discount).toBeDefined();
    });

    it('应该拒绝无效的优惠券', async () => {
      // 添加商品到购物车
      const addToCartData = {
        productId: testProducts[0].id,
        quantity: 1,
      };

      await request(app.getHttpServer())
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send(addToCartData)
        .expect(201);

      // 使用无效优惠券结算
      const checkoutData = {
        shippingAddress: {
          name: '测试用户',
          phone: '13800138000',
          address: '测试地址123号',
          city: '测试城市',
          province: '测试省份',
          postalCode: '100000',
        },
        paymentMethod: 'alipay',
        couponCode: 'INVALID_COUPON',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/cart/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('优惠券无效');
    });
  });

  describe('支付失败处理测试', () => {
    it('应该正确处理支付失败后的订单状态', async () => {
      // 完成购物车到订单的流程
      const addToCartData = {
        productId: testProducts[0].id,
        quantity: 1,
      };

      await request(app.getHttpServer())
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send(addToCartData)
        .expect(201);

      const checkoutData = {
        shippingAddress: {
          name: '测试用户',
          phone: '13800138000',
          address: '测试地址123号',
          city: '测试城市',
          province: '测试省份',
          postalCode: '100000',
        },
        paymentMethod: 'alipay',
      };

      const checkoutResponse = await request(app.getHttpServer())
        .post('/api/v1/cart/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      const orderId = checkoutResponse.body.data.orderId;

      // 创建支付
      const paymentData = {
        orderId: orderId,
        amount: 99.99,
        currency: 'CNY',
        method: 'alipay',
      };

      const paymentResponse = await request(app.getHttpServer())
        .post('/api/v1/payment/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(201);

      const paymentId = paymentResponse.body.data.paymentId;

      // 模拟支付失败回调
      const callbackData = {
        out_trade_no: paymentId,
        trade_no: 'ALIPAY_TRADE_FAILED_123456',
        trade_status: 'TRADE_CLOSED',
        total_amount: '99.99',
        sign: 'mock_signature',
      };

      await request(app.getHttpServer())
        .post('/api/v1/payment/callback/alipay')
        .send(callbackData)
        .expect(200);

      // 验证订单状态为支付失败
      const orderStatusResponse = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(orderStatusResponse.body.data.paymentStatus).toBe('failed');

      // 验证库存已恢复
      const productResponse = await request(app.getHttpServer())
        .get(`/api/v1/products/${testProducts[0].id}`)
        .expect(200);

      expect(productResponse.body.data.stock).toBe(100); // 原始库存
    });
  });
});
