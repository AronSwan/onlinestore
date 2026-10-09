"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WechatPayStrategy = void 0;
const payment_strategy_interface_1 = require("./payment-strategy.interface");
class WechatPayStrategy extends payment_strategy_interface_1.PaymentStrategy {
    async createPayment(request) {
        const paymentId = `WECHAT_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        return {
            success: true,
            data: {
                paymentId,
                qrCode: `weixin://wxpay/bizpayurl?payment_id=${paymentId}`,
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
                paymentId: data.out_trade_no,
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
exports.WechatPayStrategy = WechatPayStrategy;
