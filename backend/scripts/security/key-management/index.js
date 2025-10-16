const KeyManager = require('./key-manager');
const TrustManager = require('./trust-manager');
const KeyCache = require('./key-cache');
const WindowsACLManager = require('./windows-acl');

/**
 * 密钥管理模块入口
 * 提供统一的密钥管理接口
 */
class KeyManagementModule {
  constructor() {
    this.keyManager = new KeyManager();
    this.trustManager = new TrustManager();
    this.keyCache = new KeyCache();
    this.windowsACLManager = new WindowsACLManager();
  }

  /**
   * 初始化密钥管理系统
   * @returns {Promise<Object>} 初始化结果
   */
  async initialize() {
    try {
      console.log('初始化密钥管理模块...');

      // 检查目录权限
      await this.checkDirectoryPermissions();

      // 清理过期缓存
      this.keyCache.cleanup();

      // 获取系统状态
      const status = await this.getSystemStatus();

      console.log('密钥管理模块初始化完成');
      return {
        success: true,
        status,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('密钥管理模块初始化失败:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 获取系统状态
   * @returns {Promise<Object>} 系统状态
   */
  async getSystemStatus() {
    const keyStats = this.keyManager.getKeyStats();
    const trustStats = this.trustManager.getTrustStats();
    const cacheStats = this.keyCache.getStats();
    const aclStatus = await this.windowsACLManager.getACLStatusReport();

    return {
      keys: keyStats,
      trust: trustStats,
      cache: cacheStats,
      acl: aclStatus,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 检查目录权限
   */
  async checkDirectoryPermissions() {
    const directories = [
      require('../shared/config').CONFIG.keysDir,
      require('../shared/config').CONFIG.trustStoreDir,
      require('../shared/config').CONFIG.keyHistoryDir,
    ];

    for (const dir of directories) {
      try {
        await require('fs').promises.access(
          dir,
          require('fs').constants.R_OK | require('fs').constants.W_OK,
        );
      } catch (error) {
        console.warn(`目录权限检查失败: ${dir} - ${error.message}`);
      }
    }
  }

  /**
   * 优雅关闭
   */
  async shutdown() {
    console.log('关闭密钥管理模块...');

    // 清理缓存
    this.keyCache.cleanup();

    // 保存元数据
    await this.keyManager.saveKeyMetadata().catch(console.error);
    await this.trustManager.saveTrustStore().catch(console.error);

    console.log('密钥管理模块已关闭');
  }
}

// 导出所有组件和模块
module.exports = {
  KeyManagementModule,
  KeyManager,
  TrustManager,
  KeyCache,
  WindowsACLManager,
};
