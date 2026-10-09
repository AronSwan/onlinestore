"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateRefundCommand = void 0;
class CreateRefundCommand {
    constructor(paymentOrderId, refundAmount, reason, operatorId, description) {
        this.paymentOrderId = paymentOrderId;
        this.refundAmount = refundAmount;
        this.reason = reason;
        this.operatorId = operatorId;
        this.description = description;
    }
    static create(params) {
        return new CreateRefundCommand(params.paymentOrderId, params.refundAmount, params.reason, params.operatorId, params.description);
    }
}
exports.CreateRefundCommand = CreateRefundCommand;
