import { PaymentOrderId } from '../value-objects/payment-order-id.value-object';
export interface PaymentOrderRepository {
    findById(id: PaymentOrderId): Promise<import('../aggregates/payment-order.aggregate').PaymentOrderAggregate | null>;
    findByIds(ids: PaymentOrderId[]): Promise<import('../aggregates/payment-order.aggregate').PaymentOrderAggregate[]>;
    findByMerchantOrderId(merchantOrderId: string): Promise<import('../aggregates/payment-order.aggregate').PaymentOrderAggregate[]>;
    findByIdempotencyKey(idempotencyKey: string): Promise<import('../aggregates/payment-order.aggregate').PaymentOrderAggregate | null>;
    findByUserId(userId: string, page: number, limit: number): Promise<{
        orders: any[];
        total: number;
    }>;
    save(paymentOrder: import('../aggregates/payment-order.aggregate').PaymentOrderAggregate): Promise<void>;
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
}
