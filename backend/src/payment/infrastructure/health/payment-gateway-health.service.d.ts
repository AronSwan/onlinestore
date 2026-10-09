export declare class PaymentGatewayHealthService {
    check(): Promise<{
        status: string;
        details?: any;
    }>;
}
