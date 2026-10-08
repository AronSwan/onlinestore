import { Injectable, Inject } from '@nestjs/common';
import { PaymentStrategy } from '../../strategies/payment-strategy.interface';
import { StrategyGatewayAdapter } from '../../infrastructure/gateways/strategy-gateway.adapter';
import { PaymentMethod } from '../value-objects/payment-method.value-object';

/**
 * 支付网关接口
 */
export interface PaymentGateway {
  /**
   * 创建支付
   */
  createPayment(params: {
    paymentOrderId: string;
    merchantOrderId: string;
    amount: any;
    subject: string;
    description: string;
    notifyUrl?: string;
    returnUrl?: string;
    expireTime?: Date;
    extraParams?: Record<string, any>;
  }): Promise<{
    gatewayOrderId: string;
    paymentUrl?: string;
    qrCode?: string;
  }>;

  /**
   * 验证回调
   */
  verifyCallback(params: { signature?: string; data: any; timestamp?: string }): Promise<boolean>;

  /**
   * 判断支付是否成功
   */
  isPaymentSuccess(tradeStatus: string): boolean;

  /**
   * 获取失败原因
   */
  getFailureReason(tradeStatus: string): string;

  /**
   * 查询支付状态
   */
  queryPaymentStatus(params: { paymentOrderId: string; gatewayOrderId: string }): Promise<{
    isSuccess: boolean;
    gatewayOrderId: string;
    paidAmount: number;
    paidAt?: Date;
  }>;

  /**
   * 创建退款
   */
  createRefund(params: {
    paymentOrderId: string;
    gatewayOrderId: string;
    refundId: string;
    refundAmount: any;
    reason: string;
  }): Promise<{
    gatewayRefundId: string;
  }>;

  /**
   * 关闭支付
   */
  closePayment(params: { paymentOrderId: string; gatewayOrderId: string }): Promise<void>;
}

/**
 * 支付网关工厂
 */
@Injectable()
export class PaymentGatewayFactory {
  constructor(
    @Inject('PAYMENT_STRATEGIES')
    private readonly strategies: Map<string, PaymentStrategy>,
  ) {}

  /**
   * 创建支付网关实例——按支付方式路由到真策略（fail-closed 验签所在地）。
   * 定调会施工批（2026-10-09）：原实现无条件返回 MockPaymentGateway
   * （verifyCallback 恒真）——mock-on-mock 接线修复，miss 即抛错不回退。
   */
  createGateway(paymentMethod: PaymentMethod): PaymentGateway {
    const key = String((paymentMethod as any)?.value ?? paymentMethod).toLowerCase();
    const strategy = this.strategies.get(key);
    if (!strategy) {
      throw new Error(`不支持的支付方式（fail-closed，无 mock 回退）: ${key}`);
    }
    return new StrategyGatewayAdapter(strategy, key);
  }
}

/**
 * 模拟支付网关实现
 */
class MockPaymentGateway implements PaymentGateway {
  async createPayment(params: any): Promise<any> {
    return {
      gatewayOrderId: `GATEWAY_${Date.now()}`,
      paymentUrl: 'https://example.com/pay',
      qrCode: 'data:image/png;base64,mock-qr-code',
    };
  }

  async verifyCallback(params: any): Promise<boolean> {
    return true;
  }

  isPaymentSuccess(tradeStatus: string): boolean {
    return ['TRADE_SUCCESS', 'TRADE_FINISHED', 'SUCCESS'].includes(tradeStatus);
  }

  getFailureReason(tradeStatus: string): string {
    return `Payment failed with status: ${tradeStatus}`;
  }

  async queryPaymentStatus(params: any): Promise<any> {
    return {
      isSuccess: true,
      gatewayOrderId: params.gatewayOrderId,
      paidAmount: 100,
      paidAt: new Date(),
    };
  }

  async createRefund(params: any): Promise<any> {
    return {
      gatewayRefundId: `REFUND_${Date.now()}`,
    };
  }

  async closePayment(params: any): Promise<void> {
    // Mock implementation
  }
}
