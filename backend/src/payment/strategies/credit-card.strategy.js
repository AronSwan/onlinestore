"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditCardStrategy = void 0;
const payment_strategy_interface_1 = require("./payment-strategy.interface");
class CreditCardStrategy extends payment_strategy_interface_1.PaymentStrategy {
    async createPayment(request) {
        const paymentId = `CARD_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        return {
            success: true,
            data: {
                paymentId,
                redirectUrl: `https://payment-gateway.com/pay?payment_id=${paymentId}`,
                thirdPartyTransactionId: paymentId,
            },
        };
    }
    async queryPayment(paymentId) {
        return {
            success: true,
            data: {
                status: 'success',
                thirdPartyTransactionId: paymentId,
            },
        };
    }
    async handleCallback(data) {
        if (!this.validateCallback(data)) {
            return {
                success: false,
                message: '回调验签失败',
            };
        }
        return {
            success: true,
            data: {
                paymentId: data.payment_id,
                status: 'success',
                thirdPartyTransactionId: data.transaction_id,
            },
        };
    }
    async refund(request) {
        return {
            success: true,
            data: {
                refundId: `REFUND_${request.paymentId}_${Date.now()}`,
                status: 'SUCCESS',
                message: '退款成功',
            },
        };
    }
    validateCallback(data) {
        return this.verifyCallbackSignature(data);
    }
}
exports.CreditCardStrategy = CreditCardStrategy;
