import { Money } from '../../domain/value-objects/money.value-object';
import { PaymentMethod } from '../../domain/value-objects/payment-method.value-object';
export declare class CreatePaymentOrderCommand {
    readonly merchantOrderId: string;
    readonly amount: Money;
    readonly paymentMethod: PaymentMethod;
    readonly subject: string;
    readonly userId: string;
    readonly clientIp: string;
    readonly userAgent: string;
    readonly description?: string | undefined;
    readonly idempotencyKey?: string | undefined;
    readonly notifyUrl?: string | undefined;
    readonly returnUrl?: string | undefined;
    readonly expireTime?: Date | undefined;
    readonly extraParams?: Record<string, any> | undefined;
    constructor(merchantOrderId: string, amount: Money, paymentMethod: PaymentMethod, subject: string, userId: string, clientIp: string, userAgent: string, description?: string | undefined, idempotencyKey?: string | undefined, notifyUrl?: string | undefined, returnUrl?: string | undefined, expireTime?: Date | undefined, extraParams?: Record<string, any> | undefined);
    static create(params: {
        merchantOrderId: string;
        amount: Money;
        paymentMethod: PaymentMethod;
        subject?: string;
        description?: string;
        userId: string;
        clientIp: string;
        userAgent: string;
        idempotencyKey?: string;
        notifyUrl?: string;
        returnUrl?: string;
        expireTime?: Date;
        extraParams?: Record<string, any>;
    }): CreatePaymentOrderCommand;
}
