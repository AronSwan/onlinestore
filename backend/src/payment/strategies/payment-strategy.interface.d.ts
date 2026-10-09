export interface PaymentRequest {
    orderId: string;
    amount: number;
    currency: string;
    userId: number;
    metadata?: Record<string, unknown>;
    returnUrl?: string;
    notifyUrl?: string;
    expireMinutes?: number;
}
import { GatewayResult, CreatePaymentData, QueryPaymentData, CallbackData, RefundData } from '../common/gateway-result';
export interface RefundRequest {
    paymentId: string;
    amount: number;
    reason?: string;
    metadata?: Record<string, unknown>;
}
export declare abstract class PaymentStrategy {
    abstract createPayment(request: PaymentRequest): Promise<GatewayResult<CreatePaymentData>>;
    abstract queryPayment(paymentId: string): Promise<GatewayResult<QueryPaymentData>>;
    abstract handleCallback(data: Record<string, unknown>): Promise<GatewayResult<CallbackData>>;
    abstract refund(request: RefundRequest): Promise<GatewayResult<RefundData>>;
    abstract validateCallback(data: Record<string, unknown>): boolean;
    protected verifyCallbackSignature(data: Record<string, unknown>): boolean;
}
