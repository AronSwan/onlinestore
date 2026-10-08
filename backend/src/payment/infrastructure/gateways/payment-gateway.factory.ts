import { Injectable } from '@nestjs/common';
import { PaymentMethod } from '../../controllers/clean-payment.controller';

/**
 * 支付网关工厂
 * 参考gopay的多支付平台统一接口设计
 */
@Injectable()
export class PaymentGatewayFactory {
  private gateways: Map<string, PaymentGateway> = new Map();

  constructor(
    private readonly alipayGateway: AlipayGateway,
    private readonly wechatGateway: WechatGateway,
    private readonly unionpayGateway: UnionpayGateway,
    private readonly cryptoGateway: CryptoGateway,
    private readonly paypalGateway: PaypalGateway,
    private readonly stripeGateway: StripeGateway,
  ) {
    this.registerGateways();
  }

  /**
   * 注册所有支付网关
   */
  private registerGateways(): void {
    // 支付宝网关
    this.gateways.set('alipay_web', this.alipayGateway);
    this.gateways.set('alipay_wap', this.alipayGateway);
    this.gateways.set('alipay_app', this.alipayGateway);
    this.gateways.set('alipay_qr', this.alipayGateway);

    // 微信网关
    this.gateways.set('wechat_jsapi', this.wechatGateway);
    this.gateways.set('wechat_h5', this.wechatGateway);
    this.gateways.set('wechat_app', this.wechatGateway);
    this.gateways.set('wechat_native', this.wechatGateway);
    this.gateways.set('wechat_mini', this.wechatGateway);

    // 银联网关
    this.gateways.set('unionpay_web', this.unionpayGateway);
    this.gateways.set('unionpay_wap', this.unionpayGateway);
    this.gateways.set('unionpay_app', this.unionpayGateway);
    this.gateways.set('unionpay_qr', this.unionpayGateway);

    // 数字货币网关
    this.gateways.set('usdt_trc20', this.cryptoGateway);
    this.gateways.set('usdt_erc20', this.cryptoGateway);
    this.gateways.set('btc', this.cryptoGateway);
    this.gateways.set('eth', this.cryptoGateway);

    // 国际支付网关
    this.gateways.set('paypal', this.paypalGateway);
    this.gateways.set('stripe', this.stripeGateway);
  }

  /**
   * 获取支付网关
   */
  getGateway(payMethod: PaymentMethod | string): PaymentGateway {
    const gateway = this.gateways.get(payMethod);
    if (!gateway) {
      throw new Error(`不支持的支付方式: ${payMethod}`);
    }
    return gateway;
  }

  /**
   * 获取所有支持的支付方式
   */
  getSupportedMethods(): string[] {
    return Array.from(this.gateways.keys());
  }

  /**
   * 检查支付方式是否支持
   */
  isSupported(payMethod: string): boolean {
    return this.gateways.has(payMethod);
  }
}

/**
 * 支付网关接口
 * 定义统一的支付网关规范
 */
export interface PaymentGateway {
  /**
   * 创建支付订单
   */
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;

  /**
   * 查询订单状态
   */
  queryOrder(params: QueryOrderParams): Promise<QueryOrderResult>;

  /**
   * 关闭订单
   */
  closeOrder(params: CloseOrderParams): Promise<CloseOrderResult>;

  /**
   * 退款
   */
  refund(params: RefundParams): Promise<RefundResult>;

  /**
   * 查询退款
   */
  queryRefund(params: QueryRefundParams): Promise<QueryRefundResult>;

  /**
   * 验证回调
   */
  verifyCallback(data: any, headers: any, rawBody: any): Promise<boolean>;

  /**
   * 解析回调数据
   */
  parseCallback(data: any, headers: any): Promise<CallbackInfo>;

  /**
   * 获取支付方式配置
   */
  getConfig(): PaymentGatewayConfig;
}

// 接口参数定义
export interface CreateOrderParams {
  outTradeNo: string;
  amount: number;
  currency: string;
  subject: string;
  body?: string;
  notifyUrl: string;
  returnUrl?: string;
  clientIp: string;
  expireTime: Date;
  extraParams?: any;
}

export interface CreateOrderResult {
  success: boolean;
  payInfo: any; // 支付信息（二维码、跳转链接等）
  message?: string;
  gatewayOrderId?: string;
}

export interface QueryOrderParams {
  outTradeNo?: string;
  tradeNo?: string;
}

export interface QueryOrderResult {
  success: boolean;
  status: string;
  tradeNo?: string;
  paidAmount?: number;
  paidAt?: Date;
  buyerInfo?: any;
  rawData?: any;
  message?: string;
}

export interface CloseOrderParams {
  outTradeNo?: string;
  tradeNo?: string;
}

export interface CloseOrderResult {
  success: boolean;
  message?: string;
}

export interface RefundParams {
  outTradeNo?: string;
  tradeNo?: string;
  refundAmount: number;
  totalAmount: number;
  refundReason: string;
  outRefundNo: string;
}

export interface RefundResult {
  success: boolean;
  refundNo?: string;
  refundedAt?: Date;
  status: string;
  message?: string;
}

export interface QueryRefundParams {
  outRefundNo?: string;
  refundNo?: string;
}

export interface QueryRefundResult {
  success: boolean;
  status: string;
  refundAmount?: number;
  refundedAt?: Date;
  message?: string;
}

export interface CallbackInfo {
  outTradeNo: string;
  tradeNo?: string;
  status: string;
  paidAmount?: number;
  paidAt?: Date;
  buyerInfo?: any;
  failReason?: string;
  rawData?: any;
}

export interface PaymentGatewayConfig {
  name: string;
  supportedMethods: string[];
  supportedCurrencies: string[];
  features: {
    refund: boolean;
    query: boolean;
    close: boolean;
    callback: boolean;
  };
}

/**
 * 支付宝网关实现
 */
@Injectable()
export class AlipayGateway implements PaymentGateway {
  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    // 实现支付宝下单逻辑
    // 参考gopay的支付宝实现
    return {
      success: true,
      payInfo: {
        qrCode: 'alipay_qr_code_url',
        payUrl: 'alipay_pay_url',
      },
    };
  }

  async queryOrder(params: QueryOrderParams): Promise<QueryOrderResult> {
    // 实现支付宝查询逻辑
    return {
      success: true,
      status: 'SUCCESS',
    };
  }

  async closeOrder(params: CloseOrderParams): Promise<CloseOrderResult> {
    // 实现支付宝关闭订单逻辑
    return { success: true };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    // 实现支付宝退款逻辑
    return {
      success: true,
      status: 'SUCCESS',
      refundNo: 'alipay_refund_no',
    };
  }

  async queryRefund(params: QueryRefundParams): Promise<QueryRefundResult> {
    // 实现支付宝退款查询逻辑
    return {
      success: true,
      status: 'SUCCESS',
    };
  }

  async verifyCallback(data: any, headers: any, rawBody: any): Promise<boolean> {
    // 实现支付宝回调验证逻辑
    return true;
  }

  async parseCallback(data: any, headers: any): Promise<CallbackInfo> {
    // 实现支付宝回调解析逻辑
    return {
      outTradeNo: data.out_trade_no,
      tradeNo: data.trade_no,
      status: data.trade_status,
      paidAmount: parseFloat(data.total_amount),
      paidAt: new Date(data.gmt_payment),
      rawData: data,
    };
  }

  getConfig(): PaymentGatewayConfig {
    return {
      name: '支付宝',
      supportedMethods: ['alipay_web', 'alipay_wap', 'alipay_app', 'alipay_qr'],
      supportedCurrencies: ['CNY'],
      features: {
        refund: true,
        query: true,
        close: true,
        callback: true,
      },
    };
  }
}

/**
 * 微信支付网关实现
 */
@Injectable()
export class WechatGateway implements PaymentGateway {
  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    // 实现微信支付下单逻辑
    return {
      success: true,
      payInfo: {
        prepayId: 'wx_prepay_id',
        qrCode: 'wx_qr_code_url',
      },
    };
  }

  async queryOrder(params: QueryOrderParams): Promise<QueryOrderResult> {
    return { success: true, status: 'SUCCESS' };
  }

  async closeOrder(params: CloseOrderParams): Promise<CloseOrderResult> {
    return { success: true };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    return { success: true, status: 'SUCCESS' };
  }

  async queryRefund(params: QueryRefundParams): Promise<QueryRefundResult> {
    return { success: true, status: 'SUCCESS' };
  }

  async verifyCallback(data: any, headers: any, rawBody: any): Promise<boolean> {
    return true;
  }

  async parseCallback(data: any, headers: any): Promise<CallbackInfo> {
    return {
      outTradeNo: data.out_trade_no,
      tradeNo: data.transaction_id,
      status: data.trade_state,
      paidAmount: data.total_fee / 100, // 微信金额单位是分
      rawData: data,
    };
  }

  getConfig(): PaymentGatewayConfig {
    return {
      name: '微信支付',
      supportedMethods: ['wechat_jsapi', 'wechat_h5', 'wechat_app', 'wechat_native', 'wechat_mini'],
      supportedCurrencies: ['CNY'],
      features: {
        refund: true,
        query: true,
        close: true,
        callback: true,
      },
    };
  }
}

// 其他网关实现类似...
@Injectable()
export class UnionpayGateway implements PaymentGateway {
  // 银联支付实现
  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    return { success: true, payInfo: {} };
  }
  async queryOrder(params: QueryOrderParams): Promise<QueryOrderResult> {
    return { success: true, status: 'SUCCESS' };
  }
  async closeOrder(params: CloseOrderParams): Promise<CloseOrderResult> {
    return { success: true };
  }
  async refund(params: RefundParams): Promise<RefundResult> {
    return { success: true, status: 'SUCCESS' };
  }
  async queryRefund(params: QueryRefundParams): Promise<QueryRefundResult> {
    return { success: true, status: 'SUCCESS' };
  }
  async verifyCallback(data: any, headers: any, rawBody: any): Promise<boolean> {
    return true;
  }
  async parseCallback(data: any, headers: any): Promise<CallbackInfo> {
    return { outTradeNo: '', status: 'SUCCESS' };
  }
  getConfig(): PaymentGatewayConfig {
    return {
      name: '银联支付',
      supportedMethods: ['unionpay_web', 'unionpay_wap', 'unionpay_app', 'unionpay_qr'],
      supportedCurrencies: ['CNY'],
      features: { refund: true, query: true, close: true, callback: true },
    };
  }
}

@Injectable()
export class CryptoGateway implements PaymentGateway {
  // 数字货币支付实现
  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    return { success: true, payInfo: {} };
  }
  async queryOrder(params: QueryOrderParams): Promise<QueryOrderResult> {
    return { success: true, status: 'SUCCESS' };
  }
  async closeOrder(params: CloseOrderParams): Promise<CloseOrderResult> {
    return { success: true };
  }
  async refund(params: RefundParams): Promise<RefundResult> {
    return { success: true, status: 'SUCCESS' };
  }
  async queryRefund(params: QueryRefundParams): Promise<QueryRefundResult> {
    return { success: true, status: 'SUCCESS' };
  }
  async verifyCallback(data: any, headers: any, rawBody: any): Promise<boolean> {
    return true;
  }
  async parseCallback(data: any, headers: any): Promise<CallbackInfo> {
    return { outTradeNo: '', status: 'SUCCESS' };
  }
  getConfig(): PaymentGatewayConfig {
    return {
      name: '数字货币',
      supportedMethods: ['usdt_trc20', 'usdt_erc20', 'btc', 'eth'],
      supportedCurrencies: ['USDT', 'BTC', 'ETH'],
      features: { refund: false, query: true, close: false, callback: true },
    };
  }
}

@Injectable()
export class PaypalGateway implements PaymentGateway {
  // PayPal支付实现
  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    return { success: true, payInfo: {} };
  }
  async queryOrder(params: QueryOrderParams): Promise<QueryOrderResult> {
    return { success: true, status: 'SUCCESS' };
  }
  async closeOrder(params: CloseOrderParams): Promise<CloseOrderResult> {
    return { success: true };
  }
  async refund(params: RefundParams): Promise<RefundResult> {
    return { success: true, status: 'SUCCESS' };
  }
  async queryRefund(params: QueryRefundParams): Promise<QueryRefundResult> {
    return { success: true, status: 'SUCCESS' };
  }
  async verifyCallback(data: any, headers: any, rawBody: any): Promise<boolean> {
    return true;
  }
  async parseCallback(data: any, headers: any): Promise<CallbackInfo> {
    return { outTradeNo: '', status: 'SUCCESS' };
  }
  getConfig(): PaymentGatewayConfig {
    return {
      name: 'PayPal',
      supportedMethods: ['paypal'],
      supportedCurrencies: ['USD', 'EUR', 'GBP'],
      features: { refund: true, query: true, close: true, callback: true },
    };
  }
}

@Injectable()
export class StripeGateway implements PaymentGateway {
  // Stripe支付实现
  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    return { success: true, payInfo: {} };
  }
  async queryOrder(params: QueryOrderParams): Promise<QueryOrderResult> {
    return { success: true, status: 'SUCCESS' };
  }
  async closeOrder(params: CloseOrderParams): Promise<CloseOrderResult> {
    return { success: true };
  }
  async refund(params: RefundParams): Promise<RefundResult> {
    return { success: true, status: 'SUCCESS' };
  }
  async queryRefund(params: QueryRefundParams): Promise<QueryRefundResult> {
    return { success: true, status: 'SUCCESS' };
  }
  async verifyCallback(data: any, headers: any, rawBody: any): Promise<boolean> {
    return true;
  }
  async parseCallback(data: any, headers: any): Promise<CallbackInfo> {
    return { outTradeNo: '', status: 'SUCCESS' };
  }
  getConfig(): PaymentGatewayConfig {
    return {
      name: 'Stripe',
      supportedMethods: ['stripe'],
      supportedCurrencies: ['USD', 'EUR', 'GBP'],
      features: { refund: true, query: true, close: true, callback: true },
    };
  }
}
