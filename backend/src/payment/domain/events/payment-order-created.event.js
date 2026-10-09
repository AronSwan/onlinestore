"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentOrderCreatedEvent = void 0;
class PaymentOrderCreatedEvent {
    constructor(paymentOrderId, merchantOrderId, amount, currency, paymentMethod, userId, timestamp = new Date()) {
        this.paymentOrderId = paymentOrderId;
        this.merchantOrderId = merchantOrderId;
        this.amount = amount;
        this.currency = currency;
        this.paymentMethod = paymentMethod;
        this.userId = userId;
        this.timestamp = timestamp;
    }
}
exports.PaymentOrderCreatedEvent = PaymentOrderCreatedEvent;
