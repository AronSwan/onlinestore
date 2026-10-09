import { PaymentOrderId } from '../value-objects/payment-order-id.value-object';

/**
 * 支付订单仓储接口
 */
export interface PaymentOrderRepository {
  /**
   * 根据ID查找支付订单
   */
  findById(id: PaymentOrderId): Promise<import('../aggregates/payment-order.aggregate').PaymentOrderAggregate | null>;

  /**
   * 根据ID列表查找支付订单
   */
  findByIds(ids: PaymentOrderId[]): Promise<import('../aggregates/payment-order.aggregate').PaymentOrderAggregate[]>;

  /**
   * 根据商户订单ID查找支付订单
   */
  findByMerchantOrderId(merchantOrderId: string): Promise<import('../aggregates/payment-order.aggregate').PaymentOrderAggregate[]>;

  /**
   * 根据幂等性键查找支付订单
   */
  findByIdempotencyKey(idempotencyKey: string): Promise<import('../aggregates/payment-order.aggregate').PaymentOrderAggregate | null>;

  /**
   * 根据用户ID查找支付订单
   */
  findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    orders: any[];
    total: number;
  }>;

  /**
   * 保存支付订单
   */
  save(paymentOrder: import('../aggregates/payment-order.aggregate').PaymentOrderAggregate): Promise<void>;

  /**
   * 获取统计信息
   */
  getStatistics(
    startDate: Date,
    endDate: Date,
  ): Promise<{
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
