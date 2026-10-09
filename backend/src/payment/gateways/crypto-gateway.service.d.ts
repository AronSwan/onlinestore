import { ConfigService } from '@nestjs/config';
export interface CryptoPaymentRequest {
    orderId: string;
    amount: number;
    currency: string;
    network: string;
    userId: number;
    expireMinutes?: number;
    metadata?: Record<string, unknown>;
}
export interface CryptoPaymentResponse {
    success: boolean;
    paymentId?: string;
    address?: string;
    amount?: number;
    qrCode?: string;
    expiredAt?: Date;
    message?: string;
}
export interface CryptoQueryResponse {
    success: boolean;
    status: string;
    txHash?: string;
    confirmations?: number;
    paidAt?: Date;
    actualAmount?: number;
    message?: string;
}
export declare class CryptoGatewayService {
    private configService;
    private readonly logger;
    private readonly httpClient;
    private readonly baseUrl;
    private readonly apiKey?;
    private readonly apiSecret?;
    constructor(configService: ConfigService);
    createPayment(request: CryptoPaymentRequest): Promise<CryptoPaymentResponse>;
    queryPayment(paymentId: string): Promise<CryptoQueryResponse>;
    getAddressBalance(address: string, currency: string, network: string): Promise<number>;
    validateTransaction(txHash: string, currency: string, network: string): Promise<boolean>;
    validateCallback(data: Record<string, unknown>, signature: string): boolean;
    private generateSignature;
    private generateCallbackSignature;
}
