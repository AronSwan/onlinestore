/**
 * AuthAPI - 认证API集成专职类
 * 职责: 与后端认证API的通信
 * 符合单一职责原则(SRP)
 */
class AuthAPI {
  constructor() {
    this.baseURL = this.getBaseURL();
    this.timeout = 10000; // 10秒超时
  }

  /**
   * 获取API基础URL
   * @returns {string} API基础URL
   */
  getBaseURL() {
    // 从环境变量或配置文件读取，避免硬编码
    return window.API_BASE_URL || '/api';
  }

  /**
   * 用户认证
   * @param {Object} credentials - 登录凭据
   * @param {string} credentials.username - 用户名
   * @param {string} credentials.password - 密码
   * @returns {Promise<Object>} 认证结果
   */
  async authenticate(credentials) {
    try {
      const response = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password
        })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          user: data.user,
          token: data.token,
          message: data.message || '登录成功'
        };
      }

      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || '登录失败，请检查用户名和密码'
      };
    } catch (error) {
      console.error('Authentication API error:', error);
      return {
        success: false,
        message: '网络连接失败，请稍后重试'
      };
    }
  }

  /**
   * 用户注册
   * @param {Object} userData - 注册数据
   * @returns {Promise<Object>} 注册结果
   */
  async register(userData) {
    try {
      const response = await this.makeRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: data.message || '注册成功'
        };
      }

      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || '注册失败，请稍后重试'
      };
    } catch (error) {
      console.error('Registration API error:', error);
      return {
        success: false,
        message: '网络连接失败，请稍后重试'
      };
    }
  }

  /**
   * 用户登出
   * @returns {Promise<Object>} 登出结果
   */
  async logout() {
    try {
      const token = this.getAuthToken();
      const response = await this.makeRequest('/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        return {
          success: true,
          message: '登出成功'
        };
      }

      // 即使API调用失败，本地登出也应该成功
      return {
        success: true,
        message: '登出成功'
      };
    } catch (error) {
      console.error('Logout API error:', error);
      // 网络错误时，本地登出仍然成功
      return {
        success: true,
        message: '登出成功'
      };
    }
  }

  /**
   * 修改密码
   * @param {Object} passwordData - 密码数据
   * @param {string} passwordData.oldPassword - 旧密码
   * @param {string} passwordData.newPassword - 新密码
   * @returns {Promise<Object>} 修改结果
   */
  async changePassword(passwordData) {
    try {
      const token = this.getAuthToken();
      const response = await this.makeRequest('/auth/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(passwordData)
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: data.message || '密码修改成功'
        };
      }

      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || '密码修改失败'
      };
    } catch (error) {
      console.error('Change password API error:', error);
      return {
        success: false,
        message: '网络连接失败，请稍后重试'
      };
    }
  }

  /**
   * 验证令牌有效性
   * @param {string} token - 认证令牌
   * @returns {Promise<Object>} 验证结果
   */
  async validateToken(token) {
    try {
      const response = await this.makeRequest('/auth/validate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          user: data.user
        };
      }

      return {
        success: false,
        message: '令牌无效'
      };
    } catch (error) {
      console.error('Token validation API error:', error);
      return {
        success: false,
        message: '令牌验证失败'
      };
    }
  }

  /**
   * 发起HTTP请求的通用方法
   * @param {string} endpoint - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise<Response>} 响应对象
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const requestOptions = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    requestOptions.signal = controller.signal;

    try {
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('请求超时');
      }
      throw error;
    }
  }

  /**
   * 获取认证令牌
   * @returns {string|null} 认证令牌
   */
  getAuthToken() {
    return localStorage.getItem('auth_token');
  }

  /**
   * 设置API基础URL
   * @param {string} baseURL - 新的基础URL
   */
  setBaseURL(baseURL) {
    this.baseURL = baseURL;
  }

  /**
   * 设置请求超时时间
   * @param {number} timeout - 超时时间(毫秒)
   */
  setTimeout(timeout) {
    this.timeout = timeout;
  }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthAPI;
}

// 浏览器环境下的全局暴露
if (typeof window !== 'undefined') {
  window.AuthAPI = AuthAPI;
}
