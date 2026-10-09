import { PaymentOrderId } from '../../domain/value-objects/payment-order-id.value-object';
import { Money } from '../../domain/value-objects/money.value-object';
export declare class CreateRefundCommand {
    readonly paymentOrderId: PaymentOrderId;
    readonly refundAmount: Money;
    readonly reason: string;
    readonly operatorId: string;
    readonly description?: string | undefined;
    constructor(paymentOrderId: PaymentOrderId, refundAmount: Money, reason: string, operatorId: string, description?: string | undefined);
    static create(params: {
        paymentOrderId: PaymentOrderId;
        refundAmount: Money;
        reason: string;
        operatorId: string;
        description?: string;
    }): CreateRefundCommand;
}
