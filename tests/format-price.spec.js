// M0 · B5 formatPrice 单测五例（蓝图 M0 出口：单测绿）
// 纯函数 Node 侧直接 import，不起浏览器；配置沿用 unit.config.js。
import { test, expect } from '@playwright/test';
import { formatPrice } from '../js/shared/format-price.js';

test.describe('formatPrice 价格格式（B5：整数直出/非整两位）', () => {
  test('整数直出，不带小数', () => {
    expect(formatPrice(299)).toBe('¥299');
  });

  test('一位小数补足两位', () => {
    expect(formatPrice(168.5)).toBe('¥168.50');
  });

  test('两位小数原样保留', () => {
    expect(formatPrice(129.9)).toBe('¥129.90');
  });

  test('零值与整十不变形', () => {
    expect(formatPrice(0)).toBe('¥0');
    expect(formatPrice(88)).toBe('¥88');
  });

  test('坏数据回 ¥0 不抛错（健壮性：localStorage/后端脏数据不炸渲染）', () => {
    expect(formatPrice(NaN)).toBe('¥0');
    expect(formatPrice(null)).toBe('¥0');
    expect(formatPrice(undefined)).toBe('¥0');
    expect(formatPrice('')).toBe('¥0');
    expect(formatPrice('abc')).toBe('¥0');
    // 字符串数字可解析（data-product-price 来源）
    expect(formatPrice('259')).toBe('¥259');
    expect(formatPrice('99.5')).toBe('¥99.50');
  });
});
