#!/usr/bin/env node

/**
 * 性能优化模块 (增强版)
 * 用途: 优化安全检查脚本的大文件扫描性能
 * @author 安全团队
 * @version 2.0.0
 * @since 2025-10-03
 */

const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');
const { performance } = require('perf_hooks');

// 默认配置
const DEFAULT_CONFIG = {
  maxFileSize: 1024 * 1024, // 1MB
  maxWorkers: 4,
  chunkSize: 1024 * 1024, // 1MB
  enableParallel: true,
  enableCaching: true,
  cacheDir: '.security-cache',
  // 新增配置
  enableMemoryOptimization: true,
  enableStreamProcessing: true,
  enableBatchProcessing: true,
  batchSize: 100,
  memoryThreshold: 512 * 1024 * 1024, // 512MB
  enableProgressReporting: true,
  enableMetricsCollection: true,
};

/**
 * 性能指标收集器
 */
class PerformanceMetrics {
  constructor() {
    this.metrics = {
      scanTime: 0,
      filesScanned: 0,
      totalFileSize: 0,
      cacheHits: 0,
      cacheMisses: 0,
      workerUtilization: [],
      memoryUsage: [],
      throughput: 0,
    };
    this.startTime = null;
    this.endTime = null;
  }

  start() {
    this.startTime = performance.now();
  }

  end() {
    this.endTime = performance.now();
    this.metrics.scanTime = this.endTime - this.startTime;
    this.metrics.throughput = this.metrics.filesScanned / (this.metrics.scanTime / 1000); // 文件/秒
  }

  recordFileScan(fileSize) {
    this.metrics.filesScanned++;
    this.metrics.totalFileSize += fileSize;
  }

  recordCacheHit() {
    this.metrics.cacheHits++;
  }

  recordCacheMiss() {
    this.metrics.cacheMisses++;
  }

  recordMemoryUsage() {
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
    });
  }

  recordWorkerUtilization(workerId, busy) {
    if (!this.metrics.workerUtilization[workerId]) {
      this.metrics.workerUtilization[workerId] = { busy: 0, idle: 0 };
    }

    if (busy) {
      this.metrics.workerUtilization[workerId].busy++;
    } else {
      this.metrics.workerUtilization[workerId].idle++;
    }
  }

  getReport() {
    const totalWorkerTime = this.metrics.workerUtilization.reduce(
      (sum, worker) => sum + worker.busy + worker.idle,
      0,
    );

    const workerEfficiency = this.metrics.workerUtilization.map(worker => ({
      workerId: this.metrics.workerUtilization.indexOf(worker),
      efficiency:
        totalWorkerTime > 0 ? ((worker.busy / totalWorkerTime) * 100).toFixed(2) + '%' : '0%',
      busyTime: worker.busy,
      idleTime: worker.idle,
    }));

    const cacheHitRate =
      this.metrics.cacheHits + this.metrics.cacheMisses > 0
        ? (
            (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) *
            100
          ).toFixed(2) + '%'
        : '0%';

    return {
      ...this.metrics,
      averageFileSize:
        this.metrics.filesScanned > 0
          ? Math.round(this.metrics.totalFileSize / this.metrics.filesScanned)
          : 0,
      cacheHitRate,
      workerEfficiency,
      peakMemoryUsage:
        this.metrics.memoryUsage.length > 0
          ? Math.max(...this.metrics.memoryUsage.map(m => m.heapUsed))
          : 0,
    };
  }
}

/**
 * 文件扫描性能优化器 (增强版)
 */
class FileScanOptimizer {
  constructor(options = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options };
    this.cache = new Map();
    this.workers = [];
    this.workerPool = [];
    this.metrics = new PerformanceMetrics();
    this.memoryMonitor = null;
    this.progressReporter = null;
    this.initCache();

    if (this.config.enableMemoryOptimization) {
      this.initMemoryMonitor();
    }
  }

  /**
   * 初始化缓存
   */
  initCache() {
    if (!this.config.enableCaching) return;

    try {
      // 确保缓存目录存在
      if (!fs.existsSync(this.config.cacheDir)) {
        fs.mkdirSync(this.config.cacheDir, { recursive: true });
      }

      // 加载现有缓存
      const cacheFiles = fs.readdirSync(this.config.cacheDir);
      for (const file of cacheFiles) {
        if (file.endsWith('.cache')) {
          const filePath = path.join(this.config.cacheDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          this.cache.set(data.key, data);
        }
      }
    } catch (error) {
      console.warn(`初始化缓存失败: ${error.message}`);
    }
  }

  /**
   * 保存缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   */
  saveCache(key, value) {
    if (!this.config.enableCaching) return;

    try {
      const data = { key, value, timestamp: Date.now() };
      this.cache.set(key, data);

      const fileName = `${key.replace(/[^a-zA-Z0-9]/g, '_')}.cache`;
      const filePath = path.join(this.config.cacheDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(data));
    } catch (error) {
      console.warn(`保存缓存失败: ${error.message}`);
    }
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @param {number} maxAge - 最大缓存时间（毫秒）
   * @returns {any} 缓存值或null
   */
  getCache(key, maxAge = 24 * 60 * 60 * 1000) {
    // 默认24小时
    if (!this.config.enableCaching) return null;

    const data = this.cache.get(key);
    if (!data) return null;

    // 检查缓存是否过期
    if (Date.now() - data.timestamp > maxAge) {
      this.cache.delete(key);
      return null;
    }

    return data.value;
  }

  /**
   * 检查文件是否过大
   * @param {string} filePath - 文件路径
   * @returns {boolean} 是否过大
   */
  isFileTooLarge(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size > this.config.maxFileSize;
    } catch (error) {
      return false;
    }
  }

  /**
   * 分块读取大文件
   * @param {string} filePath - 文件路径
   * @returns {Array<string>} 文件块数组
   */
  chunkFile(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const chunks = [];

      const fd = fs.openSync(filePath, 'r');
      let position = 0;

      while (position < fileSize) {
        const remainingBytes = fileSize - position;
        const chunkSize = Math.min(this.config.chunkSize, remainingBytes);

        const buffer = Buffer.alloc(chunkSize);
        const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, position);

        if (bytesRead > 0) {
          chunks.push(buffer.toString('utf8', 0, bytesRead));
          position += bytesRead;
        } else {
          break;
        }
      }

      fs.closeSync(fd);
      return chunks;
    } catch (error) {
      console.error(`分块读取文件失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 创建Worker池
   * @returns {Array<Worker>} Worker池
   */
  createWorkerPool() {
    if (!this.config.enableParallel || this.config.maxWorkers <= 1) {
      return [];
    }

    const workerPool = [];
    for (let i = 0; i < this.config.maxWorkers; i++) {
      const worker = new Worker(path.join(__dirname, 'scan-worker.js'));
      workerPool.push(worker);
    }

    return workerPool;
  }

  /**
   * 销毁Worker池
   * @param {Array<Worker>} workerPool - Worker池
   */
  destroyWorkerPool(workerPool) {
    for (const worker of workerPool) {
      try {
        worker.terminate();
      } catch (error) {
        console.warn(`销毁Worker失败: ${error.message}`);
      }
    }
  }

  /**
   * 并行处理文件块
   * @param {Array<string>} chunks - 文件块数组
   * @param {Function} processFunction - 处理函数
   * @returns {Promise<Array<any>>} 处理结果
   */
  async processChunksInParallel(chunks, processFunction) {
    if (!this.config.enableParallel || chunks.length <= 1) {
      // 串行处理
      const results = [];
      for (const chunk of chunks) {
        results.push(processFunction(chunk));
      }
      return results;
    }

    // 并行处理
    const workerPool = this.createWorkerPool();
    try {
      const promises = chunks.map((chunk, index) => {
        return new Promise((resolve, reject) => {
          const worker = workerPool[index % workerPool.length];

          worker.on('message', result => {
            resolve(result);
          });

          worker.on('error', error => {
            reject(error);
          });

          // 发送任务给Worker
          worker.postMessage({
            chunk,
            index,
            functionName: processFunction.toString(),
          });
        });
      });

      const results = await Promise.all(promises);
      return results;
    } finally {
      this.destroyWorkerPool(workerPool);
    }
  }

  /**
   * 优化文件扫描 (增强版)
   * @param {string} filePath - 文件路径
   * @param {Function} scanFunction - 扫描函数
   * @param {Object} options - 扫描选项
   * @returns {Promise<any>} 扫描结果
   */
  async optimizeFileScan(filePath, scanFunction, options = {}) {
    const fileStats = fs.statSync(filePath);
    this.metrics.recordFileScan(fileStats.size);

    // 检查缓存
    const cacheKey = `${filePath}:${fileStats.mtime.getTime()}`;
    const cachedResult = this.getCache(cacheKey);
    if (cachedResult) {
      this.metrics.recordCacheHit();
      if (this.config.enableProgressReporting) {
        console.log(`使用缓存结果: ${filePath}`);
      }
      return cachedResult;
    }

    this.metrics.recordCacheMiss();

    // 检查内存使用情况
    const memUsage = process.memoryUsage();
    const memoryPressure = memUsage.heapUsed / this.config.memoryThreshold;

    // 检查文件大小和处理策略
    if (this.isFileTooLarge(filePath) || memoryPressure > 0.8) {
      if (this.config.enableProgressReporting) {
        console.log(
          `文件过大或内存压力大(${(memoryPressure * 100).toFixed(1)}%)，使用优化扫描: ${filePath}`,
        );
      }

      if (this.config.enableStreamProcessing && this.isFileTooLarge(filePath)) {
        // 使用流式处理
        const result = await this.processFileStream(filePath, scanFunction);
        this.saveCache(cacheKey, result);
        return result;
      } else {
        // 使用分块处理
        const chunks = this.chunkFile(filePath);

        if (this.config.enableBatchProcessing && chunks.length > this.config.batchSize) {
          // 使用批处理
          const results = await this.processChunksInBatches(chunks, scanFunction);
          const mergedResult = this.mergeScanResults(results);
          this.saveCache(cacheKey, mergedResult);
          return mergedResult;
        } else {
          // 使用并行处理
          const results = await this.processChunksInParallel(chunks, scanFunction);
          const mergedResult = this.mergeScanResults(results);
          this.saveCache(cacheKey, mergedResult);
          return mergedResult;
        }
      }
    } else {
      // 直接读取文件
      const content = fs.readFileSync(filePath, 'utf8');
      const result = scanFunction(content);

      // 保存缓存
      this.saveCache(cacheKey, result);

      return result;
    }
  }

  /**
   * 使用流式处理大文件
   * @param {string} filePath - 文件路径
   * @param {Function} scanFunction - 扫描函数
   * @returns {Promise<any>} 扫描结果
   */
  async processFileStream(filePath, scanFunction) {
    return new Promise((resolve, reject) => {
      const results = [];
      const stream = fs.createReadStream(filePath, {
        encoding: 'utf8',
        highWaterMark: this.config.chunkSize,
      });

      let buffer = '';

      stream.on('data', chunk => {
        buffer += chunk;

        // 处理缓冲区中的完整行或块
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后一个不完整的行

        // 批量处理行
        if (lines.length > 0) {
          const chunkResult = scanFunction(lines.join('\n'));
          if (chunkResult) {
            results.push(chunkResult);
          }
        }
      });

      stream.on('end', () => {
        // 处理剩余的缓冲区内容
        if (buffer) {
          const chunkResult = scanFunction(buffer);
          if (chunkResult) {
            results.push(chunkResult);
          }
        }

        const mergedResult = this.mergeScanResults(results);
        resolve(mergedResult);
      });

      stream.on('error', error => {
        reject(error);
      });
    });
  }

  /**
   * 批处理文件块
   * @param {Array<string>} chunks - 文件块数组
   * @param {Function} scanFunction - 扫描函数
   * @returns {Promise<Array<any>>} 处理结果
   */
  async processChunksInBatches(chunks, scanFunction) {
    const results = [];
    const batchSize = this.config.batchSize;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      // 串行处理每个批次，减少内存压力
      for (const chunk of batch) {
        const result = scanFunction(chunk);
        if (result) {
          results.push(result);
        }

        // 定期报告进度
        if (this.config.enableProgressReporting && i % (batchSize * 5) === 0) {
          const progress = Math.round((i / chunks.length) * 100);
          console.log(`批处理进度: ${progress}% (${i}/${chunks.length})`);
        }

        // 允许事件循环处理其他任务
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    return results;
  }

  /**
   * 批量优化文件扫描
   * @param {Array<string>} filePaths - 文件路径数组
   * @param {Function} scanFunction - 扫描函数
   * @param {Object} options - 扫描选项
   * @returns {Promise<Array<any>>} 扫描结果数组
   */
  async optimizeBatchFileScan(filePaths, scanFunction, options = {}) {
    this.metrics.start();

    if (this.config.enableMetricsCollection) {
      this.memoryMonitor = setInterval(() => {
        this.metrics.recordMemoryUsage();
      }, 1000);
    }

    try {
      const results = [];

      if (this.config.enableParallel && filePaths.length > 1) {
        // 并行处理多个文件
        const promises = filePaths.map(async filePath => {
          try {
            const result = await this.optimizeFileScan(filePath, scanFunction, options);
            return { filePath, result, success: true };
          } catch (error) {
            console.error(`扫描文件失败: ${filePath}`, error.message);
            return { filePath, error: error.message, success: false };
          }
        });

        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
      } else {
        // 串行处理文件
        for (const filePath of filePaths) {
          try {
            const result = await this.optimizeFileScan(filePath, scanFunction, options);
            results.push({ filePath, result, success: true });
          } catch (error) {
            console.error(`扫描文件失败: ${filePath}`, error.message);
            results.push({ filePath, error: error.message, success: false });
          }
        }
      }

      this.metrics.end();

      if (this.config.enableProgressReporting) {
        console.log(
          `批量扫描完成: ${filePaths.length} 个文件，耗时 ${this.metrics.metrics.scanTime.toFixed(2)}ms`,
        );
      }

      return results;
    } finally {
      if (this.memoryMonitor) {
        clearInterval(this.memoryMonitor);
        this.memoryMonitor = null;
      }
    }
  }

  /**
   * 初始化内存监控
   */
  initMemoryMonitor() {
    this.memoryMonitor = setInterval(() => {
      const memUsage = process.memoryUsage();
      const memoryPressure = memUsage.heapUsed / this.config.memoryThreshold;

      if (memoryPressure > 0.9) {
        console.warn(`内存使用率过高: ${(memoryPressure * 100).toFixed(1)}%`);

        // 触发垃圾回收
        if (global.gc) {
          global.gc();
        }
      }

      this.metrics.recordMemoryUsage();
    }, 5000);
  }

  /**
   * 获取性能指标
   * @returns {Object} 性能指标报告
   */
  getPerformanceReport() {
    return this.metrics.getReport();
  }

  /**
   * 合并扫描结果
   * @param {Array<any>} results - 扫描结果数组
   * @returns {any} 合并后的结果
   */
  mergeScanResults(results) {
    // 这是一个简化的实现，实际项目中需要根据具体的扫描结果结构来实现
    const merged = {
      issues: [],
      metrics: {
        totalLines: 0,
        scannedFiles: results.length,
        scanTime: 0,
      },
    };

    for (const result of results) {
      if (result.issues && Array.isArray(result.issues)) {
        merged.issues.push(...result.issues);
      }

      if (result.metrics) {
        if (result.metrics.totalLines) {
          merged.metrics.totalLines += result.metrics.totalLines;
        }
        if (result.metrics.scanTime) {
          merged.metrics.scanTime += result.metrics.scanTime;
        }
      }
    }

    return merged;
  }

  /**
   * 清理过期缓存
   * @param {number} maxAge - 最大缓存时间（毫秒）
   */
  cleanupCache(maxAge = 7 * 24 * 60 * 60 * 1000) {
    // 默认7天
    if (!this.config.enableCaching) return;

    try {
      const now = Date.now();
      const cacheFiles = fs.readdirSync(this.config.cacheDir);

      for (const file of cacheFiles) {
        if (file.endsWith('.cache')) {
          const filePath = path.join(this.config.cacheDir, file);
          const stats = fs.statSync(filePath);

          // 删除过期缓存
          if (now - stats.mtime.getTime() > maxAge) {
            fs.unlinkSync(filePath);

            // 从内存缓存中删除
            for (const [key, data] of this.cache.entries()) {
              if (data.timestamp < now - maxAge) {
                this.cache.delete(key);
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn(`清理缓存失败: ${error.message}`);
    }
  }
}

/**
 * 创建扫描Worker代码
 * @returns {string} Worker代码
 */
function createScanWorkerCode() {
  return `
const { parentPort } = require('worker_threads');

parentPort.on('message', (data) => {
  try {
    const { chunk, index, functionName } = data;
    
    // 重建函数
    const processFunction = eval(\`(\` + functionName + \`)\`);
    
    // 处理文件块
    const result = processFunction(chunk);
    
    // 发送结果
    parentPort.postMessage({
      index,
      result
    });
  } catch (error) {
    parentPort.postMessage({
      index,
      error: error.message
    });
  }
});
`;
}

/**
 * 初始化扫描Worker
 */
function initScanWorker() {
  const workerFilePath = path.join(__dirname, 'scan-worker.js');

  // 检查Worker文件是否存在
  if (!fs.existsSync(workerFilePath)) {
    // 创建Worker文件
    fs.writeFileSync(workerFilePath, createScanWorkerCode());
  }
}

module.exports = {
  FileScanOptimizer,
  initScanWorker,
  DEFAULT_CONFIG,
};
