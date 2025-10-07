// 用途：支付模块端到端测试，验证完整支付流程：创建订单→发起支付→支付回调→状态更新
// 依赖文件：payment.service.ts, orders.service.ts, payment.controller.ts
// 作者：后端开发团队
// 时间：2025-01-26

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DataSource } from 'typeorm';
import { Payment } from '../src/payment/entities/payment.entity';

describe('支付流程 E2E Tests', () => {
  let app: INestApplication;
  let cacheManager: Cache;
  let dataSource: DataSource;
  let authToken: string;
  let testUserId: number;
  let testOrderId: string;
  let testProductId: number;

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
    await setupTestProduct();
    await setupTestOrder();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  beforeEach(async () => {
    // 清理缓存
    await cacheManager.clear();
  });

  async function cleanupTestData() {
    try {
      // 清理支付记录
      await dataSource.query('DELETE FROM payments WHERE order_id LIKE ?', ['TEST_%']);
      // 清理订单记录
      await dataSource.query('DELETE FROM orders WHERE order_id LIKE ?', ['TEST_%']);
      // 清理测试用户
      await dataSource.query('DELETE FROM users WHERE email LIKE ?', ['payment-test%']);
      // 清理测试产品
      await dataSource.query('DELETE FROM products WHERE name LIKE ?', ['测试支付产品%']);
    } catch (error) {
      console.log('清理测试数据时出错:', error.message);
    }
  }

  async function setupTestUser() {
    const userData = {
      email: 'payment-test@example.com',
      password: 'Password123!',
      username: '支付测试用户',
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

  async function setupTestProduct() {
    const productData = {
      name: '测试支付产品',
      description: '用于支付测试的产品',
      price: 99.99,
      stock: 100,
      category: 'test',
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send(productData)
      .expect(201);

    testProductId = response.body.data.id;
  }

  async function setupTestOrder() {
    const orderData = {
      items: [
        {
          productId: testProductId,
          quantity: 2,
          price: 99.99,
        },
      ],
      totalAmount: 199.98,
      shippingAddress: {
        name: '测试用户',
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

    testOrderId = response.body.data.orderId;
  }

  describe('支付创建流程', () => {
    it('应该成功创建支付宝支付', async () => {
      const paymentData = {
        orderId: testOrderId,
        amount: 199.98,
        currency: 'CNY',
        method: 'alipay',
        returnUrl: 'https://example.com/return',
        notifyUrl: 'https://example.com/notify',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payment/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('paymentId');
      expect(response.body.data).toHaveProperty('paymentUrl');
      expect(response.body.data.orderId).toBe(testOrderId);
      expect(response.body.data.amount).toBe(199.98);
      expect(response.body.data.method).toBe('alipay');
      expect(response.body.data.status).toBe('pending');
    });

    it('应该成功创建微信支付', async () => {
      const paymentData = {
        orderId: testOrderId,
        amount: 199.98,
        currency: 'CNY',
        method: 'wechat',
        returnUrl: 'https://example.com/return',
        notifyUrl: 'https://example.com/notify',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payment/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('paymentId');
      expect(response.body.data).toHaveProperty('qrCode');
      expect(response.body.data.method).toBe('wechat');
    });

    it('应该拒绝无效的支付金额', async () => {
      const paymentData = {
        orderId: testOrderId,
        amount: -10,
        currency: 'CNY',
        method: 'alipay',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payment/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('金额必须大于0');
    });

    it('应该拒绝不存在的订单', async () => {
      const paymentData = {
        orderId: 'NON_EXISTENT_ORDER',
        amount: 199.98,
        currency: 'CNY',
        method: 'alipay',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payment/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('订单不存在');
    });
  });

  describe('支付状态查询', () => {
    let paymentId: string;

    beforeEach(async () => {
      // 创建一个测试支付
      const paymentData = {
        orderId: testOrderId,
        amount: 199.98,
        currency: 'CNY',
        method: 'alipay',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payment/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData);

      paymentId = response.body.data.paymentId;
    });

    it('应该成功查询支付状态', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/payment/${paymentId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('paymentId', paymentId);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('orderId', testOrderId);
    });

    it('应该拒绝查询不存在的支付', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/payment/NON_EXISTENT_PAYMENT/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('支付记录不存在');
    });
  });

  describe('支付回调处理', () => {
    let paymentId: string;

    beforeEach(async () => {
      // 创建一个测试支付
      const paymentData = {
        orderId: testOrderId,
        amount: 199.98,
        currency: 'CNY',
        method: 'alipay',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payment/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData);

      paymentId = response.body.data.paymentId;
    });

    it('应该成功处理支付宝成功回调', async () => {
      const callbackData = {
        out_trade_no: paymentId,
        trade_no: 'ALIPAY_TRADE_123456',
        trade_status: 'TRADE_SUCCESS',
        total_amount: '199.98',
        buyer_email: 'buyer@example.com',
        gmt_payment: '2025-01-26 10:00:00',
        sign: 'mock_signature',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payment/callback/alipay')
        .send(callbackData)
        .expect(200);

      expect(response.text).toBe('success');

      // 验证支付状态已更新
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/v1/payment/${paymentId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusResponse.body.data.status).toBe('success');
    });

    it('应该成功处理微信支付成功回调', async () => {
      // 先创建微信支付
      const paymentData = {
        orderId: testOrderId,
        amount: 199.98,
        currency: 'CNY',
        method: 'wechat',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/payment/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData);

      const wechatPaymentId = createResponse.body.data.paymentId;

      const callbackData = {
        out_trade_no: wechatPaymentId,
        transaction_id: 'WECHAT_TRADE_123456',
        result_code: 'SUCCESS',
        total_fee: '19998', // 微信支付金额以分为单位
        time_end: '20250126100000',
        sign: 'mock_signature',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payment/callback/wechat')
        .send(callbackData)
        .expect(200);

      expect(response.text).toContain('SUCCESS');

      // 验证支付状态已更新
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/v1/payment/${wechatPaymentId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusResponse.body.data.status).toBe('success');
    });

    it('应该正确处理支付失败回调', async () => {
      const callbackData = {
        out_trade_no: paymentId,
        trade_no: 'ALIPAY_TRADE_123456',
        trade_status: 'TRADE_CLOSED',
        total_amount: '199.98',
        sign: 'mock_signature',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payment/callback/alipay')
        .send(callbackData)
        .expect(200);

      expect(response.text).toBe('success');

      // 验证支付状态已更新为失败
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/v1/payment/${paymentId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusResponse.body.data.status).toBe('failed');
    });
  });

  describe('支付退款流程', () => {
    let paymentId: string;

    beforeEach(async () => {
      // 创建并完成一个支付
      const paymentData = {
        orderId: testOrderId,
        amount: 199.98,
        currency: 'CNY',
        method: 'alipay',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/payment/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData);

      paymentId = createResponse.body.data.paymentId;

      // 模拟支付成功
      const callbackData = {
        out_trade_no: paymentId,
        trade_no: 'ALIPAY_TRADE_123456',
        trade_status: 'TRADE_SUCCESS',
        total_amount: '199.98',
        sign: 'mock_signature',
      };

      await request(app.getHttpServer()).post('/api/v1/payment/callback/alipay').send(callbackData);
    });

    it('应该成功创建全额退款', async () => {
      const refundData = {
        paymentId: paymentId,
        amount: 199.98,
        reason: '用户申请退款',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send(refundData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('refundId');
      expect(response.body.data.amount).toBe(199.98);
      expect(response.body.data.status).toBe('processing');
    });

    it('应该成功创建部分退款', async () => {
      const refundData = {
        paymentId: paymentId,
        amount: 99.99,
        reason: '部分商品退款',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send(refundData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.amount).toBe(99.99);
    });

    it('应该拒绝超额退款', async () => {
      const refundData = {
        paymentId: paymentId,
        amount: 299.99, // 超过原支付金额
        reason: '超额退款测试',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send(refundData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('退款金额不能超过支付金额');
    });
  });

  describe('支付安全性测试', () => {
    it('应该拒绝未授权的支付创建', async () => {
      const paymentData = {
        orderId: testOrderId,
        amount: 199.98,
        currency: 'CNY',
        method: 'alipay',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payment/create')
        .send(paymentData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('应该验证支付回调签名', async () => {
      const callbackData = {
        out_trade_no: 'INVALID_PAYMENT_ID',
        trade_no: 'ALIPAY_TRADE_123456',
        trade_status: 'TRADE_SUCCESS',
        total_amount: '199.98',
        sign: 'invalid_signature',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payment/callback/alipay')
        .send(callbackData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('签名验证失败');
    });

    it('应该防止重复支付', async () => {
      const paymentData = {
        orderId: testOrderId,
        amount: 199.98,
        currency: 'CNY',
        method: 'alipay',
      };

      // 第一次创建支付
      await request(app.getHttpServer())
        .post('/api/v1/payment/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(201);

      // 第二次创建相同订单的支付应该失败
      const response = await request(app.getHttpServer())
        .post('/api/v1/payment/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('订单已存在待支付记录');
    });
  });

  describe('支付性能测试', () => {
    it('支付创建应该在合理时间内完成', async () => {
      const paymentData = {
        orderId: testOrderId,
        amount: 199.98,
        currency: 'CNY',
        method: 'alipay',
      };

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/api/v1/payment/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(201);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(2000); // 应该在2秒内完成
    });

    it('支付状态查询应该支持高并发', async () => {
      // 创建一个支付
      const paymentData = {
        orderId: testOrderId,
        amount: 199.98,
        currency: 'CNY',
        method: 'alipay',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/payment/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData);

      const paymentId = createResponse.body.data.paymentId;

      // 并发查询支付状态
      const promises = Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .get(`/api/v1/payment/${paymentId}/status`)
          .set('Authorization', `Bearer ${authToken}`),
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
