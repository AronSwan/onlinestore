/**
 * db-open 单元测试（P2-N 勘正：原头注释声称"busy-wait 语义锁 + fake timer"不实）
 *
 * 实际覆盖：mock DatabaseSync 行为锁（成功/重试/耗尽/回调触发），6 条用例。
 * 未覆盖：RETRY_INTERVAL_MS 时序断言、fake timer、非阻塞验证（真实 200ms 睡眠）。
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
