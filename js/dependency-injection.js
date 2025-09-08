/**
 * 依赖注入容器 - 消除全局变量污染
 * 提供统一的依赖管理和注入机制
 * @author AI Assistant
 * @date 2025-01-07
 */

class DependencyContainer {
  constructor() {
    this.dependencies = new Map();
    this.singletons = new Map();
    this.factories = new Map();
    this.initialized = false;
  }

  /**
     * 注册单例依赖
     * @param {string} name - 依赖名称
     * @param {*} instance - 实例对象
     */
  registerSingleton(name, instance) {
    this.singletons.set(name, instance);
    return this;
  }

  /**
     * 注册工厂函数
     * @param {string} name - 依赖名称
     * @param {Function} factory - 工厂函数
     */
  registerFactory(name, factory) {
    this.factories.set(name, factory);
    return this;
  }

  /**
     * 注册普通依赖
     * @param {string} name - 依赖名称
     * @param {*} dependency - 依赖对象
     */
  register(name, dependency) {
    this.dependencies.set(name, dependency);
    return this;
  }

  /**
     * 获取依赖
     * @param {string} name - 依赖名称
     * @returns {*} 依赖实例
     */
  get(name) {
    // 优先从单例中获取
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // 从工厂函数创建
    if (this.factories.has(name)) {
      const factory = this.factories.get(name);
      return factory(this);
    }

    // 从普通依赖获取
    if (this.dependencies.has(name)) {
      return this.dependencies.get(name);
    }

    throw new Error(`Dependency '${name}' not found`);
  }

  /**
     * 检查依赖是否存在
     * @param {string} name - 依赖名称
     * @returns {boolean}
     */
  has(name) {
    return this.singletons.has(name) ||
               this.factories.has(name) ||
               this.dependencies.has(name);
  }

  /**
     * 移除依赖
     * @param {string} name - 依赖名称
     */
  remove(name) {
    this.singletons.delete(name);
    this.factories.delete(name);
    this.dependencies.delete(name);
    return this;
  }

  /**
     * 清空所有依赖
     */
  clear() {
    this.singletons.clear();
    this.factories.clear();
    this.dependencies.clear();
    this.initialized = false;
    return this;
  }

  /**
     * 初始化默认依赖项
     * 注册常用的浏览器API和DOM相关依赖，包括document、window、console、storage等
     */
  initializeDefaults() {
    if (this.initialized) {
      return this;
    }

    // 注册DOM相关依赖
    this.registerSingleton('document', document);
    this.registerSingleton('window', window);

    // 注册常用DOM方法
    this.registerFactory('domUtils', (container) => {
      const doc = container.get('document');
      const win = container.get('window');

      return {
        querySelector: (selector) => doc.querySelector(selector),
        querySelectorAll: (selector) => doc.querySelectorAll(selector),
        getElementById: (id) => doc.getElementById(id),
        createElement: (tagName) => doc.createElement(tagName),
        addEventListener: (element, event, handler, options) => {
          element.addEventListener(event, handler, options);
        },
        removeEventListener: (element, event, handler, options) => {
          element.removeEventListener(event, handler, options);
        },
        getViewportSize: () => ({
          width: win.innerWidth,
          height: win.innerHeight
        }),
        getDevicePixelRatio: () => win.devicePixelRatio || 1,
        getLocation: () => win.location,
        getHistory: () => win.history,
        dispatchEvent: (event) => win.dispatchEvent(event)
      };
    });

    // 注册存储相关依赖
    this.registerFactory('storage', (container) => {
      const win = container.get('window');

      return {
        local: {
          getItem: (key) => win.localStorage.getItem(key),
          setItem: (key, value) => win.localStorage.setItem(key, value),
          removeItem: (key) => win.localStorage.removeItem(key),
          clear: () => win.localStorage.clear()
        },
        session: {
          getItem: (key) => win.sessionStorage.getItem(key),
          setItem: (key, value) => win.sessionStorage.setItem(key, value),
          removeItem: (key) => win.sessionStorage.removeItem(key),
          clear: () => win.sessionStorage.clear()
        }
      };
    });

    // 注册性能监控依赖
    this.registerFactory('performance', (container) => {
      const win = container.get('window');

      return {
        now: () => win.performance?.now() || Date.now(),
        timing: win.performance?.timing,
        navigation: win.performance?.navigation,
        getEntriesByType: (type) => win.performance?.getEntriesByType(type) || [],
        mark: (name) => win.performance?.mark(name),
        measure: (name, start, end) => win.performance?.measure(name, start, end),
        memory: win.performance?.memory
      };
    });

    // 注册媒体查询依赖
    this.registerFactory('mediaQuery', (container) => {
      const win = container.get('window');

      return {
        matches: (query) => win.matchMedia(query).matches,
        addListener: (query, handler) => {
          const mq = win.matchMedia(query);
          mq.addListener(handler);
          return mq;
        },
        removeListener: (mq, handler) => mq.removeListener(handler)
      };
    });

    // 注册网络相关依赖
    this.registerFactory('network', (container) => {
      const win = container.get('window');

      return {
        fetch: (url, options) => win.fetch(url, options),
        URL: win.URL,
        createURL: (url, base) => new win.URL(url, base),
        isOnline: () => win.navigator.onLine,
        connection: win.navigator.connection
      };
    });

    this.initialized = true;
    return this;
  }

  /**
     * 创建子容器
     * @returns {DependencyContainer} 新的子容器
     */
  createChild() {
    const child = new DependencyContainer();

    // 继承父容器的依赖
    this.singletons.forEach((value, key) => {
      child.singletons.set(key, value);
    });

    this.factories.forEach((value, key) => {
      child.factories.set(key, value);
    });

    this.dependencies.forEach((value, key) => {
      child.dependencies.set(key, value);
    });

    child.initialized = this.initialized;
    return child;
  }

  /**
     * 获取所有已注册的依赖名称
     * @returns {string[]} 依赖名称列表
     */
  getRegisteredNames() {
    const names = new Set();

    this.singletons.forEach((_, key) => names.add(key));
    this.factories.forEach((_, key) => names.add(key));
    this.dependencies.forEach((_, key) => names.add(key));

    return Array.from(names);
  }

  /**
     * 批量注入依赖到目标对象
     * @param {Object} target - 目标对象
     * @param {string[]} dependencyNames - 要注入的依赖名称列表
     */
  inject(target, dependencyNames) {
    dependencyNames.forEach(name => {
      if (this.has(name)) {
        target[name] = this.get(name);
      }
    });
    return target;
  }
}

/**
 * 依赖注入装饰器工厂
 * @param {string[]} dependencies - 依赖名称列表
 * @returns {Function} 装饰器函数
 */
function inject(...dependencies) {
  return function(target) {
    if (typeof target === 'function') {
      // 类装饰器
      const originalConstructor = target;

      const DecoratedClass = function(...args) {
        const instance = new originalConstructor(...args);

        if (window.diContainer) {
          window.diContainer.inject(instance, dependencies);
        }

        return instance;
      };

      DecoratedClass.prototype = originalConstructor.prototype;
      return DecoratedClass;
    }
    // 对象装饰器
    if (window.diContainer) {
      window.diContainer.inject(target, dependencies);
    }
    return target;

  };
}

/**
 * 创建全局依赖注入容器实例
 */
const diContainer = new DependencyContainer();
diContainer.initializeDefaults();

// 暴露到全局（仅在开发环境）
if (typeof window !== 'undefined') {
  window.diContainer = diContainer;
  window.inject = inject;

  // 在控制台输出容器信息（开发环境）
  if (window.location?.hostname === 'localhost' ||
        window.location?.hostname === '127.0.0.1') {
    console.log('依赖注入容器已初始化:', diContainer.getRegisteredNames());
  }
}

// 导出（支持模块化）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DependencyContainer, inject, diContainer };
}

// AMD支持
if (typeof define === 'function' && define.amd) {
  define([], () => {
    return { DependencyContainer, inject, diContainer };
  });
}
