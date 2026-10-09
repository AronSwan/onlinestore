import { PaymentMethod } from '../../domain/value-objects/payment-method.value-object';
export declare class ProcessPaymentCallbackCommand {
    readonly paymentMethod: PaymentMethod;
    readonly outTradeNo: string;
    readonly gatewayOrderId: string;
    readonly tradeStatus: string;
    readonly totalAmount: number;
    readonly receiptAmount?: number | undefined;
    readonly gmtPayment?: Date | undefined;
    readonly signature?: string | undefined;
    readonly rawData?: Record<string, any> | undefined;
    constructor(paymentMethod: PaymentMethod, outTradeNo: string, gatewayOrderId: string, tradeStatus: string, totalAmount: number, receiptAmount?: number | undefined, gmtPayment?: Date | undefined, signature?: string | undefined, rawData?: Record<string, any> | undefined);
    static create(params: {
        paymentMethod: PaymentMethod;
        outTradeNo: string;
        gatewayOrderId: string;
        tradeStatus: string;
        totalAmount: number;
        receiptAmount?: number;
        gmtPayment?: Date;
        signature?: string;
        rawData?: Record<string, any>;
    }): ProcessPaymentCallbackCommand;
}
