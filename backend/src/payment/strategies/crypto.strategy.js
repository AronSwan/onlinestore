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
var CryptoStrategy_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoStrategy = void 0;
const common_1 = require("@nestjs/common");
const payment_strategy_interface_1 = require("./payment-strategy.interface");
const crypto_gateway_service_1 = require("../gateways/crypto-gateway.service");
const payment_entity_1 = require("../entities/payment.entity");
let CryptoStrategy = CryptoStrategy_1 = class CryptoStrategy extends payment_strategy_interface_1.PaymentStrategy {
    constructor(cryptoGateway, method) {
        super();
        this.cryptoGateway = cryptoGateway;
        this.method = method;
        this.logger = new common_1.Logger(CryptoStrategy_1.name);
    }
    async createPayment(request) {
        try {
            const { currency, network } = this.parseCryptoMethod(this.method);
            const cryptoRequest = {
                orderId: request.orderId,
                amount: request.amount,
                currency,
                network,
                userId: request.userId,
                expireMinutes: request.expireMinutes || 60,
                metadata: request.metadata,
            };
            const response = await this.cryptoGateway.createPayment(cryptoRequest);
            if (response.success) {
                return {
                    success: true,
                    data: {
                        paymentId: response.paymentId,
                        cryptoAddress: response.address,
                        qrCode: response.qrCode,
                        thirdPartyTransactionId: response.paymentId,
                        expiredAt: response.expiredAt,
                    },
                };
            }
            else {
                return {
                    success: false,
                    message: response.message || '创建加密货币支付失败',
                };
            }
        }
        catch (error) {
            this.logger.error(`加密货币策略创建支付失败: ${error.message}`, error.stack);
            return {
                success: false,
                message: error.message || '加密货币支付服务异常',
            };
        }
    }
    async queryPayment(paymentId) {
        try {
            const response = await this.cryptoGateway.queryPayment(paymentId);
            if (response.success) {
                return {
                    success: true,
                    data: {
                        status: this.mapStatus(response.status),
                        blockchainTxHash: response.txHash,
                        paidAt: response.paidAt,
                        amount: response.actualAmount,
                    },
                    message: response.message,
                };
            }
            else {
                return {
                    success: false,
                    message: response.message || '查询加密货币支付状态失败',
                };
            }
        }
        catch (error) {
            this.logger.error(`加密货币策略查询支付失败: ${error.message}`, error.stack);
            return {
                success: false,
                message: error.message || '查询加密货币支付状态异常',
            };
        }
    }
    async handleCallback(data) {
        try {
            if (!this.validateCallback(data)) {
                return {
                    success: false,
                    message: '加密货币回调签名验证失败',
                };
            }
            if (data.txHash) {
                const { currency, network } = this.parseCryptoMethod(this.method);
                const isValid = await this.cryptoGateway.validateTransaction(String(data.txHash), currency, network);
                if (!isValid) {
                    return {
                        success: false,
                        message: '区块链交易验证失败',
                    };
                }
            }
            return {
                success: true,
                data: {
                    paymentId: String(data.paymentId),
                    status: this.mapStatus(String(data.status)),
                    amount: Number(data.amount),
                    blockchainTxHash: data.txHash,
                    paidAt: data.paidAt ? new Date(String(data.paidAt)) : undefined,
                },
            };
        }
        catch (error) {
            this.logger.error(`加密货币策略处理回调失败: ${error.message}`, error.stack);
            return {
                success: false,
                message: error.message || '处理加密货币回调异常',
            };
        }
    }
    async refund(request) {
        this.logger.warn(`加密货币支付不支持自动退款: ${request.paymentId}`);
        return {
            success: false,
            message: '加密货币支付不支持自动退款，请联系客服处理',
        };
    }
    validateCallback(data) {
        try {
            return this.cryptoGateway.validateCallback(data, String(data.signature ?? ''));
        }
        catch (error) {
            this.logger.error(`加密货币策略验证回调失败: ${error.message}`, error.stack);
            return false;
        }
    }
    parseCryptoMethod(method) {
        switch (method) {
            case payment_entity_1.PaymentMethod.USDT_TRC20:
                return { currency: 'USDT', network: 'TRC20' };
            case payment_entity_1.PaymentMethod.USDT_ERC20:
                return { currency: 'USDT', network: 'ERC20' };
            case payment_entity_1.PaymentMethod.USDT_BEP20:
                return { currency: 'USDT', network: 'BEP20' };
            case payment_entity_1.PaymentMethod.BTC:
                return { currency: 'BTC', network: 'BTC' };
            case payment_entity_1.PaymentMethod.ETH:
                return { currency: 'ETH', network: 'ETH' };
            default:
                throw new Error(`不支持的加密货币支付方式: ${method}`);
        }
    }
    mapStatus(status) {
        const statusMap = {
            pending: 'pending',
            confirming: 'processing',
            confirmed: 'success',
            success: 'success',
            failed: 'failed',
            expired: 'expired',
        };
        return statusMap[status.toLowerCase()] || 'failed';
    }
};
exports.CryptoStrategy = CryptoStrategy;
exports.CryptoStrategy = CryptoStrategy = CryptoStrategy_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [crypto_gateway_service_1.CryptoGatewayService, String])
], CryptoStrategy);
