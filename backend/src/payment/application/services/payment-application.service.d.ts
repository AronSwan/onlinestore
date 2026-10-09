import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentOrderRepository } from '../../domain/repositories/payment-order.repository';
import { PaymentGatewayFactory } from '../../domain/services/payment-gateway.factory';
import { PaymentRiskService } from '../../domain/services/payment-risk.service';
import { PaymentOrderId } from '../../domain/value-objects/payment-order-id.value-object';
import { PaymentMethod } from '../../domain/value-objects/payment-method.value-object';
import { CreatePaymentOrderDto } from '../dtos/create-payment-order.dto';
import { PaymentCallbackDto } from '../dtos/payment-callback.dto';
import { RefundPaymentDto } from '../dtos/refund-payment.dto';
import { PaymentOrderResponseDto } from '../dtos/payment-order-response.dto';
import { PaymentStatusResponseDto } from '../dtos/payment-status-response.dto';
export interface PaymentCallbackContext {
    paymentMethod: PaymentMethod;
    signature?: string;
    timestamp?: string;
    clientIp?: string;
    userAgent?: string;
    rawBody?: unknown;
}
export interface PaymentRequestContext {
    userId?: number | string;
    idempotencyKey?: string;
    clientIp?: string;
    userAgent?: string;
    notifyUrl?: string;
    returnUrl?: string;
}
export interface PaymentRefundContext {
    userId?: number | string;
    operatorId?: string;
    reason?: string;
}
export declare class PaymentApplicationService {
    private readonly paymentOrderRepository;
    private readonly paymentGatewayFactory;
    private readonly paymentRiskService;
    private readonly eventEmitter;
    private readonly logger;
    constructor(paymentOrderRepository: PaymentOrderRepository, paymentGatewayFactory: PaymentGatewayFactory, paymentRiskService: PaymentRiskService, eventEmitter: EventEmitter2);
    createPaymentOrder(dto: CreatePaymentOrderDto, context: PaymentRequestContext): Promise<PaymentOrderResponseDto>;
    handlePaymentCallback(dto: PaymentCallbackDto, context: PaymentCallbackContext): Promise<{
        success: boolean;
        message?: string;
    }>;
    createRefund(dto: RefundPaymentDto, context: PaymentRefundContext): Promise<{
        refundId: string;
        status: string;
        refundAmount: number;
    }>;
    syncPaymentOrderStatus(paymentOrderId: PaymentOrderId): Promise<PaymentStatusResponseDto>;
    closePaymentOrder(paymentOrderId: PaymentOrderId, operatorId: string): Promise<{
        paymentOrderId: string;
        status: string;
        closedAt: string;
    }>;
    private toPaymentOrderResponse;
    private toPaymentStatusResponse;
}
