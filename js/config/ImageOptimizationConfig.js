/**
 * 图片优化配置管理器
 * 专门负责图片优化相关的配置常量和设置
 */
class ImageOptimizationConfig {
  constructor() {
    this.config = {
      MAX_RETRIES: 3,
      RETRY_DELAY: 1000,
      LAZY_LOADING_CONFIGS: {
        critical: { rootMargin: '0px', threshold: 0.1 },
        high: { rootMargin: '50px', threshold: 0.1 },
        normal: { rootMargin: '200px', threshold: 0.1 }
      },
      BREAKPOINTS: [320, 480, 768, 1024, 1200, 1440, 1920],
      IMAGE_FORMATS: {
        webp: ['webp'],
        standard: ['jpg', 'jpeg', 'png', 'gif']
      },
      QUALITY_SETTINGS: {
        high: 0.9,
        medium: 0.7,
        low: 0.5
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
      maxRetries: this.config.MAX_RETRIES,
      retryDelay: this.config.RETRY_DELAY
    };
  }

  /**
   * 获取懒加载配置
   * @param {string} priority - 优先级 (critical, high, normal)
   * @returns {object} 懒加载配置
   */
  getLazyLoadingConfig(priority = 'normal') {
    return this.config.LAZY_LOADING_CONFIGS[priority] || this.config.LAZY_LOADING_CONFIGS.normal;
  }

  /**
   * 获取所有懒加载配置
   * @returns {object} 所有懒加载配置
   */
  getAllLazyLoadingConfigs() {
    return JSON.parse(JSON.stringify(this.config.LAZY_LOADING_CONFIGS));
  }

  /**
   * 获取响应式断点
   * @returns {number[]} 断点数组
   */
  getBreakpoints() {
    return [...this.config.BREAKPOINTS];
  }

  /**
   * 根据宽度获取最适合的断点
   * @param {number} width - 图片宽度
   * @returns {number} 最适合的断点
   */
  getBestBreakpoint(width) {
    const breakpoints = this.config.BREAKPOINTS;
    for (let i = 0; i < breakpoints.length; i++) {
      if (width <= breakpoints[i]) {
        return breakpoints[i];
      }
    }
    return breakpoints[breakpoints.length - 1];
  }

  /**
   * 获取图片格式配置
   * @returns {object} 图片格式配置
   */
  getImageFormats() {
    return JSON.parse(JSON.stringify(this.config.IMAGE_FORMATS));
  }

  /**
   * 检查是否支持WebP格式
   * @returns {boolean} 是否支持WebP
   */
  supportsWebP() {
    return this.config.IMAGE_FORMATS.webp.includes('webp');
  }

  /**
   * 获取质量设置
   * @param {string} quality - 质量级别 (high, medium, low)
   * @returns {number} 质量值
   */
  getQualitySetting(quality = 'medium') {
    return this.config.QUALITY_SETTINGS[quality] || this.config.QUALITY_SETTINGS.medium;
  }

  /**
   * 获取所有质量设置
   * @returns {object} 所有质量设置
   */
  getAllQualitySettings() {
    return JSON.parse(JSON.stringify(this.config.QUALITY_SETTINGS));
  }

  /**
   * 验证图片格式是否支持
   * @param {string} format - 图片格式
   * @returns {boolean} 是否支持
   */
  isSupportedFormat(format) {
    const allFormats = [...this.config.IMAGE_FORMATS.webp, ...this.config.IMAGE_FORMATS.standard];
    return allFormats.includes(format.toLowerCase());
  }
}

// 创建全局实例
const imageOptimizationConfig = new ImageOptimizationConfig();

// 导出配置管理器
if (typeof window !== 'undefined') {
  window.imageOptimizationConfig = imageOptimizationConfig;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = imageOptimizationConfig;
}
