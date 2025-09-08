/**
 * API配置管理器
 * 专门负责API相关的配置常量和设置
 */
class APIConfig {
  constructor() {
    this.config = {
      BASE_URL: '/api',
      TIMEOUT: 10000,
      RETRY_ATTEMPTS: 3,
      RETRY_DELAY: 1000,
      RATE_LIMIT: {
        maxRequests: 100,
        windowMs: 60000 // 1分钟
      },
      ENDPOINTS: {
        products: {
          list: '/products',
          detail: '/products/{id}',
          search: '/products/search',
          categories: '/products/categories'
        },
        cart: {
          get: '/cart',
          add: '/cart/items',
          update: '/cart/items/{id}',
          remove: '/cart/items/{id}',
          clear: '/cart/clear'
        },
        user: {
          profile: '/user/profile',
          login: '/auth/login',
          logout: '/auth/logout',
          register: '/auth/register'
        },
        orders: {
          list: '/orders',
          detail: '/orders/{id}',
          create: '/orders',
          cancel: '/orders/{id}/cancel'
        }
      },
      HTTP_METHODS: {
        GET: 'GET',
        POST: 'POST',
        PUT: 'PUT',
        DELETE: 'DELETE',
        PATCH: 'PATCH'
      },
      STATUS_CODES: {
        OK: 200,
        CREATED: 201,
        NO_CONTENT: 204,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        INTERNAL_SERVER_ERROR: 500,
        SERVICE_UNAVAILABLE: 503
      },
      HEADERS: {
        CONTENT_TYPE: 'Content-Type',
        AUTHORIZATION: 'Authorization',
        ACCEPT: 'Accept',
        USER_AGENT: 'User-Agent'
      },
      CONTENT_TYPES: {
        JSON: 'application/json',
        FORM_DATA: 'multipart/form-data',
        URL_ENCODED: 'application/x-www-form-urlencoded',
        TEXT: 'text/plain'
      },
      ERROR_MESSAGES: {
        NETWORK_ERROR: 'Network error occurred',
        TIMEOUT_ERROR: 'Request timeout',
        SERVER_ERROR: 'Server error occurred',
        UNAUTHORIZED_ERROR: 'Unauthorized access',
        NOT_FOUND_ERROR: 'Resource not found',
        VALIDATION_ERROR: 'Validation failed'
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
    return Object.freeze(JSON.parse(JSON.stringify(this.config)));
  }

  /**
   * 获取基础URL
   * @returns {string} 基础URL
   */
  getBaseUrl() {
    return this.config.BASE_URL;
  }

  /**
   * 获取完整的API端点URL
   * @param {string} category - 端点分类
   * @param {string} endpoint - 端点名称
   * @param {object} params - URL参数
   * @returns {string} 完整URL
   */
  getEndpointUrl(category, endpoint, params = {}) {
    const categoryEndpoints = this.config.ENDPOINTS[category];
    if (!categoryEndpoints || !categoryEndpoints[endpoint]) {
      throw new Error(`Endpoint ${category}.${endpoint} not found`);
    }

    let url = this.config.BASE_URL + categoryEndpoints[endpoint];

    // 替换URL中的参数占位符
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, encodeURIComponent(value));
    });

    return url;
  }

  /**
   * 获取所有端点配置
   * @returns {object} 端点配置
   */
  getAllEndpoints() {
    return JSON.parse(JSON.stringify(this.config.ENDPOINTS));
  }

  /**
   * 获取特定分类的端点
   * @param {string} category - 端点分类
   * @returns {object|null} 端点配置
   */
  getEndpointsByCategory(category) {
    return this.config.ENDPOINTS[category] ?
      JSON.parse(JSON.stringify(this.config.ENDPOINTS[category])) : null;
  }

  /**
   * 获取超时配置
   * @returns {number} 超时时间(ms)
   */
  getTimeout() {
    return this.config.TIMEOUT;
  }

  /**
   * 获取重试配置
   * @returns {object} 重试配置
   */
  getRetryConfig() {
    return {
      attempts: this.config.RETRY_ATTEMPTS,
      delay: this.config.RETRY_DELAY
    };
  }

  /**
   * 获取速率限制配置
   * @returns {object} 速率限制配置
   */
  getRateLimitConfig() {
    return JSON.parse(JSON.stringify(this.config.RATE_LIMIT));
  }

  /**
   * 获取HTTP方法常量
   * @returns {object} HTTP方法
   */
  getHttpMethods() {
    return JSON.parse(JSON.stringify(this.config.HTTP_METHODS));
  }

  /**
   * 获取状态码常量
   * @returns {object} 状态码
   */
  getStatusCodes() {
    return JSON.parse(JSON.stringify(this.config.STATUS_CODES));
  }

  /**
   * 检查状态码是否表示成功
   * @param {number} statusCode - 状态码
   * @returns {boolean} 是否成功
   */
  isSuccessStatus(statusCode) {
    return statusCode >= 200 && statusCode < 300;
  }

  /**
   * 检查状态码是否表示客户端错误
   * @param {number} statusCode - 状态码
   * @returns {boolean} 是否客户端错误
   */
  isClientError(statusCode) {
    return statusCode >= 400 && statusCode < 500;
  }

  /**
   * 检查状态码是否表示服务器错误
   * @param {number} statusCode - 状态码
   * @returns {boolean} 是否服务器错误
   */
  isServerError(statusCode) {
    return statusCode >= 500 && statusCode < 600;
  }

  /**
   * 获取请求头常量
   * @returns {object} 请求头
   */
  getHeaders() {
    return JSON.parse(JSON.stringify(this.config.HEADERS));
  }

  /**
   * 获取内容类型常量
   * @returns {object} 内容类型
   */
  getContentTypes() {
    return JSON.parse(JSON.stringify(this.config.CONTENT_TYPES));
  }

  /**
   * 获取错误消息
   * @param {string} errorType - 错误类型
   * @returns {string} 错误消息
   */
  getErrorMessage(errorType) {
    return this.config.ERROR_MESSAGES[errorType] || 'Unknown error occurred';
  }

  /**
   * 根据状态码获取错误消息
   * @param {number} statusCode - 状态码
   * @returns {string} 错误消息
   */
  getErrorMessageByStatus(statusCode) {
    const statusCodes = this.config.STATUS_CODES;

    switch (statusCode) {
    case statusCodes.BAD_REQUEST:
      return this.getErrorMessage('VALIDATION_ERROR');
    case statusCodes.UNAUTHORIZED:
      return this.getErrorMessage('UNAUTHORIZED_ERROR');
    case statusCodes.NOT_FOUND:
      return this.getErrorMessage('NOT_FOUND_ERROR');
    case statusCodes.INTERNAL_SERVER_ERROR:
    case statusCodes.SERVICE_UNAVAILABLE:
      return this.getErrorMessage('SERVER_ERROR');
    default:
      return this.getErrorMessage('NETWORK_ERROR');
    }
  }

  /**
   * 构建默认请求配置
   * @param {object} options - 自定义选项
   * @returns {object} 请求配置
   */
  buildRequestConfig(options = {}) {
    return {
      timeout: this.getTimeout(),
      headers: {
        [this.config.HEADERS.CONTENT_TYPE]: this.config.CONTENT_TYPES.JSON,
        [this.config.HEADERS.ACCEPT]: this.config.CONTENT_TYPES.JSON
      },
      ...options
    };
  }
}

// 创建全局实例
const apiConfig = new APIConfig();

// 导出配置管理器
if (typeof window !== 'undefined') {
  window.APIConfig = APIConfig;
  window.apiConfig = apiConfig;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { APIConfig, apiConfig };
}
