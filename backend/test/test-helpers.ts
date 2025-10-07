/**
 * 测试辅助工具
 * 提供通用的测试工具函数和模拟对象
 */

// 创建测试用户数据
export const createTestUser = (overrides: any = {}) => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  password: 'hashedpassword',
  firstName: 'Test',
  lastName: 'User',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// 创建测试产品数据
export const createTestProduct = (overrides: any = {}) => ({
  id: 1,
  name: 'Test Product',
  description: 'Test Description',
  price: 99.99,
  stock: 10,
  sku: 'TEST-001',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// 创建测试订单数据
export const createTestOrder = (overrides: any = {}) => ({
  id: 1,
  userId: 1,
  totalAmount: 99.99,
  status: 'pending',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// 创建模拟的ConfigService
export const createMockConfigService = (overrides: Record<string, any> = {}) => {
  const defaults: Record<string, string> = {
    NODE_ENV: 'test',
    DB_DATABASE: './data/test_caddy_shopping.db',
    JWT_SECRET: 'test-jwt-secret-key-for-testing-only-32-chars-min',
    ENCRYPTION_KEY: 'test_encryption_key_64_characters_long_for_testing_purposes_1234',
    CORS_ORIGINS: 'http://localhost:3000,http://localhost:5173',
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      return defaults[key] || overrides[key] || null;
    }),
    getOrThrow: jest.fn((key: string) => {
      const value: any = mockConfig.get(key);
      if (value === null) {
        throw new Error(`Configuration key "${key}" is required`);
      }
      return value;
    }),
  };
  return mockConfig as any;
};

// 创建模拟的Repository
export const createMockRepository = <T = any>() => {
  return {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findBy: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    query: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as any;
};

// 创建模拟的DataSource
export const createMockDataSource = () => {
  return {
    initialize: jest.fn(),
    destroy: jest.fn(),
    isInitialized: true,
    getRepository: jest.fn(() => createMockRepository()),
    createQueryRunner: jest.fn(),
    manager: {
      query: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    },
  } as any;
};

// 创建模拟的QueryRunner
export const createMockQueryRunner = () => {
  return {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      query: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    },
  } as any;
};

// 设置测试环境
export const setupTestEnvironment = () => {
  process.env.NODE_ENV = 'test';
};

// 清理测试环境
export const cleanupTestEnvironment = async () => {
  delete process.env.NODE_ENV;
};

// 等待异步操作完成
export const waitForAsync = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

// 创建模拟的Redis客户端
export const createMockRedisClient = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  flushall: jest.fn(),
  ping: jest.fn().mockResolvedValue('PONG'),
  quit: jest.fn(),
});

// 创建模拟的邮件服务
export const createMockMailService = () => ({
  sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
});

// 创建模拟的HTTP客户端
export const createMockHttpClient = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
});

// 创建模拟的日志服务
export const createMockLogger = () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
});
