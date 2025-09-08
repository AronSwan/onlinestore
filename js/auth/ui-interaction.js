/**
 * UI交互模块
 * 提供认证相关的用户界面交互功能
 * 基于 design/auth_ui_interaction.md 伪代码实现
 */

/**
 * 表单验证器
 * 提供表单和字段验证功能
 */
class FormValidator {
  constructor() {
    this.rules = {
      email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: '请输入有效的邮箱地址'
      },
      username: {
        pattern: /^[a-zA-Z0-9_]{3,20}$/,
        message: '用户名只能包含字母、数字和下划线，长度3-20位'
      },
      password: {
        minLength: 8,
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        message: '密码至少8位，包含大小写字母、数字和特殊字符'
      }
    };
  }

  /**
   * 验证整个表单
   * @param {HTMLFormElement} form - 表单元素
   * @returns {Object} 验证结果
   */
  validateForm(form) {
    const errors = [];
    const inputs = form.querySelectorAll('input[data-validate]');

    inputs.forEach(input => {
      const validationType = input.getAttribute('data-validate');
      const result = this.validateField(input, validationType);

      if (!result.isValid) {
        errors.push({
          field: input.name,
          message: result.message
        });
      }
    });

    // 特殊验证：确认密码
    const confirmPasswordField = form.querySelector('input[name="confirmPassword"]');
    if (confirmPasswordField) {
      const passwordField = form.querySelector('input[name="password"]');
      if (passwordField && confirmPasswordField.value !== passwordField.value) {
        errors.push({
          field: 'confirmPassword',
          message: '两次输入的密码不一致'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证单个字段
   * @param {HTMLInputElement} field - 输入字段
   * @param {string} validationType - 验证类型
   * @returns {Object} 验证结果
   */
  validateField(field, validationType) {
    const value = field.value.trim();

    // 检查必填字段
    if (field.required && !value) {
      return {
        isValid: false,
        message: '此字段为必填项'
      };
    }

    // 如果字段为空且非必填，则通过验证
    if (!value && !field.required) {
      return { isValid: true };
    }

    const rule = this.rules[validationType];
    if (!rule) {
      return { isValid: true };
    }

    // 检查最小长度
    if (rule.minLength && value.length < rule.minLength) {
      return {
        isValid: false,
        message: `至少需要${rule.minLength}个字符`
      };
    }

    // 检查正则表达式
    if (rule.pattern && !rule.pattern.test(value)) {
      return {
        isValid: false,
        message: rule.message
      };
    }

    return { isValid: true };
  }

  /**
   * 检查密码强度
   * @param {string} password - 密码
   * @returns {Object} 强度信息
   */
  checkPasswordStrength(password) {
    if (!password) {
      return { level: 'none', message: '' };
    }

    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      special: /[@$!%*?&]/.test(password)
    };

    score = Object.values(checks).filter(Boolean).length;

    if (score < 2) {
      return { level: 'weak', message: '密码强度：弱' };
    } else if (score < 4) {
      return { level: 'medium', message: '密码强度：中等' };
    }
    return { level: 'strong', message: '密码强度：强' };
  }
}

/**
 * UI交互管理器
 * 处理所有认证相关的用户界面交互
 */
class UIInteractionManager {
  constructor() {
    this.formValidator = new FormValidator();
    this.modalManager = new ModalManager();
    this.notificationManager = new NotificationManager();
    this.loadingManager = new LoadingManager();

    // UI配置
    this.config = {
      animationDuration: 300,
      autoHideNotifications: true,
      notificationTimeout: 5000,
      enableKeyboardShortcuts: true,
      enableAccessibility: true
    };

    // 初始化UI组件
    this.initializeComponents();
  }

  /**
     * 初始化UI组件
     */
  initializeComponents() {
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.setupAccessibility();
    this.createAuthModals();
  }

  /**
     * 初始化UI管理器（外部调用接口）
     */
  initialize() {
    // 重新初始化组件（确保DOM已加载）
    this.initializeComponents();

    // 初始化认证状态UI
    this.updateAuthenticationState(false);

    console.log('UI交互管理器初始化完成');
  }

  /**
     * 设置事件监听器
     */
  setupEventListeners() {
    // 登录表单事件
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLoginSubmit(e));
    }

    // 注册表单事件
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegisterSubmit(e));
    }

    // 忘记密码表单事件
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
      forgotPasswordForm.addEventListener('submit', (e) => this.handleForgotPasswordSubmit(e));
    }

    // 登出按钮事件
    const logoutButtons = document.querySelectorAll('[data-action="logout"]');
    logoutButtons.forEach(button => {
      button.addEventListener('click', (e) => this.handleLogout(e));
    });

    // 模态框触发按钮
    const modalTriggers = document.querySelectorAll('[data-modal]');
    modalTriggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const modalId = trigger.getAttribute('data-modal');
        this.modalManager.showModal(modalId);
      });
    });

    // 实时表单验证
    this.setupRealTimeValidation();
  }

  /**
     * 设置实时表单验证
     */
  setupRealTimeValidation() {
    const formInputs = document.querySelectorAll('input[data-validate]');
    formInputs.forEach(input => {
      input.addEventListener('blur', (e) => this.validateField(e.target));
      input.addEventListener('input', (e) => this.clearFieldError(e.target));
    });
  }

  /**
     * 设置键盘快捷键
     */
  setupKeyboardShortcuts() {
    if (!this.config.enableKeyboardShortcuts) {return;}

    document.addEventListener('keydown', (e) => {
      // Ctrl+L 打开登录模态框
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        this.modalManager.showModal('loginModal');
      }

      // Ctrl+R 打开注册模态框
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        this.modalManager.showModal('registerModal');
      }

      // ESC 关闭模态框
      if (e.key === 'Escape') {
        this.modalManager.closeAllModals();
      }
    });
  }

  /**
     * 设置无障碍功能
     */
  setupAccessibility() {
    if (!this.config.enableAccessibility) {return;}

    // 为表单添加ARIA标签
    const forms = document.querySelectorAll('form[data-auth-form]');
    forms.forEach(form => {
      form.setAttribute('role', 'form');
      form.setAttribute('aria-label', form.getAttribute('data-form-label') || '认证表单');
    });

    // 为错误消息添加ARIA属性
    const errorContainers = document.querySelectorAll('.error-message');
    errorContainers.forEach(container => {
      container.setAttribute('role', 'alert');
      container.setAttribute('aria-live', 'polite');
    });
  }

  /**
     * 创建认证模态框
     */
  createAuthModals() {
    // 创建登录模态框
    this.createLoginModal();

    // 创建注册模态框
    this.createRegisterModal();

    // 创建忘记密码模态框
    this.createForgotPasswordModal();
  }

  /**
     * 创建登录模态框
     */
  createLoginModal() {
    const modalHTML = `
            <div id="loginModal" class="auth-modal" role="dialog" aria-labelledby="loginModalTitle" aria-hidden="true">
                <div class="modal-overlay" data-modal-close></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="loginModalTitle">用户登录</h2>
                        <button class="modal-close" data-modal-close aria-label="关闭登录窗口">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="loginForm" data-auth-form data-form-label="用户登录表单">
                            <div class="form-group">
                                <label for="loginEmail">邮箱地址</label>
                                <input type="email" id="loginEmail" name="email" required 
                                       data-validate="email" aria-describedby="loginEmailError">
                                <div id="loginEmailError" class="error-message" aria-live="polite"></div>
                            </div>
                            <div class="form-group">
                                <label for="loginPassword">密码</label>
                                <div class="password-input-group">
                                    <input type="password" id="loginPassword" name="password" required 
                                           data-validate="password" aria-describedby="loginPasswordError">
                                    <button type="button" class="password-toggle" data-target="loginPassword" 
                                            aria-label="显示/隐藏密码">
                                        <span class="toggle-icon">👁</span>
                                    </button>
                                </div>
                                <div id="loginPasswordError" class="error-message" aria-live="polite"></div>
                            </div>
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="rememberMe" name="rememberMe">
                                    <span class="checkmark"></span>
                                    记住我
                                </label>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary" data-loading-text="登录中...">
                                    登录
                                </button>
                                <button type="button" class="btn btn-link" data-modal="forgotPasswordModal">
                                    忘记密码？
                                </button>
                            </div>
                        </form>
                        <div class="modal-footer">
                            <p>还没有账户？ <a href="#" data-modal="registerModal">立即注册</a></p>
                        </div>
                    </div>
                </div>
            </div>
        `;

    this.modalManager.createModal('loginModal', modalHTML);
  }

  /**
     * 创建注册模态框
     */
  createRegisterModal() {
    const modalHTML = `
            <div id="registerModal" class="auth-modal" role="dialog" aria-labelledby="registerModalTitle" aria-hidden="true">
                <div class="modal-overlay" data-modal-close></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="registerModalTitle">用户注册</h2>
                        <button class="modal-close" data-modal-close aria-label="关闭注册窗口">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="registerForm" data-auth-form data-form-label="用户注册表单">
                            <div class="form-group">
                                <label for="registerUsername">用户名</label>
                                <input type="text" id="registerUsername" name="username" required 
                                       data-validate="username" aria-describedby="registerUsernameError">
                                <div id="registerUsernameError" class="error-message" aria-live="polite"></div>
                            </div>
                            <div class="form-group">
                                <label for="registerEmail">邮箱地址</label>
                                <input type="email" id="registerEmail" name="email" required 
                                       data-validate="email" aria-describedby="registerEmailError">
                                <div id="registerEmailError" class="error-message" aria-live="polite"></div>
                            </div>
                            <div class="form-group">
                                <label for="registerPassword">密码</label>
                                <div class="password-input-group">
                                    <input type="password" id="registerPassword" name="password" required 
                                           data-validate="password" aria-describedby="registerPasswordError">
                                    <button type="button" class="password-toggle" data-target="registerPassword" 
                                            aria-label="显示/隐藏密码">
                                        <span class="toggle-icon">👁</span>
                                    </button>
                                </div>
                                <div id="registerPasswordError" class="error-message" aria-live="polite"></div>
                                <div class="password-strength" id="passwordStrength"></div>
                            </div>
                            <div class="form-group">
                                <label for="confirmPassword">确认密码</label>
                                <div class="password-input-group">
                                    <input type="password" id="confirmPassword" name="confirmPassword" required 
                                           data-validate="confirmPassword" aria-describedby="confirmPasswordError">
                                    <button type="button" class="password-toggle" data-target="confirmPassword" 
                                            aria-label="显示/隐藏确认密码">
                                        <span class="toggle-icon">👁</span>
                                    </button>
                                </div>
                                <div id="confirmPasswordError" class="error-message" aria-live="polite"></div>
                            </div>
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="agreeTerms" name="agreeTerms" required>
                                    <span class="checkmark"></span>
                                    我同意 <a href="#" target="_blank">服务条款</a> 和 <a href="#" target="_blank">隐私政策</a>
                                </label>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary" data-loading-text="注册中...">
                                    注册
                                </button>
                            </div>
                        </form>
                        <div class="modal-footer">
                            <p>已有账户？ <a href="#" data-modal="loginModal">立即登录</a></p>
                        </div>
                    </div>
                </div>
            </div>
        `;

    this.modalManager.createModal('registerModal', modalHTML);
  }

  /**
     * 创建忘记密码模态框
     */
  createForgotPasswordModal() {
    const modalHTML = `
            <div id="forgotPasswordModal" class="auth-modal" role="dialog" aria-labelledby="forgotPasswordModalTitle" aria-hidden="true">
                <div class="modal-overlay" data-modal-close></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="forgotPasswordModalTitle">重置密码</h2>
                        <button class="modal-close" data-modal-close aria-label="关闭重置密码窗口">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="forgotPasswordForm" data-auth-form data-form-label="重置密码表单">
                            <div class="form-group">
                                <label for="resetEmail">邮箱地址</label>
                                <input type="email" id="resetEmail" name="email" required 
                                       data-validate="email" aria-describedby="resetEmailError"
                                       placeholder="请输入您的注册邮箱">
                                <div id="resetEmailError" class="error-message" aria-live="polite"></div>
                                <div class="form-help">我们将向您的邮箱发送重置密码的链接</div>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary" data-loading-text="发送中...">
                                    发送重置链接
                                </button>
                                <button type="button" class="btn btn-secondary" data-modal="loginModal">
                                    返回登录
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

    this.modalManager.createModal('forgotPasswordModal', modalHTML);
  }

  /**
     * 处理登录表单提交
     * @param {Event} event - 表单提交事件
     */
  async handleLoginSubmit(event) {
    event.preventDefault();

    try {
      const form = event.target;
      const formData = new FormData(form);

      // 验证表单
      const validationResult = this.formValidator.validateForm(form);
      if (!validationResult.isValid) {
        this.displayValidationErrors(validationResult.errors);
        return;
      }

      // 显示加载状态
      this.loadingManager.showLoading(form.querySelector('button[type="submit"]'));

      // 准备登录数据
      const loginData = {
        email: formData.get('email'),
        password: formData.get('password'),
        rememberMe: formData.get('rememberMe') === 'on'
      };

      // 触发登录事件（由AuthManager处理）
      const loginEvent = new CustomEvent('auth:login', {
        detail: loginData
      });
      document.dispatchEvent(loginEvent);

    } catch (error) {
      console.error('登录表单处理失败:', error);
      this.notificationManager.showError('登录过程中发生错误，请稍后重试');
    } finally {
      this.loadingManager.hideLoading();
    }
  }

  /**
     * 处理注册表单提交
     * @param {Event} event - 表单提交事件
     */
  async handleRegisterSubmit(event) {
    event.preventDefault();

    try {
      const form = event.target;
      const formData = new FormData(form);

      // 验证表单
      const validationResult = this.formValidator.validateForm(form);
      if (!validationResult.isValid) {
        this.displayValidationErrors(validationResult.errors);
        return;
      }

      // 显示加载状态
      this.loadingManager.showLoading(form.querySelector('button[type="submit"]'));

      // 准备注册数据
      const registerData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword'),
        agreeTerms: formData.get('agreeTerms') === 'on'
      };

      // 触发注册事件（由AuthManager处理）
      const registerEvent = new CustomEvent('auth:register', {
        detail: registerData
      });
      document.dispatchEvent(registerEvent);

    } catch (error) {
      console.error('注册表单处理失败:', error);
      this.notificationManager.showError('注册过程中发生错误，请稍后重试');
    } finally {
      this.loadingManager.hideLoading();
    }
  }

  /**
     * 处理忘记密码表单提交
     * @param {Event} event - 表单提交事件
     */
  async handleForgotPasswordSubmit(event) {
    event.preventDefault();

    try {
      const form = event.target;
      const formData = new FormData(form);

      // 验证表单
      const validationResult = this.formValidator.validateForm(form);
      if (!validationResult.isValid) {
        this.displayValidationErrors(validationResult.errors);
        return;
      }

      // 显示加载状态
      this.loadingManager.showLoading(form.querySelector('button[type="submit"]'));

      // 准备重置密码数据
      const resetData = {
        email: formData.get('email')
      };

      // 触发重置密码事件（由AuthManager处理）
      const resetEvent = new CustomEvent('auth:forgotPassword', {
        detail: resetData
      });
      document.dispatchEvent(resetEvent);

    } catch (error) {
      console.error('重置密码表单处理失败:', error);
      this.notificationManager.showError('重置密码过程中发生错误，请稍后重试');
    } finally {
      this.loadingManager.hideLoading();
    }
  }

  /**
     * 处理登出
     * @param {Event} event - 点击事件
     */
  async handleLogout(event) {
    event.preventDefault();

    try {
      // 显示确认对话框
      const confirmed = await this.modalManager.showConfirm({
        title: '确认登出',
        message: '您确定要登出当前账户吗？',
        confirmText: '登出',
        cancelText: '取消'
      });

      if (confirmed) {
        // 触发登出事件（由AuthManager处理）
        const logoutEvent = new CustomEvent('auth:logout');
        document.dispatchEvent(logoutEvent);
      }

    } catch (error) {
      console.error('登出处理失败:', error);
      this.notificationManager.showError('登出过程中发生错误');
    }
  }

  /**
     * 验证单个字段
     * @param {HTMLElement} field - 输入字段
     */
  validateField(field) {
    const validationType = field.getAttribute('data-validate');
    const result = this.formValidator.validateField(field, validationType);

    if (!result.isValid) {
      this.showFieldError(field, result.message);
    } else {
      this.clearFieldError(field);
    }
  }

  /**
     * 显示加载状态（代理方法）
     * @param {HTMLElement} element - 目标元素
     * @param {string} loadingText - 加载文本
     */
  showLoading(element, loadingText = null) {
    this.loadingManager.showLoading(element, loadingText);
  }

  /**
     * 隐藏加载状态（代理方法）
     * @param {HTMLElement} element - 目标元素（可选）
     */
  hideLoading(element = null) {
    this.loadingManager.hideLoading(element);
  }

  /**
     * 显示模态框（代理方法）
     * @param {string} modalId - 模态框ID
     * @param {Object} options - 选项
     */
  showModal(modalId, options = {}) {
    this.modalManager.showModal(modalId, options);
  }

  /**
     * 隐藏模态框（代理方法）
     * @param {string} modalId - 模态框ID
     */
  hideModal(modalId) {
    this.modalManager.hideModal(modalId);
  }

  /**
     * 更新认证状态UI
     * @param {boolean} isAuthenticated - 是否已认证
     * @param {Object} user - 用户信息（可选）
     */
  updateAuthenticationState(isAuthenticated, user = null) {
    // 更新登录/登出按钮状态
    const loginButtons = document.querySelectorAll('[data-action="login"]');
    const logoutButtons = document.querySelectorAll('[data-action="logout"]');
    const userInfo = document.querySelectorAll('.user-info');

    if (isAuthenticated) {
      // 隐藏登录按钮，显示登出按钮
      loginButtons.forEach(btn => {
        btn.style.display = 'none';
      });
      logoutButtons.forEach(btn => {
        btn.style.display = 'inline-block';
      });

      // 显示用户信息
      if (user && userInfo.length > 0) {
        userInfo.forEach(info => {
          info.textContent = user.username || user.email || '用户';
          info.style.display = 'inline-block';
        });
      }

      // 隐藏认证相关模态框
      this.hideModal('loginModal');
      this.hideModal('registerModal');

    } else {
      // 显示登录按钮，隐藏登出按钮
      loginButtons.forEach(btn => {
        btn.style.display = 'inline-block';
      });
      logoutButtons.forEach(btn => {
        btn.style.display = 'none';
      });

      // 隐藏用户信息
      userInfo.forEach(info => {
        info.style.display = 'none';
      });
    }

    // 触发认证状态变更事件
    const stateChangeEvent = new CustomEvent('auth:stateChanged', {
      detail: { isAuthenticated, user }
    });
    document.dispatchEvent(stateChangeEvent);
  }

  /**
     * 显示通知（代理方法）
     * @param {string} message - 通知消息
     * @param {string} type - 通知类型
     * @param {Object} options - 选项
     */
  showNotification(message, type = 'info', options = {}) {
    switch (type) {
    case 'error':
      return this.notificationManager.showError(message, options);
    case 'success':
      return this.notificationManager.showSuccess(message, options);
    case 'warning':
      return this.notificationManager.showWarning(message, options);
    default:
      return this.notificationManager.showInfo(message, options);
    }
  }

  /**
     * 清除字段错误
     * @param {HTMLElement} field - 输入字段
     */
  clearFieldError(field) {
    field.classList.remove('error');
    const errorElement = document.getElementById(field.getAttribute('aria-describedby'));
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    }
  }

  /**
     * 显示字段错误
     * @param {HTMLElement} field - 输入字段
     * @param {string} message - 错误消息
     */
  showFieldError(field, message) {
    field.classList.add('error');
    const errorElement = document.getElementById(field.getAttribute('aria-describedby'));
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
  }

  /**
     * 显示验证错误
     * @param {Array} errors - 错误列表
     */
  displayValidationErrors(errors) {
    errors.forEach(error => {
      const field = document.querySelector(`[name="${error.field}"]`);
      if (field) {
        this.showFieldError(field, error.message);
      }
    });
  }

  /**
     * 处理认证成功
     * @param {Object} userData - 用户数据
     */
  handleAuthSuccess(userData) {
    // 关闭所有模态框
    this.modalManager.closeAllModals();

    // 显示成功通知
    this.notificationManager.showSuccess(`欢迎回来，${userData.username}！`);

    // 更新UI状态
    this.updateUIForAuthenticatedUser(userData);
  }

  /**
     * 处理认证失败
     * @param {string} message - 错误消息
     */
  handleAuthError(message) {
    this.notificationManager.showError(message);
  }

  /**
     * 更新已认证用户的UI
     * @param {Object} userData - 用户数据
     */
  updateUIForAuthenticatedUser(userData) {
    // 隐藏登录/注册按钮
    const authButtons = document.querySelectorAll('.auth-button');
    authButtons.forEach(button => {
      button.style.display = 'none';
    });

    // 显示用户菜单
    const userMenu = document.querySelector('.user-menu');
    if (userMenu) {
      userMenu.style.display = 'block';

      // 更新用户信息
      const usernameElement = userMenu.querySelector('.username');
      if (usernameElement) {
        usernameElement.textContent = userData.username;
      }

      const avatarElement = userMenu.querySelector('.user-avatar');
      if (avatarElement && userData.avatar) {
        avatarElement.src = userData.avatar;
      }
    }
  }

  /**
     * 更新未认证用户的UI
     */
  updateUIForUnauthenticatedUser() {
    // 显示登录/注册按钮
    const authButtons = document.querySelectorAll('.auth-button');
    authButtons.forEach(button => {
      button.style.display = 'block';
    });

    // 隐藏用户菜单
    const userMenu = document.querySelector('.user-menu');
    if (userMenu) {
      userMenu.style.display = 'none';
    }
  }

  /**
     * 设置密码强度指示器
     * @param {HTMLElement} passwordField - 密码输入字段
     */
  setupPasswordStrengthIndicator(passwordField) {
    const strengthIndicator = document.getElementById('passwordStrength');
    if (!strengthIndicator) {return;}

    passwordField.addEventListener('input', (e) => {
      const password = e.target.value;
      const strength = this.formValidator.checkPasswordStrength(password);

      strengthIndicator.className = `password-strength strength-${strength.level}`;
      strengthIndicator.textContent = strength.message;
    });
  }

  /**
     * 设置密码显示/隐藏切换
     */
  setupPasswordToggle() {
    const toggleButtons = document.querySelectorAll('.password-toggle');
    toggleButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = button.getAttribute('data-target');
        const passwordField = document.getElementById(targetId);

        if (passwordField) {
          const isPassword = passwordField.type === 'password';
          passwordField.type = isPassword ? 'text' : 'password';

          const icon = button.querySelector('.toggle-icon');
          if (icon) {
            icon.textContent = isPassword ? '🙈' : '👁';
          }

          button.setAttribute('aria-label',
            isPassword ? '隐藏密码' : '显示密码'
          );
        }
      });
    });
  }

  /**
     * 初始化组件后的设置
     */
  postInitialize() {
    // 设置密码强度指示器
    const registerPasswordField = document.getElementById('registerPassword');
    if (registerPasswordField) {
      this.setupPasswordStrengthIndicator(registerPasswordField);
    }

    // 设置密码显示/隐藏切换
    this.setupPasswordToggle();

    // 监听认证事件
    this.setupAuthEventListeners();
  }

  /**
     * 设置认证事件监听器
     */
  setupAuthEventListeners() {
    // 监听认证成功事件
    document.addEventListener('auth:success', (e) => {
      this.handleAuthSuccess(e.detail);
    });

    // 监听认证失败事件
    document.addEventListener('auth:error', (e) => {
      this.handleAuthError(e.detail.message);
    });

    // 监听登出成功事件
    document.addEventListener('auth:logoutSuccess', () => {
      this.updateUIForUnauthenticatedUser();
      this.notificationManager.showSuccess('已成功登出');
    });
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    UIInteractionManager,
    FormValidator,
    ModalManager,
    NotificationManager,
    LoadingManager
  };
} else {
  window.UIInteractionManager = UIInteractionManager;
  window.FormValidator = FormValidator;
  window.ModalManager = ModalManager;
  window.NotificationManager = NotificationManager;
  window.LoadingManager = LoadingManager;
}
