"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockLogger = exports.createMockHttpClient = exports.createMockMailService = exports.createMockRedisClient = exports.waitForAsync = exports.cleanupTestEnvironment = exports.setupTestEnvironment = exports.createMockQueryRunner = exports.createMockDataSource = exports.createMockRepository = exports.createMockConfigService = exports.createTestOrder = exports.createTestProduct = exports.createTestUser = void 0;
const typed_mock_factory_1 = require("./utils/typed-mock-factory");
const createTestUser = (overrides = {}) => ({
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
exports.createTestUser = createTestUser;
const createTestProduct = (overrides = {}) => ({
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
exports.createTestProduct = createTestProduct;
const createTestOrder = (overrides = {}) => ({
    id: 1,
    userId: 1,
    totalAmount: 99.99,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});
exports.createTestOrder = createTestOrder;
const createMockConfigService = (overrides = {}) => {
    const defaults = {
        NODE_ENV: 'test',
        DB_DATABASE: './data/test_caddy_shopping.db',
        JWT_SECRET: 'test-jwt-secret-key-for-testing-only-32-chars-min',
        ENCRYPTION_KEY: 'test_encryption_key_64_characters_long_for_testing_purposes_1234',
        CORS_ORIGINS: 'http://localhost:3000,http://localhost:5173',
    };
    const mockConfig = {
        get: (0, typed_mock_factory_1.createMockedFunction)((key) => {
            return defaults[key] || overrides[key] || null;
        }),
        getOrThrow: (0, typed_mock_factory_1.createMockedFunction)((key) => {
            const value = mockConfig.get(key);
            if (value === null) {
                throw new Error(`Configuration key "${key}" is required`);
            }
            return value;
        }),
    };
    return mockConfig;
};
exports.createMockConfigService = createMockConfigService;
const createMockRepository = () => {
    return {
        create: (0, typed_mock_factory_1.createMockedFunction)(),
        save: (0, typed_mock_factory_1.createMockedFunction)(),
        find: (0, typed_mock_factory_1.createMockedFunction)(),
        findOne: (0, typed_mock_factory_1.createMockedFunction)(),
        findBy: (0, typed_mock_factory_1.createMockedFunction)(),
        update: (0, typed_mock_factory_1.createMockedFunction)(),
        delete: (0, typed_mock_factory_1.createMockedFunction)(),
        count: (0, typed_mock_factory_1.createMockedFunction)(),
        query: (0, typed_mock_factory_1.createMockedFunction)(),
        createQueryBuilder: (0, typed_mock_factory_1.createMockedFunction)(),
    };
};
exports.createMockRepository = createMockRepository;
const createMockDataSource = () => {
    return {
        initialize: (0, typed_mock_factory_1.createMockedFunction)(async () => undefined),
        destroy: (0, typed_mock_factory_1.createMockedFunction)(async () => undefined),
        isInitialized: true,
        getRepository: (0, typed_mock_factory_1.createMockedFunction)(() => (0, exports.createMockRepository)()),
        createQueryRunner: (0, typed_mock_factory_1.createMockedFunction)(),
        manager: {
            query: (0, typed_mock_factory_1.createMockedFunction)(),
            find: (0, typed_mock_factory_1.createMockedFunction)(),
            findOne: (0, typed_mock_factory_1.createMockedFunction)(),
            save: (0, typed_mock_factory_1.createMockedFunction)(),
            remove: (0, typed_mock_factory_1.createMockedFunction)(),
        },
    };
};
exports.createMockDataSource = createMockDataSource;
const createMockQueryRunner = () => {
    return {
        connect: (0, typed_mock_factory_1.createMockedFunction)(async () => undefined),
        startTransaction: (0, typed_mock_factory_1.createMockedFunction)(async () => undefined),
        commitTransaction: (0, typed_mock_factory_1.createMockedFunction)(async () => undefined),
        rollbackTransaction: (0, typed_mock_factory_1.createMockedFunction)(async () => undefined),
        release: (0, typed_mock_factory_1.createMockedFunction)(async () => undefined),
        manager: {
            query: (0, typed_mock_factory_1.createMockedFunction)(),
            find: (0, typed_mock_factory_1.createMockedFunction)(),
            findOne: (0, typed_mock_factory_1.createMockedFunction)(),
            save: (0, typed_mock_factory_1.createMockedFunction)(),
            remove: (0, typed_mock_factory_1.createMockedFunction)(),
        },
    };
};
exports.createMockQueryRunner = createMockQueryRunner;
const setupTestEnvironment = () => {
    process.env.NODE_ENV = 'test';
};
exports.setupTestEnvironment = setupTestEnvironment;
const cleanupTestEnvironment = async () => {
    delete process.env.NODE_ENV;
};
exports.cleanupTestEnvironment = cleanupTestEnvironment;
const waitForAsync = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));
exports.waitForAsync = waitForAsync;
const createMockRedisClient = () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    flushall: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn(),
});
exports.createMockRedisClient = createMockRedisClient;
const createMockMailService = () => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
});
exports.createMockMailService = createMockMailService;
const createMockHttpClient = () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
});
exports.createMockHttpClient = createMockHttpClient;
const createMockLogger = () => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
});
exports.createMockLogger = createMockLogger;
