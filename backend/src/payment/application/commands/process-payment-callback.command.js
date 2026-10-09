"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessPaymentCallbackCommand = void 0;
class ProcessPaymentCallbackCommand {
    constructor(paymentMethod, outTradeNo, gatewayOrderId, tradeStatus, totalAmount, receiptAmount, gmtPayment, signature, rawData) {
        this.paymentMethod = paymentMethod;
        this.outTradeNo = outTradeNo;
        this.gatewayOrderId = gatewayOrderId;
        this.tradeStatus = tradeStatus;
        this.totalAmount = totalAmount;
        this.receiptAmount = receiptAmount;
        this.gmtPayment = gmtPayment;
        this.signature = signature;
        this.rawData = rawData;
    }
    static create(params) {
        return new ProcessPaymentCallbackCommand(params.paymentMethod, params.outTradeNo, params.gatewayOrderId, params.tradeStatus, params.totalAmount, params.receiptAmount, params.gmtPayment, params.signature, params.rawData);
    }
}
exports.ProcessPaymentCallbackCommand = ProcessPaymentCallbackCommand;
