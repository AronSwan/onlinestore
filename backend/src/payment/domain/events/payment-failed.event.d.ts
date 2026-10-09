export declare class PaymentFailedEvent {
    readonly paymentOrderId: string;
    readonly merchantOrderId: string;
    readonly failureReason: string;
    readonly timestamp: Date;
    constructor(paymentOrderId: string, merchantOrderId: string, failureReason: string, timestamp?: Date);
}
