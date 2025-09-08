/**
 * 统一配置管理器入口
 * 整合所有拆分后的配置类，提供统一的访问接口
 */

// 导入所有配置类
const performanceConfig = require('./config/PerformanceConfig.js');
const lazyLoaderConfig = require('./config/LazyLoaderConfig.js');
const imageOptimizationConfig = require('./config/ImageOptimizationConfig.js');
const notificationConfig = require('./config/NotificationConfig.js');
const shoppingCartConfig = require('./config/ShoppingCartConfig.js');
const eventDelegationConfig = require('./config/EventDelegationConfig.js');
const codeAnalysisConfig = require('./config/CodeAnalysisConfig.js');
const apiConfig = require('./config/APIConfig.js');
const debugConfig = require('./config/DebugConfig.js');

/**
 * 统一配置管理器
 * 提供对所有配置模块的统一访问接口
 */
class ConfigManager {
  constructor() {
    this.modules = {
      performance: performanceConfig,
      lazyLoader: lazyLoaderConfig,
      imageOptimization: imageOptimizationConfig,
      notifications: notificationConfig,
      cart: shoppingCartConfig,
      eventDelegation: eventDelegationConfig,
      codeAnalysis: codeAnalysisConfig,
      api: apiConfig,
      debug: debugConfig
    };

    // 创建模块映射，用于向后兼容
    this.legacyMapping = {
      'PERFORMANCE': 'performance',
      'LAZY_LOADING': 'lazyLoader',
      'IMAGE_OPTIMIZATION': 'imageOptimization',
      'NOTIFICATIONS': 'notifications',
      'SHOPPING_CART': 'cart',
      'EVENT_DELEGATION': 'eventDelegation',
      'CODE_ANALYSIS': 'codeAnalysis',
      'API': 'api',
      'DEBUG': 'debug'
    };
  }

  /**
   * 获取配置值（支持旧版本的点号分隔键名）
   * @param {string} path - 配置路径
   * @param {*} defaultValue - 默认值
   * @returns {*} 配置值
   */
  get(path, defaultValue) {
    const keys = path.split('.');
    const moduleKey = keys[0];

    // 检查是否为旧版本的键名
    const actualModuleKey = this.legacyMapping[moduleKey] || moduleKey.toLowerCase();
    const module = this.modules[actualModuleKey];

    if (!module) {
      return defaultValue;
    }

    if (keys.length === 1) {
      return module.getAll();
    }

    const subKey = keys.slice(1).join('.');
    return module.get(subKey, defaultValue);
  }

  /**
   * 检查配置键是否存在
   * @param {string} path - 配置路径
   * @returns {boolean} 是否存在
   */
  has(path) {
    const keys = path.split('.');
    const moduleKey = keys[0];

    const actualModuleKey = this.legacyMapping[moduleKey] || moduleKey.toLowerCase();
    const module = this.modules[actualModuleKey];

    if (!module) {
      return false;
    }

    if (keys.length === 1) {
      return true;
    }

    const subKey = keys.slice(1).join('.');
    return module.has(subKey);
  }

  /**
   * 获取所有配置
   * @returns {object} 所有配置的合并对象
   */
  getAll() {
    const allConfig = {};

    for (const [moduleName, module] of Object.entries(this.modules)) {
      allConfig[moduleName] = module.getAll();
    }

    return allConfig;
  }

  /**
   * 获取指定模块的配置管理器
   * @param {string} moduleName - 模块名称
   * @returns {object|null} 配置管理器实例
   */
  getModule(moduleName) {
    const actualModuleKey = this.legacyMapping[moduleName] || moduleName.toLowerCase();
    return this.modules[actualModuleKey] || null;
  }

  /**
   * 获取所有可用的模块名称
   * @returns {string[]} 模块名称列表
   */
  getModuleNames() {
    return Object.keys(this.modules);
  }

  // 向后兼容的便捷方法

  /**
   * 格式化价格显示
   * @param {number} price - 价格
   * @param {string} currency - 货币代码
   * @returns {string} 格式化后的价格字符串
   */
  formatPrice(price, currency = null) {
    return this.modules.cart.formatPrice ? this.modules.cart.formatPrice(price, currency) : `$${price.toFixed(2)}`;
  }

  /**
   * 获取API端点URL
   * @param {string} endpoint - 端点名称
   * @param {string} id - 可选的资源ID
   * @returns {string} 完整的API URL
   */
  getApiUrl(endpoint, id = null) {
    return this.modules.api.getApiUrl ? this.modules.api.getApiUrl(endpoint, id) : `/api/${endpoint}${id ? '/' + id : ''}`;
  }

  /**
   * 获取环境特定配置
   * @returns {object} 环境配置
   */
  getEnvironmentConfig() {
    const isDevelopment = process?.env?.NODE_ENV === 'development' ||
                         (typeof window !== 'undefined' && window.location.hostname === 'localhost');

    return {
      isDevelopment,
      isProduction: !isDevelopment,
      debugMode: this.modules.debug.isEnabled ? this.modules.debug.isEnabled() : false,
      apiUrl: isDevelopment ? 'http://localhost:3000/api' : '/api',
      logLevel: isDevelopment ? 'debug' : 'error'
    };
  }

  /**
   * 检查功能是否启用
   * @param {string} feature - 功能名称
   * @returns {boolean} 是否启用
   */
  isFeatureEnabled(feature) {
    // 检查各个模块的启用状态
    const featureMapping = {
      'performance_monitoring': () => this.modules.performance.isMonitoringEnabled ? this.modules.performance.isMonitoringEnabled() : false,
      'lazy_loading': () => this.modules.lazyLoader.isEnabled ? this.modules.lazyLoader.isEnabled() : false,
      'image_optimization': () => this.modules.imageOptimization.isEnabled ? this.modules.imageOptimization.isEnabled() : false,
      'notifications': () => this.modules.notifications.isEnabled ? this.modules.notifications.isEnabled() : false,
      'api_cache': () => this.modules.api.isCacheEnabled ? this.modules.api.isCacheEnabled() : false,
      'debug_mode': () => this.modules.debug.isEnabled ? this.modules.debug.isEnabled() : false
    };

    const checker = featureMapping[feature];
    return checker ? checker() : false;
  }

  /**
   * 获取配置摘要信息
   * @returns {object} 配置摘要
   */
  getConfigSummary() {
    return {
      modules: this.getModuleNames(),
      environment: this.getEnvironmentConfig(),
      features: {
        performanceMonitoring: this.isFeatureEnabled('performance_monitoring'),
        lazyLoading: this.isFeatureEnabled('lazy_loading'),
        imageOptimization: this.isFeatureEnabled('image_optimization'),
        notifications: this.isFeatureEnabled('notifications'),
        apiCache: this.isFeatureEnabled('api_cache'),
        debugMode: this.isFeatureEnabled('debug_mode')
      },
      version: '2.0.0',
      lastUpdated: new Date().toISOString()
    };
  }
}

// 创建全局配置实例
const config = new ConfigManager();

// 导出配置管理器
if (typeof window !== 'undefined') {
  window.config = config;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = config;
}

// 导出常用配置的快捷访问
const PERFORMANCE_CONFIG = config.getModule('performance');
const LAZY_LOADER_CONFIG = config.getModule('lazyLoader');
const IMAGE_CONFIG = config.getModule('imageOptimization');
const NOTIFICATION_CONFIG = config.getModule('notifications');
const CART_CONFIG = config.getModule('cart');
const DEBUG_CONFIG = config.getModule('debug');

if (typeof window !== 'undefined') {
  Object.assign(window, {
    PERFORMANCE_CONFIG,
    LAZY_LOADER_CONFIG,
    IMAGE_CONFIG,
    NOTIFICATION_CONFIG,
    CART_CONFIG,
    DEBUG_CONFIG
  });
}
