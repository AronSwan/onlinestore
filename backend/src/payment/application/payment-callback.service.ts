import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 支付回调服务
 * 处理各支付平台的异步回调通知
 * 参考gopay的回调处理机制
 */
@Injectable()
export class PaymentCallbackService {
  private readonly logger = new Logger(PaymentCallbackService.name);

  constructor(
    private readonly paymentRepository: any,
    private readonly paymentGatewayFactory: any,
    private readonly signatureValidator: any,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 处理支付回调
   */
  async handleCallback(context: any): Promise<any> {
    const { payMethod, data, headers, rawBody, clientIp } = context;

    try {
      this.logger.log(`收到支付回调: ${payMethod}`, { data, clientIp });

      // 1. 获取支付网关
      const gateway = this.paymentGatewayFactory.getGateway(payMethod);

      // 2. 验证回调签名
      const isValidSignature = await this.validateCallbackSignature(
        gateway,
        data,
        headers,
        rawBody,
      );

      if (!isValidSignature) {
        this.logger.warn(`回调签名验证失败: ${payMethod}`, { data, headers });
        return { success: false, message: '签名验证失败' };
      }

      // 3. 解析回调数据
      const callbackInfo = await gateway.parseCallback(data, headers);

      // 4. 查找支付订单
      const paymentOrder = await this.findPaymentOrder(callbackInfo);
      if (!paymentOrder) {
        this.logger.warn(`未找到支付订单: ${callbackInfo.outTradeNo}`);
        return { success: false, message: '订单不存在' };
      }

      // 5. 检查订单状态
      if (!this.shouldProcessCallback(paymentOrder, callbackInfo)) {
        this.logger.log(`订单状态无需处理: ${paymentOrder.id}`);
        this.logger.debug('订单状态详情', {
          currentStatus: paymentOrder.status,
          callbackStatus: callbackInfo.status,
        });
        return { success: true, message: '订单状态无需更新' };
      }

      // 6. 更新支付状态
      const statusChanged = await this.updatePaymentStatus(paymentOrder, callbackInfo);

      // 7. 保存更新
      if (statusChanged) {
        await this.paymentRepository.save(paymentOrder);

        // 8. 发布领域事件
        await this.publishPaymentEvents(paymentOrder, callbackInfo);
      }

      // 9. 记录回调日志
      await this.recordCallbackLog(paymentOrder, callbackInfo, context);

      this.logger.log(`支付回调处理成功: ${paymentOrder.id}`);
      return { success: true, message: '处理成功' };
    } catch (error) {
      this.logger.error(`支付回调处理失败: ${payMethod}`, error.stack, { data });

      // 记录错误日志
      await this.recordCallbackError(payMethod, data, error, context);

      return { success: false, message: '处理失败' };
    }
  }

  /**
   * 验证回调签名
   */
  private async validateCallbackSignature(
    gateway: any,
    data: any,
    headers: any,
    rawBody: any,
  ): Promise<boolean> {
    try {
      return await gateway.verifyCallback(data, headers, rawBody);
    } catch (error) {
      this.logger.error('签名验证异常', error.stack);
      return false;
    }
  }

  /**
   * 查找支付订单
   */
  private async findPaymentOrder(callbackInfo: any): Promise<any> {
    // 优先通过outTradeNo查找
    if (callbackInfo.outTradeNo) {
      const order = await this.paymentRepository.findById(callbackInfo.outTradeNo);
      if (order) return order;
    }

    // 通过tradeNo查找
    if (callbackInfo.tradeNo) {
      return await this.paymentRepository.findByTradeNo(callbackInfo.tradeNo);
    }

    return null;
  }

  /**
   * 判断是否需要处理回调
   */
  private shouldProcessCallback(paymentOrder: any, callbackInfo: any): boolean {
    // 已经是最终状态的订单不再处理
    const finalStatuses = ['SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'];
    if (finalStatuses.includes(paymentOrder.status)) {
      return false;
    }

    // 状态没有变化不处理
    if (paymentOrder.status === callbackInfo.status) {
      return false;
    }

    return true;
  }

  /**
   * 更新支付状态
   */
  private async updatePaymentStatus(paymentOrder: any, callbackInfo: any): Promise<boolean> {
    const oldStatus = paymentOrder.status;

    // 根据回调信息更新订单状态
    const updated = paymentOrder.updateFromCallback({
      status: callbackInfo.status,
      tradeNo: callbackInfo.tradeNo,
      paidAmount: callbackInfo.paidAmount,
      paidAt: callbackInfo.paidAt,
      buyerInfo: callbackInfo.buyerInfo,
      gatewayData: callbackInfo.rawData,
    });

    if (updated) {
      this.logger.log(`订单状态更新: ${paymentOrder.id}`, {
        oldStatus,
        newStatus: paymentOrder.status,
        tradeNo: callbackInfo.tradeNo,
        paidAmount: callbackInfo.paidAmount,
      });
    }

    return updated;
  }

  /**
   * 发布支付事件
   */
  private async publishPaymentEvents(paymentOrder: any, callbackInfo: any): Promise<void> {
    const events = [];

    // 支付成功事件
    if (paymentOrder.status === 'SUCCESS') {
      events.push({
        name: 'payment.success',
        data: {
          paymentId: paymentOrder.id,
          orderId: paymentOrder.orderId,
          amount: paymentOrder.amount,
          paidAmount: paymentOrder.paidAmount,
          currency: paymentOrder.currency,
          payMethod: paymentOrder.payMethod,
          tradeNo: paymentOrder.tradeNo,
          userId: paymentOrder.userId,
          paidAt: paymentOrder.paidAt,
        },
      });
    }

    // 支付失败事件
    if (paymentOrder.status === 'FAILED') {
      events.push({
        name: 'payment.failed',
        data: {
          paymentId: paymentOrder.id,
          orderId: paymentOrder.orderId,
          amount: paymentOrder.amount,
          currency: paymentOrder.currency,
          payMethod: paymentOrder.payMethod,
          userId: paymentOrder.userId,
          failReason: callbackInfo.failReason,
        },
      });
    }

    // 状态变更事件
    events.push({
      name: 'payment.status.changed',
      data: {
        paymentId: paymentOrder.id,
        orderId: paymentOrder.orderId,
        oldStatus: callbackInfo.oldStatus,
        newStatus: paymentOrder.status,
        tradeNo: paymentOrder.tradeNo,
        callbackTime: new Date(),
      },
    });

    // 发布所有事件
    for (const event of events) {
      this.eventEmitter.emit(event.name, event.data);
    }
  }

  /**
   * 记录回调日志
   */
  private async recordCallbackLog(
    paymentOrder: any,
    callbackInfo: any,
    context: any,
  ): Promise<void> {
    const logData = {
      paymentId: paymentOrder.id,
      payMethod: context.payMethod,
      callbackData: context.data,
      headers: context.headers,
      clientIp: context.clientIp,
      processResult: 'SUCCESS',
      statusBefore: callbackInfo.oldStatus,
      statusAfter: paymentOrder.status,
      tradeNo: callbackInfo.tradeNo,
      paidAmount: callbackInfo.paidAmount,
      timestamp: context.timestamp,
    };

    // 这里可以保存到数据库或发送到日志系统
    this.logger.log('支付回调日志', logData);
  }

  /**
   * 记录回调错误
   */
  private async recordCallbackError(
    payMethod: string,
    data: any,
    error: Error,
    context: any,
  ): Promise<void> {
    const errorLog = {
      payMethod,
      callbackData: data,
      headers: context.headers,
      clientIp: context.clientIp,
      error: {
        message: error.message,
        stack: error.stack,
      },
      timestamp: context.timestamp,
    };

    // 记录错误日志
    this.logger.error('支付回调错误', errorLog);

    // 可以发送告警通知
    this.eventEmitter.emit('payment.callback.error', errorLog);
  }

  /**
   * 重试处理回调
   * 用于处理临时失败的回调
   */
  async retryCallback(callbackId: string): Promise<any> {
    // 从数据库获取回调记录
    const callbackRecord = await this.getCallbackRecord(callbackId);
    if (!callbackRecord) {
      throw new Error('回调记录不存在');
    }

    // 重新构建回调上下文
    const context = {
      payMethod: callbackRecord.payMethod,
      data: callbackRecord.callbackData,
      headers: callbackRecord.headers,
      rawBody: callbackRecord.rawBody,
      clientIp: callbackRecord.clientIp,
      timestamp: new Date(),
    };

    // 重新处理回调
    return await this.handleCallback(context);
  }

  /**
   * 获取回调记录
   */
  private async getCallbackRecord(callbackId: string): Promise<any> {
    // 从数据库查询回调记录
    // 这里需要实现具体的查询逻辑
    return null;
  }
}
