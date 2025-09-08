/**
 * 通知系统配置管理器
 * 专门负责通知系统相关的配置常量和设置
 */
class NotificationConfig {
  constructor() {
    this.config = {
      DEFAULT_DURATION: 5000,
      POSITION: 'top-right',
      MAX_NOTIFICATIONS: 5,
      ANIMATION_DURATION: 300,
      AUTO_DISMISS: true,
      SHOW_CLOSE_BUTTON: true,
      NOTIFICATION_TYPES: {
        success: {
          icon: '✓',
          className: 'notification-success',
          duration: 3000
        },
        error: {
          icon: '✗',
          className: 'notification-error',
          duration: 7000
        },
        warning: {
          icon: '⚠',
          className: 'notification-warning',
          duration: 5000
        },
        info: {
          icon: 'ℹ',
          className: 'notification-info',
          duration: 4000
        }
      },
      POSITIONS: {
        'top-left': { top: '20px', left: '20px' },
        'top-right': { top: '20px', right: '20px' },
        'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)' },
        'bottom-left': { bottom: '20px', left: '20px' },
        'bottom-right': { bottom: '20px', right: '20px' },
        'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)' }
      }
    };

    Object.freeze(this.config);
  }

  /**
   * 获取配置值
   * @param {string} key - 配置键
   * @param {*} defaultValue - 默认值
   * @returns {*} 配置值
   */
  get(key, defaultValue) {
    return Object.prototype.hasOwnProperty.call(this.config, key) ? this.config[key] : defaultValue;
  }

  /**
   * 检查配置键是否存在
   * @param {string} key - 配置键
   * @returns {boolean} 是否存在
   */
  has(key) {
    return Object.prototype.hasOwnProperty.call(this.config, key);
  }

  /**
   * 获取所有配置
   * @returns {object} 配置对象的深拷贝
   */
  getAll() {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * 获取通知类型配置
   * @param {string} type - 通知类型 (success, error, warning, info)
   * @returns {object} 通知类型配置
   */
  getNotificationType(type) {
    return this.config.NOTIFICATION_TYPES[type] || this.config.NOTIFICATION_TYPES.info;
  }

  /**
   * 获取所有通知类型
   * @returns {object} 所有通知类型配置
   */
  getAllNotificationTypes() {
    return JSON.parse(JSON.stringify(this.config.NOTIFICATION_TYPES));
  }

  /**
   * 获取位置配置
   * @param {string} position - 位置名称
   * @returns {object} 位置样式配置
   */
  getPositionStyle(position = null) {
    const pos = position || this.config.POSITION;
    return this.config.POSITIONS[pos] || this.config.POSITIONS['top-right'];
  }

  /**
   * 获取所有可用位置
   * @returns {string[]} 位置名称数组
   */
  getAvailablePositions() {
    return Object.keys(this.config.POSITIONS);
  }

  /**
   * 获取默认配置
   * @returns {object} 默认配置
   */
  getDefaults() {
    return {
      duration: this.config.DEFAULT_DURATION,
      position: this.config.POSITION,
      maxNotifications: this.config.MAX_NOTIFICATIONS,
      animationDuration: this.config.ANIMATION_DURATION,
      autoDismiss: this.config.AUTO_DISMISS,
      showCloseButton: this.config.SHOW_CLOSE_BUTTON
    };
  }

  /**
   * 验证通知类型是否有效
   * @param {string} type - 通知类型
   * @returns {boolean} 是否有效
   */
  isValidType(type) {
    return Object.prototype.hasOwnProperty.call(this.config.NOTIFICATION_TYPES, type);
  }

  /**
   * 验证位置是否有效
   * @param {string} position - 位置名称
   * @returns {boolean} 是否有效
   */
  isValidPosition(position) {
    return Object.prototype.hasOwnProperty.call(this.config.POSITIONS, position);
  }

  /**
   * 获取通知的完整配置
   * @param {string} type - 通知类型
   * @param {object} options - 自定义选项
   * @returns {object} 完整配置
   */
  getNotificationConfig(type, options = {}) {
    const typeConfig = this.getNotificationType(type);
    const defaults = this.getDefaults();

    return {
      ...defaults,
      ...typeConfig,
      ...options,
      position: this.getPositionStyle(options.position)
    };
  }
}

// 创建全局实例
const notificationConfig = new NotificationConfig();

// 导出配置管理器
if (typeof window !== 'undefined') {
  window.NotificationConfig = NotificationConfig;
  window.notificationConfig = notificationConfig;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NotificationConfig, notificationConfig };
}
