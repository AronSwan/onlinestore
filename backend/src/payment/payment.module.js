"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const payment_controller_1 = require("./controllers/payment.controller");
const payment_application_service_1 = require("./application/services/payment-application.service");
const payment_query_service_1 = require("./application/services/payment-query.service");
const typeorm_payment_order_repository_1 = require("./infrastructure/repositories/typeorm-payment-order.repository");
const payment_gateway_factory_1 = require("./domain/services/payment-gateway.factory");
const payment_risk_service_1 = require("./domain/services/payment-risk.service");
const database_health_service_1 = require("./infrastructure/health/database-health.service");
const redis_health_service_1 = require("./infrastructure/health/redis-health.service");
const payment_gateway_health_service_1 = require("./infrastructure/health/payment-gateway-health.service");
const payment_entity_1 = require("./entities/payment.entity");
const alipay_strategy_1 = require("./strategies/alipay.strategy");
const wechat_pay_strategy_1 = require("./strategies/wechat-pay.strategy");
const credit_card_strategy_1 = require("./strategies/credit-card.strategy");
const crypto_strategy_1 = require("./strategies/crypto.strategy");
const crypto_gateway_service_1 = require("./gateways/crypto-gateway.service");
const messaging_module_1 = require("../messaging/messaging.module");
const security_module_1 = require("../common/security/security.module");
const payment_config_1 = __importDefault(require("./config/payment.config"));
let PaymentModule = class PaymentModule {
    constructor(configService) {
        this.configService = configService;
        this.validateCriticalConfig();
    }
    validateCriticalConfig() {
        const paymentConfig = this.configService.get('payment');
        if (!paymentConfig) {
            throw new Error('支付配置未找到');
        }
        const requiredConfigs = ['defaultCurrency', 'defaultExpireMinutes', 'maxRetryCount'];
        for (const config of requiredConfigs) {
            if (!paymentConfig[config]) {
                console.warn(`支付配置缺失: ${config}，将使用默认值`);
            }
        }
        console.log('支付模块配置验证完成');
    }
};
exports.PaymentModule = PaymentModule;
exports.PaymentModule = PaymentModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([payment_entity_1.Payment]),
            config_1.ConfigModule.forFeature(payment_config_1.default),
            messaging_module_1.MessagingModule,
            security_module_1.SecurityModule,
        ],
        controllers: [payment_controller_1.PaymentController],
        providers: [
            payment_application_service_1.PaymentApplicationService,
            payment_query_service_1.PaymentQueryService,
            payment_gateway_factory_1.PaymentGatewayFactory,
            crypto_gateway_service_1.CryptoGatewayService,
            payment_risk_service_1.PaymentRiskService,
            database_health_service_1.DatabaseHealthService,
            redis_health_service_1.RedisHealthService,
            payment_gateway_health_service_1.PaymentGatewayHealthService,
            {
                provide: 'PaymentOrderRepository',
                useClass: typeorm_payment_order_repository_1.TypeOrmPaymentOrderRepository,
            },
            {
                provide: 'PAYMENT_STRATEGIES',
                useFactory: (cryptoGateway) => {
                    const strategies = new Map();
                    strategies.set('alipay', new alipay_strategy_1.AlipayStrategy());
                    strategies.set('wechat', new wechat_pay_strategy_1.WechatPayStrategy());
                    strategies.set('credit_card', new credit_card_strategy_1.CreditCardStrategy());
                    strategies.set('usdt_trc20', new crypto_strategy_1.CryptoStrategy(cryptoGateway, payment_entity_1.PaymentMethod.USDT_TRC20));
                    strategies.set('usdt_erc20', new crypto_strategy_1.CryptoStrategy(cryptoGateway, payment_entity_1.PaymentMethod.USDT_ERC20));
                    strategies.set('usdt_bep20', new crypto_strategy_1.CryptoStrategy(cryptoGateway, payment_entity_1.PaymentMethod.USDT_BEP20));
                    strategies.set('btc', new crypto_strategy_1.CryptoStrategy(cryptoGateway, payment_entity_1.PaymentMethod.BTC));
                    strategies.set('eth', new crypto_strategy_1.CryptoStrategy(cryptoGateway, payment_entity_1.PaymentMethod.ETH));
                    return strategies;
                },
                inject: [crypto_gateway_service_1.CryptoGatewayService],
            },
        ],
        exports: [payment_application_service_1.PaymentApplicationService, payment_query_service_1.PaymentQueryService, payment_gateway_factory_1.PaymentGatewayFactory],
    }),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PaymentModule);
