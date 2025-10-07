// 用途：认证安全端到端测试
// 依赖文件：auth.service.ts, users.service.ts, jwt.service.ts
// 作者：AI助手
// 时间：2025-10-02 00:00:00

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as supertest from 'supertest';
const request = (app: any) => supertest.default(app);
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// 使用正确的UserEntity导入
import { UserEntity } from '../src/users/infrastructure/persistence/typeorm/user.entity';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

describe('AuthSecurity (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let usersService: UsersService;
  let userRepository: Repository<UserEntity>;
  let jwtService: JwtService;

  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'TestPassword123!',
    role: 'user' as const,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [UserEntity],
          synchronize: true,
          logging: false,
        }),
        AuthModule,
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    authService = moduleFixture.get<AuthService>(AuthService);
    usersService = moduleFixture.get<UsersService>(UsersService);
    userRepository = moduleFixture.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // 清理数据库
    await userRepository.clear();
  });

  describe('用户注册安全测试', () => {
    it('应该成功注册新用户', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.username).toBe(testUser.username);
    });

    it('应该拒绝重复的邮箱注册', async () => {
      // 先注册一个用户
      await request(app.getHttpServer()).post('/auth/register').send(testUser).expect(201);

      // 尝试用相同邮箱再次注册
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUser,
          username: 'differentuser',
        })
        .expect(400);
    });

    it('应该拒绝重复的用户名注册', async () => {
      // 先注册一个用户
      await request(app.getHttpServer()).post('/auth/register').send(testUser).expect(201);

      // 尝试用相同用户名再次注册
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUser,
          email: 'different@example.com',
        })
        .expect(400);
    });

    it('应该拒绝弱密码', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUser,
          password: '123', // 弱密码
        })
        .expect(400);
    });

    it('应该拒绝无效邮箱格式', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email', // 无效邮箱
        })
        .expect(400);
    });
  });

  describe('用户登录安全测试', () => {
    beforeEach(async () => {
      // 创建测试用户
      await request(app.getHttpServer()).post('/auth/register').send(testUser);
    });

    it('应该成功登录有效用户', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
    });

    it('应该拒绝错误密码', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('应该拒绝不存在的用户', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'nonexistentuser',
          password: testUser.password,
        })
        .expect(401);
    });

    it('应该在多次失败登录后锁定账户', async () => {
      const maxAttempts = 5;

      // 进行多次失败登录
      for (let i = 0; i < maxAttempts; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            username: testUser.username,
            password: 'wrongpassword',
          })
          .expect(401);
      }

      // 检查用户是否被锁定
      const user = await userRepository.findOne({
        where: { username: testUser.username },
      });

      expect(user?.failedLoginAttempts).toBe(maxAttempts);
      expect(user?.accountLockedUntil).toBeDefined();

      // 即使使用正确密码也应该被拒绝
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password,
        })
        .expect(423); // 账户被锁定
    });

    it('应该在成功登录后重置失败计数', async () => {
      // 先进行一次失败登录
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: 'wrongpassword',
        })
        .expect(401);

      // 然后成功登录
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password,
        })
        .expect(200);

      // 检查失败计数是否被重置
      const user = await userRepository.findOne({
        where: { username: testUser.username },
      });

      expect(user?.failedLoginAttempts).toBe(0);
      expect(user?.loginCount).toBeGreaterThan(0);
    });
  });

  describe('JWT令牌安全测试', () => {
    let accessToken: string;

    beforeEach(async () => {
      // 注册并登录用户
      await request(app.getHttpServer()).post('/auth/register').send(testUser);

      const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        username: testUser.username,
        password: testUser.password,
      });

      accessToken = loginResponse.body.access_token;
    });

    it('应该接受有效的JWT令牌', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('应该拒绝无效的JWT令牌', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('应该拒绝过期的JWT令牌', async () => {
      // 创建一个过期的令牌
      const expiredToken = jwtService.sign(
        { sub: 1, username: testUser.username },
        { expiresIn: '-1h' }, // 1小时前过期
      );

      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('应该拒绝缺少Authorization头的请求', async () => {
      await request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('应该拒绝格式错误的Authorization头', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', accessToken) // 缺少 "Bearer " 前缀
        .expect(401);
    });
  });

  describe('密码安全测试', () => {
    it('应该正确哈希密码', async () => {
      const user = await usersService.create({
        username: 'hashtest',
        email: 'hash@example.com',
        password: 'TestPassword123!',
      });

      // 密码不应该以明文存储
      expect(user.password).not.toBe('TestPassword123!');
      expect(user.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt格式
    });

    it('应该验证密码复杂性', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'abc123',
        '12345678',
        'qwerty',
        'Password', // 缺少数字和特殊字符
        'password123', // 缺少大写字母和特殊字符
        'PASSWORD123!', // 缺少小写字母
      ];

      for (const weakPassword of weakPasswords) {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            username: `user_${Math.random()}`,
            email: `test_${Math.random()}@example.com`,
            password: weakPassword,
          })
          .expect(400);
      }
    });
  });

  describe('会话管理测试', () => {
    let accessToken: string;
    let userId: number;

    beforeEach(async () => {
      // 注册并登录用户
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser);

      userId = registerResponse.body.user.id;

      const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        username: testUser.username,
        password: testUser.password,
      });

      accessToken = loginResponse.body.access_token;
    });

    it('应该成功注销用户', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 注销后令牌应该无效
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('应该更新最后登录时间', async () => {
      const userBefore = await userRepository.findOne({
        where: { id: userId },
      });

      // 等待一秒确保时间差异
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 再次登录
      await request(app.getHttpServer()).post('/auth/login').send({
        username: testUser.username,
        password: testUser.password,
      });

      const userAfter = await userRepository.findOne({
        where: { id: userId },
      });

      expect(userAfter?.lastLoginAt).not.toEqual(userBefore?.lastLoginAt);
      expect(userAfter?.loginCount).toBeGreaterThan(userBefore?.loginCount || 0);
    });
  });

  describe('权限控制测试', () => {
    let userToken: string;
    let adminToken: string;

    beforeEach(async () => {
      // 创建普通用户
      const userResponse = await request(app.getHttpServer()).post('/auth/register').send(testUser);

      const userLoginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        username: testUser.username,
        password: testUser.password,
      });

      userToken = userLoginResponse.body.access_token;

      // 创建管理员用户
      const adminUser = {
        username: 'admin',
        email: 'admin@example.com',
        password: 'AdminPassword123!',
        role: 'admin' as const,
      };

      await request(app.getHttpServer()).post('/auth/register').send(adminUser);

      const adminLoginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        username: adminUser.username,
        password: adminUser.password,
      });

      adminToken = adminLoginResponse.body.access_token;
    });

    it('普通用户应该无法访问管理员端点', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('管理员应该能够访问管理员端点', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('用户应该只能访问自己的资源', async () => {
      // 创建另一个用户
      const otherUser = {
        username: 'otheruser',
        email: 'other@example.com',
        password: 'OtherPassword123!',
      };

      const otherUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(otherUser);

      const otherUserId = otherUserResponse.body.user.id;

      // 尝试访问其他用户的资源
      await request(app.getHttpServer())
        .get(`/users/${otherUserId}/profile`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('输入验证和清理测试', () => {
    it('应该防止SQL注入攻击', async () => {
      const maliciousInput = "'; DROP TABLE users; --";

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: maliciousInput,
          password: testUser.password,
        })
        .expect(401);

      // 确保用户表仍然存在
      const userCount = await userRepository.count();
      expect(userCount).toBeGreaterThanOrEqual(0);
    });

    it('应该防止XSS攻击', async () => {
      const xssPayload = '<script>alert("XSS")</script>';

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: xssPayload,
          email: 'xss@example.com',
          password: 'XSSPassword123!',
        })
        .expect(400);

      // 确保响应中没有执行脚本
      expect(response.text).not.toContain('<script>');
    });

    it('应该限制输入长度', async () => {
      const longString = 'a'.repeat(1000);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: longString,
          email: 'long@example.com',
          password: 'LongPassword123!',
        })
        .expect(400);
    });
  });

  describe('速率限制测试', () => {
    it('应该限制登录尝试频率', async () => {
      const maxRequests = 10;
      const promises = [];

      // 快速发送多个请求
      for (let i = 0; i < maxRequests + 5; i++) {
        promises.push(
          request(app.getHttpServer()).post('/auth/login').send({
            username: 'nonexistent',
            password: 'wrongpassword',
          }),
        );
      }

      const responses = await Promise.all(promises);

      // 应该有一些请求被速率限制拒绝
      const rateLimitedResponses = responses.filter((response: any) => response.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('应该限制注册尝试频率', async () => {
      const maxRequests = 5;
      const promises = [];

      // 快速发送多个注册请求
      for (let i = 0; i < maxRequests + 3; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/auth/register')
            .send({
              username: `user${i}`,
              email: `user${i}@example.com`,
              password: 'TestPassword123!',
            }),
        );
      }

      const responses = await Promise.all(promises);

      // 应该有一些请求被速率限制拒绝
      const rateLimitedResponses = responses.filter((response: any) => response.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('安全头测试', () => {
    it('应该设置适当的安全头', async () => {
      const response = await request(app.getHttpServer()).get('/auth/profile').expect(401); // 未授权，但仍应设置安全头

      // 检查安全头
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });
});
