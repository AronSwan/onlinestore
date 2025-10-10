import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

// 测试环境配置
export const testConfig = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'error',
  // Redis测试配置
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  REDIS_DB: '15', // 使用专用测试数据库
  // OpenObserve测试配置
  OPENOBSERVE_URL: 'http://localhost:5080',
  OPENOBSERVE_ORGANIZATION: 'test',
  OPENOBSERVE_TOKEN: 'test-token',
  // 其他测试配置
  JWT_SECRET: 'test-jwt-secret',
  BCRYPT_ROUNDS: '4',
};

// Mock配置
export const mocks = {
  // Redis Mock
  Redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    keys: jest.fn(),
    flushdb: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
  },
  
  // bcrypt Mock
  bcrypt: {
    hash: jest.fn().mockResolvedValue('hashed_password'),
    compare: jest.fn().mockResolvedValue(true),
    genSalt: jest.fn().mockResolvedValue('salt'),
  },
  
  // OpenObserve Mock
  OpenObserveTransport: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
  })),
  
  // EnvironmentAdapter Mock
  EnvironmentAdapter: {
    getOpenObserve: jest.fn().mockReturnValue({
      baseUrl: 'http://localhost:5080',
      organization: 'test',
      token: 'test-token',
      streams: {
        events: 'test-events',
        metrics: 'test-metrics',
        traces: 'test-traces',
      },
      performance: {
        batchSize: 10,
        flushInterval: 1000,
        timeout: 5000,
      },
    }),
  },
};

// 测试模块构建器
export class NestTestModuleBuilder {
  private moduleBuilder: any;
  
  constructor() {
    this.moduleBuilder = Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => testConfig],
        }),
        WinstonModule.forRoot({
          silent: true, // 测试时静默日志
          format: winston.format.json(),
          transports: [
            new winston.transports.Console({
              silent: true,
            }),
          ],
        }),
      ],
    });
  }
  
  // 添加Mock提供者
  addMockProviders() {
    // Redis Mock
    this.moduleBuilder = this.moduleBuilder.overrideProvider('REDIS_CLIENT').useValue(mocks.Redis);
    
    // bcrypt Mock
    this.moduleBuilder = this.moduleBuilder.overrideProvider('BCRYPT').useValue(mocks.bcrypt);
    
    // OpenObserve Mocks
    this.moduleBuilder = this.moduleBuilder.overrideProvider('OPENOBSERVE_CONFIG').useValue({
      url: 'http://localhost:5080',
      organization: 'test',
      auth: { token: 'test-token' },
      streams: {
        application_logs: 'test-logs',
        business_events: 'test-events',
        user_behavior: 'test-behavior',
        metrics: 'test-metrics',
        traces: 'test-traces',
      },
    });
    
    this.moduleBuilder = this.moduleBuilder.overrideProvider('OPENOBSERVE_TRANSPORT').useValue(
      new mocks.OpenObserveTransport()
    );
    
    this.moduleBuilder = this.moduleBuilder.overrideProvider('USER_BEHAVIOR_TRANSPORT').useValue(
      new mocks.OpenObserveTransport()
    );
    
    return this;
  }
  
  // 添加模块覆盖
  overrideModule(moduleToken: any, override: any) {
    this.moduleBuilder = this.moduleBuilder.overrideModule(moduleToken).useValue(override);
    return this;
  }
  
  // 添加提供者覆盖
  overrideProvider(providerToken: any, override: any) {
    this.moduleBuilder = this.moduleBuilder.overrideProvider(providerToken).useValue(override);
    return this;
  }
  
  // 编译模块
  async compile(): Promise<TestingModule> {
    return await this.moduleBuilder.compile();
  }
}

// 测试工具函数
export class NestTestUtils {
  // 创建测试模块
  static async createTestModule(): Promise<TestingModule> {
    return await new NestTestModuleBuilder()
      .addMockProviders()
      .compile();
  }
  
  // 重置所有mock
  static resetAllMocks() {
    Object.values(mocks).forEach(mock => {
      if (mock && typeof mock === 'object') {
        Object.values(mock as any).forEach(method => {
          if (jest.isMockFunction(method)) {
            method.mockReset();
          }
        });
      }
    });
  }
  
  // 设置mock返回值
  static setMockValue(mockPath: string, value: any) {
    const pathParts = mockPath.split('.');
    let current = mocks;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
    }
    
    const methodName = pathParts[pathParts.length - 1];
    if (current[methodName] && jest.isMockFunction(current[methodName])) {
      current[methodName].mockReturnValue(value);
    }
  }
  
  // 验证mock调用
  static verifyMockCall(mockPath: string, expectedCallCount = 1) {
    const pathParts = mockPath.split('.');
    let current = mocks;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
    }
    
    const methodName = pathParts[pathParts.length - 1];
    if (current[methodName] && jest.isMockFunction(current[methodName])) {
      expect(current[methodName]).toHaveBeenCalledTimes(expectedCallCount);
    }
  }
}

// 全局测试设置
export function setupGlobalTestEnvironment() {
  // 设置测试超时
  jest.setTimeout(30000);
  
  // 设置环境变量
  Object.entries(testConfig).forEach(([key, value]) => {
    process.env[key] = value;
  });
  
  // 全局mock
  global.console = {
    ...console,
    // 在测试中静默某些日志
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  
  // 全局清理函数
  afterEach(() => {
    NestTestUtils.resetAllMocks();
  });
  
  afterAll(() => {
    // 清理测试环境
    Object.keys(testConfig).forEach(key => {
      delete process.env[key];
    });
  });
}

// 平台检测工具
export class TestPlatformDetector {
  static isWindows(): boolean {
    return process.platform === 'win32';
  }
  
  static isMac(): boolean {
    return process.platform === 'darwin';
  }
  
  static isLinux(): boolean {
    return process.platform === 'linux';
  }
  
  static getPlatform(): string {
    return process.platform;
  }
  
  // 获取平台特定的命令
  static getPlatformCommand(commands: Record<string, string>): string {
    const platform = this.getPlatform();
    return commands[platform] || commands['default'];
  }
  
  // 获取路径分隔符
  static getPathSeparator(): string {
    return this.isWindows() ? ';' : ':';
  }
  
  // 获取文件扩展名
  static getExecutableExtension(): string {
    return this.isWindows() ? '.exe' : '';
  }
}

// 性能优化工具
export class TestPerformanceOptimizer {
  // 智能并行度计算
  static calculateOptimalParallelism(baseCount?: number): number {
    const os = require('os');
    const cpuCount = os.cpus().length;
    const memoryGB = os.totalmem() / (1024 * 1024 * 1024);
    const loadAvg = os.loadavg()[0];
    
    let optimal = baseCount || cpuCount;
    
    // 根据系统负载调整
    if (loadAvg > cpuCount * 0.8) {
      optimal = Math.max(1, Math.floor(optimal * 0.5));
    }
    
    // 根据内存调整
    if (memoryGB < 4) {
      optimal = Math.max(1, Math.floor(optimal * 0.7));
    }
    
    // 确保不超过CPU核心数
    optimal = Math.min(optimal, cpuCount);
    
    return optimal;
  }
  
  // 资源监控
  static getResourceUsage() {
    const usage = process.cpuUsage();
    const memoryUsage = process.memoryUsage();
    
    return {
      cpu: {
        user: usage.user,
        system: usage.system,
      },
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
      },
    };
  }
  
  // 性能建议
  static getPerformanceRecommendations(): string[] {
    const resources = this.getResourceUsage();
    const recommendations: string[] = [];
    
    // 内存使用建议
    const memoryUsagePercent = (resources.memory.heapUsed / resources.memory.heapTotal) * 100;
    if (memoryUsagePercent > 80) {
      recommendations.push('内存使用率过高，建议减少并行度或优化内存使用');
    }
    
    // CPU使用建议
    if (resources.cpu.user > 1000000) { // 1秒
      recommendations.push('CPU使用率较高，建议减少并发任务');
    }
    
    return recommendations;
  }
}

// 测试数据工厂
export class TestTestDataFactory {
  static createUser(overrides: Partial<any> = {}) {
    return {
      id: 1,
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }
  
  static createProduct(overrides: Partial<any> = {}) {
    return {
      id: 1,
      name: 'Test Product',
      description: 'Test Description',
      price: 99.99,
      stock: 100,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }
  
  static createOrder(overrides: Partial<any> = {}) {
    return {
      id: 1,
      userId: 1,
      status: 'pending',
      total: 99.99,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }
}