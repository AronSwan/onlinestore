/**
 * AI生成代码来源：基于Claude 4 Sonnet重构的错误通知类
 * 职责：错误通知和用户反馈
 * 遵循单一职责原则，专注于用户通知功能
 */
class ErrorNotifier {
  constructor() {
    this.notificationQueue = [];
    this.isProcessing = false;
    this.maxNotifications = 5;
    this.notificationTimeout = 5000; // 5秒
    this.container = null;

    this.init();
  }

  /**
   * 初始化通知系统
   */
  init() {
    this.createNotificationContainer();
    this.setupStyles();
  }

  /**
   * 创建通知容器
   */
  createNotificationContainer() {
    if (document.getElementById('error-notification-container')) {
      this.container = document.getElementById('error-notification-container');
      return;
    }

    this.container = document.createElement('div');
    this.container.id = 'error-notification-container';
    this.container.className = 'error-notification-container';
    document.body.appendChild(this.container);
  }

  /**
   * 设置通知样式
   */
  setupStyles() {
    if (document.getElementById('error-notification-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'error-notification-styles';
    style.textContent = `
      .error-notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
      }
      
      .error-notification {
        background: #fff;
        border-left: 4px solid #e74c3c;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        margin-bottom: 10px;
        padding: 16px;
        animation: slideIn 0.3s ease-out;
        position: relative;
        overflow: hidden;
      }
      
      .error-notification.warning {
        border-left-color: #f39c12;
      }
      
      .error-notification.info {
        border-left-color: #3498db;
      }
      
      .error-notification.success {
        border-left-color: #27ae60;
      }
      
      .error-notification-title {
        font-weight: bold;
        margin-bottom: 8px;
        color: #2c3e50;
      }
      
      .error-notification-message {
        color: #7f8c8d;
        line-height: 1.4;
      }
      
      .error-notification-close {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #bdc3c7;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .error-notification-close:hover {
        color: #7f8c8d;
      }
      
      .error-notification-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: rgba(231, 76, 60, 0.3);
        animation: progress linear;
      }
      
      .error-notification.warning .error-notification-progress {
        background: rgba(243, 156, 18, 0.3);
      }
      
      .error-notification.info .error-notification-progress {
        background: rgba(52, 152, 219, 0.3);
      }
      
      .error-notification.success .error-notification-progress {
        background: rgba(39, 174, 96, 0.3);
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      
      @keyframes progress {
        from {
          width: 100%;
        }
        to {
          width: 0%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 显示错误通知
   * @param {string} message - 错误消息
   * @param {string} type - 通知类型 (error, warning, info, success)
   * @param {string} title - 通知标题
   * @param {number} duration - 显示时长（毫秒）
   */
  showNotification(message, type = 'error', title = null, duration = null) {
    const notification = {
      id: Date.now() + Math.random(),
      message,
      type,
      title: title || this.getDefaultTitle(type),
      duration: duration || this.notificationTimeout,
      timestamp: new Date()
    };

    this.notificationQueue.push(notification);
    this.processQueue();
  }

  /**
   * 获取默认标题
   * @param {string} type - 通知类型
   * @returns {string} 默认标题
   */
  getDefaultTitle(type) {
    const titles = {
      error: '错误',
      warning: '警告',
      info: '信息',
      success: '成功'
    };
    return titles[type] || '通知';
  }

  /**
   * 处理通知队列
   */
  processQueue() {
    if (this.isProcessing || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // 限制同时显示的通知数量
    const currentNotifications = this.container.children.length;
    if (currentNotifications >= this.maxNotifications) {
      // 移除最旧的通知
      const oldestNotification = this.container.firstChild;
      if (oldestNotification) {
        this.removeNotification(oldestNotification);
      }
    }

    const notification = this.notificationQueue.shift();
    this.createNotificationElement(notification);

    this.isProcessing = false;

    // 继续处理队列
    if (this.notificationQueue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * 创建通知元素
   * @param {Object} notification - 通知对象
   */
  createNotificationElement(notification) {
    const element = document.createElement('div');
    element.className = `error-notification ${notification.type}`;
    element.dataset.notificationId = notification.id;

    // 创建标题
    const titleElement = document.createElement('div');
    titleElement.className = 'error-notification-title';
    titleElement.textContent = notification.title;

    // 创建消息
    const messageElement = document.createElement('div');
    messageElement.className = 'error-notification-message';
    messageElement.textContent = notification.message;

    // 创建关闭按钮
    const closeButton = document.createElement('button');
    closeButton.className = 'error-notification-close';
    closeButton.innerHTML = '×';
    closeButton.onclick = () => this.removeNotification(element);

    // 创建进度条
    const progressBar = document.createElement('div');
    progressBar.className = 'error-notification-progress';
    progressBar.style.animationDuration = `${notification.duration}ms`;

    // 组装元素
    element.appendChild(titleElement);
    element.appendChild(messageElement);
    element.appendChild(closeButton);
    element.appendChild(progressBar);

    // 添加到容器
    this.container.appendChild(element);

    // 自动移除
    setTimeout(() => {
      if (element.parentNode) {
        this.removeNotification(element);
      }
    }, notification.duration);
  }

  /**
   * 移除通知
   * @param {HTMLElement} element - 通知元素
   */
  removeNotification(element) {
    element.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }, 300);
  }

  /**
   * 显示用户反馈表单
   * @param {Object} error - 错误对象
   * @param {Object} context - 错误上下文
   */
  showUserFeedbackForm(error, context) {
    // 检查是否已经显示了反馈表单
    if (document.getElementById('error-feedback-modal')) {
      return;
    }

    const modal = this.createFeedbackModal(error, context);
    document.body.appendChild(modal);

    // 显示模态框
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
  }

  /**
   * 创建反馈模态框
   * @param {Object} error - 错误对象
   * @param {Object} context - 错误上下文
   * @returns {HTMLElement} 模态框元素
   */
  createFeedbackModal(error, context) {
    const modal = document.createElement('div');
    modal.id = 'error-feedback-modal';
    modal.innerHTML = `
      <div class="error-feedback-overlay">
        <div class="error-feedback-modal">
          <div class="error-feedback-header">
            <h3>错误反馈</h3>
            <button class="error-feedback-close">×</button>
          </div>
          <div class="error-feedback-body">
            <p>我们检测到一个错误，您的反馈将帮助我们改进系统。</p>
            <div class="error-feedback-field">
              <label>错误描述：</label>
              <textarea id="error-description" placeholder="请描述您遇到的问题..." rows="3"></textarea>
            </div>
            <div class="error-feedback-field">
              <label>重现步骤：</label>
              <textarea id="error-steps" placeholder="请描述如何重现这个问题..." rows="3"></textarea>
            </div>
            <div class="error-feedback-field">
              <label>
                <input type="checkbox" id="include-technical-details"> 
                包含技术详情（帮助开发人员诊断问题）
              </label>
            </div>
          </div>
          <div class="error-feedback-footer">
            <button class="error-feedback-cancel">取消</button>
            <button class="error-feedback-submit">提交反馈</button>
          </div>
        </div>
      </div>
    `;

    // 添加样式
    this.addFeedbackStyles();

    // 绑定事件
    this.bindFeedbackEvents(modal, error, context);

    return modal;
  }

  /**
   * 添加反馈表单样式
   */
  addFeedbackStyles() {
    if (document.getElementById('error-feedback-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'error-feedback-styles';
    style.textContent = `
      .error-feedback-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      #error-feedback-modal.show .error-feedback-overlay {
        opacity: 1;
      }
      
      .error-feedback-modal {
        background: white;
        border-radius: 8px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        transform: scale(0.9);
        transition: transform 0.3s ease;
      }
      
      #error-feedback-modal.show .error-feedback-modal {
        transform: scale(1);
      }
      
      .error-feedback-header {
        padding: 20px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .error-feedback-header h3 {
        margin: 0;
        color: #2c3e50;
      }
      
      .error-feedback-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #bdc3c7;
        padding: 0;
        width: 30px;
        height: 30px;
      }
      
      .error-feedback-body {
        padding: 20px;
      }
      
      .error-feedback-field {
        margin-bottom: 15px;
      }
      
      .error-feedback-field label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
        color: #34495e;
      }
      
      .error-feedback-field textarea {
        width: 100%;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 8px;
        font-family: inherit;
        resize: vertical;
      }
      
      .error-feedback-footer {
        padding: 20px;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      
      .error-feedback-cancel,
      .error-feedback-submit {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      
      .error-feedback-cancel {
        background: #95a5a6;
        color: white;
      }
      
      .error-feedback-submit {
        background: #3498db;
        color: white;
      }
      
      .error-feedback-cancel:hover {
        background: #7f8c8d;
      }
      
      .error-feedback-submit:hover {
        background: #2980b9;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 绑定反馈表单事件
   * @param {HTMLElement} modal - 模态框元素
   * @param {Object} error - 错误对象
   * @param {Object} context - 错误上下文
   */
  bindFeedbackEvents(modal, error, context) {
    const closeBtn = modal.querySelector('.error-feedback-close');
    const cancelBtn = modal.querySelector('.error-feedback-cancel');
    const submitBtn = modal.querySelector('.error-feedback-submit');
    const overlay = modal.querySelector('.error-feedback-overlay');

    const closeFeedback = () => {
      modal.classList.remove('show');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 300);
    };

    closeBtn.onclick = closeFeedback;
    cancelBtn.onclick = closeFeedback;

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeFeedback();
      }
    };

    submitBtn.onclick = () => {
      this.submitFeedback(modal, error, context);
      closeFeedback();
    };
  }

  /**
   * 提交反馈
   * @param {HTMLElement} modal - 模态框元素
   * @param {Object} error - 错误对象
   * @param {Object} context - 错误上下文
   */
  submitFeedback(modal, error, context) {
    const description = modal.querySelector('#error-description').value;
    const steps = modal.querySelector('#error-steps').value;
    const includeTechnical = modal.querySelector('#include-technical-details').checked;

    const feedback = {
      description,
      steps,
      includeTechnical,
      error: includeTechnical ? {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      } : null,
      context: includeTechnical ? context : null,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // 这里可以发送反馈到服务器
    console.log('User feedback submitted:', feedback);

    // 显示感谢消息
    this.showNotification('感谢您的反馈！我们会尽快处理。', 'success', '反馈已提交');
  }

  /**
   * 清除所有通知
   */
  clearAllNotifications() {
    while (this.container.firstChild) {
      this.removeNotification(this.container.firstChild);
    }
    this.notificationQueue = [];
  }

  /**
   * 设置通知配置
   * @param {Object} config - 配置对象
   */
  setConfig(config) {
    if (config.maxNotifications) {
      this.maxNotifications = config.maxNotifications;
    }
    if (config.notificationTimeout) {
      this.notificationTimeout = config.notificationTimeout;
    }
  }

  /**
   * 销毁通知器
   */
  destroy() {
    this.clearAllNotifications();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    // 移除样式
    const styles = document.getElementById('error-notification-styles');
    if (styles) {
      styles.remove();
    }

    const feedbackStyles = document.getElementById('error-feedback-styles');
    if (feedbackStyles) {
      feedbackStyles.remove();
    }
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorNotifier;
}
