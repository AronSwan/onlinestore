// 用途：M3 双盲审 P0——全局写互斥 db-write-mutex 单元测试。
// 覆盖三条契约：FIFO 串行（无重叠）、失败隔离（上一笔抛错不阻断下一笔、
// 真实错误仍达调用方）、排队期间新写继续入队（promise 队列动态追加）。
// 嵌套禁令（fn 内再取锁=自锁死）是使用契约，不写会挂死进程的用例，靠注释立法。
import { runExclusiveWrite } from './db-write-mutex';

describe('runExclusiveWrite（全局写互斥）', () => {
  const tick = (ms = 5) => new Promise(r => setTimeout(r, ms));

  it('并发 50 笔：任意时刻至多 1 笔在执行（零重叠），且全部完成', async () => {
    let active = 0;
    let maxOverlap = 0;
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        runExclusiveWrite(async () => {
          active++;
          maxOverlap = Math.max(maxOverlap, active);
          await tick(2);
          active--;
          return i;
        }),
      ),
    );
    expect(maxOverlap).toBe(1);
    expect(results).toEqual(Array.from({ length: 50 }, (_, i) => i));
  });

  it('FIFO：按提交顺序执行（sqlite 单写者语义下的确定性写序）', async () => {
    const order: number[] = [];
    await Promise.all(
      [1, 2, 3, 4].map(i =>
        runExclusiveWrite(async () => {
          await tick(i % 2 === 0 ? 1 : 6); // 前笔更慢也不许后笔插队
          order.push(i);
        }),
      ),
    );
    expect(order).toEqual([1, 2, 3, 4]);
  });

  it('失败隔离：第 1 笔抛错 → 错误达该调用方，第 2/3 笔照常执行', async () => {
    const executed: number[] = [];
    const p1 = runExclusiveWrite(async () => {
      await tick(4);
      throw new Error('boom：链写失败');
    });
    const p2 = runExclusiveWrite(async () => {
      executed.push(2);
    });
    const p3 = runExclusiveWrite(async () => {
      executed.push(3);
    });

    await expect(p1).rejects.toThrow('boom：链写失败');
    await Promise.all([p2, p3]);
    expect(executed).toEqual([2, 3]);
  });

  it('队尾回落即放行：上一笔结束后新提交的写立即执行（队列不卡死）', async () => {
    const seen: string[] = [];
    const first = runExclusiveWrite(async () => {
      await tick(10);
      seen.push('first');
    });
    await first;
    // 先一笔已回落，此后才提交的写不需要等任何历史 promise
    const late = runExclusiveWrite(async () => {
      seen.push('late');
    });
    await late;
    expect(seen).toEqual(['first', 'late']);
  });
});
