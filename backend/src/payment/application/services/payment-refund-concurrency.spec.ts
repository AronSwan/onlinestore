import { DataSource } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { Payment } from '../../entities/payment.entity';
import {
  PaymentOrderAggregate,
  PaymentStatus,
  RefundStatus,
} from '../../domain/aggregates/payment-order.aggregate';
import { PaymentOrderId } from '../../domain/value-objects/payment-order-id.value-object';
import { Money } from '../../domain/value-objects/money.value-object';
import { PaymentMethod } from '../../domain/value-objects/payment-method.value-object';
import { PaymentOrderRepository } from '../../domain/repositories/payment-order.repository';
import { PaymentGatewayFactory } from '../../domain/services/payment-gateway.factory';
import { PaymentRiskService } from '../../domain/services/payment-risk.service';
import { TypeOrmPaymentOrderRepository } from '../../infrastructure/repositories/typeorm-payment-order.repository';
import { PaymentApplicationService } from './payment-application.service';

/**
 * 退款并发回归锚（十席审计 P0-1）
 *
 * 病灶:预留-确认改造前,两笔并发退款各持陈旧快照双双过累计守卫
 * (B2 席实测:网关退 200/账面记 100/丢一笔)。
 * 本 spec 用真 sqlite 库+真仓储+真互斥锁整链验证:并发双退恰一笔过。
 */
describe('createRefund 并发与落定(集成,真库)', () => {
  let dataSource: DataSource;
  let repo: PaymentOrderRepository;
  let gatewayCreateRefund: jest.Mock;
  let service: PaymentApplicationService;
  const orderId = PaymentOrderId.create('PAY_CONCURRENCY_01');

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [Payment],
      synchronize: true,
    });
    await dataSource.initialize();
    repo = new TypeOrmPaymentOrderRepository(dataSource.getRepository(Payment));

    gatewayCreateRefund = jest.fn();
    const factory = {
      createGateway: () => ({
        createRefund: gatewayCreateRefund,
      }),
    } as unknown as PaymentGatewayFactory;
    service = new PaymentApplicationService(
      repo,
      factory,
      new PaymentRiskService(),
      { emit: jest.fn() } as never,
      { findOrderByMerchantOrderId: jest.fn().mockResolvedValue(null) } as never,
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const seedPaid = async (amount = 100): Promise<void> => {
    const order = new PaymentOrderAggregate(
      orderId,
      'MO-CONC-1',
      new Money(amount, 'CNY'),
      PaymentMethod.ALIPAY,
      's',
      '7',
      PaymentStatus.PENDING,
    );
    order.markAsSucceeded('GW-CONC-1', new Money(amount, 'CNY'), new Date('2026-10-09T10:00:00Z'));
    await repo.save(order);
  };

  const refundDto = (refundAmount: number) =>
    ({ paymentOrderId: orderId.value, refundAmount, currency: 'CNY', reason: 'r' } as never);

  beforeEach(async () => {
    gatewayCreateRefund.mockReset();
    gatewayCreateRefund.mockImplementation(
      async (req: { refundId: string }) =>
        await new Promise(resolve =>
          setTimeout(() => resolve({ gatewayRefundId: `RFD-${req.refundId}` }), 25),
        ),
    );
    await dataSource.getRepository(Payment).clear();
    await seedPaid(100);
  });

  it('并发双退各80(实付100):恰一笔成功,另一笔409;网关只调一次;占额持久=80', async () => {
    const results = await Promise.allSettled([
      service.createRefund(refundDto(80), { userId: 7 }),
      service.createRefund(refundDto(80), { userId: 7 }),
    ]);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);

    expect(gatewayCreateRefund).toHaveBeenCalledTimes(1);

    const reloaded = await repo.findById(orderId);
    expect(reloaded!.refunds).toHaveLength(1);
    expect(reloaded!.refunds[0].amount.amount).toBe(80);
    expect(reloaded!.refunds[0].status).toBe(RefundStatus.PENDING); // 在途占额
  });

  it('占额语义延续:已占80后再退80→409;退20→恰满放行', async () => {
    await service.createRefund(refundDto(80), { userId: 7 });
    await expect(service.createRefund(refundDto(80), { userId: 7 })).rejects.toThrow(
      ConflictException,
    );
    await expect(service.createRefund(refundDto(20), { userId: 7 })).resolves.toMatchObject({
      refundAmount: 20,
    });

    const reloaded = await repo.findById(orderId);
    expect(reloaded!.refunds.filter(r => r.status !== RefundStatus.FAILED)).toHaveLength(2);
  });

  it('网关失败→预留释放:首退60网关炸,退款标FAILED占额归零,全额100可再退', async () => {
    gatewayCreateRefund.mockImplementationOnce(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      throw new Error('网关超时');
    });

    await expect(service.createRefund(refundDto(60), { userId: 7 })).rejects.toThrow(
      '网关超时',
    );

    const afterFail = await repo.findById(orderId);
    expect(afterFail!.refunds).toHaveLength(1);
    expect(afterFail!.refunds[0].status).toBe(RefundStatus.FAILED); // 占额已释放

    await expect(service.createRefund(refundDto(100), { userId: 7 })).resolves.toMatchObject({
      refundAmount: 100,
    });
  });

  it('网关成功→落定网关退款号可重载读回', async () => {
    const result = await service.createRefund(refundDto(30), { userId: 7 });
    const reloaded = await repo.findById(orderId);
    const refund = reloaded!.refunds.find(r => r.id.value === result.refundId);
    expect(refund).toBeDefined();
    expect(refund!.gatewayRefundId).toBe(`RFD-${result.refundId}`);
    expect(refund!.status).toBe(RefundStatus.PENDING);
  });
});
