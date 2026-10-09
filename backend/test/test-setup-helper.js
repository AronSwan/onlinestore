"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupTestEnvironment = exports.setupTestEnvironment = exports.createBaseTestingModule = exports.createMockRepository = exports.createMockMonitoringService = exports.createMockLogSanitizerService = exports.createMockPaymentSecurityService = exports.createMockRedpandaService = exports.createMockConfigService = exports.createMockDataSource = exports.createMockQueryRunner = exports.testDatabaseConfig = void 0;
const testing_1 = require("@nestjs/testing");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const cache_manager_1 = require("@nestjs/cache-manager");
const jwt_1 = require("@nestjs/jwt");
const typeorm_2 = require("typeorm");
const redpanda_service_1 = require("../src/messaging/redpanda.service");
const monitoring_service_1 = require("../src/monitoring/monitoring.service");
const typed_mock_factory_1 = require("./utils/typed-mock-factory");
exports.testDatabaseConfig = {
    type: 'better-sqlite3',
    database: ':memory:',
    entities: [
        'src/**/*.entity.ts',
        'src/users/entities/**/*.ts',
        'src/products/entities/**/*.ts',
        'src/orders/entities/**/*.ts',
        'src/payment/entities/**/*.ts',
        'src/common/audit/entities/**/*.ts',
    ],
    synchronize: true,
    dropSchema: true,
    logging: false,
};
const createMockQueryRunner = () => {
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
    };
    return mockQueryRunner;
};
exports.createMockQueryRunner = createMockQueryRunner;
const createMockDataSource = (mockQueryRunner) => {
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
    };
};
exports.createMockDataSource = createMockDataSource;
const createMockConfigService = () => {
    return {
        get: (0, typed_mock_factory_1.createMockedFunction)((key) => {
            const config = {
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
                    type: 'better-sqlite3',
                    host: 'localhost',
                    port: 3306,
                    username: 'test',
                    password: 'test',
                    database: 'test_db',
                },
            };
            return config[key];
        }),
    };
};
exports.createMockConfigService = createMockConfigService;
const createMockRedpandaService = () => {
    return {
        publish: jest.fn(),
        subscribe: jest.fn(),
        disconnect: jest.fn(),
        isConnected: jest.fn().mockReturnValue(true),
        getTopics: jest.fn().mockResolvedValue([]),
        createTopic: jest.fn().mockResolvedValue(undefined),
        deleteTopic: jest.fn().mockResolvedValue(undefined),
    };
};
exports.createMockRedpandaService = createMockRedpandaService;
const createMockPaymentSecurityService = () => {
    return {
        validatePaymentRequest: (0, typed_mock_factory_1.createMockedFunction)(),
        logSecurityEvent: (0, typed_mock_factory_1.createMockedFunction)(),
        validateSignature: (0, typed_mock_factory_1.createMockedFunction)(),
        encryptPaymentData: (0, typed_mock_factory_1.createMockedFunction)(),
        decryptPaymentData: (0, typed_mock_factory_1.createMockedFunction)(),
    };
};
exports.createMockPaymentSecurityService = createMockPaymentSecurityService;
const createMockLogSanitizerService = () => {
    return {
        sanitize: (0, typed_mock_factory_1.createMockedFunction)(),
        sanitizeObject: (0, typed_mock_factory_1.createMockedFunction)(),
    };
};
exports.createMockLogSanitizerService = createMockLogSanitizerService;
const createMockMonitoringService = () => {
    return {
        observeDbQuery: (0, typed_mock_factory_1.createMockedFunction)(),
        recordMetric: (0, typed_mock_factory_1.createMockedFunction)(),
        incrementCounter: (0, typed_mock_factory_1.createMockedFunction)(),
        recordHistogram: (0, typed_mock_factory_1.createMockedFunction)(),
        setGauge: (0, typed_mock_factory_1.createMockedFunction)(),
    };
};
exports.createMockMonitoringService = createMockMonitoringService;
const createMockRepository = (mockData) => {
    const data = mockData || [];
    return {
        create: (0, typed_mock_factory_1.createMockedFunction)(dto => ({ id: 'mock-id', ...dto })),
        save: (0, typed_mock_factory_1.createMockedFunction)(async (entity) => ({ ...entity, id: 'mock-id' })),
        findOne: (0, typed_mock_factory_1.createMockedFunction)(),
        find: (0, typed_mock_factory_1.createMockedFunction)(() => Promise.resolve(data)),
        update: (0, typed_mock_factory_1.createMockedFunction)(() => Promise.resolve({ affected: 1 })),
        delete: (0, typed_mock_factory_1.createMockedFunction)(() => Promise.resolve({ affected: 1 })),
        remove: (0, typed_mock_factory_1.createMockedFunction)(() => Promise.resolve(data[0])),
        count: (0, typed_mock_factory_1.createMockedFunction)(() => Promise.resolve(data.length)),
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
            transaction: jest.fn().mockImplementation(async (callback) => {
                return callback((0, exports.createMockRepository)());
            }),
        },
        query: (0, typed_mock_factory_1.createMockedFunction)(),
        insert: (0, typed_mock_factory_1.createMockedFunction)(),
        softDelete: (0, typed_mock_factory_1.createMockedFunction)(),
        softRemove: (0, typed_mock_factory_1.createMockedFunction)(),
        restore: (0, typed_mock_factory_1.createMockedFunction)(),
        recover: (0, typed_mock_factory_1.createMockedFunction)(),
        preload: (0, typed_mock_factory_1.createMockedFunction)(),
        findAndCount: (0, typed_mock_factory_1.createMockedFunction)(),
        findAndCountBy: (0, typed_mock_factory_1.createMockedFunction)(),
        findByIds: (0, typed_mock_factory_1.createMockedFunction)(),
        findOneBy: (0, typed_mock_factory_1.createMockedFunction)(),
        findBy: (0, typed_mock_factory_1.createMockedFunction)(),
        exists: (0, typed_mock_factory_1.createMockedFunction)(),
        existsBy: (0, typed_mock_factory_1.createMockedFunction)(),
        increment: (0, typed_mock_factory_1.createMockedFunction)(),
        decrement: (0, typed_mock_factory_1.createMockedFunction)(),
        clear: (0, typed_mock_factory_1.createMockedFunction)(),
        hasId: (0, typed_mock_factory_1.createMockedFunction)(),
        getId: (0, typed_mock_factory_1.createMockedFunction)(),
        getMetadata: (0, typed_mock_factory_1.createMockedFunction)(),
        hasMetadata: (0, typed_mock_factory_1.createMockedFunction)(),
        merge: (0, typed_mock_factory_1.createMockedFunction)(),
    };
};
exports.createMockRepository = createMockRepository;
const createBaseTestingModule = async (providers = [], imports = []) => {
    const mockQueryRunner = (0, exports.createMockQueryRunner)();
    const mockDataSource = (0, exports.createMockDataSource)(mockQueryRunner);
    const mockConfigService = (0, exports.createMockConfigService)();
    const mockRedpandaService = (0, exports.createMockRedpandaService)();
    const mockMonitoringService = (0, exports.createMockMonitoringService)();
    return testing_1.Test.createTestingModule({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env.test',
            }),
            typeorm_1.TypeOrmModule.forRoot(exports.testDatabaseConfig),
            cache_manager_1.CacheModule.register({
                isGlobal: true,
                ttl: 60,
                max: 100,
            }),
            jwt_1.JwtModule.register({
                secret: 'test-secret-key',
                signOptions: { expiresIn: '15m' },
            }),
            ...imports,
        ],
        providers: [
            { provide: config_1.ConfigService, useValue: mockConfigService },
            { provide: typeorm_2.DataSource, useValue: mockDataSource },
            { provide: redpanda_service_1.RedpandaService, useValue: mockRedpandaService }, { provide: monitoring_service_1.MonitoringService, useValue: mockMonitoringService },
            ...providers,
        ],
    });
};
exports.createBaseTestingModule = createBaseTestingModule;
const setupTestEnvironment = () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.DB_TYPE = 'better-sqlite3';
    process.env.DB_DATABASE = ':memory:';
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
};
exports.setupTestEnvironment = setupTestEnvironment;
const cleanupTestEnvironment = async () => {
    delete process.env.NODE_ENV;
    delete process.env.JWT_SECRET;
    delete process.env.DB_TYPE;
    delete process.env.DB_DATABASE;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
};
exports.cleanupTestEnvironment = cleanupTestEnvironment;
