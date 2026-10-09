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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentConfig = void 0;
const config_1 = require("@nestjs/config");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class PaymentConfig {
    constructor() {
        this.gopayGatewayUrl = 'http://localhost:8080';
        this.cryptoGatewayUrl = 'http://localhost:8081';
        this.cryptoTimeout = 30000;
        this.defaultCurrency = 'CNY';
        this.defaultExpireMinutes = 30;
        this.maxRetryCount = 3;
        this.callbackTimeout = 10000;
        this.alipaySandbox = true;
        this.wechatSandbox = true;
        this.unionpaySandbox = true;
        this.usdtTrc20Contract = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
        this.tronRpcUrl = 'https://api.trongrid.io';
        this.usdtTrc20Confirmations = 1;
        this.usdtErc20Contract = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
        this.ethRpcUrl = 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID';
        this.usdtErc20Confirmations = 12;
        this.usdtBep20Contract = '0x55d398326f99059fF775485246999027B3197955';
        this.bscRpcUrl = 'https://bsc-dataseed1.binance.org';
        this.usdtBep20Confirmations = 3;
        this.btcNetwork = 'mainnet';
        this.btcConfirmations = 6;
        this.ethConfirmations = 12;
    }
    static validate(config) {
        const validatedConfig = (0, class_transformer_1.plainToClass)(PaymentConfig, { cryptoGatewayUrl: config.CRYPTO_GATEWAY_URL || 'http://localhost:8081',
            cryptoApiKey: config.CRYPTO_API_KEY,
            cryptoApiSecret: config.CRYPTO_API_SECRET,
            cryptoTimeout: config.CRYPTO_TIMEOUT || '30000',
            defaultCurrency: config.PAYMENT_DEFAULT_CURRENCY || 'CNY',
            defaultExpireMinutes: config.PAYMENT_DEFAULT_EXPIRE_MINUTES || '30',
            maxRetryCount: config.PAYMENT_MAX_RETRY_COUNT || '3',
            callbackTimeout: config.PAYMENT_CALLBACK_TIMEOUT || '10000',
            alipayAppId: config.ALIPAY_APP_ID,
            alipayPrivateKey: config.ALIPAY_PRIVATE_KEY,
            alipayPublicKey: config.ALIPAY_PUBLIC_KEY,
            alipaySandbox: config.ALIPAY_SANDBOX || 'true',
            wechatAppId: config.WECHAT_APP_ID,
            wechatMchId: config.WECHAT_MCH_ID,
            wechatApiKey: config.WECHAT_API_KEY,
            wechatSandbox: config.WECHAT_SANDBOX || 'true',
            unionpayMerId: config.UNIONPAY_MER_ID,
            unionpayPrivateKey: config.UNIONPAY_PRIVATE_KEY,
            unionpayPublicKey: config.UNIONPAY_PUBLIC_KEY,
            unionpaySandbox: config.UNIONPAY_SANDBOX || 'true',
            usdtTrc20Contract: config.USDT_TRC20_CONTRACT || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
            tronRpcUrl: config.TRON_RPC_URL || 'https://api.trongrid.io',
            usdtTrc20Confirmations: config.USDT_TRC20_CONFIRMATIONS || '1',
            usdtErc20Contract: config.USDT_ERC20_CONTRACT || '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            ethRpcUrl: config.ETH_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
            usdtErc20Confirmations: config.USDT_ERC20_CONFIRMATIONS || '12',
            usdtBep20Contract: config.USDT_BEP20_CONTRACT || '0x55d398326f99059fF775485246999027B3197955',
            bscRpcUrl: config.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org',
            usdtBep20Confirmations: config.USDT_BEP20_CONFIRMATIONS || '3',
            btcNetwork: config.BTC_NETWORK || 'mainnet',
            btcRpcUrl: config.BTC_RPC_URL,
            btcConfirmations: config.BTC_CONFIRMATIONS || '6',
            ethConfirmations: config.ETH_CONFIRMATIONS || '12',
        });
        const errors = (0, class_validator_1.validateSync)(validatedConfig);
        if (errors.length > 0) {
            console.warn(`Payment configuration validation warnings: ${errors.toString()}`);
            if (process.env.NODE_ENV === 'production') {
                throw new Error(`Payment configuration validation failed: ${errors.toString()}`);
            }
        }
        return validatedConfig;
    }
}
exports.PaymentConfig = PaymentConfig;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "gopayGatewayUrl", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "gopayAppId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "gopayAppSecret", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value) || 30000),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "cryptoGatewayUrl", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "cryptoApiKey", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "cryptoApiSecret", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value) || 30000),
    __metadata("design:type", Number)
], PaymentConfig.prototype, "cryptoTimeout", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "defaultCurrency", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value) || 30),
    __metadata("design:type", Number)
], PaymentConfig.prototype, "defaultExpireMinutes", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value) || 3),
    __metadata("design:type", Number)
], PaymentConfig.prototype, "maxRetryCount", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value) || 10000),
    __metadata("design:type", Number)
], PaymentConfig.prototype, "callbackTimeout", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "alipayAppId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "alipayPrivateKey", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "alipayPublicKey", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true'),
    __metadata("design:type", Boolean)
], PaymentConfig.prototype, "alipaySandbox", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "wechatAppId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "wechatMchId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "wechatApiKey", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true'),
    __metadata("design:type", Boolean)
], PaymentConfig.prototype, "wechatSandbox", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "unionpayMerId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "unionpayPrivateKey", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "unionpayPublicKey", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true'),
    __metadata("design:type", Boolean)
], PaymentConfig.prototype, "unionpaySandbox", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "usdtTrc20Contract", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "tronRpcUrl", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value) || 1),
    __metadata("design:type", Number)
], PaymentConfig.prototype, "usdtTrc20Confirmations", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "usdtErc20Contract", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "ethRpcUrl", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value) || 12),
    __metadata("design:type", Number)
], PaymentConfig.prototype, "usdtErc20Confirmations", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "usdtBep20Contract", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "bscRpcUrl", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value) || 3),
    __metadata("design:type", Number)
], PaymentConfig.prototype, "usdtBep20Confirmations", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "btcNetwork", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaymentConfig.prototype, "btcRpcUrl", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value) || 6),
    __metadata("design:type", Number)
], PaymentConfig.prototype, "btcConfirmations", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value) || 12),
    __metadata("design:type", Number)
], PaymentConfig.prototype, "ethConfirmations", void 0);
exports.default = (0, config_1.registerAs)('payment', () => PaymentConfig.validate(process.env));
