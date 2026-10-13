import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { PaymentQueryService } from './payment-query.service';
import { PaymentApplicationService } from './payment-application.service';
import { PaymentGatewayFactory } from '../../domain/services/payment-gateway.factory';
import { PaymentRiskService } from '../../domain/services/payment-risk.service';
import {
  PaymentOrderAggregate,
  PaymentStatus,
} from '../../domain/aggregates/payment-order.aggregate';
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
        createPayment: jest
          .fn()
          .mockResolvedValue({ gatewayOrderId: 'GW_1', paymentUrl: 'https://pay' }),
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
        {
          provide: require('../../infrastructure/health/database-health.service')
            .DatabaseHealthService,
          useValue: { checkHealth: jest.fn() },
        },
        {
          provide: require('../../infrastructure/health/redis-health.service').RedisHealthService,
          useValue: { checkHealth: jest.fn() },
        },
        {
          provide: require('../../infrastructure/health/payment-gateway-health.service')
            .PaymentGatewayHealthService,
          useValue: { checkHealth: jest.fn() },
        },
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

/**
 * W-3 守卫批:域退款错误→409 契约翻译锁（原裸 Error 经全局 filter 恒 500）
 */
describe('PaymentApplicationService.createRefund 域错误翻译', () => {
  const makeAppOrder = (status = PaymentStatus.PENDING): PaymentOrderAggregate =>
    new PaymentOrderAggregate(
      PaymentOrderId.create('PAY_REFUND_409_01'),
      'MO_REFUND_409',
      new Money(100, 'CNY'),
      PaymentMethod.ALIPAY,
      's',
      '7',
      status,
    );

  const buildService = (
    order: PaymentOrderAggregate | null,
    internalOrder: { totalAmount: number; orderNumber: string } | null = null,
  ) => {
    const repo = {
      findById: jest.fn().mockResolvedValue(order),
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    };
    const service = new PaymentApplicationService(
      repo as unknown as PaymentOrderRepository,
      { createGateway: jest.fn() } as unknown as PaymentGatewayFactory,
      new PaymentRiskService(),
      { emit: jest.fn() } as unknown as EventEmitter2,
      {
        findOrderByMerchantOrderId: jest.fn().mockResolvedValue(internalOrder),
      } as never,
    );
    return { service, repo };
  };
  const dto = {
    paymentOrderId: 'PAY_REFUND_409_01',
    refundAmount: 10,
    currency: 'CNY',
    reason: '测试退款',
  } as any;

  it('非成功订单退款→ConflictException(409),非裸 Error(500)', async () => {
    const { service } = buildService(makeAppOrder(PaymentStatus.PENDING));
    await expect(service.createRefund(dto, { userId: 1 })).rejects.toThrow(ConflictException);
  });

  it('订单不存在仍为裸 Error(404 契约另立批)——不误吞非域错误', async () => {
    const { service } = buildService(null);
    await expect(service.createRefund(dto, { userId: 1 })).rejects.toThrow('支付订单不存在');
  });
});

/**
 * W-3④金额校验:站内订单支付金额必须与总额精确相等(最小单位零容差)
 */
describe('PaymentApplicationService.createPaymentOrder 金额校验', () => {
  const baseDto = {
    merchantOrderId: 'ORD1760000000000abc',
    amount: 10,
    currency: 'CNY',
    paymentMethod: 'ALIPAY',
    subject: 's',
  } as any;

  const buildForPayment = (internalOrder: unknown) => {
    const repo = {
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    };
    const service = new PaymentApplicationService(
      repo as never,
      {
        createGateway: jest.fn().mockReturnValue({
          createPayment: jest
            .fn()
            .mockResolvedValue({ gatewayOrderId: 'GW', paymentUrl: 'https://pay' }),
        }),
      } as never,
      new PaymentRiskService(),
      { emit: jest.fn() } as never,
      { findOrderByMerchantOrderId: jest.fn().mockResolvedValue(internalOrder) } as never,
    );
    return { service, repo };
  };

  it('站内单金额不符→ConflictException(409)', async () => {
    const { service } = buildForPayment({
      orderNumber: 'ORD1760000000000abc',
      totalAmount: 449.96,
    });
    await expect(
      service.createPaymentOrder({ ...baseDto, amount: 0.01 }, { userId: 7 }),
    ).rejects.toThrow(ConflictException);
  });

  it('站内单币种不符(总额CNY/请求USD)→ConflictException', async () => {
    const { service } = buildForPayment({ orderNumber: 'ORD1760000000000abc', totalAmount: 100 });
    await expect(
      service.createPaymentOrder({ ...baseDto, amount: 100, currency: 'USD' }, { userId: 7 }),
    ).rejects.toThrow(ConflictException);
  });

  it('站内单金额恰等→放行到网关;外部商户号→放行', async () => {
    const ok = buildForPayment({ orderNumber: 'ORD1760000000000abc', totalAmount: 449.96 });
    const r1 = await ok.service.createPaymentOrder({ ...baseDto, amount: 449.96 } as any, {
      userId: 7,
    });
    expect(r1.paymentOrderId).toBeDefined();

    const ext = buildForPayment(null);
    const r2 = await ext.service.createPaymentOrder(
      { ...baseDto, merchantOrderId: 'FOREIGN_MERCHANT_X', amount: 0.01 } as any,
      { userId: 7 },
    );
    expect(r2.paymentOrderId).toBeDefined();
  });
});

/**
 * W-3⑤⑥:回调时序(先落库后发事件)+互斥+状态冲突首写胜出ACK
 */
describe('PaymentApplicationService.handlePaymentCallback 时序与冲突', () => {
  const buildCallbackHarness = (order: PaymentOrderAggregate | null, internalOrderTotal?: number) => {
    const calls: string[] = [];
    const repo = {
      findByMerchantOrderId: jest.fn().mockResolvedValue(order ? [order] : []),
      findById: jest.fn().mockResolvedValue(null),
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation(async () => {
        calls.push('save');
      }),
    };
    const emit = jest.fn().mockImplementation((name: string) => {
      calls.push(`emit:${name}`);
    });
    const gateway = {
      verifyCallback: jest.fn().mockResolvedValue(true),
      isPaymentSuccess: jest.fn().mockImplementation((s: string) => s === 'TRADE_SUCCESS'),
      getFailureReason: jest.fn().mockReturnValue('买家未付款'),
      createPayment: jest.fn(),
      queryPaymentStatus: jest.fn(),
      closePayment: jest.fn(),
    };
    // 债-11 修：回调路径金额闸需读 internalOrder——harness 支持注入 internalOrderTotal
    const internalOrder = internalOrderTotal !== undefined
      ? { id: 199, orderNumber: 'ORD1791544037238r5v62x9ly', totalAmount: internalOrderTotal, paymentStatus: 'pending' }
      : null;
    const service = new PaymentApplicationService(
      repo as never,
      { createGateway: jest.fn().mockReturnValue(gateway) } as never,
      new PaymentRiskService(),
      { emit } as never,
      { findOrderByMerchantOrderId: jest.fn().mockResolvedValue(internalOrder) } as never,
    );
    return { service, calls, emit, repo };
  };

  const makePending = (): PaymentOrderAggregate =>
    new PaymentOrderAggregate(
      PaymentOrderId.create('PAY_CB_001'),
      'MO_CB_1',
      new Money(100, 'CNY'),
      PaymentMethod.ALIPAY,
      's',
      '7',
      PaymentStatus.PENDING,
    );

  const cbDto = {
    outTradeNo: 'MO_CB_1',
    gatewayOrderId: 'GW-CB-1',
    tradeStatus: 'TRADE_SUCCESS',
    receiptAmount: 100,
    totalAmount: '100',
  } as any;

  it('成功回调:先 save 后 emit(payment.succeeded),顺序不可倒置', async () => {
    const h = buildCallbackHarness(makePending());
    const result = await h.service.handlePaymentCallback(cbDto, {
      paymentMethod: PaymentMethod.ALIPAY,
    });
    expect(result.success).toBe(true);
    expect(h.calls).toEqual(['save', 'emit:payment.succeeded']);
  });

  it('重复成功回调(同网关单号):ACK 且不落库不重发事件', async () => {
    const order = makePending();
    order.markAsSucceeded('GW-CB-1', new Money(100, 'CNY'), new Date('2026-10-09T10:00:00Z'));
    const h = buildCallbackHarness(order);
    const result = await h.service.handlePaymentCallback(cbDto, {
      paymentMethod: PaymentMethod.ALIPAY,
    });
    expect(result.success).toBe(true);
    expect(h.calls).toEqual([]);
  });

  it('冲突成功回调(异网关单号):ACK STATE_CONFLICT_ACK 首写胜出', async () => {
    const order = makePending();
    order.markAsSucceeded('GW-ORIG', new Money(100, 'CNY'), new Date('2026-10-09T10:00:00Z'));
    const h = buildCallbackHarness(order);
    const result = await h.service.handlePaymentCallback(cbDto, {
      paymentMethod: PaymentMethod.ALIPAY,
    });
    expect(result).toEqual({ success: true, message: 'STATE_CONFLICT_ACK' });
    expect(h.calls).toEqual([]);
  });

  it('失败回调打在已成功单上:ACK STATE_CONFLICT_ACK,收款态不动', async () => {
    const order = makePending();
    order.markAsSucceeded('GW-CB-1', new Money(100, 'CNY'), new Date('2026-10-09T10:00:00Z'));
    const h = buildCallbackHarness(order);
    const result = await h.service.handlePaymentCallback(
      { ...cbDto, tradeStatus: 'TRADE_CLOSED' } as any,
      { paymentMethod: PaymentMethod.ALIPAY },
    );
    expect(result).toEqual({ success: true, message: 'STATE_CONFLICT_ACK' });
    expect(order.status).toBe(PaymentStatus.SUCCEEDED);
  });

  it('失败回调(PENDING单):先 save 后 emit(payment.failed)', async () => {
    const h = buildCallbackHarness(makePending());
    const result = await h.service.handlePaymentCallback(
      { ...cbDto, tradeStatus: 'TRADE_CLOSED' } as any,
      { paymentMethod: PaymentMethod.ALIPAY },
    );
    expect(result.success).toBe(true);
    expect(h.calls).toEqual(['save', 'emit:payment.failed']);
  });

  it('订单不存在:success:false ORDER_NOT_FOUND(不 ACK 不事件)', async () => {
    const h = buildCallbackHarness(null);
    const result = await h.service.handlePaymentCallback(cbDto, {
      paymentMethod: PaymentMethod.ALIPAY,
    });
    expect(result).toEqual({ success: false, message: 'ORDER_NOT_FOUND' });
  });

  // ===== 债-11 修：handlePaymentCallback 加金额闸（与下单路径 line 137-148 同模式）=====
  describe('handlePaymentCallback 金额闸（W-3 修复盲点补救）', () => {
    it('回调金额与订单总额不符（drift=1 场景:0.01 vs 897）→ ConflictException,拒绝标 success', async () => {
      // 债-11 实测：order.totalAmount=897 元, payment.amount=0.01 元 → 闸拒绝
      const h = buildCallbackHarness(makePending(), 897);
      const driftDto = { ...cbDto, totalAmount: '0.01', receiptAmount: 0.01 };
      await expect(
        h.service.handlePaymentCallback(driftDto as any, {
          paymentMethod: PaymentMethod.ALIPAY,
        }),
      ).rejects.toThrow(ConflictException);
      // 闸拒绝后:不 save 不 emit
      expect(h.calls).toEqual([]);
    });

    it('回调金额=订单总额（100 vs 100）→ 放行到 save+emit', async () => {
      const h = buildCallbackHarness(makePending(), 100);
      const result = await h.service.handlePaymentCallback(cbDto, {
        paymentMethod: PaymentMethod.ALIPAY,
      });
      expect(result.success).toBe(true);
      expect(h.calls).toEqual(['save', 'emit:payment.succeeded']);
    });

    it('站内查不到订单（外部商户号场景）→ 放行(W-3 已定:开放契约不验金额)', async () => {
      // 不传 internalOrderTotal → harness 返 null → 闸跳过
      const h = buildCallbackHarness(makePending());
      const result = await h.service.handlePaymentCallback(cbDto, {
        paymentMethod: PaymentMethod.ALIPAY,
      });
      expect(result.success).toBe(true);
      expect(h.calls).toEqual(['save', 'emit:payment.succeeded']);
    });
  });
});
