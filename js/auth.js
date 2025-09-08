/* global Utils */
/**
 * 用户认证系统模块
 * 提供用户注册、登录、会话管理等功能
 * @author AI Assistant
 * @version 1.0
 * @date 2025-01-12
 */

// 常量定义
const API_DELAY_MIN = 500;
const API_DELAY_MAX = 1000;

class AuthManager {
  constructor(config = {}) {
    // 配置选项
    this.config = {
      // API配置
      apiBaseURL: config.apiBaseURL || '/api',
      apiTimeout: config.apiTimeout || 30000,

      // 会话配置
      sessionTimeout: config.sessionTimeout || 30 * 60 * 1000, // 30分钟
      rememberMeDuration: config.rememberMeDuration || 7 * 24 * 60 * 60 * 1000, // 7天

      // 密码策略配置
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxAge: 90 * 24 * 60 * 60 * 1000, // 90天
        preventReuse: 5,
        ...config.passwordPolicy
      },

      // 账户锁定配置
      lockoutPolicy: {
        maxAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15分钟
        progressiveLockout: true,
        ...config.lockoutPolicy
      },

      // UI配置
      uiConfig: {
        showPasswordStrength: true,
        enableAutoComplete: true,
        showLoginRememberMe: true,
        enableSocialLogin: false,
        ...config.uiConfig
      },

      // 安全配置
      securityConfig: {
        enableCSRFProtection: true,
        enableRateLimiting: true,
        enableSessionValidation: true,
        enableDeviceTracking: true,
        ...config.securityConfig
      },

      ...config
    };

    // 兼容旧版本的依赖注入
    this.storage = config.storage || localStorage;
    this.eventBus = config.eventBus || window;
    this.apiBase = config.apiBase || this.config.apiBaseURL;
    this.sessionKey = 'user_session';
    this.userKey = 'user_data';
    this.tokenKey = 'auth_token';

    // 认证状态
    this.currentUser = null;
    this.isAuthenticated = false;
    this.sessionData = null;

    // 事件监听器
    this.eventListeners = new Map();

    // 初始化认证管理器
    this.initialize();
  }

  /**
     * 初始化所有模块
     */
  initializeModules() {
    try {
      // 输入验证模块
      // 确保RealTimeValidationManager已加载
      if (typeof window.RealTimeValidationManager === 'undefined') {
        console.warn('RealTimeValidationManager not loaded, skipping input validation');
        this.inputValidator = null;
      } else {
        this.inputValidator = new window.RealTimeValidationManager({
          enableRealTimeValidation: true,
          showValidationMessages: true
        });
      }

      // 密码安全模块
      // PasswordSecurityManager 在 password-security.js 中定义
      this.passwordSecurity = window.PasswordSecurityManager ? new window.PasswordSecurityManager(this.config.passwordPolicy) : null;
      this.passwordPolicy = new PasswordPolicyManager(this.config.passwordPolicy);
      this.accountLockout = new AccountLockoutManager(this.config.lockoutPolicy);

      // 会话管理模块
      this.sessionManager = new SessionManager({
        timeout: this.config.sessionTimeout,
        enableAutoRefresh: true,
        enableDeviceTracking: this.config.securityConfig.enableDeviceTracking
      });

      // UI交互模块
      this.uiManager = new UIInteractionManager(this.config.uiConfig);

      // API集成模块
      this.apiManager = new APIIntegrationManager({
        baseURL: this.config.apiBaseURL,
        timeout: this.config.apiTimeout,
        enableLogging: true,
        enableCaching: true
      });

      // 注册管理模块
      if (typeof window.RegistrationManager !== 'undefined') {
        this.registrationManager = new window.RegistrationManager({
          enableEmailVerification: this.config.enableEmailVerification,
          enableUsernameReservation: this.config.enableUsernameReservation,
          reservationTimeout: this.config.reservationTimeout || 300000,
          maxRetryAttempts: this.config.maxRetryAttempts || 3,
          enableRateLimiting: this.config.enableRateLimiting,
          enableConcurrencyControl: this.config.enableConcurrencyControl
        });
      } else {
        console.warn('RegistrationManager not loaded, using fallback registration');
        this.registrationManager = null;
      }

      console.log('认证模块初始化完成');

    } catch (error) {
      console.error('认证模块初始化失败:', error);
      throw new Error('认证系统初始化失败');
    }
  }

  /**
     * 初始化认证管理器
     */
  async initialize() {
    try {
      // 初始化所有模块
      this.initializeModules();

      // 检查现有会话
      await this.checkExistingSession();

      // 设置事件监听
      this.setupEventListeners();

      // 初始化UI组件
      this.uiManager.initialize();

      // 触发初始化完成事件
      this.dispatchAuthEvent('initialized', {
        isAuthenticated: this.isAuthenticated,
        user: this.currentUser
      });

    } catch (error) {
      console.error('认证管理器初始化失败:', error);
    }
  }

  /**
     * 设置事件监听器
     */
  setupEventListeners() {
    // 监听会话过期事件
    document.addEventListener('auth:sessionExpired', () => {
      this.handleSessionExpired();
    });

    // 监听令牌刷新事件
    document.addEventListener('auth:tokenRefreshed', (event) => {
      this.handleTokenRefreshed(event.detail);
    });

    // 监听账户锁定事件
    document.addEventListener('auth:accountLocked', (event) => {
      this.handleAccountLocked(event.detail);
    });

    // 监听密码过期事件
    document.addEventListener('auth:passwordExpired', () => {
      this.handlePasswordExpired();
    });

    // 监听页面卸载事件
    window.addEventListener('beforeunload', () => {
      this.handlePageUnload();
    });

    // 监听存储变化事件
    window.addEventListener('storage', (e) => {
      if (e.key === this.sessionKey) {
        this.handleStorageChange(e);
      }
    });
  }

  /**
   * 通用API操作处理器
   * @param {string} operation - 操作名称
   * @param {string} loadingMessage - 加载消息
   * @param {Function} apiCall - API调用函数
   * @param {Function} successHandler - 成功处理函数
   * @param {Object} errorEventData - 错误事件数据
   * @returns {Promise<Object>} 操作结果
   */
  async _handleApiOperation(operation, loadingMessage, apiCall, successHandler, errorEventData = {}) {
    try {
      this.uiManager.showLoading(loadingMessage);
      const response = await apiCall();

      if (response.success) {
        this.uiManager.hideLoading();
        const result = await successHandler(response);
        return result;
      }
      throw new Error(response.message || `${operation}失败`);

    } catch (error) {
      this.uiManager.hideLoading();
      this.uiManager.showNotification(error.message, 'error');

      this.dispatchAuthEvent(`${operation}Error`, {
        error: error.message,
        ...errorEventData
      });

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 通用存储错误处理器
   * @param {Error} error - 错误对象
   * @param {string} context - 操作上下文
   * @param {string} action - 操作动作
   */
  _handleStorageError(error, context, action = 'storageOperation') {
    if (window.errorUtils) {
      window.errorUtils.handleError(error, {
        context,
        action,
        severity: 'error'
      });
    }

    if (window.errorHandler) {
      window.errorHandler.handleStorageError(error, context);
    }
  }

  /**
     * 用户注册
     * @param {Object} userData - 用户注册数据
     * @param {string} userData.username - 用户名
     * @param {string} userData.email - 邮箱
     * @param {string} userData.password - 密码
     * @param {string} userData.confirmPassword - 确认密码
     * @param {boolean} userData.agreeTerms - 是否同意服务条款
     * @returns {Promise<Object>} 注册结果
     */
  async register(userData) {
    return this._handleApiOperation(
      'register',
      '正在注册...',
      async () => {
        // 使用新的注册管理器处理完整注册流程
        if (!this.registrationManager) {
          throw new Error('注册管理器未初始化');
        }

        return await this.registrationManager.register(userData);
      },
      async (response) => {
        // 显示成功通知
        const message = response.requiresEmailVerification
          ? '注册成功！请查收验证邮件。'
          : '注册成功！';

        this.uiManager.showNotification(message, 'success');

        // 触发注册成功事件
        this.dispatchAuthEvent('registerSuccess', {
          user: response.user,
          requiresVerification: response.requiresEmailVerification,
          registrationId: response.registrationId
        });

        return response;
      },
      { email: userData.email }
    );
  }

  /**
     * 用户登录
     * @param {Object} credentials - 登录凭据
     * @param {string} credentials.email - 邮箱或用户名
     * @param {string} credentials.password - 密码
     * @param {boolean} credentials.rememberMe - 是否记住登录状态
     * @returns {Promise<Object>} 登录结果
     */
  async login(credentials) {
    return this._handleApiOperation(
      'login',
      '正在登录...',
      async () => {
        // 输入验证
        const validationResult = this.inputValidator.validateLoginForm({
          email: credentials.email,
          password: credentials.password
        });

        if (!validationResult.isValid) {
          throw new Error(validationResult.errors.join(', '));
        }

        // 检查账户锁定状态
        const lockoutStatus = await this.accountLockout.checkLockoutStatus(credentials.email);
        if (lockoutStatus.isLocked) {
          throw new Error(`账户已被锁定，剩余时间: ${lockoutStatus.remainingTime}分钟`);
        }

        // 密码安全验证
        const passwordHash = await this.passwordSecurity.hashPassword(credentials.password);

        // 调用登录API
        const loginData = {
          email: credentials.email.trim().toLowerCase(),
          passwordHash,
          rememberMe: credentials.rememberMe,
          deviceInfo: await this.sessionManager.getDeviceInfo()
        };

        return await this.apiManager.login(loginData);
      },
      async (_response) => {
        // 重置失败计数
        await this.accountLockout.resetFailureCount(credentials.email);

        // 创建会话
        const sessionData = await this.sessionManager.createSession({
          user: _response.user,
          token: _response.token,
          refreshToken: _response.refreshToken,
          rememberMe: credentials.rememberMe
        });

        // 更新认证状态
        this.currentUser = _response.user;
        this.isAuthenticated = true;

        // 更新UI状态
        this.uiManager.updateAuthenticationState(true, this.currentUser);
        this.uiManager.showNotification('登录成功', 'success');

        // 触发登录成功事件
        this.dispatchAuthEvent('loginSuccess', {
          user: this.currentUser,
          sessionId: sessionData.sessionId
        });

        return {
          success: true,
          user: this.currentUser,
          message: '登录成功'
        };
      },
      { email: credentials.email }
    ).catch(async (result) => {
      // 记录失败尝试
      if (!result.success) {
        await this.accountLockout.recordFailureAttempt(credentials.email);
      }
      return result;
    });
  }

  /**
     * 用户登出
     * @param {string} reason - 登出原因（可选）
     * @returns {Promise<Object>} 登出结果
     */
  async logout(reason = '用户主动登出') {
    return this._handleApiOperation(
      'logout',
      '正在退出...',
      async () => {
        // 获取当前会话信息
        const currentSession = await this.sessionManager.getCurrentSession();

        // 调用登出API（如果有有效会话）
        if (currentSession && currentSession.sessionId) {
          return await this.apiManager.logout({
            sessionId: currentSession.sessionId,
            reason
          });
        }

        // 如果没有有效会话，返回成功
        return { success: true, message: '本地登出成功' };
      },
      async (_response) => {
        // 销毁会话
        await this.sessionManager.destroySession();

        // 清理认证状态
        const previousUser = this.currentUser;
        this.currentUser = null;
        this.isAuthenticated = false;

        // 清理缓存
        if (this.apiManager.clearCache) {
          this.apiManager.clearCache();
        }

        // 更新UI状态
        this.uiManager.updateAuthenticationState(false);
        this.uiManager.showNotification('已安全退出登录', 'info');

        // 触发登出事件
        this.dispatchAuthEvent('logoutSuccess', {
          previousUser,
          reason,
          timestamp: new Date().toISOString()
        });

        return {
          success: true,
          message: '已安全退出登录'
        };
      },
      { reason }
    );
  }

  /**
     * 检查用户是否已登录
     * @returns {boolean} 是否已登录
     */
  isLoggedIn() {
    const session = this.getSession();
    if (!session || !session.token || !session.user) {
      return false;
    }

    // 检查会话是否过期
    if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
      this.clearSession();
      return false;
    }

    return true;
  }

  /**
     * 获取当前用户信息
     * @returns {Object|null} 用户信息
     */
  getCurrentUser() {
    if (!this.isLoggedIn()) {
      return null;
    }

    const session = this.getSession();
    return session ? session.user : null;
  }

  /**
     * 获取认证令牌
     * @returns {string|null} 认证令牌
     */
  getAuthToken() {
    if (!this.isLoggedIn()) {
      return null;
    }

    const session = this.getSession();
    return session ? session.token : null;
  }

  /**
     * 创建用户会话
     * @param {Object} user - 用户信息
     * @param {string} token - 认证令牌
     * @param {boolean} rememberMe - 是否长期保存
     */
  async createSession(user, token, rememberMe = false) {
    const sessionData = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || null,
        role: user.role || 'user'
      },
      token: token,
      createdAt: new Date().toISOString(),
      expiresAt: rememberMe
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30天
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24小时
      rememberMe: rememberMe
    };

    try {
      this.storage.setItem(this.sessionKey, JSON.stringify(sessionData));
      this.storage.setItem(this.userKey, JSON.stringify(sessionData.user));
      this.storage.setItem(this.tokenKey, token);
    } catch (error) {
      this._handleStorageError(error, '创建用户会话', 'createSession');
      throw new Error('无法保存登录状态');
    }
  }

  /**
     * 获取会话数据
     * @returns {Object|null} 会话数据
     */
  getSession() {
    try {
      const sessionData = this.storage.getItem(this.sessionKey);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      this._handleStorageError(error, '获取会话数据', 'getSession');
      this.clearSession();
      return null;
    }
  }

  /**
     * 清除会话数据
     */
  clearSession() {
    try {
      this.storage.removeItem(this.sessionKey);
      this.storage.removeItem(this.userKey);
      this.storage.removeItem(this.tokenKey);
    } catch (error) {
      this._handleStorageError(error, '清除会话数据', 'clearSession');
    }
  }

  /**
     * 检查现有会话
     */
  async checkExistingSession() {
    try {
      const sessionData = await this.sessionManager.getCurrentSession();
      if (sessionData && sessionData.isValid) {
        this.currentUser = sessionData.user;
        this.isAuthenticated = true;

        // 验证会话安全性
        const isSecure = await this.sessionManager.validateSessionSecurity(sessionData);
        if (!isSecure) {
          await this.logout('安全验证失败');
          return;
        }

        // 更新UI状态
        this.uiManager.updateAuthenticationState(true, this.currentUser);

        // 触发会话恢复事件
        this.dispatchAuthEvent('sessionRestored', {
          user: this.currentUser,
          sessionId: sessionData.sessionId
        });

      } else {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.uiManager.updateAuthenticationState(false);
      }
    } catch (error) {
      this._handleStorageError(error, '检查现有会话', 'checkExistingSession');
      await this.logout('会话检查失败');
    }
  }

  /**
     * 处理会话过期事件
     */
  async handleSessionExpired() {
    console.log('会话已过期');
    await this.logout('会话过期');
    this.uiManager.showModal('sessionExpired', {
      title: '会话过期',
      message: '您的登录会话已过期，请重新登录',
      actions: [{
        text: '重新登录',
        action: () => this.uiManager.showLoginForm()
      }]
    });
  }

  /**
     * 处理令牌刷新事件
     * @param {Object} tokenData - 新的令牌数据
     */
  async handleTokenRefreshed(tokenData) {
    console.log('令牌已刷新');
    this.dispatchAuthEvent('tokenRefreshed', tokenData);
  }

  /**
     * 处理账户锁定事件
     * @param {Object} lockoutData - 锁定信息
     */
  async handleAccountLocked(lockoutData) {
    console.log('账户已被锁定:', lockoutData);
    await this.logout('账户被锁定');
    this.uiManager.showModal('accountLocked', {
      title: '账户已锁定',
      message: `您的账户因多次登录失败已被锁定，剩余时间: ${lockoutData.remainingTime}分钟`,
      actions: [{
        text: '确定',
        action: () => this.uiManager.hideModal()
      }]
    });
  }

  /**
     * 处理密码过期事件
     */
  async handlePasswordExpired() {
    console.log('密码已过期');
    this.uiManager.showModal('passwordExpired', {
      title: '密码已过期',
      message: '您的密码已过期，请更新密码',
      actions: [{
        text: '更新密码',
        action: () => this.uiManager.showPasswordChangeForm()
      }]
    });
  }

  /**
     * 处理页面卸载事件
     */
  handlePageUnload() {
    // 清理资源
    if (this.sessionManager) {
      this.sessionManager.cleanup();
    }
  }

  /**
     * 处理存储变化事件（跨标签页同步）
     * @param {StorageEvent} event - 存储事件
     */
  async handleStorageChange(event) {
    if (event.key === this.sessionKey) {
      if (event.newValue) {
        // 其他标签页登录了
        try {
          const sessionData = JSON.parse(event.newValue);
          if (sessionData && sessionData.isValid) {
            this.currentUser = sessionData.user;
            this.isAuthenticated = true;
            this.uiManager.updateAuthenticationState(true, this.currentUser);

            this.dispatchAuthEvent('sessionSynced', {
              source: 'storage',
              user: this.currentUser
            });
          }
        } catch (error) {
          console.error('解析存储会话数据失败:', error);
        }
      } else {
        // 其他标签页登出了
        if (this.isAuthenticated) {
          this.currentUser = null;
          this.isAuthenticated = false;
          this.uiManager.updateAuthenticationState(false);

          this.dispatchAuthEvent('sessionSynced', {
            source: 'storage',
            action: 'logout'
          });
        }
      }
    }
  }

  /**
     * 分发认证事件
     * @param {string} eventType - 事件类型
     * @param {Object} eventData - 事件数据
     */
  dispatchAuthEvent(eventType, eventData = {}) {
    const event = new CustomEvent(`auth:${eventType}`, {
      detail: {
        timestamp: new Date().toISOString(),
        ...eventData
      }
    });
    document.dispatchEvent(event);

    // 同时触发旧版本兼容事件
    this.dispatchEvent(`user:${eventType}`, eventData);
  }

  /**
     * 添加事件监听器
     * @param {string} eventType - 事件类型
     * @param {Function} callback - 回调函数
     */
  addEventListener(eventType, callback) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType).add(callback);

    // 添加到DOM事件监听
    document.addEventListener(`auth:${eventType}`, callback);
  }

  /**
     * 移除事件监听器
     * @param {string} eventType - 事件类型
     * @param {Function} callback - 回调函数
     */
  removeEventListener(eventType, callback) {
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).delete(callback);
    }

    // 从DOM事件监听中移除
    document.removeEventListener(`auth:${eventType}`, callback);
  }

  /**
     * 获取认证状态
     * @returns {Object} 认证状态信息
     */
  getAuthStatus() {
    return {
      isAuthenticated: this.isAuthenticated,
      user: this.currentUser,
      sessionValid: this.sessionManager ? this.sessionManager.isSessionValid() : false,
      lastActivity: this.sessionManager ? this.sessionManager.getLastActivity() : null
    };
  }

  /**
     * 刷新认证令牌
     * @returns {Promise<Object>} 刷新结果
     */
  async refreshToken() {
    try {
      if (!this.isAuthenticated) {
        throw new Error('用户未登录');
      }

      const currentSession = await this.sessionManager.getCurrentSession();
      if (!currentSession || !currentSession.refreshToken) {
        throw new Error('无效的刷新令牌');
      }

      const response = await this.apiManager.refreshToken({
        refreshToken: currentSession.refreshToken
      });

      if (response.success) {
        // 更新会话中的令牌
        await this.sessionManager.updateSession({
          token: response.token,
          refreshToken: response.refreshToken || currentSession.refreshToken
        });

        this.dispatchAuthEvent('tokenRefreshed', {
          newToken: response.token
        });

        return {
          success: true,
          token: response.token
        };
      }
      throw new Error(response.message || '令牌刷新失败');


    } catch (error) {
      console.error('刷新令牌失败:', error);

      // 令牌刷新失败，可能需要重新登录
      this.dispatchAuthEvent('tokenRefreshFailed', {
        error: error.message
      });

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
     * 验证当前会话
     * @returns {Promise<boolean>} 会话是否有效
     */
  async validateSession() {
    try {
      if (!this.isAuthenticated) {
        return false;
      }

      const sessionData = await this.sessionManager.getCurrentSession();
      if (!sessionData) {
        return false;
      }

      // 验证会话是否过期
      if (sessionData.expiresAt && new Date() > new Date(sessionData.expiresAt)) {
        await this.logout('会话过期');
        return false;
      }

      // 验证令牌有效性（可选的API调用）
      if (this.config.securityConfig.enableSessionValidation) {
        const validationResult = await this.apiManager.validateToken({
          token: sessionData.token
        });

        if (!validationResult.isValid) {
          await this.logout('令牌无效');
          return false;
        }
      }

      return true;

    } catch (error) {
      console.error('会话验证失败:', error);
      await this.logout('会话验证失败');
      return false;
    }
  }

  /**
     * 更新用户信息
     * @param {Object} userUpdates - 用户更新数据
     * @returns {Promise<Object>} 更新结果
     */
  async updateUserProfile(userUpdates) {
    try {
      if (!this.isAuthenticated) {
        throw new Error('用户未登录');
      }

      // 输入验证
      const validationResult = this.inputValidator.validateProfileUpdate(userUpdates);
      if (!validationResult.isValid) {
        throw new Error(validationResult.errors.join(', '));
      }

      // 调用更新API
      const response = await this.apiManager.updateProfile({
        userId: this.currentUser.id,
        updates: userUpdates
      });

      if (response.success) {
        // 更新本地用户信息
        this.currentUser = { ...this.currentUser, ...response.user };

        // 更新会话中的用户信息
        await this.sessionManager.updateSession({
          user: this.currentUser
        });

        // 更新UI
        this.uiManager.updateAuthenticationState(true, this.currentUser);

        this.dispatchAuthEvent('profileUpdated', {
          user: this.currentUser,
          updates: userUpdates
        });

        return {
          success: true,
          user: this.currentUser
        };
      }
      throw new Error(response.message || '更新失败');


    } catch (error) {
      console.error('更新用户信息失败:', error);

      this.dispatchAuthEvent('profileUpdateError', {
        error: error.message,
        updates: userUpdates
      });

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
     * 修改密码
     * @param {Object} passwordData - 密码数据
     * @param {string} passwordData.currentPassword - 当前密码
     * @param {string} passwordData.newPassword - 新密码
     * @param {string} passwordData.confirmPassword - 确认新密码
     * @returns {Promise<Object>} 修改结果
     */
  async changePassword(passwordData) {
    try {
      if (!this.isAuthenticated) {
        throw new Error('用户未登录');
      }

      // 输入验证
      const validationResult = this.inputValidator.validatePasswordChange(passwordData);
      if (!validationResult.isValid) {
        throw new Error(validationResult.errors.join(', '));
      }

      // 密码策略验证
      const passwordValidation = this.passwordPolicy.validatePassword(passwordData.newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(`新密码不符合安全要求: ${passwordValidation.errors.join(', ')}`);
      }

      // 密码加密
      const currentPasswordHash = await this.passwordSecurity.hashPassword(passwordData.currentPassword);
      const newPasswordHash = await this.passwordSecurity.hashPassword(passwordData.newPassword);

      // 调用修改密码API
      const response = await this.apiManager.changePassword({
        userId: this.currentUser.id,
        currentPasswordHash,
        newPasswordHash
      });

      if (response.success) {
        this.uiManager.showNotification('密码修改成功', 'success');

        this.dispatchAuthEvent('passwordChanged', {
          userId: this.currentUser.id
        });

        return {
          success: true,
          message: '密码修改成功'
        };
      }
      throw new Error(response.message || '密码修改失败');


    } catch (error) {
      console.error('修改密码失败:', error);

      this.uiManager.showNotification(error.message, 'error');

      this.dispatchAuthEvent('passwordChangeError', {
        error: error.message
      });

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
     * 销毁认证管理器
     */
  destroy() {
    try {
      // 清理事件监听器
      this.eventListeners.forEach((callbacks, eventType) => {
        callbacks.forEach(callback => {
          this.removeEventListener(eventType, callback);
        });
      });
      this.eventListeners.clear();

      // 清理会话
      if (this.sessionManager) {
        this.sessionManager.destroy();
      }

      // 清理UI管理器
      if (this.uiManager) {
        this.uiManager.destroy();
      }

      // 清理API管理器
      if (this.apiManager) {
        this.apiManager.destroy();
      }

      // 重置状态
      this.currentUser = null;
      this.isAuthenticated = false;
      this.sessionData = null;

      console.log('认证管理器已销毁');

    } catch (error) {
      console.error('销毁认证管理器失败:', error);
    }
  }

  /**
     * 清理会话（页面卸载时）
     */
  cleanupSession() {
    try {
      const session = this.getSession();
      if (session && !session.rememberMe) {
        // 如果不是"记住我"模式，清除会话
        this.clearSession();
      }
    } catch (error) {
      this._handleStorageError(error, '清理会话', 'cleanupSession');
    }
  }

  /**
     * 验证注册数据
     * @param {Object} userData - 用户数据
     * @returns {Object} 验证结果
     */
  validateRegistrationData(userData) {
    if (!userData.username || userData.username.trim().length < 3) {
      return { isValid: false, message: '用户名至少需要3个字符' };
    }

    if (!userData.email || !this.isValidEmail(userData.email)) {
      return { isValid: false, message: '请输入有效的邮箱地址' };
    }

    if (!userData.password || userData.password.length < 6) {
      return { isValid: false, message: '密码至少需要6个字符' };
    }

    if (userData.password !== userData.confirmPassword) {
      return { isValid: false, message: '两次输入的密码不一致' };
    }

    return { isValid: true };
  }

  /**
     * 验证登录数据
     * @param {Object} credentials - 登录凭据
     * @returns {Object} 验证结果
     */
  validateLoginData(credentials) {
    if (!credentials.email || credentials.email.trim().length === 0) {
      return { isValid: false, message: '请输入邮箱或用户名' };
    }

    if (!credentials.password || credentials.password.length === 0) {
      return { isValid: false, message: '请输入密码' };
    }

    return { isValid: true };
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

  /**
     * 密码哈希处理（简化版，实际项目应使用更安全的方法）
     * @param {string} password - 原始密码
     * @returns {Promise<string>} 哈希后的密码
     */
  async hashPassword(password) {
    // 简化的哈希实现，实际项目中应使用bcrypt等安全库
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt_key_2025');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
     * 模拟API调用（实际项目中应替换为真实的API调用）
     * @param {string} endpoint - API端点
     * @param {Object} options - 请求选项
     * @returns {Promise<Object>} API响应
     */
  async simulateApiCall(endpoint, options = {}) {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, API_DELAY_MIN + Math.random() * API_DELAY_MAX));

    // 模拟不同的API响应
    switch (endpoint) {
    case '/auth/register':
      return this.simulateRegisterResponse(options.body);
    case '/auth/login':
      return this.simulateLoginResponse(options.body);
    case '/auth/logout':
      return { success: true, message: '登出成功' };
    default:
      throw new Error('未知的API端点');
    }
  }

  /**
     * 模拟注册API响应
     * @param {Object} userData - 用户数据
     * @returns {Object} 模拟响应
     */
  simulateRegisterResponse(userData) {
    // 模拟用户已存在的情况
    const existingUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
    const userExists = existingUsers.some(user =>
      user.email === userData.email || user.username === userData.username
    );

    if (userExists) {
      return {
        success: false,
        message: '用户名或邮箱已存在'
      };
    }

    // 创建新用户
    const newUser = {
      id: Date.now().toString(),
      username: userData.username,
      email: userData.email,
      password: userData.password,
      createdAt: userData.createdAt,
      role: 'user'
    };

    // 保存到本地存储（模拟数据库）
    existingUsers.push(newUser);
    localStorage.setItem('registered_users', JSON.stringify(existingUsers));

    return {
      success: true,
      message: '注册成功',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    };
  }

  /**
     * 模拟登录API响应
     * @param {Object} credentials - 登录凭据
     * @returns {Object} 模拟响应
     */
  simulateLoginResponse(credentials) {
    const existingUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
    const user = existingUsers.find(registeredUser =>
      registeredUser.email === credentials.email && registeredUser.password === credentials.password
    );

    if (!user) {
      return {
        success: false,
        message: '邮箱或密码错误'
      };
    }

    // 生成模拟令牌
    // 使用安全的随机数生成
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const randomString = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    const token = 'mock_token_' + Date.now() + '_' + randomString;

    return {
      success: true,
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token: token
    };
  }

  /**
     * 分发事件
     * @param {string} eventType - 事件类型
     * @param {Object} eventData - 事件数据
     */
  dispatchEvent(eventType, eventData) {
    const event = new CustomEvent(eventType, {
      detail: eventData
    });
    this.eventBus.dispatchEvent(event);
  }

  /**
     * 获取设备信息
     * @returns {Object} 设备信息
     */
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: new Date().toISOString()
    };
  }

  /**
     * 生成会话ID
     * @returns {string} 会话ID
     */
  generateSessionId() {
    return Utils.generateSessionId();
  }

  /**
     * 格式化错误消息
     * @param {Error|string} error - 错误对象或消息
     * @returns {string} 格式化后的错误消息
     */
  formatErrorMessage(error) {
    if (typeof error === 'string') {
      return error;
    }

    if (error && error.message) {
      return error.message;
    }

    return '未知错误';
  }

  /**
     * 检查网络连接状态
     * @returns {boolean} 是否在线
     */
  isOnline() {
    return navigator.onLine;
  }

  /**
     * 获取认证配置
     * @returns {Object} 当前配置
     */
  getConfig() {
    return { ...this.config };
  }

  /**
     * 更新认证配置
     * @param {Object} newConfig - 新配置
     */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };

    // 重新初始化受影响的模块
    if (newConfig.securityConfig) {
      this.passwordPolicy.updateConfig(newConfig.securityConfig);
    }

    if (newConfig.sessionConfig) {
      this.sessionManager.updateConfig(newConfig.sessionConfig);
    }

    if (newConfig.apiConfig) {
      this.apiManager.updateConfig(newConfig.apiConfig);
    }
  }

  /**
     * 获取调试信息
     * @returns {Object} 调试信息
     */
  getDebugInfo() {
    return {
      version: this.version,
      isAuthenticated: this.isAuthenticated,
      currentUser: this.currentUser ? {
        id: this.currentUser.id,
        username: this.currentUser.username,
        email: this.currentUser.email
      } : null,
      sessionValid: this.sessionManager ? this.sessionManager.isSessionValid() : false,
      lastActivity: this.sessionManager ? this.sessionManager.getLastActivity() : null,
      config: this.getConfig(),
      deviceInfo: this.getDeviceInfo(),
      timestamp: new Date().toISOString()
    };
  }
}

// 导出AuthManager类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthManager;
} else if (typeof window !== 'undefined') {
  window.AuthManager = AuthManager;
}

// 自动初始化（如果在浏览器环境中）
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // 等待DOM加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (!window.authManager) {
        window.authManager = new AuthManager();
      }
    });
  } else {
    // DOM已经加载完成
    if (!window.authManager) {
      window.authManager = new AuthManager();
    }
  }
}
