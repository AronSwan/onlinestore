/**
 * pii-mask 单元测试（阶段 3——#25 读时脱敏）
 *
 * 关键断言：
 * - isAdmin=true → 原样返回（不遮罩）
 * - isAdmin=false → recipientName/recipientPhone/shippingAddress 遮罩
 * - 遮罩不可逆（只出遮罩值）
 * - null/undefined PII → null（不炸）
 * - items 等非 PII 字段不动
 */
import { maskName, maskPhone, maskAddress, maskSnapshotPii, maskSnapshotsPii } from './pii-mask';

describe('pii-mask', () => {
  describe('maskName', () => {
    it('两字名：姓+*', () => {
      expect(maskName('张三')).toBe('张*');
    });
    it('三字名：姓+**', () => {
      expect(maskName('欧阳修')).toBe('欧**');
    });
    it('单字名：字+*', () => {
      expect(maskName('王')).toBe('王*');
    });
    it('null→null', () => {
      expect(maskName(null)).toBeNull();
    });
  });

  describe('maskPhone', () => {
    it('11 位手机号：前3后4', () => {
      expect(maskPhone('13800000000')).toBe('138****0000');
    });
    it('短号全遮', () => {
      expect(maskPhone('123')).toBe('***');
    });
    it('null→null', () => {
      expect(maskPhone(null)).toBeNull();
    });
  });

  describe('maskAddress', () => {
    it('长地址：前6字+…', () => {
      expect(maskAddress('北京市朝阳区望京街道阜通东大街1号')).toBe('北京市朝阳区…');
    });
    it('短地址：全遮+…', () => {
      expect(maskAddress('北京')).toBe('北京…');
    });
    it('null→null', () => {
      expect(maskAddress(null)).toBeNull();
    });
  });

  describe('maskSnapshotPii', () => {
    const payload = {
      orderId: 1,
      version: 1,
      recipientName: '张三',
      recipientPhone: '13800000000',
      shippingAddress: '北京市朝阳区望京街道阜通东大街1号',
      totalAmount: '299.00',
      items: [{ productId: 1, qty: 2 }],
    };

    it('isAdmin=true → 原样（不遮罩）', () => {
      const out = maskSnapshotPii(payload, true);
      expect(out.recipientName).toBe('张三');
      expect(out.recipientPhone).toBe('13800000000');
      expect(out.shippingAddress).toBe('北京市朝阳区望京街道阜通东大街1号');
    });

    it('isAdmin=false → PII 三件全遮罩', () => {
      const out = maskSnapshotPii(payload, false);
      expect(out.recipientName).toBe('张*');
      expect(out.recipientPhone).toBe('138****0000');
      expect(out.shippingAddress).toBe('北京市朝阳区…');
    });

    it('非 PII 字段不动', () => {
      const out = maskSnapshotPii(payload, false);
      expect(out.orderId).toBe(1);
      expect(out.totalAmount).toBe('299.00');
      expect(out.items).toEqual([{ productId: 1, qty: 2 }]);
    });

    it('不改原对象（快照只读）', () => {
      const before = { ...payload };
      maskSnapshotPii(payload, false);
      expect(payload).toEqual(before);
    });

    it('PII null→null（不炸）', () => {
      const out = maskSnapshotPii({ ...payload, recipientName: null, recipientPhone: null, shippingAddress: null }, false);
      expect(out.recipientName).toBeNull();
      expect(out.recipientPhone).toBeNull();
      expect(out.shippingAddress).toBeNull();
    });
  });

  describe('maskSnapshotsPii', () => {
    it('批量遮罩：每条都遮', () => {
      const list = [
        { recipientName: '张三', recipientPhone: '13800000000', shippingAddress: '北京市朝阳区望京街道' },
        { recipientName: '李四', recipientPhone: '13900000000', shippingAddress: '上海市浦东新区陆家嘴' },
      ];
      const out = maskSnapshotsPii(list, false);
      expect(out[0].recipientName).toBe('张*');
      expect(out[1].recipientName).toBe('李*');
    });

    it('isAdmin=true → 全部原样', () => {
      const list = [{ recipientName: '张三', recipientPhone: '13800000000', shippingAddress: '北京市朝阳区望京街道' }];
      const out = maskSnapshotsPii(list, true);
      expect(out[0].recipientName).toBe('张三');
    });
  });
});
