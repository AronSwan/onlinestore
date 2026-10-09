import { Money } from './money.value-object';

/**
 * toMinorUnits 边界（W-3④）：金额守卫的算术基座
 * fail-closed 改造的动机：ETH(18位) factor=1e18 超安全整数,乘积静默失真
 * 会让守卫比较建立在噪声上——改抛错。
 */
describe('Money.toMinorUnits', () => {
  it('CNY 2位:整数分精确', () => {
    expect(new Money(449.96, 'CNY').toMinorUnits()).toBe(44996);
    expect(new Money(0.1, 'CNY').toMinorUnits()).toBe(10);
    expect(new Money(0.3, 'CNY').toMinorUnits()).toBe(30);
  });

  it('JPY 0位', () => {
    expect(new Money(1000, 'JPY').toMinorUnits()).toBe(1000);
  });

  it('USDT 6位:安全上限内精确', () => {
    expect(new Money(999999.99, 'USDT').toMinorUnits()).toBe(999999990000);
  });

  it('BTC 8位:安全上限内精确', () => {
    expect(new Money(999999.99, 'BTC').toMinorUnits()).toBe(99999999000000);
  });

  it('ETH 18位:factor 超安全整数→fail-closed 抛错(不静默失真)', () => {
    expect(() => new Money(0.5, 'ETH').toMinorUnits()).toThrow(/安全整数/);
  });
});
