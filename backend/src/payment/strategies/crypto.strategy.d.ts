import { PaymentStrategy, PaymentRequest, RefundRequest } from './payment-strategy.interface';
import { GatewayResult, CreatePaymentData, QueryPaymentData, CallbackData, RefundData } from '../common/gateway-result';
import { CryptoGatewayService } from '../gateways/crypto-gateway.service';
import { PaymentMethod } from '../entities/payment.entity';
export declare class CryptoStrategy extends PaymentStrategy {
    private readonly cryptoGateway;
    private readonly method;
    private readonly logger;
    constructor(cryptoGateway: CryptoGatewayService, method: PaymentMethod);
    createPayment(request: PaymentRequest): Promise<GatewayResult<CreatePaymentData>>;
    queryPayment(paymentId: string): Promise<GatewayResult<QueryPaymentData>>;
    handleCallback(data: Record<string, unknown>): Promise<GatewayResult<CallbackData>>;
    refund(request: RefundRequest): Promise<GatewayResult<RefundData>>;
    validateCallback(data: Record<string, unknown>): boolean;
    private parseCryptoMethod;
    private mapStatus;
}
