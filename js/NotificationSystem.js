// AI生成代码来源：基于SOLID原则重构的通知系统
/**
 * 通知系统类
 * 专门负责应用程序中的通知显示和管理
 * 符合单一职责原则(SRP)和开闭原则(OCP)
 *
 * @author AI Assistant
 * @version 1.0.0
 * @created 2025-01-15
 */

class NotificationSystem {
  constructor(options = {}) {
    this.config = {
      defaultDuration: options.defaultDuration || 3000,
      maxMessageLength: options.maxMessageLength || 200,
      maxNotifications: options.maxNotifications || 5,
      position: options.position || 'top-right',
      enableSound: options.enableSound || false,
      enableAnimation: options.enableAnimation !== false,
      ...options
    };

    this.notifications = new Map();
    this.container = null;
    this.soundEnabled = this.config.enableSound;

    this.init();
  }

  /**
   * 初始化通知系统
   * @private
   */
  init() {
    this.createContainer();
    this.setupStyles();
  }

  /**
   * 创建通知容器
   * @private
   */
  createContainer() {
    if (this.container) {return;}

    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    this.container.className = `notification-container position-${this.config.position}`;

    // 设置容器样式
    Object.assign(this.container.style, {
      position: 'fixed',
      zIndex: '10000',
      pointerEvents: 'none',
      maxHeight: '80vh',
      overflow: 'hidden'
    });

    // 根据位置设置样式
    this.setContainerPosition();

    document.body.appendChild(this.container);
  }

  /**
   * 设置容器位置
   * @private
   */
  setContainerPosition() {
    const positions = {
      'top-right': { top: '20px', right: '20px' },
      'top-left': { top: '20px', left: '20px' },
      'bottom-right': { bottom: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)' },
      'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)' }
    };

    const position = positions[this.config.position] || positions['top-right'];
    Object.assign(this.container.style, position);
  }

  /**
   * 设置通知样式
   * @private
   */
  setupStyles() {
    if (document.getElementById('notification-styles')) {return;}

    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        margin-bottom: 10px;
        padding: 16px;
        min-width: 300px;
        max-width: 400px;
        pointer-events: auto;
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
      }
      
      .notification.success {
        border-left: 4px solid #10b981;
        background: #f0fdf4;
      }
      
      .notification.error {
        border-left: 4px solid #ef4444;
        background: #fef2f2;
      }
      
      .notification.warning {
        border-left: 4px solid #f59e0b;
        background: #fffbeb;
      }
      
      .notification.info {
        border-left: 4px solid #3b82f6;
        background: #eff6ff;
      }
      
      .notification-content {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }
      
      .notification-icon {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        margin-top: 2px;
      }
      
      .notification-message {
        flex: 1;
        font-size: 14px;
        line-height: 1.4;
        color: #374151;
      }
      
      .notification-close {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #6b7280;
        padding: 4px;
        line-height: 1;
      }
      
      .notification-close:hover {
        color: #374151;
      }
      
      .notification-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: rgba(0, 0, 0, 0.1);
        transition: width linear;
      }
      
      .notification.success .notification-progress {
        background: #10b981;
      }
      
      .notification.error .notification-progress {
        background: #ef4444;
      }
      
      .notification.warning .notification-progress {
        background: #f59e0b;
      }
      
      .notification.info .notification-progress {
        background: #3b82f6;
      }
      
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      
      .notification.entering {
        animation: slideInRight 0.3s ease;
      }
      
      .notification.leaving {
        animation: slideOutRight 0.3s ease;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * 显示通知
   * @param {string} message - 通知消息
   * @param {string} type - 通知类型
   * @param {Object} options - 选项
   * @returns {string} 通知ID
   */
  show(message, type = 'info', options = {}) {
    // 验证参数
    if (!this.validateMessage(message)) {
      console.warn('Invalid notification message');
      return null;
    }

    if (!this.validateType(type)) {
      console.warn(`Invalid notification type: ${type}, using 'info'`);
      type = 'info';
    }

    // 生成唯一ID
    const id = this.generateId();

    // 合并选项
    const config = {
      duration: this.config.defaultDuration,
      showCloseButton: true,
      showProgress: true,
      ...options
    };

    // 限制消息长度
    if (message.length > this.config.maxMessageLength) {
      message = message.substring(0, this.config.maxMessageLength - 3) + '...';
    }

    // 检查通知数量限制
    this.enforceMaxNotifications();

    // 创建通知元素
    const notification = this.createNotificationElement(id, message, type, config);

    // 添加到容器
    this.container.appendChild(notification);

    // 存储通知信息
    this.notifications.set(id, {
      element: notification,
      type,
      message,
      config,
      createdAt: Date.now()
    });

    // 添加动画
    if (this.config.enableAnimation) {
      notification.classList.add('entering');
      setTimeout(() => {
        notification.classList.remove('entering');
      }, 300);
    }

    // 设置自动移除
    if (config.duration > 0) {
      this.scheduleRemoval(id, config.duration);
    }

    // 播放声音
    if (this.soundEnabled) {
      this.playNotificationSound(type);
    }

    return id;
  }

  /**
   * 创建通知元素
   * @param {string} id - 通知ID
   * @param {string} message - 消息
   * @param {string} type - 类型
   * @param {Object} config - 配置
   * @returns {HTMLElement} 通知元素
   * @private
   */
  createNotificationElement(id, message, type, config) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.dataset.id = id;

    const content = document.createElement('div');
    content.className = 'notification-content';

    // 添加图标
    const icon = this.createIcon(type);
    content.appendChild(icon);

    // 添加消息
    const messageEl = document.createElement('div');
    messageEl.className = 'notification-message';
    messageEl.textContent = message;
    content.appendChild(messageEl);

    notification.appendChild(content);

    // 添加关闭按钮
    if (config.showCloseButton) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'notification-close';
      closeBtn.innerHTML = '×';
      closeBtn.onclick = () => this.remove(id);
      notification.appendChild(closeBtn);
    }

    // 添加进度条
    if (config.showProgress && config.duration > 0) {
      const progress = document.createElement('div');
      progress.className = 'notification-progress';
      progress.style.width = '100%';
      notification.appendChild(progress);

      // 动画进度条
      setTimeout(() => {
        progress.style.transition = `width ${config.duration}ms linear`;
        progress.style.width = '0%';
      }, 50);
    }

    return notification;
  }

  /**
   * 创建图标
   * @param {string} type - 通知类型
   * @returns {HTMLElement} 图标元素
   * @private
   */
  createIcon(type) {
    const icon = document.createElement('div');
    icon.className = 'notification-icon';

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    icon.textContent = icons[type] || icons.info;
    return icon;
  }

  /**
   * 移除通知
   * @param {string} id - 通知ID
   */
  remove(id) {
    const notificationData = this.notifications.get(id);
    if (!notificationData) {return;}

    const { element } = notificationData;

    if (this.config.enableAnimation) {
      element.classList.add('leaving');
      setTimeout(() => {
        this.removeElement(id);
      }, 300);
    } else {
      this.removeElement(id);
    }
  }

  /**
   * 移除元素
   * @param {string} id - 通知ID
   * @private
   */
  removeElement(id) {
    const notificationData = this.notifications.get(id);
    if (!notificationData) {return;}

    const { element } = notificationData;
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }

    this.notifications.delete(id);
  }

  /**
   * 安排移除
   * @param {string} id - 通知ID
   * @param {number} duration - 持续时间
   * @private
   */
  scheduleRemoval(id, duration) {
    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  /**
   * 强制执行最大通知数量限制
   * @private
   */
  enforceMaxNotifications() {
    if (this.notifications.size >= this.config.maxNotifications) {
      // 移除最旧的通知
      const oldestId = Array.from(this.notifications.keys())[0];
      this.remove(oldestId);
    }
  }

  /**
   * 验证消息
   * @param {string} message - 消息
   * @returns {boolean} 是否有效
   * @private
   */
  validateMessage(message) {
    return typeof message === 'string' && message.trim().length > 0;
  }

  /**
   * 验证类型
   * @param {string} type - 类型
   * @returns {boolean} 是否有效
   * @private
   */
  validateType(type) {
    const validTypes = ['success', 'error', 'warning', 'info'];
    return validTypes.includes(type);
  }

  /**
   * 生成唯一ID
   * @returns {string} 唯一ID
   * @private
   */
  generateId() {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 播放通知声音
   * @param {string} type - 通知类型
   * @private
   */
  playNotificationSound(type) {
    // 简单的音频反馈
    if (window.AudioContext || window.webkitAudioContext) {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // 根据类型设置不同频率
        const frequencies = {
          success: 800,
          error: 400,
          warning: 600,
          info: 500
        };

        oscillator.frequency.setValueAtTime(frequencies[type] || 500, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (error) {
        console.warn('Failed to play notification sound:', error);
      }
    }
  }

  /**
   * 清除所有通知
   */
  clear() {
    Array.from(this.notifications.keys()).forEach(id => {
      this.remove(id);
    });
  }

  /**
   * 获取通知统计
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      total: this.notifications.size,
      byType: Array.from(this.notifications.values()).reduce((acc, notification) => {
        acc[notification.type] = (acc[notification.type] || 0) + 1;
        return acc;
      }, {})
    };
  }

  /**
   * 销毁通知系统
   */
  destroy() {
    this.clear();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.notifications.clear();
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationSystem;
}

if (typeof window !== 'undefined') {
  window.NotificationSystem = NotificationSystem;
}
