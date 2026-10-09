export declare class PaymentOrderCreatedEvent {
    readonly paymentOrderId: string;
    readonly merchantOrderId: string;
    readonly amount: number;
    readonly currency: string;
    readonly paymentMethod: string;
    readonly userId: string;
    readonly timestamp: Date;
    constructor(paymentOrderId: string, merchantOrderId: string, amount: number, currency: string, paymentMethod: string, userId: string, timestamp?: Date);
}
