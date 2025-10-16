const { CONFIG } = require('../shared/config');
const { SecurityError, ERROR_CODES, AsyncOperationManager } = require('../shared/error-handler');

/**
 * 批量签名器
 * 高效处理批量签名操作
 */
class BatchSigner {
  constructor(signer) {
    this.signer = signer;
    this.asyncOperationManager = new AsyncOperationManager();
    this.batchStats = {
      totalBatches: 0,
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageBatchSize: 0,
      totalProcessingTime: 0,
    };
  }

  /**
   * 执行批量签名操作
   * @param {Array} operations - 批量操作数组
   * @param {Object} options - 批量选项
   * @returns {Promise<Object>} 批量操作结果
   */
  async executeBatch(operations, options = {}) {
    if (!Array.isArray(operations) || operations.length === 0) {
      throw new SecurityError('SIGNATURE_SERVICE', 'CV_005', '无效的批量操作数组');
    }

    const batchId = this.generateBatchId();
    const startTime = Date.now();

    console.log(`开始批量签名操作: ${batchId}, 操作数: ${operations.length}`);

    const batchOptions = {
      concurrency: options.concurrency || CONFIG.maxConcurrentOperations,
      timeout: options.timeout || CONFIG.asyncOperationTimeout,
      continueOnError: options.continueOnError !== false,
      ...options,
    };

    // 分组操作以提高效率
    const operationGroups = this.groupOperations(operations, batchOptions.concurrency);

    const results = {
      batchId,
      totalOperations: operations.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      details: [],
      processingTime: 0,
      options: batchOptions,
    };

    // 执行批量操作
    for (const [groupIndex, group] of operationGroups.entries()) {
      const groupResults = await this.processOperationGroup(group, batchOptions, groupIndex);

      results.successful += groupResults.successful;
      results.failed += groupResults.failed;
      results.skipped += groupResults.skipped;
      results.details.push(...groupResults.details);
    }

    results.processingTime = Date.now() - startTime;

    // 更新统计信息
    this.updateBatchStats(results);

    console.log(
      `批量签名操作完成: ${batchId}, 成功: ${results.successful}, 失败: ${results.failed}, 耗时: ${results.processingTime}ms`,
    );

    return results;
  }

  /**
   * 批量文件签名
   * @param {Array} filePaths - 文件路径数组
   * @param {string} keyId - 密钥ID
   * @param {string} passphrase - 口令（可选）
   * @param {Object} options - 批量选项
   * @returns {Promise<Object>} 批量签名结果
   */
  async signFilesBatch(filePaths, keyId = null, passphrase = null, options = {}) {
    const operations = filePaths.map(filePath => ({
      type: 'sign_file',
      filePath,
      keyId,
      passphrase,
      metadata: {
        fileName: require('path').basename(filePath),
        timestamp: new Date().toISOString(),
      },
    }));

    return this.executeBatch(operations, options);
  }

  /**
   * 批量验证文件签名
   * @param {Array} filePaths - 文件路径数组
   * @param {Object} options - 验证选项
   * @returns {Promise<Object>} 批量验证结果
   */
  async verifyFilesBatch(filePaths, options = {}) {
    const operations = filePaths.map(filePath => ({
      type: 'verify_file',
      filePath,
      options: {
        throwOnInvalid: false,
        ...options,
      },
      metadata: {
        fileName: require('path').basename(filePath),
        timestamp: new Date().toISOString(),
      },
    }));

    return this.executeBatch(operations, options);
  }

  /**
   * 混合批量操作
   * @param {Array} operations - 混合操作数组
   * @param {Object} options - 批量选项
   * @returns {Promise<Object>} 混合操作结果
   */
  async executeMixedBatch(operations, options = {}) {
    // 验证操作类型
    const validTypes = ['sign_file', 'verify_file', 'export_key', 'import_key'];

    for (const operation of operations) {
      if (!validTypes.includes(operation.type)) {
        throw new SecurityError('SIGNATURE_SERVICE', 'CV_005', `无效的操作类型: ${operation.type}`);
      }
    }

    return this.executeBatch(operations, options);
  }

  /**
   * 获取批量统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const operationStats = this.asyncOperationManager.getOperationStats();

    return {
      batchStats: this.batchStats,
      operationStats,
      efficiency: this.calculateEfficiency(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.batchStats = {
      totalBatches: 0,
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageBatchSize: 0,
      totalProcessingTime: 0,
    };

    console.log('批量签名器统计信息已重置');
  }

  /**
   * 优化批量操作
   * @param {Array} operations - 操作数组
   * @param {Object} options - 优化选项
   * @returns {Array} 优化后的操作数组
   */
  optimizeBatch(operations, options = {}) {
    const optimized = [...operations];

    // 按类型分组
    if (options.groupByType !== false) {
      optimized.sort((a, b) => a.type.localeCompare(b.type));
    }

    // 按文件大小排序（如果可能）
    if (options.sortBySize) {
      // 这里可以添加文件大小排序逻辑
    }

    // 去重
    if (options.deduplicate !== false) {
      const seen = new Set();
      return optimized.filter(op => {
        const key = `${op.type}:${op.filePath || op.keyId || ''}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    }

    return optimized;
  }

  // ========== 私有方法 ==========

  /**
   * 处理操作组
   */
  async processOperationGroup(operations, options, groupIndex) {
    const groupResults = {
      successful: 0,
      failed: 0,
      skipped: 0,
      details: [],
    };

    const groupPromises = operations.map((operation, index) =>
      this.asyncOperationManager.executeInQueue(
        `batch-${groupIndex}-${index}`,
        async () => {
          try {
            const result = await this.executeSingleOperation(operation, options);
            groupResults.successful++;
            groupResults.details.push({
              operation: operation.type,
              filePath: operation.filePath,
              keyId: operation.keyId,
              status: 'success',
              result,
            });
            return result;
          } catch (error) {
            groupResults.failed++;
            groupResults.details.push({
              operation: operation.type,
              filePath: operation.filePath,
              keyId: operation.keyId,
              status: 'failed',
              error: error.message,
              errorCode: error.code,
            });

            if (!options.continueOnError) {
              throw error;
            }

            return null;
          }
        },
        'normal',
      ),
    );

    await Promise.all(groupPromises);

    return groupResults;
  }

  /**
   * 执行单个操作
   */
  async executeSingleOperation(operation, options) {
    switch (operation.type) {
      case 'sign_file':
        return await this.signer.signFile(
          operation.filePath,
          operation.keyId,
          operation.passphrase,
        );

      case 'verify_file':
        return await this.signer.verifyFileSignature(
          operation.filePath,
          operation.signaturePath,
          operation.options,
        );

      case 'export_key':
        // 实现密钥导出逻辑
        return { operation: 'export_key', keyId: operation.keyId, status: 'not_implemented' };

      case 'import_key':
        // 实现密钥导入逻辑
        return { operation: 'import_key', keyId: operation.keyId, status: 'not_implemented' };

      default:
        throw new SecurityError('SIGNATURE_SERVICE', 'CV_005', `未知的操作类型: ${operation.type}`);
    }
  }

  /**
   * 分组操作
   */
  groupOperations(operations, concurrency) {
    const groups = [];
    const groupSize = Math.ceil(operations.length / concurrency);

    for (let i = 0; i < operations.length; i += groupSize) {
      groups.push(operations.slice(i, i + groupSize));
    }

    return groups;
  }

  /**
   * 生成批次ID
   */
  generateBatchId() {
    const { generateRandomString } = require('../shared/security-utils');
    return `batch_${Date.now()}_${generateRandomString(6)}`;
  }

  /**
   * 更新批量统计
   */
  updateBatchStats(results) {
    this.batchStats.totalBatches++;
    this.batchStats.totalOperations += results.totalOperations;
    this.batchStats.successfulOperations += results.successful;
    this.batchStats.failedOperations += results.failed;
    this.batchStats.totalProcessingTime += results.processingTime;

    // 计算平均批次大小
    this.batchStats.averageBatchSize =
      this.batchStats.totalOperations / this.batchStats.totalBatches;
  }

  /**
   * 计算效率指标
   */
  calculateEfficiency() {
    if (this.batchStats.totalOperations === 0) {
      return {
        successRate: 0,
        averageTimePerOperation: 0,
        operationsPerSecond: 0,
        efficiencyScore: 0,
      };
    }

    const successRate =
      (this.batchStats.successfulOperations / this.batchStats.totalOperations) * 100;
    const averageTimePerOperation =
      this.batchStats.totalProcessingTime / this.batchStats.totalOperations;
    const operationsPerSecond =
      this.batchStats.totalOperations / (this.batchStats.totalProcessingTime / 1000);

    // 效率评分（0-100）
    const efficiencyScore = Math.min(
      100,
      successRate * 0.4 +
        Math.max(0, 100 - averageTimePerOperation / 10) * 0.3 +
        Math.min(100, operationsPerSecond) * 0.3,
    );

    return {
      successRate: Math.round(successRate * 100) / 100,
      averageTimePerOperation: Math.round(averageTimePerOperation),
      operationsPerSecond: Math.round(operationsPerSecond * 100) / 100,
      efficiencyScore: Math.round(efficiencyScore * 100) / 100,
    };
  }
}

module.exports = BatchSigner;
