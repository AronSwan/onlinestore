"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const throttler_1 = require("@nestjs/throttler");
const event_emitter_1 = require("@nestjs/event-emitter");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const monitoring_module_1 = require("./monitoring/monitoring.module");
const unified_master_config_1 = require("./config/unified-master.config");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const products_module_1 = require("./products/products.module");
const orders_module_1 = require("./orders/orders.module");
const cart_module_1 = require("./cart/cart.module");
const audit_module_1 = require("./common/audit/audit.module");
const payment_module_1 = require("./payment/payment.module");
const address_module_1 = require("./address/address.module");
const basic_data_module_1 = require("./basic-data/basic-data.module");
const notification_module_1 = require("./notification/notification.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            event_emitter_1.EventEmitterModule.forRoot(),
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env.local', '.env', '../.env'],
                ignoreEnvFile: false,
                load: [unified_master_config_1.createMasterConfiguration],
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => {
                    const masterConfig = configService.get('master');
                    const dbConfig = masterConfig?.database;
                    if (!dbConfig) {
                        throw new Error('数据库配置未找到');
                    }
                    const config = {
                        type: dbConfig.type,
                        database: dbConfig.database,
                        entities: [
                            __dirname + '/users/entities/*.entity{.ts,.js}',
                            __dirname + '/cart/infrastructure/entities/*.entity{.ts,.js}',
                            __dirname + '/auth/**/*.entity{.ts,.js}',
                            __dirname + '/orders/entities/*.entity{.ts,.js}',
                            __dirname + '/products/entities/*.entity{.ts,.js}',
                            __dirname + '/common/audit/entities/*.entity{.ts,.js}',
                            __dirname + '/monitoring/*.service{.ts,.js}',
                            __dirname + '/payment/**/*.entity{.ts,.js}',
                            __dirname + '/address/**/*.entity{.ts,.js}',
                            __dirname + '/basic-data/**/*.entity{.ts,.js}',
                            __dirname + '/notification/**/*.entity{.ts,.js}',
                        ],
                        synchronize: dbConfig.synchronize,
                        logging: dbConfig.logging,
                    };
                    if (dbConfig.type !== 'better-sqlite3') {
                        Object.assign(config, {
                            host: dbConfig.host,
                            port: dbConfig.port,
                            username: dbConfig.username,
                            password: dbConfig.password,
                        });
                    }
                    return config;
                },
                inject: [config_1.ConfigService],
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (configService) => [
                    {
                        ttl: configService.get('THROTTLER_TTL', 60) * 1000,
                        limit: configService.get('THROTTLER_LIMIT', 300),
                    },
                ],
            }),
            monitoring_module_1.MonitoringModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            products_module_1.ProductsModule,
            orders_module_1.OrdersModule,
            cart_module_1.CartModule,
            audit_module_1.AuditModule,
            payment_module_1.PaymentModule,
            address_module_1.AddressModule,
            basic_data_module_1.BasicDataModule,
            notification_module_1.NotificationModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
