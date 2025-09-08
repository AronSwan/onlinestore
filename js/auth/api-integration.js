/**
 * API集成模块
 * 提供与后端认证API的集成功能
 * 基于 design/auth_api_integration.md 伪代码实现
 */

/**
 * API集成管理器
 * 处理所有认证相关的API调用
 */
class APIIntegrationManager {
  constructor(config = {}) {
    this.config = {
      baseURL: config.baseURL || '/api',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      enableLogging: config.enableLogging || true,
      enableCaching: config.enableCaching || true,
      cacheTimeout: config.cacheTimeout || 300000, // 5分钟
      ...config
    };

    // 确保依赖类已加载
    if (typeof window.HTTPClient === 'undefined') {
      throw new Error('HTTPClient is required but not loaded');
    }

    this.httpClient = new window.HTTPClient(this.config);
    // 延迟初始化其他组件
    this.requestInterceptor = null;
    this.responseInterceptor = null;
    this.cacheManager = null;
    this.rateLimiter = null;

    // API端点配置
    this.endpoints = {
      login: '/auth/login',
      register: '/auth/register',
      logout: '/auth/logout',
      refreshToken: '/auth/refresh',
      forgotPassword: '/auth/forgot-password',
      resetPassword: '/auth/reset-password',
      verifyEmail: '/auth/verify-email',
      changePassword: '/auth/change-password',
      getUserProfile: '/auth/profile',
      updateProfile: '/auth/profile',
      checkSession: '/auth/session/check',
      revokeSession: '/auth/session/revoke'
    };

    this.initializeInterceptors();
  }

  /**
     * 初始化拦截器
     */
  initializeInterceptors() {
    // 初始化组件
    this.requestInterceptor = new RequestInterceptor();
    this.responseInterceptor = new ResponseInterceptor();
    this.cacheManager = new CacheManager(this.config.cacheTimeout);
    this.rateLimiter = new RateLimiter();

    // 请求拦截器
    this.httpClient.addRequestInterceptor((config) => {
      return this.requestInterceptor.process(config);
    });

    // 响应拦截器
    this.httpClient.addResponseInterceptor(
      (response) => this.responseInterceptor.processSuccess(response),
      (error) => this.responseInterceptor.processError(error)
    );
  }

  /**
     * 用户登录
     * @param {Object} credentials - 登录凭据
     * @returns {Promise<Object>} 登录结果
     */
  async login(credentials) {
    try {
      // 速率限制检查
      await this.rateLimiter.checkLimit('login', credentials.email);

      // 输入验证
      this.validateLoginCredentials(credentials);

      // 准备请求数据
      const requestData = {
        email: credentials.email.toLowerCase().trim(),
        password: credentials.password,
        rememberMe: credentials.rememberMe || false,
        deviceInfo: this.getDeviceInfo(),
        timestamp: Date.now()
      };

      // 发送登录请求
      const response = await this.httpClient.post(
        this.endpoints.login,
        requestData,
        {
          timeout: 15000,
          retryAttempts: 2
        }
      );

      // 处理登录成功
      if (response.success) {
        // 存储认证信息
        await this.storeAuthData(response.data);

        // 记录登录日志
        this.logAuthEvent('login_success', {
          userId: response.data.user.id,
          email: credentials.email
        });

        return {
          success: true,
          user: response.data.user,
          token: response.data.token,
          refreshToken: response.data.refreshToken,
          expiresAt: response.data.expiresAt
        };
      }

      throw new Error(response.message || '登录失败');

    } catch (error) {
      // 记录登录失败
      this.logAuthEvent('login_failed', {
        email: credentials.email,
        error: error.message
      });

      // 更新速率限制
      this.rateLimiter.recordFailure('login', credentials.email);

      throw this.handleAuthError(error, 'login');
    }
  }

  /**
     * 用户注册
     * @param {Object} userData - 用户数据
     * @returns {Promise<Object>} 注册结果
     */
  async register(userData) {
    try {
      // 速率限制检查
      await this.rateLimiter.checkLimit('register', userData.email);

      // 输入验证
      this.validateRegistrationData(userData);

      // 准备请求数据
      const requestData = {
        username: userData.username.trim(),
        email: userData.email.toLowerCase().trim(),
        password: userData.password,
        confirmPassword: userData.confirmPassword,
        agreeTerms: userData.agreeTerms,
        deviceInfo: this.getDeviceInfo(),
        timestamp: Date.now(),
        referrer: document.referrer || null
      };

      // 发送注册请求
      const response = await this.httpClient.post(
        this.endpoints.register,
        requestData,
        {
          timeout: 20000,
          retryAttempts: 1
        }
      );

      // 处理注册成功
      if (response.success) {
        // 记录注册日志
        this.logAuthEvent('register_success', {
          userId: response.data.user.id,
          email: userData.email,
          username: userData.username
        });

        return {
          success: true,
          user: response.data.user,
          message: response.message || '注册成功',
          requiresEmailVerification: response.data.requiresEmailVerification || false
        };
      }

      throw new Error(response.message || '注册失败');

    } catch (error) {
      // 记录注册失败
      this.logAuthEvent('register_failed', {
        email: userData.email,
        username: userData.username,
        error: error.message
      });

      // 更新速率限制
      this.rateLimiter.recordFailure('register', userData.email);

      throw this.handleAuthError(error, 'register');
    }
  }

  /**
     * 用户登出
     * @returns {Promise<Object>} 登出结果
     */
  async logout() {
    try {
      const token = this.getStoredToken();

      if (token) {
        // 发送登出请求
        // const response = await this.httpClient.post( // 暂时注释，未使用
        await this.httpClient.post(
          this.endpoints.logout,
          { token },
          {
            timeout: 10000,
            retryAttempts: 1
          }
        );

        // 记录登出日志
        this.logAuthEvent('logout_success', {
          timestamp: Date.now()
        });
      }

      // 清除本地认证数据
      await this.clearAuthData();

      return {
        success: true,
        message: '已成功登出'
      };

    } catch (error) {
      // 即使API调用失败，也要清除本地数据
      await this.clearAuthData();

      this.logAuthEvent('logout_failed', {
        error: error.message
      });

      // 登出失败不应该阻止用户
      return {
        success: true,
        message: '已清除本地登录状态'
      };
    }
  }

  /**
     * 刷新访问令牌
     * @returns {Promise<Object>} 刷新结果
     */
  async refreshToken() {
    try {
      const refreshToken = this.getStoredRefreshToken();

      if (!refreshToken) {
        throw new Error('没有有效的刷新令牌');
      }

      // 发送刷新请求
      const response = await this.httpClient.post(
        this.endpoints.refreshToken,
        { refreshToken },
        {
          timeout: 10000,
          retryAttempts: 1,
          skipAuthHeader: true // 避免使用过期的token
        }
      );

      if (response.success) {
        // 更新存储的认证信息
        await this.updateAuthData(response.data);

        this.logAuthEvent('token_refresh_success', {
          expiresAt: response.data.expiresAt
        });

        return {
          success: true,
          token: response.data.token,
          expiresAt: response.data.expiresAt
        };
      }

      throw new Error(response.message || '令牌刷新失败');

    } catch (error) {
      this.logAuthEvent('token_refresh_failed', {
        error: error.message
      });

      // 刷新失败，清除认证数据
      await this.clearAuthData();

      throw this.handleAuthError(error, 'refreshToken');
    }
  }

  /**
     * 忘记密码
     * @param {string} email - 邮箱地址
     * @returns {Promise<Object>} 请求结果
     */
  async forgotPassword(email) {
    try {
      // 速率限制检查
      await this.rateLimiter.checkLimit('forgotPassword', email);

      // 输入验证
      if (!this.isValidEmail(email)) {
        throw new Error('请输入有效的邮箱地址');
      }

      // 发送忘记密码请求
      const response = await this.httpClient.post(
        this.endpoints.forgotPassword,
        {
          email: email.toLowerCase().trim(),
          timestamp: Date.now()
        },
        {
          timeout: 15000,
          retryAttempts: 1
        }
      );

      if (response.success) {
        this.logAuthEvent('forgot_password_success', {
          email: email
        });

        return {
          success: true,
          message: response.message || '重置密码邮件已发送'
        };
      }

      throw new Error(response.message || '请求失败');

    } catch (error) {
      this.logAuthEvent('forgot_password_failed', {
        email: email,
        error: error.message
      });

      // 更新速率限制
      this.rateLimiter.recordFailure('forgotPassword', email);

      throw this.handleAuthError(error, 'forgotPassword');
    }
  }

  /**
     * 重置密码
     * @param {Object} resetData - 重置数据
     * @returns {Promise<Object>} 重置结果
     */
  async resetPassword(resetData) {
    try {
      // 输入验证
      this.validateResetPasswordData(resetData);

      // 发送重置密码请求
      const response = await this.httpClient.post(
        this.endpoints.resetPassword,
        {
          token: resetData.token,
          newPassword: resetData.newPassword,
          confirmPassword: resetData.confirmPassword,
          timestamp: Date.now()
        },
        {
          timeout: 15000,
          retryAttempts: 1
        }
      );

      if (response.success) {
        this.logAuthEvent('reset_password_success', {
          timestamp: Date.now()
        });

        return {
          success: true,
          message: response.message || '密码重置成功'
        };
      }

      throw new Error(response.message || '密码重置失败');

    } catch (error) {
      this.logAuthEvent('reset_password_failed', {
        error: error.message
      });

      throw this.handleAuthError(error, 'resetPassword');
    }
  }

  /**
     * 验证邮箱
     * @param {string} token - 验证令牌
     * @returns {Promise<Object>} 验证结果
     */
  async verifyEmail(token) {
    try {
      if (!token) {
        throw new Error('验证令牌不能为空');
      }

      // 发送邮箱验证请求
      const response = await this.httpClient.post(
        this.endpoints.verifyEmail,
        {
          token: token,
          timestamp: Date.now()
        },
        {
          timeout: 10000,
          retryAttempts: 1
        }
      );

      if (response.success) {
        this.logAuthEvent('email_verify_success', {
          timestamp: Date.now()
        });

        return {
          success: true,
          message: response.message || '邮箱验证成功'
        };
      }

      throw new Error(response.message || '邮箱验证失败');

    } catch (error) {
      this.logAuthEvent('email_verify_failed', {
        error: error.message
      });

      throw this.handleAuthError(error, 'verifyEmail');
    }
  }

  /**
     * 修改密码
     * @param {Object} passwordData - 密码数据
     * @returns {Promise<Object>} 修改结果
     */
  async changePassword(passwordData) {
    try {
      // 输入验证
      this.validateChangePasswordData(passwordData);

      // 发送修改密码请求
      const response = await this.httpClient.post(
        this.endpoints.changePassword,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmPassword: passwordData.confirmPassword,
          timestamp: Date.now()
        },
        {
          timeout: 15000,
          retryAttempts: 1
        }
      );

      if (response.success) {
        this.logAuthEvent('change_password_success', {
          timestamp: Date.now()
        });

        return {
          success: true,
          message: response.message || '密码修改成功'
        };
      }

      throw new Error(response.message || '密码修改失败');

    } catch (error) {
      this.logAuthEvent('change_password_failed', {
        error: error.message
      });

      throw this.handleAuthError(error, 'changePassword');
    }
  }

  /**
     * 获取用户资料
     * @returns {Promise<Object>} 用户资料
     */
  async getUserProfile() {
    try {
      // 检查缓存
      const cacheKey = 'user_profile';
      const cachedProfile = this.cacheManager.get(cacheKey);
      if (cachedProfile) {
        return cachedProfile;
      }

      // 发送获取资料请求
      const response = await this.httpClient.get(
        this.endpoints.getUserProfile,
        {
          timeout: 10000,
          retryAttempts: 2
        }
      );

      if (response.success) {
        const profileData = {
          success: true,
          user: response.data.user
        };

        // 缓存结果
        this.cacheManager.set(cacheKey, profileData);

        return profileData;
      }

      throw new Error(response.message || '获取用户资料失败');

    } catch (error) {
      throw this.handleAuthError(error, 'getUserProfile');
    }
  }

  /**
     * 更新用户资料
     * @param {Object} profileData - 资料数据
     * @returns {Promise<Object>} 更新结果
     */
  async updateProfile(profileData) {
    try {
      // 输入验证
      this.validateProfileData(profileData);

      // 发送更新资料请求
      const response = await this.httpClient.put(
        this.endpoints.updateProfile,
        {
          ...profileData,
          timestamp: Date.now()
        },
        {
          timeout: 15000,
          retryAttempts: 1
        }
      );

      if (response.success) {
        // 清除缓存
        this.cacheManager.delete('user_profile');

        this.logAuthEvent('profile_update_success', {
          timestamp: Date.now()
        });

        return {
          success: true,
          user: response.data.user,
          message: response.message || '资料更新成功'
        };
      }

      throw new Error(response.message || '资料更新失败');

    } catch (error) {
      this.logAuthEvent('profile_update_failed', {
        error: error.message
      });

      throw this.handleAuthError(error, 'updateProfile');
    }
  }

  /**
     * 检查会话状态
     * @returns {Promise<Object>} 会话状态
     */
  async checkSession() {
    try {
      const token = this.getStoredToken();

      if (!token) {
        return {
          success: false,
          isValid: false,
          message: '没有有效的会话令牌'
        };
      }

      // 发送会话检查请求
      const response = await this.httpClient.get(
        this.endpoints.checkSession,
        {
          timeout: 5000,
          retryAttempts: 1
        }
      );

      return {
        success: true,
        isValid: response.success && response.data.isValid,
        user: response.data.user || null,
        expiresAt: response.data.expiresAt || null
      };

    } catch (error) {
      return {
        success: false,
        isValid: false,
        message: error.message
      };
    }
  }

  /**
     * 撤销会话
     * @param {string} sessionId - 会话ID（可选）
     * @returns {Promise<Object>} 撤销结果
     */
  async revokeSession(sessionId = null) {
    try {
      // 发送撤销会话请求
      const response = await this.httpClient.post(
        this.endpoints.revokeSession,
        {
          sessionId: sessionId,
          timestamp: Date.now()
        },
        {
          timeout: 10000,
          retryAttempts: 1
        }
      );

      if (response.success) {
        this.logAuthEvent('session_revoke_success', {
          sessionId: sessionId,
          timestamp: Date.now()
        });

        return {
          success: true,
          message: response.message || '会话已撤销'
        };
      }

      throw new Error(response.message || '会话撤销失败');

    } catch (error) {
      this.logAuthEvent('session_revoke_failed', {
        sessionId: sessionId,
        error: error.message
      });

      throw this.handleAuthError(error, 'revokeSession');
    }
  }

  // ==================== 验证方法 ====================

  /**
     * 验证登录凭据
     * @param {Object} credentials - 登录凭据
     */
  validateLoginCredentials(credentials) {
    if (!credentials.email || !this.isValidEmail(credentials.email)) {
      throw new Error('请输入有效的邮箱地址');
    }

    if (!credentials.password || credentials.password.length < 6) {
      throw new Error('密码不能少于6位');
    }
  }

  /**
     * 验证注册数据
     * @param {Object} userData - 用户数据
     */
  validateRegistrationData(userData) {
    if (!userData.username || userData.username.length < 3) {
      throw new Error('用户名不能少于3位');
    }

    if (!userData.email || !this.isValidEmail(userData.email)) {
      throw new Error('请输入有效的邮箱地址');
    }

    if (!userData.password || userData.password.length < 8) {
      throw new Error('密码不能少于8位');
    }

    if (userData.password !== userData.confirmPassword) {
      throw new Error('两次输入的密码不一致');
    }

    if (!userData.agreeTerms) {
      throw new Error('请同意服务条款和隐私政策');
    }
  }

  /**
     * 验证重置密码数据
     * @param {Object} resetData - 重置数据
     */
  validateResetPasswordData(resetData) {
    if (!resetData.token) {
      throw new Error('重置令牌不能为空');
    }

    if (!resetData.newPassword || resetData.newPassword.length < 8) {
      throw new Error('新密码不能少于8位');
    }

    if (resetData.newPassword !== resetData.confirmPassword) {
      throw new Error('两次输入的密码不一致');
    }
  }

  /**
     * 验证修改密码数据
     * @param {Object} passwordData - 密码数据
     */
  validateChangePasswordData(passwordData) {
    if (!passwordData.currentPassword) {
      throw new Error('请输入当前密码');
    }

    if (!passwordData.newPassword || passwordData.newPassword.length < 8) {
      throw new Error('新密码不能少于8位');
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      throw new Error('两次输入的新密码不一致');
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      throw new Error('新密码不能与当前密码相同');
    }
  }

  /**
     * 验证资料数据
     * @param {Object} profileData - 资料数据
     */
  validateProfileData(profileData) {
    if (profileData.email && !this.isValidEmail(profileData.email)) {
      throw new Error('请输入有效的邮箱地址');
    }

    if (profileData.username && profileData.username.length < 3) {
      throw new Error('用户名不能少于3位');
    }
  }

  /**
     * 验证邮箱格式
     * @param {string} email - 邮箱地址
     * @returns {boolean} 是否有效
     */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // ==================== 存储管理方法 ====================

  /**
     * 存储认证数据
     * @param {Object} authData - 认证数据
     */
  async storeAuthData(authData) {
    try {
      const storageData = {
        token: authData.token,
        refreshToken: authData.refreshToken,
        user: authData.user,
        expiresAt: authData.expiresAt,
        timestamp: Date.now()
      };

      // 存储到localStorage
      localStorage.setItem('auth_data', JSON.stringify(storageData));

      // 如果支持，也存储到sessionStorage作为备份
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('auth_backup', JSON.stringify(storageData));
      }

    } catch (error) {
      console.error('存储认证数据失败:', error);
      throw new Error('无法保存登录状态');
    }
  }

  /**
     * 更新认证数据
     * @param {Object} authData - 认证数据
     */
  async updateAuthData(authData) {
    try {
      const existingData = this.getStoredAuthData();
      const updatedData = {
        ...existingData,
        ...authData,
        timestamp: Date.now()
      };

      localStorage.setItem('auth_data', JSON.stringify(updatedData));

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('auth_backup', JSON.stringify(updatedData));
      }

    } catch (error) {
      console.error('更新认证数据失败:', error);
    }
  }

  /**
     * 获取存储的认证数据
     * @returns {Object|null} 认证数据
     */
  getStoredAuthData() {
    try {
      const data = localStorage.getItem('auth_data');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('获取认证数据失败:', error);
      return null;
    }
  }

  /**
     * 获取存储的令牌
     * @returns {string|null} 访问令牌
     */
  getStoredToken() {
    const authData = this.getStoredAuthData();
    return authData ? authData.token : null;
  }

  /**
     * 获取存储的刷新令牌
     * @returns {string|null} 刷新令牌
     */
  getStoredRefreshToken() {
    const authData = this.getStoredAuthData();
    return authData ? authData.refreshToken : null;
  }

  /**
     * 清除认证数据
     */
  async clearAuthData() {
    try {
      localStorage.removeItem('auth_data');

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('auth_backup');
      }

      // 清除相关缓存
      this.cacheManager.clear();

    } catch (error) {
      console.error('清除认证数据失败:', error);
    }
  }

  // ==================== 工具方法 ====================

  /**
     * 获取设备信息
     * @returns {Object} 设备信息
     */
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${screen.width}x${screen.height}`,
      timestamp: Date.now()
    };
  }

  /**
     * 记录认证事件
     * @param {string} event - 事件名称
     * @param {Object} data - 事件数据
     */
  logAuthEvent(event, data = {}) {
    if (!this.config.enableLogging) {return;}

    const logEntry = {
      event,
      timestamp: Date.now(),
      data,
      userAgent: navigator.userAgent
    };

    console.log(`[Auth Event] ${event}:`, logEntry);

    // 可以在这里添加发送到日志服务的逻辑
  }

  /**
     * 处理认证错误
     * @param {Error} error - 错误对象
     * @param {string} operation - 操作名称
     * @returns {Error} 处理后的错误
     */
  handleAuthError(error, operation) {
    // 根据错误类型和操作类型返回用户友好的错误消息
    const errorMap = {
      'NETWORK_ERROR': '网络连接失败，请检查网络设置',
      'TIMEOUT_ERROR': '请求超时，请稍后重试',
      'RATE_LIMIT_ERROR': '操作过于频繁，请稍后重试',
      'VALIDATION_ERROR': '输入数据格式错误',
      'AUTH_ERROR': '认证失败，请重新登录',
      'SERVER_ERROR': '服务器错误，请稍后重试'
    };

    const errorType = this.getErrorType(error);
    const userMessage = errorMap[errorType] || error.message || '操作失败，请稍后重试';

    const enhancedError = new Error(userMessage);
    enhancedError.originalError = error;
    enhancedError.operation = operation;
    enhancedError.type = errorType;
    enhancedError.timestamp = Date.now();

    return enhancedError;
  }

  /**
     * 获取错误类型
     * @param {Error} error - 错误对象
     * @returns {string} 错误类型
     */
  getErrorType(error) {
    if (error.name === 'NetworkError' || error.message.includes('网络')) {
      return 'NETWORK_ERROR';
    }

    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    }

    if (error.status === 429 || error.message.includes('rate limit')) {
      return 'RATE_LIMIT_ERROR';
    }

    if (error.status === 400 || error.message.includes('validation')) {
      return 'VALIDATION_ERROR';
    }

    if (error.status === 401 || error.status === 403) {
      return 'AUTH_ERROR';
    }

    if (error.status >= 500) {
      return 'SERVER_ERROR';
    }

    return 'UNKNOWN_ERROR';
  }
}

/**
 * HTTP客户端
 * 处理HTTP请求的发送和响应
 */
class HTTPClient {
  constructor(config = {}) {
    this.config = {
      baseURL: config.baseURL || '',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      ...config
    };
    this.requestInterceptors = [];
    this.responseInterceptors = [];
  }

  /**
   * 添加请求拦截器
   * @param {Function} interceptor - 拦截器函数
   */
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * 添加响应拦截器
   * @param {Function} successHandler - 成功处理器
   * @param {Function} errorHandler - 错误处理器
   */
  addResponseInterceptor(successHandler, errorHandler) {
    this.responseInterceptors.push({ successHandler, errorHandler });
  }

  /**
   * 发送GET请求
   * @param {string} url - 请求URL
   * @param {Object} options - 请求选项
   * @returns {Promise} 请求结果
   */
  async get(url, options = {}) {
    return this.request('GET', url, null, options);
  }

  /**
   * 发送POST请求
   * @param {string} url - 请求URL
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise} 请求结果
   */
  async post(url, data, options = {}) {
    return this.request('POST', url, data, options);
  }

  /**
   * 发送PUT请求
   * @param {string} url - 请求URL
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise} 请求结果
   */
  async put(url, data, options = {}) {
    return this.request('PUT', url, data, options);
  }

  /**
   * 发送请求
   * @param {string} method - 请求方法
   * @param {string} url - 请求URL
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise} 请求结果
   */
  async request(method, url, data, options = {}) {
    let config = {
      method,
      url: this.config.baseURL + url,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: options.timeout || this.config.timeout,
      ...options
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    // 应用请求拦截器
    for (const interceptor of this.requestInterceptors) {
      config = await interceptor(config);
    }

    try {
      const response = await fetch(config.url, config);
      const result = await response.json();

      // 应用响应拦截器
      let processedResult = result;
      for (const { successHandler } of this.responseInterceptors) {
        if (successHandler) {
          processedResult = await successHandler(processedResult);
        }
      }

      return processedResult;
    } catch (originalError) {
      // 应用错误拦截器
      let processedError = originalError;
      for (const { errorHandler } of this.responseInterceptors) {
        if (errorHandler) {
          processedError = await errorHandler(processedError);
        }
      }
      throw processedError;
    }
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    APIIntegrationManager,
    HTTPClient,
    RequestInterceptor,
    ResponseInterceptor,
    CacheManager,
    RateLimiter
  };
} else {
  window.APIIntegrationManager = APIIntegrationManager;
  window.HTTPClient = HTTPClient;
  window.RequestInterceptor = RequestInterceptor;
  window.ResponseInterceptor = ResponseInterceptor;
  window.CacheManager = CacheManager;
  window.RateLimiter = RateLimiter;
}
