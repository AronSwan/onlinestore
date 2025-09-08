/* global Utils */
/**
 * 错误处理和用户反馈系统
 * 提供全局错误处理、用户通知、日志记录等功能
 * 支持多种错误类型的处理和用户友好的错误提示
 *
 * @class ErrorHandler
 * @description 主要功能包括：
 * - 全局JavaScript错误捕获
 * - Promise拒绝错误处理
 * - 资源加载错误监听
 * - 用户通知系统
 * - 错误日志记录和导出
 * - 确认对话框和加载状态显示
 *
 * @example
 * // 创建全局错误处理器实例
 * const errorHandler = new ErrorHandler();
 *
 * // 手动处理错误
 * errorHandler.handleError({
 *   type: 'validation',
 *   message: '输入数据无效'
 * });
 *
 * // 显示成功通知
 * errorHandler.showSuccess('操作完成');
 */

class ErrorHandler {
  /**
     * 创建错误处理器实例
     * 初始化错误日志、通知容器和配置参数
     * 自动设置全局错误监听器和初始化系统组件
     *
     * @constructor
     * @public
     */
  constructor() {
    this.errorLog = [];
    this.maxLogSize = window.CONSTANTS?.ERROR_HANDLING?.LIMITS?.MAX_ERROR_LOGS || 100;
    this.notificationContainer = null;
    this.init();
  }

  /**
     * 初始化错误处理系统
     * 按顺序执行以下初始化步骤：
     * 1. 创建通知容器元素
     * 2. 设置全局错误监听器
     * 3. 从本地存储加载历史错误日志
     *
     * @private
     * @returns {void}
     */
  init() {
    this.createNotificationContainer();
    this.setupGlobalErrorHandlers();
    this.loadErrorLog();
  }

  /**
     * 创建通知容器
     * 在页面中创建一个固定位置的通知容器元素
     * 用于显示各种类型的用户通知消息
     * 如果容器已存在则不重复创建
     *
     * @private
     * @returns {void}
     */
  createNotificationContainer() {
    if (!this.notificationContainer) {
      this.notificationContainer = document.createElement('div');
      this.notificationContainer.id = 'notification-container';
      this.notificationContainer.className = 'notification-container';
      document.body.appendChild(this.notificationContainer);
    }
  }

  /**
     * 设置全局错误处理器
     * 为以下事件类型添加全局监听器：
     * 1. JavaScript运行时错误 (window.error)
     * 2. 未处理的Promise拒绝 (unhandledrejection)
     * 3. 资源加载失败 (图片、脚本、样式等)
     * 包含特殊的过滤逻辑以避免误报无效错误
     *
     * @private
     * @returns {void}
     */
  setupGlobalErrorHandlers() {
    // JavaScript错误处理
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        timestamp: new Date().toISOString()
      });
    });

    // Promise拒绝处理
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'promise',
        message: event.reason?.message || '未处理的Promise拒绝',
        reason: event.reason,
        timestamp: new Date().toISOString()
      });
    });

    // 资源加载错误处理
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        // 添加更详细的调试信息
        console.log('Resource loading error details:', {
          element: event.target,
          tagName: event.target.tagName,
          src: event.target.src,
          href: event.target.href,
          id: event.target.id,
          className: event.target.className,
          outerHTML: event.target.outerHTML
        });

        // 如果是img元素且src为空或指向页面URL，跳过错误处理
        if (event.target.tagName === 'IMG' &&
                    (!event.target.src || event.target.src === window.location.href ||
                        event.target.src.includes('ide_webview_request_time'))) {
          console.warn('Skipping error for img with empty or invalid src:', event.target);
          return;
        }

        this.handleError({
          type: 'resource',
          message: `资源加载失败: ${event.target.src || event.target.href}`,
          element: event.target.tagName,
          src: event.target.src || event.target.href,
          timestamp: new Date().toISOString()
        });
      }
    }, true);
  }

  /**
     * 处理错误
     * 根据错误类型显示相应的用户通知并记录错误信息
     * 支持多种错误类型，为每种类型提供适当的用户反馈
     * 在开发环境中输出详细的调试信息
     *
     * @public
     * @param {Object} errorInfo - 错误信息对象
     * @param {string} errorInfo.type - 错误类型 ('javascript'|'promise'|'resource'|'network'|'validation'|'auth'|'permission'|'storage'|'order'|'payment'|'ui')
     * @param {string} errorInfo.message - 错误消息
     * @param {string} [errorInfo.operation] - 操作描述
     * @param {string} [errorInfo.component] - 组件名称
     * @param {Error} [errorInfo.error] - 原始错误对象
     * @param {string} [errorInfo.filename] - 错误文件名
     * @param {number} [errorInfo.lineno] - 错误行号
     * @param {number} [errorInfo.colno] - 错误列号
     * @returns {void}
     *
     * @example
     * errorHandler.handleError({
     *   type: 'validation',
     *   message: '用户输入格式错误',
     *   operation: '表单提交',
     *   component: 'LoginForm'
     * });
     */
  handleError(errorInfo) {
    // 记录错误
    this.logError(errorInfo);

    // 根据错误类型显示不同的用户通知
    switch (errorInfo.type) {
    case 'javascript':
      this.showNotification('系统出现了一个错误，我们正在处理中', 'error');
      break;
    case 'promise':
      this.showNotification('操作失败，请稍后重试', 'error');
      break;
    case 'resource':
      this.showNotification('资源加载失败，请检查网络连接', 'warning');
      break;
    case 'network':
      this.showNotification('网络连接异常，请检查网络设置', 'error');
      break;
    case 'validation':
      this.showNotification(errorInfo.message || '输入数据有误，请检查后重试', 'warning');
      break;
    case 'auth':
      this.showNotification(errorInfo.message || '身份验证失败，请重新登录', 'error');
      break;
    case 'permission':
      this.showNotification('您没有权限执行此操作', 'warning');
      break;
    case 'storage':
      this.showNotification('数据存储失败，请检查浏览器设置', 'warning');
      break;
    case 'order':
      this.showNotification(errorInfo.message || '订单操作失败，请重试', 'error');
      break;
    case 'payment':
      this.showNotification(errorInfo.message || '支付处理失败，请重试', 'error');
      break;
    case 'ui':
      this.showNotification(errorInfo.message || 'UI操作失败，请重试', 'error');
      break;
    default:
      this.showNotification('发生了未知错误，请联系客服', 'error');
    }

    // 在开发环境下输出详细错误信息
    if (this.isDevelopment()) {
      console.error('错误详情:', errorInfo);
    }
  }

  /**
     * 记录错误到本地存储
     * 将错误信息添加到内存日志数组中，并添加额外的环境信息
     * 自动管理日志大小，超出限制时移除最旧的记录
     * 同步保存到浏览器本地存储以便持久化
     *
     * @private
     * @param {Object} errorInfo - 错误信息对象
     * @returns {void}
     */
  logError(errorInfo) {
    this.errorLog.unshift({
      id: this.generateId(),
      ...errorInfo,
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // 限制日志大小
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    this.saveErrorLog();
  }

  /**
     * 显示用户通知
     * 创建和显示一个带有图标、消息和关闭按钮的通知元素
     * 支持多种通知类型，每种类型有不同的颜色和图标
     * 包含显示和隐藏动画效果，支持自动或手动关闭
     *
     * @public
     * @param {string} message - 通知消息内容
     * @param {string} [type='info'] - 通知类型 ('success'|'info'|'warning'|'error'|'loading')
     * @param {number} [duration=5000] - 显示时长（毫秒），0表示不自动关闭
     * @returns {HTMLElement} 创建的通知元素，用于手动控制
     *
     * @example
     * // 显示成功通知
     * const notification = errorHandler.showNotification('操作成功', 'success', 3000);
     *
     * // 显示不自动关闭的错误通知
     * const errorNotification = errorHandler.showNotification('严重错误', 'error', 0);
     */
  showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    // 安全地转义消息内容，防止XSS攻击
    const safeMessage = this.escapeHtml(message);

    const notificationHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    ${this.getNotificationIcon(type)}
                </div>
                <div class="notification-message">${safeMessage}</div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        `;

    Utils.setElementHTML(notification, notificationHTML, true); // 内部生成的安全HTML
    this.notificationContainer.appendChild(notification);

    // 添加显示动画
    setTimeout(() => {
      notification.classList.add('notification-show');
    }, 10);

    // 自动移除通知
    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification);
      }, duration);
    }

    return notification;
  }

  /**
     * 移除通知
     * 安全地移除通知元素，包含淡出动画效果
     * 先添加CSS类触发隐藏动画，然后延迟移除DOM元素
     * 包含完整的错误处理以避免异常
     *
     * @private
     * @param {HTMLElement} notification - 要移除的通知元素
     * @returns {void}
     */
  removeNotification(notification) {
    if (notification && notification.parentElement) {
      notification.classList.add('notification-hide');
      setTimeout(() => {
        if (notification.parentElement) {
          notification.parentElement.removeChild(notification);
        }
      }, 300);
    }
  }

  /**
     * 获取通知图标
     * 根据通知类型返回相应的SVG图标HTML字符串
     * 支持成功、信息、警告、错误和加载状态图标
     * 使用内联SVG确保图标即时显示不依赖外部资源
     *
     * @private
     * @param {string} type - 通知类型 ('success'|'info'|'warning'|'error'|'loading')
     * @returns {string} SVG图标的HTML字符串
     */
  getNotificationIcon(type) {
    const icons = {
      success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`,
      info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`,
      warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18A2 2 0 003.54 21H20.46A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`,
      error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`,
      loading: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
            </path></svg>`
    };
    return icons[type] || icons.info;
  }

  /**
     * 显示成功消息
     * showNotification方法的快捷方式，专用于显示成功类型的通知
     * 使用绿色主题和适当的成功图标
     *
     * @public
     * @param {string} message - 成功消息内容
     * @param {number} [duration=3000] - 显示时长（毫秒）
     * @returns {HTMLElement} 创建的通知元素
     *
     * @example
     * errorHandler.showSuccess('保存成功！');
     */
  showSuccess(message, duration = null) {
    const defaultDuration = window.CONSTANTS?.ERROR_HANDLING?.NOTIFICATION_DURATION?.SUCCESS || 3000;
    return this.showNotification(message, 'success', duration || defaultDuration);
  }

  /**
     * 显示信息消息
     * showNotification方法的快捷方式，专用于显示一般信息类型的通知
     * 使用蓝色主题和信息图标
     *
     * @public
     * @param {string} message - 信息消息内容
     * @param {number} [duration=4000] - 显示时长（毫秒）
     * @returns {HTMLElement} 创建的通知元素
     *
     * @example
     * errorHandler.showInfo('正在加载数据...');
     */
  showInfo(message, duration = null) {
    const defaultDuration = window.CONSTANTS?.ERROR_HANDLING?.NOTIFICATION_DURATION?.INFO || 4000;
    return this.showNotification(message, 'info', duration || defaultDuration);
  }

  /**
     * 显示警告消息
     * showNotification方法的快捷方式，专用于显示警告类型的通知
     * 使用橙色主题和警告图标，显示时间相对较长
     *
     * @public
     * @param {string} message - 警告消息内容
     * @param {number} [duration=5000] - 显示时长（毫秒）
     * @returns {HTMLElement} 创建的通知元素
     *
     * @example
     * errorHandler.showWarning('网络连接不稳定');
     */
  showWarning(message, duration = null) {
    const defaultDuration = window.CONSTANTS?.ERROR_HANDLING?.NOTIFICATION_DURATION?.WARNING || 5000;
    return this.showNotification(message, 'warning', duration || defaultDuration);
  }

  /**
     * 显示错误消息
     * showNotification方法的快捷方式，专用于显示错误类型的通知
     * 使用红色主题和错误图标，显示时间最长
     *
     * @public
     * @param {string} message - 错误消息内容
     * @param {number} [duration=6000] - 显示时长（毫秒）
     * @returns {HTMLElement} 创建的通知元素
     *
     * @example
     * errorHandler.showError('保存失败，请重试');
     */
  showError(message, duration = null) {
    const defaultDuration = window.CONSTANTS?.ERROR_HANDLING?.NOTIFICATION_DURATION?.ERROR || 6000;
    return this.showNotification(message, 'error', duration || defaultDuration);
  }

  /**
     * 显示加载状态
     * 创建一个包含动画加载指示器的通知
     * 用于在异步操作进行时给用户反馈
     * 不会自动消失，需要手动调用hideLoading移除
     *
     * @public
     * @param {string} [message='正在处理中...'] - 加载消息
     * @returns {HTMLElement} 加载通知元素，用于hideLoading方法
     *
     * @example
     * const loading = errorHandler.showLoading('正在保存...');
     * // 执行异步操作
     * await saveData();
     * errorHandler.hideLoading(loading);
     */
  showLoading(message = '正在处理中...') {
    const notification = document.createElement('div');
    notification.className = 'notification notification-loading';
    const notificationHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <div class="loading-spinner"></div>
                </div>
                <div class="notification-message">${message}</div>
            </div>
        `;

    Utils.setElementHTML(notification, notificationHTML, true); // 内部生成的安全HTML
    this.notificationContainer.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('notification-show');
    }, 10);

    return notification;
  }

  /**
     * 隐藏加载状态
     * 移除之前由showLoading方法创建的加载通知
     * 安全地检查元素是否存在并移除
     *
     * @public
     * @param {HTMLElement} loadingNotification - 由showLoading返回的加载通知元素
     * @returns {void}
     *
     * @example
     * const loading = errorHandler.showLoading();
     * // ... 执行操作
     * errorHandler.hideLoading(loading);
     */
  hideLoading(loadingNotification) {
    if (loadingNotification) {
      this.removeNotification(loadingNotification);
    }
  }

  /**
     * 显示确认对话框
     * 创建一个模态对话框用于获取用户确认
     * 返回Promise，解析为用户的选择结果（true/false）
     * 支持点击背景关闭和键盘交互
     *
     * @public
     * @param {string} message - 确认消息内容
     * @param {string} [title='确认操作'] - 对话框标题
     * @returns {Promise<boolean>} 用户选择结果，true表示确认，false表示取消
     *
     * @example
     * const confirmed = await errorHandler.showConfirm('确定要删除这个文件吗？');
     * if (confirmed) {
     *   deleteFile();
     * }
     */
  showConfirm(message, title = '确认操作') {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal confirm-modal';
      const modalHTML = `
                <div class="modal-content confirm-modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary cancel-btn">取消</button>
                        <button class="btn btn-primary confirm-btn">确认</button>
                    </div>
                </div>
            `;

      Utils.setElementHTML(modal, modalHTML, true); // 内部生成的安全HTML
      document.body.appendChild(modal);
      modal.style.display = 'flex';

      const confirmBtn = modal.querySelector('.confirm-btn');
      const cancelBtn = modal.querySelector('.cancel-btn');

      const cleanup = () => {
        document.body.removeChild(modal);
      };

      confirmBtn.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      // 点击背景关闭
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          cleanup();
          resolve(false);
        }
      });
    });
  }

  /**
     * 处理存储错误
     * @param {Error} error - 错误对象
     * @param {string} operation - 操作描述
     */
  handleStorageError(error, operation = '存储操作') {
    const errorInfo = {
      type: 'storage',
      operation: operation,
      message: error.message || `${operation}失败`,
      error: error,
      timestamp: new Date().toISOString()
    };

    this.handleError(errorInfo);
    return errorInfo;
  }

  /**
     * 处理API错误
     * @param {Error|Response} error - 错误对象或响应对象
     * @param {string} operation - 操作描述
     */
  async handleApiError(error, operation = '操作') {
    const errorInfo = {
      type: 'api',
      operation: operation,
      timestamp: new Date().toISOString()
    };

    if (error instanceof Response) {
      // HTTP响应错误
      errorInfo.status = error.status;
      errorInfo.statusText = error.statusText;

      try {
        const errorData = await error.json();
        errorInfo.message = errorData.message || `${operation}失败`;
        errorInfo.details = errorData;
      } catch {
        errorInfo.message = `${operation}失败 (${error.status})`;
      }

      // 根据状态码显示不同消息
      switch (error.status) {
      case 400:
        errorInfo.type = 'validation';
        break;
      case 401:
        errorInfo.type = 'auth';
        break;
      case 403:
        errorInfo.type = 'permission';
        break;
      case 404:
        errorInfo.message = '请求的资源不存在';
        break;
      case 500:
        errorInfo.message = '服务器内部错误，请稍后重试';
        break;
      case 503:
        errorInfo.message = '服务暂时不可用，请稍后重试';
        break;
      default:
        errorInfo.message = `${operation}失败，请稍后重试`;
      }
    } else if (error instanceof Error) {
      // JavaScript错误
      errorInfo.message = error.message;
      errorInfo.stack = error.stack;

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorInfo.type = 'network';
        errorInfo.message = '网络连接失败，请检查网络设置';
      }
    } else {
      // 其他类型错误
      errorInfo.message = `${operation}失败`;
      errorInfo.details = error;
    }

    this.handleError(errorInfo);
    return errorInfo;
  }

  /**
     * 获取错误日志
     * @param {number} limit - 限制数量
     * @returns {Array} 错误日志数组
     */
  getErrorLog(limit = null) {
    const defaultLimit = window.CONSTANTS?.ERROR_HANDLING?.LIMITS?.DEFAULT_LOG_LIMIT || 50;
    return this.errorLog.slice(0, limit || defaultLimit);
  }

  /**
     * 清空错误日志
     */
  clearErrorLog() {
    this.errorLog = [];
    this.saveErrorLog();
  }

  /**
     * 导出错误日志
     * @returns {string} JSON格式的错误日志
     */
  exportErrorLog() {
    return JSON.stringify({
      exportTime: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errors: this.errorLog
    }, null, 2);
  }

  /**
     * 保存错误日志到本地存储
     */
  saveErrorLog() {
    try {
      localStorage.setItem('errorLog', JSON.stringify(this.errorLog));
    } catch (error) {
      console.warn('无法保存错误日志到本地存储:', error);
    }
  }

  /**
     * 从本地存储加载错误日志
     */
  loadErrorLog() {
    try {
      const savedLog = localStorage.getItem('errorLog');
      if (savedLog) {
        this.errorLog = JSON.parse(savedLog);
      }
    } catch (error) {
      console.warn('无法从本地存储加载错误日志:', error);
      this.errorLog = [];
    }
  }

  /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
  generateId() {
    return Utils.generateErrorId();
  }

  /**
   * HTML转义函数，防止XSS攻击
   * @param {string} str - 需要转义的字符串
   * @returns {string} 转义后的安全字符串
   */
  escapeHtml(str) {
    if (typeof str !== 'string') {return str;}
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
     * 检查是否为开发环境
     * @returns {boolean} 是否为开发环境
     */
  isDevelopment() {
    return window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.includes('dev');
  }

  /**
     * 设置错误处理配置
     * @param {Object} config - 配置选项
     */
  setConfig(config) {
    if (config.maxLogSize) {
      this.maxLogSize = config.maxLogSize;
    }
  }

  /**
     * 销毁错误处理器
     */
  destroy() {
    if (this.notificationContainer && this.notificationContainer.parentElement) {
      this.notificationContainer.parentElement.removeChild(this.notificationContainer);
    }
    this.errorLog = [];
  }
}

// 创建全局错误处理器实例
window.ErrorHandler = ErrorHandler;

// 如果在模块环境中，导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
}
