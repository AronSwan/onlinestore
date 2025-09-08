// AI生成代码来源：基于SOLID原则重构的工具函数模块
// 工具函数模块 - 重构为符合单一职责原则的多个专职类

// 常量定义
const NOTIFICATION_DURATION = 3000;
const _API_DELAY = 3000; // 预留用于API延迟配置
const _DEFAULT_MAX_HEIGHT_VH = 80; // 通知容器默认最大高度（视口高度百分比）
const SESSION_ID_LENGTH = 18; // 会话ID长度
const ERROR_ID_LENGTH = 18; // 错误ID长度

/**
 * HTML安全处理工具类
 * 专门负责HTML转义和安全处理
 * 符合单一职责原则(SRP)
 */
class HTMLSanitizer {
  /**
   * HTML转义函数，防止XSS攻击
   * @param {string} str - 需要转义的字符串
   * @returns {string} 转义后的安全字符串
   */
  static escapeHtml(str) {
    if (typeof str !== 'string') { return str; }
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * 安全地设置innerHTML，自动转义用户输入
   * @param {HTMLElement} element - 目标元素
   * @param {string} html - HTML内容
   * @param {boolean} trusted - 是否为可信内容（默认false）
   */
  static safeSetInnerHTML(element, html, trusted = false) {
    if (!element) { return; }
    if (trusted) {
      element.innerHTML = html;
    } else {
      element.textContent = html;
    }
  }

  /**
   * 安全地设置元素的HTML内容
   * @param {HTMLElement} element - 目标元素
   * @param {string} html - HTML内容
   * @param {boolean} allowHTML - 是否允许HTML内容（默认false）
   */
  static setElementHTML(element, html, allowHTML = false) {
    if (!element || typeof html !== 'string') { return; }

    if (allowHTML) {
      // 如果明确允许HTML，使用DOMPurify清理（如果可用）
      if (window.DOMPurify) {
        element.innerHTML = window.DOMPurify.sanitize(html);
      } else {
        // 基本的HTML清理
        const cleanHTML = html
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
        element.innerHTML = cleanHTML;
      }
    } else {
      // 默认使用textContent，防止XSS
      element.textContent = html;
    }
  }

  /**
   * 安全地创建DOM元素
   * @param {string} tagName - 标签名
   * @param {Object} attributes - 属性对象
   * @param {string} textContent - 文本内容
   * @returns {HTMLElement}
   */
  static createSafeElement(tagName, attributes = {}, textContent = '') {
    const element = document.createElement(tagName);

    // 设置属性
    Object.entries(attributes).forEach(([key, value]) => {
      if (key.startsWith('on')) {
        // 跳过事件处理器属性，防止XSS
        console.warn(`Skipping event handler attribute: ${key}`);
        return;
      }
      element.setAttribute(key, value);
    });

    // 设置文本内容
    if (textContent) {
      element.textContent = textContent;
    }

    return element;
  }
}

/**
 * ID生成器工具类
 * 专门负责各种ID的生成
 * 符合单一职责原则(SRP)
 */
class IDGenerator {
  /**
   * 安全地生成随机ID
   * @param {string} prefix - ID前缀
   * @param {number} length - 随机部分长度（默认16）
   * @returns {string}
   */
  static generateSecureId(prefix = '', length = 16) {
    const randomBytes = new Uint8Array(Math.ceil(length / 2));
    crypto.getRandomValues(randomBytes);
    const randomString = Array.from(randomBytes, byte =>
      byte.toString(16).padStart(2, '0')
    ).join('').substr(0, length);

    return prefix ? `${prefix}_${Date.now()}_${randomString}` : `${Date.now()}_${randomString}`;
  }

  /**
   * 生成安全的会话ID
   * @returns {string}
   */
  static generateSessionId() {
    return this.generateSecureId('session', SESSION_ID_LENGTH);
  }

  /**
   * 生成安全的错误ID
   * @returns {string}
   */
  static generateErrorId() {
    return this.generateSecureId('err', ERROR_ID_LENGTH);
  }
}

/**
 * 空邮件地址提示通知
 * @deprecated 使用 NotificationSystem 替代
 */
function showEmptyEmailNotification() {
  try {
    // 使用新的通知系统
    if (window.notificationSystem) {
      return window.notificationSystem.show('请输入邮箱地址', 'warning', {
        duration: NOTIFICATION_DURATION,
        position: 'top-right',
        showCloseButton: true,
        customClass: 'empty-email-notification'
      });
    }

    // 降级处理：使用全局错误处理器
    if (window.errorHandler && window.errorHandler.showNotification) {
      return window.errorHandler.showNotification('请输入邮箱地址', 'warning');
    }

    // 最后降级：控制台输出
    console.warn('NotificationSystem not available, 请输入邮箱地址');

  } catch (error) {
    console.error('Failed to show empty email notification:', error);
  }
}

/**
 * 防抖函数 - 限制函数执行频率
 * 在指定时间内多次调用只执行最后一次
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @param {boolean} immediate - 是否立即执行第一次调用
 * @returns {Function} 防抖后的函数
 * @deprecated 使用 UtilityFunctions.debounce 替代
 */
function debounce(func, wait, immediate) {
  if (window.UtilityFunctions) {
    return window.UtilityFunctions.debounce(func, wait, immediate);
  }

  // 降级处理
  let timeout;
  return function () {
    const context = this, args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

/**
 * 对象合并函数 - 将源对象的属性复制到目标对象
 * @param {Object} target - 目标对象
 * @param {Object} source - 源对象
 * @returns {Object} 合并后的目标对象
 * @deprecated 使用 UtilityFunctions.objectAssign 替代
 */
function objectAssign(target, source) {
  if (window.UtilityFunctions) {
    return window.UtilityFunctions.objectAssign(target, source);
  }

  // 降级处理
  try {
    return Object.assign(target || {}, source);
  } catch (error) {
    console.error('objectAssign 执行失败:', error);
    return target || {};
  }
}

/**
 * 显示通知消息
 * @param {string} message - 通知消息
 * @param {string} type - 通知类型 ('success', 'error', 'warning', 'info')
 * @param {number} duration - 显示时长（毫秒），默认3000ms
 * @deprecated 使用 NotificationSystem 替代
 */
function showNotification(message, type = 'success', duration = null) {
  try {
    // 使用新的通知系统
    if (window.notificationSystem) {
      const options = {};
      if (duration !== null) {
        options.duration = duration;
      }
      return window.notificationSystem.show(message, type, options);
    }

    // 降级处理：使用全局错误处理器
    if (type === 'error' && window.errorHandler) {
      window.errorHandler.handleError({
        type: 'ui',
        operation: '通知显示',
        message: message,
        component: 'Utils'
      });
      return;
    }

    // 最后降级：控制台输出
    console.warn('NotificationSystem not available');
    console.log(`[${type.toUpperCase()}] ${message}`);

  } catch (error) {
    console.error('Critical error in showNotification:', error);
    // 最后的降级处理
    try {
      console.log(`[${type ? type.toUpperCase() : 'INFO'}] ${message || 'Notification error'}`);
    } catch (e) {
      console.log('Notification system failed completely');
    }
  }
}

/**
 * 显示邮件订阅成功的专用通知
 * @deprecated 使用 NotificationSystem 替代
 */
function showNewsletterNotification() {
  try {
    // 使用新的通知系统
    if (window.notificationSystem) {
      return window.notificationSystem.show(
        '🎉 订阅成功！欢迎加入我们的大家庭，最新资讯和独家优惠将第一时间为您送达！',
        'success',
        {
          duration: 7000,
          customClass: 'newsletter-notification',
          icon: 'plane'
        }
      );
    }

    // 降级处理：使用全局错误处理器
    if (window.errorHandler && typeof window.errorHandler.showNotification === 'function') {
      return window.errorHandler.showNotification(
        '🎉 订阅成功！欢迎加入我们，精彩内容即将送达！',
        'success',
        6000
      );
    }

    // 最终降级：控制台输出
    console.warn('NotificationSystem not available');
    console.log('📧 邮件订阅成功！');

  } catch (error) {
    if (window.errorUtils) {
      window.errorUtils.handleError(error, {
        context: 'showNewsletterNotification',
        severity: 'error',
        category: 'notification',
        userMessage: '显示邮件订阅通知失败'
      });
    } else {
      console.error('Failed to show newsletter notification:', error);
    }
    // 最终降级：控制台输出
    console.log('📧 邮件订阅成功！');
  }
}

/**
 * 安全地移除通知元素
 * @param {HTMLElement} notification - 要移除的通知元素
 */
function removeNotification(notification) {
  try {
    if (!notification || !notification.parentNode) {
      return;
    }

    // 执行清理函数
    if (typeof notification._cleanup === 'function') {
      notification._cleanup();
    }

    // 淡出动画
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';

    // 延迟移除DOM元素
    setTimeout(() => {
      try {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      } catch (error) {
        if (window.errorUtils) {
          window.errorUtils.handleError(error, {
            context: 'removeNotification.domRemoval',
            severity: 'error',
            category: 'dom',
            userMessage: '移除通知元素失败'
          });
        } else {
          console.error('Failed to remove notification from DOM:', error);
        }
      }
    }, 300);

  } catch (error) {
    if (window.errorUtils) {
      window.errorUtils.handleError(error, {
        context: 'removeNotification',
        severity: 'error',
        category: 'notification',
        userMessage: '移除通知失败'
      });
    } else {
      console.error('Error removing notification:', error);
    }
    // 强制移除
    try {
      if (notification && notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    } catch (e) {
      if (window.errorUtils) {
        window.errorUtils.handleError(e, {
          context: 'removeNotification.forceRemoval',
          severity: 'error',
          category: 'dom',
          userMessage: '强制移除通知失败'
        });
      } else {
        console.error('Failed to force remove notification:', e);
      }
    }
  }
}

/**
 * 主工具类 - 整合各种工具方法
 * 提供统一的工具函数接口
 */
class Utils {
  /**
   * HTML转义函数，防止XSS攻击
   * @param {string} str - 需要转义的字符串
   * @returns {string} 转义后的安全字符串
   */
  static escapeHtml(str) {
    return HTMLSanitizer.escapeHtml(str);
  }

  /**
   * 安全地设置innerHTML
   * @param {HTMLElement} element - 目标元素
   * @param {string} html - HTML内容
   * @param {boolean} trusted - 是否为可信内容
   */
  static safeSetInnerHTML(element, html, trusted = false) {
    return HTMLSanitizer.safeSetInnerHTML(element, html, trusted);
  }

  /**
   * 生成安全的随机ID
   * @param {string} prefix - ID前缀
   * @param {number} length - 随机部分长度
   * @returns {string}
   */
  static generateSecureId(prefix = '', length = 16) {
    return IDGenerator.generateSecureId(prefix, length);
  }

  /**
   * 生成会话ID
   * @returns {string}
   */
  static generateSessionId() {
    return IDGenerator.generateSessionId();
  }

  /**
   * 生成错误ID
   * @returns {string}
   */
  static generateErrorId() {
    return IDGenerator.generateErrorId();
  }
}

/**
 * 事件委托器类 - 提供高效的事件委托机制
 * 减少事件监听器数量，包含完整的错误处理、参数验证和资源管理
 */
class EventDelegator {
  /**
     * 创建事件委托器实例
     * @param {Object} dependencies - 依赖注入对象
     * @param {Document} dependencies.document - DOM文档对象
     * @param {Window} dependencies.window - 窗口对象
     * @param {Console} dependencies.console - 控制台对象
     */
  constructor(dependencies = {}) {
    // 依赖注入
    this.document = dependencies.document || window.document;
    this.window = dependencies.window || window;
    this.console = dependencies.console || window.console;

    this.handlers = new Map();
    this.globalListeners = new Map(); // 存储全局监听器引用
    this.isDestroyed = false;
    this.maxHandlersPerEvent = window.MAGIC_NUMBERS?.MAX_HANDLERS_PER_EVENT || 100; // 限制每个事件类型的处理器数量

    try {
      this.init();
    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError(error, {
          context: 'EventDelegator.constructor',
          severity: 'error',
          category: 'initialization',
          userMessage: '事件委托器初始化失败'
        });
      } else {
        this.console.error('Failed to setup EventDelegator:', error);
      }
      this.isDestroyed = true;
    }
  }

  /**
     * 初始化事件委托器
     * 设置全局事件监听器，为常见事件类型注册委托处理
     * 包含错误处理和监听器引用管理
     * @returns {EventDelegator} 返回当前实例以支持链式调用
     */
  init() {
    // 检查DOM可用性
    if (!this.document || !this.document.addEventListener) {
      throw new Error('Document or addEventListener not available');
    }

    try {
      // 主要点击事件委托
      const clickListener = this.handleClick.bind(this);
      this.document.addEventListener('click', clickListener, true);
      this.globalListeners.set('click', clickListener);

      // 其他全局事件
      const changeListener = this.handleChange.bind(this);
      this.document.addEventListener('change', changeListener, true);
      this.globalListeners.set('change', changeListener);

      const submitListener = this.handleSubmit.bind(this);
      this.document.addEventListener('submit', submitListener, true);
      this.globalListeners.set('submit', submitListener);
    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError(error, {
          context: 'EventDelegator.init',
          severity: 'error',
          category: 'event',
          userMessage: '设置事件监听器失败'
        });
      } else {
        this.console.error('Failed to setup event listeners:', error);
      }
      throw error;
    }
  }

  /**
     * 处理点击事件
     * 委托处理所有点击事件，根据目标元素匹配相应的处理器
     * 包含完整的错误处理和性能优化
     * @param {Event} event - 点击事件对象
     */
  handleClick(event) {
    this.handleEvent('click', event);
  }

  /**
     * 处理表单变更事件
     * 委托处理所有表单元素的change事件
     * @param {Event} event - 变更事件对象
     */
  handleChange(event) {
    this.handleEvent('change', event);
  }

  /**
     * 处理表单提交事件
     * 委托处理所有表单的submit事件
     * @param {Event} event - 提交事件对象
     */
  handleSubmit(event) {
    this.handleEvent('submit', event);
  }

  /**
     * 通用事件处理方法
     * @param {string} eventType - 事件类型
     * @param {Event} event - 事件对象
     */
  handleEvent(eventType, event) {
    // 检查实例状态
    if (this.isDestroyed) {
      return;
    }

    try {
      // 验证参数
      if (!event || typeof event !== 'object') {
        if (window.errorUtils) {
          window.errorUtils.handleError(new Error('Invalid event object in handleEvent'), {
            context: 'EventDelegator.handleEvent',
            severity: 'warning',
            category: 'validation',
            userMessage: '无效的事件对象'
          });
        } else {
          this.console.warn('Invalid event object in handleEvent');
        }
        return;
      }

      // 验证事件目标
      if (!event.target) {
        if (window.errorUtils) {
          window.errorUtils.handleError(new Error('Event target is null or undefined'), {
            context: 'EventDelegator.handleEvent',
            severity: 'warning',
            category: 'validation',
            userMessage: '事件目标为空'
          });
        } else {
          this.console.warn('Event target is null or undefined');
        }
        return;
      }

      // 获取事件路径
      let path;
      try {
        path = event.composedPath ? event.composedPath() : [event.target];
      } catch (error) {
        if (window.errorUtils) {
          window.errorUtils.handleError(error, {
            context: 'EventDelegator.handleEvent.getPath',
            severity: 'warning',
            category: 'event',
            userMessage: '获取事件路径失败，使用目标元素'
          });
        } else {
          this.console.warn('Failed to get event path, using target only:', error);
        }
        path = [event.target];
      }

      // 遍历事件路径，查找匹配的处理器
      for (const element of path) {
        if (element === this.document) { break; }

        // 检查元素是否有matches方法
        if (!element.matches || typeof element.matches !== 'function') {
          continue;
        }

        // 检查元素是否匹配任何注册的选择器
        for (const [selector, handlerInfo] of this.handlers) {
          try {
            if (element.matches(selector)) {
              const { handler, eventType: registeredEventType, options } = handlerInfo;

              // 检查事件类型匹配
              if (registeredEventType && registeredEventType !== eventType) {
                continue;
              }

              // 验证处理器
              if (typeof handler !== 'function') {
                if (window.errorUtils) {
                  window.errorUtils.handleError(new Error(`Invalid handler for selector: ${selector}`), {
                    context: 'EventDelegator.handleEvent.validateHandler',
                    severity: 'warning',
                    category: 'validation',
                    userMessage: '无效的事件处理器',
                    metadata: { selector }
                  });
                } else {
                  this.console.warn('Invalid handler for selector:', selector);
                }
                continue;
              }

              // 执行处理器
              handler.call(element, event);

              // 检查是否需要停止传播
              if (options && options.stopPropagation && event.stopImmediatePropagation) {
                event.stopImmediatePropagation();
                return;
              }
            }
          } catch (selectorError) {
            if (window.errorUtils) {
              window.errorUtils.handleError(selectorError, {
                context: 'EventDelegator.handleEvent.matchSelector',
                severity: 'warning',
                category: 'selector',
                userMessage: '选择器匹配失败',
                metadata: { selector }
              });
            } else {
              this.console.warn(`Error matching selector '${selector}':`, selectorError);
            }
            continue;
          }
        }
      }
    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError(error, {
          context: 'EventDelegator.handleEvent',
          severity: 'error',
          category: 'event',
          userMessage: '事件处理发生严重错误',
          metadata: { eventType }
        });
      } else {
        this.console.error(`Critical error in handleEvent for ${eventType}:`, error);
      }
    }
  }

  /**
     * 注册事件处理器
     * 包含参数验证和资源限制
     * @param {string} selector - CSS选择器
     * @param {Function} handler - 事件处理函数
     * @param {Object} options - 处理器选项
     */
  on(selector, handler, options = {}) {
    try {
      // 检查实例状态
      if (this.isDestroyed) {
        if (window.errorUtils) {
          window.errorUtils.handleError(new Error('Cannot add handler to destroyed EventDelegator'), {
            context: 'EventDelegator.on',
            severity: 'warning',
            category: 'state',
            userMessage: '无法向已销毁的事件委托器添加处理器'
          });
        } else {
          console.warn('Cannot add handler to destroyed EventDelegator');
        }
        return this;
      }

      // 参数验证
      if (typeof selector !== 'string' || !selector.trim()) {
        if (window.errorUtils) {
          window.errorUtils.handleError(new Error('Invalid selector provided to EventDelegator.on'), {
            context: 'EventDelegator.on',
            severity: 'error',
            category: 'validation',
            userMessage: '无效的选择器'
          });
        } else {
          console.error('Invalid selector provided to EventDelegator.on');
        }
        return this;
      }

      if (typeof handler !== 'function') {
        if (window.errorUtils) {
          window.errorUtils.handleError(new Error('Invalid handler provided to EventDelegator.on'), {
            context: 'EventDelegator.on',
            severity: 'error',
            category: 'validation',
            userMessage: '无效的处理器函数'
          });
        } else {
          console.error('Invalid handler provided to EventDelegator.on');
        }
        return this;
      }

      // 验证选择器语法
      try {
        document.querySelector(selector);
      } catch (selectorError) {
        if (window.errorUtils) {
          window.errorUtils.handleError(selectorError, {
            context: 'EventDelegator.on.selectorValidation',
            severity: 'error',
            category: 'validation',
            userMessage: '无效的CSS选择器语法',
            metadata: { selector }
          });
        } else {
          console.error(`Invalid CSS selector '${selector}':`, selectorError);
        }
        return this;
      }

      // 检查处理器数量限制
      if (this.handlers.size >= this.maxHandlersPerEvent) {
        if (window.errorUtils) {
          window.errorUtils.handleError(new Error(`Maximum handlers limit (${this.maxHandlersPerEvent}) reached`), {
            context: 'EventDelegator.on',
            severity: 'warning',
            category: 'resource',
            userMessage: '事件处理器数量已达上限',
            metadata: { maxHandlers: this.maxHandlersPerEvent }
          });
        } else {
          console.warn(`Maximum handlers limit (${this.maxHandlersPerEvent}) reached`);
        }
        return this;
      }

      // 检查重复注册
      if (this.handlers.has(selector)) {
        if (window.errorUtils) {
          window.errorUtils.handleError(new Error(`Handler already registered for selector '${selector}', replacing...`), {
            context: 'EventDelegator.on',
            severity: 'warning',
            category: 'duplicate',
            userMessage: '重复注册事件处理器',
            metadata: { selector }
          });
        } else {
          console.warn(`Handler already registered for selector '${selector}', replacing...`);
        }
      }

      // 添加处理器
      this.handlers.set(selector, {
        handler,
        eventType: options.eventType || null,
        options: { ...options },
        registeredAt: Date.now()
      });

      return this; // 支持链式调用
    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError(error, {
          context: 'EventDelegator.on',
          severity: 'error',
          category: 'general',
          userMessage: '注册事件处理器时发生错误'
        });
      } else {
        console.error('Error in EventDelegator.on:', error);
      }
      return this;
    }
  }

  /**
     * 移除事件处理器
     * @param {string} selector - CSS选择器
     */
  off(selector) {
    try {
      if (typeof selector !== 'string') {
        if (window.errorUtils) {
          window.errorUtils.handleError(new Error('Invalid selector provided to EventDelegator.off'), {
            context: 'EventDelegator.off',
            severity: 'error',
            category: 'validation',
            userMessage: '无效的选择器参数'
          });
        } else {
          console.error('Invalid selector provided to EventDelegator.off');
        }
        return this;
      }

      const deleted = this.handlers.delete(selector);
      if (!deleted) {
        if (window.errorUtils) {
          window.errorUtils.handleError(new Error(`No handler found for selector '${selector}'`), {
            context: 'EventDelegator.off',
            severity: 'warning',
            category: 'notfound',
            userMessage: '未找到对应的事件处理器',
            metadata: { selector }
          });
        } else {
          console.warn(`No handler found for selector '${selector}'`);
        }
      }

      return this;
    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError(error, {
          context: 'EventDelegator.off',
          severity: 'error',
          category: 'general',
          userMessage: '移除事件处理器时发生错误'
        });
      } else {
        console.error('Error in EventDelegator.off:', error);
      }
      return this;
    }
  }

  /**
     * 清空所有处理器
     */
  clear() {
    try {
      this.handlers.clear();
      return this;
    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError(error, {
          context: 'EventDelegator.clear',
          severity: 'error',
          category: 'general',
          userMessage: '清空事件处理器时发生错误'
        });
      } else {
        console.error('Error clearing EventDelegator handlers:', error);
      }
      return this;
    }
  }

  /**
     * 销毁事件委托器
     * 清理所有资源和监听器
     */
  destroy() {
    try {
      if (this.isDestroyed) {
        return;
      }

      // 移除全局监听器
      this.globalListeners.forEach((listener, eventType) => {
        try {
          document.removeEventListener(eventType, listener, true);
        } catch (error) {
          if (window.errorUtils) {
            window.errorUtils.handleError(error, {
              context: 'EventDelegator.destroy.removeListener',
              severity: 'error',
              category: 'cleanup',
              userMessage: '移除事件监听器失败',
              metadata: { eventType }
            });
          } else {
            console.error(`Failed to remove listener for ${eventType}:`, error);
          }
        }
      });

      // 清理数据
      this.globalListeners.clear();
      this.handlers.clear();

      // 标记为已销毁
      this.isDestroyed = true;

      if (window.errorUtils) {
        window.errorUtils.handleError(null, {
          context: 'EventDelegator.destroy',
          severity: 'info',
          category: 'lifecycle',
          userMessage: 'EventDelegator已成功销毁'
        });
      } else {
        console.log('EventDelegator destroyed successfully');
      }
    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError(error, {
          context: 'EventDelegator.destroy',
          severity: 'error',
          category: 'cleanup',
          userMessage: '销毁EventDelegator时发生错误'
        });
      } else {
        console.error('Error destroying EventDelegator:', error);
      }
    }
  }

  /**
     * 获取统计信息
     * @returns {Object|null} 统计信息对象，包含处理器数量、销毁状态等
     */
  getStats() {
    try {
      return {
        totalHandlers: this.handlers.size,
        isDestroyed: this.isDestroyed,
        maxHandlersPerEvent: this.maxHandlersPerEvent
      };
    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError(error, {
          context: 'EventDelegator.getStats',
          severity: 'error',
          category: 'general',
          userMessage: '获取EventDelegator统计信息时发生错误'
        });
      } else {
        console.error('Error getting EventDelegator stats:', error);
      }
      return null;
    }
  }
}

/**
 * 注册全局事件处理器的公共函数
 * 消除重复代码，统一事件绑定逻辑
 */
function registerGlobalEventHandlers(eventDelegator) {
  return eventDelegator
    // 添加到购物车按钮
    .on(window.DOM_SELECTORS?.ADD_TO_CART || '.add-to-cart', function handleAddToCart(_event) {
      const productId = this.dataset.productId || Date.now().toString();
      const productName = this.dataset.productName || '商品';
      const productPrice = parseFloat(this.dataset.productPrice) || 0;
      const productImage = this.dataset.productImage || 'https://placehold.co/400x400/4f46e5/white?text=Product';

      window.cart.addItem({
        id: productId,
        name: productName,
        price: productPrice,
        image: productImage
      });
    })
    // 订阅表单提交
    .on(window.DOM_SELECTORS?.FORMS?.NEWSLETTER || '.newsletter, .newsletter-form form', function handleNewsletterSubmit(event) {
      event.preventDefault();

      // 获取邮件输入框
      const emailInput = this.querySelector('input[type="email"]');
      const emailValue = emailInput ? emailInput.value.trim() : '';

      // 检查邮件地址是否为空
      if (!emailValue) {
        // 显示空邮件地址提示
        window.utils.showEmptyEmailNotification();

        // 添加输入框抖动效果
        if (emailInput) {
          emailInput.classList.add('email-input-error');
          emailInput.classList.add('shake-animation');

          // 3秒后移除错误样式
          setTimeout(() => {
            emailInput.classList.remove('email-input-error', 'shake-animation');
          }, 3000);
        }
        return;
      }

      window.utils.showNewsletterNotification();
      this.reset();
    });
}

/**
 * 初始化utils对象的公共函数
 * 统一utils对象的创建逻辑
 */
function initializeUtils() {
  window.utils = {
    debounce,
    objectAssign,
    showNotification,
    showNewsletterNotification,
    showEmptyEmailNotification,
    removeNotification,
    eventDelegator: window.eventDelegator
  };

  // 导出Utils类到全局
  window.Utils = Utils;

  // 导出EventDelegator类到全局
  window.EventDelegator = EventDelegator;
}

// 使用依赖注入容器创建实例
if (window.diContainer) {
  // 创建实例（create方法会自动处理注册）
  window.eventDelegator = window.diContainer.create('EventDelegator', EventDelegator);

  // 注册全局事件处理器
  registerGlobalEventHandlers(window.eventDelegator);

  // 初始化utils对象
  initializeUtils();
} else {
  // 降级处理：直接创建实例
  console.warn('DIContainer not available, using direct instantiation');

  window.eventDelegator = new EventDelegator({
    document: window.document,
    window: window,
    console: window.console
  });

  // 注册全局事件处理器
  registerGlobalEventHandlers(window.eventDelegator);

  // 初始化utils对象
  initializeUtils();
}
