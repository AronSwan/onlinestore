export declare class PaymentSucceededEvent {
    readonly paymentOrderId: string;
    readonly merchantOrderId: string;
    readonly paidAmount: number;
    readonly currency: string;
    readonly gatewayOrderId: string;
    readonly timestamp: Date;
    constructor(paymentOrderId: string, merchantOrderId: string, paidAmount: number, currency: string, gatewayOrderId: string, timestamp?: Date);
}
