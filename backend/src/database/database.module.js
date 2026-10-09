"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const unified_master_config_1 = require("../config/unified-master.config");
const masterConfig = (0, unified_master_config_1.createMasterConfiguration)();
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => {
                    const isDev = masterConfig.app.env === 'development';
                    const dbType = masterConfig.database.type;
                    const resolvedType = dbType === 'tidb' ? 'mysql' : dbType;
                    const defaultPort = dbType === 'tidb' ? 4000 : resolvedType === 'postgres' ? 5432 : 3306;
                    const baseConfig = {
                        type: resolvedType,
                        database: masterConfig.database.database,
                    };
                    if (dbType !== 'better-sqlite3') {
                        Object.assign(baseConfig, {
                            host: masterConfig.database.host,
                            port: masterConfig.database.port || defaultPort,
                            username: masterConfig.database.username,
                            password: masterConfig.database.password,
                        });
                    }
                    return {
                        ...baseConfig,
                        entities: [
                            __dirname + '/../**/*.entity{.ts,.js}',
                        ],
                        synchronize: isDev,
                        logging: isDev,
                        extra: dbType === 'better-sqlite3'
                            ? {
                                timeout: 30000,
                            }
                            : dbType === 'postgres'
                                ? {
                                    max: masterConfig.database.poolSize,
                                    idleTimeoutMillis: masterConfig.database.connectionTimeout,
                                    connectionTimeoutMillis: masterConfig.database.acquireTimeout,
                                }
                                : {
                                    connectionLimit: masterConfig.database.poolSize,
                                    connectTimeout: masterConfig.database.connectionTimeout,
                                    waitForConnections: true,
                                    ssl: process.env.DB_SSL === 'true',
                                    supportBigNumbers: true,
                                    bigNumberStrings: false,
                                    transactionIsolation: 'READ COMMITTED',
                                    multipleStatements: true,
                                    queueLimit: 1000,
                                    idleTimeout: 60000,
                                    maxIdle: masterConfig.database.poolSize / 2,
                                    minIdle: 10,
                                    retryDelay: 200,
                                    maxRetries: 3,
                                },
                    };
                },
            }),
        ],
        exports: [typeorm_1.TypeOrmModule],
    })
], DatabaseModule);
