// AI生成代码来源：基于SOLID原则重构的工具函数类
/**
 * 工具函数类
 * 提供通用的工具函数，如防抖、对象合并、类型检查等
 * 符合单一职责原则(SRP)和开闭原则(OCP)
 *
 * @author AI Assistant
 * @version 1.0.0
 * @created 2025-01-15
 */

class UtilityFunctions {
  /**
   * 防抖函数
   * 在指定时间内只执行最后一次调用
   * @param {Function} func - 要防抖的函数
   * @param {number} wait - 等待时间（毫秒）
   * @param {boolean} immediate - 是否立即执行
   * @returns {Function} 防抖后的函数
   */
  static debounce(func, wait, immediate = false) {
    if (typeof func !== 'function') {
      throw new TypeError('Expected a function');
    }

    if (typeof wait !== 'number' || wait < 0) {
      throw new TypeError('Wait must be a non-negative number');
    }

    let timeout;
    let result;

    const debounced = function (...args) {
      const context = this;

      const later = function () {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
        }
      };

      const callNow = immediate && !timeout;

      clearTimeout(timeout);
      timeout = setTimeout(later, wait);

      if (callNow) {
        result = func.apply(context, args);
      }

      return result;
    };

    // 添加取消方法
    debounced.cancel = function () {
      clearTimeout(timeout);
      timeout = null;
    };

    // 添加立即执行方法
    debounced.flush = function () {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
        return func.apply(this, arguments);
      }
    };

    return debounced;
  }

  /**
   * 节流函数
   * 在指定时间间隔内最多执行一次
   * @param {Function} func - 要节流的函数
   * @param {number} wait - 时间间隔（毫秒）
   * @param {Object} options - 选项
   * @returns {Function} 节流后的函数
   */
  static throttle(func, wait, options = {}) {
    if (typeof func !== 'function') {
      throw new TypeError('Expected a function');
    }

    if (typeof wait !== 'number' || wait < 0) {
      throw new TypeError('Wait must be a non-negative number');
    }

    let timeout;
    let previous = 0;
    const { leading = true, trailing = true } = options;

    const throttled = function (...args) {
      const context = this;
      const now = Date.now();

      if (!previous && !leading) {
        previous = now;
      }

      const remaining = wait - (now - previous);

      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        return func.apply(context, args);
      } else if (!timeout && trailing) {
        timeout = setTimeout(() => {
          previous = leading ? Date.now() : 0;
          timeout = null;
          func.apply(context, args);
        }, remaining);
      }
    };

    // 添加取消方法
    throttled.cancel = function () {
      clearTimeout(timeout);
      timeout = null;
      previous = 0;
    };

    return throttled;
  }

  /**
   * 深度克隆对象
   * @param {*} obj - 要克隆的对象
   * @returns {*} 克隆后的对象
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item));
    }

    if (obj instanceof RegExp) {
      return new RegExp(obj.source, obj.flags);
    }

    if (obj instanceof Map) {
      const clonedMap = new Map();
      for (const [key, value] of obj) {
        clonedMap.set(this.deepClone(key), this.deepClone(value));
      }
      return clonedMap;
    }

    if (obj instanceof Set) {
      const clonedSet = new Set();
      for (const value of obj) {
        clonedSet.add(this.deepClone(value));
      }
      return clonedSet;
    }

    if (typeof obj === 'object') {
      const clonedObj = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }

    return obj;
  }

  /**
   * 对象合并（类似Object.assign但支持深度合并）
   * @param {Object} target - 目标对象
   * @param {...Object} sources - 源对象
   * @returns {Object} 合并后的对象
   */
  static objectAssign(target, ...sources) {
    if (target === null || typeof target === 'undefined') {
      throw new TypeError('Cannot convert undefined or null to object');
    }

    const to = Object(target);

    for (let index = 0; index < sources.length; index++) {
      const nextSource = sources[index];

      if (nextSource !== null && typeof nextSource !== 'undefined') {
        for (const nextKey in nextSource) {
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }

    return to;
  }

  /**
   * 深度合并对象
   * @param {Object} target - 目标对象
   * @param {...Object} sources - 源对象
   * @returns {Object} 合并后的对象
   */
  static deepMerge(target, ...sources) {
    if (!sources.length) { return target; }
    const source = sources.shift();

    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) { Object.assign(target, { [key]: {} }); }
          this.deepMerge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this.deepMerge(target, ...sources);
  }

  /**
   * 检查是否为对象
   * @param {*} item - 要检查的项
   * @returns {boolean} 是否为对象
   */
  static isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * 检查是否为空对象
   * @param {*} obj - 要检查的对象
   * @returns {boolean} 是否为空对象
   */
  static isEmpty(obj) {
    if (obj === null || typeof obj === 'undefined') { return true; }
    if (Array.isArray(obj) || typeof obj === 'string') { return obj.length === 0; }
    if (obj instanceof Map || obj instanceof Set) { return obj.size === 0; }
    return Object.keys(obj).length === 0;
  }

  /**
   * 获取对象的深度路径值
   * @param {Object} obj - 对象
   * @param {string} path - 路径（如 'a.b.c'）
   * @param {*} defaultValue - 默认值
   * @returns {*} 路径对应的值
   */
  static get(obj, path, defaultValue) {
    if (!obj || typeof path !== 'string') {
      return defaultValue;
    }

    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
      if (result === null || typeof result === 'undefined' || typeof result !== 'object') {
        return defaultValue;
      }
      result = result[key];
    }

    return typeof result !== 'undefined' ? result : defaultValue;
  }

  /**
   * 设置对象的深度路径值
   * @param {Object} obj - 对象
   * @param {string} path - 路径（如 'a.b.c'）
   * @param {*} value - 要设置的值
   * @returns {Object} 修改后的对象
   */
  static set(obj, path, value) {
    if (!obj || typeof path !== 'string') {
      return obj;
    }

    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    return obj;
  }

  /**
   * 数组去重
   * @param {Array} array - 要去重的数组
   * @param {Function} keyFn - 可选的键函数
   * @returns {Array} 去重后的数组
   */
  static unique(array, keyFn) {
    if (!Array.isArray(array)) {
      return [];
    }

    if (typeof keyFn === 'function') {
      const seen = new Set();
      return array.filter(item => {
        const key = keyFn(item);
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    }

    return [...new Set(array)];
  }

  /**
   * 数组分组
   * @param {Array} array - 要分组的数组
   * @param {Function} keyFn - 分组键函数
   * @returns {Object} 分组后的对象
   */
  static groupBy(array, keyFn) {
    if (!Array.isArray(array) || typeof keyFn !== 'function') {
      return {};
    }

    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  }

  /**
   * 数组分块
   * @param {Array} array - 要分块的数组
   * @param {number} size - 块大小
   * @returns {Array} 分块后的数组
   */
  static chunk(array, size) {
    if (!Array.isArray(array) || size <= 0) {
      return [];
    }

    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @param {number} decimals - 小数位数
   * @returns {string} 格式化后的文件大小
   */
  static formatFileSize(bytes, decimals = 2) {
    if (bytes === 0) { return '0 Bytes'; }

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * 生成随机字符串
   * @param {number} length - 字符串长度
   * @param {string} charset - 字符集
   * @returns {string} 随机字符串
   */
  static randomString(length = 8, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * 延迟执行
   * @param {number} ms - 延迟时间（毫秒）
   * @returns {Promise} Promise对象
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重试函数
   * @param {Function} fn - 要重试的函数
   * @param {number} maxRetries - 最大重试次数
   * @param {number} delay - 重试间隔（毫秒）
   * @returns {Promise} Promise对象
   */
  static async retry(fn, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < maxRetries) {
          await this.delay(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * 函数缓存
   * @param {Function} fn - 要缓存的函数
   * @param {Function} keyGenerator - 键生成函数
   * @returns {Function} 缓存后的函数
   */
  static memoize(fn, keyGenerator = (...args) => JSON.stringify(args)) {
    const cache = new Map();

    return function (...args) {
      const key = keyGenerator(...args);

      if (cache.has(key)) {
        return cache.get(key);
      }

      const result = fn.apply(this, args);
      cache.set(key, result);
      return result;
    };
  }

  /**
   * 类型检查工具
   */
  static type = {
    isString: (value) => typeof value === 'string',
    isNumber: (value) => typeof value === 'number' && !isNaN(value),
    isBoolean: (value) => typeof value === 'boolean',
    isFunction: (value) => typeof value === 'function',
    isArray: (value) => Array.isArray(value),
    isObject: (value) => value !== null && typeof value === 'object' && !Array.isArray(value),
    isNull: (value) => value === null,
    isUndefined: (value) => typeof value === 'undefined',
    isDate: (value) => value instanceof Date,
    isRegExp: (value) => value instanceof RegExp,
    isPromise: (value) => value && typeof value.then === 'function'
  };
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UtilityFunctions;
}

if (typeof window !== 'undefined') {
  window.UtilityFunctions = UtilityFunctions;
}
