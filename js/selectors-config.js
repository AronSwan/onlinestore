/**
 * DOM选择器和魔法数字配置文件
 * 集中管理项目中的硬编码选择器和数值常量
 * @version 1.0.0
 * @created 2025-01-07
 */

// DOM选择器配置
const DOM_SELECTORS = {
  // 通用选择器
  IMAGES: {
    LAZY: 'img[data-src]',
    ALL: 'img',
    WITH_SRC: 'img[src], img[data-src]',
    WITHOUT_LOADING: 'img:not([loading])'
  },

  // 购物车相关
  CART: {
    COUNT: '.cart-count',
    TOTAL: '.cart-total',
    ITEMS: '.cart-items',
    ADD_BUTTON: '.add-to-cart'
  },

  // 通知系统
  NOTIFICATION: {
    CONTAINER: '#notification-container',
    ITEMS: '.notification'
  },

  // 懒加载相关
  LAZY_LOADER: {
    COMPONENTS: '[data-lazy-module][data-lazy-name]',
    MAIN_CONTENT: 'main .container',
    LOADER_ELEMENT: '#lazy-loader'
  },

  // 产品卡片
  PRODUCT_CARD: {
    ADD_TO_CART: '.add-to-cart',
    EVENT_BOUND: '[data-event-bound]'
  },

  // 性能监控面板
  PERFORMANCE_DASHBOARD: {
    CLOSE_BTN: '#close-btn',
    REFRESH_BTN: '#refresh-btn',
    CLEAR_BTN: '#clear-btn',
    EXPORT_BTN: '#export-btn',
    LOAD_TIME: '#load-time',
    PERFORMANCE_SCORE: '#performance-score',
    ERROR_COUNT: '#error-count',
    MEMORY_USAGE: '#memory-usage',
    LCP_VALUE: '#lcp-value',
    LCP_STATUS: '#lcp-status',
    FID_VALUE: '#fid-value',
    FID_STATUS: '#fid-status',
    CLS_VALUE: '#cls-value',
    CLS_STATUS: '#cls-status',
    ERROR_LIST: '#error-list',
    RESOURCE_LIST: '#resource-list',
    CLICK_COUNT: '#click-count',
    SCROLL_COUNT: '#scroll-count',
    STAY_TIME: '#stay-time',
    SUGGESTIONS_LIST: '#suggestions-list',
    INTERACTION_BREAKDOWN: '#interaction-breakdown',
    BEHAVIOR_PATTERNS: '#behavior-patterns'
  },

  // 表单相关
  FORMS: {
    NEWSLETTER: '.newsletter-form form',
    EMAIL_INPUT: 'input[type="email"]'
  },

  // 脚本相关
  SCRIPTS: {
    WITH_SRC: 'script[src]:not([async]):not([defer])'
  }
};

// 数值常量配置
const MAGIC_NUMBERS = {
  // 时间相关（毫秒）
  TIMEOUTS: {
    NOTIFICATION_DURATION: 3000,
    DEBOUNCE_DELAY: 300,
    ANIMATION_DURATION: 200,
    FEEDBACK_TIMEOUT: 2000,
    RETRY_DELAY: 1000,
    MODULE_WAIT_TIMEOUT: 30000,
    CHECK_INTERVAL: 50,
    SAVE_DELAY: 1000,
    SCROLL_THROTTLE: 100,
    MEMORY_CHECK_INTERVAL: 10000,
    BEHAVIOR_UPDATE_INTERVAL: 500,
    INACTIVITY_THRESHOLD: 30000,
    REPORT_INTERVAL: 30000
  },

  // 性能阈值
  PERFORMANCE: {
    LCP_GOOD: 2500,
    LCP_POOR: 4000,
    FID_GOOD: 100,
    FID_POOR: 300,
    CLS_GOOD: 0.1,
    CLS_POOR: 0.25,
    LOAD_TIME_GOOD: 3000,
    LOAD_TIME_POOR: 5000,
    DOM_CONTENT_LOADED_GOOD: 1500,
    DOM_CONTENT_LOADED_POOR: 3000,
    FIRST_PAINT_GOOD: 1000,
    FIRST_PAINT_POOR: 2000,
    RESOURCE_LOAD_TIME_GOOD: 1000,
    RESOURCE_LOAD_TIME_POOR: 3000,
    RESOURCE_SIZE_GOOD: 100000,
    RESOURCE_SIZE_POOR: 500000,
    BOUNCE_RATE_GOOD: 0.3,
    BOUNCE_RATE_POOR: 0.7,
    TIME_ON_PAGE_GOOD: 30000,
    TIME_ON_PAGE_POOR: 10000,
    ERROR_RATE_GOOD: 0.01,
    ERROR_RATE_POOR: 0.05,
    PERFORMANCE_CHECK_INTERVAL: 30000,
    SLOW_RESOURCE: 1000,
    LARGE_RESOURCE: 200000,
    MEMORY_WARNING: 50 * 1024 * 1024 // 50MB
  },

  // 限制数量
  LIMITS: {
    MAX_CART_ITEMS: 100,
    MAX_QUANTITY_PER_ITEM: 99,
    MAX_ERRORS: 50,
    MAX_PERFORMANCE_ENTRIES: 100,
    MAX_HANDLERS_PER_EVENT: 100,
    MAX_NOTIFICATIONS: 10,
    MAX_RECENT_ERRORS: 10,
    MAX_SLOW_RESOURCES: 10,
    MAX_USER_BEHAVIORS: 50,
    MAX_DATA_POINTS: 50,
    MAX_MESSAGE_LENGTH: 200,
    MAX_PRODUCT_NAME_LENGTH: 200,
    MAX_IMAGE_URL_LENGTH: 500
  },

  // 尺寸相关
  DIMENSIONS: {
    PLACEHOLDER_WIDTH: 300,
    PLACEHOLDER_HEIGHT: 200,
    THUMBNAIL_SIZE: 60,
    CHART_WIDTH: 400,
    CHART_HEIGHT: 200,
    MOBILE_MAX_WIDTH: 768,
    DESKTOP_MIN_WIDTH: 1024,
    RETINA_THRESHOLD: 1.5
  },

  // UI界面相关
  UI: {
    SPINNER_SIZE: 50,
    BORDER_WIDTH: 4,
    FONT_SIZE: 16,
    PADDING: 40,
    BORDER_RADIUS: 8,
    GRID_MIN_WIDTH: 250,
    GAP: 2,
    FEATURE_PADDING: 2,
    FEATURE_BORDER_RADIUS: 12,
    ICON_SIZE: 3,
    TITLE_SIZE: 1.2,
    LINE_HEIGHT: 1.6
  },

  // 懒加载相关
  LAZY_LOADER: {
    ROOT_MARGIN: '50px',
    THRESHOLD: 0.1,
    MODULE_LOAD_TIMEOUT: 30000
  },

  // 图片优化相关
  IMAGE_OPTIMIZATION: {
    MIN_BREAKPOINT_WIDTH: 320,
    MAX_BREAKPOINT_WIDTH: 1920,
    MAX_WIDTH_MULTIPLIER: 2,
    HIGH_DPI_THRESHOLD: 960,
    HIGH_DPI_MULTIPLIER: 2,
    IMAGE_QUALITY: '80',
    MOBILE_BREAKPOINT: 480,
    TABLET_BREAKPOINT: 768,
    DESKTOP_BREAKPOINT: 1200,
    MOBILE_DPI_THRESHOLD: 1.5,
    TABLET_DPI_THRESHOLD: 1.3,
    DESKTOP_DPI_THRESHOLD: 1.2,
    MAX_DPI_MULTIPLIER: 2,
    STANDARD_BREAKPOINTS: [320, 480, 768, 1024, 1200, 1440, 1920]
  },

  // 评分和百分比
  SCORES: {
    PERFECT_SCORE: 100,
    GOOD_SCORE: 80,
    FAIR_SCORE: 60,
    POOR_SCORE: 40,
    ENGAGEMENT_TIME_FACTOR: 2,
    ENGAGEMENT_ACTION_FACTOR: 0.5,
    ENGAGEMENT_SCROLL_FACTOR: 0.2,
    BOUNCE_TIME_THRESHOLD: 0.17, // 10秒转换为分钟
    BOUNCE_ACTION_THRESHOLD: 3
  },

  // 网络和质量
  QUALITY: {
    IMAGE_QUALITY_3G: 0.8,
    IMAGE_QUALITY_SLOW: 0.6,
    COMPRESSION_QUALITY: 80,
    DEVICE_PIXEL_RATIO_THRESHOLD: 1.3
  },

  // Z-index层级
  Z_INDEX: {
    NOTIFICATION: 10000,
    LOADING_OVERLAY: 9999,
    DASHBOARD: 10000,
    TOGGLE_BUTTON: 9999
  },

  // 透明度和颜色
  OPACITY: {
    LOADING_OVERLAY: 0.9,
    HOVER_EFFECT: 0.8
  },

  // 间距和边距
  SPACING: {
    CLICK_MERGE_THRESHOLD: 50, // 像素
    TIME_SLOT_DURATION: 60000, // 1分钟
    SCROLL_DEPTH_PRECISION: 100 // 百分比精度
  },

  // 文件大小限制
  FILE_SIZES: {
    MAX_ANALYSIS_FILE: 1024 * 1024, // 1MB
    MAX_FILE_SIZE: 1024 * 1024, // 1MB
    LOCAL_STORAGE_LIMIT: 5 * 1024 * 1024, // 5MB
    SESSION_STORAGE_LIMIT: 5 * 1024 * 1024 // 5MB
  },

  // 代码复杂度相关
  COMPLEXITY: {
    LOW: 10,
    MEDIUM: 20,
    HIGH: 30
  },

  // 分析相关
  ANALYSIS: {
    ANALYSIS_TIMEOUT: 30000
  },

  // 精度和舍入
  PRECISION: {
    DECIMAL_PLACES: 2,
    MEMORY_DISPLAY_PRECISION: 1,
    PERCENTAGE_PRECISION: 100
  }
};

// 响应式断点
const BREAKPOINTS = {
  XS: 320,
  SM: 480,
  MD: 768,
  LG: 1024,
  XL: 1200,
  XXL: 1440,
  XXXL: 1920
};

// CSS类名配置
const CSS_CLASSES = {
  NOTIFICATION: {
    CONTAINER: 'notification-container',
    ITEM: 'notification',
    SUCCESS: 'notification-success',
    ERROR: 'notification-error',
    WARNING: 'notification-warning',
    INFO: 'notification-info'
  },

  PERFORMANCE: {
    VITAL_STATUS: 'vital-status',
    GOOD: 'good',
    NEEDS_IMPROVEMENT: 'needs-improvement',
    POOR: 'poor'
  },

  CART: {
    ITEM: 'cart-item',
    EMPTY: 'cart-empty',
    LOADING: 'cart-loading'
  }
};

// 导出配置
if (typeof window !== 'undefined') {
  window.DOM_SELECTORS = DOM_SELECTORS;
  window.MAGIC_NUMBERS = MAGIC_NUMBERS;
  window.BREAKPOINTS = BREAKPOINTS;
  window.CSS_CLASSES = CSS_CLASSES;
}

// 兼容CommonJS和ES6模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DOM_SELECTORS,
    MAGIC_NUMBERS,
    BREAKPOINTS,
    CSS_CLASSES
  };
}

// 兼容AMD
if (typeof define === 'function' && define.amd) {
  define([], () => {
    return {
      DOM_SELECTORS,
      MAGIC_NUMBERS,
      BREAKPOINTS,
      CSS_CLASSES
    };
  });
}
