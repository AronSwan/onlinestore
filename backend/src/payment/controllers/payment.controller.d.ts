import { Request } from 'express';
import { PaymentApplicationService } from '../application/services/payment-application.service';
import { PaymentQueryService } from '../application/services/payment-query.service';
import { CreatePaymentOrderDto } from '../application/dtos/create-payment-order.dto';
import { PaymentCallbackDto } from '../application/dtos/payment-callback.dto';
import { RefundPaymentDto } from '../application/dtos/refund-payment.dto';
import { QueryPaymentDto } from '../application/dtos/query-payment.dto';
import { PaymentOrderResponseDto } from '../application/dtos/payment-order-response.dto';
import { PaymentStatusResponseDto } from '../application/dtos/payment-status-response.dto';
import { PaymentMethodsResponseDto } from '../application/dtos/payment-methods-response.dto';
export declare class PaymentController {
    private readonly paymentApplicationService;
    private readonly paymentQueryService;
    private readonly logger;
    constructor(paymentApplicationService: PaymentApplicationService, paymentQueryService: PaymentQueryService);
    createPaymentOrder(createOrderDto: CreatePaymentOrderDto, idempotencyKey?: string, clientIp?: string, userAgent?: string, req?: Request): Promise<PaymentOrderResponseDto>;
    getPaymentOrderStatus(paymentOrderId: string): Promise<PaymentStatusResponseDto>;
    batchQueryPaymentStatus(queryDto: QueryPaymentDto): Promise<PaymentStatusResponseDto[]>;
    handlePaymentCallback(paymentMethodStr: string, callbackData: PaymentCallbackDto, signature?: string, timestamp?: string, req?: Request): Promise<{
        code: string;
        message: string;
    }>;
    createRefund(refundDto: RefundPaymentDto, req?: Request): Promise<{
        refundId: string;
        status: string;
        refundAmount: number;
    }>;
    getPaymentMethods(): Promise<PaymentMethodsResponseDto>;
    getMerchantOrderPayments(merchantOrderId: string): Promise<PaymentStatusResponseDto[]>;
    syncPaymentOrderStatus(paymentOrderId: string): Promise<PaymentStatusResponseDto>;
    closePaymentOrder(paymentOrderId: string, req?: Request): Promise<{
        paymentOrderId: string;
        status: string;
        closedAt: string;
    }>;
    healthCheck(): Promise<{
        checks: {
            database: string;
            redis: string;
            paymentGateways: string;
        };
        status: string;
        timestamp: string;
        service: string;
        version: string;
    }>;
}
