import { Injectable } from '@nestjs/common';
import { PaymentOrderRepository } from '../../domain/repositories/payment-order.repository';
import { PaymentOrderId } from '../../domain/value-objects/payment-order-id.value-object';
import { PaymentOrderAggregate } from '../../domain/aggregates/payment-order.aggregate';

/**
 * 模拟支付订单仓储实现
 * 在实际项目中应该替换为真实的数据库实现
 */
@Injectable()
export class MockPaymentOrderRepository implements PaymentOrderRepository {
  private orders: Map<string, PaymentOrderAggregate> = new Map();

  async findById(id: PaymentOrderId): Promise<PaymentOrderAggregate | null> {
    return this.orders.get(id.value) || null;
  }

  async findByIds(ids: PaymentOrderId[]): Promise<PaymentOrderAggregate[]> {
    const results: PaymentOrderAggregate[] = [];
    for (const id of ids) {
      const order = this.orders.get(id.value);
      if (order) {
        results.push(order);
      }
    }
    return results;
  }

  async findByMerchantOrderId(merchantOrderId: string): Promise<PaymentOrderAggregate[]> {
    const results: PaymentOrderAggregate[] = [];
    for (const order of this.orders.values()) {
      if (order.merchantOrderId === merchantOrderId) {
        results.push(order);
      }
    }
    return results;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<PaymentOrderAggregate | null> {
    // 在实际实现中，应该根据幂等性键查找
    return null;
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    orders: PaymentOrderAggregate[];
    total: number;
  }> {
    const userOrders: PaymentOrderAggregate[] = [];
    for (const order of this.orders.values()) {
      if (order.userId === userId) {
        userOrders.push(order);
      }
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedOrders = userOrders.slice(start, end);

    return {
      orders: paginatedOrders,
      total: userOrders.length,
    };
  }

  async save(paymentOrder: PaymentOrderAggregate): Promise<void> {
    this.orders.set(paymentOrder.id.value, paymentOrder);
  }

  async getStatistics(
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
  }> {
    // 模拟统计数据
    return {
      totalAmount: 10000,
      totalCount: 100,
      successCount: 95,
      failedCount: 5,
      methodStats: [
        { method: 'ALIPAY', count: 50, amount: 5000 },
        { method: 'WECHAT', count: 30, amount: 3000 },
        { method: 'USDT_TRC20', count: 20, amount: 2000 },
      ],
    };
  }
}
