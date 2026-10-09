import { PaymentOrderAggregate, PaymentStatus, RefundStatus } from './payment-order.aggregate';
import { PaymentOrderId } from '../value-objects/payment-order-id.value-object';
import { Money } from '../value-objects/money.value-object';
import { PaymentMethod } from '../value-objects/payment-method.value-object';
import {
  RefundCurrencyMismatchError,
  RefundNotAllowedError,
  RefundOverpaidError,
} from '../errors/refund.errors';
import {
  PaymentAlreadySucceededError,
  PaymentCloseNotAllowedError,
  PaymentFailedAfterSuccessError,
} from '../errors/payment-transition.errors';

/**
 * createRefund 守卫矩阵（W-3 席根因批）
 * 原状：仅 status 一道闸且抛裸 Error(→500),无累计金额守卫——
 * 退款可无限叠加超过实付金额。
 */
describe('PaymentOrderAggregate.createRefund 守卫', () => {
  const buildPaid = (): PaymentOrderAggregate => {
    const order = new PaymentOrderAggregate(
      PaymentOrderId.create('PAY_GUARDTEST_001'),
      'ORD-G-1',
      new Money(100, 'CNY'),
      PaymentMethod.ALIPAY,
      '守卫测试',
      '7',
      PaymentStatus.PENDING,
    );
    order.markAsSucceeded('GW-G-1', new Money(100, 'CNY'), new Date('2026-10-09T10:00:00Z'));
    return order;
  };

  it('非 SUCCEEDED 订单拒绝（RefundNotAllowedError）', () => {
    const order = new PaymentOrderAggregate(
      PaymentOrderId.create('PAY_GUARDTEST_002'),
      'ORD-G-2',
      new Money(100, 'CNY'),
      PaymentMethod.ALIPAY,
      's',
      '7',
      PaymentStatus.PENDING,
    );
    expect(() => order.createRefund(new Money(10, 'CNY'), 'r', 'op')).toThrow(
      RefundNotAllowedError,
    );
  });

  it('退款币种≠订单币种拒绝（RefundCurrencyMismatchError）', () => {
    const order = buildPaid();
    expect(() => order.createRefund(new Money(10, 'USD'), 'r', 'op')).toThrow(
      RefundCurrencyMismatchError,
    );
  });

  it('累计不超可退:60+40=100 恰满放行', () => {
    const order = buildPaid();
    order.createRefund(new Money(60, 'CNY'), 'r1', 'op');
    expect(() => order.createRefund(new Money(40, 'CNY'), 'r2', 'op')).not.toThrow();
  });

  it('累计超可退拒绝（RefundOverpaidError）——浮点尾差不误伤', () => {
    // 实付 0.3:两笔 0.1+0.2 浮点直加=0.30000000000000004>0.3,朴素浮点守卫会误拒;
    // 最小单位口径 10+20=30=可退,恰满放行
    const order = new PaymentOrderAggregate(
      PaymentOrderId.create('PAY_GUARDTEST_005'),
      'ORD-G-5',
      new Money(0.3, 'CNY'),
      PaymentMethod.ALIPAY,
      's',
      '7',
      PaymentStatus.PENDING,
    );
    order.markAsSucceeded('GW-G-5', new Money(0.3, 'CNY'), new Date('2026-10-09T10:00:00Z'));
    order.createRefund(new Money(0.1, 'CNY'), 'r1', 'op');
    expect(() => order.createRefund(new Money(0.2, 'CNY'), 'r2', 'op')).not.toThrow();
    // 真超额
    expect(() => order.createRefund(new Money(0.01, 'CNY'), 'r3', 'op')).toThrow(
      RefundOverpaidError,
    );
  });

  it('在途(PENDING)退款占额:已占 100 后不再放行', () => {
    const order = buildPaid();
    order.createRefund(new Money(100, 'CNY'), '全额在途', 'op');
    expect(() => order.createRefund(new Money(0.01, 'CNY'), '再来', 'op')).toThrow(
      RefundOverpaidError,
    );
  });

  it('FAILED 退款释放占额', () => {
    const order = buildPaid();
    const r1 = order.createRefund(new Money(100, 'CNY'), '会失败', 'op');
    r1.markAsFailed();
    expect(() => order.createRefund(new Money(100, 'CNY'), '重退', 'op')).not.toThrow();
    expect(order.refunds.filter(r => r.status === RefundStatus.FAILED)).toHaveLength(1);
  });

  it('余额基准=实付金额(paidAmount)而非订单金额', () => {
    const order = new PaymentOrderAggregate(
      PaymentOrderId.create('PAY_GUARDTEST_003'),
      'ORD-G-3',
      new Money(100, 'CNY'),
      PaymentMethod.ALIPAY,
      's',
      '7',
      PaymentStatus.PENDING,
    );
    // 实付 80(部分支付场景):可退上限 80 而非 100
    order.markAsSucceeded('GW-G-3', new Money(80, 'CNY'), new Date('2026-10-09T10:00:00Z'));
    expect(() => order.createRefund(new Money(80, 'CNY'), 'r', 'op')).not.toThrow();
    const fresh = new PaymentOrderAggregate(
      PaymentOrderId.create('PAY_GUARDTEST_004'),
      'ORD-G-4',
      new Money(100, 'CNY'),
      PaymentMethod.ALIPAY,
      's',
      '7',
      PaymentStatus.PENDING,
    );
    fresh.markAsSucceeded('GW-G-4', new Money(80, 'CNY'), new Date('2026-10-09T10:00:00Z'));
    expect(() => fresh.createRefund(new Money(80.01, 'CNY'), 'r', 'op')).toThrow(
      RefundOverpaidError,
    );
  });
});

/**
 * W-3⑥:状态迁移前置守卫——重放不覆盖首写,矛盾回调不抹收款态
 */
describe('PaymentOrderAggregate 状态机守卫', () => {
  const succeeded = (): PaymentOrderAggregate => {
    const order = new PaymentOrderAggregate(
      PaymentOrderId.create('PAY_TRANS_GUARD_01'),
      'ORD-T-1',
      new Money(100, 'CNY'),
      PaymentMethod.ALIPAY,
      's',
      '7',
      PaymentStatus.PENDING,
    );
    order.markAsSucceeded('GW-ORIG', new Money(100, 'CNY'), new Date('2026-10-09T10:00:00Z'));
    return order;
  };

  it('同网关单号成功重放:no-op 返回 false,paidAt/gatewayOrderId 保首写', () => {
    const order = succeeded();
    const firstPaidAt = order.paidAt;
    const changed = order.markAsSucceeded('GW-ORIG', new Money(100, 'CNY'));
    expect(changed).toBe(false);
    expect(order.paidAt).toBe(firstPaidAt);
    expect(order.gatewayOrderId).toBe('GW-ORIG');
  });

  it('异网关单号二次成功:抛 PaymentAlreadySucceededError(首写胜出)', () => {
    const order = succeeded();
    expect(() => order.markAsSucceeded('GW-OTHER', new Money(100, 'CNY'))).toThrow(
      PaymentAlreadySucceededError,
    );
  });

  it('成功后失败回调:抛 PaymentFailedAfterSuccessError(收款态不可抹)', () => {
    const order = succeeded();
    expect(() => order.markAsFailed('买家余额不足')).toThrow(PaymentFailedAfterSuccessError);
    expect(order.status).toBe(PaymentStatus.SUCCEEDED);
  });

  it('失败同原因重放:no-op 返回 false', () => {
    const order = new PaymentOrderAggregate(
      PaymentOrderId.create('PAY_TRANS_GUARD_02'),
      'ORD-T-2',
      new Money(100, 'CNY'),
      PaymentMethod.ALIPAY,
      's',
      '7',
      PaymentStatus.FAILED,
    );
    order.markAsFailed('超时');
    expect(order.markAsFailed('超时')).toBe(false);
  });

  it('已成功的单不可关闭:抛 PaymentCloseNotAllowedError', () => {
    const order = succeeded();
    expect(() => order.close('admin-1')).toThrow(PaymentCloseNotAllowedError);
  });
});
