/**
 * AuthManager - 重构后的认证管理器主类
 * 职责: 作为门面模式协调各专职类，提供统一的认证接口
 * 符合单一职责原则(SRP)和依赖倒置原则(DIP)
 */

// 导入专职类
const SessionManager = require('./core/SessionManager');
const AuthAPI = require('./api/AuthAPI');
const PasswordSecurity = require('./security/PasswordSecurity');
const AuthUI = require('./ui/AuthUI');

class AuthManager {
  constructor() {
    // 初始化状态
    this.isInitialized = false;
    this.initializationPromise = null;
    this.dependencies = {
      sessionManager: null,
      authAPI: null,
      passwordSecurity: null,
      authUI: null
    };

    // 配置选项
    this.config = {
      sessionTimeout: 30 * 60 * 1000, // 30分钟
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15分钟
      passwordMinLength: 8,
      enableAutoLogin: true,
      apiBaseUrl: '/api/auth'
    };

    // 事件监听器
    this.eventListeners = new Map();

    console.log('AuthManager initialized');
  }

  /**
   * 初始化认证管理器
   * @param {Object} options - 配置选项
   * @returns {Promise<boolean>} 初始化结果
   */
  async init(options = {}) {
    if (this.isInitialized) {
      return true;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization(options);
    return this.initializationPromise;
  }

  /**
   * 执行初始化过程
   * @param {Object} options - 配置选项
   * @returns {Promise<boolean>} 初始化结果
   * @private
   */
  async _performInitialization(options) {
    try {
      // 合并配置
      this.config = { ...this.config, ...options };

      // 初始化专职类
      await this._initializeDependencies();

      // 等待依赖就绪
      await this._waitForDependencies();

      // 检查现有会话
      if (this.config.enableAutoLogin) {
        await this._checkExistingSession();
      }

      this.isInitialized = true;
      this._emitEvent('initialized', { success: true });

      console.log('AuthManager initialization completed');
      return true;

    } catch (error) {
      console.error('AuthManager initialization failed:', error);
      this._handleInitializationError(error);
      return false;
    }
  }

  /**
   * 初始化依赖的专职类
   * @private
   */
  async _initializeDependencies() {
    try {
      // 初始化会话管理器
      this.dependencies.sessionManager = new SessionManager({
        timeout: this.config.sessionTimeout
      });

      // 初始化API通信类
      this.dependencies.authAPI = new AuthAPI({
        baseUrl: this.config.apiBaseUrl,
        timeout: 10000
      });

      // 初始化密码安全类
      this.dependencies.passwordSecurity = new PasswordSecurity({
        minLength: this.config.passwordMinLength,
        requireSpecialChars: true
      });

      // 初始化UI管理类
      this.dependencies.authUI = new AuthUI();

      console.log('All dependencies initialized successfully');

    } catch (error) {
      throw new Error(`Failed to initialize dependencies: ${error.message}`);
    }
  }

  /**
   * 等待依赖就绪
   * @private
   */
  async _waitForDependencies() {
    const maxWaitTime = 5000; // 5秒超时
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const allReady = Object.values(this.dependencies).every(dep => dep !== null);
      if (allReady) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('Dependencies initialization timeout');
  }

  /**
   * 检查现有会话
   * @private
   */
  async _checkExistingSession() {
    try {
      const session = this.dependencies.sessionManager.getCurrentSession();
      if (session && this.dependencies.sessionManager.isSessionValid(session)) {
        const user = await this.dependencies.authAPI.validateSession(session.token);
        if (user) {
          this.dependencies.authUI.updateUIForLoggedInUser(user);
          this._emitEvent('autoLoginSuccess', { user });
          console.log('Auto-login successful for user:', user.username);
        }
      }
    } catch (error) {
      console.warn('Auto-login failed:', error.message);
      this.dependencies.sessionManager.clearSession();
    }
  }

  /**
   * 用户登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @param {boolean} rememberMe - 是否记住登录状态
   * @returns {Promise<Object>} 登录结果
   */
  async login(username, password, rememberMe = false) {
    if (!this.isInitialized) {
      throw new Error('AuthManager not initialized');
    }

    try {
      // 显示加载状态
      this.dependencies.authUI.showLoadingState('正在登录...');

      // 验证输入
      this._validateLoginInput(username, password);

      // 检查登录尝试限制
      this._checkLoginAttempts(username);

      // 调用API进行认证
      const authResult = await this.dependencies.authAPI.authenticate(username, password);

      if (authResult.success) {
        // 创建会话
        const session = this.dependencies.sessionManager.createSession(
          authResult.user,
          authResult.token,
          rememberMe
        );

        // 更新UI
        this.dependencies.authUI.updateUIForLoggedInUser(authResult.user);
        this.dependencies.authUI.showSuccessMessage('登录成功');

        // 重置登录尝试计数
        this._resetLoginAttempts(username);

        // 触发事件
        this._emitEvent('loginSuccess', { user: authResult.user, session });

        console.log('Login successful for user:', username);
        return { success: true, user: authResult.user, session };

      }
      throw new Error(authResult.message || '登录失败');


    } catch (error) {
      // 记录失败尝试
      this._recordFailedLoginAttempt(username);

      // 显示错误消息
      this.dependencies.authUI.showErrorMessage(error.message);

      // 触发事件
      this._emitEvent('loginFailed', { username, error: error.message });

      console.error('Login failed for user:', username, error.message);
      return { success: false, error: error.message };

    } finally {
      // 隐藏加载状态
      this.dependencies.authUI.hideLoadingState();
    }
  }

  /**
   * 用户注册
   * @param {Object} userData - 用户数据
   * @returns {Promise<Object>} 注册结果
   */
  async register(userData) {
    if (!this.isInitialized) {
      throw new Error('AuthManager not initialized');
    }

    try {
      // 显示加载状态
      this.dependencies.authUI.showLoadingState('正在注册...');

      // 验证用户数据
      this._validateRegistrationData(userData);

      // 验证密码强度
      const passwordValidation = this.dependencies.passwordSecurity.validatePasswordStrength(userData.password);
      if (!passwordValidation.isValid) {
        throw new Error(`密码强度不足: ${passwordValidation.suggestions.join(', ')}`);
      }

      // 加密密码
      const hashedPassword = await this.dependencies.passwordSecurity.hashPassword(userData.password);

      // 调用API进行注册
      const registrationData = {
        ...userData,
        password: hashedPassword
      };

      const result = await this.dependencies.authAPI.register(registrationData);

      if (result.success) {
        // 显示成功消息
        this.dependencies.authUI.showSuccessMessage('注册成功，请登录');

        // 触发事件
        this._emitEvent('registrationSuccess', { user: result.user });

        console.log('Registration successful for user:', userData.username);
        return { success: true, user: result.user };

      }
      throw new Error(result.message || '注册失败');


    } catch (error) {
      // 显示错误消息
      this.dependencies.authUI.showErrorMessage(error.message);

      // 触发事件
      this._emitEvent('registrationFailed', { userData, error: error.message });

      console.error('Registration failed:', error.message);
      return { success: false, error: error.message };

    } finally {
      // 隐藏加载状态
      this.dependencies.authUI.hideLoadingState();
    }
  }

  /**
   * 用户登出
   * @returns {Promise<boolean>} 登出结果
   */
  async logout() {
    if (!this.isInitialized) {
      throw new Error('AuthManager not initialized');
    }

    try {
      // 显示加载状态
      this.dependencies.authUI.showLoadingState('正在登出...');

      // 获取当前会话
      const session = this.dependencies.sessionManager.getCurrentSession();

      if (session) {
        // 调用API登出
        await this.dependencies.authAPI.logout(session.token);
      }

      // 清除本地会话
      this.dependencies.sessionManager.clearSession();

      // 更新UI
      this.dependencies.authUI.updateUIForLoggedOutUser();
      this.dependencies.authUI.showInfoMessage('已成功登出');

      // 触发事件
      this._emitEvent('logoutSuccess', {});

      console.log('Logout successful');
      return true;

    } catch (error) {
      // 显示错误消息
      this.dependencies.authUI.showErrorMessage('登出失败: ' + error.message);

      // 触发事件
      this._emitEvent('logoutFailed', { error: error.message });

      console.error('Logout failed:', error.message);
      return false;

    } finally {
      // 隐藏加载状态
      this.dependencies.authUI.hideLoadingState();
    }
  }

  /**
   * 修改密码
   * @param {string} currentPassword - 当前密码
   * @param {string} newPassword - 新密码
   * @returns {Promise<boolean>} 修改结果
   */
  async changePassword(currentPassword, newPassword) {
    if (!this.isInitialized) {
      throw new Error('AuthManager not initialized');
    }

    try {
      // 显示加载状态
      this.dependencies.authUI.showLoadingState('正在修改密码...');

      // 验证新密码强度
      const passwordValidation = this.dependencies.passwordSecurity.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(`新密码强度不足: ${passwordValidation.suggestions.join(', ')}`);
      }

      // 获取当前会话
      const session = this.dependencies.sessionManager.getCurrentSession();
      if (!session) {
        throw new Error('用户未登录');
      }

      // 加密新密码
      const hashedNewPassword = await this.dependencies.passwordSecurity.hashPassword(newPassword);

      // 调用API修改密码
      const result = await this.dependencies.authAPI.changePassword(
        session.token,
        currentPassword,
        hashedNewPassword
      );

      if (result.success) {
        // 显示成功消息
        this.dependencies.authUI.showSuccessMessage('密码修改成功');

        // 触发事件
        this._emitEvent('passwordChangeSuccess', {});

        console.log('Password change successful');
        return true;

      }
      throw new Error(result.message || '密码修改失败');


    } catch (error) {
      // 显示错误消息
      this.dependencies.authUI.showErrorMessage(error.message);

      // 触发事件
      this._emitEvent('passwordChangeFailed', { error: error.message });

      console.error('Password change failed:', error.message);
      return false;

    } finally {
      // 隐藏加载状态
      this.dependencies.authUI.hideLoadingState();
    }
  }

  /**
   * 获取当前用户
   * @returns {Object|null} 当前用户信息
   */
  getCurrentUser() {
    if (!this.isInitialized) {
      return null;
    }

    const session = this.dependencies.sessionManager.getCurrentSession();
    return session ? session.user : null;
  }

  /**
   * 检查是否已登录
   * @returns {boolean} 登录状态
   */
  isLoggedIn() {
    if (!this.isInitialized) {
      return false;
    }

    const session = this.dependencies.sessionManager.getCurrentSession();
    return session && this.dependencies.sessionManager.isSessionValid(session);
  }

  /**
   * 验证登录输入
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @private
   */
  _validateLoginInput(username, password) {
    if (!username || !password) {
      throw new Error('用户名和密码不能为空');
    }

    if (username.length < 3) {
      throw new Error('用户名长度不能少于3个字符');
    }

    if (password.length < this.config.passwordMinLength) {
      throw new Error(`密码长度不能少于${this.config.passwordMinLength}个字符`);
    }
  }

  /**
   * 验证注册数据
   * @param {Object} userData - 用户数据
   * @private
   */
  _validateRegistrationData(userData) {
    const required = ['username', 'password', 'email'];

    for (const field of required) {
      if (!userData[field]) {
        throw new Error(`${field}不能为空`);
      }
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error('邮箱格式不正确');
    }
  }

  /**
   * 检查登录尝试限制
   * @param {string} username - 用户名
   * @private
   */
  _checkLoginAttempts(_username) {
    // 实现登录尝试限制逻辑
    // 这里可以集成到SessionManager或单独的安全模块
  }

  /**
   * 记录失败的登录尝试
   * @param {string} username - 用户名
   * @private
   */
  _recordFailedLoginAttempt(_username) {
    // 实现失败尝试记录逻辑
  }

  /**
   * 重置登录尝试计数
   * @param {string} username - 用户名
   * @private
   */
  _resetLoginAttempts(_username) {
    // 实现重置逻辑
  }

  /**
   * 处理初始化错误
   * @param {Error} error - 错误对象
   * @private
   */
  _handleInitializationError(error) {
    console.error('AuthManager initialization error:', error);
    this._emitEvent('initializationFailed', { error: error.message });
  }

  /**
   * 添加事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  addEventListener(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  removeEventListener(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {Object} data - 事件数据
   * @private
   */
  _emitEvent(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 销毁认证管理器
   */
  destroy() {
    // 销毁所有依赖
    Object.values(this.dependencies).forEach(dep => {
      if (dep && typeof dep.destroy === 'function') {
        dep.destroy();
      }
    });

    // 清除事件监听器
    this.eventListeners.clear();

    // 重置状态
    this.isInitialized = false;
    this.initializationPromise = null;

    console.log('AuthManager destroyed');
  }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthManager;
}

// 浏览器环境下的全局暴露
if (typeof window !== 'undefined') {
  window.AuthManager = AuthManager;
}
