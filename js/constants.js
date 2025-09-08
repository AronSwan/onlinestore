/**
 * 项目统一常量定义模块
 * 集中管理所有常量，避免重复定义和魔法数字
 */

// 性能监控相关常量
const PERFORMANCE = {
  // 阈值设置
  THRESHOLDS: {
    SLOW_RESOURCE: 3000,
    SLOW_NAVIGATION: 5000,
    MEMORY_WARNING: 100 * 1024 * 1024, // 100MB
    CPU_WARNING: 80, // 80%
    FCP_THRESHOLD: 2500,
    LCP_THRESHOLD: 4000,
    FID_THRESHOLD: 300,
    CLS_THRESHOLD: 0.25,
    // 性能评分相关阈值
    LOAD_TIME_GOOD: 1000,
    LOAD_TIME_FAIR: 2000,
    LOAD_TIME_POOR: 3000,
    LCP_GOOD: 2500,
    FID_GOOD: 100,
    CLS_GOOD: 0.1,
    ERROR_SCORE_MULTIPLIER: 5,
    SLOW_RESOURCE_SCORE_MULTIPLIER: 3,
    MAX_ERROR_PENALTY: 30,
    MAX_SLOW_RESOURCE_PENALTY: 20,
    LCP_PENALTY: 15,
    FID_PENALTY: 10,
    CLS_PENALTY: 10
  },

  // 监控间隔
  INTERVALS: {
    METRICS_COLLECTION: 5000,
    RESOURCE_CHECK: 10000,
    MEMORY_CHECK: 30000,
    BEHAVIOR_TRACKING: 1000
  },

  // 缓冲区大小
  BUFFER_SIZES: {
    MAX_ERRORS: 100,
    MAX_METRICS: 50,
    MAX_BEHAVIORS: 200,
    MAX_RESOURCES: 100
  },

  // 错误处理
  ERROR_LIMITS: {
    MAX_ERRORS_PER_MINUTE: 10,
    MAX_SAME_ERROR: 5,
    ERROR_RESET_INTERVAL: 60000
  }
};

// 懒加载相关常量
const LAZY_LOADING = {
  // 重试配置
  RETRY: {
    MAX_ATTEMPTS: 3,
    BASE_DELAY: 1000,
    MAX_DELAY: 10000,
    BACKOFF_FACTOR: 2
  },

  // 超时设置
  TIMEOUTS: {
    MODULE_LOAD: 30000,
    SCRIPT_LOAD: 15000,
    STYLE_LOAD: 10000,
    WAIT_FOR_MODULE: 5000
  },

  // 缓存设置
  CACHE: {
    MAX_SIZE: 50,
    TTL: 300000, // 5分钟
    CLEANUP_INTERVAL: 60000
  },

  // 支持的模块类型
  MODULE_TYPES: {
    SCRIPT: 'script',
    STYLE: 'style',
    MODULE: 'module',
    COMPONENT: 'component'
  }
};

// 图片优化相关常量
const IMAGE_OPTIMIZATION = {
  // 质量设置
  QUALITY: {
    HIGH: 0.9,
    MEDIUM: 0.7,
    LOW: 0.5,
    THUMBNAIL: 0.6
  },

  // 尺寸限制
  SIZE_LIMITS: {
    MAX_WIDTH: 1920,
    MAX_HEIGHT: 1080,
    THUMBNAIL_SIZE: 150,
    MOBILE_MAX_WIDTH: 768
  },

  // 支持的格式
  FORMATS: {
    WEBP: 'image/webp',
    JPEG: 'image/jpeg',
    PNG: 'image/png',
    AVIF: 'image/avif'
  },

  // 压缩设置
  COMPRESSION: {
    ENABLE_WEBP: true,
    ENABLE_AVIF: false,
    PROGRESSIVE_JPEG: true,
    OPTIMIZE_PNG: true
  }
};

// 购物车相关常量
const CART = {
  // 存储键名
  STORAGE_KEYS: {
    ITEMS: 'cart_items',
    TOTAL: 'cart_total',
    COUNT: 'cart_count',
    LAST_UPDATE: 'cart_last_update'
  },

  // 限制设置
  LIMITS: {
    MAX_ITEMS: 100,
    MAX_QUANTITY_PER_ITEM: 99,
    MIN_QUANTITY: 1
  },

  // 动画设置
  ANIMATION: {
    ADD_DURATION: 300,
    REMOVE_DURATION: 200,
    UPDATE_DURATION: 150,
    BOUNCE_DURATION: 600
  },

  // 事件类型
  EVENTS: {
    ITEM_ADDED: 'cart:item-added',
    ITEM_REMOVED: 'cart:item-removed',
    ITEM_UPDATED: 'cart:item-updated',
    CART_CLEARED: 'cart:cleared',
    CART_LOADED: 'cart:loaded'
  }
};

// 产品卡片相关常量
const PRODUCT_CARD = {
  // CSS类名
  CSS_CLASSES: {
    CONTAINER: 'product-card',
    IMAGE: 'product-image',
    TITLE: 'product-title',
    PRICE: 'product-price',
    BUTTON: 'add-to-cart-btn',
    LOADING: 'loading',
    ERROR: 'error',
    SUCCESS: 'success'
  },

  // 状态
  STATES: {
    IDLE: 'idle',
    LOADING: 'loading',
    SUCCESS: 'success',
    ERROR: 'error'
  },

  // 反馈持续时间
  FEEDBACK_DURATION: {
    SUCCESS: 2000,
    ERROR: 3000,
    LOADING: 500
  },

  // 防抖延迟
  DEBOUNCE_DELAY: 300
};

// 通知系统相关常量
const NOTIFICATIONS = {
  // 类型
  TYPES: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
  },

  // 位置
  POSITIONS: {
    TOP_RIGHT: 'top-right',
    TOP_LEFT: 'top-left',
    BOTTOM_RIGHT: 'bottom-right',
    BOTTOM_LEFT: 'bottom-left',
    TOP_CENTER: 'top-center',
    BOTTOM_CENTER: 'bottom-center'
  },

  // 持续时间
  DURATION: {
    SHORT: 2000,
    MEDIUM: 4000,
    LONG: 6000,
    PERMANENT: 0
  },

  // 限制
  LIMITS: {
    MAX_NOTIFICATIONS: 5,
    MAX_SAME_TYPE: 3
  },

  // 动画
  ANIMATION: {
    FADE_IN: 300,
    FADE_OUT: 200,
    SLIDE_IN: 250,
    SLIDE_OUT: 150
  }
};

// 事件委托相关常量
const EVENT_DELEGATION = {
  // 支持的事件类型
  SUPPORTED_EVENTS: [
    'click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mouseout',
    'keydown', 'keyup', 'keypress', 'focus', 'blur', 'change', 'input',
    'submit', 'reset', 'scroll', 'resize', 'load', 'unload'
  ],

  // 限制
  LIMITS: {
    MAX_HANDLERS_PER_EVENT: 100,
    MAX_TOTAL_HANDLERS: 500
  },

  // 性能设置
  PERFORMANCE: {
    THROTTLE_DELAY: 16, // ~60fps
    DEBOUNCE_DELAY: 100,
    CLEANUP_INTERVAL: 300000 // 5分钟
  }
};

// 代码分析相关常量
const CODE_ANALYSIS = {
  // 支持的文件扩展名
  SUPPORTED_EXTENSIONS: ['.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte'],

  // 文件大小限制
  MAX_FILE_SIZE: 1024 * 1024, // 1MB

  // 分析超时
  ANALYSIS_TIMEOUT: 30000,

  // 复杂度阈值
  COMPLEXITY_THRESHOLDS: {
    LOW: 10,
    MEDIUM: 20,
    HIGH: 30
  },

  // 质量评分权重
  QUALITY_WEIGHTS: {
    COMPLEXITY: 0.3,
    MAINTAINABILITY: 0.25,
    READABILITY: 0.2,
    TESTABILITY: 0.15,
    DOCUMENTATION: 0.1
  },

  // 缓存设置
  CACHE: {
    MAX_ENTRIES: 100,
    TTL: 600000, // 10分钟
    CLEANUP_THRESHOLD: 0.8
  }
};

// HTTP相关常量
const HTTP = {
  // 状态码
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503
  },

  // 请求方法
  METHODS: {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
    PATCH: 'PATCH',
    HEAD: 'HEAD',
    OPTIONS: 'OPTIONS'
  },

  // 内容类型
  CONTENT_TYPES: {
    JSON: 'application/json',
    FORM: 'application/x-www-form-urlencoded',
    MULTIPART: 'multipart/form-data',
    TEXT: 'text/plain',
    HTML: 'text/html',
    XML: 'application/xml'
  },

  // 超时设置
  TIMEOUTS: {
    DEFAULT: 10000,
    UPLOAD: 60000,
    DOWNLOAD: 30000,
    PING: 5000
  }
};

// 存储相关常量
const STORAGE = {
  // 存储类型
  TYPES: {
    LOCAL: 'localStorage',
    SESSION: 'sessionStorage',
    COOKIE: 'cookie',
    INDEXED_DB: 'indexedDB'
  },

  // 键名前缀
  PREFIXES: {
    APP: 'app_',
    USER: 'user_',
    CACHE: 'cache_',
    TEMP: 'temp_',
    CONFIG: 'config_'
  },

  // 过期时间
  EXPIRY: {
    HOUR: 3600000,
    DAY: 86400000,
    WEEK: 604800000,
    MONTH: 2592000000,
    YEAR: 31536000000
  },

  // 大小限制
  SIZE_LIMITS: {
    LOCAL_STORAGE: 5 * 1024 * 1024, // 5MB
    SESSION_STORAGE: 5 * 1024 * 1024, // 5MB
    COOKIE: 4096, // 4KB
    INDEXED_DB: 50 * 1024 * 1024 // 50MB
  }
};

// 验证相关常量
const VALIDATION = {
  // 正则表达式
  PATTERNS: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^[+]?[1-9][\d]{0,15}$/,
    URL: /^https?:\/\/.+/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
    SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  },

  // 长度限制
  LENGTH_LIMITS: {
    MIN_PASSWORD: 8,
    MAX_PASSWORD: 128,
    MAX_USERNAME: 50,
    MAX_EMAIL: 254,
    MAX_PHONE: 20,
    MAX_NAME: 100,
    MAX_DESCRIPTION: 1000,
    MAX_TITLE: 200
  },

  // 错误消息
  ERROR_MESSAGES: {
    REQUIRED: '此字段为必填项',
    INVALID_EMAIL: '请输入有效的邮箱地址',
    INVALID_PHONE: '请输入有效的电话号码',
    INVALID_URL: '请输入有效的URL',
    PASSWORD_TOO_SHORT: '密码长度至少8位',
    PASSWORD_TOO_LONG: '密码长度不能超过128位',
    INVALID_FORMAT: '格式不正确'
  }
};

// 动画相关常量
const ANIMATION = {
  // 缓动函数
  EASING: {
    LINEAR: 'linear',
    EASE: 'ease',
    EASE_IN: 'ease-in',
    EASE_OUT: 'ease-out',
    EASE_IN_OUT: 'ease-in-out',
    CUBIC_BEZIER: 'cubic-bezier(0.4, 0, 0.2, 1)'
  },

  // 持续时间
  DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
    VERY_SLOW: 1000,
    RIPPLE: 600,
    MAGNETIC_RESET: 300,
    TOUCH_FEEDBACK: 150,
    KEYBOARD_FEEDBACK: 100
  },

  // 延迟
  DELAY: {
    NONE: 0,
    SHORT: 100,
    MEDIUM: 200,
    LONG: 500
  },

  // 变换
  TRANSFORMS: {
    FADE_IN: 'opacity 0 to 1',
    FADE_OUT: 'opacity 1 to 0',
    SLIDE_UP: 'translateY(100%) to translateY(0)',
    SLIDE_DOWN: 'translateY(-100%) to translateY(0)',
    SLIDE_LEFT: 'translateX(100%) to translateX(0)',
    SLIDE_RIGHT: 'translateX(-100%) to translateX(0)',
    SCALE_IN: 'scale(0) to scale(1)',
    SCALE_OUT: 'scale(1) to scale(0)'
  },

  // 点击效果相关
  CLICK_EFFECTS: {
    MAGNETIC_STRENGTH: 0.1,
    VIBRATION_DURATION: 10,
    TOUCH_END_DELAY: 150,
    KEYBOARD_ACTIVATION_DELAY: 100
  }
};

// 音频相关常量
const AUDIO = {
  // 音效设置
  SOUND_EFFECTS: {
    CLICK_FREQUENCY: 800,
    CLICK_FREQUENCY_END: 400,
    CLICK_GAIN: 0.1,
    CLICK_GAIN_END: 0.01,
    CLICK_DURATION: 0.1
  },

  // Web Audio API设置
  WEB_AUDIO: {
    SAMPLE_RATE: 44100,
    BUFFER_SIZE: 4096,
    MAX_OSCILLATORS: 10
  },

  // 存储键名
  STORAGE_KEYS: {
    SOUND_ENABLED: 'soundEffectsEnabled'
  }
};

// 错误处理相关常量
const ERROR_HANDLING = {
  // 错误日志限制
  LIMITS: {
    MAX_ERROR_LOGS: 100,
    MAX_ERRORS_PER_MINUTE: 10,
    MAX_SAME_ERROR: 5,
    DEFAULT_LOG_LIMIT: 50
  },

  // 重试设置
  RETRY: {
    MAX_ATTEMPTS: 3,
    BASE_DELAY: 1000,
    BACKOFF_MULTIPLIER: 2
  },

  // 通知持续时间
  NOTIFICATION_DURATION: {
    ERROR: 5000,
    WARNING: 4000,
    SUCCESS: 3000,
    INFO: 2000
  }
};

// 设备相关常量
const DEVICE = {
  // 断点
  BREAKPOINTS: {
    XS: 480,
    SM: 768,
    MD: 1024,
    LG: 1200,
    XL: 1440,
    XXL: 1920
  },

  // 设备类型
  TYPES: {
    MOBILE: 'mobile',
    TABLET: 'tablet',
    DESKTOP: 'desktop',
    TV: 'tv'
  },

  // 触摸支持
  TOUCH: {
    SUPPORTED: 'ontouchstart' in window,
    HOVER_SUPPORTED: window.matchMedia('(hover: hover)').matches
  },

  // 性能等级
  PERFORMANCE_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
  }
};

// 安全相关常量
const SECURITY = {
  // CSP指令
  CSP_DIRECTIVES: {
    DEFAULT_SRC: '\'self\'',
    SCRIPT_SRC: '\'self\' \'unsafe-inline\'',
    STYLE_SRC: '\'self\' \'unsafe-inline\'',
    IMG_SRC: '\'self\' data: https:',
    FONT_SRC: '\'self\' https:',
    CONNECT_SRC: '\'self\' https:'
  },

  // 敏感数据模式
  SENSITIVE_PATTERNS: [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /auth/i,
    /credential/i,
    /private/i
  ],

  // 清理规则
  SANITIZATION: {
    MAX_STRING_LENGTH: 1000,
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span'],
    FORBIDDEN_ATTRIBUTES: ['onclick', 'onload', 'onerror', 'href']
  }
};

// 日志相关常量
const LOGGING = {
  // 日志级别
  LEVELS: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
  },

  // 日志类别
  CATEGORIES: {
    PERFORMANCE: 'performance',
    SECURITY: 'security',
    USER_ACTION: 'user-action',
    SYSTEM: 'system',
    API: 'api',
    ERROR: 'error'
  },

  // 输出目标
  TARGETS: {
    CONSOLE: 'console',
    LOCAL_STORAGE: 'localStorage',
    REMOTE: 'remote',
    FILE: 'file'
  },

  // 缓冲区设置
  BUFFER: {
    MAX_SIZE: 1000,
    FLUSH_INTERVAL: 10000,
    FLUSH_ON_ERROR: true
  }
};

// 默认导出所有常量
window.CONSTANTS = {
  PERFORMANCE,
  LAZY_LOADING,
  IMAGE_OPTIMIZATION,
  CART,
  PRODUCT_CARD,
  NOTIFICATIONS,
  EVENT_DELEGATION,
  CODE_ANALYSIS,
  HTTP,
  STORAGE,
  VALIDATION,
  ANIMATION,
  AUDIO,
  ERROR_HANDLING,
  DEVICE,
  SECURITY,
  LOGGING
};

// 创建全局访问
if (typeof window !== 'undefined') {
  window.CONSTANTS = {
    PERFORMANCE,
    LAZY_LOADING,
    IMAGE_OPTIMIZATION,
    CART,
    PRODUCT_CARD,
    NOTIFICATIONS,
    EVENT_DELEGATION,
    CODE_ANALYSIS,
    HTTP,
    STORAGE,
    VALIDATION,
    ANIMATION,
    AUDIO,
    ERROR_HANDLING,
    DEVICE,
    SECURITY,
    LOGGING
  };
}
