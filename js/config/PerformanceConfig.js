/**
 * 性能监控配置管理器
 * 专门负责性能相关的配置常量和设置
 */
class PerformanceConfig {
  constructor() {
    this.config = {
      SLOW_RESOURCE_THRESHOLD: 1000, // 慢资源阈值(ms)
      LARGE_RESOURCE_THRESHOLD: 1024 * 1024, // 大资源阈值(bytes)
      MAX_SLOW_RESOURCES: 100, // 最大慢资源记录数
      ERROR_FREQUENCY_LIMIT: 5, // 错误频率限制
      ERROR_FREQUENCY_WINDOW: 60000, // 错误频率窗口(ms)
      SESSION_TIMEOUT: 30 * 60 * 1000, // 会话超时(ms)
      MEMORY_WARNING_THRESHOLD: 50 * 1024 * 1024, // 内存警告阈值(bytes)
      PERFORMANCE_SCORE_THRESHOLDS: {
        EXCELLENT: 90,
        GOOD: 70,
        NEEDS_IMPROVEMENT: 50
      },
      CORE_WEB_VITALS: {
        LCP_GOOD: 2500,
        LCP_NEEDS_IMPROVEMENT: 4000,
        FID_GOOD: 100,
        FID_NEEDS_IMPROVEMENT: 300,
        CLS_GOOD: 0.1,
        CLS_NEEDS_IMPROVEMENT: 0.25
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
   * 获取性能阈值配置
   * @returns {object} 性能阈值配置
   */
  getThresholds() {
    return {
      slow: this.config.SLOW_RESOURCE_THRESHOLD,
      large: this.config.LARGE_RESOURCE_THRESHOLD,
      memory: this.config.MEMORY_WARNING_THRESHOLD,
      scores: this.config.PERFORMANCE_SCORE_THRESHOLDS
    };
  }

  /**
   * 获取Core Web Vitals配置
   * @returns {object} Core Web Vitals配置
   */
  getCoreWebVitals() {
    return JSON.parse(JSON.stringify(this.config.CORE_WEB_VITALS));
  }

  /**
   * 验证性能指标是否在良好范围内
   * @param {string} metric - 指标名称 (lcp, fid, cls)
   * @param {number} value - 指标值
   * @returns {string} 评级 (good, needs_improvement, poor)
   */
  evaluateMetric(metric, value) {
    const vitals = this.config.CORE_WEB_VITALS;
    const upperMetric = metric.toUpperCase();

    if (vitals[`${upperMetric}_GOOD`] && vitals[`${upperMetric}_NEEDS_IMPROVEMENT`]) {
      if (value <= vitals[`${upperMetric}_GOOD`]) {
        return 'good';
      } else if (value <= vitals[`${upperMetric}_NEEDS_IMPROVEMENT`]) {
        return 'needs_improvement';
      }
      return 'poor';

    }

    return 'unknown';
  }
}

// 创建全局实例
const performanceConfig = new PerformanceConfig();

// 导出配置管理器
if (typeof window !== 'undefined') {
  window.performanceConfig = performanceConfig;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = performanceConfig;
}
