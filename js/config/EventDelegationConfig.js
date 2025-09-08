/**
 * 事件委托配置管理器
 * 专门负责事件委托相关的配置常量和设置
 */
class EventDelegationConfig {
  constructor() {
    this.config = {
      THROTTLE_DELAY: 100,
      DEBOUNCE_DELAY: 300,
      PASSIVE_EVENTS: ['scroll', 'wheel', 'touchstart', 'touchmove'],
      DELEGATED_EVENTS: {
        click: {
          selectors: [
            '[data-action]',
            '.btn',
            '.button',
            '.clickable',
            'a[href]',
            'button'
          ],
          preventDefault: false,
          stopPropagation: false
        },
        submit: {
          selectors: ['form[data-ajax]', '.ajax-form'],
          preventDefault: true,
          stopPropagation: false
        },
        change: {
          selectors: [
            'input[data-auto-save]',
            'select[data-auto-save]',
            'textarea[data-auto-save]'
          ],
          preventDefault: false,
          stopPropagation: false
        },
        input: {
          selectors: [
            'input[data-live-search]',
            'input[data-validate]'
          ],
          preventDefault: false,
          stopPropagation: false
        },
        keydown: {
          selectors: [
            '[data-hotkey]',
            'input[data-shortcut]'
          ],
          preventDefault: false,
          stopPropagation: false
        }
      },
      CUSTOM_EVENTS: {
        'cart:update': {
          bubbles: true,
          cancelable: true
        },
        'product:view': {
          bubbles: true,
          cancelable: false
        },
        'user:action': {
          bubbles: true,
          cancelable: true
        }
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
   * 获取节流延迟
   * @returns {number} 节流延迟(ms)
   */
  getThrottleDelay() {
    return this.config.THROTTLE_DELAY;
  }

  /**
   * 获取防抖延迟
   * @returns {number} 防抖延迟(ms)
   */
  getDebounceDelay() {
    return this.config.DEBOUNCE_DELAY;
  }

  /**
   * 获取被动事件列表
   * @returns {string[]} 被动事件数组
   */
  getPassiveEvents() {
    return [...this.config.PASSIVE_EVENTS];
  }

  /**
   * 检查事件是否为被动事件
   * @param {string} eventType - 事件类型
   * @returns {boolean} 是否为被动事件
   */
  isPassiveEvent(eventType) {
    return this.config.PASSIVE_EVENTS.includes(eventType);
  }

  /**
   * 获取委托事件配置
   * @param {string} eventType - 事件类型
   * @returns {object|null} 委托事件配置
   */
  getDelegatedEventConfig(eventType) {
    return this.config.DELEGATED_EVENTS[eventType] || null;
  }

  /**
   * 获取所有委托事件配置
   * @returns {object} 所有委托事件配置
   */
  getAllDelegatedEvents() {
    return JSON.parse(JSON.stringify(this.config.DELEGATED_EVENTS));
  }

  /**
   * 获取事件选择器
   * @param {string} eventType - 事件类型
   * @returns {string[]} 选择器数组
   */
  getEventSelectors(eventType) {
    const config = this.config.DELEGATED_EVENTS[eventType];
    return config ? [...config.selectors] : [];
  }

  /**
   * 检查元素是否匹配委托事件选择器
   * @param {Element} element - DOM元素
   * @param {string} eventType - 事件类型
   * @returns {boolean} 是否匹配
   */
  matchesEventSelector(element, eventType) {
    const selectors = this.getEventSelectors(eventType);
    return selectors.some(selector => element.matches(selector));
  }

  /**
   * 获取自定义事件配置
   * @param {string} eventName - 事件名称
   * @returns {object|null} 自定义事件配置
   */
  getCustomEventConfig(eventName) {
    return this.config.CUSTOM_EVENTS[eventName] || null;
  }

  /**
   * 获取所有自定义事件配置
   * @returns {object} 所有自定义事件配置
   */
  getAllCustomEvents() {
    return JSON.parse(JSON.stringify(this.config.CUSTOM_EVENTS));
  }

  /**
   * 创建自定义事件
   * @param {string} eventName - 事件名称
   * @param {*} detail - 事件详情
   * @returns {CustomEvent} 自定义事件对象
   */
  createCustomEvent(eventName, detail = null) {
    const config = this.getCustomEventConfig(eventName) || {
      bubbles: true,
      cancelable: true
    };

    return new CustomEvent(eventName, {
      ...config,
      detail
    });
  }

  /**
   * 获取事件处理选项
   * @param {string} eventType - 事件类型
   * @returns {object} 事件处理选项
   */
  getEventOptions(eventType) {
    const isPassive = this.isPassiveEvent(eventType);
    const config = this.getDelegatedEventConfig(eventType);

    return {
      passive: isPassive,
      capture: false,
      once: false,
      preventDefault: config ? config.preventDefault : false,
      stopPropagation: config ? config.stopPropagation : false
    };
  }

  /**
   * 验证事件类型是否支持委托
   * @param {string} eventType - 事件类型
   * @returns {boolean} 是否支持委托
   */
  supportsDelegation(eventType) {
    return Object.prototype.hasOwnProperty.call(this.config.DELEGATED_EVENTS, eventType);
  }
}

// 创建全局实例
const eventDelegationConfig = new EventDelegationConfig();

// 导出配置管理器
if (typeof window !== 'undefined') {
  window.EventDelegationConfig = EventDelegationConfig;
  window.eventDelegationConfig = eventDelegationConfig;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EventDelegationConfig, eventDelegationConfig };
}
