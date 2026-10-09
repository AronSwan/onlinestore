import { PaymentStrategy } from '../../strategies/payment-strategy.interface';
import { PaymentMethod } from '../value-objects/payment-method.value-object';
export interface PaymentGateway {
    createPayment(params: {
        paymentOrderId: string;
        merchantOrderId: string;
        amount: import('../value-objects/money.value-object').Money;
        subject: string;
        description: string;
        notifyUrl?: string;
        returnUrl?: string;
        expireTime?: Date;
        extraParams?: Record<string, any>;
    }): Promise<{
        gatewayOrderId: string;
        paymentUrl?: string;
        qrCode?: string;
    }>;
    verifyCallback(params: {
        signature?: string;
        data: Record<string, unknown>;
        timestamp?: string;
    }): Promise<boolean>;
    isPaymentSuccess(tradeStatus: string): boolean;
    getFailureReason(tradeStatus: string): string;
    queryPaymentStatus(params: {
        paymentOrderId: string;
        gatewayOrderId: string;
    }): Promise<{
        isSuccess: boolean;
        gatewayOrderId: string;
        paidAmount: number;
        paidAt?: Date;
    }>;
    createRefund(params: {
        paymentOrderId: string;
        gatewayOrderId: string;
        refundId: string;
        refundAmount: import('../value-objects/money.value-object').Money;
        reason: string;
    }): Promise<{
        gatewayRefundId: string;
    }>;
    closePayment(params: {
        paymentOrderId: string;
        gatewayOrderId: string;
    }): Promise<void>;
}
export declare class PaymentGatewayFactory {
    private readonly strategies;
    constructor(strategies: Map<string, PaymentStrategy>);
    createGateway(paymentMethod: PaymentMethod): PaymentGateway;
}
