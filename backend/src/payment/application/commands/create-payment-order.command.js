"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePaymentOrderCommand = void 0;
class CreatePaymentOrderCommand {
    constructor(merchantOrderId, amount, paymentMethod, subject, userId, clientIp, userAgent, description, idempotencyKey, notifyUrl, returnUrl, expireTime, extraParams) {
        this.merchantOrderId = merchantOrderId;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.subject = subject;
        this.userId = userId;
        this.clientIp = clientIp;
        this.userAgent = userAgent;
        this.description = description;
        this.idempotencyKey = idempotencyKey;
        this.notifyUrl = notifyUrl;
        this.returnUrl = returnUrl;
        this.expireTime = expireTime;
        this.extraParams = extraParams;
    }
    static create(params) {
        return new CreatePaymentOrderCommand(params.merchantOrderId, params.amount, params.paymentMethod, params.subject || '', params.userId, params.clientIp, params.userAgent, params.description || '', params.idempotencyKey, params.notifyUrl, params.returnUrl, params.expireTime, params.extraParams);
    }
}
exports.CreatePaymentOrderCommand = CreatePaymentOrderCommand;
