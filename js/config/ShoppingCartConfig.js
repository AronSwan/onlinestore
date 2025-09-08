/**
 * 购物车配置管理器
 * 专门负责购物车相关的配置常量和设置
 */
class ShoppingCartConfig {
  constructor() {
    this.config = {
      STORAGE_KEY: 'shopping_cart',
      MAX_QUANTITY_PER_ITEM: 99,
      MIN_QUANTITY_PER_ITEM: 1,
      MAX_ITEMS_IN_CART: 50,
      AUTO_SAVE: true,
      SAVE_DEBOUNCE_DELAY: 500,
      CURRENCY: {
        symbol: '$',
        code: 'USD',
        position: 'before', // 'before' or 'after'
        decimalPlaces: 2
      },
      VALIDATION_RULES: {
        requirePositivePrice: true,
        requireValidQuantity: true,
        requireProductId: true,
        allowZeroPrice: false
      },
      EVENTS: {
        ITEM_ADDED: 'cart:item:added',
        ITEM_REMOVED: 'cart:item:removed',
        ITEM_UPDATED: 'cart:item:updated',
        CART_CLEARED: 'cart:cleared',
        CART_LOADED: 'cart:loaded',
        CART_SAVED: 'cart:saved'
      },
      DISCOUNT_TYPES: {
        PERCENTAGE: 'percentage',
        FIXED_AMOUNT: 'fixed_amount',
        FREE_SHIPPING: 'free_shipping'
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
   * 获取存储键
   * @returns {string} 存储键
   */
  getStorageKey() {
    return this.config.STORAGE_KEY;
  }

  /**
   * 获取数量限制
   * @returns {object} 数量限制配置
   */
  getQuantityLimits() {
    return {
      max: this.config.MAX_QUANTITY_PER_ITEM,
      min: this.config.MIN_QUANTITY_PER_ITEM,
      maxItems: this.config.MAX_ITEMS_IN_CART
    };
  }

  /**
   * 获取货币配置
   * @returns {object} 货币配置
   */
  getCurrencyConfig() {
    return JSON.parse(JSON.stringify(this.config.CURRENCY));
  }

  /**
   * 格式化价格
   * @param {number} amount - 金额
   * @returns {string} 格式化后的价格
   */
  formatPrice(amount) {
    const currency = this.config.CURRENCY;
    const formattedAmount = amount.toFixed(currency.decimalPlaces);

    if (currency.position === 'before') {
      return `${currency.symbol}${formattedAmount}`;
    }
    return `${formattedAmount}${currency.symbol}`;

  }

  /**
   * 获取验证规则
   * @returns {object} 验证规则
   */
  getValidationRules() {
    return JSON.parse(JSON.stringify(this.config.VALIDATION_RULES));
  }

  /**
   * 获取事件名称
   * @param {string} eventType - 事件类型
   * @returns {string} 事件名称
   */
  getEventName(eventType) {
    return this.config.EVENTS[eventType] || null;
  }

  /**
   * 获取所有事件名称
   * @returns {object} 所有事件名称
   */
  getAllEvents() {
    return JSON.parse(JSON.stringify(this.config.EVENTS));
  }

  /**
   * 获取折扣类型
   * @returns {object} 折扣类型
   */
  getDiscountTypes() {
    return JSON.parse(JSON.stringify(this.config.DISCOUNT_TYPES));
  }

  /**
   * 验证数量是否有效
   * @param {number} quantity - 数量
   * @returns {boolean} 是否有效
   */
  isValidQuantity(quantity) {
    return quantity >= this.config.MIN_QUANTITY_PER_ITEM &&
      quantity <= this.config.MAX_QUANTITY_PER_ITEM;
  }

  /**
   * 验证购物车项目数量是否超限
   * @param {number} currentItemCount - 当前项目数量
   * @returns {boolean} 是否超限
   */
  isCartFull(currentItemCount) {
    return currentItemCount >= this.config.MAX_ITEMS_IN_CART;
  }

  /**
   * 获取自动保存配置
   * @returns {object} 自动保存配置
   */
  getAutoSaveConfig() {
    return {
      enabled: this.config.AUTO_SAVE,
      debounceDelay: this.config.SAVE_DEBOUNCE_DELAY
    };
  }

  /**
   * 验证折扣类型是否有效
   * @param {string} discountType - 折扣类型
   * @returns {boolean} 是否有效
   */
  isValidDiscountType(discountType) {
    return Object.values(this.config.DISCOUNT_TYPES).includes(discountType);
  }
}

// 创建全局实例
const shoppingCartConfig = new ShoppingCartConfig();

// 导出配置管理器
if (typeof window !== 'undefined') {
  window.ShoppingCartConfig = ShoppingCartConfig;
  window.shoppingCartConfig = shoppingCartConfig;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ShoppingCartConfig, shoppingCartConfig };
}
