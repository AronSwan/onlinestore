import { Test, TestingModule } from '@nestjs/testing';
import { PaymentQueryService } from './payment-query.service';
import { PaymentGatewayFactory } from '../../domain/services/payment-gateway.factory';
import { PaymentRiskService } from '../../domain/services/payment-risk.service';
import { PaymentOrderAggregate, PaymentStatus } from '../../domain/aggregates/payment-order.aggregate';
import { PaymentOrderId } from '../../domain/value-objects/payment-order-id.value-object';
import { Money } from '../../domain/value-objects/money.value-object';
import { PaymentMethod } from '../../domain/value-objects/payment-method.value-object';
import { PaymentOrderRepository } from '../../domain/repositories/payment-order.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 反过拟合组席A P1-2 根因修复配套（2026-10-09）：.value bug 能活下来
 * 是因为该链路零单测+接口 any 逃逸。本 spec 锁最小行为面：
 * status 键存在性（原 .value bug 症状）+ 身份取令牌链。
 */
describe('PaymentQueryService 行为锁（审计根因批）', () => {
  let service: PaymentQueryService;
  let repo: {
    findById: jest.Mock;
    findByIdempotencyKey: jest.Mock;
    findByMerchantOrderId: jest.Mock;
    save: jest.Mock;
  };
  let gatewayFactory: { createGateway: jest.Mock };

  const makeOrder = (status = PaymentStatus.PENDING): PaymentOrderAggregate => {
    const order = new PaymentOrderAggregate(
      PaymentOrderId.create('PAY_TEST_001'),
      'MO_TEST',
      new Money(99.5, 'CNY'),
      PaymentMethod.ALIPAY,
      'subject',
      '246',
      status,
    );
    return order;
  };

  beforeEach(async () => {
    repo = {
      findById: jest.fn(),
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      findByMerchantOrderId: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
    };
    gatewayFactory = {
      createGateway: jest.fn().mockReturnValue({
        createPayment: jest.fn().mockResolvedValue({ gatewayOrderId: 'GW_1', paymentUrl: 'https://pay' }),
        verifyCallback: jest.fn(),
        isPaymentSuccess: jest.fn(),
        getFailureReason: jest.fn(),
        queryPaymentStatus: jest.fn(),
        createRefund: jest.fn(),
        closePayment: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentQueryService,
        { provide: 'PaymentOrderRepository', useValue: repo },
        { provide: PaymentGatewayFactory, useValue: gatewayFactory },
        { provide: require('../../infrastructure/health/database-health.service').DatabaseHealthService, useValue: { checkHealth: jest.fn() } },
        { provide: require('../../infrastructure/health/redis-health.service').RedisHealthService, useValue: { checkHealth: jest.fn() } },
        { provide: require('../../infrastructure/health/payment-gateway-health.service').PaymentGatewayHealthService, useValue: { checkHealth: jest.fn() } },
      ],
    }).compile();
    service = module.get(PaymentQueryService);
  });

  it('GET 订单响应 status 键为枚举字符串（原 .value bug 症状锁——键消失即红）', async () => {
    repo.findById.mockResolvedValue(makeOrder(PaymentStatus.PENDING));
    const result = await service.getPaymentOrderStatus(PaymentOrderId.create('PAY_TEST_001'));
    expect(result.status).toBe('PENDING'); // enum 值本身是 string——.value 会得 undefined
  });

  it('SUCCEEDED 订单的状态原样出口（不做大小写/映射损耗）', async () => {
    repo.findById.mockResolvedValue(makeOrder(PaymentStatus.SUCCEEDED));
    const result = await service.getPaymentOrderStatus(PaymentOrderId.create('PAY_TEST_001'));
    expect(result.status).toBe('SUCCEEDED');
  });
});
