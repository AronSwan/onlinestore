import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, DataSource } from 'typeorm';
import { Payment, PaymentStatus, PaymentMethod, PaymentGateway } from './entities/payment.entity';
import { PaymentStrategy, PaymentRequest } from './strategies/payment-strategy.interface';
import { CreatePaymentDto } from './dto/payment.dto';
import { ConfigService } from '@nestjs/config';
import { RedpandaService } from '../messaging/redpanda.service';
import { Topics } from '../messaging/topics';
import { PaymentSettledEvent, PaymentFailedEvent } from './events/payment.events';
import { PaymentSecurityService } from '../common/security/payment-security.service';
import { LogSanitizerService } from '../common/security/log-sanitizer.service';
import * as crypto from 'crypto';

export interface PaymentStatusResponse {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  method: PaymentMethod;
  gateway: PaymentGateway;
  cryptoAddress?: string | null;
  blockchainTxHash?: string | null;
  paidAt?: Date | null;
  expiredAt?: Date | null;
  createdAt: Date;
  failureReason?: string | null;
}

export interface CreatePaymentResponse {
  paymentId: string;
  redirectUrl?: string;
  qrCode?: string;
  deepLink?: string;
  cryptoAddress?: string | null;
  expiredAt?: Date | null;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly defaultCurrency = 'CNY';
  private readonly defaultExpireMinutes = 30;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @Inject('PAYMENT_STRATEGIES')
    private paymentStrategies: Map<string, PaymentStrategy>,
    private dataSource: DataSource,
    private configService: ConfigService,
    private redpandaService: RedpandaService,
    private paymentSecurity: PaymentSecurityService,
    private logSanitizer: LogSanitizerService,
  ) {
    // 配置已简化，直接使用默认值
  }

  /**
   * 创建支付订单（支持幂等性）
   */
  async createPayment(dto: CreatePaymentDto): Promise<CreatePaymentResponse> {
    // 安全验证
    this.paymentSecurity.validatePaymentRequest(dto);
    this.validateCreatePaymentDto(dto);

    // 幂等性检查
    if (dto.idempotencyKey) {
      const existingPayment = await this.checkIdempotency(dto.idempotencyKey);
      if (existingPayment) {
        this.paymentSecurity.logSecurityEvent('payment.idempotency_hit', {
          paymentId: existingPayment.paymentId,
          orderId: dto.orderId,
          idempotencyKey: dto.idempotencyKey,
        });
        return this.buildCreatePaymentResponse(existingPayment);
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = await this.createPaymentRecord(dto, queryRunner);
      const strategy = this.getPaymentStrategy(dto.method);

      const result = await this.processPaymentWithStrategy(payment, strategy, dto);

      if (result.success) {
        await this.updatePaymentWithResult(payment, result, queryRunner);
        await queryRunner.commitTransaction();

        await this.publishPaymentCreatedEvent(payment);

        return this.buildCreatePaymentResponse(payment);
      } else {
        await this.handlePaymentFailure(payment, result.message, queryRunner);
        await queryRunner.commitTransaction();
        throw new BadRequestException(result.message);
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`创建支付失败: ${dto.orderId}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 查询支付状态
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    if (!paymentId) {
      throw new BadRequestException('支付ID不能为空');
    }

    const payment = await this.paymentRepository.findOne({
      where: { paymentId },
    });

    if (!payment) {
      throw new BadRequestException('支付记录不存在');
    }

    // 如果支付状态为处理中，尝试主动查询第三方状态
    if (payment.status === PaymentStatus.PROCESSING) {
      await this.syncPaymentStatus(payment);
    }

    return this.buildPaymentStatusResponse(payment);
  }

  /**
   * 处理支付回调
   */
  async handlePaymentCallback(method: PaymentMethod, callbackData: any) {
    const strategy = this.getPaymentStrategy(method);

    try {
      const result = await strategy.handleCallback(callbackData);

      if (result.success && result.paymentId) {
        const payment = await this.paymentRepository.findOne({
          where: { paymentId: result.paymentId },
        });

        if (payment) {
          return await this.updatePaymentFromCallback(payment, result);
        } else {
          this.logger.warn(`回调中的支付记录不存在: ${result.paymentId}`);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`处理支付回调失败: ${method}`, error.stack);
      throw new InternalServerErrorException('处理支付回调失败');
    }
  }

  /**
   * 发起退款
   */
  async refundPayment(paymentId: string, amount: number, reason?: string) {
    this.validateRefundParams(paymentId, amount);

    const payment = await this.paymentRepository.findOne({
      where: { paymentId },
    });

    if (!payment) {
      throw new BadRequestException('支付记录不存在');
    }

    this.validateRefundEligibility(payment, amount);

    const strategy = this.getPaymentStrategy(payment.method);

    try {
      const result = await strategy.refund({
        paymentId,
        amount,
        reason,
      });

      if (result.success) {
        await this.updatePaymentWithRefund(payment, amount, result.refundId);
        await this.publishRefundEvent(payment, amount, result.refundId, reason);
        this.logger.log(`退款成功: ${paymentId}, 金额: ${amount}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`退款失败: ${paymentId}`, error.stack);
      throw new InternalServerErrorException('退款处理失败');
    }
  }

  /**
   * 批量查询支付状态
   */
  async batchGetPaymentStatus(paymentIds: string[]): Promise<PaymentStatusResponse[]> {
    if (!paymentIds || paymentIds.length === 0) {
      return [];
    }

    if (paymentIds.length > 100) {
      throw new BadRequestException('批量查询数量不能超过100个');
    }

    const payments = await this.paymentRepository.find({
      where: { paymentId: paymentIds as any },
    });

    return payments.map(payment => this.buildPaymentStatusResponse(payment));
  }

  /**
   * 获取订单的所有支付记录
   */
  async getOrderPayments(orderId: string): Promise<PaymentStatusResponse[]> {
    if (!orderId) {
      throw new BadRequestException('订单ID不能为空');
    }

    const payments = await this.paymentRepository.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });

    return payments.map(payment => this.buildPaymentStatusResponse(payment));
  }

  // 私有方法

  private validateCreatePaymentDto(dto: CreatePaymentDto): void {
    if (!dto.orderId) {
      throw new BadRequestException('订单ID不能为空');
    }
    if (!dto.userId || dto.userId <= 0) {
      throw new BadRequestException('用户ID无效');
    }
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('支付金额必须大于0');
    }
    if (!dto.method) {
      throw new BadRequestException('支付方式不能为空');
    }
  }

  private async checkIdempotency(idempotencyKey: string): Promise<Payment | null> {
    return await this.paymentRepository.findOne({
      where: { idempotencyKey },
    });
  }

  private async createPaymentRecord(
    dto: CreatePaymentDto,
    queryRunner: QueryRunner,
  ): Promise<Payment> {
    const paymentId = this.generatePaymentId();
    const gateway = this.getPaymentGateway(dto.method);

    const payment = queryRunner.manager.create(Payment, {
      paymentId,
      orderId: dto.orderId,
      userId: dto.userId,
      amount: dto.amount,
      currency: dto.currency || this.defaultCurrency,
      method: dto.method,
      gateway,
      status: PaymentStatus.PENDING,
      metadata: dto.metadata,
      idempotencyKey: dto.idempotencyKey || null,
      expiredAt: dto.expireMinutes
        ? new Date(Date.now() + dto.expireMinutes * 60 * 1000)
        : new Date(Date.now() + this.defaultExpireMinutes * 60 * 1000),
    });

    await queryRunner.manager.save(payment);
    return payment;
  }

  private getPaymentStrategy(method: PaymentMethod): PaymentStrategy {
    const strategy = this.paymentStrategies.get(method.toString());
    if (!strategy) {
      throw new BadRequestException(`不支持的支付方式: ${method}`);
    }
    return strategy;
  }

  private async processPaymentWithStrategy(
    payment: Payment,
    strategy: PaymentStrategy,
    dto: CreatePaymentDto,
  ) {
    return await strategy.createPayment({
      orderId: dto.orderId,
      amount: dto.amount,
      currency: dto.currency || this.defaultCurrency,
      userId: dto.userId,
      returnUrl: dto.returnUrl,
      notifyUrl: dto.notifyUrl,
      expireMinutes: dto.expireMinutes || this.defaultExpireMinutes,
      metadata: dto.metadata,
    });
  }

  private async updatePaymentWithResult(
    payment: Payment,
    result: any,
    queryRunner: QueryRunner,
  ): Promise<void> {
    payment.status = PaymentStatus.PROCESSING;
    payment.thirdPartyTransactionId = result.thirdPartyTransactionId || null;
    payment.cryptoAddress = result.cryptoAddress || null;
    payment.metadata = {
      ...payment.metadata,
      redirectUrl: result.redirectUrl,
      qrCode: result.qrCode,
      deepLink: result.deepLink,
    };

    if (result.expiredAt) {
      payment.expiredAt = result.expiredAt;
    }

    await queryRunner.manager.save(payment);
  }

  private async handlePaymentFailure(
    payment: Payment,
    message: string | undefined,
    queryRunner: QueryRunner,
  ): Promise<void> {
    payment.status = PaymentStatus.FAILED;
    payment.failureReason = message || '支付失败';
    await queryRunner.manager.save(payment);
  }

  private buildCreatePaymentResponse(payment: Payment): CreatePaymentResponse {
    return {
      paymentId: payment.paymentId,
      redirectUrl: payment.metadata?.redirectUrl,
      qrCode: payment.metadata?.qrCode,
      deepLink: payment.metadata?.deepLink,
      cryptoAddress: payment.cryptoAddress,
      expiredAt: payment.expiredAt,
    };
  }

  private buildPaymentStatusResponse(payment: Payment): PaymentStatusResponse {
    return {
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      gateway: payment.gateway,
      cryptoAddress: payment.cryptoAddress,
      blockchainTxHash: payment.blockchainTxHash,
      paidAt: payment.paidAt,
      expiredAt: payment.expiredAt,
      createdAt: payment.createdAt,
      failureReason: payment.failureReason,
    };
  }

  private async updatePaymentFromCallback(payment: Payment, result: any) {
    // 使用数据库事务确保状态更新和事件发布的原子性
    return await this.paymentRepository.manager.transaction(async manager => {
      // 防止重复处理
      if (payment.status === PaymentStatus.SUCCESS && result.status === 'success') {
        this.logger.log(`支付回调重复处理: ${payment.paymentId}`);
        return { success: true, message: '支付已完成' };
      }

      const oldStatus = payment.status;
      payment.status = result.status as PaymentStatus;
      payment.blockchainTxHash = result.blockchainTxHash || null;

      if (result.status === 'success' && !payment.paidAt) {
        payment.paidAt = result.paidAt || new Date();
      }

      // 在事务内保存支付状态
      await manager.save(payment);

      // 在事务内发布事件，确保一致性
      await this.publishPaymentStatusChangedEventInTransaction(payment, oldStatus, manager);

      this.logger.log(`支付状态更新: ${payment.paymentId} ${oldStatus} -> ${payment.status}`);
      return { success: true, message: '回调处理成功' };
    });
  }

  private validateRefundParams(paymentId: string, amount: number): void {
    if (!paymentId) {
      throw new BadRequestException('支付ID不能为空');
    }
    if (!amount || amount <= 0) {
      throw new BadRequestException('退款金额必须大于0');
    }
  }

  private validateRefundEligibility(payment: Payment, amount: number): void {
    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException('只有成功的支付才能退款');
    }

    const totalRefunded = payment.refundedAmount || 0;
    if (amount > payment.amount - totalRefunded) {
      throw new BadRequestException('退款金额不能超过可退款金额');
    }
  }

  private async updatePaymentWithRefund(
    payment: Payment,
    amount: number,
    refundId?: string | null,
  ): Promise<void> {
    const totalRefunded = (payment.refundedAmount || 0) + amount;

    payment.status =
      totalRefunded >= payment.amount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIAL_REFUNDED;
    payment.refundedAmount = totalRefunded;
    payment.refundId = refundId || null;
    payment.refundedAt = new Date();

    await this.paymentRepository.save(payment);
  }

  /**
   * 同步支付状态
   */
  private async syncPaymentStatus(payment: Payment): Promise<void> {
    try {
      const strategy = this.getPaymentStrategy(payment.method);
      const result = await strategy.queryPayment(payment.paymentId);

      if (result.status !== payment.status) {
        const oldStatus = payment.status;
        payment.status = result.status as PaymentStatus;

        if (result.paidAt && !payment.paidAt) {
          payment.paidAt = result.paidAt;
        }

        if (result.blockchainTxHash) {
          payment.blockchainTxHash = result.blockchainTxHash;
        }

        await this.paymentRepository.save(payment);

        await this.publishPaymentStatusSyncedEvent(payment, oldStatus);

        this.logger.log(`支付状态同步: ${payment.paymentId} ${oldStatus} -> ${payment.status}`);
      }
    } catch (error) {
      this.logger.error(`同步支付状态失败: ${payment.paymentId}`, error.stack);
    }
  }

  /**
   * 获取支付网关
   */
  private getPaymentGateway(method: PaymentMethod): PaymentGateway {
    const cryptoMethods = [
      PaymentMethod.USDT_TRC20,
      PaymentMethod.USDT_ERC20,
      PaymentMethod.USDT_BEP20,
      PaymentMethod.BTC,
      PaymentMethod.ETH,
    ];

    if (cryptoMethods.includes(method)) {
      return PaymentGateway.CRYPTO;
    }

    return PaymentGateway.GOPAY;
  }

  /**
   * 生成支付ID
   */
  private generatePaymentId(): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `PAY_${timestamp}_${random}`;
  }

  // 事件发布方法（简化版，使用日志记录）

  private async publishPaymentCreatedEvent(payment: Payment): Promise<void> {
    this.logger.log(`支付事件: payment.created - ${payment.paymentId}`);
    // 支付创建暂不发布到消息队列，只记录日志
  }

  private async publishPaymentStatusChangedEvent(
    payment: Payment,
    oldStatus: PaymentStatus,
  ): Promise<void> {
    this.logger.log(
      `支付事件: payment.status_changed - ${payment.paymentId} ${oldStatus} -> ${payment.status}`,
    );

    try {
      if (payment.status === PaymentStatus.SUCCESS) {
        // 发布支付成功事件
        const event: PaymentSettledEvent = {
          paymentId: payment.paymentId,
          orderId: payment.orderId,
          userId: payment.userId,
          amount: payment.amount,
          method: payment.method,
          settledAt: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        };

        await this.redpandaService.publish({
          topic: Topics.PaymentSettled,
          key: payment.paymentId,
          value: event,
        });

        this.logger.log(`支付成功事件已发布: ${payment.paymentId}`);
      } else if (payment.status === PaymentStatus.FAILED) {
        // 发布支付失败事件
        const event: PaymentFailedEvent = {
          paymentId: payment.paymentId,
          orderId: payment.orderId,
          userId: payment.userId,
          amount: payment.amount,
          method: payment.method,
          reason: payment.failureReason || '支付失败',
          failedAt: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        };

        await this.redpandaService.publish({
          topic: Topics.PaymentFailed,
          key: payment.paymentId,
          value: event,
        });

        this.logger.log(`支付失败事件已发布: ${payment.paymentId}`);
      }
    } catch (error) {
      this.logger.error(`发布支付状态变更事件失败: ${payment.paymentId}`, error.stack);
      // 不抛出错误，避免影响主流程
    }
  }

  // 在事务内发布事件的方法
  private async publishPaymentStatusChangedEventInTransaction(
    payment: Payment,
    oldStatus: PaymentStatus,
    manager: any,
  ): Promise<void> {
    this.logger.log(
      `支付事件: payment.status_changed - ${payment.paymentId} ${oldStatus} -> ${payment.status}`,
    );

    try {
      if (payment.status === PaymentStatus.SUCCESS) {
        // 发布支付成功事件
        const event: PaymentSettledEvent = {
          paymentId: payment.paymentId,
          orderId: payment.orderId,
          userId: payment.userId,
          amount: payment.amount,
          method: payment.method,
          settledAt: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        };

        await this.redpandaService.publish({
          topic: Topics.PaymentSettled,
          key: payment.paymentId,
          value: event,
        });

        this.logger.log(`支付成功事件已发布: ${payment.paymentId}`);
      } else if (payment.status === PaymentStatus.FAILED) {
        // 发布支付失败事件
        const event: PaymentFailedEvent = {
          paymentId: payment.paymentId,
          orderId: payment.orderId,
          userId: payment.userId,
          amount: payment.amount,
          method: payment.method,
          reason: payment.failureReason || '支付失败',
          failedAt: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        };

        await this.redpandaService.publish({
          topic: Topics.PaymentFailed,
          key: payment.paymentId,
          value: event,
        });

        this.logger.log(`支付失败事件已发布: ${payment.paymentId}`);
      }
    } catch (error) {
      this.logger.error(`发布支付状态变更事件失败: ${payment.paymentId}`, error.stack);
      // 在事务内，如果事件发布失败，记录错误但不回滚事务
      // 因为支付状态已经更新，事件可以后续通过补偿机制重试
    }
  }

  private async publishPaymentStatusSyncedEvent(
    payment: Payment,
    oldStatus: PaymentStatus,
  ): Promise<void> {
    this.logger.log(
      `支付事件: payment.status_synced - ${payment.paymentId} ${oldStatus} -> ${payment.status}`,
    );
    // 状态同步事件复用状态变更事件逻辑
    await this.publishPaymentStatusChangedEvent(payment, oldStatus);
  }

  private async publishRefundEvent(
    payment: Payment,
    refundAmount: number,
    refundId?: string | null,
    reason?: string,
  ): Promise<void> {
    this.logger.log(`支付事件: payment.refunded - ${payment.paymentId} 退款金额: ${refundAmount}`);

    try {
      // 发布退款事件（可以复用支付失败事件结构，或创建新的退款事件类型）
      const event: PaymentFailedEvent = {
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        userId: payment.userId,
        amount: refundAmount,
        method: payment.method,
        reason: reason || '退款处理',
        failedAt: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      };

      await this.redpandaService.publish({
        topic: Topics.PaymentFailed, // 或者创建专门的退款主题
        key: payment.paymentId,
        value: event,
      });

      this.logger.log(`退款事件已发布: ${payment.paymentId}`);
    } catch (error) {
      this.logger.error(`发布退款事件失败: ${payment.paymentId}`, error.stack);
      // 不抛出错误，避免影响主流程
    }
  }
}
