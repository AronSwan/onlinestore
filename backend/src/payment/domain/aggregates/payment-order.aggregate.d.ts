import { PaymentOrderId } from '../value-objects/payment-order-id.value-object';
import { Money } from '../value-objects/money.value-object';
import { PaymentMethod } from '../value-objects/payment-method.value-object';
import { CreatePaymentOrderCommand } from '../../application/commands/create-payment-order.command';
export declare enum PaymentStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    SUCCEEDED = "SUCCEEDED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED",
    EXPIRED = "EXPIRED",
    CLOSED = "CLOSED"
}
export declare enum RefundStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    SUCCEEDED = "SUCCEEDED",
    FAILED = "FAILED"
}
export declare class RefundAggregate {
    readonly id: PaymentOrderId;
    readonly amount: Money;
    readonly reason: string;
    readonly operatorId: string;
    readonly status: RefundStatus;
    readonly createdAt: Date;
    gatewayRefundId?: string | undefined;
    completedAt?: Date | undefined;
    constructor(id: PaymentOrderId, amount: Money, reason: string, operatorId: string, status?: RefundStatus, createdAt?: Date, gatewayRefundId?: string | undefined, completedAt?: Date | undefined);
    updateGatewayInfo(gatewayRefundId: string): void;
    markAsSucceeded(): void;
    markAsFailed(): void;
}
export declare class PaymentOrderAggregate {
    readonly id: PaymentOrderId;
    readonly merchantOrderId: string;
    readonly amount: Money;
    readonly paymentMethod: PaymentMethod;
    readonly subject: string;
    readonly userId: string;
    readonly status: PaymentStatus;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly description?: string | undefined;
    paymentUrl?: string | undefined;
    qrCode?: string | undefined;
    gatewayOrderId?: string | undefined;
    paidAmount?: Money | undefined;
    paidAt?: Date | undefined;
    failureReason?: string | undefined;
    expireTime?: Date | undefined;
    closedAt?: Date | undefined;
    refunds: RefundAggregate[];
    private uncommittedEvents;
    constructor(id: PaymentOrderId, merchantOrderId: string, amount: Money, paymentMethod: PaymentMethod, subject: string, userId: string, status?: PaymentStatus, createdAt?: Date, updatedAt?: Date, description?: string | undefined, paymentUrl?: string | undefined, qrCode?: string | undefined, gatewayOrderId?: string | undefined, paidAmount?: Money | undefined, paidAt?: Date | undefined, failureReason?: string | undefined, expireTime?: Date | undefined, closedAt?: Date | undefined, refunds?: RefundAggregate[]);
    static create(command: CreatePaymentOrderCommand): PaymentOrderAggregate;
    updateGatewayInfo(gatewayOrderId: string, paymentUrl?: string, qrCode?: string): void;
    markAsSucceeded(gatewayOrderId: string, paidAmount: Money, paidAt?: Date): void;
    markAsFailed(failureReason: string): void;
    close(operatorId: string): void;
    createRefund(refundAmount: Money, reason: string, operatorId: string): RefundAggregate;
    isSucceeded(): boolean;
    getUncommittedEvents(): unknown[];
    clearUncommittedEvents(): void;
}
