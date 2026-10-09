"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategyGatewayAdapter = void 0;
const common_1 = require("@nestjs/common");
class StrategyGatewayAdapter {
    constructor(strategy, methodKey) {
        this.strategy = strategy;
        this.methodKey = methodKey;
        this.logger = new common_1.Logger(StrategyGatewayAdapter.name);
    }
    async createPayment(params) {
        const expireMinutes = params.expireTime
            ? Math.max(1, Math.ceil((params.expireTime.getTime() - Date.now()) / 60000))
            : undefined;
        const result = await this.strategy.createPayment({
            orderId: params.merchantOrderId,
            amount: params.amount.amount,
            currency: params.amount.currency,
            userId: Number(params.extraParams?.userId ?? 0),
            metadata: { ...params.extraParams, subject: params.subject, description: params.description },
            returnUrl: params.returnUrl,
            notifyUrl: params.notifyUrl,
            expireMinutes,
        });
        if (!result.success || !result.data) {
            throw new Error(`支付创建失败[${this.methodKey}]: ${result.message ?? '网关未返回数据'}`);
        }
        return {
            gatewayOrderId: result.data.paymentId,
            paymentUrl: result.data.redirectUrl ?? result.data.deepLink,
            qrCode: result.data.qrCode,
        };
    }
    async verifyCallback(params) {
        const merged = { ...(params.data ?? {}), signature: params.signature ?? params.data?.signature };
        try {
            return this.strategy.validateCallback(merged);
        }
        catch (error) {
            this.logger.error(`[${this.methodKey}] 回调验签异常: ${error.message}`);
            return false;
        }
    }
    static { this.SUCCESS_STATES = new Set([
        'success', 'SUCCESS', 'TRADE_SUCCESS', 'TRADE_FINISHED', 'completed', 'confirmed',
    ]); }
    isPaymentSuccess(tradeStatus) {
        return StrategyGatewayAdapter.SUCCESS_STATES.has(tradeStatus);
    }
    getFailureReason(tradeStatus) {
        return `支付状态: ${tradeStatus}`;
    }
    async queryPaymentStatus(params) {
        const result = await this.strategy.queryPayment(params.gatewayOrderId);
        const data = result.data;
        const isSuccess = result.success && !!data && this.isPaymentSuccess(data.status);
        return {
            isSuccess,
            gatewayOrderId: params.gatewayOrderId,
            paidAmount: Number(data?.amount ?? 0),
            paidAt: data?.paidAt,
        };
    }
    async createRefund(params) {
        const result = await this.strategy.refund({
            paymentId: params.gatewayOrderId,
            amount: params.refundAmount.amount,
            reason: params.reason,
            metadata: { refundId: params.refundId, paymentOrderId: params.paymentOrderId },
        });
        if (!result.success || !result.data) {
            throw new Error(`退款创建失败[${this.methodKey}]: ${result.message ?? '网关未返回数据'}`);
        }
        return { gatewayRefundId: result.data.refundId };
    }
    async closePayment(params) {
        this.logger.warn(`[${this.methodKey}] closePayment: 策略接口未提供关闭能力（挂账），订单 ${params.paymentOrderId} 关闭仅落本地状态`);
    }
}
exports.StrategyGatewayAdapter = StrategyGatewayAdapter;
