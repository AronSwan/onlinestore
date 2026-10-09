"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundCreatedEvent = void 0;
class RefundCreatedEvent {
    constructor(refundId, paymentOrderId, merchantOrderId, refundAmount, currency, reason, operatorId, timestamp = new Date()) {
        this.refundId = refundId;
        this.paymentOrderId = paymentOrderId;
        this.merchantOrderId = merchantOrderId;
        this.refundAmount = refundAmount;
        this.currency = currency;
        this.reason = reason;
        this.operatorId = operatorId;
        this.timestamp = timestamp;
    }
}
exports.RefundCreatedEvent = RefundCreatedEvent;
