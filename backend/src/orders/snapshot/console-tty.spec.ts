/**
 * console-tty 单元测试（阶段 3 前置 F-002——TTY 守卫 + 三色同源）
 *
 * 关键断言：
 * - 非 TTY 环境（jest 默认）下，三色 wrap 不注入 ANSI（污染防）
 * - TTY 环境下（mock isTTY=true），ANSI 注入形如 \x1b[31m ... \x1b[39m
 * - stderr 未被 TTY 守卫（F-004 待修）——本 spec 只测 stdout 卫兵
 */
describe('console-tty', () => {
  describe('非 TTY（jest 默认）——ANSI 转义被剥', () => {
    it('RED 直返字符串，无 ANSI', () => {
      jest.isolateModules(() => {
        const { RED } = require('./console-tty.ts');
        expect(RED('hello')).toBe('hello');
      });
    });

    it('GREEN 直返字符串，无 ANSI', () => {
      jest.isolateModules(() => {
        const { GREEN } = require('./console-tty.ts');
        expect(GREEN('hi')).toBe('hi');
      });
    });

    it('YELLOW 直返字符串，无 ANSI', () => {
      jest.isolateModules(() => {
        const { YELLOW } = require('./console-tty.ts');
        expect(YELLOW('yo')).toBe('yo');
      });
    });
  });

  describe('TTY 环境（mock isTTY=true）——ANSI 注入', () => {
    const esc = String.fromCharCode(27); // \x1b

    beforeEach(() => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        writable: true,
        configurable: true,
      });
      jest.resetModules();
    });

    it('RED: \\x1b[31m ... \\x1b[39m', () => {
      jest.isolateModules(() => {
        const { RED } = require('./console-tty.ts');
        expect(RED('msg')).toBe(`${esc}[31mmsg${esc}[39m`);
      });
    });

    it('GREEN: \\x1b[32m ... \\x1b[39m', () => {
      jest.isolateModules(() => {
        const { GREEN } = require('./console-tty.ts');
        expect(GREEN('msg')).toBe(`${esc}[32mmsg${esc}[39m`);
      });
    });

    it('YELLOW: \\x1b[33m ... \\x1b[39m', () => {
      jest.isolateModules(() => {
        const { YELLOW } = require('./console-tty.ts');
        expect(YELLOW('msg')).toBe(`${esc}[33mmsg${esc}[39m`);
      });
    });

    it('空字符串也被 wrap（一致语义，不特殊化）', () => {
      jest.isolateModules(() => {
        const { RED } = require('./console-tty.ts');
        expect(RED('')).toBe(`${esc}[31m${esc}[39m`);
      });
    });

    it('多行字符串整段 wrap（非逐行）', () => {
      jest.isolateModules(() => {
        const { RED } = require('./console-tty.ts');
        expect(RED('a\nb')).toBe(`${esc}[31ma\nb${esc}[39m`);
      });
    });
  });
});
