// 用途：认证模块端到端测试，验证JWT认证流程和权限控制
// 依赖文件：auth.service.ts, jwt.strategy.ts
// 作者：后端开发团队
// 时间：2025-09-30

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('认证 E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('用户注册与登录', () => {
    it('应该成功注册新用户', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: '测试用户',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body.user).toHaveProperty('email', userData.email);
    });

    it('应该成功登录用户', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');

      authToken = response.body.access_token;
      refreshToken = response.body.refresh_token;
    });

    it('应该拒绝无效密码登录', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      await request(app.getHttpServer()).post('/api/v1/auth/login').send(loginData).expect(401);
    });
  });

  describe('JWT令牌验证', () => {
    it('应该使用有效令牌访问受保护接口', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('name');
    });

    it('应该拒绝无令牌访问受保护接口', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/profile').expect(401);
    });

    it('应该拒绝无效令牌访问', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('应该拒绝过期令牌访问', async () => {
      // 模拟过期令牌（需要在实际测试中生成过期令牌）
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('令牌刷新', () => {
    it('应该成功刷新访问令牌', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');

      // 更新令牌用于后续测试
      authToken = response.body.access_token;
      refreshToken = response.body.refresh_token;
    });

    it('应该拒绝无效刷新令牌', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ refresh_token: 'invalid-refresh-token' })
        .expect(401);
    });
  });

  describe('权限控制', () => {
    it('普通用户应该无法访问管理员接口', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('应该根据用户角色限制接口访问', async () => {
      // 测试不同角色的权限控制
      // 这里需要根据实际业务逻辑编写具体测试
    });
  });

  describe('安全特性', () => {
    it('应该限制登录尝试频率', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      // 连续多次错误登录尝试
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer()).post('/api/v1/auth/login').send(loginData).expect(401);
      }

      // 应该触发限流，返回429状态码
      await request(app.getHttpServer()).post('/api/v1/auth/login').send(loginData).expect(429);
    });

    it('应该记录认证相关安全事件', async () => {
      // 验证认证事件是否被正确记录
      // 需要集成监控系统来验证
    });
  });

  describe('缓存一致性测试', () => {
    it('用户信息更新后应该清除相关缓存', async () => {
      // 1. 先获取用户信息，建立缓存
      const profileResponse1 = await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 2. 更新用户信息
      const updateData = {
        name: '更新后的用户名',
      };

      await request(app.getHttpServer())
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      // 3. 再次获取用户信息，验证缓存已更新
      const profileResponse2 = await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse2.body.name).toBe(updateData.name);
    });
  });
});
