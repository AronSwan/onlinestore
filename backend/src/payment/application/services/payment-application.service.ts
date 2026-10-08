import { Injectable, Logger, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Domain
import { PaymentOrderAggregate } from '../../domain/aggregates/payment-order.aggregate';
import { PaymentOrderRepository } from '../../domain/repositories/payment-order.repository';
import { PaymentGatewayFactory } from '../../domain/services/payment-gateway.factory';
import { PaymentRiskService } from '../../domain/services/payment-risk.service';

// Value Objects
import { PaymentOrderId } from '../../domain/value-objects/payment-order-id.value-object';
import { Money } from '../../domain/value-objects/money.value-object';
import { PaymentMethod } from '../../domain/value-objects/payment-method.value-object';

// DTOs
import { CreatePaymentOrderDto } from '../dtos/create-payment-order.dto';
import { PaymentCallbackDto } from '../dtos/payment-callback.dto';
import { RefundPaymentDto } from '../dtos/refund-payment.dto';
import { PaymentOrderResponseDto } from '../dtos/payment-order-response.dto';
import { PaymentStatusResponseDto } from '../dtos/payment-status-response.dto';

// Commands
import { CreatePaymentOrderCommand } from '../commands/create-payment-order.command';
import { ProcessPaymentCallbackCommand } from '../commands/process-payment-callback.command';
import { CreateRefundCommand } from '../commands/create-refund.command';

// Events
import { PaymentOrderCreatedEvent } from '../../domain/events/payment-order-created.event';
import { PaymentSucceededEvent } from '../../domain/events/payment-succeeded.event';
import { PaymentFailedEvent } from '../../domain/events/payment-failed.event';
import { RefundCreatedEvent } from '../../domain/events/refund-created.event';

/**
 * 支付应用服务
 * 负责协调领域对象和基础设施服务，实现业务用例
 */
@Injectable()
export class PaymentApplicationService {
  private readonly logger = new Logger(PaymentApplicationService.name);

  constructor(
    @Inject('PaymentOrderRepository')
    private readonly paymentOrderRepository: PaymentOrderRepository,
    private readonly paymentGatewayFactory: PaymentGatewayFactory,
    private readonly paymentRiskService: PaymentRiskService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 创建支付订单
   */
  async createPaymentOrder(
    dto: CreatePaymentOrderDto,
    context: any,
  ): Promise<PaymentOrderResponseDto> {
    this.logger.log(`创建支付订单开始: ${dto.merchantOrderId}`);

    try {
      // 1. 构建创建命令
      const command = CreatePaymentOrderCommand.create({
        merchantOrderId: dto.merchantOrderId,
        amount: Money.create(dto.amount, dto.currency),
        paymentMethod: PaymentMethod.fromString(dto.paymentMethod),
        subject: dto.subject || '',
        description: dto.description || '',
        userId: context.userId,
        clientIp: context.clientIp,
        userAgent: context.userAgent,
        idempotencyKey: context.idempotencyKey,
        notifyUrl: dto.notifyUrl,
        returnUrl: dto.returnUrl,
        expireTime: dto.expireTime ? new Date(dto.expireTime) : undefined,
        extraParams: dto.extraParams,
      });

      // 2. 幂等性检查
      if (context.idempotencyKey) {
        const existingOrder = await this.paymentOrderRepository.findByIdempotencyKey(
          context.idempotencyKey,
        );
        if (existingOrder) {
          this.logger.log(`幂等性检查：返回已存在的订单 ${existingOrder.id.value}`);
          return this.toPaymentOrderResponse(existingOrder);
        }
      }

      // 3. 风险检测
      const riskResult = await this.paymentRiskService.assessRisk({
        userId: context.userId,
        amount: command.amount,
        paymentMethod: command.paymentMethod,
        clientIp: context.clientIp,
        userAgent: context.userAgent,
      });

      if (riskResult.isHighRisk()) {
        throw new Error(`支付风险过高: ${riskResult.getReason()}`);
      }

      // 4. 创建支付订单聚合根
      const paymentOrder = PaymentOrderAggregate.create(command);

      // 5. 获取支付网关并创建支付
      const gateway = this.paymentGatewayFactory.createGateway(command.paymentMethod);
      const gatewayResult = await gateway.createPayment({
        paymentOrderId: paymentOrder.id.value,
        merchantOrderId: command.merchantOrderId,
        amount: command.amount,
        subject: command.subject,
        description: command.description || '',
        notifyUrl: command.notifyUrl,
        returnUrl: command.returnUrl,
        expireTime: command.expireTime,
        extraParams: command.extraParams,
      });

      // 6. 更新支付订单状态
      paymentOrder.updateGatewayInfo(
        gatewayResult.gatewayOrderId,
        gatewayResult.paymentUrl,
        gatewayResult.qrCode,
      );

      // 7. 保存支付订单
      await this.paymentOrderRepository.save(paymentOrder);

      // 8. 发布领域事件
      const event = new PaymentOrderCreatedEvent(
        paymentOrder.id.value,
        command.merchantOrderId,
        command.amount.amount,
        command.amount.currency,
        command.paymentMethod.value,
        context.userId,
      );
      this.eventEmitter.emit('payment.order.created', event);

      this.logger.log(`支付订单创建成功: ${paymentOrder.id.value}`);
      return this.toPaymentOrderResponse(paymentOrder);
    } catch (error) {
      this.logger.error(`创建支付订单失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 处理支付回调
   */
  async handlePaymentCallback(
    dto: PaymentCallbackDto,
    context: any,
  ): Promise<{ success: boolean; message?: string }> {
    this.logger.log(`处理支付回调开始: ${dto.outTradeNo}`);

    try {
      // 1. 构建回调处理命令
      const command = ProcessPaymentCallbackCommand.create({
        paymentMethod: context.paymentMethod,
        outTradeNo: dto.outTradeNo,
        gatewayOrderId: dto.gatewayOrderId,
        tradeStatus: dto.tradeStatus,
        totalAmount: dto.totalAmount,
        receiptAmount: dto.receiptAmount,
        gmtPayment: dto.gmtPayment ? new Date(dto.gmtPayment) : undefined,
        signature: context.signature,
        rawData: dto.rawData,
      });

      // 2. 获取支付网关并验证签名
      const gateway = this.paymentGatewayFactory.createGateway(context.paymentMethod);
      const isValidSignature = await gateway.verifyCallback({
        signature: context.signature,
        data: dto.rawData || dto,
        timestamp: context.timestamp,
      });

      if (!isValidSignature) {
        this.logger.warn(`支付回调签名验证失败: ${dto.outTradeNo}`);
        return { success: false, message: 'INVALID_SIGNATURE' };
      }

      // 3. 查找支付订单
      const paymentOrders = await this.paymentOrderRepository.findByMerchantOrderId(dto.outTradeNo);
      const paymentOrder =
        paymentOrders.length > 0 ? (paymentOrders[0] as PaymentOrderAggregate) : null;

      if (!paymentOrder) {
        this.logger.warn(`支付订单不存在: ${dto.outTradeNo}`);
        return { success: false, message: 'ORDER_NOT_FOUND' };
      }

      // 4. 处理支付结果
      const isSuccess = gateway.isPaymentSuccess(dto.tradeStatus);

      if (isSuccess) {
        // 支付成功
        paymentOrder.markAsSucceeded(
          dto.gatewayOrderId,
          Money.create(dto.receiptAmount || 0, paymentOrder.amount.currency),
          command.gmtPayment,
        );

        // 发布支付成功事件
        const event = new PaymentSucceededEvent(
          (paymentOrder.id as any).value,
          paymentOrder.merchantOrderId,
          dto.receiptAmount || 0,
          paymentOrder.amount.currency,
          dto.gatewayOrderId,
        );
        this.eventEmitter.emit('payment.succeeded', event);
      } else {
        // 支付失败
        const failureReason = gateway.getFailureReason(dto.tradeStatus);
        paymentOrder.markAsFailed(failureReason);

        // 发布支付失败事件
        const event = new PaymentFailedEvent(
          (paymentOrder.id as any).value,
          paymentOrder.merchantOrderId,
          failureReason,
        );
        this.eventEmitter.emit('payment.failed', event);
      }

      // 5. 保存更新后的支付订单
      await this.paymentOrderRepository.save(paymentOrder);

      this.logger.log(`支付回调处理成功: ${dto.outTradeNo}, 状态: ${dto.tradeStatus}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`处理支付回调失败: ${error.message}`, error.stack);
      return { success: false, message: 'SYSTEM_ERROR' };
    }
  }

  /**
   * 创建退款
   */
  async createRefund(
    dto: RefundPaymentDto,
    context: any,
  ): Promise<{ refundId: string; status: string; refundAmount: number }> {
    this.logger.log(`创建退款开始: ${dto.paymentOrderId}`);

    try {
      // 1. 构建退款命令
      const command = CreateRefundCommand.create({
        paymentOrderId: PaymentOrderId.create(dto.paymentOrderId),
        refundAmount: Money.create(dto.refundAmount, dto.currency),
        reason: dto.reason,
        operatorId: context.userId,
      });

      // 2. 查找支付订单
      const paymentOrder = await this.paymentOrderRepository.findById(command.paymentOrderId);
      if (!paymentOrder) {
        throw new Error('支付订单不存在');
      }

      // 3. 创建退款
      const refund = paymentOrder.createRefund(
        command.refundAmount,
        command.reason,
        command.operatorId,
      );

      // 4. 调用支付网关退款接口
      const gateway = this.paymentGatewayFactory.createGateway(paymentOrder.paymentMethod);
      const gatewayResult = await gateway.createRefund({
        paymentOrderId: paymentOrder.id.value,
        gatewayOrderId: paymentOrder.gatewayOrderId,
        refundId: refund.id.value,
        refundAmount: command.refundAmount,
        reason: command.reason,
      });

      // 5. 更新退款状态
      refund.updateGatewayInfo(gatewayResult.gatewayRefundId);

      // 6. 保存支付订单（包含退款信息）
      await this.paymentOrderRepository.save(paymentOrder);

      // 7. 发布退款创建事件
      const event = new RefundCreatedEvent(
        refund.id.value,
        paymentOrder.id.value,
        paymentOrder.merchantOrderId,
        command.refundAmount.amount,
        command.refundAmount.currency,
        command.reason,
        command.operatorId,
      );
      this.eventEmitter.emit('refund.created', event);

      this.logger.log(`退款创建成功: ${refund.id.value}`);
      return {
        refundId: refund.id.value,
        status: refund.status.value,
        refundAmount: command.refundAmount.amount,
      };
    } catch (error) {
      this.logger.error(`创建退款失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 同步支付订单状态
   */
  async syncPaymentOrderStatus(paymentOrderId: PaymentOrderId): Promise<PaymentStatusResponseDto> {
    this.logger.log(`同步支付订单状态: ${paymentOrderId.value}`);

    try {
      // 1. 查找支付订单
      const paymentOrder = await this.paymentOrderRepository.findById(paymentOrderId);
      if (!paymentOrder) {
        throw new Error('支付订单不存在');
      }

      // 2. 调用支付网关查询接口
      const gateway = this.paymentGatewayFactory.createGateway(paymentOrder.paymentMethod);
      const gatewayStatus = await gateway.queryPaymentStatus({
        paymentOrderId: paymentOrder.id.value,
        gatewayOrderId: paymentOrder.gatewayOrderId,
      });

      // 3. 更新本地状态
      if (gatewayStatus.isSuccess && !paymentOrder.isSucceeded()) {
        paymentOrder.markAsSucceeded(
          gatewayStatus.gatewayOrderId,
          Money.create(gatewayStatus.paidAmount, paymentOrder.amount.currency),
          gatewayStatus.paidAt,
        );
        await this.paymentOrderRepository.save(paymentOrder);
      }

      this.logger.log(`支付订单状态同步完成: ${paymentOrderId.value}`);
      return this.toPaymentStatusResponse(paymentOrder);
    } catch (error) {
      this.logger.error(`同步支付订单状态失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 关闭支付订单
   */
  async closePaymentOrder(
    paymentOrderId: PaymentOrderId,
    operatorId: string,
  ): Promise<{ paymentOrderId: string; status: string; closedAt: string }> {
    this.logger.log(`关闭支付订单: ${paymentOrderId.value}`);

    try {
      // 1. 查找支付订单
      const paymentOrder = await this.paymentOrderRepository.findById(paymentOrderId);
      if (!paymentOrder) {
        throw new Error('支付订单不存在');
      }

      // 2. 关闭订单
      paymentOrder.close(operatorId);

      // 3. 调用支付网关关闭接口
      const gateway = this.paymentGatewayFactory.createGateway(paymentOrder.paymentMethod);
      await gateway.closePayment({
        paymentOrderId: paymentOrder.id.value,
        gatewayOrderId: paymentOrder.gatewayOrderId,
      });

      // 4. 保存更新
      await this.paymentOrderRepository.save(paymentOrder);

      this.logger.log(`支付订单关闭成功: ${paymentOrderId.value}`);
      return {
        paymentOrderId: paymentOrder.id.value,
        status: paymentOrder.status.value,
        closedAt: paymentOrder.closedAt?.toISOString(),
      };
    } catch (error) {
      this.logger.error(`关闭支付订单失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 转换为支付订单响应DTO
   */
  private toPaymentOrderResponse(paymentOrder: PaymentOrderAggregate): PaymentOrderResponseDto {
    return {
      paymentOrderId: paymentOrder.id.value,
      merchantOrderId: paymentOrder.merchantOrderId,
      amount: paymentOrder.amount.amount,
      currency: paymentOrder.amount.currency,
      paymentMethod: paymentOrder.paymentMethod.value,
      status: paymentOrder.status,
      paymentUrl: paymentOrder.paymentUrl,
      qrCode: paymentOrder.qrCode,
      expireTime: paymentOrder.expireTime?.toISOString(),
      createdAt: paymentOrder.createdAt.toISOString(),
    };
  }

  /**
   * 转换为支付状态响应DTO
   */
  private toPaymentStatusResponse(paymentOrder: PaymentOrderAggregate): PaymentStatusResponseDto {
    return {
      paymentOrderId: (paymentOrder.id as any).value,
      merchantOrderId: paymentOrder.merchantOrderId,
      amount: paymentOrder.amount.amount,
      currency: paymentOrder.amount.currency,
      paymentMethod: paymentOrder.paymentMethod.value,
      status: paymentOrder.status,
      paidAmount: paymentOrder.paidAmount?.amount,
      paidAt: paymentOrder.paidAt?.toISOString(),
      failureReason: paymentOrder.failureReason,
      createdAt: paymentOrder.createdAt.toISOString(),
      updatedAt: (paymentOrder as any).updatedAt.toISOString(),
    };
  }
}
