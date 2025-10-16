#!/usr/bin/env node

/**
 * I/O优化器
 *
 * 功能：
 * 1. 优化文件I/O操作 (PERF-3.3.3)
 * 2. 实现批量操作
 * 3. 添加异步处理支持
 * 4. 提供文件流处理
 *
 * @author 架构师团队
 * @version 1.0.0
 * @since 2025-10-12
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');
const { pipeline } = require('stream/promises');

// 将回调方法转换为Promise
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);

/**
 * I/O优化器类
 */
class IOOptimizer {
  constructor(options = {}) {
    // 默认配置
    this.config = {
      batchSize: options.batchSize || 10,
      concurrency: options.concurrency || 5,
      useStream: options.useStream !== false,
      cache: options.cache !== false,
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
      ...options,
    };

    // 文件缓存
    this.fileCache = new Map();

    // 批量操作队列
    this.batchQueue = [];

    // 正在处理的操作
    this.pendingOperations = new Set();

    // 性能指标
    this.metrics = {
      readOperations: 0,
      writeOperations: 0,
      bytesRead: 0,
      bytesWritten: 0,
      cacheHits: 0,
      cacheMisses: 0,
      batchOperations: 0,
    };
  }

  /**
   * 优化文件读取
   */
  async readFile(filePath, options = {}) {
    // 检查缓存
    if (this.config.cache) {
      const cacheKey = this.getCacheKey(filePath, options);
      const cachedData = this.fileCache.get(cacheKey);

      if (cachedData) {
        this.metrics.cacheHits++;
        return cachedData;
      }

      this.metrics.cacheMisses++;
    }

    // 检查文件大小
    const stats = await stat(filePath);

    if (stats.size > this.config.maxFileSize && this.config.useStream) {
      return this.readFileStream(filePath, options);
    }

    // 普通文件读取
    const data = await readFile(filePath, options);

    // 更新指标
    this.metrics.readOperations++;
    this.metrics.bytesRead += data.length;

    // 缓存数据
    if (this.config.cache) {
      const cacheKey = this.getCacheKey(filePath, options);
      this.fileCache.set(cacheKey, data);
    }

    return data;
  }

  /**
   * 使用流读取文件
   */
  async readFileStream(filePath, options = {}) {
    return new Promise((resolve, reject) => {
      const chunks = [];

      const readStream = fs.createReadStream(filePath, options);

      readStream.on('data', chunk => {
        chunks.push(chunk);
        this.metrics.bytesRead += chunk.length;
      });

      readStream.on('end', () => {
        const data = Buffer.concat(chunks);
        this.metrics.readOperations++;
        resolve(data);
      });

      readStream.on('error', error => {
        reject(error);
      });
    });
  }

  /**
   * 优化文件写入
   */
  async writeFile(filePath, data, options = {}) {
    // 检查是否应该使用流
    if (data.length > this.config.maxFileSize && this.config.useStream) {
      await this.writeFileStream(filePath, data, options);
    } else {
      await writeFile(filePath, data, options);
    }

    // 更新指标
    this.metrics.writeOperations++;
    this.metrics.bytesWritten += data.length;

    // 更新缓存
    if (this.config.cache) {
      const cacheKey = this.getCacheKey(filePath, options);
      this.fileCache.set(cacheKey, data);
    }
  }

  /**
   * 使用流写入文件
   */
  async writeFileStream(filePath, data, options = {}) {
    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(filePath, options);

      writeStream.on('finish', () => {
        this.metrics.writeOperations++;
        resolve();
      });

      writeStream.on('error', error => {
        reject(error);
      });

      writeStream.write(data);
      writeStream.end();
    });
  }

  /**
   * 批量读取文件
   */
  async readFiles(filePaths, options = {}) {
    const results = new Map();
    const batchSize = options.batchSize || this.config.batchSize;

    // 分批处理
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);

      const batchPromises = batch.map(async filePath => {
        try {
          const data = await this.readFile(filePath, options);
          return { filePath, data, error: null };
        } catch (error) {
          return { filePath, data: null, error };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // 处理批次结果
      for (const result of batchResults) {
        if (result.error) {
          results.set(result.filePath, { error: result.error });
        } else {
          results.set(result.filePath, { data: result.data });
        }
      }

      this.metrics.batchOperations++;
    }

    return results;
  }

  /**
   * 批量写入文件
   */
  async writeFiles(fileMap, options = {}) {
    const results = new Map();
    const batchSize = options.batchSize || this.config.batchSize;
    const entries = Array.from(fileMap.entries());

    // 分批处理
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);

      const batchPromises = batch.map(async ([filePath, data]) => {
        try {
          await this.writeFile(filePath, data, options);
          return { filePath, error: null };
        } catch (error) {
          return { filePath, error };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // 处理批次结果
      for (const result of batchResults) {
        if (result.error) {
          results.set(result.filePath, { error: result.error });
        } else {
          results.set(result.filePath, { success: true });
        }
      }

      this.metrics.batchOperations++;
    }

    return results;
  }

  /**
   * 并行处理文件操作
   */
  async processFiles(filePaths, processor, options = {}) {
    const concurrency = options.concurrency || this.config.concurrency;
    const results = new Map();

    // 创建信号量
    const semaphore = new Semaphore(concurrency);

    // 处理所有文件
    const promises = filePaths.map(async filePath => {
      await semaphore.acquire();

      try {
        const result = await processor(filePath);
        results.set(filePath, { data: result, error: null });
      } catch (error) {
        results.set(filePath, { data: null, error });
      } finally {
        semaphore.release();
      }
    });

    await Promise.all(promises);

    return results;
  }

  /**
   * 递归读取目录
   */
  async readDirectory(dirPath, options = {}) {
    const results = {
      files: [],
      directories: [],
      size: 0,
    };

    const entries = await readdir(dirPath);

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        results.directories.push(fullPath);

        // 递归处理子目录
        if (options.recursive !== false) {
          const subResults = await this.readDirectory(fullPath, options);
          results.files.push(...subResults.files);
          results.directories.push(...subResults.directories);
          results.size += subResults.size;
        }
      } else {
        results.files.push(fullPath);
        results.size += stats.size;
      }
    }

    return results;
  }

  /**
   * 复制文件
   */
  async copyFile(sourcePath, destPath, options = {}) {
    // 确保目标目录存在
    const destDir = path.dirname(destPath);
    await this.ensureDirectory(destDir);

    // 检查是否应该使用流
    const stats = await stat(sourcePath);

    if (stats.size > this.config.maxFileSize && this.config.useStream) {
      await this.copyFileStream(sourcePath, destPath, options);
    } else {
      const data = await this.readFile(sourcePath);
      await this.writeFile(destPath, data);
    }
  }

  /**
   * 使用流复制文件
   */
  async copyFileStream(sourcePath, destPath, options = {}) {
    const readStream = fs.createReadStream(sourcePath);
    const writeStream = fs.createWriteStream(destPath);

    return pipeline(readStream, writeStream);
  }

  /**
   * 确保目录存在
   */
  async ensureDirectory(dirPath) {
    try {
      await mkdir(dirPath, { recursive: true });
    } catch (error) {
      // 忽略目录已存在的错误
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * 移动文件
   */
  async moveFile(sourcePath, destPath, options = {}) {
    // 确保目标目录存在
    const destDir = path.dirname(destPath);
    await this.ensureDirectory(destDir);

    // 复制文件
    await this.copyFile(sourcePath, destPath, options);

    // 删除源文件
    await fs.promises.unlink(sourcePath);
  }

  /**
   * 删除文件或目录
   */
  async deletePath(targetPath, options = {}) {
    const stats = await stat(targetPath);

    if (stats.isDirectory()) {
      await this.deleteDirectory(targetPath, options);
    } else {
      await fs.promises.unlink(targetPath);
    }
  }

  /**
   * 递归删除目录
   */
  async deleteDirectory(dirPath, options = {}) {
    const entries = await readdir(dirPath);

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      await this.deletePath(fullPath, options);
    }

    await fs.promises.rmdir(dirPath);
  }

  /**
   * 获取缓存键
   */
  getCacheKey(filePath, options) {
    return `${filePath}:${JSON.stringify(options)}`;
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.fileCache.clear();
  }

  /**
   * 获取性能指标
   */
  getMetrics() {
    const hitRate =
      this.metrics.cacheHits + this.metrics.cacheMisses > 0
        ? (
            (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) *
            100
          ).toFixed(2) + '%'
        : '0%';

    return {
      ...this.metrics,
      hitRate,
      cacheSize: this.fileCache.size,
    };
  }
}

/**
 * 信号量类
 */
class Semaphore {
  constructor(maxConcurrency) {
    this.maxConcurrency = maxConcurrency;
    this.currentConcurrency = 0;
    this.queue = [];
  }

  async acquire() {
    return new Promise(resolve => {
      if (this.currentConcurrency < this.maxConcurrency) {
        this.currentConcurrency++;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release() {
    if (this.queue.length > 0) {
      const resolve = this.queue.shift();
      resolve();
    } else {
      this.currentConcurrency--;
    }
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
    const options = {};

    if (command === 'test') {
      // 解析选项
      for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--batch-size=')) {
          options.batchSize = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--concurrency=')) {
          options.concurrency = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--source=')) {
          options.source = arg.split('=')[1];
        } else if (arg.startsWith('--dest=')) {
          options.dest = arg.split('=')[1];
        }
      }

      // 创建I/O优化器
      const optimizer = new IOOptimizer(options);

      // 执行测试
      if (options.source && options.dest) {
        // 测试文件复制
        console.log(`Copying file from ${options.source} to ${options.dest}...`);
        await optimizer.copyFile(options.source, options.dest);
        console.log('File copied successfully');
      } else {
        // 测试基本功能
        console.log('Testing basic I/O operations...');

        // 创建测试文件
        const testFile = path.join(__dirname, '.cache', 'test-io.txt');
        await optimizer.ensureDirectory(path.dirname(testFile));
        await optimizer.writeFile(testFile, 'Hello, I/O Optimizer!');

        // 读取测试文件
        const data = await optimizer.readFile(testFile);
        console.log(`Read data: ${data.toString()}`);

        // 显示性能指标
        const metrics = optimizer.getMetrics();
        console.log('Performance metrics:');
        console.log(`  Read operations: ${metrics.readOperations}`);
        console.log(`  Write operations: ${metrics.writeOperations}`);
        console.log(`  Bytes read: ${metrics.bytesRead}`);
        console.log(`  Bytes written: ${metrics.bytesWritten}`);
        console.log(`  Cache hit rate: ${metrics.hitRate}`);

        // 清理测试文件
        await optimizer.deletePath(testFile);
      }
    } else {
      console.log('用法:');
      console.log('  node io-optimizer.js test [选项]');
      console.log('');
      console.log('选项:');
      console.log('  --batch-size=<数量>  设置批量操作大小');
      console.log('  --concurrency=<数量>  设置并发数');
      console.log('  --source=<路径>     设置源文件路径');
      console.log('  --dest=<路径>       设置目标文件路径');
    }
  } catch (error) {
    console.error('I/O优化器错误:', error.message);
    process.exit(1);
  }
}

// 导出类供测试使用
module.exports = {
  IOOptimizer,
  Semaphore,
};

// 如果直接运行此脚本，执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
