"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentFailedEvent = void 0;
class PaymentFailedEvent {
    constructor(paymentOrderId, merchantOrderId, failureReason, timestamp = new Date()) {
        this.paymentOrderId = paymentOrderId;
        this.merchantOrderId = merchantOrderId;
        this.failureReason = failureReason;
        this.timestamp = timestamp;
    }
}
exports.PaymentFailedEvent = PaymentFailedEvent;
