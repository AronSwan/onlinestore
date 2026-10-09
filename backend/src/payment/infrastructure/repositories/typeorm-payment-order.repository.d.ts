import { Repository } from 'typeorm';
import { Payment } from '../../entities/payment.entity';
import { PaymentOrderAggregate } from '../../domain/aggregates/payment-order.aggregate';
import { PaymentOrderId } from '../../domain/value-objects/payment-order-id.value-object';
import { PaymentOrderRepository } from '../../domain/repositories/payment-order.repository';
export declare class TypeOrmPaymentOrderRepository implements PaymentOrderRepository {
    private readonly repository;
    constructor(repository: Repository<Payment>);
    findById(id: PaymentOrderId): Promise<PaymentOrderAggregate | null>;
    findByIds(ids: PaymentOrderId[]): Promise<PaymentOrderAggregate[]>;
    findByMerchantOrderId(merchantOrderId: string): Promise<PaymentOrderAggregate[]>;
    findByIdempotencyKey(idempotencyKey: string): Promise<PaymentOrderAggregate | null>;
    findByUserId(userId: string, page: number, limit: number): Promise<{
        orders: PaymentOrderAggregate[];
        total: number;
    }>;
    save(paymentOrder: PaymentOrderAggregate): Promise<void>;
    getStatistics(startDate: Date, endDate: Date): Promise<{
        totalAmount: number;
        totalCount: number;
        successCount: number;
        failedCount: number;
        methodStats: Array<{
            method: string;
            count: number;
            amount: number;
        }>;
    }>;
    private toAggregate;
    private toNumericUserId;
    private statusToEntity;
    private statusToDomain;
    private methodToEntity;
    private methodToDomain;
}
