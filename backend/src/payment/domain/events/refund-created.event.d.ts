export declare class RefundCreatedEvent {
    readonly refundId: string;
    readonly paymentOrderId: string;
    readonly merchantOrderId: string;
    readonly refundAmount: number;
    readonly currency: string;
    readonly reason: string;
    readonly operatorId: string;
    readonly timestamp: Date;
    constructor(refundId: string, paymentOrderId: string, merchantOrderId: string, refundAmount: number, currency: string, reason: string, operatorId: string, timestamp?: Date);
}
