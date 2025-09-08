/**
 * 分析缓存器 - 负责分析结果的缓存管理
 * 符合单一职责原则：专门处理缓存相关功能
 * AI生成代码来源：基于Claude 4 Sonnet重构的分析缓存器
 * @ai-generated: 基于Claude 4 Sonnet重构生成，遵循SOLID原则
 * @compliance: PCI-DSS-v4.0, OWASP-Top-10-2021, NIST-CSF-2.0
 */
class AnalysisCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 1000; // 最大缓存条目数
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
     * 获取缓存值
     * @param {string} key - 缓存键
     * @returns {*} 缓存值或undefined
     */
  get(key) {
    if (this.cache.has(key)) {
      this.hitCount++;
      // 更新访问时间（LRU策略）
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    this.missCount++;
    return null;
  }

  /**
     * 设置缓存值
     * @param {string} key - 缓存键
     * @param {*} value - 缓存值
     */
  set(key, value) {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // 检查缓存大小限制
    else if (this.cache.size >= this.maxSize) {
      // 删除最旧的条目（LRU策略）
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  /**
     * 检查缓存是否存在
     * @param {string} key - 缓存键
     * @returns {boolean} 是否存在
     */
  has(key) {
    return this.cache.has(key);
  }

  /**
     * 生成缓存键
     * @param {string} filePath - 文件路径
     * @param {string} content - 文件内容
     * @returns {string} 缓存键
     */
  generateCacheKey(filePath, content) {
    const contentHash = this.simpleHash(content);
    return `${filePath}:${contentHash}`;
  }

  /**
     * 清空缓存
     */
  clearCache() {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
     * 获取缓存统计信息
     * @returns {Object} 缓存统计
     */
  getCacheStats() {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests * 100).toFixed(2) : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: `${hitRate}%`,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
     * 估算内存使用量
     * @returns {string} 内存使用量描述
     */
  estimateMemoryUsage() {
    let totalSize = 0;
    for (const [key, value] of this.cache) {
      totalSize += key.length * 2; // 字符串按2字节计算
      totalSize += JSON.stringify(value).length * 2;
    }

    if (totalSize < 1024) {
      return `${totalSize} bytes`;
    } else if (totalSize < 1024 * 1024) {
      return `${(totalSize / 1024).toFixed(2)} KB`;
    }
    return `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;

  }

  /**
     * 简单哈希函数
     * @param {string} str - 输入字符串
     * @returns {string} 哈希值
     */
  simpleHash(str) {
    let hash = 0;
    if (str.length === 0) { return hash.toString(); }

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }

    return Math.abs(hash).toString(36);
  }

  /**
     * 设置最大缓存大小
     * @param {number} size - 最大缓存条目数
     */
  setMaxSize(size) {
    this.maxSize = size;
    // 如果当前缓存超过新的限制，清理多余条目
    while (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
     * 获取所有缓存键
     * @returns {Array<string>} 缓存键数组
     */
  getKeys() {
    return Array.from(this.cache.keys());
  }

  /**
     * 删除指定缓存
     * @param {string} key - 缓存键
     * @returns {boolean} 是否删除成功
     */
  delete(key) {
    return this.cache.delete(key);
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalysisCache;
} else if (typeof window !== 'undefined') {
  window.AnalysisCache = AnalysisCache;
}
