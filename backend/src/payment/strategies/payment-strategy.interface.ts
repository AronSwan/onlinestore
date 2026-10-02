import * as crypto from 'crypto';
import { sortKeysDeep } from '../../common/security/payment-security.service';

export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  userId: number;
  metadata?: any;
  returnUrl?: string;
  notifyUrl?: string;
  expireMinutes?: number;
}
import {
  GatewayResult,
  CreatePaymentData,
  QueryPaymentData,
  CallbackData,
  RefundData,
} from '../common/gateway-result';

export interface RefundRequest {
  paymentId: string;
  amount: number;
  reason?: string;
  metadata?: any;
}
export abstract class PaymentStrategy {
  abstract createPayment(request: PaymentRequest): Promise<GatewayResult<CreatePaymentData>>;

  abstract queryPayment(paymentId: string): Promise<GatewayResult<QueryPaymentData>>;

  abstract handleCallback(data: any): Promise<GatewayResult<CallbackData>>;

  abstract refund(request: RefundRequest): Promise<GatewayResult<RefundData>>;

  abstract validateCallback(data: any): boolean;

  /**
   * 通用支付回调验签（HMAC-SHA256）。
   *
   * 签名约定与 PaymentSecurityService 保持一致：
   * - 剔除 data 中的 signature 字段；
   * - 剩余字段经 sortKeysDeep 递归深度排序（对象与数组逐层 key 字典序）后 JSON.stringify；
   * - 使用环境变量 PAYMENT_SIGNATURE_SECRET 计算 HMAC-SHA256（hex）。
   *
   * 整改（M4，2026-10-02）：原先只做顶层 key 排序，与 PaymentSecurityService 的
   * 递归排序在嵌套 payload 上产出不同签名，两套体系互不兼容。现改为直接复用
   * security 侧导出的同一纯函数 sortKeysDeep（单一实现源，防止再次分歧；
   * 已确认 common/security 不反向依赖 payment，无循环导入，纯函数无需 DI）。
   *
   * 安全语义：fail-closed —— 未配置密钥、缺少签名或签名不匹配一律返回 false，
   * 并记录警告日志，绝不放行未验签的支付回调。
   */
  protected verifyCallbackSignature(data: any): boolean {
    const secret = process.env.PAYMENT_SIGNATURE_SECRET;
    if (!secret) {
      console.warn(
        `[${this.constructor.name}] PAYMENT_SIGNATURE_SECRET 未配置，支付回调验签拒绝（fail-closed）`,
      );
      return false;
    }

    if (!data || typeof data !== 'object') {
      return false;
    }

    const provided = typeof data.signature === 'string' ? data.signature : '';
    if (!provided) {
      return false;
    }

    const { signature: _ignored, ...rest } = data;
    const sorted = sortKeysDeep(rest);
    const expected = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(sorted))
      .digest('hex');

    const providedBuf = Buffer.from(provided, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (providedBuf.length === 0 || providedBuf.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(providedBuf, expectedBuf);
  }
}
