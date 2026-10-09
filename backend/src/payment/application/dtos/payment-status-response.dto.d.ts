export declare class RefundInfoDto {
    refundId: string;
    amount: number;
    currency: string;
    status: string;
    reason?: string;
    createdAt: string;
    completedAt?: string;
    gatewayRefundId?: string;
}
export declare class PaymentStatusResponseDto {
    paymentOrderId: string;
    merchantOrderId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    status: string;
    paidAmount?: number;
    paidAt?: string;
    failureReason?: string;
    gatewayOrderId?: string;
    createdAt: string;
    updatedAt: string;
    expireTime?: string;
    closedAt?: string;
    refunds?: RefundInfoDto[];
    paymentDetails?: Record<string, any>;
    blockchainInfo?: Record<string, any>;
    riskInfo?: Record<string, any>;
}
