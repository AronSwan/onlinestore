const { CONFIG } = require('../shared/config');
const { SecurityError, ERROR_CODES } = require('../shared/error-handler');

/**
 * 密钥缓存管理器
 * 基于LRU算法实现密钥缓存，提高性能
 */
class KeyCache {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
    };
    this.maxSize = CONFIG.maxCacheSize;
    this.defaultTTL = CONFIG.cacheTTL;
  }

  /**
   * 设置缓存项
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {number} ttl - 生存时间（毫秒）
   * @returns {boolean} 是否设置成功
   */
  set(key, value, ttl = this.defaultTTL) {
    if (!key || value === undefined) {
      return false;
    }

    // 检查缓存大小，如果超过最大限制则执行LRU淘汰
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const now = Date.now();
    const expiresAt = now + ttl;

    this.cache.set(key, {
      value,
      expiresAt,
      lastAccessed: now,
      accessCount: 0,
    });

    this.stats.sets++;
    return true;
  }

  /**
   * 获取缓存项
   * @param {string} key - 缓存键
   * @returns {*} 缓存值，如果不存在或过期则返回undefined
   */
  get(key) {
    if (!this.cache.has(key)) {
      this.stats.misses++;
      return undefined;
    }

    const item = this.cache.get(key);
    const now = Date.now();

    // 检查是否过期
    if (now > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // 更新访问信息
    item.lastAccessed = now;
    item.accessCount++;
    this.cache.set(key, item);

    this.stats.hits++;
    return item.value;
  }

  /**
   * 检查缓存项是否存在且未过期
   * @param {string} key - 缓存键
   * @returns {boolean} 是否存在
   */
  has(key) {
    if (!this.cache.has(key)) {
      return false;
    }

    const item = this.cache.get(key);
    const now = Date.now();

    if (now > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除缓存项
   * @param {string} key - 缓存键
   * @returns {boolean} 是否删除成功
   */
  delete(key) {
    const existed = this.cache.delete(key);
    if (existed) {
      this.stats.deletes++;
    }
    return existed;
  }

  /**
   * 清除所有缓存项
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`清除了 ${size} 个缓存项`);
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let totalSize = 0;

    // 计算过期项和估算大小
    for (const [key, item] of this.cache) {
      if (now > item.expiresAt) {
        expiredCount++;
      }
      // 粗略估算大小（字符数）
      totalSize += key.length + JSON.stringify(item.value).length;
    }

    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
        : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expiredCount,
      totalSize: `${Math.round(totalSize / 1024)} KB`,
      hitRate: `${hitRate.toFixed(2)}%`,
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      evictions: this.stats.evictions,
      utilization: `${((this.cache.size / this.maxSize) * 100).toFixed(1)}%`,
    };
  }

  /**
   * 清理过期缓存项
   * @returns {number} 清理的数量
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`清理了 ${cleanedCount} 个过期缓存项`);
    }

    return cleanedCount;
  }

  /**
   * 获取缓存键列表
   * @returns {Array} 缓存键数组
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存值列表
   * @returns {Array} 缓存值数组
   */
  values() {
    const now = Date.now();
    const values = [];

    for (const [key, item] of this.cache) {
      if (now <= item.expiresAt) {
        values.push(item.value);
      }
    }

    return values;
  }

  /**
   * 获取缓存条目列表
   * @returns {Array} 缓存条目数组
   */
  entries() {
    const now = Date.now();
    const entries = [];

    for (const [key, item] of this.cache) {
      if (now <= item.expiresAt) {
        entries.push({
          key,
          value: item.value,
          expiresAt: new Date(item.expiresAt).toISOString(),
          lastAccessed: new Date(item.lastAccessed).toISOString(),
          accessCount: item.accessCount,
          ttl: item.expiresAt - now,
        });
      }
    }

    return entries;
  }

  /**
   * 调整缓存大小
   * @param {number} newSize - 新的大小
   */
  resize(newSize) {
    if (newSize < 1) {
      throw new SecurityError('CACHE_MANAGEMENT', 'CV_001', '缓存大小必须大于0');
    }

    this.maxSize = newSize;

    // 如果当前大小超过新限制，执行淘汰
    while (this.cache.size > this.maxSize) {
      this.evictLRU();
    }

    console.log(`缓存大小调整为: ${newSize}`);
  }

  /**
   * 设置默认TTL
   * @param {number} ttl - 新的默认TTL（毫秒）
   */
  setDefaultTTL(ttl) {
    if (ttl < 0) {
      throw new SecurityError('CACHE_MANAGEMENT', 'CV_001', 'TTL不能为负数');
    }

    this.defaultTTL = ttl;
    console.log(`默认TTL设置为: ${ttl}ms`);
  }

  // ========== 私有方法 ==========

  /**
   * 执行LRU淘汰
   * @private
   */
  evictLRU() {
    if (this.cache.size === 0) return;

    let lruKey = null;
    let lruTime = Date.now();

    // 找到最近最少使用的项
    for (const [key, item] of this.cache) {
      if (item.lastAccessed < lruTime) {
        lruTime = item.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }
  }

  /**
   * 获取最不经常使用的项（可选实现）
   * @private
   */
  getLFU() {
    if (this.cache.size === 0) return null;

    let lfuKey = null;
    let minAccessCount = Infinity;

    for (const [key, item] of this.cache) {
      if (item.accessCount < minAccessCount) {
        minAccessCount = item.accessCount;
        lfuKey = key;
      }
    }

    return lfuKey;
  }
}

module.exports = KeyCache;
