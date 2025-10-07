import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { JwtModule } from '@nestjs/jwt';
import {
  createMockConfigService,
  createMockRepository,
  createMockDataSource,
  createMockQueryRunner,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from './test-helpers';

// 测试数据库配置
const testDatabaseConfig = {
  type: 'sqlite' as const,
  database: ':memory:',
  entities: ['src/**/*.entity.ts'],
  synchronize: true, // 仅测试环境使用
  dropSchema: true, // 每次测试后清理数据库
  logging: false,
};

// 全局测试模块配置
export const createTestingModule = (modules: any[]) => {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
      TypeOrmModule.forRoot(testDatabaseConfig),
      CacheModule.register({
        isGlobal: true,
        ttl: 60, // 60秒
        max: 100,
      }),
      JwtModule.register({
        secret: 'test-secret-key',
        signOptions: { expiresIn: '15m' },
      }),
      ...modules,
    ],
  });
};

// 导出测试辅助工具
export {
  createMockConfigService,
  createMockRepository,
  createMockDataSource,
  createMockQueryRunner,
  setupTestEnvironment,
  cleanupTestEnvironment,
};

// 测试环境变量设置
beforeAll(async () => {
  // 设置测试环境变量
  setupTestEnvironment();
});

// 清理测试数据
afterAll(async () => {
  // 清理测试环境变量
  await cleanupTestEnvironment();
});
