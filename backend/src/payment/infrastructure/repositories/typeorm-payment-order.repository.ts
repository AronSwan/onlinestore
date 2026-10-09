import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, Payment as PaymentEntity } from '../../entities/payment.entity';
import {
  PaymentOrderAggregate,
  PaymentStatus,
  RefundAggregate,
  RefundStatus,
} from '../../domain/aggregates/payment-order.aggregate';
import { PaymentOrderId } from '../../domain/value-objects/payment-order-id.value-object';
import { Money } from '../../domain/value-objects/money.value-object';
import { PaymentMethod } from '../../domain/value-objects/payment-method.value-object';
import { PaymentOrderRepository } from '../../domain/repositories/payment-order.repository';

/**
 * PaymentOrderRepository 的 TypeORM 实现
 *
 * 定调会施工批（2026-10-09）：替换 MockPaymentOrderRepository（内存 Map，重启即失）
 * ——幂等查询恢复真查（mock 恒返 null，幂等路径此前是坏的），统计走真 SQL。
 *
 * 映射决策（与实体列的一一对应，未列字段进 metadata JSON）：
 * - PaymentOrderId.value ↔ paymentId(varchar64)；PaymentOrderId.generate 产 PAY_ 前缀 ≤64 ✓
 * - merchantOrderId ↔ orderId；gatewayOrderId ↔ thirdPartyTransactionId
 * - Money(amount,currency) ↔ amount(decimal,sqlite 读回字符串需 Number())+currency
 * - PaymentMethod VO（大写值）↔ 实体枚举（小写值）——大小写互转，未知值抛错（fail-closed）
 * - domain PaymentStatus（大写）↔ 实体 PaymentStatus（小写）；SUCCEEDED↔success；
 *   CLOSED→cancelled（实体无 closed 值）；REFUNDED/PARTIAL_REFUND 聚合侧无此态，不映射
 * - userId: VO string ↔ 实体 int（Number() 强转，非数字抛明确错——JWT 数字 id 安全）
 * - subject/description/paymentUrl/qrCode/paidAmount/refunds/closedAt → metadata JSON
 * - expireTime ↔ expiredAt；paidAt/failureReason/idempotencyKey 直存
 */
// 实体枚举（小写值）的局部引用类型
type EntityStatus = PaymentEntity['status'];
type EntityMethod = PaymentEntity['method'];

const STATUS_TO_ENTITY: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: 'pending',
  [PaymentStatus.PROCESSING]: 'processing',
  [PaymentStatus.SUCCEEDED]: 'success',
  [PaymentStatus.FAILED]: 'failed',
  [PaymentStatus.CANCELLED]: 'cancelled',
  [PaymentStatus.EXPIRED]: 'expired',
  // 实体无 closed 值：CLOSED 落库为 cancelled（关闭=取消语义）
  [PaymentStatus.CLOSED]: 'cancelled',
};

const STATUS_TO_DOMAIN: Record<string, PaymentStatus> = {
  pending: PaymentStatus.PENDING,
  processing: PaymentStatus.PROCESSING,
  success: PaymentStatus.SUCCEEDED,
  failed: PaymentStatus.FAILED,
  cancelled: PaymentStatus.CANCELLED,
  expired: PaymentStatus.EXPIRED,
  refunded: PaymentStatus.SUCCEEDED,
  partial_refunded: PaymentStatus.SUCCEEDED,
};

// VO 大写值 → 实体小写值
const METHOD_TO_ENTITY: Record<string, string> = {
  ALIPAY: 'alipay',
  WECHAT: 'wechat',
  UNIONPAY: 'unionpay',
  CREDIT_CARD: 'credit_card',
  BANK_TRANSFER: 'bank_transfer',
  USDT_TRC20: 'usdt_trc20',
  USDT_ERC20: 'usdt_erc20',
  USDT_BEP20: 'usdt_bep20',
  BTC: 'btc',
  ETH: 'eth',
};

const METHOD_TO_DOMAIN: Record<string, string> = Object.fromEntries(
  Object.entries(METHOD_TO_ENTITY).map(([k, v]) => [v, k]),
);

@Injectable()
export class TypeOrmPaymentOrderRepository implements PaymentOrderRepository {
  private readonly logger = new Logger(TypeOrmPaymentOrderRepository.name);

  constructor(
    @InjectRepository(Payment)
    private readonly repository: Repository<Payment>,
  ) {}

  async findById(id: PaymentOrderId): Promise<PaymentOrderAggregate | null> {
    const entity = await this.repository.findOne({
      where: { paymentId: id.value },
    });
    return entity ? this.toAggregate(entity) : null;
  }

  async findByIds(ids: PaymentOrderId[]): Promise<PaymentOrderAggregate[]> {
    if (ids.length === 0) return [];
    const entities = await this.repository.find({
      where: ids.map(i => ({ paymentId: i.value })),
    });
    return entities.map(e => this.toAggregate(e));
  }

  async findByMerchantOrderId(
    merchantOrderId: string,
  ): Promise<PaymentOrderAggregate[]> {
    const entities = await this.repository.find({
      where: { orderId: merchantOrderId },
      order: { createdAt: 'DESC' },
    });
    return entities.map(e => this.toAggregate(e));
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<PaymentOrderAggregate | null> {
    if (!idempotencyKey) return null;
    const entity = await this.repository.findOne({
      where: { idempotencyKey },
      order: { createdAt: 'DESC' },
    });
    return entity ? this.toAggregate(entity) : null;
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ orders: PaymentOrderAggregate[]; total: number }> {
    const numericUserId = this.toNumericUserId(userId);
    const [entities, total] = await this.repository.findAndCount({
      where: { userId: numericUserId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { orders: entities.map(e => this.toAggregate(e)), total };
  }

  async save(paymentOrder: PaymentOrderAggregate): Promise<void> {
    const existing = await this.repository.findOne({
      where: { paymentId: paymentOrder.id.value },
    });

    const metadata: Record<string, any> = {
      ...(existing?.metadata ?? {}),
      subject: paymentOrder.subject,
      description: paymentOrder.description,
      paymentUrl: paymentOrder.paymentUrl,
      qrCode: paymentOrder.qrCode,
    };
    if (paymentOrder.paidAmount) {
      metadata.paidAmount = paymentOrder.paidAmount.amount;
    }
    if (paymentOrder.refunds && paymentOrder.refunds.length > 0) {
      // 退款明细进 metadata（建独立 refunds 表属加表变更，另立动机）
      metadata.refunds = paymentOrder.refunds.map(r => ({
        id: r.id.value,
        amount: r.amount.amount,
        reason: r.reason,
        operatorId: r.operatorId,
        status: r.status,
        gatewayRefundId: r.gatewayRefundId,
        completedAt: r.completedAt,
        createdAt: r.createdAt,
      }));
    }
    if (paymentOrder.closedAt) {
      metadata.closedAt = paymentOrder.closedAt.toISOString();
    }

    const entity: Partial<Payment> = {
      paymentId: paymentOrder.id.value,
      orderId: paymentOrder.merchantOrderId,
      userId: this.toNumericUserId(paymentOrder.userId),
      amount: paymentOrder.amount.amount,
      currency: paymentOrder.amount.currency,
      method: this.methodToEntity(paymentOrder.paymentMethod),
      gateway: 'manual' as Payment['gateway'], // 实体枚举无 direct——策略直连落 manual（渠道语义由 method 承载）
      status: this.statusToEntity(paymentOrder.status),
      thirdPartyTransactionId: paymentOrder.gatewayOrderId ?? null,
      metadata,
      failureReason: paymentOrder.failureReason ?? null,
      paidAt: paymentOrder.paidAt ?? null,
      expiredAt: paymentOrder.expireTime ?? null,
      idempotencyKey: (paymentOrder as { idempotencyKey?: string }).idempotencyKey ?? null,
    };

    if (existing) {
      await this.repository.update({ id: existing.id }, entity);
    } else {
      await this.repository.save(entity as Payment);
    }
  }

  async getStatistics(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalAmount: number;
    totalCount: number;
    successCount: number;
    failedCount: number;
    methodStats: Array<{ method: string; count: number; amount: number }>;
  }> {
    const rows = await this.repository
      .createQueryBuilder('p')
      .select('p.method', 'method')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(p.amount)', 'amount')
      .addSelect(
        `SUM(CASE WHEN p.status = 'success' THEN 1 ELSE 0 END)`,
        'successCount',
      )
      .addSelect(
        `SUM(CASE WHEN p.status = 'failed' THEN 1 ELSE 0 END)`,
        'failedCount',
      )
      .where('p.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('p.method')
      .getRawAndEntities();

    const methodStats: Array<{ method: string; count: number; amount: number }> =
      [];
    let totalCount = 0;
    let successCount = 0;
    let failedCount = 0;
    for (const raw of rows.raw as Array<Record<string, unknown>>) {
      const count = Number(raw.count) || 0;
      methodStats.push({
        method: String(raw.method),
        count,
        amount: Number(raw.amount) || 0,
      });
      totalCount += count;
      successCount += Number(raw.successCount) || 0;
      failedCount += Number(raw.failedCount) || 0;
    }
    const totalAmount = methodStats.reduce((s, m) => s + m.amount, 0);

    return {
      totalAmount,
      totalCount,
      successCount,
      failedCount,
      methodStats,
    };
  }

  // ===== 映射私有方法 =====

  private toAggregate(entity: Payment): PaymentOrderAggregate {
    const metadata = (entity.metadata ?? {}) as Record<string, any>;
    const aggregate = new PaymentOrderAggregate(
      PaymentOrderId.create(entity.paymentId),
      entity.orderId,
      new Money(Number(entity.amount), entity.currency),
      // VO 构造私有（单例实例表），经 value 还原走 (PaymentMethod as any)
      this.methodToDomain(entity.method),
      metadata.subject ?? '',
      String(entity.userId),
      this.statusToDomain(entity.status),
      entity.createdAt ?? new Date(),
      entity.updatedAt ?? new Date(),
      metadata.description,
      metadata.paymentUrl,
      metadata.qrCode,
      entity.thirdPartyTransactionId ?? undefined,
      metadata.paidAmount !== undefined
        ? new Money(Number(metadata.paidAmount), entity.currency)
        : undefined,
      entity.paidAt ?? undefined,
      entity.failureReason ?? undefined,
      entity.expiredAt ?? undefined,
      metadata.closedAt ? new Date(metadata.closedAt) : undefined,
      // W-3 席根因修复:退款明细从 metadata 恢复(原硬编码 []——守卫因数据
      // 失明而形同虚设,且两次退款互相覆盖因每次 reload 后 refunds 恒空)
      this.restoreRefunds(metadata, entity.currency),
    );
    (aggregate as { idempotencyKey?: string }).idempotencyKey = entity.idempotencyKey ?? undefined;
    return aggregate;
  }

  /**
   * 从 metadata 恢复退款明细——save() 写入形状（JSON 序列化后 Date→ISO 串、
   * undefined 键被丢弃）的对称读回。损坏行剔除并告警：写路径唯一（save()），
   * 坏行只可能来自库外手改，不应让附属明细炸掉主单读取。
   */
  private restoreRefunds(
    metadata: Record<string, any>,
    currency: string,
  ): RefundAggregate[] {
    const raw = metadata.refunds;
    if (!Array.isArray(raw) || raw.length === 0) return [];
    const refunds: RefundAggregate[] = [];
    for (const row of raw) {
      const refund = this.tryRestoreRefund(row, currency);
      if (refund) {
        refunds.push(refund);
      } else {
        this.logger.warn(
          `metadata.refunds 损坏行已剔除: ${JSON.stringify(row)}`,
        );
      }
    }
    return refunds;
  }

  private tryRestoreRefund(
    row: unknown,
    currency: string,
  ): RefundAggregate | null {
    if (!row || typeof row !== 'object') return null;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== 'string' || r.id.length === 0) return null;
    const amount = Number(r.amount);
    // Money 自身校验对 NaN 失明（NaN<0 与 |NaN-x|>ε 均为 false）——NaN 入
    // 累计退款算术会让守卫比较恒 false（绕过），必须在此显式拦截
    if (!Number.isFinite(amount) || amount < 0) return null;
    const status = String(r.status ?? '');
    const refundStatus = (
      Object.values(RefundStatus) as string[]
    ).includes(status)
      ? (status as RefundStatus)
      : RefundStatus.PENDING;
    try {
      return new RefundAggregate(
        PaymentOrderId.create(r.id),
        new Money(amount, currency),
        String(r.reason ?? ''),
        String(r.operatorId ?? ''),
        refundStatus,
        r.createdAt ? new Date(String(r.createdAt)) : new Date(),
        r.gatewayRefundId != null ? String(r.gatewayRefundId) : undefined,
        r.completedAt ? new Date(String(r.completedAt)) : undefined,
      );
    } catch {
      // PaymentOrderId VO 校验（长度/字符集）不过的行——同按损坏剔除
      return null;
    }
  }

  private toNumericUserId(userId: string): number {
    const n = Number(userId);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error(`支付订单 userId 非法（须为正整数）: ${userId}`);
    }
    return n;
  }

  private statusToEntity(status: PaymentStatus): EntityStatus {
    const mapped = STATUS_TO_ENTITY[status];
    if (!mapped) {
      throw new Error(`未知支付状态（fail-closed 拒绝落库）: ${status}`);
    }
    return mapped as EntityStatus;
  }

  private statusToDomain(entityStatus: string): PaymentStatus {
    const mapped = STATUS_TO_DOMAIN[entityStatus];
    if (!mapped) {
      throw new Error(`未知实体支付状态: ${entityStatus}`);
    }
    return mapped;
  }

  private methodToEntity(method: PaymentMethod | string): EntityMethod {
    const key =
      typeof method === 'string' ? method : ((method as { value?: string })?.value ?? '');
    const mapped = METHOD_TO_ENTITY[key.toUpperCase()];
    if (!mapped) {
      throw new Error(`未知支付方式（fail-closed 拒绝落库）: ${key}`);
    }
    return mapped as EntityMethod;
  }

  private methodToDomain(entityMethod: string): PaymentMethod {
    const upper = METHOD_TO_DOMAIN[entityMethod];
    if (!upper) {
      throw new Error(`未知实体支付方式: ${entityMethod}`);
    }
    // PaymentMethod VO 的实例表是 static readonly，取对应实例
    const instances: Record<string, PaymentMethod> =
      PaymentMethod as unknown as Record<string, PaymentMethod>;
    const instance = instances[upper];
    if (!instance) {
      throw new Error(`PaymentMethod VO 缺少实例: ${upper}`);
    }
    return instance;
  }
}
