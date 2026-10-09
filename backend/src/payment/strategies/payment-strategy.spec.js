"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = __importStar(require("crypto"));
const alipay_strategy_1 = require("./alipay.strategy");
const wechat_pay_strategy_1 = require("./wechat-pay.strategy");
const credit_card_strategy_1 = require("./credit-card.strategy");
const TEST_SECRET = 'unit-test-payment-signature-secret-0123456789abcdef';
function sortKeysDeep(value) {
    if (typeof value !== 'object' || value === null) {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(sortKeysDeep);
    }
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
        sorted[key] = sortKeysDeep(value[key]);
    }
    return sorted;
}
function signPayload(payload, secret) {
    const { signature: _ignored, ...rest } = payload;
    return crypto.createHmac('sha256', secret).update(JSON.stringify(sortKeysDeep(rest))).digest('hex');
}
describe('PaymentStrategy.validateCallback（回调验签）', () => {
    const originalSecret = process.env.PAYMENT_SIGNATURE_SECRET;
    afterEach(() => {
        if (originalSecret === undefined) {
            delete process.env.PAYMENT_SIGNATURE_SECRET;
        }
        else {
            process.env.PAYMENT_SIGNATURE_SECRET = originalSecret;
        }
    });
    describe.each([
        ['AlipayStrategy', () => new alipay_strategy_1.AlipayStrategy()],
        ['WechatPayStrategy', () => new wechat_pay_strategy_1.WechatPayStrategy()],
        ['CreditCardStrategy', () => new credit_card_strategy_1.CreditCardStrategy()],
    ])('%s', (_name, createStrategy) => {
        const strategy = createStrategy();
        it('未配置 PAYMENT_SIGNATURE_SECRET 时拒绝回调（fail-closed）', () => {
            delete process.env.PAYMENT_SIGNATURE_SECRET;
            const result = strategy.validateCallback({
                paymentId: 'PAY_123',
                status: 'success',
                amount: '100.00',
                signature: signPayload({ paymentId: 'PAY_123', status: 'success', amount: '100.00' }, TEST_SECRET),
            });
            expect(result).toBe(false);
        });
        it('配置密钥且签名正确时通过验签', () => {
            process.env.PAYMENT_SIGNATURE_SECRET = TEST_SECRET;
            const payload = {
                paymentId: 'PAY_123',
                status: 'success',
                amount: '100.00',
            };
            const result = strategy.validateCallback({
                ...payload,
                signature: signPayload(payload, TEST_SECRET),
            });
            expect(result).toBe(true);
        });
        it('配置密钥但签名错误时拒绝回调', () => {
            process.env.PAYMENT_SIGNATURE_SECRET = TEST_SECRET;
            const result = strategy.validateCallback({
                paymentId: 'PAY_123',
                status: 'success',
                amount: '100.00',
                signature: 'deadbeef'.repeat(8),
            });
            expect(result).toBe(false);
        });
        it('缺少签名字段时拒绝回调', () => {
            process.env.PAYMENT_SIGNATURE_SECRET = TEST_SECRET;
            const result = strategy.validateCallback({
                paymentId: 'PAY_123',
                status: 'success',
                amount: '100.00',
            });
            expect(result).toBe(false);
        });
        it('嵌套对象 payload 递归排序后验签通过（整改 M4）', () => {
            process.env.PAYMENT_SIGNATURE_SECRET = TEST_SECRET;
            const payload = {
                paymentId: 'PAY_123',
                status: 'success',
                metadata: { zeta: 1, alpha: { zebra: 1, apple: 2, mid: [3, 1, 2] } },
            };
            const result = strategy.validateCallback({
                ...payload,
                signature: signPayload(payload, TEST_SECRET),
            });
            expect(result).toBe(true);
        });
        it('嵌套对象值被篡改时拒绝验签（整改 M4）', () => {
            process.env.PAYMENT_SIGNATURE_SECRET = TEST_SECRET;
            const signed = { paymentId: 'PAY_123', metadata: { order: { id: 'ORD_1' } } };
            const tampered = { paymentId: 'PAY_123', metadata: { order: { id: 'ORD_999' } } };
            const result = strategy.validateCallback({
                ...tampered,
                signature: signPayload(signed, TEST_SECRET),
            });
            expect(result).toBe(false);
        });
    });
    describe.each([
        [
            'AlipayStrategy',
            () => new alipay_strategy_1.AlipayStrategy(),
            { out_trade_no: 'PAY_123', trade_no: 'TX_456' },
        ],
        [
            'WechatPayStrategy',
            () => new wechat_pay_strategy_1.WechatPayStrategy(),
            { out_trade_no: 'PAY_123', transaction_id: 'TX_456' },
        ],
        [
            'CreditCardStrategy',
            () => new credit_card_strategy_1.CreditCardStrategy(),
            { payment_id: 'PAY_123', transaction_id: 'TX_456' },
        ],
    ])('%s.handleCallback（验签前置）', (_name, createStrategy, callbackFields) => {
        const strategy = createStrategy();
        it('验签失败时 handleCallback 返回失败，不再无条件 success:true（整改 M2）', async () => {
            process.env.PAYMENT_SIGNATURE_SECRET = TEST_SECRET;
            const result = await strategy.handleCallback({
                ...callbackFields,
                amount: '100.00',
                status: 'success',
                signature: 'deadbeef'.repeat(8),
            });
            expect(result.success).toBe(false);
            expect(result.message).toBe('回调验签失败');
        });
        it('未配置 PAYMENT_SIGNATURE_SECRET 时 handleCallback 拒绝回调（fail-closed）', async () => {
            delete process.env.PAYMENT_SIGNATURE_SECRET;
            const result = await strategy.handleCallback({
                ...callbackFields,
                amount: '100.00',
                status: 'success',
                signature: signPayload({ ...callbackFields }, TEST_SECRET),
            });
            expect(result.success).toBe(false);
            expect(result.message).toBe('回调验签失败');
        });
        it('验签通过时 handleCallback 正常处理回调', async () => {
            process.env.PAYMENT_SIGNATURE_SECRET = TEST_SECRET;
            const payload = { ...callbackFields, amount: '100.00', status: 'success' };
            const result = await strategy.handleCallback({
                ...payload,
                signature: signPayload(payload, TEST_SECRET),
            });
            expect(result.success).toBe(true);
            expect(result.data?.paymentId).toBe('PAY_123');
        });
    });
});
