import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Payment Security Tests (安全测试)', () => {
  let app: INestApplication;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 获取测试用的JWT令牌
    const loginResponse = await request(app.getHttpServer()).post('/api/auth/login').send({
      username: 'testuser',
      password: 'testpass',
    });

    jwtToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('支付回调输入验证测试', () => {
    it('应该拒绝无效的回调数据格式', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payment/callback/alipay')
        .send('invalid-json')
        .expect(400);

      expect(response.body.message).toContain('无效的回调数据');
    });

    it('应该拒绝缺少必要字段的回调', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payment/callback/alipay')
        .send({
          amount: '100.00',
          // 缺少 paymentId 和 status
        })
        .expect(400);

      expect(response.body.message).toContain('缺少必要字段');
    });

    it('应该拒绝无效的支付ID格式', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payment/callback/alipay')
        .send({
          paymentId: "'; DROP TABLE payments; --",
          status: 'success',
          amount: '100.00',
        })
        .expect(400);

      expect(response.body.message).toContain('无效的支付ID格式');
    });

    it('应该拒绝无效的支付状态', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payment/callback/alipay')
        .send({
          paymentId: 'PAY_1234567890_ABCDEF',
          status: 'invalid-status',
          amount: '100.00',
        })
        .expect(400);

      expect(response.body.message).toContain('无效的支付状态');
    });

    it('应该拒绝无效的金额格式', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payment/callback/alipay')
        .send({
          paymentId: 'PAY_1234567890_ABCDEF',
          status: 'success',
          amount: 'invalid-amount',
        })
        .expect(400);

      expect(response.body.message).toContain('无效的金额格式');
    });

    it('应该拒绝无效的区块链交易哈希', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payment/callback/usdt_trc20')
        .send({
          paymentId: 'PAY_1234567890_ABCDEF',
          status: 'success',
          amount: '100.00',
          txHash: 'invalid-hash',
        })
        .expect(400);

      expect(response.body.message).toContain('无效的区块链交易哈希格式');
    });

    it('应该接受有效的回调数据', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payment/callback/alipay')
        .send({
          paymentId: 'PAY_1234567890_ABCDEF',
          status: 'success',
          amount: '100.00',
          thirdPartyTransactionId: 'TXN_1234567890',
        })
        .expect(200);

      expect(response.body.code).toBe('SUCCESS');
    });
  });

  describe('JWT认证安全测试', () => {
    it('应该拒绝缺失的JWT令牌', async () => {
      const response = await request(app.getHttpServer()).get('/api/users/profile').expect(401);

      expect(response.body.message).toContain('JWT令牌缺失');
    });

    it('应该拒绝无效的JWT令牌', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);

      expect(response.body.message).toContain('无效的JWT令牌');
    });

    it('应该拒绝过期的JWT令牌', async () => {
      // 模拟过期令牌
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const response = await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.message).toContain('JWT令牌已过期');
    });

    it('应该接受有效的JWT令牌', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.password).toBeUndefined(); // 密码字段应该被排除
    });
  });

  describe('角色权限安全测试', () => {
    it('应该拒绝普通用户访问管理员接口', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(403);

      expect(response.body.message).toContain('权限不足');
    });

    it('应该允许管理员访问管理员接口', async () => {
      // 这里需要管理员令牌，实际测试中应该创建管理员用户
      // const adminToken = await getAdminToken();
      // const response = await request(app.getHttpServer())
      //   .get('/api/admin/users')
      //   .set('Authorization', `Bearer ${adminToken}`)
      //   .expect(200);
    });
  });

  describe('并发安全测试', () => {
    it('应该防止库存超卖', async () => {
      const productId = 1;
      const initialStock = 10;
      const concurrentOrders = 15;

      // 创建多个并发订单请求
      const orderPromises = Array.from({ length: concurrentOrders }, (_, index) =>
        request(app.getHttpServer())
          .post('/api/orders')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send({
            userId: 1,
            items: [
              {
                productId: productId,
                quantity: 1,
                unitPrice: 100,
              },
            ],
            totalAmount: 100,
            shippingAddress: '测试地址',
            recipientName: '测试用户',
            recipientPhone: '13800138000',
            paymentMethod: 'alipay',
          }),
      );

      const results = await Promise.allSettled(orderPromises);

      // 统计成功和失败的订单
      const successfulOrders = results.filter(
        result => result.status === 'fulfilled' && result.value.status === 201,
      ).length;

      const failedOrders = results.filter(
        result =>
          result.status === 'rejected' ||
          (result.status === 'fulfilled' && result.value.status !== 201),
      ).length;

      // 验证不会超卖
      expect(successfulOrders).toBeLessThanOrEqual(initialStock);
      expect(failedOrders).toBeGreaterThan(0);
    });
  });

  describe('数据泄露防护测试', () => {
    it('用户列表响应不应包含密码字段', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      if (response.body.data && Array.isArray(response.body.data)) {
        response.body.data.forEach((user: any) => {
          expect(user.password).toBeUndefined();
        });
      }
    });

    it('用户详情响应不应包含密码字段', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body.password).toBeUndefined();
    });
  });
});
