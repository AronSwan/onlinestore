/**
 * AuthManager - 认证管理主控制器
 * 统一管理所有认证相关功能
 */
class AuthManager {
  constructor() {
    this.isInitialized = false;
    this.currentUser = null;
    this.sessionManager = null;
    this.inputValidator = null;
    this.passwordSecurity = null;
    this.uiInteraction = null;
    this.apiIntegration = null;

    this.init();
  }

  /**
     * 初始化认证管理器
     */
  async init() {
    try {
      // 等待所有依赖模块加载完成
      await this.waitForDependencies();

      // 初始化各个模块
      this.sessionManager = new SessionManager();
      this.inputValidator = new InputValidator();
      this.passwordSecurity = new PasswordSecurity();
      this.uiInteraction = new UIInteraction();
      this.apiIntegration = new APIIntegration();

      // 检查现有会话
      await this.checkExistingSession();

      this.isInitialized = true;
      console.log('AuthManager initialized successfully');

    } catch (error) {
      console.error('Failed to initialize AuthManager:', error);
      this.handleInitializationError(error);
    }
  }

  /**
     * 等待依赖模块加载
     */
  async waitForDependencies() {
    const maxWaitTime = 5000; // 5秒超时
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      if (typeof SessionManager !== 'undefined' &&
                typeof InputValidator !== 'undefined' &&
                typeof PasswordSecurity !== 'undefined' &&
                typeof UIInteraction !== 'undefined' &&
                typeof APIIntegration !== 'undefined') {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('Dependencies not loaded within timeout period');
  }

  /**
     * 检查现有会话
     */
  async checkExistingSession() {
    try {
      const sessionData = this.sessionManager.getCurrentSession();
      if (sessionData && sessionData.isValid) {
        this.currentUser = sessionData.user;
        this.uiInteraction.updateUIForLoggedInUser(this.currentUser);
      }
    } catch (error) {
      console.warn('Failed to check existing session:', error);
    }
  }

  /**
     * 用户登录
     */
  async login(credentials) {
    try {
      // 验证输入
      const validationResult = this.inputValidator.validateLoginCredentials(credentials);
      if (!validationResult.isValid) {
        throw new Error(validationResult.message);
      }

      // 显示加载状态
      this.uiInteraction.showLoadingState('正在登录...');

      // 调用API进行认证
      const authResult = await this.apiIntegration.authenticate(credentials);

      if (authResult.success) {
        // 创建会话
        await this.sessionManager.createSession(authResult.user, authResult.token);
        this.currentUser = authResult.user;

        // 更新UI
        this.uiInteraction.updateUIForLoggedInUser(this.currentUser);
        this.uiInteraction.showSuccessMessage('登录成功！');

        return { success: true, user: this.currentUser };
      }
      throw new Error(authResult.message || '登录失败');


    } catch (error) {
      this.uiInteraction.showErrorMessage(error.message);
      return { success: false, error: error.message };
    } finally {
      this.uiInteraction.hideLoadingState();
    }
  }

  /**
     * 用户注册
     */
  async register(userData) {
    try {
      // 验证输入
      const validationResult = this.inputValidator.validateRegistrationForm(userData);
      if (!validationResult.isValid) {
        const errorMessage = validationResult.errors && validationResult.errors.length > 0
          ? validationResult.errors[0]
          : '输入验证失败';
        throw new Error(errorMessage);
      }

      // 验证密码强度
      const passwordCheck = this.passwordSecurity.validatePasswordStrength(userData.password);
      if (!passwordCheck.isValid) {
        throw new Error(passwordCheck.message);
      }

      // 显示加载状态
      this.uiInteraction.showLoadingState('正在注册...');

      // 加密密码
      const hashedPassword = await this.passwordSecurity.hashPassword(userData.password);
      userData.password = hashedPassword;

      // 调用API进行注册
      const registerResult = await this.apiIntegration.register(userData);

      if (registerResult.success) {
        this.uiInteraction.showSuccessMessage('注册成功！请登录您的账户。');
        return { success: true };
      }
      throw new Error(registerResult.message || '注册失败');


    } catch (error) {
      this.uiInteraction.showErrorMessage(error.message);
      return { success: false, error: error.message };
    } finally {
      this.uiInteraction.hideLoadingState();
    }
  }

  /**
     * 用户登出
     */
  async logout() {
    try {
      // 调用API登出
      await this.apiIntegration.logout();

      // 清除会话
      this.sessionManager.clearSession();
      this.currentUser = null;

      // 更新UI
      this.uiInteraction.updateUIForLoggedOutUser();
      this.uiInteraction.showSuccessMessage('已成功登出');

      return { success: true };

    } catch (error) {
      console.error('Logout error:', error);
      // 即使API调用失败，也要清除本地会话
      this.sessionManager.clearSession();
      this.currentUser = null;
      this.uiInteraction.updateUIForLoggedOutUser();

      return { success: true }; // 本地登出总是成功的
    }
  }

  /**
     * 修改密码
     */
  async changePassword(oldPassword, newPassword) {
    try {
      if (!this.currentUser) {
        throw new Error('请先登录');
      }

      // 验证新密码强度
      const passwordCheck = this.passwordSecurity.validatePasswordStrength(newPassword);
      if (!passwordCheck.isValid) {
        throw new Error(passwordCheck.message);
      }

      // 显示加载状态
      this.uiInteraction.showLoadingState('正在修改密码...');

      // 加密新密码
      const hashedNewPassword = await this.passwordSecurity.hashPassword(newPassword);

      // 调用API修改密码
      const result = await this.apiIntegration.changePassword({
        oldPassword,
        newPassword: hashedNewPassword
      });

      if (result.success) {
        this.uiInteraction.showSuccessMessage('密码修改成功！');
        return { success: true };
      }
      throw new Error(result.message || '密码修改失败');


    } catch (error) {
      this.uiInteraction.showErrorMessage(error.message);
      return { success: false, error: error.message };
    } finally {
      this.uiInteraction.hideLoadingState();
    }
  }

  /**
     * 获取当前用户信息
     */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
     * 检查用户是否已登录
     */
  isLoggedIn() {
    return this.currentUser !== null && this.sessionManager.isSessionValid();
  }

  /**
     * 处理初始化错误
     */
  handleInitializationError(error) {
    console.error('AuthManager initialization failed:', error);

    // 显示用户友好的错误信息
    if (typeof showNotification === 'function') {
      showNotification('认证系统初始化失败，请刷新页面重试', 'error');
    }

    // 可以添加重试逻辑
    setTimeout(() => {
      if (!this.isInitialized) {
        console.log('Retrying AuthManager initialization...');
        this.init();
      }
    }, 3000);
  }

  /**
     * 销毁认证管理器
     */
  destroy() {
    if (this.sessionManager) {
      this.sessionManager.destroy();
    }

    this.currentUser = null;
    this.isInitialized = false;

    console.log('AuthManager destroyed');
  }
}

// 创建全局实例
window.authManager = new AuthManager();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthManager;
}
