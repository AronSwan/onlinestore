export type GatewayResult<T> = {
    success: boolean;
    data?: T;
    message?: string;
};
export declare const isSuccessResponse: <T>(r: GatewayResult<T>) => r is {
    success: true;
    data: T;
};
export interface CreatePaymentData {
    paymentId: string;
    redirectUrl?: string;
    qrCode?: string;
    deepLink?: string;
    cryptoAddress?: string;
    thirdPartyTransactionId?: string;
    expiredAt?: Date;
}
export interface QueryPaymentData {
    status: string;
    thirdPartyTransactionId?: string;
    blockchainTxHash?: string;
    paidAt?: Date;
    amount?: number;
}
export interface CallbackData {
    paymentId: string;
    status: string;
    amount?: number;
    thirdPartyTransactionId?: string;
    blockchainTxHash?: string;
    paidAt?: Date;
    message?: string;
    raw?: unknown;
}
export interface RefundData {
    refundId: string;
    status?: 'SUCCESS' | 'FAILED';
    message?: string;
}
