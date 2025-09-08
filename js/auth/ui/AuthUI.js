/**
 * AuthUI - 认证UI交互专职类
 * 职责: 认证相关的UI状态更新、消息显示
 * 符合单一职责原则(SRP)
 */
class AuthUI {
  constructor() {
    this.loadingElements = [];
    this.messageContainer = null;
    this.userInfoElements = [];
    this.loginElements = [];
    this.logoutElements = [];

    this.initializeElements();
  }

  /**
   * 初始化UI元素引用
   */
  initializeElements() {
    // 加载状态元素
    this.loadingElements = document.querySelectorAll('.loading-spinner, .auth-loading');

    // 消息容器
    this.messageContainer = document.querySelector('#auth-messages') ||
      document.querySelector('.auth-messages') ||
      this.createMessageContainer();

    // 用户信息显示元素
    this.userInfoElements = document.querySelectorAll('.user-info, .user-display, #user-name');

    // 登录相关元素
    this.loginElements = document.querySelectorAll('.login-form, .login-button, .auth-login');

    // 登出相关元素
    this.logoutElements = document.querySelectorAll('.logout-button, .auth-logout');
  }

  /**
   * 创建消息容器
   * @returns {HTMLElement} 消息容器元素
   */
  createMessageContainer() {
    const container = document.createElement('div');
    container.id = 'auth-messages';
    container.className = 'auth-messages';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
    `;
    document.body.appendChild(container);
    return container;
  }

  /**
   * 显示加载状态
   * @param {string} message - 加载消息
   */
  showLoadingState(message = '加载中...') {
    // 显示加载动画
    this.loadingElements.forEach(element => {
      element.style.display = 'block';
      if (typeof element.textContent !== 'undefined') {
        element.textContent = message;
      }
    });

    // 禁用表单按钮
    this.disableFormButtons(true);

    // 显示全局加载遮罩
    this.showGlobalLoading(message);
  }

  /**
   * 隐藏加载状态
   */
  hideLoadingState() {
    // 隐藏加载动画
    this.loadingElements.forEach(element => {
      element.style.display = 'none';
    });

    // 启用表单按钮
    this.disableFormButtons(false);

    // 隐藏全局加载遮罩
    this.hideGlobalLoading();
  }

  /**
   * 显示成功消息
   * @param {string} message - 成功消息
   */
  showSuccessMessage(message) {
    this.showMessage(message, 'success');
  }

  /**
   * 显示错误消息
   * @param {string} message - 错误消息
   */
  showErrorMessage(message) {
    this.showMessage(message, 'error');
  }

  /**
   * 显示警告消息
   * @param {string} message - 警告消息
   */
  showWarningMessage(message) {
    this.showMessage(message, 'warning');
  }

  /**
   * 显示信息消息
   * @param {string} message - 信息消息
   */
  showInfoMessage(message) {
    this.showMessage(message, 'info');
  }

  /**
   * 显示消息
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型(success, error, warning, info)
   */
  showMessage(message, type = 'info') {
    const messageElement = this.createMessageElement(message, type);
    this.messageContainer.appendChild(messageElement);

    // 自动移除消息
    setTimeout(() => {
      this.removeMessage(messageElement);
    }, type === 'error' ? 5000 : 3000);
  }

  /**
   * 创建消息元素
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型
   * @returns {HTMLElement} 消息元素
   */
  createMessageElement(message, type) {
    const messageElement = document.createElement('div');
    messageElement.className = `auth-message auth-message-${type}`;
    messageElement.innerHTML = `
      <div class="message-content">
        <span class="message-icon">${this.getMessageIcon(type)}</span>
        <span class="message-text">${message}</span>
        <button class="message-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
      </div>
    `;

    // 添加样式
    messageElement.style.cssText = `
      margin-bottom: 10px;
      padding: 12px 16px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      background: ${this.getMessageBackground(type)};
      color: ${this.getMessageColor(type)};
      border-left: 4px solid ${this.getMessageBorderColor(type)};
      animation: slideInRight 0.3s ease-out;
    `;

    return messageElement;
  }

  /**
   * 获取消息图标
   * @param {string} type - 消息类型
   * @returns {string} 图标HTML
   */
  getMessageIcon(type) {
    const icons = {
      success: '✓',
      error: '✗',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }

  /**
   * 获取消息背景色
   * @param {string} type - 消息类型
   * @returns {string} 背景色
   */
  getMessageBackground(type) {
    const backgrounds = {
      success: '#f0f9ff',
      error: '#fef2f2',
      warning: '#fffbeb',
      info: '#f0f9ff'
    };
    return backgrounds[type] || backgrounds.info;
  }

  /**
   * 获取消息文字颜色
   * @param {string} type - 消息类型
   * @returns {string} 文字颜色
   */
  getMessageColor(type) {
    const colors = {
      success: '#065f46',
      error: '#991b1b',
      warning: '#92400e',
      info: '#1e40af'
    };
    return colors[type] || colors.info;
  }

  /**
   * 获取消息边框颜色
   * @param {string} type - 消息类型
   * @returns {string} 边框颜色
   */
  getMessageBorderColor(type) {
    const borderColors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };
    return borderColors[type] || borderColors.info;
  }

  /**
   * 移除消息
   * @param {HTMLElement} messageElement - 消息元素
   */
  removeMessage(messageElement) {
    if (messageElement && messageElement.parentNode) {
      messageElement.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        if (messageElement.parentNode) {
          messageElement.parentNode.removeChild(messageElement);
        }
      }, 300);
    }
  }

  /**
   * 更新已登录用户的UI
   * @param {Object} user - 用户信息
   */
  updateUIForLoggedInUser(user) {
    // 显示用户信息
    this.userInfoElements.forEach(element => {
      element.style.display = 'block';
      if (typeof element.textContent !== 'undefined') {
        element.textContent = user.username || user.name || '用户';
      }
    });

    // 隐藏登录元素
    this.loginElements.forEach(element => {
      element.style.display = 'none';
    });

    // 显示登出元素
    this.logoutElements.forEach(element => {
      element.style.display = 'block';
    });

    // 更新页面标题或其他全局UI状态
    this.updateGlobalUIState('logged-in', user);
  }

  /**
   * 更新已登出用户的UI
   */
  updateUIForLoggedOutUser() {
    // 隐藏用户信息
    this.userInfoElements.forEach(element => {
      element.style.display = 'none';
    });

    // 显示登录元素
    this.loginElements.forEach(element => {
      element.style.display = 'block';
    });

    // 隐藏登出元素
    this.logoutElements.forEach(element => {
      element.style.display = 'none';
    });

    // 更新页面标题或其他全局UI状态
    this.updateGlobalUIState('logged-out');
  }

  /**
   * 禁用/启用表单按钮
   * @param {boolean} disabled - 是否禁用
   */
  disableFormButtons(disabled) {
    const buttons = document.querySelectorAll('.auth-form button, .login-form button, .register-form button');
    buttons.forEach(button => {
      button.disabled = disabled;
      if (disabled) {
        button.classList.add('disabled');
      } else {
        button.classList.remove('disabled');
      }
    });
  }

  /**
   * 显示全局加载遮罩
   * @param {string} message - 加载消息
   */
  showGlobalLoading(message) {
    let overlay = document.querySelector('#auth-loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'auth-loading-overlay';
      overlay.innerHTML = `
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <div class="loading-message">${message}</div>
        </div>
      `;
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
      `;
      document.body.appendChild(overlay);
    } else {
      overlay.querySelector('.loading-message').textContent = message;
      overlay.style.display = 'flex';
    }
  }

  /**
   * 隐藏全局加载遮罩
   */
  hideGlobalLoading() {
    const overlay = document.querySelector('#auth-loading-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  /**
   * 更新全局UI状态
   * @param {string} state - UI状态
   * @param {Object} data - 相关数据
   */
  updateGlobalUIState(state, data = {}) {
    // 更新body类名
    document.body.classList.remove('auth-logged-in', 'auth-logged-out');
    document.body.classList.add(`auth-${state}`);

    // 触发自定义事件
    const event = new CustomEvent('authUIStateChange', {
      detail: { state, data }
    });
    document.dispatchEvent(event);
  }

  /**
   * 清除所有消息
   */
  clearAllMessages() {
    if (this.messageContainer) {
      this.messageContainer.innerHTML = '';
    }
  }

  /**
   * 重新初始化UI元素(用于动态内容更新后)
   */
  reinitialize() {
    this.initializeElements();
  }

  /**
   * 销毁UI管理器
   */
  destroy() {
    this.clearAllMessages();
    this.hideLoadingState();
    this.hideGlobalLoading();

    // 移除创建的消息容器
    const messageContainer = document.querySelector('#auth-messages');
    if (messageContainer && messageContainer.parentNode) {
      messageContainer.parentNode.removeChild(messageContainer);
    }

    console.log('AuthUI destroyed');
  }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthUI;
}

// 浏览器环境下的全局暴露
if (typeof window !== 'undefined') {
  window.AuthUI = AuthUI;
}
