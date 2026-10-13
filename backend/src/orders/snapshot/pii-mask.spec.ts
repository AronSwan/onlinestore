/**
 * pii-mask 单元测试（P1-A 修因后——真实两层形状 + 平铺兼容）
 *
 * 关键断言（P1-A 双盲审四席共中修）：
 * - 两层形状（rowToPayload 真实形态）：遮内层 snapshot.*，不遮外壳
 * - 平铺形状（兼容）：遮顶层
 * - isAdmin=true → 原样
 * - changes diff 值也遮罩（P2-F）
 * - 短地址/单字名不再全露（P2-10）
 */
import {
  maskName,
  maskPhone,
  maskAddress,
  maskSnapshotPii,
  maskSnapshotsPii,
  maskChangesPii,
} from './pii-mask';

describe('pii-mask', () => {
  describe('maskName', () => {
    it('两字名：姓+*', () => expect(maskName('张三')).toBe('张*'));
    it('三字名：姓+**', () => expect(maskName('欧阳修')).toBe('欧**'));
    it('单字名：字+*', () => expect(maskName('王')).toBe('王*'));
    it('null→null', () => expect(maskName(null)).toBeNull());
    it('undefined→null', () => expect(maskName(undefined)).toBeNull());
    it('number 不炸（String 转换）', () => expect(maskName(123 as any)).toBe('1**'));
  });

  describe('maskPhone', () => {
    it('11 位手机号：前3后4', () => expect(maskPhone('13800000000')).toBe('138****0000'));
    it('短号全遮', () => expect(maskPhone('123')).toBe('***'));
    it('null→null', () => expect(maskPhone(null)).toBeNull());
    it('number 不炸', () => expect(maskPhone(13800000000 as any)).toBe('138****0000'));
  });

  describe('maskAddress（P2-10 修：≤2 字全遮，短地址部分遮）', () => {
    it('长地址：前4字+…', () =>
      expect(maskAddress('北京市朝阳区望京街道阜通东大街1号')).toBe('北京市朝…'));
    it('中地址：前4字+…', () => expect(maskAddress('北京市朝阳区望京')).toBe('北京市朝…'));
    it('2字地址：全遮', () => expect(maskAddress('北京')).toBe('**'));
    it('null→null', () => expect(maskAddress(null)).toBeNull());
    it('number 不炸', () => expect(maskAddress(123 as any)).toBe('12…'));
  });

  describe('maskSnapshotPii——两层形状（rowToPayload 真实形态）', () => {
    const envelope = {
      orderId: 101,
      version: 1,
      prevHash: 'a'.repeat(64),
      recordHash: 'b'.repeat(64),
      operatorType: 'user',
      operatorId: '7',
      occurredAt: '2026-10-11T01:00:00.000Z',
      schemaVersion: 1,
      snapshot: {
        orderNumber: 'ORD-101',
        totalAmount: '299.00',
        recipientName: '张三',
        recipientPhone: '13800000000',
        shippingAddress: '北京市朝阳区望京街道阜通东大街1号',
        items: [{ productId: 1, qty: 2 }],
      },
    };

    it('isAdmin=false → 遮内层 snapshot.recipientName/Phone/Address', () => {
      const out = maskSnapshotPii(envelope, false);
      const inner = out.snapshot as Record<string, unknown>;
      expect(inner.recipientName).toBe('张*');
      expect(inner.recipientPhone).toBe('138****0000');
      expect(inner.shippingAddress).toBe('北京市朝…');
    });

    it('isAdmin=false → 外壳非 PII 字段不动', () => {
      const out = maskSnapshotPii(envelope, false);
      expect(out.orderId).toBe(101);
      expect(out.version).toBe(1);
      expect(out.recordHash).toBe('b'.repeat(64));
    });

    it('isAdmin=false → 内层非 PII 字段不动', () => {
      const out = maskSnapshotPii(envelope, false);
      const inner = out.snapshot as Record<string, unknown>;
      expect(inner.orderNumber).toBe('ORD-101');
      expect(inner.totalAmount).toBe('299.00');
      expect(inner.items).toEqual([{ productId: 1, qty: 2 }]);
    });

    it('isAdmin=false → 外壳不添加幻影 PII 键', () => {
      const out = maskSnapshotPii(envelope, false);
      expect('recipientName' in out).toBe(false); // 外壳本无此键→不添加
    });

    it('isAdmin=true → 内层原样', () => {
      const out = maskSnapshotPii(envelope, true);
      const inner = out.snapshot as Record<string, unknown>;
      expect(inner.recipientName).toBe('张三');
      expect(inner.recipientPhone).toBe('13800000000');
    });

    it('不改原对象', () => {
      const before = JSON.parse(JSON.stringify(envelope));
      maskSnapshotPii(envelope, false);
      expect(envelope).toEqual(before);
    });

    it('内层 PII null→null', () => {
      const noPii = {
        ...envelope,
        snapshot: { ...envelope.snapshot, recipientName: null, recipientPhone: null, shippingAddress: null },
      };
      const out = maskSnapshotPii(noPii, false);
      const inner = out.snapshot as Record<string, unknown>;
      expect(inner.recipientName).toBeNull();
      expect(inner.recipientPhone).toBeNull();
      expect(inner.shippingAddress).toBeNull();
    });
  });

  describe('maskSnapshotPii——平铺形状（兼容无包装层）', () => {
    it('平铺 payload：遮顶层', () => {
      const flat = { orderId: 1, recipientName: '张三', recipientPhone: '13800000000', shippingAddress: '北京市朝阳区望京街道' };
      const out = maskSnapshotPii(flat, false);
      expect(out.recipientName).toBe('张*');
      expect(out.recipientPhone).toBe('138****0000');
      expect(out.shippingAddress).toBe('北京市朝…');
    });
  });

  describe('maskChangesPii（P2-F）', () => {
    it('PII 字段的 from/to 也遮罩', () => {
      const changes = {
        recipientPhone: { from: '13800000000', to: '13911112222' },
        totalAmount: { from: '299.00', to: '399.00' },
      };
      const out = maskChangesPii(changes, false);
      expect(out.recipientPhone.from).toBe('138****0000');
      expect(out.recipientPhone.to).toBe('139****2222');
      expect(out.totalAmount.from).toBe('299.00'); // 非 PII 不动
    });

    it('isAdmin=true → 原样', () => {
      const changes = { recipientPhone: { from: '13800000000', to: '13911112222' } };
      const out = maskChangesPii(changes, true);
      expect(out.recipientPhone.from).toBe('13800000000');
    });
  });

  describe('maskSnapshotsPii', () => {
    it('批量遮罩：每条内层都遮', () => {
      const list = [
        { orderId: 1, snapshot: { recipientName: '张三', recipientPhone: '13800000000', shippingAddress: '北京市朝阳区望京街道' } },
        { orderId: 2, snapshot: { recipientName: '李四', recipientPhone: '13900000000', shippingAddress: '上海市浦东新区陆家嘴' } },
      ];
      const out = maskSnapshotsPii(list, false);
      expect((out[0].snapshot as any).recipientName).toBe('张*');
      expect((out[1].snapshot as any).recipientName).toBe('李*');
    });
  });
});
