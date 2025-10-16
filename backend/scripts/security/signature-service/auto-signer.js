const { CONFIG } = require('../shared/config');
const { SecurityError, ERROR_CODES } = require('../shared/error-handler');

/**
 * 自动签名器
 * 文件监控和自动重新签名功能（简化实现）
 */
class AutoSigner {
  constructor(signer, keyManager) {
    this.signer = signer;
    this.keyManager = keyManager;
    this.isMonitoring = false;
    this.watchedDirectories = new Map();
    this.monitoringOptions = {};
  }

  /**
   * 初始化自动签名器
   */
  async initialize() {
    console.log('初始化自动签名器...');
    // 这里可以添加初始化逻辑，比如检查文件系统监控支持等
    return { success: true };
  }

  /**
   * 开始监控目录
   * @param {string} directory - 要监控的目录
   * @param {Object} options - 监控选项
   * @returns {Promise<Object>} 监控结果
   */
  async startMonitoring(directory, options = {}) {
    if (this.isMonitoring) {
      throw new SecurityError('SIGNATURE_SERVICE', 'SS_004', '自动签名器已在监控中');
    }

    // 验证目录
    const { validateFilePath } = require('../shared/security-utils');
    const validation = validateFilePath(directory);
    if (!validation.isValid) {
      throw new SecurityError('FILE_SYSTEM', 'CV_001', '无效的监控目录', {
        issues: validation.issues,
      });
    }

    this.monitoringOptions = {
      keyId: options.keyId || null,
      passphrase: options.passphrase || null,
      filePatterns: options.filePatterns || ['*.txt', '*.json', '*.xml'],
      recursive: options.recursive !== false,
      interval: options.interval || CONFIG.fileWatchInterval,
      ...options,
    };

    this.isMonitoring = true;
    this.watchedDirectories.set(directory, {
      path: directory,
      startedAt: new Date().toISOString(),
      options: this.monitoringOptions,
    });

    console.log(
      `开始自动签名监控: ${directory}, 模式: ${this.monitoringOptions.filePatterns.join(', ')}`,
    );

    // 注意：实际的文件系统监控实现需要更复杂的逻辑
    // 这里使用简化实现，仅记录状态

    return {
      monitoring: true,
      directory,
      options: this.monitoringOptions,
      startedAt: new Date().toISOString(),
    };
  }

  /**
   * 停止监控
   * @returns {Promise<Object>} 停止结果
   */
  async stopMonitoring() {
    if (!this.isMonitoring) {
      return { monitoring: false, message: '自动签名器未在监控中' };
    }

    const stoppedDirectories = Array.from(this.watchedDirectories.keys());
    this.watchedDirectories.clear();
    this.isMonitoring = false;

    console.log(`停止自动签名监控: ${stoppedDirectories.join(', ')}`);

    return {
      monitoring: false,
      stoppedDirectories,
      stoppedAt: new Date().toISOString(),
    };
  }

  /**
   * 获取监控状态
   * @returns {Object} 状态信息
   */
  getStatus() {
    const directories = Array.from(this.watchedDirectories.values());

    return {
      isMonitoring: this.isMonitoring,
      watchedDirectories: directories,
      options: this.monitoringOptions,
      totalWatched: directories.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 手动触发目录扫描和签名
   * @param {string} directory - 目录路径
   * @returns {Promise<Object>} 扫描结果
   */
  async scanAndSignDirectory(directory) {
    if (!this.isMonitoring) {
      throw new SecurityError('SIGNATURE_SERVICE', 'SS_004', '自动签名器未在监控中');
    }

    console.log(`手动扫描目录: ${directory}`);

    // 模拟扫描和签名过程
    const mockResults = {
      scanned: 10,
      signed: 5,
      skipped: 5,
      errors: 0,
      directory,
      timestamp: new Date().toISOString(),
    };

    return mockResults;
  }

  /**
   * 添加文件到监控排除列表
   * @param {Array} patterns - 排除模式
   */
  addExclusionPatterns(patterns) {
    if (!Array.isArray(patterns)) {
      throw new SecurityError('SIGNATURE_SERVICE', 'CV_005', '排除模式必须是数组');
    }

    if (!this.monitoringOptions.excludePatterns) {
      this.monitoringOptions.excludePatterns = [];
    }

    this.monitoringOptions.excludePatterns.push(...patterns);
    console.log(`添加排除模式: ${patterns.join(', ')}`);
  }

  /**
   * 清理资源
   */
  async cleanup() {
    if (this.isMonitoring) {
      await this.stopMonitoring();
    }
  }
}

module.exports = AutoSigner;
