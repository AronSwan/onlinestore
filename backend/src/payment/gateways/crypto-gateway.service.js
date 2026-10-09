"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var CryptoGatewayService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoGatewayService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
let CryptoGatewayService = CryptoGatewayService_1 = class CryptoGatewayService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(CryptoGatewayService_1.name);
        this.baseUrl = this.configService.get('CRYPTO_GATEWAY_URL', 'http://localhost:8081');
        this.apiKey = this.configService.get('CRYPTO_API_KEY') || undefined;
        this.apiSecret = this.configService.get('CRYPTO_API_SECRET') || undefined;
        this.httpClient = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey,
            },
        });
        this.httpClient.interceptors.request.use(config => {
            const timestamp = Date.now().toString();
            const signature = this.generateSignature(config.data, timestamp);
            config.headers['X-Timestamp'] = timestamp;
            config.headers['X-Signature'] = signature;
            return config;
        });
        this.httpClient.interceptors.response.use(response => response, error => {
            this.logger.error(`Crypto Gateway Error: ${error.message}`, error.stack);
            throw new common_1.HttpException(`加密货币支付网关错误: ${error.response?.data?.message || error.message}`, error.response?.status || common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        });
    }
    async createPayment(request) {
        try {
            this.logger.log(`创建加密货币支付: ${request.orderId}, ${request.currency}-${request.network}`);
            const response = await this.httpClient.post('/api/v1/crypto/payment/create', request);
            this.logger.log(`加密货币支付创建成功: ${request.orderId}`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`创建加密货币支付失败: ${request.orderId}`, error.stack);
            throw error;
        }
    }
    async queryPayment(paymentId) {
        try {
            this.logger.log(`查询加密货币支付状态: ${paymentId}`);
            const response = await this.httpClient.get(`/api/v1/crypto/payment/query/${paymentId}`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`查询加密货币支付状态失败: ${paymentId}`, error.stack);
            throw error;
        }
    }
    async getAddressBalance(address, currency, network) {
        try {
            const response = await this.httpClient.get('/api/v1/crypto/address/balance', {
                params: { address, currency, network },
            });
            return response.data.balance || 0;
        }
        catch (error) {
            this.logger.error(`获取地址余额失败: ${address}`, error.stack);
            return 0;
        }
    }
    async validateTransaction(txHash, currency, network) {
        try {
            const response = await this.httpClient.get('/api/v1/crypto/transaction/validate', {
                params: { txHash, currency, network },
            });
            return response.data.valid || false;
        }
        catch (error) {
            this.logger.error(`验证交易失败: ${txHash}`, error.stack);
            return false;
        }
    }
    validateCallback(data, signature) {
        if (!this.apiSecret) {
            this.logger.warn('CRYPTO_API_SECRET 未配置, 拒绝回调验签(fail-closed)');
            return false;
        }
        const expectedSignature = this.generateCallbackSignature(data);
        return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
    }
    generateSignature(data, timestamp) {
        if (!this.apiKey || !this.apiSecret) {
            throw new common_1.HttpException('加密货币网关 API 密钥未配置, 拒绝生成签名(fail-closed)', common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
        const payload = JSON.stringify(data || {});
        const signString = `${this.apiKey}${timestamp}${payload}${this.apiSecret}`;
        return crypto.createHash('sha256').update(signString).digest('hex');
    }
    generateCallbackSignature(data) {
        if (!this.apiSecret) {
            throw new common_1.HttpException('加密货币网关 API 密钥未配置, 拒绝生成回调签名(fail-closed)', common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
        const keys = Object.keys(data).sort();
        const signString = keys
            .filter(key => key !== 'signature' && data[key] !== undefined && data[key] !== '')
            .map(key => `${key}=${data[key]}`)
            .join('&') + `&secret=${this.apiSecret}`;
        return crypto.createHash('sha256').update(signString).digest('hex');
    }
};
exports.CryptoGatewayService = CryptoGatewayService;
exports.CryptoGatewayService = CryptoGatewayService = CryptoGatewayService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CryptoGatewayService);
