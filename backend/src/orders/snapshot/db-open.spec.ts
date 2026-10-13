/**
 * db-open 单元测试（阶段 3 前置 F-002——三连次硬重试 + 200ms busy-wait 语义锁）
 *
 * 用 mock DatabaseSync + jest.useFakeTimers 验三连次硬重试与 200ms 间隔；
 * busy-wait→setTimeout 修复（F-003）后这些测试将改用 fake timer 推进。
 * 当前先按行为锁：断言"attempt 3 失败→onFail 触发、成功时不触发"。
 */
import { openReadOnlyWithRetry } from './db-open.ts';

// 不真开 SQLite：mock node:sqlite 模块构造器（factory 内联避免 TDZ）
jest.mock('node:sqlite', () => ({
  DatabaseSync: jest.fn(),
}));
const { DatabaseSync: mockDatabaseSync } = jest.requireMock('node:sqlite') as {
  DatabaseSync: jest.Mock;
};

describe('db-open', () => {
  beforeEach(() => {
    mockDatabaseSync.mockReset();
  });

  it('首次成功→立即返回 db，无重试', async () => {
    const fakeDb = { ok: true };
    mockDatabaseSync.mockReturnValueOnce(fakeDb);
    const onFail = jest.fn();
    const out = await openReadOnlyWithRetry({
      dbPath: '/x/y.sqlite',
      jsonMode: false,
      emitError: jest.fn(),
      onFail,
    });
    expect(out).toBe(fakeDb);
    expect(mockDatabaseSync).toHaveBeenCalledTimes(1);
    expect(onFail).not.toHaveBeenCalled();
  });

  it('第 2 次成功→重试 1 次后返回 db', async () => {
    const fakeDb = { ok: true };
    mockDatabaseSync
      .mockImplementationOnce(() => {
        throw new Error('locked');
      })
      .mockReturnValueOnce(fakeDb);
    const out = await openReadOnlyWithRetry({
      dbPath: '/x/y.sqlite',
      jsonMode: false,
      emitError: jest.fn(),
      onFail: jest.fn(),
    });
    expect(out).toBe(fakeDb);
    expect(mockDatabaseSync).toHaveBeenCalledTimes(2);
  });

  it('三次全败→onFail 触发，返回值=onFail(err)（jest.fn 默认 undefined）', async () => {
    mockDatabaseSync.mockImplementation(() => {
      throw new Error('all fail');
    });
    const onFail = jest.fn();
    const emitError = jest.fn();
    const out = await openReadOnlyWithRetry({
      dbPath: '/x/y.sqlite',
      jsonMode: false,
      emitError,
      onFail,
    });
    expect(out).toBeUndefined(); // onFail(jest.fn) 返回 undefined
    expect(mockDatabaseSync).toHaveBeenCalledTimes(3);
    expect(onFail).toHaveBeenCalledTimes(1);
    expect(emitError).toHaveBeenCalledWith(expect.stringContaining('环境错：打开数据库失败'));
  });

  it('三次全败 + jsonMode=true→emitError 传 (3, payload) 而非字符串', async () => {
    mockDatabaseSync.mockImplementation(() => {
      throw new Error('all fail');
    });
    const emitError = jest.fn();
    const out = await openReadOnlyWithRetry({
      dbPath: '/x/y.sqlite',
      jsonMode: true,
      emitError,
      onFail: jest.fn(),
    });
    expect(out).toBeUndefined(); // onFail(jest.fn) 返回 undefined
    expect(emitError).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ error: 'open failed', dbPath: '/x/y.sqlite' }),
    );
  });

  it('三次全败 + 无 onFail→返回 null（不抛）', async () => {
    mockDatabaseSync.mockImplementation(() => {
      throw new Error('all fail');
    });
    const out = await openReadOnlyWithRetry({
      dbPath: '/x/y.sqlite',
      jsonMode: false,
      emitError: jest.fn(),
    });
    expect(out).toBeNull();
    expect(mockDatabaseSync).toHaveBeenCalledTimes(3);
  });

  it('第 1 次失败 onFail 未触发（仍要继续试）', async () => {
    mockDatabaseSync
      .mockImplementationOnce(() => {
        throw new Error('first fail');
      })
      .mockReturnValueOnce({ ok: true });
    const onFail = jest.fn();
    await openReadOnlyWithRetry({
      dbPath: '/x/y.sqlite',
      jsonMode: false,
      emitError: jest.fn(),
      onFail,
    });
    expect(onFail).not.toHaveBeenCalled();
    expect(mockDatabaseSync).toHaveBeenCalledTimes(2);
  });
});
