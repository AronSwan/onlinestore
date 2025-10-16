/**
 * 密钥缓存模块单元测试
 *
 * 测试覆盖：
 * 1. 缓存设置和获取
 * 2. 缓存失效和清理
 * 3. 缓存统计和监控
 * 4. 缓存性能优化
 * 5. 错误处理和边界情况
 *
 * @author 后端开发团队
 * @version 2.0.0
 * @since 2025-10-13
 */

const KeyCache = require('../../key-management/key-cache');
const Config = require('../../shared/config');
const SecurityUtils = require('../../shared/security-utils');
const crypto = require('crypto');

// 测试配置
const TEST_CONFIG = {
  keyCache: {
    maxSize: 5,
    ttl: 1000, // 1秒TTL用于测试
    cleanupInterval: 500,
  },
};

describe('密钥缓存模块单元测试', () => {
  let keyCache;
  let config;
  let securityUtils;

  beforeAll(() => {
    config = new Config();
    securityUtils = new SecurityUtils();

    // 应用测试配置
    config.merge(TEST_CONFIG);
  });

  beforeEach(() => {
    keyCache = new KeyCache();
  });

  afterEach(async () => {
    // 清理缓存
    await keyCache.clear();
  });

  describe('缓存设置和获取', () => {
    test('应该成功设置和获取缓存项', async () => {
      const key = 'test-key';
      const value = { data: 'test-data', fingerprint: 'test-fingerprint' };

      await keyCache.set(key, value);
      const retrieved = await keyCache.get(key);

      expect(retrieved).toEqual(value);
    });

    test('应该设置带TTL的缓存项', async () => {
      const key = 'test-ttl-key';
      const value = { data: 'ttl-test-data' };
      const ttl = 500; // 500ms

      await keyCache.set(key, value, ttl);

      // 立即获取应该存在
      const immediate = await keyCache.get(key);
      expect(immediate).toEqual(value);

      // 等待TTL过期后应该不存在
      await new Promise(resolve => setTimeout(resolve, 600));
      const afterTtl = await keyCache.get(key);
      expect(afterTtl).toBeNull();
    });

    test('应该处理不存在的缓存键', async () => {
      const nonExistent = await keyCache.get('non-existent-key');

      expect(nonExistent).toBeNull();
    });

    test('应该检查缓存键是否存在', async () => {
      const key = 'existence-test-key';
      const value = { data: 'existence-test' };

      // 设置前应该不存在
      let exists = await keyCache.has(key);
      expect(exists).toBe(false);

      // 设置后应该存在
      await keyCache.set(key, value);
      exists = await keyCache.has(key);
      expect(exists).toBe(true);
    });

    test('应该设置多个缓存项', async () => {
      const items = [
        { key: 'key-1', value: { data: 'value-1' } },
        { key: 'key-2', value: { data: 'value-2' } },
        { key: 'key-3', value: { data: 'value-3' } },
      ];

      for (const item of items) {
        await keyCache.set(item.key, item.value);
      }

      // 验证所有项都可以获取
      for (const item of items) {
        const retrieved = await keyCache.get(item.key);
        expect(retrieved).toEqual(item.value);
      }
    });

    test('应该获取缓存键列表', async () => {
      const keys = ['key-a', 'key-b', 'key-c'];
      for (const key of keys) {
        await keyCache.set(key, { data: `value-for-${key}` });
      }

      const keyList = await keyCache.keys();

      expect(Array.isArray(keyList)).toBe(true);
      expect(keyList.length).toBeGreaterThanOrEqual(keys.length);
      keys.forEach(key => {
        expect(keyList).toContain(key);
      });
    });
  });

  describe('缓存失效和清理', () => {
    test('应该删除指定的缓存项', async () => {
      const key = 'delete-test-key';
      const value = { data: 'to-be-deleted' };

      await keyCache.set(key, value);

      // 验证设置成功
      let retrieved = await keyCache.get(key);
      expect(retrieved).toEqual(value);

      // 删除缓存项
      const deleted = await keyCache.delete(key);
      expect(deleted).toBe(true);

      // 验证已删除
      retrieved = await keyCache.get(key);
      expect(retrieved).toBeNull();
    });

    test('应该处理删除不存在的缓存项', async () => {
      const deleted = await keyCache.delete('non-existent-key');

      expect(deleted).toBe(false);
    });

    test('应该清空所有缓存', async () => {
      // 设置多个缓存项
      const items = [
        { key: 'clear-key-1', value: { data: 'value-1' } },
        { key: 'clear-key-2', value: { data: 'value-2' } },
        { key: 'clear-key-3', value: { data: 'value-3' } },
      ];

      for (const item of items) {
        await keyCache.set(item.key, item.value);
      }

      // 验证缓存不为空
      let keyCount = (await keyCache.keys()).length;
      expect(keyCount).toBeGreaterThan(0);

      // 清空缓存
      await keyCache.clear();

      // 验证缓存已清空
      keyCount = (await keyCache.keys()).length;
      expect(keyCount).toBe(0);

      // 验证所有项都无法获取
      for (const item of items) {
        const retrieved = await keyCache.get(item.key);
        expect(retrieved).toBeNull();
      }
    });

    test('应该自动清理过期缓存项', async () => {
      // 设置一些短期和长期的缓存项
      const shortTtlItems = [
        { key: 'short-1', value: { data: 'short-value-1' }, ttl: 100 },
        { key: 'short-2', value: { data: 'short-value-2' }, ttl: 100 },
      ];

      const longTtlItems = [
        { key: 'long-1', value: { data: 'long-value-1' }, ttl: 5000 },
        { key: 'long-2', value: { data: 'long-value-2' }, ttl: 5000 },
      ];

      for (const item of [...shortTtlItems, ...longTtlItems]) {
        await keyCache.set(item.key, item.value, item.ttl);
      }

      // 立即验证所有项都存在
      for (const item of [...shortTtlItems, ...longTtlItems]) {
        const retrieved = await keyCache.get(item.key);
        expect(retrieved).toEqual(item.value);
      }

      // 等待短期项过期
      await new Promise(resolve => setTimeout(resolve, 200));

      // 触发清理
      await keyCache.cleanup();

      // 验证短期项已清理，长期项仍然存在
      for (const item of shortTtlItems) {
        const retrieved = await keyCache.get(item.key);
        expect(retrieved).toBeNull();
      }

      for (const item of longTtlItems) {
        const retrieved = await keyCache.get(item.key);
        expect(retrieved).toEqual(item.value);
      }
    });

    test('应该根据模式删除缓存项', async () => {
      // 设置一些有模式的缓存项
      const items = [
        { key: 'user:123:profile', value: { name: 'User 123' } },
        { key: 'user:123:settings', value: { theme: 'dark' } },
        { key: 'user:456:profile', value: { name: 'User 456' } },
        { key: 'system:config', value: { version: '1.0' } },
      ];

      for (const item of items) {
        await keyCache.set(item.key, item.value);
      }

      // 删除所有user:123:*模式的缓存
      const deletedCount = await keyCache.deleteByPattern('user:123:*');
      expect(deletedCount).toBe(2);

      // 验证特定模式的项已删除
      expect(await keyCache.get('user:123:profile')).toBeNull();
      expect(await keyCache.get('user:123:settings')).toBeNull();

      // 验证其他项仍然存在
      expect(await keyCache.get('user:456:profile')).not.toBeNull();
      expect(await keyCache.get('system:config')).not.toBeNull();
    });
  });

  describe('缓存统计和监控', () => {
    test('应该获取缓存统计信息', async () => {
      // 设置一些缓存项
      const items = [
        { key: 'stat-key-1', value: { data: 'stat-1' } },
        { key: 'stat-key-2', value: { data: 'stat-2' } },
        { key: 'stat-key-3', value: { data: 'stat-3' } },
      ];

      for (const item of items) {
        await keyCache.set(item.key, item.value);
      }

      // 获取一些项来增加命中数
      await keyCache.get('stat-key-1');
      await keyCache.get('stat-key-2');
      await keyCache.get('non-existent'); // 未命中

      const stats = await keyCache.getStats();

      expect(stats).toBeDefined();
      expect(stats.size).toBeGreaterThanOrEqual(items.length);
      expect(stats.maxSize).toBe(TEST_CONFIG.keyCache.maxSize);
      expect(stats.hits).toBe(2); // 两个成功获取
      expect(stats.misses).toBe(1); // 一个未命中
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.missRate).toBeGreaterThan(0);
      expect(stats.ttl).toBe(TEST_CONFIG.keyCache.ttl);
    });

    test('应该重置缓存统计', async () => {
      // 生成一些统计信息
      await keyCache.set('reset-key', { data: 'reset-value' });
      await keyCache.get('reset-key');
      await keyCache.get('non-existent');

      const statsBefore = await keyCache.getStats();
      expect(statsBefore.hits).toBe(1);
      expect(statsBefore.misses).toBe(1);

      // 重置统计
      await keyCache.resetStats();

      const statsAfter = await keyCache.getStats();
      expect(statsAfter.hits).toBe(0);
      expect(statsAfter.misses).toBe(0);
    });

    test('应该监控缓存性能', async () => {
      const startTime = Date.now();

      // 执行一系列缓存操作
      for (let i = 0; i < 10; i++) {
        await keyCache.set(`perf-key-${i}`, { data: `value-${i}` });
        await keyCache.get(`perf-key-${i}`);
      }

      const endTime = Date.now();
      const operationTime = endTime - startTime;

      // 验证操作在合理时间内完成
      expect(operationTime).toBeLessThan(1000); // 应该在1秒内完成

      const stats = await keyCache.getStats();
      expect(stats.hits).toBe(10);
      expect(stats.operations).toBeGreaterThanOrEqual(20); // 10次设置 + 10次获取
    });

    test('应该跟踪缓存内存使用', async () => {
      // 设置一些缓存项
      const largeData = {
        largeField: 'x'.repeat(1000), // 1KB数据
        nested: {
          field1: 'value1',
          field2: 'value2',
          array: Array(100).fill('item'),
        },
      };

      await keyCache.set('large-item', largeData);

      const stats = await keyCache.getStats();

      expect(stats.memoryUsage).toBeDefined();
      expect(stats.memoryUsage.current).toBeGreaterThan(0);
      expect(stats.memoryUsage.peak).toBeGreaterThan(0);
    });
  });

  describe('缓存性能优化', () => {
    test('应该实现LRU淘汰策略', async () => {
      // 设置最大大小为3
      await keyCache.setMaxSize(3);

      // 设置4个项，应该触发淘汰
      const items = [
        { key: 'lru-1', value: { data: 'value-1' } },
        { key: 'lru-2', value: { data: 'value-2' } },
        { key: 'lru-3', value: { data: 'value-3' } },
        { key: 'lru-4', value: { data: 'value-4' } },
      ];

      for (const item of items) {
        await keyCache.set(item.key, item.value);
      }

      // 验证缓存大小不超过最大值
      const keys = await keyCache.keys();
      expect(keys.length).toBeLessThanOrEqual(3);

      // 第一个项应该被淘汰（LRU）
      const firstItem = await keyCache.get('lru-1');
      expect(firstItem).toBeNull();
    });

    test('应该根据访问频率更新LRU顺序', async () => {
      await keyCache.setMaxSize(3);

      // 设置3个项
      await keyCache.set('item-1', { data: '1' });
      await keyCache.set('item-2', { data: '2' });
      await keyCache.set('item-3', { data: '3' });

      // 访问item-1使其成为最近使用的
      await keyCache.get('item-1');

      // 添加第4个项，应该淘汰最久未使用的（item-2）
      await keyCache.set('item-4', { data: '4' });

      // 验证item-2被淘汰，item-1仍然存在
      expect(await keyCache.get('item-2')).toBeNull();
      expect(await keyCache.get('item-1')).not.toBeNull();
      expect(await keyCache.get('item-3')).not.toBeNull();
      expect(await keyCache.get('item-4')).not.toBeNull();
    });

    test('应该批量处理缓存操作', async () => {
      const batchSize = 10;
      const items = [];

      for (let i = 0; i < batchSize; i++) {
        items.push({
          key: `batch-key-${i}`,
          value: { data: `batch-value-${i}` },
        });
      }

      // 批量设置
      const setResults = await keyCache.setMultiple(items);
      expect(setResults.successCount).toBe(batchSize);
      expect(setResults.failedCount).toBe(0);

      // 批量获取
      const keys = items.map(item => item.key);
      const getResults = await keyCache.getMultiple(keys);

      expect(getResults.found).toHaveLength(batchSize);
      expect(getResults.missing).toHaveLength(0);

      // 验证所有值都正确
      getResults.found.forEach((item, index) => {
        expect(item.key).toBe(keys[index]);
        expect(item.value).toEqual(items[index].value);
      });
    });

    test('应该实现缓存预热', async () => {
      const warmupData = [
        { key: 'warm-1', value: { data: 'warm-value-1' } },
        { key: 'warm-2', value: { data: 'warm-value-2' } },
        { key: 'warm-3', value: { data: 'warm-value-3' } },
      ];

      await keyCache.warmup(warmupData);

      // 验证所有预热数据都在缓存中
      for (const item of warmupData) {
        const cached = await keyCache.get(item.key);
        expect(cached).toEqual(item.value);
      }
    });

    test('应该优化大值存储', async () => {
      // 测试大值存储性能
      const largeValue = {
        largeString: 'x'.repeat(10000), // 10KB字符串
        largeArray: Array(1000).fill('item'),
        nestedObject: {
          level1: {
            level2: {
              level3: {
                data: 'deeply-nested',
              },
            },
          },
        },
      };

      const startTime = Date.now();
      await keyCache.set('large-value', largeValue);
      const setTime = Date.now() - startTime;

      // 设置操作应该在合理时间内完成
      expect(setTime).toBeLessThan(100);

      const startGetTime = Date.now();
      const retrieved = await keyCache.get('large-value');
      const getTime = Date.now() - startGetTime;

      // 获取操作应该在合理时间内完成
      expect(getTime).toBeLessThan(50);
      expect(retrieved).toEqual(largeValue);
    });
  });

  describe('错误处理和边界情况', () => {
    test('应该处理无效的缓存键', async () => {
      const invalidKeys = [null, undefined, '', 123, {}];

      for (const key of invalidKeys) {
        await expect(keyCache.set(key, { data: 'test' })).rejects.toThrow();
      }
    });

    test('应该处理无效的缓存值', async () => {
      const key = 'valid-key';
      const invalidValues = [undefined, null];

      for (const value of invalidValues) {
        await expect(keyCache.set(key, value)).rejects.toThrow();
      }
    });

    test('应该处理存储限制', async () => {
      // 设置很小的最大大小
      await keyCache.setMaxSize(1);

      // 设置第一个项
      await keyCache.set('item-1', { data: '1' });

      // 设置第二个项，应该触发淘汰
      await keyCache.set('item-2', { data: '2' });

      // 验证缓存大小不超过最大值
      const keys = await keyCache.keys();
      expect(keys.length).toBeLessThanOrEqual(1);
    });

    test('应该处理并发访问', async () => {
      const concurrentOperations = 5;
      const promises = [];

      for (let i = 0; i < concurrentOperations; i++) {
        promises.push(keyCache.set(`concurrent-${i}`, { data: `value-${i}` }));
      }

      // 等待所有操作完成
      await Promise.all(promises);

      // 验证所有操作都成功
      for (let i = 0; i < concurrentOperations; i++) {
        const value = await keyCache.get(`concurrent-${i}`);
        expect(value).toEqual({ data: `value-${i}` });
      }
    });

    test('应该恢复从错误状态', async () => {
      // 模拟一个错误情况（例如设置无效TTL）
      await expect(
        keyCache.set('error-test', { data: 'test' }, -1000), // 负TTL
      ).rejects.toThrow();

      // 验证缓存仍然可以正常使用
      await keyCache.set('recovery-test', { data: 'recovery' });
      const value = await keyCache.get('recovery-test');
      expect(value).toEqual({ data: 'recovery' });
    });

    test('应该处理内存压力', async () => {
      // 设置内存限制
      const memoryLimit = 1024 * 1024; // 1MB
      await keyCache.setMemoryLimit(memoryLimit);

      // 尝试添加大量数据
      const largeData = { largeString: 'x'.repeat(500000) }; // ~500KB

      await keyCache.set('large-data', largeData);

      // 验证缓存仍然可以操作
      const stats = await keyCache.getStats();
      expect(stats.memoryUsage.current).toBeLessThanOrEqual(memoryLimit);
    });
  });

  describe('缓存配置管理', () => {
    test('应该动态更新缓存配置', async () => {
      const newConfig = {
        maxSize: 10,
        ttl: 5000,
        cleanupInterval: 1000,
      };

      await keyCache.updateConfig(newConfig);

      const stats = await keyCache.getStats();
      expect(stats.maxSize).toBe(newConfig.maxSize);
      expect(stats.ttl).toBe(newConfig.ttl);
    });

    test('应该重置缓存配置', async () => {
      // 修改配置
      await keyCache.setMaxSize(100);
      await keyCache.setTtl(5000);

      // 重置配置
      await keyCache.resetConfig();

      const stats = await keyCache.getStats();
      expect(stats.maxSize).toBe(TEST_CONFIG.keyCache.maxSize);
      expect(stats.ttl).toBe(TEST_CONFIG.keyCache.ttl);
    });

    test('应该导出和导入缓存状态', async () => {
      // 设置一些缓存项
      const items = [
        { key: 'export-1', value: { data: 'export-1' } },
        { key: 'export-2', value: { data: 'export-2' } },
      ];

      for (const item of items) {
        await keyCache.set(item.key, item.value);
      }

      // 导出状态
      const exported = await keyCache.exportState();

      expect(exported).toBeDefined();
      expect(exported.items).toBeDefined();
      expect(exported.config).toBeDefined();
      expect(exported.stats).toBeDefined();

      // 创建新缓存并导入状态
      const newCache = new KeyCache();
      await newCache.importState(exported);

      // 验证状态已导入
      for (const item of items) {
        const value = await newCache.get(item.key);
        expect(value).toEqual(item.value);
      }
    });
  });
});
