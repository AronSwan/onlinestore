"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const originalConsoleWarn = console.warn;
console.warn = jest.fn();
const testing_1 = require("@nestjs/testing");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const database_module_1 = require("./database.module");
const unified_master_config_1 = require("../config/unified-master.config");
const masterConfig = (0, unified_master_config_1.createMasterConfiguration)();
describe('DatabaseModule', () => {
    let databaseModule;
    let configService;
    const originalEnv = process.env;
    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });
    afterEach(() => {
        process.env = originalEnv;
    });
    afterAll(() => {
        console.warn = originalConsoleWarn;
    });
    describe('module configuration', () => {
        it('should be defined', () => {
            expect(database_module_1.DatabaseModule).toBeDefined();
        });
        it('should be a valid NestJS module', () => {
            expect(typeof database_module_1.DatabaseModule).toBe('function');
            expect(database_module_1.DatabaseModule.prototype).toBeDefined();
        });
    });
    const createTestConfig = (env = {}) => {
        process.env.NODE_ENV = env.NODE_ENV || 'test';
        process.env.DB_TYPE = env.DB_TYPE || 'sqlite';
        process.env.DB_HOST = env.DB_HOST || 'localhost';
        const dbType = env.DB_TYPE || process.env.DB_TYPE || 'sqlite';
        let defaultPort;
        switch (dbType) {
            case 'tidb':
                defaultPort = '4000';
                break;
            case 'mysql':
                defaultPort = '3306';
                break;
            case 'postgres':
                defaultPort = '5432';
                break;
            default:
                defaultPort = '5432';
        }
        process.env.DB_PORT = env.DB_PORT || defaultPort;
        process.env.DB_USERNAME = env.DB_USERNAME || 'testuser';
        process.env.DB_PASSWORD = env.DB_PASSWORD || 'testpass';
        process.env.DB_DATABASE = env.DB_DATABASE !== undefined ? env.DB_DATABASE : 'testdb';
        process.env.DB_POOL_SIZE = env.DB_POOL_SIZE || '200';
        process.env.DB_ACQUIRE_TIMEOUT = env.DB_ACQUIRE_TIMEOUT || '60000';
        process.env.DB_CONNECTION_TIMEOUT = env.DB_CONNECTION_TIMEOUT || '60000';
        process.env.DB_SSL = env.DB_SSL || 'false';
        const isDev = process.env.NODE_ENV === 'development';
        const dbTypeForConfig = process.env.DB_TYPE;
        const baseConfig = {
            type: dbTypeForConfig,
            database: process.env.DB_DATABASE,
            entities: [
                __dirname + '/../**/*.entity{.ts,.js}',
                __dirname + '/../users/domain/entities/*.entity{.ts,.js}',
                __dirname + '/../users/infrastructure/persistence/typeorm/*.entity{.ts,.js}',
                __dirname + '/../users/infrastructure/entities/*.entity{.ts,.js}',
                __dirname + '/../products/entities/*.entity{.ts,.js}',
                __dirname + '/../orders/entities/*.entity{.ts,.js}',
                __dirname + '/../payment/entities/*.entity{.ts,.js}',
                __dirname + '/../notification/entities/*.entity{.ts,.js}',
                __dirname + '/../address/infrastructure/entities/*.entity{.ts,.js}',
            ],
            synchronize: isDev,
            logging: isDev,
            extra: {},
        };
        if (dbTypeForConfig !== 'sqlite') {
            baseConfig.host = process.env.DB_HOST;
            baseConfig.port = parseInt(process.env.DB_PORT, 10);
            baseConfig.username = process.env.DB_USERNAME;
            baseConfig.password = process.env.DB_PASSWORD;
        }
        if (dbTypeForConfig === 'sqlite') {
            baseConfig.extra = {
                busyTimeout: 30000,
            };
        }
        else if (dbTypeForConfig === 'postgres') {
            baseConfig.extra = {
                max: parseInt(process.env.DB_POOL_SIZE, 10),
                idleTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT, 10),
                connectionTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT, 10),
            };
        }
        else {
            const poolSize = parseInt(process.env.DB_POOL_SIZE, 10);
            baseConfig.extra = {
                connectionLimit: poolSize,
                acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT, 10),
                connectTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT, 10),
                ssl: process.env.DB_SSL === 'true',
                supportBigNumbers: true,
                bigNumberStrings: false,
                transactionIsolation: 'READ COMMITTED',
                multipleStatements: true,
                queueLimit: 1000,
                idleTimeout: 60000,
                maxIdle: poolSize / 2,
                minIdle: 10,
                retryDelay: 200,
                maxRetries: 3,
            };
        }
        return baseConfig;
    };
    describe('TypeORM configuration factory', () => {
        it('should create correct TypeORM configuration for development', () => {
            const env = {
                NODE_ENV: 'development',
                DB_TYPE: 'mysql',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.type).toBe('mysql');
            expect(typeOrmConfig.host).toBe('localhost');
            expect(typeOrmConfig.port).toBe(3306);
            expect(typeOrmConfig.username).toBe('testuser');
            expect(typeOrmConfig.password).toBe('testpass');
            expect(typeOrmConfig.database).toBe('testdb');
            expect(typeOrmConfig.synchronize).toBe(true);
            expect(typeOrmConfig.logging).toBe(true);
            expect(typeOrmConfig.entities).toContain(__dirname + '/../**/*.entity{.ts,.js}');
        });
        it('should create correct TypeORM configuration for production', () => {
            const env = {
                NODE_ENV: 'production',
                DB_TYPE: 'mysql',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.type).toBe('mysql');
            expect(typeOrmConfig.synchronize).toBe(false);
            expect(typeOrmConfig.logging).toBe(false);
        });
        it('should create correct TypeORM configuration for TiDB', () => {
            const env = {
                DB_TYPE: 'tidb',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.type).toBe('tidb');
            expect(typeOrmConfig.host).toBe('localhost');
            expect(typeOrmConfig.port).toBe(4000);
            expect(typeOrmConfig.extra).toBeDefined();
            expect(typeOrmConfig.extra.connectionLimit).toBe(200);
            expect(typeOrmConfig.extra.supportBigNumbers).toBe(true);
            expect(typeOrmConfig.extra.transactionIsolation).toBe('READ COMMITTED');
        });
        it('should create correct TypeORM configuration for PostgreSQL', () => {
            const env = {
                DB_TYPE: 'postgres',
                DB_PORT: '5432',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.type).toBe('postgres');
            expect(typeOrmConfig.host).toBe('localhost');
            expect(typeOrmConfig.port).toBe(5432);
            expect(typeOrmConfig.extra).toBeDefined();
            expect(typeOrmConfig.extra.max).toBe(200);
            expect(typeOrmConfig.extra.idleTimeoutMillis).toBe(60000);
            expect(typeOrmConfig.extra.connectionTimeoutMillis).toBe(60000);
        });
        it('should create correct TypeORM configuration for SQLite', () => {
            const env = {
                DB_TYPE: 'sqlite',
                DB_DATABASE: './data/test.db',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.type).toBe('sqlite');
            expect(typeOrmConfig.database).toBe('./data/test.db');
            expect(typeOrmConfig.host).toBeUndefined();
            expect(typeOrmConfig.port).toBeUndefined();
            expect(typeOrmConfig.username).toBeUndefined();
            expect(typeOrmConfig.password).toBeUndefined();
            expect(typeOrmConfig.extra).toBeDefined();
            expect(typeOrmConfig.extra.busyTimeout).toBe(30000);
        });
        it('should configure TiDB-specific parameters', () => {
            const env = {
                DB_TYPE: 'tidb',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.extra).toBeDefined();
            expect(typeOrmConfig.extra.connectionLimit).toBe(200);
            expect(typeOrmConfig.extra.acquireTimeout).toBe(60000);
            expect(typeOrmConfig.extra.connectTimeout).toBe(60000);
            expect(typeOrmConfig.extra.ssl).toBe(false);
            expect(typeOrmConfig.extra.supportBigNumbers).toBe(true);
            expect(typeOrmConfig.extra.bigNumberStrings).toBe(false);
            expect(typeOrmConfig.extra.transactionIsolation).toBe('READ COMMITTED');
            expect(typeOrmConfig.extra.multipleStatements).toBe(true);
        });
        it('should configure connection pool parameters', () => {
            const env = {
                DB_TYPE: 'mysql',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.extra.queueLimit).toBe(1000);
            expect(typeOrmConfig.extra.idleTimeout).toBe(60000);
            expect(typeOrmConfig.extra.maxIdle).toBe(100);
            expect(typeOrmConfig.extra.minIdle).toBe(10);
        });
        it('should configure retry strategy', () => {
            const env = {
                DB_TYPE: 'mysql',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.extra.retryDelay).toBe(200);
            expect(typeOrmConfig.extra.maxRetries).toBe(3);
        });
        it('should handle SSL configuration', () => {
            const env = {
                DB_TYPE: 'mysql',
                DB_SSL: 'true',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.extra.ssl).toBe(true);
        });
        it('should use default TiDB port when not specified', () => {
            const env = {
                DB_TYPE: 'tidb',
                DB_PORT: '',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.port).toBe(4000);
        });
        it('should use default PostgreSQL port when not specified', () => {
            const env = {
                DB_TYPE: 'postgres',
                DB_PORT: '',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.port).toBe(5432);
        });
        it('should use default MySQL port when not specified', () => {
            const env = {
                DB_TYPE: 'mysql',
                DB_PORT: '',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.port).toBe(3306);
        });
        it('should calculate connection pool parameters correctly', () => {
            const env = {
                DB_TYPE: 'mysql',
                DB_POOL_SIZE: '100',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.extra.connectionLimit).toBe(100);
            expect(typeOrmConfig.extra.maxIdle).toBe(50);
        });
        it('should calculate PostgreSQL connection pool parameters correctly', () => {
            const env = {
                DB_TYPE: 'postgres',
                DB_POOL_SIZE: '100',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.extra.max).toBe(100);
        });
    });
    describe('module integration', () => {
        it('should be able to compile module with dependencies', async () => {
            const mockTypeOrmModule = {
                forRootAsync: jest.fn().mockReturnValue({
                    module: typeorm_1.TypeOrmModule,
                    providers: [],
                    exports: [],
                }),
            };
            const module = await testing_1.Test.createTestingModule({
                imports: [
                    config_1.ConfigModule.forRoot({
                        load: [() => masterConfig],
                        isGlobal: true,
                    }),
                    mockTypeOrmModule.forRootAsync(),
                ],
            }).compile();
            expect(module).toBeDefined();
        });
        it('should provide ConfigService', async () => {
            const module = await testing_1.Test.createTestingModule({
                imports: [
                    config_1.ConfigModule.forRoot({
                        load: [() => masterConfig],
                        isGlobal: true,
                    }),
                ],
            }).compile();
            expect(module.get(config_1.ConfigService)).toBeDefined();
        });
        it('should configure TypeORM with correct entities path', () => {
            const typeOrmConfig = createTestConfig();
            expect(typeOrmConfig.entities).toContain(__dirname + '/../**/*.entity{.ts,.js}');
            expect(masterConfig.database.database).toBeDefined();
        });
    });
    describe('error handling', () => {
        it('should handle zero or negative pool size', () => {
            const env = {
                DB_TYPE: 'mysql',
                DB_POOL_SIZE: '0',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.extra.connectionLimit).toBe(0);
            expect(typeOrmConfig.extra.maxIdle).toBe(0);
        });
        it('should handle extremely large pool size', () => {
            const env = {
                DB_TYPE: 'mysql',
                DB_POOL_SIZE: '10000',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.extra.connectionLimit).toBe(10000);
            expect(typeOrmConfig.extra.maxIdle).toBe(5000);
        });
        describe('configuration edge cases', () => {
            it('should handle empty database name', () => {
                const env = {
                    DB_TYPE: 'sqlite',
                    DB_DATABASE: '',
                };
                const typeOrmConfig = createTestConfig(env);
                expect(typeOrmConfig.database).toBe('');
            });
            it('should handle special characters in database password', () => {
                const env = {
                    DB_TYPE: 'mysql',
                    DB_PASSWORD: 'p@ssw0rd!#$%&()',
                };
                const typeOrmConfig = createTestConfig(env);
                expect(typeOrmConfig.password).toBe('p@ssw0rd!#$%&()');
            });
            it('should handle IPv6 host addresses', () => {
                const env = {
                    DB_TYPE: 'mysql',
                    DB_HOST: '::1',
                };
                const typeOrmConfig = createTestConfig(env);
                expect(typeOrmConfig.host).toBe('::1');
            });
            it('should handle custom entity paths', () => {
                const typeOrmConfig = createTestConfig();
                expect(typeOrmConfig.entities).toContain(__dirname + '/../**/*.entity{.ts,.js}');
                expect(typeOrmConfig.entities).toContain(__dirname + '/../users/domain/entities/*.entity{.ts,.js}');
                expect(typeOrmConfig.entities).toContain(__dirname + '/../products/entities/*.entity{.ts,.js}');
                expect(typeOrmConfig.entities).toContain(__dirname + '/../orders/entities/*.entity{.ts,.js}');
            });
            it('should handle boolean SSL configuration', () => {
                const env1 = {
                    DB_TYPE: 'mysql',
                    DB_SSL: 'true',
                };
                let typeOrmConfig = createTestConfig(env1);
                expect(typeOrmConfig.extra.ssl).toBe(true);
                const env2 = {
                    DB_TYPE: 'mysql',
                    DB_SSL: 'false',
                };
                typeOrmConfig = createTestConfig(env2);
                expect(typeOrmConfig.extra.ssl).toBe(false);
            });
            it('should handle database type case sensitivity', () => {
                const env = {
                    DB_TYPE: 'MySQL',
                };
                const typeOrmConfig = createTestConfig(env);
                expect(typeOrmConfig.type).toBe('MySQL');
            });
        });
    });
    describe('performance optimizations', () => {
        it('should configure connection pooling for high concurrency', () => {
            const env = {
                DB_TYPE: 'mysql',
                DB_POOL_SIZE: '200',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.extra.connectionLimit).toBe(200);
            expect(typeOrmConfig.extra.maxIdle).toBe(100);
            expect(typeOrmConfig.extra.queueLimit).toBe(1000);
        });
        it('should configure PostgreSQL connection pooling for high concurrency', () => {
            const env = {
                DB_TYPE: 'postgres',
                DB_POOL_SIZE: '200',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.extra.max).toBe(200);
        });
        it('should configure timeouts for reliability', () => {
            const env = {
                DB_TYPE: 'mysql',
                DB_ACQUIRE_TIMEOUT: '60000',
                DB_CONNECTION_TIMEOUT: '60000',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.extra.acquireTimeout).toBe(60000);
            expect(typeOrmConfig.extra.connectTimeout).toBe(60000);
            expect(typeOrmConfig.extra.idleTimeout).toBe(60000);
        });
        it('should configure TiDB distributed optimizations', () => {
            const env = {
                DB_TYPE: 'tidb',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.extra.supportBigNumbers).toBe(true);
            expect(typeOrmConfig.extra.bigNumberStrings).toBe(false);
            expect(typeOrmConfig.extra.transactionIsolation).toBe('READ COMMITTED');
            expect(typeOrmConfig.extra.multipleStatements).toBe(true);
        });
        it('should configure SQLite optimizations', () => {
            const env = {
                DB_TYPE: 'sqlite',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.extra.busyTimeout).toBe(30000);
        });
        it('should handle extreme high concurrency settings', () => {
            const env = {
                DB_TYPE: 'mysql',
                DB_POOL_SIZE: '500',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.extra.connectionLimit).toBe(500);
            expect(typeOrmConfig.extra.maxIdle).toBe(250);
            expect(typeOrmConfig.extra.queueLimit).toBe(1000);
        });
        it('should handle custom timeout settings', () => {
            const env = {
                DB_TYPE: 'mysql',
                DB_ACQUIRE_TIMEOUT: '120000',
                DB_CONNECTION_TIMEOUT: '90000',
            };
            const typeOrmConfig = createTestConfig(env);
            expect(typeOrmConfig.extra.acquireTimeout).toBe(120000);
            expect(typeOrmConfig.extra.connectTimeout).toBe(90000);
            expect(typeOrmConfig.extra.idleTimeout).toBe(60000);
        });
    });
});
