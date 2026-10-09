import { DataSource, Repository } from 'typeorm';
import { Payment } from '../../entities/payment.entity';
import {
  PaymentOrderAggregate,
  PaymentStatus,
  RefundStatus,
} from '../../domain/aggregates/payment-order.aggregate';
import { PaymentOrderId } from '../../domain/value-objects/payment-order-id.value-object';
import { Money } from '../../domain/value-objects/money.value-object';
import { PaymentMethod } from '../../domain/value-objects/payment-method.value-object';
import { RefundOverpaidError } from '../../domain/errors/refund.errors';
import { TypeOrmPaymentOrderRepository } from './typeorm-payment-order.repository';

/**
 * 退款明细持久化往返（W-3 根因修复的回归锚）
 *
 * 病灶：toAggregate 原硬编码 refunds=[]——读回失明导致
 * ①退款累计守卫无数据可用 ②重载后第二次 save 只带新退款、旧退款被覆盖丢失。
 * 本套件锁死 save()↔restoreRefunds() 的形状对称。
 */
describe('TypeOrmPaymentOrderRepository 退款明细往返', () => {
  let dataSource: DataSource;
  let repo: TypeOrmPaymentOrderRepository;
  let rawRepo: Repository<Payment>;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [Payment],
      synchronize: true,
    });
    await dataSource.initialize();
    rawRepo = dataSource.getRepository(Payment);
    repo = new TypeOrmPaymentOrderRepository(rawRepo);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const buildSucceededOrder = (): PaymentOrderAggregate => {
    const order = new PaymentOrderAggregate(
      PaymentOrderId.create('PAY_ROUNDTRIP_0001'),
      'ORD-RT-1',
      new Money(100.5, 'CNY'),
      PaymentMethod.ALIPAY,
      '往返测试订单',
      '42',
      PaymentStatus.SUCCEEDED,
    );
    order.markAsSucceeded('GW-RT-1', new Money(100.5, 'CNY'), new Date('2026-10-09T10:00:00Z'));
    return order;
  };

  it('退款全字段经 JSON 列往返保真', async () => {
    const order = buildSucceededOrder();
    const refund = order.createRefund(new Money(30.25, 'CNY'), '尺寸不符', 'admin-1');
    refund.updateGatewayInfo('RFD-GW-001');
    refund.markAsSucceeded();
    await repo.save(order);

    const reloaded = await repo.findById(order.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.refunds).toHaveLength(1);
    const r = reloaded!.refunds[0];
    expect(r.id.value).toBe(refund.id.value);
    expect(r.amount.amount).toBe(30.25);
    expect(r.amount.currency).toBe('CNY');
    expect(r.reason).toBe('尺寸不符');
    expect(r.operatorId).toBe('admin-1');
    expect(r.status).toBe(RefundStatus.SUCCEEDED);
    expect(r.gatewayRefundId).toBe('RFD-GW-001');
    expect(r.completedAt).toBeInstanceOf(Date);
  });

  it('重载后再退第二笔：两笔共存不互覆（原病灶回归锚）', async () => {
    const order = buildSucceededOrder();
    order.createRefund(new Money(10, 'CNY'), '第一笔', 'admin-1');
    await repo.save(order);

    // 重载（原实现此处 refunds=[] → 下面第二笔 save 时第一笔被覆盖丢失）
    const reloaded = await repo.findById(order.id);
    expect(reloaded!.refunds).toHaveLength(1);
    reloaded!.createRefund(new Money(20, 'CNY'), '第二笔', 'admin-1');
    await repo.save(reloaded!);

    const final = await repo.findById(order.id);
    expect(final!.refunds).toHaveLength(2);
    expect(final!.refunds.map(r => r.reason).sort()).toEqual(['第一笔', '第二笔']);
  });

  it('metadata 损坏行剔除、合法行保留、主单可读', async () => {
    const order = buildSucceededOrder();
    await repo.save(order);
    const entity = await rawRepo.findOneOrFail({ where: { paymentId: order.id.value } });
    // 模拟库外手改：三行垃圾 + 一行合法
    entity.metadata = {
      ...entity.metadata,
      refunds: [
        null,
        { no: 'shape' },
        { id: 'short', amount: 1 }, // id 不过 VO 校验（<8位）
        { id: 'PAY_VALIDREF_0001', amount: 'abc', reason: 'NaN金额' }, // Money 失明的 NaN
        { id: 'PAY_VALIDREF_0002', amount: 5, reason: '合法行', operatorId: 'op', status: 'SUCCEEDED', createdAt: '2026-10-09T08:00:00.000Z' },
      ],
    };
    await rawRepo.save(entity);

    const reloaded = await repo.findById(order.id);
    expect(reloaded).not.toBeNull(); // 主单不被附属明细炸掉
    expect(reloaded!.refunds).toHaveLength(1);
    expect(reloaded!.refunds[0].reason).toBe('合法行');
    expect(reloaded!.refunds[0].amount.amount).toBe(5);
    expect(reloaded!.refunds[0].status).toBe(RefundStatus.SUCCEEDED);
  });

  it('守卫不因重载失明:持久化在途退款占额（原病灶端到端锚）', async () => {
    const order = buildSucceededOrder();
    order.createRefund(new Money(100.5, 'CNY'), '全额在途', 'admin-1'); // 实付全额
    await repo.save(order);

    // 原实现:重载 refunds=[] → 累计守卫看不见在途款 → 超退放行
    const reloaded = await repo.findById(order.id);
    expect(() =>
      reloaded!.createRefund(new Money(0.01, 'CNY'), '超额尝试', 'admin-1'),
    ).toThrow(RefundOverpaidError);
  });
});
