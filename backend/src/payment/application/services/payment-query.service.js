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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PaymentQueryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentQueryService = void 0;
const common_1 = require("@nestjs/common");
const payment_method_value_object_1 = require("../../domain/value-objects/payment-method.value-object");
const database_health_service_1 = require("../../infrastructure/health/database-health.service");
const redis_health_service_1 = require("../../infrastructure/health/redis-health.service");
const payment_gateway_health_service_1 = require("../../infrastructure/health/payment-gateway-health.service");
let PaymentQueryService = PaymentQueryService_1 = class PaymentQueryService {
    constructor(paymentOrderRepository, databaseHealthService, redisHealthService, paymentGatewayHealthService) {
        this.paymentOrderRepository = paymentOrderRepository;
        this.databaseHealthService = databaseHealthService;
        this.redisHealthService = redisHealthService;
        this.paymentGatewayHealthService = paymentGatewayHealthService;
        this.logger = new common_1.Logger(PaymentQueryService_1.name);
    }
    async getPaymentOrderStatus(paymentOrderId) {
        this.logger.log(`查询支付订单状态: ${paymentOrderId.value}`);
        const paymentOrder = await this.paymentOrderRepository.findById(paymentOrderId);
        if (!paymentOrder) {
            throw new Error('支付订单不存在');
        }
        return this.toPaymentStatusResponse(paymentOrder);
    }
    async batchQueryPaymentStatus(paymentOrderIds) {
        this.logger.log(`批量查询支付状态: ${paymentOrderIds.length}个订单`);
        const paymentOrders = await this.paymentOrderRepository.findByIds(paymentOrderIds);
        return paymentOrders.map(order => this.toPaymentStatusResponse(order));
    }
    async getPaymentsByMerchantOrderId(merchantOrderId) {
        this.logger.log(`查询商户订单支付记录: ${merchantOrderId}`);
        const paymentOrders = await this.paymentOrderRepository.findByMerchantOrderId(merchantOrderId);
        return paymentOrders.map(order => this.toPaymentStatusResponse(order));
    }
    async getAvailablePaymentMethods() {
        this.logger.log('获取可用支付方式');
        return {
            traditional: [
                {
                    method: payment_method_value_object_1.PaymentMethod.ALIPAY.value,
                    name: '支付宝',
                    icon: 'alipay',
                    enabled: true,
                    description: '支持支付宝扫码支付',
                    fees: {
                        rate: 0.006,
                        min: 0.01,
                        max: undefined,
                    },
                },
                {
                    method: payment_method_value_object_1.PaymentMethod.WECHAT.value,
                    name: '微信支付',
                    icon: 'wechat',
                    enabled: true,
                    description: '支持微信扫码支付',
                    fees: {
                        rate: 0.006,
                        min: 0.01,
                        max: undefined,
                    },
                },
                {
                    method: payment_method_value_object_1.PaymentMethod.UNIONPAY.value,
                    name: '银联支付',
                    icon: 'unionpay',
                    enabled: true,
                    description: '支持银联卡支付',
                    fees: {
                        rate: 0.005,
                        min: 0.01,
                        max: undefined,
                    },
                },
                {
                    method: payment_method_value_object_1.PaymentMethod.CREDIT_CARD.value,
                    name: '信用卡',
                    icon: 'credit-card',
                    enabled: true,
                    description: '支持Visa、MasterCard等国际信用卡',
                    fees: {
                        rate: 0.029,
                        min: 0.3,
                        max: undefined,
                    },
                },
                {
                    method: payment_method_value_object_1.PaymentMethod.BANK_TRANSFER.value,
                    name: '银行转账',
                    icon: 'bank',
                    enabled: false,
                    description: '银行转账支付（暂不可用）',
                    fees: {
                        rate: 0.001,
                        min: 1.0,
                        max: 50.0,
                    },
                },
            ],
            crypto: [
                {
                    method: payment_method_value_object_1.PaymentMethod.USDT_TRC20.value,
                    name: 'USDT (TRC20)',
                    icon: 'usdt',
                    network: 'TRC20',
                    enabled: true,
                    description: '基于波场网络的USDT支付',
                    fees: {
                        rate: 0.01,
                        min: 1.0,
                        max: undefined,
                    },
                    contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
                },
                {
                    method: payment_method_value_object_1.PaymentMethod.USDT_ERC20.value,
                    name: 'USDT (ERC20)',
                    icon: 'usdt',
                    network: 'ERC20',
                    enabled: true,
                    description: '基于以太坊网络的USDT支付',
                    fees: {
                        rate: 0.01,
                        min: 5.0,
                        max: undefined,
                    },
                    contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                },
                {
                    method: payment_method_value_object_1.PaymentMethod.USDT_BEP20.value,
                    name: 'USDT (BEP20)',
                    icon: 'usdt',
                    network: 'BEP20',
                    enabled: true,
                    description: '基于币安智能链的USDT支付',
                    fees: {
                        rate: 0.01,
                        min: 1.0,
                        max: undefined,
                    },
                    contractAddress: '0x55d398326f99059fF775485246999027B3197955',
                },
                {
                    method: payment_method_value_object_1.PaymentMethod.BTC.value,
                    name: 'Bitcoin',
                    icon: 'btc',
                    network: 'BTC',
                    enabled: false,
                    description: '比特币支付（暂不可用）',
                    fees: {
                        rate: 0.015,
                        min: 10.0,
                        max: undefined,
                    },
                },
                {
                    method: payment_method_value_object_1.PaymentMethod.ETH.value,
                    name: 'Ethereum',
                    icon: 'eth',
                    network: 'ETH',
                    enabled: false,
                    description: '以太坊支付（暂不可用）',
                    fees: {
                        rate: 0.015,
                        min: 10.0,
                        max: undefined,
                    },
                },
            ],
        };
    }
    async getHealthStatus() {
        this.logger.log('检查支付服务健康状态');
        const [databaseHealth, redisHealth, gatewayHealth] = await Promise.allSettled([
            this.databaseHealthService.check(),
            this.redisHealthService.check(),
            this.paymentGatewayHealthService.check(),
        ]);
        return {
            checks: {
                database: databaseHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy',
                redis: redisHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy',
                paymentGateways: gatewayHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy',
            },
        };
    }
    async getPaymentHistoryByUserId(userId, page = 1, limit = 20) {
        this.logger.log(`查询用户支付历史: ${userId}, page: ${page}, limit: ${limit}`);
        const { orders, total } = await this.paymentOrderRepository.findByUserId(userId, page, limit);
        return {
            data: orders.map(order => this.toPaymentStatusResponse(order)),
            total,
            page,
            limit,
        };
    }
    async getPaymentStatistics(startDate, endDate) {
        this.logger.log(`获取支付统计: ${startDate.toISOString()} - ${endDate.toISOString()}`);
        const stats = await this.paymentOrderRepository.getStatistics(startDate, endDate);
        return {
            totalAmount: stats.totalAmount,
            totalCount: stats.totalCount,
            successCount: stats.successCount,
            failedCount: stats.failedCount,
            successRate: stats.totalCount > 0 ? stats.successCount / stats.totalCount : 0,
            methodStats: stats.methodStats,
        };
    }
    toPaymentStatusResponse(paymentOrder) {
        return {
            paymentOrderId: paymentOrder.id.value,
            merchantOrderId: paymentOrder.merchantOrderId,
            amount: paymentOrder.amount.amount,
            currency: paymentOrder.amount.currency,
            paymentMethod: paymentOrder.paymentMethod.value,
            status: paymentOrder.status,
            paidAmount: paymentOrder.paidAmount?.amount,
            paidAt: paymentOrder.paidAt?.toISOString(),
            failureReason: paymentOrder.failureReason,
            gatewayOrderId: paymentOrder.gatewayOrderId,
            createdAt: paymentOrder.createdAt.toISOString(),
            updatedAt: paymentOrder.updatedAt.toISOString(),
            refunds: paymentOrder.refunds?.map((refund) => ({
                refundId: refund.id.value,
                amount: refund.amount.amount,
                currency: refund.amount.currency,
                status: refund.status,
                reason: refund.reason,
                createdAt: refund.createdAt.toISOString(),
            })) || [],
        };
    }
};
exports.PaymentQueryService = PaymentQueryService;
exports.PaymentQueryService = PaymentQueryService = PaymentQueryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('PaymentOrderRepository')),
    __metadata("design:paramtypes", [Object, database_health_service_1.DatabaseHealthService,
        redis_health_service_1.RedisHealthService,
        payment_gateway_health_service_1.PaymentGatewayHealthService])
], PaymentQueryService);
