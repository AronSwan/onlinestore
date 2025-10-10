// 用途：测试设置辅助工具，提供通用Mock和测试配置
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-10-05

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { JwtModule } from '@nestjs/jwt';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { RedpandaService } from '../src/messaging/redpanda.service';
import { PaymentSecurityService } from '../src/common/security/payment-security.service';
import { LogSanitizerService } from '../src/common/security/log-sanitizer.service';
import { MonitoringService } from '../src/monitoring/monitoring.service';
import { createMockedFunction } from './utils/typed-mock-factory';

// 测试数据库配置
export const testDatabaseConfig = {
  type: 'sqlite' as const,
  database: ':memory:',
  entities: [
    'src/**/*.entity.ts',
    'src/users/entities/**/*.ts',
    'src/products/entities/**/*.ts',
    'src/orders/entities/**/*.ts',
    'src/payment/entities/**/*.ts',
    'src/notification/entities/**/*.ts',
    'src/common/audit/entities/**/*.ts',
  ],
  synchronize: true,
  dropSchema: true,
  logging: false,
};

// 创建Mock QueryRunner
export const createMockQueryRunner = (): any => {
  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    isReleased: false,
    isTransactionActive: false,
    connection: {},
    broadcaster: {},
    manager: {
      create: jest.fn(),
      save: jest.fn().mockImplementation(entity => Promise.resolve({ ...entity, id: 'mock-id' })),
      findOne: jest.fn(),
      update: jest.fn(),
      getRepository: jest.fn(),
      query: jest.fn(),
      transaction: jest.fn(),
      remove: jest.fn(),
    },
    query: jest.fn(),
    stream: jest.fn(),
    clearDatabase: jest.fn(),
    getTable: jest.fn(),
    hasTable: jest.fn(),
    getColumn: jest.fn(),
    hasColumn: jest.fn(),
    getIndex: jest.fn(),
    hasIndex: jest.fn(),
    getForeignKey: jest.fn(),
    hasForeignKey: jest.fn(),
    getIndices: jest.fn(),
    getForeignKeys: jest.fn(),
    getCheckConstraints: jest.fn(),
    hasCheckConstraint: jest.fn(),
    getExclusionConstraints: jest.fn(),
    hasExclusionConstraint: jest.fn(),
    getUniqueConstraints: jest.fn(),
    hasUniqueConstraint: jest.fn(),
    createTable: jest.fn(),
    dropTable: jest.fn(),
    renameTable: jest.fn(),
    addColumn: jest.fn(),
    dropColumn: jest.fn(),
    renameColumn: jest.fn(),
    changeColumn: jest.fn(),
    createIndex: jest.fn(),
    dropIndex: jest.fn(),
    createForeignKey: jest.fn(),
    dropForeignKey: jest.fn(),
    createCheckConstraint: jest.fn(),
    dropCheckConstraint: jest.fn(),
    createExclusionConstraint: jest.fn(),
    dropExclusionConstraint: jest.fn(),
    createUniqueConstraint: jest.fn(),
    dropUniqueConstraint: jest.fn(),
    createPrimaryKey: jest.fn(),
    updatePrimaryKeys: jest.fn(),
    dropPrimaryKey: jest.fn(),
    createDatabase: jest.fn(),
    dropDatabase: jest.fn(),
    createSchema: jest.fn(),
    dropSchema: jest.fn(),
    createView: jest.fn(),
    dropView: jest.fn(),
    getTables: jest.fn(),
    getViews: jest.fn(),
    enableSqlMemory: jest.fn(),
    disableSqlMemory: jest.fn(),
    clearSqlMemory: jest.fn(),
    getMemorySql: jest.fn(),
    executeMemoryDownSql: jest.fn(),
    executeMemoryUpSql: jest.fn(),
  } as unknown as QueryRunner;

  return mockQueryRunner;
};

// 创建Mock DataSource
export const createMockDataSource = (mockQueryRunner: any): any => {
  return {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    isInitialized: true,
    options: {},
    driver: {},
    managers: new Map(),
    query: jest.fn(),
    transaction: jest.fn(),
    createQueryBuilder: jest.fn(),
    getRepository: jest.fn(),
    getTreeRepository: jest.fn(),
    getMongoRepository: jest.fn(),
    hasMetadata: jest.fn(),
    getMetadata: jest.fn(),
    getMetadatas: jest.fn(),
    entityMetadatas: [],
    entityMetadatasMap: new Map(),
    relationMetadatas: [],
    relationMetadatasMap: new Map(),
    columnMetadatas: [],
    columnMetadatasMap: new Map(),
    subscriberMetadatas: [],
    listenerMetadatas: [],
    namingStrategy: {},
    logger: {},
    migrations: [],
    compiledMigrations: [],
    migrationMetadatas: [],
    migrationTablePrefix: '',
    metadataTableName: 'typeorm_metadata',
    migrationsTransactionMode: 'all',
    transactionManagerOptions: {},
    connectionManagerOptions: {},
    cli: {},
    name: 'default',
  } as unknown as DataSource;
};

// 创建Mock ConfigService
export const createMockConfigService = (): jest.Mocked<ConfigService> => {
  return {
    get: createMockedFunction<(key: string) => any>((key: string) => {
      const config: { [key: string]: any } = {
        payment: {
          defaultCurrency: 'CNY',
          defaultExpireMinutes: 30,
          maxRefundDays: 30,
          supportedMethods: ['alipay', 'wechat', 'credit-card'],
        },
        security: {
          paymentSignatureKey: 'test-signature-key',
        },
        jwt: {
          secret: 'test-secret-key',
          expiresIn: '15m',
        },
        redis: {
          host: 'localhost',
          port: 6379,
        },
        database: {
          type: 'sqlite',
          host: 'localhost',
          port: 3306,
          username: 'test',
          password: 'test',
          database: 'test_db',
        },
      };
      return config[key];
    }),
  } as any;
};

// 创建Mock RedpandaService
export const createMockRedpandaService = (): jest.Mocked<RedpandaService> => {
  return {
    publish: jest.fn(),
    subscribe: jest.fn(),
    disconnect: jest.fn(),
    isConnected: jest.fn().mockReturnValue(true),
    getTopics: jest.fn().mockResolvedValue([]),
    createTopic: jest.fn().mockResolvedValue(undefined),
    deleteTopic: jest.fn().mockResolvedValue(undefined),
  } as any;
};

// 创建Mock PaymentSecurityService
export const createMockPaymentSecurityService = (): jest.Mocked<PaymentSecurityService> => {
  return {
    validatePaymentRequest: createMockedFunction<(...args: any[]) => any>(),
    logSecurityEvent: createMockedFunction<(...args: any[]) => any>(),
    validateSignature: createMockedFunction<(...args: any[]) => any>(),
    encryptPaymentData: createMockedFunction<(...args: any[]) => any>(),
    decryptPaymentData: createMockedFunction<(...args: any[]) => any>(),
  } as any;
};

// 创建Mock LogSanitizerService
export const createMockLogSanitizerService = (): jest.Mocked<LogSanitizerService> => {
  return {
    sanitize: createMockedFunction<(...args: any[]) => any>(),
    sanitizeObject: createMockedFunction<(...args: any[]) => any>(),
  } as any;
};

// 创建Mock MonitoringService
export const createMockMonitoringService = (): jest.Mocked<MonitoringService> => {
  return {
    observeDbQuery: createMockedFunction<(...args: any[]) => any>(),
    recordMetric: createMockedFunction<(...args: any[]) => any>(),
    incrementCounter: createMockedFunction<(...args: any[]) => any>(),
    recordHistogram: createMockedFunction<(...args: any[]) => any>(),
    setGauge: createMockedFunction<(...args: any[]) => any>(),
  } as any;
};

// 创建Mock Repository
export const createMockRepository = <T = any>(mockData?: T[]): any => {
  const data = mockData || [];
  return {
    create: createMockedFunction<(dto: Partial<T>) => T>(dto => ({ id: 'mock-id', ...(dto as any) } as T)),
    save: createMockedFunction<(entity: T) => Promise<T>>(async entity => ({ ...(entity as any), id: 'mock-id' } as T)),
    findOne: createMockedFunction<(options?: any) => Promise<T | null>>(),
    find: createMockedFunction<(options?: any) => Promise<T[]>>(() => Promise.resolve(data as T[])),
    update: createMockedFunction<(id: any, partial: Partial<T>) => Promise<{ affected?: number }>>(
      () => Promise.resolve({ affected: 1 }),
    ),
    delete: createMockedFunction<(id: any) => Promise<{ affected?: number }>>(
      () => Promise.resolve({ affected: 1 }),
    ),
    remove: createMockedFunction<(entity: T) => Promise<T>>(() => Promise.resolve((data[0] as T))),
    count: createMockedFunction<(options?: any) => Promise<number>>(() => Promise.resolve(data.length)),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([data, data.length]),
      getCount: jest.fn().mockResolvedValue(data.length),
      select: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    }),
    manager: {
      transaction: jest.fn().mockImplementation(async callback => {
        return callback(createMockRepository());
      }),
    },
    query: createMockedFunction<(sql: string, params?: any[]) => Promise<any[]>>(),
    insert: createMockedFunction<(entity: any) => Promise<any>>(),
    softDelete: createMockedFunction<(criteria: any) => Promise<any>>(),
    softRemove: createMockedFunction<(entity: any) => Promise<any>>(),
    restore: createMockedFunction<(criteria: any) => Promise<any>>(),
    recover: createMockedFunction<(entity: any) => Promise<any>>(),
    preload: createMockedFunction<(entity: any) => Promise<T | null>>(),
    findAndCount: createMockedFunction<(options?: any) => Promise<[T[], number]>>(),
    findAndCountBy: createMockedFunction<(criteria: any) => Promise<[T[], number]>>(),
    findByIds: createMockedFunction<(ids: any[]) => Promise<T[]>>(),
    findOneBy: createMockedFunction<(criteria: any) => Promise<T | null>>(),
    findBy: createMockedFunction<(criteria: any) => Promise<T[]>>(),
    exists: createMockedFunction<(options?: any) => Promise<boolean>>(),
    existsBy: createMockedFunction<(criteria: any) => Promise<boolean>>(),
    increment: createMockedFunction<(criteria: any, column: string, value: number) => Promise<any>>(),
    decrement: createMockedFunction<(criteria: any, column: string, value: number) => Promise<any>>(),
    clear: createMockedFunction<() => Promise<void>>(),
    hasId: createMockedFunction<(entity: any) => boolean>(),
    getId: createMockedFunction<(entity: any) => any>(),
    getMetadata: createMockedFunction<() => any>(),
    hasMetadata: createMockedFunction<() => boolean>(),
    merge: createMockedFunction<(target: any, ...sources: any[]) => any>(),
  } as any;
};

// 创建基础测试模块
export const createBaseTestingModule = async (
  providers: any[] = [],
  imports: any[] = [],
): Promise<any> => {
  const mockQueryRunner = createMockQueryRunner();
  const mockDataSource = createMockDataSource(mockQueryRunner);
  const mockConfigService = createMockConfigService();
  const mockRedpandaService = createMockRedpandaService();
  const mockPaymentSecurityService = createMockPaymentSecurityService();
  const mockLogSanitizerService = createMockLogSanitizerService();
  const mockMonitoringService = createMockMonitoringService();

  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
      TypeOrmModule.forRoot(testDatabaseConfig),
      CacheModule.register({
        isGlobal: true,
        ttl: 60,
        max: 100,
      }),
      JwtModule.register({
        secret: 'test-secret-key',
        signOptions: { expiresIn: '15m' },
      }),
      ...imports,
    ],
    providers: [
      { provide: ConfigService, useValue: mockConfigService },
      { provide: DataSource, useValue: mockDataSource },
      { provide: RedpandaService, useValue: mockRedpandaService },
      { provide: PaymentSecurityService, useValue: mockPaymentSecurityService },
      { provide: LogSanitizerService, useValue: mockLogSanitizerService },
      { provide: MonitoringService, useValue: mockMonitoringService },
      ...providers,
    ],
  });
};

// 设置测试环境变量
export const setupTestEnvironment = (): void => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.DB_TYPE = 'sqlite';
  process.env.DB_DATABASE = ':memory:';
  process.env.REDIS_HOST = 'localhost';
  process.env.REDIS_PORT = '6379';
};

// 清理测试环境
export const cleanupTestEnvironment = async (): Promise<void> => {
  // 清理测试环境变量
  delete process.env.NODE_ENV;
  delete process.env.JWT_SECRET;
  delete process.env.DB_TYPE;
  delete process.env.DB_DATABASE;
  delete process.env.REDIS_HOST;
  delete process.env.REDIS_PORT;
};
