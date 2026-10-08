import { Injectable, Logger, Inject } from '@nestjs/common';

// Domain
import { PaymentOrderRepository } from '../../domain/repositories/payment-order.repository';
import { PaymentOrderId } from '../../domain/value-objects/payment-order-id.value-object';
import { PaymentMethod } from '../../domain/value-objects/payment-method.value-object';

// DTOs
import { PaymentStatusResponseDto } from '../dtos/payment-status-response.dto';
import { PaymentMethodsResponseDto } from '../dtos/payment-methods-response.dto';

// Infrastructure
import { DatabaseHealthService } from '../../infrastructure/health/database-health.service';
import { RedisHealthService } from '../../infrastructure/health/redis-health.service';
import { PaymentGatewayHealthService } from '../../infrastructure/health/payment-gateway-health.service';

/**
 * 支付查询服务
 * 负责处理所有查询相关的业务逻辑
 */
@Injectable()
export class PaymentQueryService {
  private readonly logger = new Logger(PaymentQueryService.name);

  constructor(
    @Inject('PaymentOrderRepository')
    private readonly paymentOrderRepository: PaymentOrderRepository,
    private readonly databaseHealthService: DatabaseHealthService,
    private readonly redisHealthService: RedisHealthService,
    private readonly paymentGatewayHealthService: PaymentGatewayHealthService,
  ) {}

  /**
   * 获取支付订单状态
   */
  async getPaymentOrderStatus(paymentOrderId: PaymentOrderId): Promise<PaymentStatusResponseDto> {
    this.logger.log(`查询支付订单状态: ${paymentOrderId.value}`);

    const paymentOrder = await this.paymentOrderRepository.findById(paymentOrderId);
    if (!paymentOrder) {
      throw new Error('支付订单不存在');
    }

    return this.toPaymentStatusResponse(paymentOrder);
  }

  /**
   * 批量查询支付订单状态
   */
  async batchQueryPaymentStatus(
    paymentOrderIds: PaymentOrderId[],
  ): Promise<PaymentStatusResponseDto[]> {
    this.logger.log(`批量查询支付状态: ${paymentOrderIds.length}个订单`);

    const paymentOrders = await this.paymentOrderRepository.findByIds(paymentOrderIds);

    return paymentOrders.map(order => this.toPaymentStatusResponse(order));
  }

  /**
   * 根据商户订单ID查询支付记录
   */
  async getPaymentsByMerchantOrderId(merchantOrderId: string): Promise<PaymentStatusResponseDto[]> {
    this.logger.log(`查询商户订单支付记录: ${merchantOrderId}`);

    const paymentOrders = await this.paymentOrderRepository.findByMerchantOrderId(merchantOrderId);

    return paymentOrders.map(order => this.toPaymentStatusResponse(order));
  }

  /**
   * 获取可用的支付方式
   */
  async getAvailablePaymentMethods(): Promise<PaymentMethodsResponseDto> {
    this.logger.log('获取可用支付方式');

    // 这里可以根据配置、地区、用户等级等因素动态返回可用的支付方式
    return {
      traditional: [
        {
          method: PaymentMethod.ALIPAY.value,
          name: '支付宝',
          icon: 'alipay',
          enabled: true,
          description: '支持支付宝扫码支付',
          fees: {
            rate: 0.006, // 0.6%
            min: 0.01,
            max: undefined,
          },
        },
        {
          method: PaymentMethod.WECHAT.value,
          name: '微信支付',
          icon: 'wechat',
          enabled: true,
          description: '支持微信扫码支付',
          fees: {
            rate: 0.006, // 0.6%
            min: 0.01,
            max: undefined,
          },
        },
        {
          method: PaymentMethod.UNIONPAY.value,
          name: '银联支付',
          icon: 'unionpay',
          enabled: true,
          description: '支持银联卡支付',
          fees: {
            rate: 0.005, // 0.5%
            min: 0.01,
            max: undefined,
          },
        },
        {
          method: PaymentMethod.CREDIT_CARD.value,
          name: '信用卡',
          icon: 'credit-card',
          enabled: true,
          description: '支持Visa、MasterCard等国际信用卡',
          fees: {
            rate: 0.029, // 2.9%
            min: 0.3,
            max: undefined,
          },
        },
        {
          method: PaymentMethod.BANK_TRANSFER.value,
          name: '银行转账',
          icon: 'bank',
          enabled: false,
          description: '银行转账支付（暂不可用）',
          fees: {
            rate: 0.001, // 0.1%
            min: 1.0,
            max: 50.0,
          },
        },
      ],
      crypto: [
        {
          method: PaymentMethod.USDT_TRC20.value,
          name: 'USDT (TRC20)',
          icon: 'usdt',
          network: 'TRC20',
          enabled: true,
          description: '基于波场网络的USDT支付',
          fees: {
            rate: 0.01, // 1%
            min: 1.0,
            max: undefined,
          },
          contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        },
        {
          method: PaymentMethod.USDT_ERC20.value,
          name: 'USDT (ERC20)',
          icon: 'usdt',
          network: 'ERC20',
          enabled: true,
          description: '基于以太坊网络的USDT支付',
          fees: {
            rate: 0.01, // 1%
            min: 5.0, // 考虑到ETH网络费用较高
            max: undefined,
          },
          contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        },
        {
          method: PaymentMethod.USDT_BEP20.value,
          name: 'USDT (BEP20)',
          icon: 'usdt',
          network: 'BEP20',
          enabled: true,
          description: '基于币安智能链的USDT支付',
          fees: {
            rate: 0.01, // 1%
            min: 1.0,
            max: undefined,
          },
          contractAddress: '0x55d398326f99059fF775485246999027B3197955',
        },
        {
          method: PaymentMethod.BTC.value,
          name: 'Bitcoin',
          icon: 'btc',
          network: 'BTC',
          enabled: false,
          description: '比特币支付（暂不可用）',
          fees: {
            rate: 0.015, // 1.5%
            min: 10.0,
            max: undefined,
          },
        },
        {
          method: PaymentMethod.ETH.value,
          name: 'Ethereum',
          icon: 'eth',
          network: 'ETH',
          enabled: false,
          description: '以太坊支付（暂不可用）',
          fees: {
            rate: 0.015, // 1.5%
            min: 10.0,
            max: undefined,
          },
        },
      ],
    };
  }

  /**
   * 获取健康状态
   */
  async getHealthStatus(): Promise<{
    checks: {
      database: string;
      redis: string;
      paymentGateways: string;
    };
  }> {
    this.logger.log('检查支付服务健康状态');

    const [databaseHealth, redisHealth, gatewayHealth] = await Promise.allSettled([
      this.databaseHealthService.check(),
      this.redisHealthService.check(),
      this.paymentGatewayHealthService.check(),
    ]);

    return {
      checks: {
        database: databaseHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy',
        redis: redisHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy',
        paymentGateways: gatewayHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      },
    };
  }

  /**
   * 根据用户ID查询支付历史
   */
  async getPaymentHistoryByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: PaymentStatusResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.logger.log(`查询用户支付历史: ${userId}, page: ${page}, limit: ${limit}`);

    const { orders, total } = await this.paymentOrderRepository.findByUserId(userId, page, limit);

    return {
      data: orders.map(order => this.toPaymentStatusResponse(order)),
      total,
      page,
      limit,
    };
  }

  /**
   * 获取支付统计信息
   */
  async getPaymentStatistics(
    startDate: Date,
    endDate: Date,
  ): Promise<{
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
  }> {
    this.logger.log(`获取支付统计: ${startDate.toISOString()} - ${endDate.toISOString()}`);

    const stats = await this.paymentOrderRepository.getStatistics(startDate, endDate);

    return {
      totalAmount: stats.totalAmount,
      totalCount: stats.totalCount,
      successCount: stats.successCount,
      failedCount: stats.failedCount,
      successRate: stats.totalCount > 0 ? stats.successCount / stats.totalCount : 0,
      methodStats: stats.methodStats,
    };
  }

  /**
   * 转换为支付状态响应DTO
   */
  private toPaymentStatusResponse(paymentOrder: any): PaymentStatusResponseDto {
    return {
      paymentOrderId: paymentOrder.id.value,
      merchantOrderId: paymentOrder.merchantOrderId,
      amount: paymentOrder.amount.amount,
      currency: paymentOrder.amount.currency,
      paymentMethod: paymentOrder.paymentMethod.value,
      status: paymentOrder.status.value,
      paidAmount: paymentOrder.paidAmount?.amount,
      paidAt: paymentOrder.paidAt?.toISOString(),
      failureReason: paymentOrder.failureReason,
      gatewayOrderId: paymentOrder.gatewayOrderId,
      createdAt: paymentOrder.createdAt.toISOString(),
      updatedAt: paymentOrder.updatedAt.toISOString(),
      refunds:
        paymentOrder.refunds?.map((refund: any) => ({
          refundId: refund.id.value,
          amount: refund.amount.amount,
          currency: refund.amount.currency,
          status: refund.status.value,
          reason: refund.reason,
          createdAt: refund.createdAt.toISOString(),
        })) || [],
    };
  }
}
