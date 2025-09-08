/* global Utils */
/**
 * 用户认证UI组件
 * 提供登录、注册表单和用户状态显示
 * @author AI Assistant
 * @version 1.0
 * @date 2025-01-12
 */

class AuthUI {
  constructor(dependencies = {}) {
    this.authManager = dependencies.authManager;
    this.container = dependencies.container || document.body;
    this.eventBus = dependencies.eventBus || window;

    // UI状态
    this.isModalOpen = false;
    this.currentView = 'login'; // 'login' | 'register'

    // 初始化UI
    this.init();
  }

  /**
     * 初始化认证UI
     */
  init() {
    this.createAuthModal();
    this.createUserStatusDisplay();
    this.bindEvents();
    this.addInputValidation();
    this.updateUserStatus();
  }

  /**
     * 创建认证模态框
     */
  createAuthModal() {
    const modalHTML = `
            <div id="auth-modal" class="auth-modal" style="display: none;">
                <div class="auth-modal-overlay" data-close-modal></div>
                <div class="auth-modal-content">
                    <div class="auth-modal-header">
                        <div class="auth-logo">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="16" cy="16" r="16" fill="url(#gradient)"/>
                                <path d="M12 16L14.5 18.5L20 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <defs>
                                    <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
                                        <stop offset="0%" stop-color="#3b82f6"/>
                                        <stop offset="100%" stop-color="#1d4ed8"/>
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <h2 id="auth-modal-title">欢迎回来</h2>
                        <p class="auth-subtitle">登录您的账户继续购物</p>
                        <button class="auth-modal-close" data-close-modal>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="auth-modal-body">
                        <!-- 登录表单 -->
                        <form id="login-form" class="auth-form" style="display: block;">
                            <div class="form-group">
                                <div class="input-wrapper">
                                    <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    <input type="email" id="login-email" name="email" required 
                                           placeholder="邮箱或用户名">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <div class="input-wrapper">
                                    <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                                        <circle cx="12" cy="16" r="1" fill="currentColor"/>
                                        <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    <input type="password" id="login-password" name="password" required 
                                           placeholder="密码">
                                </div>
                            </div>
                            
                            <button type="submit" class="auth-btn auth-btn-primary" id="login-btn">
                                <span class="btn-text">登录</span>
                                <svg class="btn-loading" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: none;">
                                    <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                            
                            <div class="auth-divider">
                                <span>或</span>
                            </div>
                            
                            <div class="auth-switch">
                                <span>还没有账户？</span>
                                <a href="#" id="switch-to-register">立即注册</a>
                            </div>
                        </form>
                        
                        <!-- 注册表单 -->
                        <form id="register-form" class="auth-form" style="display: none;">
                            <div class="form-group">
                                <div class="input-wrapper">
                                    <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    <input type="text" id="register-username" name="username" required 
                                           placeholder="用户名">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <div class="input-wrapper">
                                    <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" stroke-width="2"/>
                                        <polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    <input type="email" id="register-email" name="email" required 
                                           placeholder="邮箱地址">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <div class="input-wrapper">
                                    <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                                        <circle cx="12" cy="16" r="1" fill="currentColor"/>
                                        <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    <input type="password" id="register-password" name="password" required 
                                           placeholder="密码">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <div class="input-wrapper">
                                    <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    <input type="password" id="register-confirm-password" name="confirmPassword" required 
                                           placeholder="确认密码">
                                </div>
                            </div>
                            
                            <button type="submit" class="auth-btn auth-btn-primary" id="register-btn">
                                <span class="btn-text">注册</span>
                                <svg class="btn-loading" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: none;">
                                    <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                            
                            <div class="auth-divider">
                                <span>或</span>
                            </div>
                            
                            <div class="auth-switch">
                                <span>已有账户？</span>
                                <a href="#" id="switch-to-login">立即登录</a>
                            </div>
                        </form>
                    </div>
                    
                    <div class="auth-message" id="auth-message" style="display: none;"></div>
                </div>
            </div>
        `;

    this.container.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('auth-modal');
  }

  /**
     * 创建用户状态显示
     */
  createUserStatusDisplay() {
    // 查找现有的用户状态容器或创建新的
    let userStatusContainer = document.querySelector('.user-status');

    if (!userStatusContainer) {
      // 在导航栏中添加用户状态
      const nav = document.querySelector('nav') || document.querySelector('header');
      if (nav) {
        userStatusContainer = document.createElement('div');
        userStatusContainer.className = 'user-status';
        nav.appendChild(userStatusContainer);
      }
    }

    if (userStatusContainer) {
      const statusHTML = `
                <div id="user-status-display">
                    <!-- 未登录状态 -->
                    <div id="guest-status" class="status-section">
                        <button class="auth-trigger-btn" data-auth-action="login">登录</button>
                        <button class="auth-trigger-btn secondary" data-auth-action="register">注册</button>
                    </div>
                    
                    <!-- 已登录状态 -->
                    <div id="user-status" class="status-section" style="display: none;">
                        <div class="user-info">
                            <img id="user-avatar" class="user-avatar" src="https://placehold.co/40x40/e5e7eb/6b7280?text=用户" alt="用户头像">
                            <span id="user-name" class="user-name"></span>
                        </div>
                        <div class="user-menu">
                            <button class="user-menu-btn" id="user-menu-toggle">▼</button>
                            <div class="user-dropdown" id="user-dropdown" style="display: none;">
                                <a href="#" class="dropdown-item" data-action="profile">个人中心</a>
                                <a href="#" class="dropdown-item" data-action="orders">我的订单</a>
                                <a href="#" class="dropdown-item" data-action="settings">账户设置</a>
                                <hr class="dropdown-divider">
                                <a href="#" class="dropdown-item" data-action="logout">退出登录</a>
                            </div>
                        </div>
                    </div>
                </div>
            `;

      Utils.setElementHTML(userStatusContainer, statusHTML, true); // 允许HTML，因为statusHTML是内部生成的安全内容
    }
  }

  /**
     * 绑定事件监听器
     */
  bindEvents() {
    // 模态框事件
    this.bindModalEvents();

    // 表单事件
    this.bindFormEvents();

    // 用户状态事件
    this.bindUserStatusEvents();

    // 认证管理器事件
    this.bindAuthEvents();
  }

  /**
     * 绑定模态框事件
     */
  bindModalEvents() {
    // 打开模态框
    document.addEventListener('click', (e) => {
      const authAction = e.target.getAttribute('data-auth-action');
      if (authAction) {
        e.preventDefault();
        this.openModal(authAction);
      }
    });

    // 关闭模态框
    document.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-close-modal')) {
        this.closeModal();
      }
    });

    // ESC键关闭模态框
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isModalOpen) {
        this.closeModal();
      }
    });

    // 切换表单
    const switchToRegister = document.getElementById('switch-to-register');
    if (switchToRegister) {
      switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchToRegister();
      });
    }

    const switchToLogin = document.getElementById('switch-to-login');
    if (switchToLogin) {
      switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchToLogin();
      });
    }
  }

  /**
     * 绑定表单事件
     */
  bindFormEvents() {
    // 登录表单
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin(e);
      });
    }

    // 注册表单
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleRegister(e);
      });
    }

    // 实时验证
    this.bindFormValidation();
  }

  /**
     * 绑定表单验证
     */
  bindFormValidation() {
    // 密码确认验证
    const confirmPassword = document.getElementById('register-confirm-password');
    const password = document.getElementById('register-password');

    if (confirmPassword && password) {
      confirmPassword.addEventListener('input', () => {
        if (confirmPassword.value && password.value !== confirmPassword.value) {
          confirmPassword.setCustomValidity('密码不一致');
        } else {
          confirmPassword.setCustomValidity('');
        }
      });
    }
  }

  /**
     * 绑定用户状态事件
     */
  bindUserStatusEvents() {
    // 用户菜单切换
    const menuToggle = document.getElementById('user-menu-toggle');
    const dropdown = document.getElementById('user-dropdown');

    if (menuToggle && dropdown) {
      menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = dropdown.style.display !== 'none';
        dropdown.style.display = isVisible ? 'none' : 'block';
      });

      // 点击其他地方关闭菜单
      document.addEventListener('click', () => {
        dropdown.style.display = 'none';
      });
    }

    // 用户菜单项点击
    document.addEventListener('click', (e) => {
      const action = e.target.getAttribute('data-action');
      if (action) {
        e.preventDefault();
        this.handleUserAction(action);
      }
    });
  }

  /**
     * 绑定认证事件
     */
  bindAuthEvents() {
    // 监听认证管理器事件
    this.eventBus.addEventListener('user:loggedIn', (e) => {
      this.updateUserStatus();
      this.closeModal();
      this.showMessage('success', e.detail.message);
    });

    this.eventBus.addEventListener('user:loggedOut', (e) => {
      this.updateUserStatus();
      this.showMessage('info', e.detail.message);
    });

    this.eventBus.addEventListener('user:registered', (e) => {
      this.showMessage('success', e.detail.message);
      this.switchToLogin();
    });

    this.eventBus.addEventListener('user:error', (e) => {
      this.showMessage('error', e.detail.message);
    });

    this.eventBus.addEventListener('user:sessionRestored', (_e) => {
      this.updateUserStatus();
    });
  }

  /**
     * 打开认证模态框
     * @param {string} view - 视图类型 ('login' | 'register')
     */
  openModal(view = 'login') {
    this.currentView = view;
    this.isModalOpen = true;

    if (view === 'register') {
      this.switchToRegister();
    } else {
      this.switchToLogin();
    }

    this.modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // 聚焦到第一个输入框
    setTimeout(() => {
      const firstInput = this.modal.querySelector('.auth-form:not([style*="display: none"]) input');
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }

  /**
     * 关闭认证模态框
     */
  closeModal() {
    this.isModalOpen = false;
    this.modal.style.display = 'none';
    document.body.style.overflow = '';

    // 清除表单
    this.clearForms();
    this.hideMessage();
  }

  /**
     * 切换到登录表单
     */
  switchToLogin() {
    this.currentView = 'login';
    document.getElementById('auth-modal-title').textContent = '用户登录';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    this.hideMessage();
  }

  /**
     * 切换到注册表单
     */
  switchToRegister() {
    this.currentView = 'register';
    document.getElementById('auth-modal-title').textContent = '用户注册';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    this.hideMessage();
  }

  /**
     * 处理登录
     * @param {Event} event - 表单提交事件
     */
  async handleLogin(event) {
    const form = event.target;
    const formData = new FormData(form);
    const loginBtn = document.getElementById('login-btn');
    // const btnText = loginBtn.querySelector('.btn-text'); // 暂时注释，未使用
    // const btnLoading = loginBtn.querySelector('.btn-loading'); // 暂时注释，未使用

    try {
      // 设置按钮加载状态
      this.setButtonLoading(loginBtn, true);

      const credentials = {
        email: formData.get('email'),
        password: formData.get('password'),
        rememberMe: true // 默认保持登录状态
      };

      // 验证输入
      if (!credentials.email || !credentials.password) {
        this.showMessage('error', '请填写完整的登录信息');
        // 添加输入框抖动效果
        const emptyFields = [];
        if (!credentials.email) {emptyFields.push(document.getElementById('login-email'));}
        if (!credentials.password) {emptyFields.push(document.getElementById('login-password'));}

        emptyFields.forEach(field => {
          field.style.animation = 'shake 0.5s ease-in-out';
          setTimeout(() => {
            field.style.animation = '';
          }, 500);
        });
        return;
      }

      await this.authManager.login(credentials);

    } catch (error) {
      // 使用全局错误处理器
      if (window.errorHandler) {
        window.errorHandler.handleError({
          type: 'auth',
          operation: '用户登录',
          message: error.message || '登录失败',
          error: error
        });
      } else {
        this.showMessage('error', error.message);
      }
    } finally {
      // 恢复按钮状态
      this.setButtonLoading(loginBtn, false);
    }
  }

  /**
     * 处理注册
     * @param {Event} event - 表单提交事件
     */
  async handleRegister(event) {
    const form = event.target;
    const formData = new FormData(form);
    const registerBtn = document.getElementById('register-btn');

    try {
      // 设置按钮加载状态
      this.setButtonLoading(registerBtn, true);

      const userData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword')
      };

      // 验证输入
      if (!userData.username || !userData.email || !userData.password || !userData.confirmPassword) {
        this.showMessage('error', '请填写完整的注册信息');
        // 添加输入框抖动效果
        const emptyFields = [];
        if (!userData.username) {emptyFields.push(document.getElementById('register-username'));}
        if (!userData.email) {emptyFields.push(document.getElementById('register-email'));}
        if (!userData.password) {emptyFields.push(document.getElementById('register-password'));}
        if (!userData.confirmPassword) {emptyFields.push(document.getElementById('register-confirm-password'));}

        emptyFields.forEach(field => {
          field.style.animation = 'shake 0.5s ease-in-out';
          setTimeout(() => {
            field.style.animation = '';
          }, 500);
        });
        return;
      }

      await this.authManager.register(userData);

    } catch (error) {
      // 使用全局错误处理器
      if (window.errorHandler) {
        window.errorHandler.handleError({
          type: 'auth',
          operation: '用户注册',
          message: error.message || '注册失败',
          error: error
        });
      } else {
        this.showMessage('error', error.message);
      }
    } finally {
      // 恢复按钮状态
      this.setButtonLoading(registerBtn, false);
    }
  }

  /**
     * 处理用户操作
     * @param {string} action - 操作类型
     */
  async handleUserAction(action) {
    switch (action) {
    case 'logout':
      try {
        await this.authManager.logout();
      } catch (error) {
        this.showMessage('error', '退出登录失败');
      }
      break;

    case 'profile':
      // 跳转到个人中心
      this.navigateToProfile();
      break;

    case 'orders':
      // 跳转到订单页面
      this.navigateToOrders();
      break;

    case 'settings':
      // 跳转到设置页面
      this.navigateToSettings();
      break;
    }
  }

  /**
     * 更新用户状态显示
     */
  updateUserStatus() {
    const guestStatus = document.getElementById('guest-status');
    const userStatus = document.getElementById('user-status');
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');

    if (!guestStatus || !userStatus) {return;}

    if (this.authManager.isLoggedIn()) {
      const user = this.authManager.getCurrentUser();

      // 显示用户信息
      guestStatus.style.display = 'none';
      userStatus.style.display = 'flex';

      if (userName) {
        userName.textContent = user.username;
      }

      if (userAvatar) {
        userAvatar.src = user.avatar || '/images/default-avatar.png';
        userAvatar.alt = `${user.username}的头像`;
      }
    } else {
      // 显示访客状态
      guestStatus.style.display = 'flex';
      userStatus.style.display = 'none';
    }
  }

  /**
     * 显示消息
     * @param {string} type - 消息类型 ('success' | 'error' | 'info' | 'warning')
     * @param {string} message - 消息内容
     */
  showMessage(type, message) {
    const messageEl = document.getElementById('auth-message');
    if (!messageEl) {return;}

    messageEl.className = `auth-message ${type}`;
    messageEl.textContent = message;
    messageEl.style.display = 'block';

    // 自动隐藏成功消息
    if (type === 'success') {
      setTimeout(() => {
        this.hideMessage();
      }, 3000);
    }
  }

  /**
     * 隐藏消息
     */
  hideMessage() {
    const messageEl = document.getElementById('auth-message');
    if (messageEl) {
      messageEl.style.display = 'none';
    }
  }

  /**
     * 清除表单
     */
  clearForms() {
    const forms = this.modal.querySelectorAll('.auth-form');
    forms.forEach(form => {
      form.reset();
      // 清除自定义验证消息
      const inputs = form.querySelectorAll('input');
      inputs.forEach(input => {
        input.setCustomValidity('');
      });
    });
  }

  /**
     * 导航到个人中心
     */
  navigateToProfile() {
    // 实现个人中心导航逻辑
    try {
      if (window.errorUtils) {
        window.errorUtils.handleError({
          type: 'info',
          operation: '导航到个人中心',
          message: '导航到个人中心',
          context: { action: 'navigate', target: 'profile' }
        });
      } else {
        console.log('导航到个人中心');
      }
    } catch (error) {
      console.log('导航到个人中心');
    }
    // window.location.href = '/profile';
  }

  /**
     * 导航到订单页面
     */
  navigateToOrders() {
    // 实现订单页面导航逻辑
    try {
      if (window.errorUtils) {
        window.errorUtils.handleError({
          type: 'info',
          operation: '导航到订单页面',
          message: '导航到订单页面',
          context: { action: 'navigate', target: 'orders' }
        });
      } else {
        console.log('导航到订单页面');
      }
    } catch (error) {
      console.log('导航到订单页面');
    }
    // window.location.href = '/orders';
  }

  /**
     * 导航到设置页面
     */
  navigateToSettings() {
    // 实现设置页面导航逻辑
    try {
      if (window.errorUtils) {
        window.errorUtils.handleError({
          type: 'info',
          operation: '导航到设置页面',
          message: '导航到设置页面',
          context: { action: 'navigate', target: 'settings' }
        });
      } else {
        console.log('导航到设置页面');
      }
    } catch (error) {
      console.log('导航到设置页面');
    }
    // window.location.href = '/settings';
  }

  /**
     * 设置按钮加载状态
     * @param {HTMLElement} button - 按钮元素
     * @param {boolean} loading - 是否加载中
     */
  setButtonLoading(button, loading) {
    const btnText = button.querySelector('.btn-text');
    const btnLoading = button.querySelector('.btn-loading');

    if (loading) {
      button.disabled = true;
      button.classList.add('loading');
      if (btnText) {btnText.style.display = 'none';}
      if (btnLoading) {
        btnLoading.style.display = 'inline-block';
        btnLoading.style.animation = 'spin 1s linear infinite';
      }
    } else {
      button.disabled = false;
      button.classList.remove('loading');
      if (btnText) {btnText.style.display = 'inline';}
      if (btnLoading) {
        btnLoading.style.display = 'none';
        btnLoading.style.animation = '';
      }
    }
  }

  /**
     * 添加输入框实时验证
     */
  addInputValidation() {
    // 等待模态框创建完成
    setTimeout(() => {
      const inputs = document.querySelectorAll('#auth-modal input');

      inputs.forEach(input => {
        // 添加实时验证
        input.addEventListener('input', (e) => {
          this.validateInput(e.target);
        });

        // 添加失焦验证
        input.addEventListener('blur', (e) => {
          this.validateInput(e.target);
        });

        // 添加聚焦效果
        input.addEventListener('focus', (e) => {
          this.clearInputError(e.target);
        });
      });
    }, 100);
  }

  /**
     * 验证单个输入框
     * @param {HTMLElement} input - 输入框元素
     */
  validateInput(input) {
    const value = input.value.trim();
    const type = input.type;
    const id = input.id;

    let isValid = true;
    let errorMessage = '';

    // 基础验证
    if (input.required && !value) {
      isValid = false;
      errorMessage = '此字段为必填项';
    }

    // 邮箱验证
    if (type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        isValid = false;
        errorMessage = '请输入有效的邮箱地址';
      }
    }

    // 密码验证
    if (type === 'password' && value && id.includes('password') && !id.includes('confirm')) {
      if (value.length < 6) {
        isValid = false;
        errorMessage = '密码长度至少6位';
      }
    }

    // 确认密码验证
    if (id.includes('confirm-password') && value) {
      const passwordInput = document.getElementById('register-password');
      if (passwordInput && value !== passwordInput.value) {
        isValid = false;
        errorMessage = '两次输入的密码不一致';
      }
    }

    // 用户名验证
    if (id.includes('username') && value) {
      if (value.length < 3) {
        isValid = false;
        errorMessage = '用户名长度至少3位';
      }
    }

    // 应用验证结果
    if (isValid) {
      this.clearInputError(input);
    } else {
      this.showInputError(input, errorMessage);
    }

    return isValid;
  }

  /**
     * 显示输入框错误
     * @param {HTMLElement} input - 输入框元素
     * @param {string} message - 错误消息
     */
  showInputError(input, message) {
    input.classList.add('error');

    // 移除旧的错误消息
    const existingError = input.parentNode.querySelector('.input-error');
    if (existingError) {
      existingError.remove();
    }

    // 添加新的错误消息
    const errorElement = document.createElement('div');
    errorElement.className = 'input-error';
    errorElement.textContent = message;
    input.parentNode.appendChild(errorElement);
  }

  /**
     * 清除输入框错误
     * @param {HTMLElement} input - 输入框元素
     */
  clearInputError(input) {
    input.classList.remove('error');

    const errorElement = input.parentNode.querySelector('.input-error');
    if (errorElement) {
      errorElement.remove();
    }
  }

  /**
     * 获取当前用户
     * @returns {Object|null} 当前用户信息
     */
  getCurrentUser() {
    return this.authManager.getCurrentUser();
  }

  /**
     * 检查登录状态
     * @returns {boolean} 是否已登录
     */
  isLoggedIn() {
    return this.authManager.isLoggedIn();
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthUI;
} else if (typeof window !== 'undefined') {
  window.AuthUI = AuthUI;
}
