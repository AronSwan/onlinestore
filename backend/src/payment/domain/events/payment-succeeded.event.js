"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentSucceededEvent = void 0;
class PaymentSucceededEvent {
    constructor(paymentOrderId, merchantOrderId, paidAmount, currency, gatewayOrderId, timestamp = new Date()) {
        this.paymentOrderId = paymentOrderId;
        this.merchantOrderId = merchantOrderId;
        this.paidAmount = paidAmount;
        this.currency = currency;
        this.gatewayOrderId = gatewayOrderId;
        this.timestamp = timestamp;
    }
}
exports.PaymentSucceededEvent = PaymentSucceededEvent;
