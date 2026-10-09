import { Injectable, Logger, Inject, ForbiddenException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrdersService } from '../../../orders/orders.service';
import { runExclusiveWrite } from '../../../common/db-write-mutex';

// Domain
import {
  PaymentOrderAggregate,
  RefundAggregate,
} from '../../domain/aggregates/payment-order.aggregate';
import { PaymentOrderRepository } from '../../domain/repositories/payment-order.repository';
import { PaymentGatewayFactory } from '../../domain/services/payment-gateway.factory';
import { PaymentRiskService } from '../../domain/services/payment-risk.service';
import {
  RefundCurrencyMismatchError,
  RefundNotAllowedError,
  RefundOverpaidError,
} from '../../domain/errors/refund.errors';
import {
  PaymentAlreadySucceededError,
  PaymentCloseNotAllowedError,
  PaymentFailedAfterSuccessError,
} from '../../domain/errors/payment-transition.errors';

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
/**
 * 三类支付上下文(挂账#3 接线批类型化):controller 构造的真实形状分别定义
 */
export interface PaymentCallbackContext {
  paymentMethod: PaymentMethod;
  signature?: string;
  timestamp?: string;
  clientIp?: string;
  userAgent?: string;
  rawBody?: unknown;
}

export interface PaymentRequestContext {
  userId?: number | string;
  idempotencyKey?: string;
  clientIp?: string;
  userAgent?: string;
  notifyUrl?: string;
  returnUrl?: string;
}

export interface PaymentRefundContext {
  userId?: number | string;
  operatorId?: string;
  reason?: string;
}

@Injectable()
export class PaymentApplicationService {
  private readonly logger = new Logger(PaymentApplicationService.name);

  constructor(
    @Inject('PaymentOrderRepository')
    private readonly paymentOrderRepository: PaymentOrderRepository,
    private readonly paymentGatewayFactory: PaymentGatewayFactory,
    private readonly paymentRiskService: PaymentRiskService,
    private readonly eventEmitter: EventEmitter2,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * 创建支付订单
   */
  async createPaymentOrder(
    dto: CreatePaymentOrderDto,
    context: PaymentRequestContext,
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
        userId: String(context.userId ?? ''),
        clientIp: String(context.clientIp ?? ''),
        userAgent: String(context.userAgent ?? ''),
        idempotencyKey: context.idempotencyKey ? String(context.idempotencyKey) : undefined,
        notifyUrl: dto.notifyUrl,
        returnUrl: dto.returnUrl,
        expireTime: dto.expireTime ? new Date(dto.expireTime) : undefined,
        extraParams: dto.extraParams,
      });

      // 2. 幂等性检查
      if (context.idempotencyKey) {
        const existingOrder = await this.paymentOrderRepository.findByIdempotencyKey(
          String(context.idempotencyKey),
        );
        if (existingOrder) {
          this.logger.log(`幂等性检查：返回已存在的订单 ${existingOrder.id.value}`);
          return this.toPaymentOrderResponse(existingOrder);
        }
      }

      // 2.5 金额校验(W-3④):商户订单号解析到站内订单时,支付金额必须与
      // 订单总额精确相等(最小单位零容差)——防任意金额支付刷单;外部商户号
      // (解析不到站内单)是开放契约,放行
      const internalOrder = await this.ordersService.findOrderByMerchantOrderId(
        dto.merchantOrderId,
      );
      if (internalOrder) {
        const expectedMinor = Math.round(
          Number(internalOrder.totalAmount) * Math.pow(10, 2), // 站内单 decimal(10,2) 单币种,2位小数口径
        );
        const currencyOk = dto.currency === OrdersService.ORDER_DEFAULT_CURRENCY;
        const requestedMinor = command.amount.toMinorUnits();
        if (!currencyOk || requestedMinor !== expectedMinor) {
          throw new ConflictException(
            `支付金额与订单不符（订单 ${internalOrder.orderNumber} 总额 ` +
              `${internalOrder.totalAmount} ${OrdersService.ORDER_DEFAULT_CURRENCY}，` +
              `本次请求 ${dto.amount} ${dto.currency}）`,
          );
        }
      }

      // 3. 风险检测
      const riskResult = await this.paymentRiskService.assessRisk({
        userId: String(context.userId ?? ''),
        amount: command.amount,
        paymentMethod: command.paymentMethod,
        clientIp: String(context.clientIp ?? ''),
        userAgent: String(context.userAgent ?? ''),
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
        String(context.userId ?? ''),
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
    context: PaymentCallbackContext,
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
        data: (dto.rawData ?? dto) as Record<string, unknown>,
        timestamp: context.timestamp,
      });

      if (!isValidSignature) {
        this.logger.warn(`支付回调签名验证失败: ${dto.outTradeNo}`);
        return { success: false, message: 'INVALID_SIGNATURE' };
      }

      // 3+4+5. 排他读改写后发事件（W-3⑤⑥）
      // - 互斥:支付真仓储激活即接入 runExclusiveWrite(M3 批义务——sqlite 单
      //   连接并发写段交叉=悬挂事务);查改存整段入队
      // - 先落库后发事件:监听器失败不再影响支付态持久化;监听器在互斥外执行
      //   (其自身写经同一队列,嵌套=自锁死)
      // - 幂等:域守卫挡重放,changed=false 不落库不重发事件
      type CallbackOutcome =
        | { kind: 'not_found' }
        | { kind: 'noop' }
        | { kind: 'changed'; eventName: 'payment.succeeded' | 'payment.failed'; event: unknown };

      let outcome: CallbackOutcome;
      try {
        outcome = await runExclusiveWrite<CallbackOutcome>(async () => {
          const paymentOrders = await this.paymentOrderRepository.findByMerchantOrderId(
            dto.outTradeNo,
          );
          const paymentOrder =
            paymentOrders.length > 0 ? (paymentOrders[0] as PaymentOrderAggregate) : null;
          if (!paymentOrder) {
            return { kind: 'not_found' as const };
          }

          const isSuccess = gateway.isPaymentSuccess(dto.tradeStatus);
          if (isSuccess) {
            const changed = paymentOrder.markAsSucceeded(
              dto.gatewayOrderId,
              Money.create(dto.receiptAmount || 0, paymentOrder.amount.currency),
              command.gmtPayment,
            );
            if (!changed) {
              return { kind: 'noop' as const };
            }
            await this.paymentOrderRepository.save(paymentOrder);
            return {
              kind: 'changed' as const,
              eventName: 'payment.succeeded' as const,
              event: new PaymentSucceededEvent(
                paymentOrder.id.value,
                paymentOrder.merchantOrderId,
                dto.receiptAmount || 0,
                paymentOrder.amount.currency,
                dto.gatewayOrderId,
              ),
            };
          }

          const failureReason = gateway.getFailureReason(dto.tradeStatus);
          const changed = paymentOrder.markAsFailed(failureReason);
          if (!changed) {
            return { kind: 'noop' as const };
          }
          await this.paymentOrderRepository.save(paymentOrder);
          return {
            kind: 'changed' as const,
            eventName: 'payment.failed' as const,
            event: new PaymentFailedEvent(
              paymentOrder.id.value,
              paymentOrder.merchantOrderId,
              failureReason,
            ),
          };
        });
      } catch (e) {
        if (
          e instanceof PaymentAlreadySucceededError ||
          e instanceof PaymentFailedAfterSuccessError
        ) {
          // 状态冲突:首写胜出——ACK 网关停止重试,告警留痕
          this.logger.warn(`支付回调状态冲突(首写胜出): ${e.message}`);
          return { success: true, message: 'STATE_CONFLICT_ACK' };
        }
        throw e;
      }

      if (outcome.kind === 'not_found') {
        this.logger.warn(`支付订单不存在: ${dto.outTradeNo}`);
        return { success: false, message: 'ORDER_NOT_FOUND' };
      }

      if (outcome.kind === 'changed') {
        this.eventEmitter.emit(outcome.eventName, outcome.event);
      }

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
    context: PaymentRefundContext,
  ): Promise<{ refundId: string; status: string; refundAmount: number }> {
    this.logger.log(`创建退款开始: ${dto.paymentOrderId}`);

    try {
      // 1. 构建退款命令
      const command = CreateRefundCommand.create({
        paymentOrderId: PaymentOrderId.create(dto.paymentOrderId),
        refundAmount: Money.create(dto.refundAmount, dto.currency),
        reason: dto.reason,
        operatorId: String(context.userId ?? 'system'),
      });

      // 2. 查找支付订单
      const paymentOrder = await this.paymentOrderRepository.findById(command.paymentOrderId);
      if (!paymentOrder) {
        throw new Error('支付订单不存在');
      }

      // 3. 创建退款（域守卫:状态/币种/累计占额——域错误翻 409,业务拒绝不再冒充 500）
      let refund: RefundAggregate;
      try {
        refund = paymentOrder.createRefund(
          command.refundAmount,
          command.reason,
          command.operatorId,
        );
      } catch (e) {
        if (
          e instanceof RefundNotAllowedError ||
          e instanceof RefundCurrencyMismatchError ||
          e instanceof RefundOverpaidError
        ) {
          throw new ConflictException(e.message);
        }
        throw e;
      }

      // 4. 调用支付网关退款接口
      const gateway = this.paymentGatewayFactory.createGateway(paymentOrder.paymentMethod);
      const gatewayResult = await gateway.createRefund({
        paymentOrderId: paymentOrder.id.value,
        gatewayOrderId: paymentOrder.gatewayOrderId ?? '',
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
        status: refund.status,
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
  async syncPaymentOrderStatus(
    paymentOrderId: PaymentOrderId,
    requesterId?: string,
  ): Promise<PaymentStatusResponseDto> {
    this.logger.log(`同步支付订单状态: ${paymentOrderId.value}`);

    try {
      // 1. 查找支付订单
      const paymentOrder = await this.paymentOrderRepository.findById(paymentOrderId);
      // 双盲A2席 P1:归属校验——非本人订单的 sync 一律 403(原可跨用户改写状态)
      if (requesterId && paymentOrder && paymentOrder.userId !== requesterId) {
        throw new ForbiddenException('只能同步本人支付订单');
      }
      if (!paymentOrder) {
        throw new Error('支付订单不存在');
      }

      // 2. 调用支付网关查询接口
      const gateway = this.paymentGatewayFactory.createGateway(paymentOrder.paymentMethod);
      const gatewayStatus = await gateway.queryPaymentStatus({
        paymentOrderId: paymentOrder.id.value,
        gatewayOrderId: paymentOrder.gatewayOrderId ?? '',
      });

      // 3. 更新本地状态(排他写段+落库后发事件——与回调路径同时序契约,W-3⑤:
      // 原同步路径发现成功却从不发 payment.succeeded,订单回写监听对它失明)
      if (gatewayStatus.isSuccess && !paymentOrder.isSucceeded()) {
        let changed: boolean;
        try {
          changed = await runExclusiveWrite(async () => {
            const c = paymentOrder.markAsSucceeded(
              gatewayStatus.gatewayOrderId,
              Money.create(gatewayStatus.paidAmount, paymentOrder.amount.currency),
              gatewayStatus.paidAt,
            );
            if (c) {
              await this.paymentOrderRepository.save(paymentOrder);
            }
            return c;
          });
        } catch (e) {
          if (e instanceof PaymentAlreadySucceededError) {
            // 读改写窗口内被回调先写——同步端点是用户请求,翻 409 而非 ACK
            throw new ConflictException(e.message);
          }
          throw e;
        }
        if (changed) {
          this.eventEmitter.emit(
            'payment.succeeded',
            new PaymentSucceededEvent(
              paymentOrder.id.value,
              paymentOrder.merchantOrderId,
              gatewayStatus.paidAmount,
              paymentOrder.amount.currency,
              gatewayStatus.gatewayOrderId,
            ),
          );
        }
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

      // 2. 关闭订单(域守卫:已成功的单不可关闭——收款态不可抹成 cancelled)
      try {
        paymentOrder.close(operatorId);
      } catch (e) {
        if (e instanceof PaymentCloseNotAllowedError) {
          throw new ConflictException(e.message);
        }
        throw e;
      }

      // 3. 调用支付网关关闭接口
      const gateway = this.paymentGatewayFactory.createGateway(paymentOrder.paymentMethod);
      await gateway.closePayment({
        paymentOrderId: paymentOrder.id.value,
        gatewayOrderId: paymentOrder.gatewayOrderId ?? '',
      });

      // 4. 保存更新
      await this.paymentOrderRepository.save(paymentOrder);

      this.logger.log(`支付订单关闭成功: ${paymentOrderId.value}`);
      return {
        paymentOrderId: paymentOrder.id.value,
        status: paymentOrder.status as string,
        closedAt: paymentOrder.closedAt ? paymentOrder.closedAt.toISOString() : '',
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
      paymentOrderId: paymentOrder.id.value,
      merchantOrderId: paymentOrder.merchantOrderId,
      amount: paymentOrder.amount.amount,
      currency: paymentOrder.amount.currency,
      paymentMethod: paymentOrder.paymentMethod.value,
      status: paymentOrder.status,
      paidAmount: paymentOrder.paidAmount?.amount,
      paidAt: paymentOrder.paidAt?.toISOString(),
      failureReason: paymentOrder.failureReason,
      createdAt: paymentOrder.createdAt.toISOString(),
      updatedAt: paymentOrder.updatedAt.toISOString(),
    };
  }
}
