import { PaymentStrategy, PaymentRequest, RefundRequest } from './payment-strategy.interface';
import { GatewayResult, CreatePaymentData, QueryPaymentData, CallbackData, RefundData } from '../common/gateway-result';
export declare class AlipayStrategy extends PaymentStrategy {
    createPayment(request: PaymentRequest): Promise<GatewayResult<CreatePaymentData>>;
    queryPayment(paymentId: string): Promise<GatewayResult<QueryPaymentData>>;
    handleCallback(data: any): Promise<GatewayResult<CallbackData>>;
    refund(request: RefundRequest): Promise<GatewayResult<RefundData>>;
    validateCallback(data: any): boolean;
}
