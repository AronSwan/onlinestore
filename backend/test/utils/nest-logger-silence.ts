import { Logger } from '@nestjs/common';

/**
 * 测试噪声消声器——Nest Logger 通道版（W-1刀1 系统性整改，验收B席 P2-1）
 *
 * 病根：实现侧日志统一走 Nest Logger 后，`jest.spyOn(console, 'error')`
 * 类全局消声器失效（Logger 实例方法不经过可拦截的全局 console.* 点），
 * 测试输出噪声漏出。本助手钉 Logger.prototype 实例方法——等价于旧
 * "全局消声 console"的意图（静音框架日志通道），断言型钉点仍应钉
 * 具体服务实例的 logger（现有迁移模式不变）。
 *
 * 用法：
 *   const spies = silenceNestLogger();   // beforeEach / 测试体内
 *   restoreNestLogger(spies);            // afterEach / finally
 */
export function silenceNestLogger(): jest.SpyInstance[] {
  return (['log', 'warn', 'error', 'debug', 'verbose', 'fatal'] as const).map(level =>
    jest.spyOn(Logger.prototype, level).mockImplementation(() => {}),
  );
}

export function restoreNestLogger(spies: jest.SpyInstance[]): void {
  spies.forEach(spy => spy.mockRestore());
}
