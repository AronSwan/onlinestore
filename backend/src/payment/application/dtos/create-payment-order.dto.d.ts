export declare class CreatePaymentOrderDto {
    merchantOrderId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    subject?: string;
    description?: string;
    userId?: string;
    notifyUrl?: string;
    returnUrl?: string;
    expireTime?: string;
    extraParams?: Record<string, any>;
}
