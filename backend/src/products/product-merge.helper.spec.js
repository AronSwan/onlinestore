"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const product_merge_helper_1 = require("./product-merge.helper");
describe('三修 P1-3 toNumberOrNull（Number() 强转归一，null 保持 null）', () => {
    it('数字原样 / null·undefined → null', () => {
        expect((0, product_merge_helper_1.toNumberOrNull)(100)).toBe(100);
        expect((0, product_merge_helper_1.toNumberOrNull)(null)).toBeNull();
        expect((0, product_merge_helper_1.toNumberOrNull)(undefined)).toBeNull();
    });
    it('PG decimal 字符串归一（两部署形态等值）', () => {
        expect((0, product_merge_helper_1.toNumberOrNull)('100.00')).toBe(100);
        expect((0, product_merge_helper_1.toNumberOrNull)('120.50')).toBe(120.5);
    });
    it('垃圾形状 → null（甄别交给 mergePriceView 的 invalid 标记）', () => {
        expect((0, product_merge_helper_1.toNumberOrNull)('abc')).toBeNull();
        expect((0, product_merge_helper_1.toNumberOrNull)(NaN)).toBeNull();
        expect((0, product_merge_helper_1.toNumberOrNull)(Infinity)).toBeNull();
        expect((0, product_merge_helper_1.toNumberOrNull)({})).toBeNull();
    });
    it('四修收紧：空串/纯空白 → null（旧实现静默归 0——直调面危险形状）', () => {
        expect((0, product_merge_helper_1.toNumberOrNull)('')).toBeNull();
        expect((0, product_merge_helper_1.toNumberOrNull)('   ')).toBeNull();
        expect((0, product_merge_helper_1.toNumberOrNull)('\t\n')).toBeNull();
    });
    it('四修收紧：数组/布尔/对象 → null（Number([5])=5、Number(true)=1 的静默猜数面关闭）', () => {
        expect((0, product_merge_helper_1.toNumberOrNull)([5])).toBeNull();
        expect((0, product_merge_helper_1.toNumberOrNull)([100, 200])).toBeNull();
        expect((0, product_merge_helper_1.toNumberOrNull)(true)).toBeNull();
        expect((0, product_merge_helper_1.toNumberOrNull)(false)).toBeNull();
        expect((0, product_merge_helper_1.toNumberOrNull)([])).toBeNull();
    });
    it('四修收紧：0x/0b/0o 前缀与非严格小数形态 → null', () => {
        expect((0, product_merge_helper_1.toNumberOrNull)('0x10')).toBeNull();
        expect((0, product_merge_helper_1.toNumberOrNull)('0b101')).toBeNull();
        expect((0, product_merge_helper_1.toNumberOrNull)('0o17')).toBeNull();
        expect((0, product_merge_helper_1.toNumberOrNull)('.5')).toBeNull();
        expect((0, product_merge_helper_1.toNumberOrNull)('5.')).toBeNull();
        expect((0, product_merge_helper_1.toNumberOrNull)('+5')).toBeNull();
        expect((0, product_merge_helper_1.toNumberOrNull)('1e')).toBeNull();
        expect((0, product_merge_helper_1.toNumberOrNull)('Infinity')).toBeNull();
    });
    it('四修收紧后放行面不缩水：整数/小数/科学计数/PG decimal 串/前后空白照常归一', () => {
        expect((0, product_merge_helper_1.toNumberOrNull)(100)).toBe(100);
        expect((0, product_merge_helper_1.toNumberOrNull)(-3.5)).toBe(-3.5);
        expect((0, product_merge_helper_1.toNumberOrNull)('100.00')).toBe(100);
        expect((0, product_merge_helper_1.toNumberOrNull)('150')).toBe(150);
        expect((0, product_merge_helper_1.toNumberOrNull)('1e5')).toBe(100000);
        expect((0, product_merge_helper_1.toNumberOrNull)('-2.5E-2')).toBe(-0.025);
        expect((0, product_merge_helper_1.toNumberOrNull)(' 99 ')).toBe(99);
    });
    it('四修收紧落到 mergePriceView：price=\'\' → invalidPrice（fail-clean 400 素材）', () => {
        const v = (0, product_merge_helper_1.mergePriceView)({ price: '' }, { price: 100, originalPrice: 120 });
        expect(v.priceSubmitted).toBe(true);
        expect(v.invalidPrice).toBe(true);
        expect(v.price).toBeNull();
        const v2 = (0, product_merge_helper_1.mergePriceView)({ originalPrice: '0x10' }, { price: 100 });
        expect(v2.invalidOriginalPrice).toBe(true);
    });
});
describe('三修 P1-3 mergePriceView（存量字符串/提交数字的合并视图）', () => {
    it('PG 形态：存量字符串 + 单传 originalPrice=50 → 视图 100/50，倒挂可检出', () => {
        const v = (0, product_merge_helper_1.mergePriceView)({ originalPrice: 50 }, { price: '100.00', originalPrice: '120.00' });
        expect(v.price).toBe(100);
        expect(v.originalPrice).toBe(50);
        expect(v.originalPrice < v.price).toBe(true);
    });
    it('PG 形态：单抬 price=150 高于存量字符串划线价 120 → 视图检出倒挂', () => {
        const v = (0, product_merge_helper_1.mergePriceView)({ price: 150 }, { price: '100.00', originalPrice: '120.00' });
        expect(v.price).toBe(150);
        expect(v.originalPrice).toBe(120);
        expect(v.originalPrice < v.price).toBe(true);
    });
    it('SQLite 形态：数字存量与提交数字等值语义', () => {
        const v = (0, product_merge_helper_1.mergePriceView)({ price: 90 }, { price: 100, originalPrice: 120 });
        expect(v).toMatchObject({ price: 90, originalPrice: 120, priceSubmitted: true, originalPriceSubmitted: false });
    });
    it('originalPrice 显式 null = 清除（originalPriceExplicitNull，视图 null 无不变式）', () => {
        const v = (0, product_merge_helper_1.mergePriceView)({ originalPrice: null }, { price: 100, originalPrice: 120 });
        expect(v.originalPrice).toBeNull();
        expect(v.originalPriceExplicitNull).toBe(true);
        expect(v.originalPriceSubmitted).toBe(false);
    });
    it('未传价格字段沿用存量归一；提交非法形状 → invalid 标记', () => {
        expect((0, product_merge_helper_1.mergePriceView)({}, { price: '88.00', originalPrice: null })).toMatchObject({
            price: 88,
            originalPrice: null,
            priceSubmitted: false,
            originalPriceSubmitted: false,
        });
        expect((0, product_merge_helper_1.mergePriceView)({ price: 'abc' }, { price: 1, originalPrice: 2 }).invalidPrice).toBe(true);
        expect((0, product_merge_helper_1.mergePriceView)({ originalPrice: {} }, { price: 1 }).invalidOriginalPrice).toBe(true);
        expect((0, product_merge_helper_1.mergePriceView)({ price: '150' }, { price: 1, originalPrice: 2 }).invalidPrice).toBe(false);
    });
});
describe('三修 P2-7 mergeSpecifications（浅合并单点语义）', () => {
    it('dto 键覆盖存量同名键、未提及键保留（factCard 保留）', () => {
        expect((0, product_merge_helper_1.mergeSpecifications)({ color: '蓝色', factCard: { bagType: '凯莉' } }, { color: '红色', size: 'M' })).toEqual({ color: '蓝色', size: 'M', factCard: { bagType: '凯莉' } });
    });
    it('显式 null → null（整体清空语义）；存量 null 时浅合并从空对象起步', () => {
        expect((0, product_merge_helper_1.mergeSpecifications)(null, { color: '红色' })).toBeNull();
        expect((0, product_merge_helper_1.mergeSpecifications)({ factCard: { bagType: '托特' } }, null)).toEqual({
            factCard: { bagType: '托特' },
        });
    });
    it('未提交（undefined）→ 存量浅拷贝（闸视图语义，写路径由调用方按键存在性引用）', () => {
        expect((0, product_merge_helper_1.mergeSpecifications)(undefined, { color: '红色' })).toEqual({ color: '红色' });
        expect((0, product_merge_helper_1.mergeSpecifications)(undefined, undefined)).toEqual({});
    });
    it('数组/标量提交原样透传（不再被展开成数字键对象——旧实现的隐性病根）', () => {
        expect((0, product_merge_helper_1.mergeSpecifications)(['a', 'b'], { color: '红色' })).toEqual(['a', 'b']);
        expect((0, product_merge_helper_1.mergeSpecifications)('text', { color: '红色' })).toBe('text');
    });
});
