import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Order, OrderStatus, PaymentStatus } from './entities/order.entity';
import { OrdersService } from './orders.service';
import { PaymentEventsListener } from './payment-events.listener';
import { PaymentSucceededEvent } from '../payment/domain/events/payment-succeeded.event';
import { PaymentFailedEvent } from '../payment/domain/events/payment-failed.event';

/**
 * 支付事件→订单回写（W-3 批）
 *
 * 病灶:全仓 @OnEvent 零监听——支付成功后订单 paymentStatus 永停 pending。
 * 本 spec 锁两层:markPaymentOutcome 解析/幂等逻辑 + 真实事件总线走线
 * (EventEmitterModule 环境内 emit 即达监听器,非直调方法)。
 */
describe('PaymentEventsListener 支付回写', () => {
  describe('OrdersService.markPaymentOutcome', () => {
    let service: OrdersService;
    let orderRow: Order;
    let updateSpy: jest.Mock;
    let findOneMock: jest.Mock;

    const buildService = (): void => {
      updateSpy = jest.fn().mockImplementation((_crit: unknown, partial: Partial<Order>) => {
        Object.assign(orderRow, partial);
      });
      findOneMock = jest.fn().mockImplementation((options: { where: { orderNumber?: string; id?: number } }) => {
        if (options.where.orderNumber !== undefined) {
          return options.where.orderNumber === orderRow.orderNumber ? orderRow : null;
        }
        return options.where.id === orderRow.id ? orderRow : null;
      });
      service = new OrdersService(
        { findOne: findOneMock, update: updateSpy } as never,
        {} as never,
        {} as never,
        { observeDbQuery: jest.fn() } as never,
        { publishOrderStatusUpdated: jest.fn() } as never,
        {} as never,
      );
    };

    it('orderNumber 命中:paymentStatus→paid 且 paidAt 首写', () => {
      orderRow = {
        id: 7, orderNumber: 'ORD1760000000000abc', userId: 1,
        status: OrderStatus.PENDING, paymentStatus: PaymentStatus.PENDING,
      } as Order;
      buildService();

      const updated = service.markPaymentOutcome('ORD1760000000000abc', PaymentStatus.PAID);

      return updated.then(order => {
        expect(order).not.toBeNull();
        expect(order!.paymentStatus).toBe(PaymentStatus.PAID);
        expect(order!.paidAt).toBeInstanceOf(Date);
        expect(updateSpy).toHaveBeenCalledTimes(1);
      });
    });

    it('纯数字商户号回落数字 id 命中', () => {
      orderRow = {
        id: 7, orderNumber: 'ORD_OTHER_NUMBER', userId: 1,
        status: OrderStatus.PENDING, paymentStatus: PaymentStatus.PENDING,
      } as Order;
      buildService();

      return service.markPaymentOutcome('7', PaymentStatus.PAID).then(order => {
        expect(order).not.toBeNull();
        expect(order!.paymentStatus).toBe(PaymentStatus.PAID);
      });
    });

    it('外部商户号解析不到:返回 null 不落库', () => {
      orderRow = {
        id: 7, orderNumber: 'ORD_X', userId: 1,
        status: OrderStatus.PENDING, paymentStatus: PaymentStatus.PENDING,
      } as Order;
      buildService();

      return service.markPaymentOutcome('FOREIGN_MERCHANT_ID', PaymentStatus.PAID).then(order => {
        expect(order).toBeNull();
        expect(updateSpy).not.toHaveBeenCalled();
      });
    });

    it('幂等:已 paid 的订单重复事件不再落库', () => {
      orderRow = {
        id: 7, orderNumber: 'ORD_X', userId: 1,
        status: OrderStatus.PENDING, paymentStatus: PaymentStatus.PAID,
        paidAt: new Date('2026-10-09T10:00:00Z'),
      } as Order;
      buildService();

      return service.markPaymentOutcome('ORD_X', PaymentStatus.PAID).then(order => {
        expect(order).toBe(orderRow);
        expect(updateSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('事件总线走线(真实 EventEmitter2)', () => {
    let emitter: EventEmitter2;
    let markSpy: jest.Mock;
    let moduleRef: TestingModule;

    beforeEach(async () => {
      markSpy = jest.fn().mockResolvedValue(null);
      moduleRef = await Test.createTestingModule({
        imports: [EventEmitterModule.forRoot()],
        providers: [
          PaymentEventsListener,
          { provide: OrdersService, useValue: { markPaymentOutcome: markSpy } },
        ],
      }).compile();
      await moduleRef.init();
      emitter = moduleRef.get(EventEmitter2);
    });

    afterEach(async () => {
      await moduleRef.close();
    });

    it('emit payment.succeeded → 监听器以 PAID 回写(merchantOrderId 透传)', async () => {
      emitter.emit(
        'payment.succeeded',
        new PaymentSucceededEvent('PAY_WIRE_001', 'ORD1760000000000abc', 100, 'CNY', 'GW_1'),
      );
      await new Promise(resolve => setImmediate(resolve)); // 同步监听器落定
      expect(markSpy).toHaveBeenCalledWith('ORD1760000000000abc', PaymentStatus.PAID);
    });

    it('emit payment.failed → 监听器以 FAILED 回写', async () => {
      emitter.emit(
        'payment.failed',
        new PaymentFailedEvent('PAY_WIRE_002', 'ORD1760000000000abc', '余额不足'),
      );
      await new Promise(resolve => setImmediate(resolve));
      expect(markSpy).toHaveBeenCalledWith('ORD1760000000000abc', PaymentStatus.FAILED);
    });
  });
});
