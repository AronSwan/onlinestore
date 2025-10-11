/** 最小改动：声明 Jest 全局，避免 TS 编译错误 */
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;
declare const jest: any;

import { SWRService, CacheEntry } from './swr.service';
import { IQueryCache } from '../interfaces/query-handler.interface';

describe('SWRService', () => {
  let swrService: SWRService;
  let mockCache: IQueryCache;

  const now = () => new Date();

  beforeEach(() => {
    const store = new Map<string, any>();

    mockCache = {
      async get<T>(key: string): Promise<T | null> {
        return store.has(key) ? (store.get(key) as T) : null;
      },
      async set<T>(key: string, value: T): Promise<void> {
        store.set(key, value);
      },
      async delete(key: string): Promise<void> {
        store.delete(key);
      },
      async exists(key: string): Promise<boolean> {
        return store.has(key);
      },
      async clearPattern(pattern: string): Promise<void> {
        const re = new RegExp(pattern);
        for (const k of store.keys()) {
          if (re.test(k)) store.delete(k);
        }
      },
      async clear(): Promise<void> {
        store.clear();
      },
      async getStats() {
        return {
          hits: 0,
          misses: 0,
          hitRate: 0,
          totalKeys: store.size,
          size: store.size,
        };
      },
    } as IQueryCache;

    swrService = new SWRService(mockCache);
  });

  it('后台刷新应上报直方图与计数器（带 metrics mock）', async () => {
    const calls: any[] = [];
    const metrics = {
      incrementCounter: jest.fn((name: string, v: number, labels?: any) => {
        calls.push(['counter', name, v, labels]);
      }),
      recordHistogramBuckets: jest.fn((name: string, v: number, labels?: any) => {
        calls.push(['hist', name, v, labels]);
      }),
    } as any;
    const serviceWithMetrics = new SWRService(mockCache, metrics);

    const key = 'post:metrics';
    const past = new Date(now().getTime() - 1_000);
    const staleFuture = new Date(now().getTime() + 3_000);
    const entry: CacheEntry<string> = { data: 'old', expiresAt: past, staleAt: staleFuture };
    await mockCache.set(key, entry);

    const fetcher = jest.fn(async () => {
      await new Promise(r => setTimeout(r, 5));
      return 'new';
    });

    const res = await serviceWithMetrics.getWithSWR(key, fetcher, {
      ttl: 2,
      staleWhileRevalidate: true,
      staleTime: 2,
      labels: { type: 't', handler: 'h' },
    });
    expect(res.isStale).toBe(true);

    // 等待后台刷新完成
    await new Promise(r => setTimeout(r, 20));

    expect(metrics.incrementCounter).toHaveBeenCalled();
    expect(metrics.recordHistogramBuckets).toHaveBeenCalledWith(
      'cqrs_swr_refresh_duration_ms',
      expect.any(Number),
      expect.objectContaining({ type: 't', handler: 'h' }),
    );
  });

  it('未过期缓存应直接返回且不调用 fetcher', async () => {
    const key = 'user:1';
    const expiresAt = new Date(now().getTime() + 5_000);
    const entry: CacheEntry<string> = { data: 'cached', expiresAt };
    await mockCache.set(key, entry);

    const fetcher = jest.fn(async () => 'fresh');

    const result = await swrService.getWithSWR(key, fetcher, { ttl: 5 });

    expect(result.data).toBe('cached');
    expect(result.fromCache).toBe(true);
    expect(result.isStale).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('过期但未到 staleAt 时应返回旧值并后台刷新', async () => {
    const key = 'post:42';
    const past = new Date(now().getTime() - 1_000);
    const staleFuture = new Date(now().getTime() + 3_000);
    const entry: CacheEntry<string> = { data: 'old', expiresAt: past, staleAt: staleFuture };
    await mockCache.set(key, entry);

    const fetcher = jest.fn(async () => 'new');

    const res = await swrService.getWithSWR(key, fetcher, {
      ttl: 2,
      staleWhileRevalidate: true,
      staleTime: 2,
    });
    expect(res.data).toBe('old');
    expect(res.fromCache).toBe(true);
    expect(res.isStale).toBe(true);

    // 等待后台刷新完成
    await new Promise(r => setTimeout(r, 10));

    const updated = await mockCache.get<CacheEntry<string>>(key);
    expect(updated?.data).toBe('new');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('并发去重：同 key 并发只触发一次 fetcher', async () => {
    const key = 'product:list';
    const fetcher = jest.fn(async () => {
      await new Promise(r => setTimeout(r, 20));
      return ['a', 'b'];
    });

    const p1 = swrService.getWithSWR(key, fetcher, { ttl: 1 });
    // 下一事件循环再触发第二次，避免竞争条件
    const p2 = new Promise<typeof r1>(resolve => {
      setTimeout(() => resolve(swrService.getWithSWR(key, fetcher, { ttl: 1 })), 0);
    });
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(r1.data).toEqual(['a', 'b']);
    expect(r2.data).toEqual(['a', 'b']);
    expect(r1.fromCache || r2.fromCache).toBe(true);
  });

  it('invalidate 与 invalidatePattern 应清理对应缓存', async () => {
    const e1: CacheEntry<number> = { data: 1, expiresAt: new Date(now().getTime() + 1_000) };
    const e2: CacheEntry<number> = { data: 2, expiresAt: new Date(now().getTime() + 1_000) };
    await mockCache.set('order:1', e1);
    await mockCache.set('order:2', e2);

    await swrService.invalidate('order:1');
    expect(await mockCache.exists('order:1')).toBe(false);

    await swrService.invalidatePattern('order:');
    expect(await mockCache.exists('order:2')).toBe(false);
  });
});
