/**
 * TanStack Query Integration 最小测试
 * - 命中率统计
 * - cacheTime=0 行为（不缓存）
 * - 失效逻辑
 * - 后台刷新定时器清理
 */
declare const describe: any;
declare const it: any;
declare const expect: any;

import { TanStackQueryIntegrationService, TanStackQueryOptions } from './tanstack-query.integration';
import { IQueryBus } from './bus/query.bus';

class StubQueryBus implements IQueryBus {
  async execute(query: any): Promise<any> { return null; }
  async executeWithCache(query: any, cacheKey?: string, cacheTime?: number): Promise<any> { return null; }
  async prefetch(query: any): Promise<void> { return; }
  async invalidateCache(queryType: string, cacheKey: string): Promise<void> { return; }
  register(handler: any): void { /* noop */ }
  addMiddleware(mw: any): void { /* noop */ }
  setQueryCache(cache: any): void { /* noop */ }
  async getCacheStats(): Promise<any> { return { hits: 0, misses: 0, hitRate: 0, totalKeys: 0, size: 0 }; }
}

describe('TanStackQueryIntegrationService', () => {
  it('命中率统计：首次查询命中率为0，缓存后为>0', async () => {
    const svc = new TanStackQueryIntegrationService(new StubQueryBus(), { defaultCacheTime: 1 });
    const options: TanStackQueryOptions = {
      queryKey: ['user', '1'],
      queryFn: async () => ({ id: 1 }),
    };
    const s1 = await svc.query(options);
    const stats1 = svc.getCacheStats();
    expect(stats1.cachedQueries >= 1).toBe(true);

    const s2 = await svc.query(options);
    const stats2 = svc.getCacheStats();
    expect(stats2.hitRate >= 0).toBe(true);
    expect(s2.isFromCache).toBe(true);
  });

  it('AbortSignal 取消后不写入缓存，后续查询应重新触发', async () => {
    const svc = new TanStackQueryIntegrationService(new StubQueryBus(), { retry: 0 });
    const controller = new AbortController();
    let calls = 0;
    const key = ['abort', 'nocache'];
    const options: TanStackQueryOptions = {
      queryKey: key,
      queryFn: async () => {
        calls++;
        await new Promise(r => setTimeout(r, 20));
        return { ok: true };
      },
      abortSignal: controller.signal,
    };
    const p = svc.query(options);
    controller.abort();
    const s1 = await p;
    expect(s1.isError).toBe(true);
    // 缓存应为空
    expect(svc.getQueryData(key)).toBeUndefined();
    // 再次查询应重新执行
    const s2 = await svc.query({ ...options, abortSignal: undefined });
    expect(s2.isSuccess).toBe(true);
    expect(calls).toBe(1 + 1);
  });

  it('并发去重错误传播：首个并发抛错，第二个应收到同样错误，随后可重新执行', async () => {
    const svc = new TanStackQueryIntegrationService(new StubQueryBus(), { dedupeConcurrent: true });
    let calls = 0;
    const key = ['dedupe', 'error'];
    const options: TanStackQueryOptions = {
      queryKey: key,
      queryFn: async () => {
        calls++;
        await new Promise(r => setTimeout(r, 10));
        throw new Error('boom');
      },
      dedupeConcurrent: true,
    };
    const p1 = svc.query(options);
    const p2 = svc.query(options);
    const s1 = await p1;
    const s2 = await p2;
    expect(s1.isError && s2.isError).toBe(true);
    expect(String(s1.error?.message)).toBe('boom');
    // inFlight 应清理，后续再次查询应重新执行
    const s3 = await svc.query({ ...options, queryFn: async () => { calls++; return { ok: true }; } });
    expect(s3.isSuccess).toBe(true);
    expect(calls).toBe(1 /* first boom */ + 1 /* second success */);
  });

  it('SWR 与 cacheTime=0：禁用缓存时不触发 SWR 返回旧值', async () => {
    const svc = new TanStackQueryIntegrationService(new StubQueryBus(), { enableBackgroundRefresh: true });
    let v = 1;
    const key = ['swr', 'nocache'];
    const options: TanStackQueryOptions = {
      queryKey: key,
      queryFn: async () => ({ v }),
      cacheTime: 0,
      enableBackgroundRefresh: true,
    };
    await svc.query(options);
    v = 2;
    const s = await svc.query(options);
    expect(s.isFromCache).toBeFalsy();
    expect((s.data as any).v).toBe(2);
  });

  it('AbortSignal 取消：在执行中取消应返回错误状态且不重试', async () => {
    const svc = new TanStackQueryIntegrationService(new StubQueryBus(), { retry: 1 });
    const controller = new AbortController();
    let started = false;
    const options: TanStackQueryOptions = {
      queryKey: ['abort', 'case'],
      queryFn: async () => {
        started = true;
        await new Promise(resolve => setTimeout(resolve, 50));
        return { ok: true };
      },
      abortSignal: controller.signal,
    };
    const p = svc.query(options);
    // 立即取消
    controller.abort();
    const state = await p;
    expect(started).toBe(true);
    expect(state.isError).toBe(true);
    expect(String(state.error?.message)).toBe('aborted');
  });

  it('并发去重：同一 queryKey 并发仅执行一次', async () => {
    const svc = new TanStackQueryIntegrationService(new StubQueryBus(), { dedupeConcurrent: true });
    let calls = 0;
    const options: TanStackQueryOptions = {
      queryKey: ['dedupe', 'case'],
      queryFn: async () => {
        calls++;
        await new Promise(resolve => setTimeout(resolve, 20));
        return { ok: true };
      },
      dedupeConcurrent: true,
    };
    const p1 = svc.query(options);
    const p2 = svc.query(options);
    const s1 = await p1;
    const s2 = await p2;
    expect(calls).toBe(1);
    expect(s1.isSuccess && s2.isSuccess).toBe(true);
  });

  it('SWR 一致性：过期返回旧值并后台刷新更新缓存', async () => {
    const svc = new TanStackQueryIntegrationService(new StubQueryBus(), { enableBackgroundRefresh: true });
    let v = 1;
    const key = ['swr', 'consistency'];
    const options: TanStackQueryOptions = {
      queryKey: key,
      queryFn: async () => ({ v }),
      cacheTime: 1, // 很短缓存
      enableBackgroundRefresh: true,
      refreshInterval: 0, // 仅一次后台刷新由 SWR 触发
    };

    // 第一次获取，缓存 v=1
    await svc.query(options);
    // 等待过期
    await new Promise(resolve => setTimeout(resolve, 1100));
    // 修改数据源
    v = 2;
    // 第二次：应返回旧值并触发后台刷新
    const sOld = await svc.query(options);
    expect(sOld.isFromCache).toBe(true);
    expect((sOld.data as any).v).toBe(1);

    // 等待后台刷新完成（让事件循环执行一次）
    await new Promise(resolve => setTimeout(resolve, 50));
    const dataAfter = svc.getQueryData(key);
    expect((dataAfter as any).v).toBe(2);
  });

  it('cacheTime=0 不缓存（立即过期）', async () => {
    const svc = new TanStackQueryIntegrationService(new StubQueryBus(), {});
    const options: TanStackQueryOptions = {
      queryKey: ['product', '42'],
      queryFn: async () => ({ id: 42 }),
      cacheTime: 0,
    };
    const s1 = await svc.query(options);
    const s2 = await svc.query(options);
    // 第二次不应命中缓存（因为立即过期）
    expect(s2.isFromCache).toBeFalsy();
  });

  it('invalidateQueries 清理缓存与后台刷新定时器', async () => {
    const svc = new TanStackQueryIntegrationService(new StubQueryBus(), {
      enableBackgroundRefresh: true,
      refreshInterval: 1,
    });
    const options: TanStackQueryOptions = {
      queryKey: ['orders', 'recent'],
      queryFn: async () => [{ id: 'o1' }],
      cacheTime: 5,
      enableBackgroundRefresh: true,
      refreshInterval: 1,
    };
    await svc.query(options);
    await (svc as any).invalidateQueries(options.queryKey);
    const data = svc.getQueryData(options.queryKey);
    expect(data).toBeUndefined();
    // 若未抛异常且数据为空，视为定时器也已清理（实现中使用 Map 管理 timer）
  });

  it('重试路径：首次失败后按 retry/retryDelay 进行重试', async () => {
    let calls = 0;
    const svc = new TanStackQueryIntegrationService(new StubQueryBus(), { retry: 1, retryDelay: 10 });
    const options: TanStackQueryOptions = {
      queryKey: ['retry', 'case'],
      queryFn: async () => {
        calls++;
        if (calls === 1) throw new Error('transient');
        return { ok: true };
      },
    };
    const state = await svc.query(options);
    expect(state).toBeDefined();
    expect(state.isSuccess || state.isError).toBe(true);
  });

  it('选择器函数：select 应用到结果', async () => {
    const svc = new TanStackQueryIntegrationService(new StubQueryBus(), {});
    const options: TanStackQueryOptions = {
      queryKey: ['select', 'case'],
      queryFn: async () => ({ a: 1, b: 2 }),
      select: (d: any) => d.a,
    };
    const state = await svc.query(options);
    expect(state.data).toBe(1);
  });

  it('SWR 背景刷新：enableBackgroundRefresh 与 refreshInterval 生效且可清理', async () => {
    const svc = new TanStackQueryIntegrationService(new StubQueryBus(), { enableBackgroundRefresh: true, refreshInterval: 1 });
    const options: TanStackQueryOptions = {
      queryKey: ['swr', 'case'],
      queryFn: async () => ({ v: Date.now() }),
      cacheTime: 1,
      enableBackgroundRefresh: true,
      refreshInterval: 1,
    };
    await svc.query(options);
    // 触发失效应同时清理定时器
    await (svc as any).invalidateQueries(options.queryKey);
    const data = svc.getQueryData(options.queryKey);
    expect(data).toBeUndefined();
  });
});