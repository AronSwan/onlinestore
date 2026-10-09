"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentOrderAggregate = exports.RefundAggregate = exports.RefundStatus = exports.PaymentStatus = void 0;
const payment_order_id_value_object_1 = require("../value-objects/payment-order-id.value-object");
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["PROCESSING"] = "PROCESSING";
    PaymentStatus["SUCCEEDED"] = "SUCCEEDED";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["CANCELLED"] = "CANCELLED";
    PaymentStatus["EXPIRED"] = "EXPIRED";
    PaymentStatus["CLOSED"] = "CLOSED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var RefundStatus;
(function (RefundStatus) {
    RefundStatus["PENDING"] = "PENDING";
    RefundStatus["PROCESSING"] = "PROCESSING";
    RefundStatus["SUCCEEDED"] = "SUCCEEDED";
    RefundStatus["FAILED"] = "FAILED";
})(RefundStatus || (exports.RefundStatus = RefundStatus = {}));
class RefundAggregate {
    constructor(id, amount, reason, operatorId, status = RefundStatus.PENDING, createdAt = new Date(), gatewayRefundId, completedAt) {
        this.id = id;
        this.amount = amount;
        this.reason = reason;
        this.operatorId = operatorId;
        this.status = status;
        this.createdAt = createdAt;
        this.gatewayRefundId = gatewayRefundId;
        this.completedAt = completedAt;
    }
    updateGatewayInfo(gatewayRefundId) {
        this.gatewayRefundId = gatewayRefundId;
    }
    markAsSucceeded() {
        this.status = RefundStatus.SUCCEEDED;
        this.completedAt = new Date();
    }
    markAsFailed() {
        this.status = RefundStatus.FAILED;
        this.completedAt = new Date();
    }
}
exports.RefundAggregate = RefundAggregate;
class PaymentOrderAggregate {
    constructor(id, merchantOrderId, amount, paymentMethod, subject, userId, status = PaymentStatus.PENDING, createdAt = new Date(), updatedAt = new Date(), description, paymentUrl, qrCode, gatewayOrderId, paidAmount, paidAt, failureReason, expireTime, closedAt, refunds = []) {
        this.id = id;
        this.merchantOrderId = merchantOrderId;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.subject = subject;
        this.userId = userId;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.description = description;
        this.paymentUrl = paymentUrl;
        this.qrCode = qrCode;
        this.gatewayOrderId = gatewayOrderId;
        this.paidAmount = paidAmount;
        this.paidAt = paidAt;
        this.failureReason = failureReason;
        this.expireTime = expireTime;
        this.closedAt = closedAt;
        this.refunds = refunds;
        this.uncommittedEvents = [];
    }
    static create(command) {
        const id = payment_order_id_value_object_1.PaymentOrderId.generate();
        const order = new PaymentOrderAggregate(id, command.merchantOrderId, command.amount, command.paymentMethod, command.subject, command.userId, PaymentStatus.PENDING, new Date(), new Date(), command.description || '', undefined, undefined, undefined, undefined, undefined, undefined, command.expireTime, undefined, []);
        return order;
    }
    updateGatewayInfo(gatewayOrderId, paymentUrl, qrCode) {
        this.gatewayOrderId = gatewayOrderId;
        if (paymentUrl)
            this.paymentUrl = paymentUrl;
        if (qrCode)
            this.qrCode = qrCode;
        this.updatedAt = new Date();
    }
    markAsSucceeded(gatewayOrderId, paidAmount, paidAt) {
        this.gatewayOrderId = gatewayOrderId;
        this.paidAmount = paidAmount;
        this.paidAt = paidAt || new Date();
        this.status = PaymentStatus.SUCCEEDED;
        this.updatedAt = new Date();
    }
    markAsFailed(failureReason) {
        this.failureReason = failureReason;
        this.status = PaymentStatus.FAILED;
        this.updatedAt = new Date();
    }
    close(operatorId) {
        this.status = PaymentStatus.CLOSED;
        this.closedAt = new Date();
        this.updatedAt = new Date();
    }
    createRefund(refundAmount, reason, operatorId) {
        if (this.status !== PaymentStatus.SUCCEEDED) {
            throw new Error('只有成功的支付订单才能退款');
        }
        const refundId = payment_order_id_value_object_1.PaymentOrderId.generate();
        const refund = new RefundAggregate(refundId, refundAmount, reason, operatorId);
        this.refunds.push(refund);
        this.updatedAt = new Date();
        return refund;
    }
    isSucceeded() {
        return this.status === PaymentStatus.SUCCEEDED;
    }
    getUncommittedEvents() {
        return [...this.uncommittedEvents];
    }
    clearUncommittedEvents() {
        this.uncommittedEvents = [];
    }
}
exports.PaymentOrderAggregate = PaymentOrderAggregate;
