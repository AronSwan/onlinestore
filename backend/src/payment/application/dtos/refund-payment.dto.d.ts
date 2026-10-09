export declare class RefundPaymentDto {
    paymentOrderId: string;
    refundAmount: number;
    currency: string;
    reason: string;
    description?: string;
    operatorId?: string;
}
