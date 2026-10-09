"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const payment_query_service_1 = require("./payment-query.service");
const payment_gateway_factory_1 = require("../../domain/services/payment-gateway.factory");
const payment_order_aggregate_1 = require("../../domain/aggregates/payment-order.aggregate");
const payment_order_id_value_object_1 = require("../../domain/value-objects/payment-order-id.value-object");
const money_value_object_1 = require("../../domain/value-objects/money.value-object");
const payment_method_value_object_1 = require("../../domain/value-objects/payment-method.value-object");
describe('PaymentQueryService 行为锁（审计根因批）', () => {
    let service;
    let repo;
    let gatewayFactory;
    const makeOrder = (status = payment_order_aggregate_1.PaymentStatus.PENDING) => {
        const order = new payment_order_aggregate_1.PaymentOrderAggregate(payment_order_id_value_object_1.PaymentOrderId.create('PAY_TEST_001'), 'MO_TEST', new money_value_object_1.Money(99.5, 'CNY'), payment_method_value_object_1.PaymentMethod.ALIPAY, 'subject', '246', status);
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
        const module = await testing_1.Test.createTestingModule({
            providers: [
                payment_query_service_1.PaymentQueryService,
                { provide: 'PaymentOrderRepository', useValue: repo },
                { provide: payment_gateway_factory_1.PaymentGatewayFactory, useValue: gatewayFactory },
                { provide: require('../../infrastructure/health/database-health.service').DatabaseHealthService, useValue: { checkHealth: jest.fn() } },
                { provide: require('../../infrastructure/health/redis-health.service').RedisHealthService, useValue: { checkHealth: jest.fn() } },
                { provide: require('../../infrastructure/health/payment-gateway-health.service').PaymentGatewayHealthService, useValue: { checkHealth: jest.fn() } },
            ],
        }).compile();
        service = module.get(payment_query_service_1.PaymentQueryService);
    });
    it('GET 订单响应 status 键为枚举字符串（原 .value bug 症状锁——键消失即红）', async () => {
        repo.findById.mockResolvedValue(makeOrder(payment_order_aggregate_1.PaymentStatus.PENDING));
        const result = await service.getPaymentOrderStatus(payment_order_id_value_object_1.PaymentOrderId.create('PAY_TEST_001'));
        expect(result.status).toBe('PENDING');
    });
    it('SUCCEEDED 订单的状态原样出口（不做大小写/映射损耗）', async () => {
        repo.findById.mockResolvedValue(makeOrder(payment_order_aggregate_1.PaymentStatus.SUCCEEDED));
        const result = await service.getPaymentOrderStatus(payment_order_id_value_object_1.PaymentOrderId.create('PAY_TEST_001'));
        expect(result.status).toBe('SUCCEEDED');
    });
});
