import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrdersService } from './orders.service';
import { PaymentSucceededEvent } from '../payment/domain/events/payment-succeeded.event';
import { PaymentFailedEvent } from '../payment/domain/events/payment-failed.event';

/**
 * 支付事件→订单回写监听（W-3 批,2026-10-09）
 *
 * 病灶:payment 模块发 payment.succeeded/payment.failed,全仓 @OnEvent 零监听——
 * 支付成功后订单 paymentStatus 永停 pending,支付与订单两域状态断联。
 *
 * 事件类是 payment 域发布的契约类型,此处仅作消费方类型引用(事件总线解耦实例)。
 * 只回写 paymentStatus 镜像;order.status 是否随支付联动=用户挂账裁决,不预设。
 */
@Injectable()
export class PaymentEventsListener {
  private readonly logger = new Logger(PaymentEventsListener.name);

  constructor(private readonly ordersService: OrdersService) {}

  @OnEvent('payment.succeeded')
  async onPaymentSucceeded(event: PaymentSucceededEvent): Promise<void> {
    // markPaymentSucceeded 自带金额闸:实付≠订单总额(最小单位零容差)拒绝回写
    const order = await this.ordersService.markPaymentSucceeded(
      event.merchantOrderId,
      event.paidAmount,
      event.currency,
    );
    if (!order) {
      this.logger.warn(
        `payment.succeeded 未回写(无对应订单或金额不符):merchantOrderId=${event.merchantOrderId},` +
          `paymentOrderId=${event.paymentOrderId},实付 ${event.paidAmount} ${event.currency}`,
      );
      return;
    }
    this.logger.log(
      `支付成功回写:订单 ${order.orderNumber} paymentStatus→paid(paidAt=${order.paidAt?.toISOString() ?? '-'})`,
    );
  }

  @OnEvent('payment.failed')
  async onPaymentFailed(event: PaymentFailedEvent): Promise<void> {
    const order = await this.ordersService.markPaymentFailed(event.merchantOrderId);
    if (!order) {
      this.logger.warn(
        `payment.failed 无对应订单,跳过回写(merchantOrderId=${event.merchantOrderId},paymentOrderId=${event.paymentOrderId})`,
      );
      return;
    }
    this.logger.log(`支付失败回写:订单 ${order.orderNumber} paymentStatus→failed`);
  }
}
