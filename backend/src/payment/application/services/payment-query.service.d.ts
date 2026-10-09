import { PaymentOrderRepository } from '../../domain/repositories/payment-order.repository';
import { PaymentOrderId } from '../../domain/value-objects/payment-order-id.value-object';
import { PaymentStatusResponseDto } from '../dtos/payment-status-response.dto';
import { PaymentMethodsResponseDto } from '../dtos/payment-methods-response.dto';
import { DatabaseHealthService } from '../../infrastructure/health/database-health.service';
import { RedisHealthService } from '../../infrastructure/health/redis-health.service';
import { PaymentGatewayHealthService } from '../../infrastructure/health/payment-gateway-health.service';
export declare class PaymentQueryService {
    private readonly paymentOrderRepository;
    private readonly databaseHealthService;
    private readonly redisHealthService;
    private readonly paymentGatewayHealthService;
    private readonly logger;
    constructor(paymentOrderRepository: PaymentOrderRepository, databaseHealthService: DatabaseHealthService, redisHealthService: RedisHealthService, paymentGatewayHealthService: PaymentGatewayHealthService);
    getPaymentOrderStatus(paymentOrderId: PaymentOrderId): Promise<PaymentStatusResponseDto>;
    batchQueryPaymentStatus(paymentOrderIds: PaymentOrderId[]): Promise<PaymentStatusResponseDto[]>;
    getPaymentsByMerchantOrderId(merchantOrderId: string): Promise<PaymentStatusResponseDto[]>;
    getAvailablePaymentMethods(): Promise<PaymentMethodsResponseDto>;
    getHealthStatus(): Promise<{
        checks: {
            database: string;
            redis: string;
            paymentGateways: string;
        };
    }>;
    getPaymentHistoryByUserId(userId: string, page?: number, limit?: number): Promise<{
        data: PaymentStatusResponseDto[];
        total: number;
        page: number;
        limit: number;
    }>;
    getPaymentStatistics(startDate: Date, endDate: Date): Promise<{
        totalAmount: number;
        totalCount: number;
        successCount: number;
        failedCount: number;
        successRate: number;
        methodStats: Array<{
            method: string;
            count: number;
            amount: number;
        }>;
    }>;
    private toPaymentStatusResponse;
}
