// 用途：三修（fix2 §三 3/7）商品 PATCH 合并视图共享 helper 的单元 spec。
// 锁定两份契约：
//   1. mergePriceView——「存量+增量」价格合并视图 + PG 可移植归一（Y1 P1：
//      postgres decimal 列返回字符串 '100.00'，typeof==='number' 守卫静默失效）；
//   2. mergeSpecifications——R2 浅合并语义单点（Y2 P2：闸视图与写路径双份同构）。

import {
  mergePriceView,
  mergeSpecifications,
  toNumberOrNull,
} from './product-merge.helper';

describe('三修 P1-3 toNumberOrNull（Number() 强转归一，null 保持 null）', () => {
  it('数字原样 / null·undefined → null', () => {
    expect(toNumberOrNull(100)).toBe(100);
    expect(toNumberOrNull(null)).toBeNull();
    expect(toNumberOrNull(undefined)).toBeNull();
  });

  it('PG decimal 字符串归一（两部署形态等值）', () => {
    expect(toNumberOrNull('100.00')).toBe(100);
    expect(toNumberOrNull('120.50')).toBe(120.5);
  });

  it('垃圾形状 → null（甄别交给 mergePriceView 的 invalid 标记）', () => {
    expect(toNumberOrNull('abc')).toBeNull();
    expect(toNumberOrNull(NaN)).toBeNull();
    expect(toNumberOrNull(Infinity)).toBeNull();
    expect(toNumberOrNull({})).toBeNull();
  });
});

describe('三修 P1-3 mergePriceView（存量字符串/提交数字的合并视图）', () => {
  it('PG 形态：存量字符串 + 单传 originalPrice=50 → 视图 100/50，倒挂可检出', () => {
    // 旧实现：typeof product.originalPrice==='number' 为 false → originalPrice=null
    // → 不变式静默跳过（校验失效实锤场景）
    const v = mergePriceView({ originalPrice: 50 }, { price: '100.00', originalPrice: '120.00' });
    expect(v.price).toBe(100);
    expect(v.originalPrice).toBe(50);
    expect((v.originalPrice as number) < (v.price as number)).toBe(true);
  });

  it('PG 形态：单抬 price=150 高于存量字符串划线价 120 → 视图检出倒挂', () => {
    const v = mergePriceView({ price: 150 }, { price: '100.00', originalPrice: '120.00' });
    expect(v.price).toBe(150);
    expect(v.originalPrice).toBe(120);
    expect((v.originalPrice as number) < (v.price as number)).toBe(true);
  });

  it('SQLite 形态：数字存量与提交数字等值语义', () => {
    const v = mergePriceView({ price: 90 }, { price: 100, originalPrice: 120 });
    expect(v).toMatchObject({ price: 90, originalPrice: 120, priceSubmitted: true, originalPriceSubmitted: false });
  });

  it('originalPrice 显式 null = 清除（originalPriceExplicitNull，视图 null 无不变式）', () => {
    const v = mergePriceView({ originalPrice: null }, { price: 100, originalPrice: 120 });
    expect(v.originalPrice).toBeNull();
    expect(v.originalPriceExplicitNull).toBe(true);
    expect(v.originalPriceSubmitted).toBe(false);
  });

  it('未传价格字段沿用存量归一；提交非法形状 → invalid 标记', () => {
    expect(mergePriceView({}, { price: '88.00', originalPrice: null })).toMatchObject({
      price: 88,
      originalPrice: null,
      priceSubmitted: false,
      originalPriceSubmitted: false,
    });
    expect(mergePriceView({ price: 'abc' }, { price: 1, originalPrice: 2 }).invalidPrice).toBe(true);
    expect(mergePriceView({ originalPrice: {} }, { price: 1 }).invalidOriginalPrice).toBe(true);
    expect(mergePriceView({ price: '150' }, { price: 1, originalPrice: 2 }).invalidPrice).toBe(false);
  });
});

describe('三修 P2-7 mergeSpecifications（浅合并单点语义）', () => {
  it('dto 键覆盖存量同名键、未提及键保留（factCard 保留）', () => {
    expect(
      mergeSpecifications({ color: '蓝色', factCard: { bagType: '凯莉' } }, { color: '红色', size: 'M' }),
    ).toEqual({ color: '蓝色', size: 'M', factCard: { bagType: '凯莉' } });
  });

  it('显式 null → null（整体清空语义）；存量 null 时浅合并从空对象起步', () => {
    expect(mergeSpecifications(null, { color: '红色' })).toBeNull();
    expect(mergeSpecifications({ factCard: { bagType: '托特' } }, null)).toEqual({
      factCard: { bagType: '托特' },
    });
  });

  it('未提交（undefined）→ 存量浅拷贝（闸视图语义，写路径由调用方按键存在性引用）', () => {
    expect(mergeSpecifications(undefined, { color: '红色' })).toEqual({ color: '红色' });
    expect(mergeSpecifications(undefined, undefined)).toEqual({});
  });

  it('数组/标量提交原样透传（不再被展开成数字键对象——旧实现的隐性病根）', () => {
    expect(mergeSpecifications(['a', 'b'], { color: '红色' })).toEqual(['a', 'b']);
    expect(mergeSpecifications('text', { color: '红色' })).toBe('text');
  });
});
