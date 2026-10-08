import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 支付应用服务
 * 参考temp_congomall的DDD架构设计和gopay的支付流程
 */
@Injectable()
export class PaymentApplicationService {
  constructor(
    private readonly paymentDomainService: any,
    private readonly paymentRepository: any,
    private readonly paymentGatewayFactory: any,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 创建支付订单
   * 统一支付下单流程，支持多种支付方式
   */
  async createPaymentOrder(command: any): Promise<any> {
    // 1. 业务规则验证
    await this.validatePaymentOrder(command);

    // 2. 创建支付订单聚合根
    const paymentOrder = await this.paymentDomainService.createPaymentOrder({
      orderId: command.orderId,
      amount: command.amount,
      currency: command.currency,
      subject: command.subject,
      body: command.body,
      payMethod: command.payMethod,
      userId: command.userId,
      clientIp: command.clientIp,
      expireTime: command.expireTime || 30, // 默认30分钟过期
    });

    // 3. 获取支付网关
    const gateway = this.paymentGatewayFactory.getGateway(command.payMethod);

    // 4. 调用支付网关创建订单
    const gatewayResult = await gateway.createOrder({
      outTradeNo: paymentOrder.id,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      subject: paymentOrder.subject,
      body: paymentOrder.body,
      notifyUrl: command.notifyUrl || this.getDefaultNotifyUrl(command.payMethod),
      returnUrl: command.returnUrl,
      clientIp: command.clientIp,
      expireTime: paymentOrder.expireTime,
    });

    // 5. 更新支付信息
    paymentOrder.updatePaymentInfo(gatewayResult);

    // 6. 保存到仓储
    await this.paymentRepository.save(paymentOrder);

    // 7. 发布领域事件
    this.eventEmitter.emit('payment.order.created', {
      paymentId: paymentOrder.id,
      orderId: paymentOrder.orderId,
      amount: paymentOrder.amount,
      payMethod: paymentOrder.payMethod,
      userId: paymentOrder.userId,
    });

    // 8. 返回响应
    return {
      paymentId: paymentOrder.id,
      outTradeNo: paymentOrder.id,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      status: paymentOrder.status,
      payMethod: paymentOrder.payMethod,
      payInfo: gatewayResult.payInfo,
      expireTime: paymentOrder.expireTime,
      createdAt: paymentOrder.createdAt,
    };
  }

  /**
   * 创建退款订单
   */
  async createRefund(command: any): Promise<any> {
    // 1. 查找原支付订单
    const paymentOrder = await this.paymentRepository.findById(command.paymentId);
    if (!paymentOrder) {
      throw new Error('支付订单不存在');
    }

    // 2. 验证退款条件
    await this.validateRefundConditions(paymentOrder, command);

    // 3. 创建退款订单
    const refundOrder = paymentOrder.createRefund({
      refundAmount: command.refundAmount,
      refundReason: command.refundReason,
      operatorId: command.operatorId,
      outRefundNo: command.outRefundNo,
    });

    // 4. 调用支付网关退款
    const gateway = this.paymentGatewayFactory.getGateway(paymentOrder.payMethod);
    const refundResult = await gateway.refund({
      outTradeNo: paymentOrder.id,
      tradeNo: paymentOrder.tradeNo,
      refundAmount: command.refundAmount,
      totalAmount: paymentOrder.amount,
      refundReason: command.refundReason,
      outRefundNo: refundOrder.id,
    });

    // 5. 更新退款状态
    refundOrder.updateRefundResult(refundResult);

    // 6. 保存更新
    await this.paymentRepository.save(paymentOrder);

    // 7. 发布事件
    this.eventEmitter.emit('payment.refund.created', {
      refundId: refundOrder.id,
      paymentId: paymentOrder.id,
      refundAmount: command.refundAmount,
      status: refundOrder.status,
    });

    return {
      refundId: refundOrder.id,
      paymentId: paymentOrder.id,
      refundAmount: command.refundAmount,
      status: refundOrder.status,
      refundNo: refundResult.refundNo,
    };
  }

  /**
   * 关闭支付订单
   */
  async closePaymentOrder(command: any): Promise<any> {
    const paymentOrder = await this.paymentRepository.findById(command.paymentId);
    if (!paymentOrder) {
      throw new Error('支付订单不存在');
    }

    // 验证是否可以关闭
    if (!paymentOrder.canClose()) {
      throw new Error('订单状态不允许关闭');
    }

    // 调用支付网关关闭订单
    const gateway = this.paymentGatewayFactory.getGateway(paymentOrder.payMethod);
    await gateway.closeOrder({
      outTradeNo: paymentOrder.id,
      tradeNo: paymentOrder.tradeNo,
    });

    // 更新订单状态
    paymentOrder.close(command.reason, command.operatorId);

    // 保存更新
    await this.paymentRepository.save(paymentOrder);

    // 发布事件
    this.eventEmitter.emit('payment.order.closed', {
      paymentId: paymentOrder.id,
      reason: command.reason,
      operatorId: command.operatorId,
    });

    return {
      paymentId: paymentOrder.id,
      status: paymentOrder.status,
      closedAt: new Date(),
    };
  }

  /**
   * 同步支付订单状态
   */
  async syncPaymentOrder(paymentId: string): Promise<any> {
    const paymentOrder = await this.paymentRepository.findById(paymentId);
    if (!paymentOrder) {
      throw new Error('支付订单不存在');
    }

    // 调用支付网关查询
    const gateway = this.paymentGatewayFactory.getGateway(paymentOrder.payMethod);
    const queryResult = await gateway.queryOrder({
      outTradeNo: paymentOrder.id,
      tradeNo: paymentOrder.tradeNo,
    });

    // 更新订单状态
    const statusChanged = paymentOrder.syncStatus(queryResult);

    if (statusChanged) {
      await this.paymentRepository.save(paymentOrder);

      // 发布状态变更事件
      this.eventEmitter.emit('payment.status.changed', {
        paymentId: paymentOrder.id,
        oldStatus: queryResult.oldStatus,
        newStatus: paymentOrder.status,
        tradeNo: queryResult.tradeNo,
      });
    }

    return {
      paymentId: paymentOrder.id,
      outTradeNo: paymentOrder.id,
      tradeNo: paymentOrder.tradeNo,
      status: paymentOrder.status,
      amount: paymentOrder.amount,
      paidAmount: paymentOrder.paidAmount,
      currency: paymentOrder.currency,
      payMethod: paymentOrder.payMethod,
      paidAt: paymentOrder.paidAt,
      createdAt: paymentOrder.createdAt,
      updatedAt: paymentOrder.updatedAt,
    };
  }

  /**
   * 验证支付订单
   */
  private async validatePaymentOrder(command: any): Promise<void> {
    // 验证金额
    if (command.amount <= 0) {
      throw new Error('支付金额必须大于0');
    }

    // 验证订单是否已存在
    const existingOrder = await this.paymentRepository.findByOrderId(command.orderId);
    if (existingOrder && existingOrder.status !== 'CANCELLED') {
      throw new Error('订单已存在有效的支付记录');
    }

    // 验证支付方式
    if (!this.isPaymentMethodSupported(command.payMethod)) {
      throw new Error('不支持的支付方式');
    }

    // 验证货币类型
    if (!this.isCurrencySupported(command.currency, command.payMethod)) {
      throw new Error('支付方式不支持该货币类型');
    }
  }

  /**
   * 验证退款条件
   */
  private async validateRefundConditions(paymentOrder: any, command: any): Promise<void> {
    // 验证订单状态
    if (!paymentOrder.canRefund()) {
      throw new Error('订单状态不允许退款');
    }

    // 验证退款金额
    if (command.refundAmount <= 0) {
      throw new Error('退款金额必须大于0');
    }

    if (command.refundAmount > paymentOrder.getRefundableAmount()) {
      throw new Error('退款金额超过可退款金额');
    }

    // 验证退款时间限制
    const refundDeadline = new Date(paymentOrder.paidAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30天
    if (new Date() > refundDeadline) {
      throw new Error('超过退款时间限制');
    }
  }

  /**
   * 检查支付方式是否支持
   */
  private isPaymentMethodSupported(payMethod: string): boolean {
    const supportedMethods = [
      'alipay_web',
      'alipay_wap',
      'alipay_app',
      'alipay_qr',
      'wechat_jsapi',
      'wechat_h5',
      'wechat_app',
      'wechat_native',
      'wechat_mini',
      'unionpay_web',
      'unionpay_wap',
      'unionpay_app',
      'unionpay_qr',
      'usdt_trc20',
      'usdt_erc20',
      'btc',
      'eth',
      'paypal',
      'stripe',
    ];
    return supportedMethods.includes(payMethod);
  }

  /**
   * 检查货币类型是否支持
   */
  private isCurrencySupported(currency: string, payMethod: string): boolean {
    const currencyMap = {
      CNY: ['alipay_', 'wechat_', 'unionpay_'],
      USD: ['paypal', 'stripe'],
      USDT: ['usdt_'],
      BTC: ['btc'],
      ETH: ['eth'],
    };

    const supportedPrefixes = (currencyMap as any)[currency] || [];
    return supportedPrefixes.some((prefix: string) => payMethod.startsWith(prefix));
  }

  /**
   * 获取默认回调地址
   */
  private getDefaultNotifyUrl(payMethod: string): string {
    return `${process.env.APP_URL}/api/payment/callbacks/${payMethod}`;
  }
}
