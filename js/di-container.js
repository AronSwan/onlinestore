/**
 * 依赖注入容器
 * 管理应用程序中的依赖关系，消除全局变量污染
 * 提供统一的依赖注册和解析机制
 *
 * @author AI Assistant
 * @version 1.0.0
 * @created 2025-01-07
 */

class DIContainer {
  constructor() {
    // 存储已注册的依赖
    this.dependencies = new Map();
    // 存储单例实例
    this.singletons = new Map();
    // 存储工厂函数
    this.factories = new Map();

    // 注册默认依赖
    this.registerDefaults();
  }

  /**
     * 注册默认的系统依赖
     * 包括DOM、存储、工具等基础服务
     * @private
     */
  registerDefaults() {
    // DOM相关依赖
    this.register('document', () => window.document, { singleton: true });
    this.register('window', () => window, { singleton: true });

    // DOM工具类
    this.register('domUtils', () => ({
      querySelector: (selector) => document.querySelector(selector),
      querySelectorAll: (selector) => document.querySelectorAll(selector),
      getElementById: (id) => document.getElementById(id),
      createElement: (tagName) => document.createElement(tagName),
      addEventListener: (element, event, handler) => element.addEventListener(event, handler),
      removeEventListener: (element, event, handler) => element.removeEventListener(event, handler)
    }), { singleton: true });

    // 存储服务
    this.register('storage', () => ({
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
      removeItem: (key) => localStorage.removeItem(key),
      clear: () => localStorage.clear(),
      key: (index) => localStorage.key(index),
      get length() { return localStorage.length; }
    }), { singleton: true });

    // 配置服务
    this.register('config', () => window.config || {}, { singleton: true });

    // 常量服务
    this.register('constants', () => window.CONSTANTS || {}, { singleton: true });

    // 工具服务
    this.register('utils', () => window.utils || {
      showNotification: (message, type = 'info') => {
        console.log(`[${type.toUpperCase()}] ${message}`);
      }
    }, { singleton: true });

    // 通知系统服务
    this.register('notificationSystem', () => {
      if (window.NotificationSystem) {
        return new window.NotificationSystem();
      }
      return {
        show: (message, type = 'info') => {
          console.log(`[${type.toUpperCase()}] ${message}`);
        }
      };
    }, { singleton: true });

    // 工具函数服务
    this.register('utilityFunctions', () => {
      if (window.UtilityFunctions) {
        return new window.UtilityFunctions();
      }
      return {
        debounce: (func, wait) => {
          let timeout;
          return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
          };
        },
        objectAssign: (target, ...sources) => Object.assign(target || {}, ...sources)
      };
    }, { singleton: true });

    // HTML清理服务
    this.register('htmlSanitizer', () => {
      if (window.HTMLSanitizer) {
        return new window.HTMLSanitizer();
      }
      return {
        escapeHtml: (text) => {
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        }
      };
    }, { singleton: true });

    // ID生成服务
    this.register('idGenerator', () => {
      if (window.IDGenerator) {
        return new window.IDGenerator();
      }
      return {
        generateSecureId: () => 'id_' + Math.random().toString(36).substr(2, 9)
      };
    }, { singleton: true });
  }

  /**
     * 注册依赖
     * @param {string} name - 依赖名称
     * @param {Function|*} factory - 工厂函数或直接值
     * @param {Object} options - 选项
     * @param {boolean} options.singleton - 是否为单例
     */
  register(name, factory, options = {}) {
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('Dependency name must be a non-empty string');
    }

    const config = {
      factory: typeof factory === 'function' ? factory : () => factory,
      singleton: options.singleton || false,
      dependencies: options.dependencies || []
    };

    this.dependencies.set(name, config);

    // 如果是单例且已有实例，清除旧实例
    if (config.singleton && this.singletons.has(name)) {
      this.singletons.delete(name);
    }
  }

  /**
     * 解析依赖
     * @param {string} name - 依赖名称
     * @returns {*} 依赖实例
     */
  resolve(name) {
    if (!this.dependencies.has(name)) {
      throw new Error(`Dependency '${name}' not found`);
    }

    const config = this.dependencies.get(name);

    // 如果是单例且已存在实例，直接返回
    if (config.singleton && this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // 解析依赖的依赖
    const resolvedDependencies = config.dependencies.map(dep => this.resolve(dep));

    // 创建实例
    const instance = config.factory(...resolvedDependencies);

    // 如果是单例，缓存实例
    if (config.singleton) {
      this.singletons.set(name, instance);
    }

    return instance;
  }

  /**
     * 创建类实例，自动注入依赖
     * @param {string} name - 实例名称（用于缓存）
     * @param {Function} Constructor - 构造函数
     * @param {Object} options - 选项
     * @returns {*} 类实例
     */
  create(name, Constructor, options = {}) {
    if (typeof Constructor !== 'function') {
      throw new Error('Constructor must be a function');
    }

    // 如果是单例且已存在，直接返回
    if (options.singleton && this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // 准备依赖对象
    const dependencies = {
      domUtils: this.resolve('domUtils'),
      storage: this.resolve('storage'),
      config: this.resolve('config'),
      constants: this.resolve('constants'),
      utils: this.resolve('utils'),
      window: this.resolve('window'),
      document: this.resolve('document')
    };

    // 创建实例
    const instance = new Constructor(dependencies);

    // 如果是单例，缓存实例
    if (options.singleton) {
      this.singletons.set(name, instance);
    }

    return instance;
  }

  /**
     * 检查依赖是否已注册
     * @param {string} name - 依赖名称
     * @returns {boolean}
     */
  has(name) {
    return this.dependencies.has(name);
  }

  /**
     * 移除依赖
     * @param {string} name - 依赖名称
     */
  remove(name) {
    this.dependencies.delete(name);
    this.singletons.delete(name);
  }

  /**
     * 清空所有依赖
     */
  clear() {
    this.dependencies.clear();
    this.singletons.clear();
    this.factories.clear();
  }

  /**
     * 获取所有已注册的依赖名称
     * @returns {string[]}
     */
  getRegisteredNames() {
    return Array.from(this.dependencies.keys());
  }

  /**
     * 获取容器状态信息
     * @returns {Object}
     */
  getStatus() {
    return {
      totalDependencies: this.dependencies.size,
      singletonInstances: this.singletons.size,
      registeredNames: this.getRegisteredNames()
    };
  }
}

// 创建全局依赖注入容器实例
if (!window.diContainer) {
  window.diContainer = new DIContainer();

  // 在开发环境下提供调试信息
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('DI Container initialized:', window.diContainer.getStatus());

    // 提供全局调试方法
    window.debugDI = () => {
      console.log('DI Container Status:', window.diContainer.getStatus());
      console.log('Registered Dependencies:', window.diContainer.getRegisteredNames());
    };
  }
}

// 导出容器类（用于测试）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DIContainer;
}
