/**
 * HTTP客户端模块
 * 提供统一的HTTP请求处理功能
 */

/**
 * HTTP客户端类
 * 处理所有HTTP请求的发送和响应处理
 */
class HTTPClient {
  constructor(config = {}) {
    this.config = {
      baseURL: config.baseURL || '',
      timeout: config.timeout || 30000,
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        ...config.headers
      },
      credentials: config.credentials || 'same-origin',
      ...config
    };
  }

  /**
   * 发送GET请求
   * @param {string} url - 请求URL
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async get(url, options = {}) {
    return this.request(url, {
      method: 'GET',
      ...options
    });
  }

  /**
   * 发送POST请求
   * @param {string} url - 请求URL
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async post(url, data = null, options = {}) {
    return this.request(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
  }

  /**
   * 发送PUT请求
   * @param {string} url - 请求URL
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async put(url, data = null, options = {}) {
    return this.request(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
  }

  /**
   * 发送DELETE请求
   * @param {string} url - 请求URL
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async delete(url, options = {}) {
    return this.request(url, {
      method: 'DELETE',
      ...options
    });
  }

  /**
   * 发送HTTP请求
   * @param {string} url - 请求URL
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async request(url, options = {}) {
    const fullUrl = this.buildUrl(url);
    const requestOptions = this.buildRequestOptions(options);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(fullUrl, {
        ...requestOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return await response.text();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * 构建完整URL
   * @param {string} url - 相对或绝对URL
   * @returns {string} 完整URL
   */
  buildUrl(url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${this.config.baseURL}${url}`;
  }

  /**
   * 构建请求选项
   * @param {Object} options - 原始选项
   * @returns {Object} 处理后的选项
   */
  buildRequestOptions(options) {
    return {
      headers: {
        ...this.config.headers,
        ...options.headers
      },
      ...options
    };
  }

  /**
   * 设置默认头部
   * @param {Object} headers - 头部对象
   */
  setDefaultHeaders(headers) {
    this.config.headers = {
      ...this.config.headers,
      ...headers
    };
  }

  /**
   * 获取配置
   * @returns {Object} 当前配置
   */
  getConfig() {
    return { ...this.config };
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HTTPClient;
} else if (typeof window !== 'undefined') {
  window.HTTPClient = HTTPClient;
}
