/**
 * 错误处理模块单元测试
 *
 * 测试覆盖：
 * 1. SecurityError 类
 * 2. ErrorRecoveryManager 类
 * 3. AsyncOperationManager 类
 * 4. 错误代码定义
 *
 * @author 后端开发团队
 * @version 2.0.0
 * @since 2025-10-13
 */

const {
  ERROR_CODES,
  SecurityError,
  ErrorRecoveryManager,
  AsyncOperationManager,
} = require('../../shared/error-handler');
const fs = require('fs').promises;
const path = require('path');

describe('错误处理模块测试', () => {
  describe('SecurityError 类', () => {
    test('应该创建安全错误实例', () => {
      const error = new SecurityError('key-management', 'KM_001', '密钥生成失败', {
        keyName: 'test-key',
      });

      expect(error.name).toBe('SecurityError');
      expect(error.domain).toBe('key-management');
      expect(error.code).toBe('KM_001');
      expect(error.message).toBe('密钥生成失败');
      expect(error.details.keyName).toBe('test-key');
      expect(error.timestamp).toBeDefined();
      expect(error.stackTrace).toBeDefined();
    });

    test('应该转换错误为JSON格式', () => {
      const error = new SecurityError('signature-service', 'SS_001', '签名失败');

      const json = error.toJSON();

      expect(json.name).toBe('SecurityError');
      expect(json.domain).toBe('signature-service');
      expect(json.code).toBe('SS_001');
      expect(json.message).toBe('签名失败');
      expect(json.timestamp).toBeDefined();
      expect(json.stackTrace).toBeDefined();
    });

    test('应该计算错误严重性级别', () => {
      const criticalError = new SecurityError('key-management', 'KM_001', '密钥生成失败');
      const highError = new SecurityError('configuration', 'CV_001', '验证错误');
      const mediumError = new SecurityError('trust-management', 'TM_005', '指纹已存在');

      expect(criticalError.getSeverity()).toBe('CRITICAL');
      expect(highError.getSeverity()).toBe('HIGH');
      expect(mediumError.getSeverity()).toBe('MEDIUM');
    });

    test('应该保留原始错误信息', () => {
      const originalError = new Error('原始错误');
      const securityError = new SecurityError('system', 'SY_001', '包装错误', { originalError });

      expect(securityError.originalError.message).toBe('原始错误');
      expect(securityError.originalError.stack).toBeDefined();
    });
  });

  describe('ErrorRecoveryManager 类', () => {
    let recoveryManager;

    beforeEach(() => {
      recoveryManager = new ErrorRecoveryManager();
    });

    test('应该注册恢复策略', () => {
      const strategy = jest.fn();
      recoveryManager.registerRecoveryStrategy('FS_001', strategy);

      expect(recoveryManager.recoveryStrategies.has('FS_001')).toBe(true);
    });

    test('应该成功执行带恢复的操作', async () => {
      const operation = jest.fn().mockResolvedValue('成功');

      const result = await recoveryManager.executeWithRecovery('test-operation', operation);

      expect(result).toBe('成功');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('应该在重试后成功', async () => {
      let attemptCount = 0;
      const operation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          const error = new Error('临时失败');
          error.code = 'FS_001';
          throw error;
        }
        return '最终成功';
      });

      const result = await recoveryManager.executeWithRecovery('test-retry', operation, {
        maxRetries: 5,
      });

      expect(result).toBe('最终成功');
      expect(attemptCount).toBe(3);
    });

    test('应该在最大重试次数后失败', async () => {
      const operation = jest.fn().mockImplementation(() => {
        const error = new Error('持续失败');
        error.code = 'FS_001';
        throw error;
      });

      await expect(
        recoveryManager.executeWithRecovery('test-failure', operation, { maxRetries: 2 }),
      ).rejects.toThrow('持续失败');

      expect(operation).toHaveBeenCalledTimes(3); // 初始尝试 + 2次重试
    });

    test('应该应用指数退避延迟', async () => {
      const startTime = Date.now();
      const delays = [];

      const operation = jest.fn().mockImplementation(() => {
        delays.push(Date.now() - startTime);
        const error = new Error('失败');
        error.code = 'FS_001';
        throw error;
      });

      try {
        await recoveryManager.executeWithRecovery('test-backoff', operation, {
          maxRetries: 2,
          retryDelay: 100,
        });
      } catch (error) {
        // 预期失败
      }

      // 验证延迟时间符合指数退避
      expect(delays[1] - delays[0]).toBeGreaterThanOrEqual(100); // 第一次重试延迟
      expect(delays[2] - delays[1]).toBeGreaterThanOrEqual(200); // 第二次重试延迟（100 * 2）
    });

    test('应该包装非安全错误', async () => {
      const operation = jest.fn().mockImplementation(() => {
        const error = new Error('普通错误');
        throw error;
      });

      await expect(
        recoveryManager.executeWithRecovery('test-wrap', operation),
      ).rejects.toBeInstanceOf(SecurityError);
    });

    test('应该获取操作统计信息', async () => {
      // 执行一些操作
      const successOp = jest.fn().mockResolvedValue('成功');
      const failOp = jest.fn().mockRejectedValue(new Error('失败'));

      await recoveryManager.executeWithRecovery('test-success', successOp).catch(() => {});
      await recoveryManager.executeWithRecovery('test-fail', failOp).catch(() => {});

      const stats = recoveryManager.getOperationStats();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byOperation).toBeDefined();
    });
  });

  describe('AsyncOperationManager 类', () => {
    let asyncManager;

    beforeEach(() => {
      asyncManager = new AsyncOperationManager();
    });

    afterEach(async () => {
      await asyncManager.shutdown();
    });

    test('应该成功执行带超时的操作', async () => {
      const operation = jest.fn().mockResolvedValue('成功');

      const result = await asyncManager.executeWithTimeout('test-timeout', operation, 1000);

      expect(result).toBe('成功');
    });

    test('应该在超时后失败', async () => {
      const operation = jest
        .fn()
        .mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve('慢操作'), 2000)),
        );

      await expect(
        asyncManager.executeWithTimeout('test-timeout-fail', operation, 100),
      ).rejects.toThrow('操作超时: test-timeout-fail');
    });

    test('应该管理并发操作', async () => {
      const operations = [];
      const results = [];

      for (let i = 0; i < 3; i++) {
        const operation = async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return `结果-${i}`;
        };

        operations.push(
          asyncManager
            .executeInQueue(`test-concurrent-${i}`, operation)
            .then(result => results.push(result)),
        );
      }

      await Promise.all(operations);

      expect(results).toHaveLength(3);
      expect(results.sort()).toEqual(['结果-0', '结果-1', '结果-2']);
    });

    test('应该获取操作统计信息', async () => {
      const operation = jest.fn().mockResolvedValue('成功');

      await asyncManager.executeWithTimeout('test-stats-1', operation, 1000);
      await asyncManager.executeWithTimeout('test-stats-2', operation, 1000);

      const stats = asyncManager.getOperationStats();

      expect(stats).toBeDefined();
      expect(stats['test-stats-1']).toBeDefined();
      expect(stats['test-stats-2']).toBeDefined();
    });

    test('应该优雅关闭', async () => {
      const operation = jest
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('完成'), 100)));

      // 启动一个操作
      const operationPromise = asyncManager.executeWithTimeout('test-shutdown', operation, 1000);

      // 开始关闭
      const shutdownPromise = asyncManager.shutdown();

      // 等待操作完成和关闭完成
      await Promise.all([operationPromise, shutdownPromise]);

      expect(asyncManager.isShuttingDown).toBe(true);
    });
  });

  describe('错误代码定义', () => {
    test('应该包含所有错误域', () => {
      expect(ERROR_CODES.KEY_MANAGEMENT).toBeDefined();
      expect(ERROR_CODES.SIGNATURE_SERVICE).toBeDefined();
      expect(ERROR_CODES.TRUST_MANAGEMENT).toBeDefined();
      expect(ERROR_CODES.CACHE_MANAGEMENT).toBeDefined();
      expect(ERROR_CODES.FILE_SYSTEM).toBeDefined();
      expect(ERROR_CODES.ASYNC_OPERATIONS).toBeDefined();
      expect(ERROR_CODES.CONFIGURATION).toBeDefined();
      expect(ERROR_CODES.SYSTEM).toBeDefined();
    });

    test('应该包含关键错误代码', () => {
      expect(ERROR_CODES.KEY_MANAGEMENT.KEY_GENERATION_FAILED).toBe('KM_001');
      expect(ERROR_CODES.SIGNATURE_SERVICE.SIGNATURE_FAILED).toBe('SS_001');
      expect(ERROR_CODES.TRUST_MANAGEMENT.TRUST_VALIDATION_FAILED).toBe('TM_001');
      expect(ERROR_CODES.FILE_SYSTEM.PERMISSION_DENIED).toBe('FS_005');
    });

    test('应该使用错误代码创建安全错误', () => {
      const error = new SecurityError(
        'key-management',
        ERROR_CODES.KEY_MANAGEMENT.KEY_GENERATION_FAILED,
        '密钥生成失败',
      );

      expect(error.code).toBe('KM_001');
      expect(error.domain).toBe('key-management');
    });
  });

  describe('集成测试', () => {
    test('应该协同工作处理复杂错误场景', async () => {
      const recoveryManager = new ErrorRecoveryManager();
      const asyncManager = new AsyncOperationManager();

      let attemptCount = 0;
      const complexOperation = async () => {
        attemptCount++;
        if (attemptCount < 2) {
          const error = new SecurityError('file-system', 'FS_001', '文件读取失败');
          throw error;
        }
        return '复杂操作成功';
      };

      // 使用异步管理器执行带恢复的操作
      const result = await asyncManager.executeWithTimeout(
        'complex-test',
        () => recoveryManager.executeWithRecovery('complex-operation', complexOperation),
        5000,
      );

      expect(result).toBe('复杂操作成功');
      expect(attemptCount).toBe(2);

      await asyncManager.shutdown();
    });

    test('应该处理操作取消场景', async () => {
      const asyncManager = new AsyncOperationManager();

      // 立即开始关闭
      asyncManager.isShuttingDown = true;

      await expect(
        asyncManager.executeWithTimeout('cancelled-op', () => Promise.resolve('结果'), 1000),
      ).rejects.toThrow('操作被取消：系统正在关闭');

      await asyncManager.shutdown();
    });
  });
});
