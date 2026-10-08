// 用途：支付策略回调验签单元测试
// 覆盖：未配置 PAYMENT_SIGNATURE_SECRET 时 fail-closed 拒绝；
//       配置密钥且签名正确时放行；签名错误/缺失时拒绝；
//       嵌套对象 payload 的递归排序验签（整改 M4）；
//       handleCallback 验签前置——验签失败返回失败、验签通过正常处理（整改 M2）。
// 签名约定：剔除 signature 字段后递归深度排序 JSON 序列化，HMAC-SHA256(hex)。
// （与 common/security/payment-security.service.ts 的 sortKeysDeep 一致）

import * as crypto from 'crypto';
import { AlipayStrategy } from './alipay.strategy';
import { WechatPayStrategy } from './wechat-pay.strategy';
import { CreditCardStrategy } from './credit-card.strategy';

const TEST_SECRET = 'unit-test-payment-signature-secret-0123456789abcdef';

// 与 sortKeysDeep 等价的递归深度排序（整改 M4 后两套体系共用同一约定）
function sortKeysDeep(value: any): any {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  const sorted: Record<string, any> = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortKeysDeep(value[key]);
  }
  return sorted;
}

function signPayload(payload: Record<string, any>, secret: string): string {
  const { signature: _ignored, ...rest } = payload;
  return crypto.createHmac('sha256', secret).update(JSON.stringify(sortKeysDeep(rest))).digest('hex');
}

describe('PaymentStrategy.validateCallback（回调验签）', () => {
  const originalSecret = process.env.PAYMENT_SIGNATURE_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.PAYMENT_SIGNATURE_SECRET;
    } else {
      process.env.PAYMENT_SIGNATURE_SECRET = originalSecret;
    }
  });

  describe.each([
    ['AlipayStrategy', () => new AlipayStrategy()],
    ['WechatPayStrategy', () => new WechatPayStrategy()],
    ['CreditCardStrategy', () => new CreditCardStrategy()],
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

    // 整改（M4）：基类验签改为与 PaymentSecurityService 一致的递归深度排序后，
    // 嵌套对象 payload 必须能正常验签
    it('嵌套对象 payload 递归排序后验签通过（整改 M4）', () => {
      process.env.PAYMENT_SIGNATURE_SECRET = TEST_SECRET;

      const payload = {
        paymentId: 'PAY_123',
        status: 'success',
        // 嵌套 key 故意非字典序：旧的"仅顶层排序"会保留嵌套插入序，
        // 与 security 侧递归排序产出不同签名；递归排序后两体系一致
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

  // 整改（M2）：handleCallback 必须先验签再处理，验签失败直接拒绝（fail-closed），
  // 堵住 PaymentModule 接线后伪造回调直接置为支付成功的绕过路径。
  describe.each([
    [
      'AlipayStrategy',
      () => new AlipayStrategy(),
      { out_trade_no: 'PAY_123', trade_no: 'TX_456' },
    ],
    [
      'WechatPayStrategy',
      () => new WechatPayStrategy(),
      { out_trade_no: 'PAY_123', transaction_id: 'TX_456' },
    ],
    [
      'CreditCardStrategy',
      () => new CreditCardStrategy(),
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
