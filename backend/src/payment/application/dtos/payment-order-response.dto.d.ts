export declare class PaymentOrderResponseDto {
    paymentOrderId: string;
    merchantOrderId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    status: string;
    paymentUrl?: string;
    qrCode?: string;
    expireTime?: string;
    createdAt: string;
    gatewayOrderId?: string;
    paymentInstructions?: string;
    extraInfo?: Record<string, any>;
}
