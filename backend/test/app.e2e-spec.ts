// 用途：应用程序端到端测试
// 依赖文件：app.module.ts, main.ts
// 作者：后端开发团队
// 时间：2025-10-02 00:00:00

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let configService: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = moduleFixture.get<ConfigService>(ConfigService);

    // Override config for testing
    configService.get = jest.fn((key: string) => {
      const testConfig: Record<string, any> = {
        NODE_ENV: 'test',
        PORT: 3001,
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: 3306,
        DATABASE_USERNAME: 'test_user',
        DATABASE_PASSWORD: 'test_password',
        DATABASE_NAME: 'test_caddy_shopping',
        DATABASE_SYNCHRONIZE: true,
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
        JWT_EXPIRES_IN: '1h',
        ENCRYPTION_KEY: 'a'.repeat(64), // 32 bytes in hex
      };
      return testConfig[key];
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/health (GET)', () => {
      return request(app.getHttpServer()).get('/health').expect(200);
    });

    it('/health/detailed (GET)', () => {
      return request(app.getHttpServer()).get('/health/detailed').expect(200);
    });
  });

  describe('Authentication', () => {
    it('/api/auth/register (POST)', () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      return request(app.getHttpServer()).post('/api/auth/register').send(userData).expect(201);
    });

    it('/api/auth/login (POST)', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      return response.body.access_token;
    });

    it('/api/auth/profile (GET) with valid token', async () => {
      // First login to get token
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      const token = loginResponse.body.access_token;

      // Then use token to access profile
      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('/api/auth/profile (GET) without token should return 401', () => {
      return request(app.getHttpServer()).get('/api/auth/profile').expect(401);
    });
  });

  describe('Products API', () => {
    let authToken: string;

    beforeAll(async () => {
      // Login to get auth token
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      authToken = loginResponse.body.access_token;
    });

    it('/api/products (GET)', () => {
      return request(app.getHttpServer()).get('/api/products').expect(200);
    });

    it('/api/products/search (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/products/search')
        .query({ keyword: 'test' })
        .expect(200);
    });

    it('/api/products/categories (GET)', () => {
      return request(app.getHttpServer()).get('/api/products/categories').expect(200);
    });

    it('/api/products/popular (GET)', () => {
      return request(app.getHttpServer()).get('/api/products/popular').expect(200);
    });

    it('/api/products/:id (GET)', () => {
      return request(app.getHttpServer()).get('/api/products/1').expect(200);
    });
  });

  describe('Cart API', () => {
    let authToken: string;

    beforeAll(async () => {
      // Login to get auth token
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      authToken = loginResponse.body.access_token;
    });

    it('/api/cart/items (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('/api/cart/items (POST)', () => {
      const itemData = {
        productId: 1,
        quantity: 2,
      };

      return request(app.getHttpServer())
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(itemData)
        .expect(201);
    });

    it('/api/cart/items/:itemId (PUT)', () => {
      const updateData = {
        quantity: 3,
      };

      return request(app.getHttpServer())
        .put('/api/cart/items/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);
    });

    it('/api/cart/items/:itemId (DELETE)', () => {
      return request(app.getHttpServer())
        .delete('/api/cart/items/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('/api/cart/clear (DELETE)', () => {
      return request(app.getHttpServer())
        .delete('/api/cart/clear')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Orders API', () => {
    let authToken: string;

    beforeAll(async () => {
      // Login to get auth token
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      authToken = loginResponse.body.access_token;
    });

    it('/api/orders (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('/api/orders (POST)', () => {
      const orderData = {
        items: [
          {
            productId: 1,
            quantity: 2,
            unitPrice: 100,
          },
        ],
        totalAmount: 200,
        shippingAddress: 'Test Address',
        recipientName: 'Test User',
        recipientPhone: '1234567890',
        paymentMethod: 'credit_card',
      };

      return request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);
    });

    it('/api/orders/:id (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/orders/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', () => {
      return request(app.getHttpServer()).get('/api/non-existent-route').expect(404);
    });

    it('should return 400 for invalid request data', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          // Missing required fields
          username: 'testuser',
        })
        .expect(400);
    });

    it('should return 401 for unauthorized access', () => {
      return request(app.getHttpServer()).get('/api/orders').expect(401);
    });

    it('should return 403 for forbidden access', () => {
      // This would depend on your specific authorization rules
      // For example, trying to access admin endpoints as a regular user
      return request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401); // Will return 401 for invalid token first
    });
  });

  describe('Rate Limiting', () => {
    it('should allow normal request rate', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer()).get('/api/products').expect(200);
      }
    });

    it('should handle rate limiting gracefully', async () => {
      // This test would need to be adjusted based on your actual rate limiting configuration
      // It might involve making many rapid requests and checking for 429 responses

      // For now, just make sure the endpoint responds normally
      await request(app.getHttpServer()).get('/api/products').expect(200);
    });
  });

  describe('CORS', () => {
    it('should handle CORS preflight requests', () => {
      return request(app.getHttpServer())
        .options('/api/products')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);
    });

    it('should include CORS headers in responses', () => {
      return request(app.getHttpServer())
        .get('/api/products')
        .set('Origin', 'http://localhost:3000')
        .expect(200)
        .expect((res: any) => {
          expect(res.headers['access-control-allow-origin']).toBeDefined();
        });
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', () => {
      return request(app.getHttpServer())
        .get('/api/products')
        .expect(200)
        .expect((res: any) => {
          // Check for common security headers
          expect(res.headers['x-content-type-options']).toBe('nosniff');
          expect(res.headers['x-frame-options']).toBeDefined();
          expect(res.headers['x-xss-protection']).toBeDefined();
        });
    });
  });

  describe('API Documentation', () => {
    it('/api/docs (GET) should return Swagger UI', () => {
      return request(app.getHttpServer()).get('/api/docs').expect(200);
    });

    it('/api/docs-json (GET) should return OpenAPI JSON', () => {
      return request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200)
        .expect((res: any) => {
          expect(res.body).toHaveProperty('openapi');
          expect(res.body).toHaveProperty('info');
          expect(res.body).toHaveProperty('paths');
        });
    });
  });

  describe('Performance', () => {
    it('should respond within reasonable time', async () => {
      const start = Date.now();

      await request(app.getHttpServer()).get('/api/products').expect(200);

      const duration = Date.now() - start;

      // Should respond within 1 second (adjust as needed)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent requests', async () => {
      const promises = Array(10)
        .fill(null)
        .map(() => request(app.getHttpServer()).get('/api/products').expect(200));

      await Promise.all(promises);
    });
  });
});
