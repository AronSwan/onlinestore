#!/usr/bin/env node

/**
 * 缓存管理器
 *
 * 功能：
 * 1. 实现覆盖率数据缓存 (PERF-3.3.1)
 * 2. 添加增量分析支持 (PERF-3.3.2)
 * 3. 优化文件I/O操作 (PERF-3.3.3)
 * 4. 实现智能调度算法 (PERF-3.3.4)
 * 5. 添加性能基准测试落地 (PERF-3.3.5)
 *
 * @author 架构师团队
 * @version 1.0.0
 * @since 2025-10-12
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 配置常量
const CACHE_DIR = path.join(__dirname, '.cache');
const METRICS_FILE = path.join(CACHE_DIR, 'cache-metrics.json');

/**
 * 缓存管理器类
 */
class CacheManager {
  constructor(options = {}) {
    // 默认配置
    this.config = {
      maxCacheSize: 100 * 1024 * 1024, // 100MB
      maxEntries: 1000,
      ttl: 3600000, // 1小时
      compressionEnabled: true,
      ...options,
    };

    // 确保缓存目录存在
    this.ensureCacheDirectory();

    // 初始化缓存
    this.cache = new Map();

    // 加载现有缓存
    this.loadCache();

    // 加载性能指标
    this.loadMetrics();

    // 定期清理过期缓存
    this.startCleanupTimer();
  }

  /**
   * 确保缓存目录存在
   */
  ensureCacheDirectory() {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  }

  /**
   * 加载缓存
   */
  loadCache() {
    try {
      const cacheFile = path.join(CACHE_DIR, 'cache.json');
      if (fs.existsSync(cacheFile)) {
        const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));

        // 过滤过期条目
        const now = Date.now();
        for (const [key, value] of Object.entries(cacheData)) {
          if (value.expiresAt > now) {
            this.cache.set(key, value);
          }
        }

        this.log('INFO', `Loaded ${this.cache.size} cache entries`);
      }
    } catch (error) {
      this.log('ERROR', `Failed to load cache: ${error.message}`);
    }
  }

  /**
   * 保存缓存
   */
  saveCache() {
    try {
      const cacheFile = path.join(CACHE_DIR, 'cache.json');
      const cacheData = {};

      for (const [key, value] of this.cache.entries()) {
        cacheData[key] = value;
      }

      fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
      this.log('DEBUG', `Saved ${this.cache.size} cache entries`);
    } catch (error) {
      this.log('ERROR', `Failed to save cache: ${error.message}`);
    }
  }

  /**
   * 加载性能指标
   */
  loadMetrics() {
    try {
      if (fs.existsSync(METRICS_FILE)) {
        this.metrics = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
      } else {
        this.metrics = {
          hits: 0,
          misses: 0,
          sets: 0,
          deletes: 0,
          evictions: 0,
          totalSize: 0,
          createdAt: Date.now(),
        };
      }
    } catch (error) {
      this.log('ERROR', `Failed to load metrics: ${error.message}`);
      this.metrics = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        evictions: 0,
        totalSize: 0,
        createdAt: Date.now(),
      };
    }
  }

  /**
   * 保存性能指标
   */
  saveMetrics() {
    try {
      this.metrics.updatedAt = Date.now();
      fs.writeFileSync(METRICS_FILE, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      this.log('ERROR', `Failed to save metrics: ${error.message}`);
    }
  }

  /**
   * 启动清理定时器
   */
  startCleanupTimer() {
    // 每5分钟清理一次过期缓存
    this.cleanupTimer = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * 停止清理定时器
   */
  stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 生成缓存键
   */
  generateKey(namespace, identifier) {
    const hash = crypto.createHash('md5');
    hash.update(`${namespace}:${identifier}`);
    return hash.digest('hex');
  }

  /**
   * 获取缓存
   */
  get(namespace, identifier) {
    const key = this.generateKey(namespace, identifier);
    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    // 检查是否过期
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.metrics.misses++;
      return null;
    }

    // 更新访问时间
    entry.lastAccessedAt = Date.now();
    this.metrics.hits++;

    return entry.data;
  }

  /**
   * 设置缓存
   */
  set(namespace, identifier, data, options = {}) {
    const key = this.generateKey(namespace, identifier);
    const ttl = options.ttl || this.config.ttl;

    // 计算数据大小
    const dataSize = this.calculateSize(data);

    // 检查缓存大小限制
    if (this.metrics.totalSize + dataSize > this.config.maxCacheSize) {
      this.evictLRU(dataSize);
    }

    // 检查条目数量限制
    if (this.cache.size >= this.config.maxEntries) {
      this.evictLRU();
    }

    const entry = {
      data,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      expiresAt: Date.now() + ttl,
      size: dataSize,
      namespace,
      identifier,
    };

    this.cache.set(key, entry);
    this.metrics.sets++;
    this.metrics.totalSize += dataSize;

    return true;
  }

  /**
   * 删除缓存
   */
  delete(namespace, identifier) {
    const key = this.generateKey(namespace, identifier);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    this.cache.delete(key);
    this.metrics.deletes++;
    this.metrics.totalSize -= entry.size;

    return true;
  }

  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;
    let cleanedSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        cleanedCount++;
        cleanedSize += entry.size;
      }
    }

    if (cleanedCount > 0) {
      this.metrics.totalSize -= cleanedSize;
      this.log('INFO', `Cleaned up ${cleanedCount} expired cache entries (${cleanedSize} bytes)`);
    }
  }

  /**
   * 使用LRU策略驱逐缓存
   */
  evictLRU(requiredSize = 0) {
    // 按最后访问时间排序
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt,
    );

    let evictedSize = 0;
    let evictedCount = 0;

    for (const [key, entry] of entries) {
      this.cache.delete(key);
      evictedSize += entry.size;
      evictedCount++;
      this.metrics.totalSize -= entry.size;
      this.metrics.evictions++;

      // 如果已经释放了足够的空间，停止驱逐
      if (requiredSize === 0 || evictedSize >= requiredSize) {
        break;
      }
    }

    this.log('INFO', `Evicted ${evictedCount} cache entries (${evictedSize} bytes)`);
  }

  /**
   * 计算数据大小
   */
  calculateSize(data) {
    if (typeof data === 'string') {
      return Buffer.byteLength(data, 'utf8');
    } else if (Buffer.isBuffer(data)) {
      return data.length;
    } else {
      // 对于对象，计算序列化后的大小
      const serialized = JSON.stringify(data);
      return Buffer.byteLength(serialized, 'utf8');
    }
  }

  /**
   * 获取覆盖率数据（带缓存）
   */
  async getCoverageData(coverageFile) {
    // 尝试从缓存获取
    const cachedData = this.get('coverage', coverageFile);

    if (cachedData) {
      this.log('DEBUG', `Coverage data cache hit: ${coverageFile}`);
      return cachedData;
    }

    // 缓存未命中，从文件读取
    try {
      if (!fs.existsSync(coverageFile)) {
        this.log('WARN', `Coverage file not found: ${coverageFile}`);
        return null;
      }

      const stats = fs.statSync(coverageFile);
      const fileKey = `${coverageFile}:${stats.mtime.getTime()}`;

      // 再次检查缓存，使用文件修改时间作为键的一部分
      const cachedDataWithMtime = this.get('coverage', fileKey);
      if (cachedDataWithMtime) {
        this.log('DEBUG', `Coverage data cache hit with mtime: ${coverageFile}`);
        return cachedDataWithMtime;
      }

      // 从文件读取数据
      const data = fs.readFileSync(coverageFile, 'utf8');
      const coverageData = JSON.parse(data);

      // 存入缓存
      this.set('coverage', fileKey, coverageData, { ttl: 30 * 60 * 1000 }); // 30分钟

      this.log('DEBUG', `Coverage data loaded from file: ${coverageFile}`);
      return coverageData;
    } catch (error) {
      this.log('ERROR', `Failed to load coverage data: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取增量分析数据（带缓存）
   */
  async getIncrementalAnalysisData(baseDir, changedFiles) {
    // 生成变更文件的哈希
    const changesHash = crypto.createHash('md5');
    changesHash.update(changedFiles.sort().join(','));
    const changesKey = changesHash.digest('hex');

    // 尝试从缓存获取
    const cachedData = this.get('incremental', `${baseDir}:${changesKey}`);

    if (cachedData) {
      this.log('DEBUG', `Incremental analysis data cache hit: ${baseDir}`);
      return cachedData;
    }

    // 缓存未命中，执行增量分析
    try {
      const analysisData = await this.performIncrementalAnalysis(baseDir, changedFiles);

      // 存入缓存
      this.set('incremental', `${baseDir}:${changesKey}`, analysisData, { ttl: 60 * 60 * 1000 }); // 1小时

      this.log('DEBUG', `Incremental analysis data computed: ${baseDir}`);
      return analysisData;
    } catch (error) {
      this.log('ERROR', `Failed to perform incremental analysis: ${error.message}`);
      return null;
    }
  }

  /**
   * 执行增量分析
   */
  async performIncrementalAnalysis(baseDir, changedFiles) {
    // 这里实现实际的增量分析逻辑
    // 简化版本：只返回变更文件列表
    return {
      baseDir,
      changedFiles,
      analysisTime: Date.now(),
      affectedTests: this.findAffectedTests(changedFiles),
    };
  }

  /**
   * 查找受影响的测试
   */
  findAffectedTests(changedFiles) {
    // 简化版本：假设所有测试都可能受影响
    // 实际实现应该根据文件依赖关系分析
    return ['all'];
  }

  /**
   * 优化文件I/O操作
   */
  async readFileWithCache(filePath, options = {}) {
    const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    const fileKey = `${filePath}:${stats ? stats.mtime.getTime() : 'no-file'}`;

    // 尝试从缓存获取
    const cachedData = this.get('file', fileKey);

    if (cachedData) {
      this.log('DEBUG', `File cache hit: ${filePath}`);
      return cachedData;
    }

    // 缓存未命中，从文件读取
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = fs.readFileSync(filePath, options.encoding || 'utf8');

      // 存入缓存
      this.set('file', fileKey, data, { ttl: 10 * 60 * 1000 }); // 10分钟

      this.log('DEBUG', `File loaded from disk: ${filePath}`);
      return data;
    } catch (error) {
      this.log('ERROR', `Failed to read file: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const hitRate =
      this.metrics.hits + this.metrics.misses > 0
        ? ((this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100).toFixed(2) + '%'
        : '0%';

    return {
      size: this.cache.size,
      totalSize: this.metrics.totalSize,
      hitRate,
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      sets: this.metrics.sets,
      deletes: this.metrics.deletes,
      evictions: this.metrics.evictions,
    };
  }

  /**
   * 记录日志
   */
  log(level, message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] [CacheManager] ${message}`);
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 停止清理定时器
    this.stopCleanupTimer();

    // 保存缓存
    this.saveCache();

    // 保存性能指标
    this.saveMetrics();

    this.log('INFO', 'CacheManager cleaned up');
  }
}

/**
 * 性能基准测试类
 */
class PerformanceBenchmark {
  constructor() {
    this.results = [];
  }

  /**
   * 运行基准测试
   */
  async runBenchmark(name, fn, iterations = 100) {
    console.log(`Running benchmark: ${name} (${iterations} iterations)`);

    // 预热
    for (let i = 0; i < 10; i++) {
      await fn();
    }

    // 实际测试
    const times = [];
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      await fn();
      const end = process.hrtime.bigint();
      times.push(Number(end - start) / 1000000); // 转换为毫秒
    }

    // 计算统计数据
    times.sort((a, b) => a - b);
    const min = times[0];
    const max = times[times.length - 1];
    const mean = times.reduce((sum, time) => sum + time, 0) / times.length;
    const median = times[Math.floor(times.length / 2)];
    const p95 = times[Math.floor(times.length * 0.95)];
    const p99 = times[Math.floor(times.length * 0.99)];

    const result = {
      name,
      iterations,
      min,
      max,
      mean,
      median,
      p95,
      p99,
      timestamp: new Date().toISOString(),
    };

    this.results.push(result);

    console.log(`Benchmark results for ${name}:`);
    console.log(`  Min: ${min.toFixed(2)}ms`);
    console.log(`  Max: ${max.toFixed(2)}ms`);
    console.log(`  Mean: ${mean.toFixed(2)}ms`);
    console.log(`  Median: ${median.toFixed(2)}ms`);
    console.log(`  P95: ${p95.toFixed(2)}ms`);
    console.log(`  P99: ${p99.toFixed(2)}ms`);

    return result;
  }

  /**
   * 保存基准测试结果
   */
  saveResults(filePath = path.join(CACHE_DIR, 'benchmark-results.json')) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(this.results, null, 2));
      console.log(`Benchmark results saved to: ${filePath}`);
    } catch (error) {
      console.error(`Failed to save benchmark results: ${error.message}`);
    }
  }
}

/**
 * 智能调度算法
 */
class SmartScheduler {
  constructor() {
    this.tasks = [];
    this.running = false;
  }

  /**
   * 添加任务
   */
  addTask(task) {
    this.tasks.push({
      ...task,
      id: Date.now() + Math.random(),
      addedAt: Date.now(),
      status: 'pending',
    });

    // 按优先级排序
    this.tasks.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * 运行调度器
   */
  async run() {
    if (this.running) {
      return;
    }

    this.running = true;

    while (this.tasks.length > 0) {
      const task = this.tasks.shift();
      task.status = 'running';
      task.startedAt = Date.now();

      try {
        console.log(`Executing task: ${task.name || 'unnamed'}`);
        await task.fn();
        task.status = 'completed';
        task.completedAt = Date.now();
      } catch (error) {
        task.status = 'failed';
        task.error = error.message;
        task.failedAt = Date.now();
        console.error(`Task failed: ${task.name || 'unnamed'} - ${error.message}`);
      }
    }

    this.running = false;
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 解析命令行参数
    const args = process.argv.slice(2);
    const command = args[0];

    if (command === 'benchmark') {
      // 运行性能基准测试
      const benchmark = new PerformanceBenchmark();
      const cacheManager = new CacheManager();

      // 测试缓存性能
      await benchmark.runBenchmark(
        'cache-set',
        async () => {
          cacheManager.set('test', 'key', { data: 'test data' });
        },
        1000,
      );

      await benchmark.runBenchmark(
        'cache-get',
        async () => {
          cacheManager.get('test', 'key');
        },
        1000,
      );

      // 测试文件I/O性能
      await benchmark.runBenchmark(
        'file-read-with-cache',
        async () => {
          await cacheManager.readFileWithCache(__filename);
        },
        100,
      );

      await benchmark.runBenchmark(
        'file-read-without-cache',
        async () => {
          fs.readFileSync(__filename, 'utf8');
        },
        100,
      );

      // 保存结果
      benchmark.saveResults();

      // 清理
      cacheManager.cleanup();
    } else if (command === 'stats') {
      // 显示缓存统计信息
      const cacheManager = new CacheManager();
      const stats = cacheManager.getStats();

      console.log('Cache Statistics:');
      console.log(`  Size: ${stats.size} entries`);
      console.log(`  Total Size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
      console.log(`  Hit Rate: ${stats.hitRate}`);
      console.log(`  Hits: ${stats.hits}`);
      console.log(`  Misses: ${stats.misses}`);
      console.log(`  Sets: ${stats.sets}`);
      console.log(`  Deletes: ${stats.deletes}`);
      console.log(`  Evictions: ${stats.evictions}`);

      cacheManager.cleanup();
    } else if (command === 'cleanup') {
      // 清理缓存
      const cacheManager = new CacheManager();
      cacheManager.cleanup();
      console.log('Cache cleaned up');
    } else {
      console.log('Usage:');
      console.log('  node cache-manager.js benchmark - Run performance benchmarks');
      console.log('  node cache-manager.js stats - Show cache statistics');
      console.log('  node cache-manager.js cleanup - Clean up cache');
    }
  } catch (error) {
    console.error('Cache manager error:', error.message);
    process.exit(1);
  }
}

// 导出类供测试使用
module.exports = {
  CacheManager,
  PerformanceBenchmark,
  SmartScheduler,
};

// 如果直接运行此脚本，执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
