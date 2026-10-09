import { PaymentStrategy } from '../../strategies/payment-strategy.interface';
import { Money } from '../../domain/value-objects/money.value-object';
import { PaymentGateway } from '../../domain/services/payment-gateway.factory';
export declare class StrategyGatewayAdapter implements PaymentGateway {
    private readonly strategy;
    private readonly methodKey;
    private readonly logger;
    constructor(strategy: PaymentStrategy, methodKey: string);
    createPayment(params: {
        paymentOrderId: string;
        merchantOrderId: string;
        amount: Money;
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
        data: any;
        timestamp?: string;
    }): Promise<boolean>;
    private static readonly SUCCESS_STATES;
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
        refundAmount: Money;
        reason: string;
    }): Promise<{
        gatewayRefundId: string;
    }>;
    closePayment(params: {
        paymentOrderId: string;
        gatewayOrderId: string;
    }): Promise<void>;
}
