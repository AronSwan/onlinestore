/**
 * 懒加载配置管理器
 * 专门负责懒加载相关的配置常量和设置
 */
class LazyLoaderConfig {
  constructor() {
    this.config = {
      RETRY_ATTEMPTS: 3,
      RETRY_DELAY: 1000,
      TIMEOUT_DURATION: 10000,
      VALID_MODULE_TYPES: ['route', 'component', 'script'],
      ROUTE_MODULES: {
        '#home': 'home',
        '#products': 'products',
        '#cart': 'cart',
        '#checkout': 'checkout',
        '#about': 'about',
        '#contact': 'contact'
      },
      COMPONENT_MODULES: {
        'product-card': 'product-card',
        'cart-widget': 'cart-widget',
        'search-bar': 'search-bar',
        'user-profile': 'user-profile'
      }
    };

    Object.freeze(this.config);
  }

  /**
   * 获取配置值
   * @param {string} key - 配置键
   * @param {*} defaultValue - 默认值
   * @returns {*} 配置值
   */
  get(key, defaultValue) {
    return Object.prototype.hasOwnProperty.call(this.config, key) ? this.config[key] : defaultValue;
  }

  /**
   * 检查配置键是否存在
   * @param {string} key - 配置键
   * @returns {boolean} 是否存在
   */
  has(key) {
    return Object.prototype.hasOwnProperty.call(this.config, key);
  }

  /**
   * 获取所有配置
   * @returns {object} 配置对象的深拷贝
   */
  getAll() {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * 获取重试配置
   * @returns {object} 重试配置
   */
  getRetryConfig() {
    return {
      attempts: this.config.RETRY_ATTEMPTS,
      delay: this.config.RETRY_DELAY,
      timeout: this.config.TIMEOUT_DURATION
    };
  }

  /**
   * 获取路由模块映射
   * @returns {object} 路由模块映射
   */
  getRouteModules() {
    return JSON.parse(JSON.stringify(this.config.ROUTE_MODULES));
  }

  /**
   * 获取组件模块映射
   * @returns {object} 组件模块映射
   */
  getComponentModules() {
    return JSON.parse(JSON.stringify(this.config.COMPONENT_MODULES));
  }

  /**
   * 根据路由获取模块名
   * @param {string} route - 路由
   * @returns {string|null} 模块名
   */
  getModuleByRoute(route) {
    return this.config.ROUTE_MODULES[route] || null;
  }

  /**
   * 根据组件名获取模块名
   * @param {string} component - 组件名
   * @returns {string|null} 模块名
   */
  getModuleByComponent(component) {
    return this.config.COMPONENT_MODULES[component] || null;
  }

  /**
   * 验证模块类型是否有效
   * @param {string} type - 模块类型
   * @returns {boolean} 是否有效
   */
  isValidModuleType(type) {
    return this.config.VALID_MODULE_TYPES.includes(type);
  }

  /**
   * 获取所有支持的模块类型
   * @returns {string[]} 模块类型数组
   */
  getValidModuleTypes() {
    return [...this.config.VALID_MODULE_TYPES];
  }
}

// 创建全局实例
const lazyLoaderConfig = new LazyLoaderConfig();

// 导出配置管理器
if (typeof window !== 'undefined') {
  window.lazyLoaderConfig = lazyLoaderConfig;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = lazyLoaderConfig;
}
