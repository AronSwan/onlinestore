import { Logger } from '@nestjs/common';
import { PaymentStrategy } from '../../strategies/payment-strategy.interface';
import { Money } from '../../domain/value-objects/money.value-object';
import {
  PaymentGateway,
} from '../../domain/services/payment-gateway.factory';

/**
 * 策略适配器：把挂载路径的 PaymentGateway 7 方法接口适配到
 * strategies/ 的 PaymentStrategy 5 方法接口（fail-closed 验签实现所在地）。
 *
 * 定调会施工批（2026-10-09）：替换 MockPaymentGateway（verifyCallback 恒真）——
 * 真实验签链 = strategy.validateCallback → verifyCallbackSignature
 * （HMAC-SHA256+sortKeysDeep，PAYMENT_SIGNATURE_SECRET 未配置即拒）。
 */
export class StrategyGatewayAdapter implements PaymentGateway {
  private readonly logger = new Logger(StrategyGatewayAdapter.name);

  constructor(
    private readonly strategy: PaymentStrategy,
    private readonly methodKey: string,
  ) {}

  async createPayment(params: {
    paymentOrderId: string;
    merchantOrderId: string;
    amount: Money;
    subject: string;
    description: string;
    notifyUrl?: string;
    returnUrl?: string;
    expireTime?: Date;
    extraParams?: Record<string, any>;
  }): Promise<{ gatewayOrderId: string; paymentUrl?: string; qrCode?: string }> {
    const expireMinutes = params.expireTime
      ? Math.max(
          1,
          Math.ceil((params.expireTime.getTime() - Date.now()) / 60000),
        )
      : undefined;

    const result = await this.strategy.createPayment({
      orderId: params.merchantOrderId,
      amount: params.amount.amount,
      currency: params.amount.currency,
      // PaymentRequest.userId 为 number：从 extraParams 透传（app service 未传则 0）
      userId: Number(params.extraParams?.userId ?? 0),
      metadata: { ...params.extraParams, subject: params.subject, description: params.description },
      returnUrl: params.returnUrl,
      notifyUrl: params.notifyUrl,
      expireMinutes,
    });

    if (!result.success || !result.data) {
      throw new Error(`支付创建失败[${this.methodKey}]: ${result.message ?? '网关未返回数据'}`);
    }

    return {
      gatewayOrderId: result.data.paymentId,
      paymentUrl: result.data.redirectUrl ?? result.data.deepLink,
      qrCode: result.data.qrCode,
    };
  }

  async verifyCallback(params: {
    signature?: string;
    data: any;
    timestamp?: string;
  }): Promise<boolean> {
    // 关键细节（架构席二审预案）：挂载控制器把签名放 x-signature 头→context.signature，
    // 而策略的 verifyCallbackSignature 吃 data.signature 字段——此处合并后进策略。
    const merged = { ...(params.data ?? {}), signature: params.signature };
    try {
      return this.strategy.validateCallback(merged);
    } catch (error: any) {
      this.logger.error(`[${this.methodKey}] 回调验签异常: ${error.message}`);
      return false;
    }
  }

  isPaymentSuccess(tradeStatus: string): boolean {
    // 白名单与原 Mock 对齐 + crypto 的 confirmed
    return ['success', 'TRADE_SUCCESS', 'completed', 'confirmed'].includes(tradeStatus);
  }

  getFailureReason(tradeStatus: string): string {
    return `支付状态: ${tradeStatus}`;
  }

  async queryPaymentStatus(params: {
    paymentOrderId: string;
    gatewayOrderId: string;
  }): Promise<{
    isSuccess: boolean;
    gatewayOrderId: string;
    paidAmount: number;
    paidAt?: Date;
  }> {
    const result = await this.strategy.queryPayment(params.gatewayOrderId);
    const data = result.data;
    const isSuccess =
      result.success && !!data && ['success', 'confirmed', 'completed'].includes(data.status);
    return {
      isSuccess,
      gatewayOrderId: params.gatewayOrderId,
      paidAmount: Number(data?.amount ?? 0),
      paidAt: data?.paidAt,
    };
  }

  async createRefund(params: {
    paymentOrderId: string;
    gatewayOrderId: string;
    refundId: string;
    refundAmount: Money;
    reason: string;
  }): Promise<{ gatewayRefundId: string }> {
    const result = await this.strategy.refund({
      paymentId: params.gatewayOrderId,
      amount: params.refundAmount.amount,
      reason: params.reason,
      metadata: { refundId: params.refundId, paymentOrderId: params.paymentOrderId },
    });

    if (!result.success || !result.data) {
      throw new Error(`退款创建失败[${this.methodKey}]: ${result.message ?? '网关未返回数据'}`);
    }
    return { gatewayRefundId: result.data.refundId };
  }

  async closePayment(params: {
    paymentOrderId: string;
    gatewayOrderId: string;
  }): Promise<void> {
    // PaymentStrategy 接口无 close 方法——策略缺口记挂账，不假装支持
    this.logger.warn(
      `[${this.methodKey}] closePayment: 策略接口未提供关闭能力（挂账），订单 ${params.paymentOrderId} 关闭仅落本地状态`,
    );
  }
}
