/* global Utils */
/**
 * Product Card Web Component
 *
 * A reusable custom element for displaying product information in a card format.
 * Features include:
 * - Shadow DOM encapsulation for style isolation
 * - Responsive design with hover effects
 * - Cart integration through custom events
 * - Attribute-based data binding
 * - Accessibility support
 *
 * @class ProductCard
 * @extends HTMLElement
 *
 * @example
 * <product-card
 *   data-product-id="123"
 *   data-name="Sample Product"
 *   data-price="29.99"
 *   data-image="/images/product.jpg"
 *   data-description="Product description">
 * </product-card>
 */
class ProductCard extends HTMLElement {
  /**
   * 构造函数 - 初始化Shadow DOM
   *
   * 创建封闭的Shadow DOM以实现样式隔离，
   * 确保组件样式不会影响页面其他部分
   *
   * @constructor
   */
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // 使用统一配置模块
    this.config = window.config?.getModule('productCard') || window.CONSTANTS?.PRODUCT_CARD || {
      debounceDelay: window.MAGIC_NUMBERS?.TIMEOUTS?.DEBOUNCE_DELAY || 300,
      maxRetries: window.MAGIC_NUMBERS?.LIMITS?.MAX_HANDLERS_PER_EVENT || 3,
      animationDuration: window.MAGIC_NUMBERS?.TIMEOUTS?.ANIMATION_DURATION || 200,
      feedbackTimeout: window.MAGIC_NUMBERS?.TIMEOUTS?.FEEDBACK_TIMEOUT || (() => {
        const DEFAULT_FEEDBACK_TIMEOUT = 2000;
        return DEFAULT_FEEDBACK_TIMEOUT;
      })()
    };

    // CSS相关常量
    this.cssConstants = {
      TRANSITION_DURATION: 0.2,
      FONT_SIZE_TITLE: 1.2,
      FONT_SIZE_SMALL: 0.9,
      LINE_HEIGHT_DEFAULT: 1.4,
      FONT_SIZE_PRICE: 1.3,
      FEEDBACK_RESET_TIMEOUT: 2000
    };

    // 初始化组件状态
    this.isEventListenersSetup = false;
    this.clickDebounceTimer = null;
    this.feedbackTimer = null;
  }

  /**
   * 元素连接到DOM时的回调
   *
   * Web Components生命周期方法，当元素被插入到文档中时调用。
   * 负责渲染组件内容和设置事件监听器。
   *
   * @public
   */
  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  /**
   * 定义需要观察变化的属性列表
   *
   * 当这些属性发生变化时，会触发attributeChangedCallback方法，
   * 实现数据绑定和动态更新功能。
   *
   * @static
   * @returns {string[]} 需要观察的属性名称数组
   * @public
   */
  static get observedAttributes() {
    return ['data-product-id', 'data-name', 'data-price', 'data-image', 'data-description'];
  }

  /**
   * 处理属性变化的回调函数
   *
   * 当observedAttributes中定义的属性发生变化时调用，
   * 触发组件重新渲染以反映最新数据。
   *
   * @param {string} name - 变化的属性名
   * @param {string|null} oldValue - 属性的旧值
   * @param {string|null} newValue - 属性的新值
   * @public
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * 渲染产品卡片的HTML和样式
   *
   * 从data属性中提取产品信息，生成完整的产品卡片UI。
   * 包括产品图片、名称、描述、价格和添加到购物车按钮。
   * 使用Shadow DOM确保样式封装。
   *
   * @private
   */
  render() {
    // Extract product data from component attributes
    const productId = this.getAttribute('data-product-id') || '';
    const name = this.getAttribute('data-name') || '';
    const price = this.getAttribute('data-price') || '';
    const image = this.getAttribute('data-image') || '';
    const description = this.getAttribute('data-description') || '';

    const cardHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          max-width: ${window.MAGIC_NUMBERS?.DIMENSIONS?.CARD_MAX_WIDTH || 300}px;
          border: ${window.MAGIC_NUMBERS?.DIMENSIONS?.BORDER_WIDTH || 1}px solid #e1e1e1;
          border-radius: ${window.MAGIC_NUMBERS?.DIMENSIONS?.BORDER_RADIUS || 8}px;
          overflow: hidden;
          box-shadow: 0 ${window.MAGIC_NUMBERS?.DIMENSIONS?.SHADOW_BLUR || 2}px ${window.MAGIC_NUMBERS?.DIMENSIONS?.SHADOW_SPREAD || 8}px rgba(0, 0, 0, 0.1);
          background: white;
          transition: transform ${window.MAGIC_NUMBERS?.TIMEOUTS?.TRANSITION_DURATION || this.cssConstants.TRANSITION_DURATION}s, box-shadow ${window.MAGIC_NUMBERS?.TIMEOUTS?.TRANSITION_DURATION || this.cssConstants.TRANSITION_DURATION}s;
        }

        :host(:hover) {
          transform: translateY(-${window.MAGIC_NUMBERS?.DIMENSIONS?.HOVER_TRANSLATE || 4}px);
          box-shadow: 0 ${window.MAGIC_NUMBERS?.DIMENSIONS?.HOVER_SHADOW_BLUR || 4}px ${window.MAGIC_NUMBERS?.DIMENSIONS?.HOVER_SHADOW_SPREAD || 16}px rgba(0, 0, 0, 0.15);
        }

        .product-image {
          width: 100%;
          height: ${window.MAGIC_NUMBERS?.DIMENSIONS?.IMAGE_HEIGHT || 200}px;
          object-fit: cover;
          border-bottom: ${window.MAGIC_NUMBERS?.DIMENSIONS?.BORDER_WIDTH || 1}px solid #e1e1e1;
        }

        .product-info {
          padding: ${window.MAGIC_NUMBERS?.DIMENSIONS?.PADDING || 16}px;
        }

        .product-name {
          font-size: ${window.MAGIC_NUMBERS?.FONT_SIZES?.TITLE || this.cssConstants.FONT_SIZE_TITLE}rem;
          font-weight: bold;
          margin: 0 0 ${window.MAGIC_NUMBERS?.DIMENSIONS?.MARGIN_SMALL || 8}px 0;
          color: #333;
        }

        .product-description {
          color: #666;
          margin: 0 0 ${window.MAGIC_NUMBERS?.DIMENSIONS?.MARGIN_MEDIUM || 12}px 0;
          font-size: ${window.MAGIC_NUMBERS?.FONT_SIZES?.SMALL || this.cssConstants.FONT_SIZE_SMALL}rem;
          line-height: ${window.MAGIC_NUMBERS?.FONT_SIZES?.LINE_HEIGHT || this.cssConstants.LINE_HEIGHT_DEFAULT};
        }

        .product-price {
          font-size: ${window.MAGIC_NUMBERS?.FONT_SIZES?.PRICE || this.cssConstants.FONT_SIZE_PRICE}rem;
          font-weight: bold;
          color: #2c5aa0;
          margin: 0 0 ${window.MAGIC_NUMBERS?.DIMENSIONS?.MARGIN_LARGE || 16}px 0;
        }

        .add-to-cart {
          width: 100%;
          padding: ${window.MAGIC_NUMBERS?.DIMENSIONS?.BUTTON_PADDING || 12}px;
          background-color: #2c5aa0;
          color: white;
          border: none;
          border-radius: ${window.MAGIC_NUMBERS?.DIMENSIONS?.BUTTON_RADIUS || 4}px;
          font-size: ${window.MAGIC_NUMBERS?.FONT_SIZES?.BUTTON || 1}rem;
          cursor: pointer;
          transition: background-color ${window.MAGIC_NUMBERS?.TIMEOUTS?.TRANSITION_DURATION || this.cssConstants.TRANSITION_DURATION}s;
        }

        .add-to-cart:hover {
          background-color: #1a3d7a;
        }

        .add-to-cart:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
      </style>
      <img class="product-image" src="${image}" alt="${name}">
      <div class="product-info">
        <h3 class="product-name">${name}</h3>
        <p class="product-description">${description}</p>
        <div class="product-price">$${price}</div>
        <button class="add-to-cart" data-product-id="${productId}">Add to Cart</button>
      </div>
    `;
    Utils.setElementHTML(this.shadowRoot, cardHTML, true); // 内部生成的安全HTML
  }

  /**
   * 设置产品卡片的事件监听器
   *
   * 为添加到购物车按钮绑定点击事件，处理用户交互。
   * 功能包括：
   * - 提取产品数据并派发自定义事件
   * - 提供即时的视觉反馈
   * - 防止重复点击的状态管理
   * - 完善的错误处理和数据验证
   *
   * @private
   */
  setupEventListeners() {
    try {
      // 检查Shadow DOM是否存在
      if (!this.shadowRoot) {
        console.error('ProductCard: Shadow DOM not available for event setup');
        return;
      }

      // 获取Shadow DOM中的添加到购物车按钮
      const addToCartSelector = window.DOM_SELECTORS?.PRODUCT_CARD?.ADD_TO_CART || '.add-to-cart';
      const addToCartButton = this.shadowRoot.querySelector(addToCartSelector);

      if (!addToCartButton) {
        console.warn('ProductCard: Add to cart button not found in shadow DOM');
        return;
      }

      // 检查是否已经绑定过事件（防止重复绑定）
      const eventBoundAttr = window.DOM_SELECTORS?.PRODUCT_CARD?.EVENT_BOUND?.replace('[', '').replace(']', '') || 'data-event-bound';
      if (addToCartButton.hasAttribute(eventBoundAttr)) {
        console.debug('ProductCard: Event listener already bound');
        return;
      }

      const clickHandler = (e) => {
        try {
          e.preventDefault(); // 防止默认表单提交行为
          e.stopPropagation(); // 防止事件冒泡

          // 检查按钮是否被禁用
          if (addToCartButton.disabled || addToCartButton.hasAttribute('disabled')) {
            console.debug('ProductCard: Add to cart button is disabled');
            return;
          }

          // 防止重复点击（防抖处理）
          if (addToCartButton.hasAttribute('data-processing')) {
            console.debug('ProductCard: Add to cart already processing');
            return;
          }

          // 设置处理状态
          addToCartButton.setAttribute('data-processing', 'true');

          // 从组件属性中提取产品数据
          const productData = this.extractProductData();

          if (!productData) {
            console.error('ProductCard: Failed to extract valid product data');
            this.showErrorFeedback('产品信息无效');
            return;
          }

          // 派发自定义事件，让购物车系统处理添加逻辑
          // 使用bubbles和composed确保事件能穿透Shadow DOM边界
          const customEvent = new CustomEvent('add-to-cart', {
            detail: productData,
            bubbles: true,    // 允许事件冒泡
            composed: true,   // 允许事件穿透Shadow DOM
            cancelable: true  // 允许事件被取消
          });

          const eventDispatched = this.dispatchEvent(customEvent);

          if (!eventDispatched) {
            console.warn('ProductCard: Add to cart event was cancelled');
            this.showErrorFeedback('操作被取消');
            return;
          }

          // 提供即时的视觉反馈，改善用户体验
          this.showAddToCartFeedback();

        } catch (error) {
          if (window.errorUtils) {
            const currentProductData = this.extractProductData();
            window.errorUtils.handleError(error, {
              operation: 'addToCart',
              component: 'ProductCard',
              productId: currentProductData?.id,
              element: addToCartButton
            });
          } else {
            console.error('ProductCard: Error in click handler:', error);
          }
          this.showErrorFeedback('添加到购物车失败');
        } finally {
          // 清除处理状态
          this._processingTimer = setTimeout(() => {
            addToCartButton.removeAttribute('data-processing');
          }, 1000);
        }
      };

      // 绑定事件监听器
      addToCartButton.addEventListener('click', clickHandler);

      // 标记事件已绑定
      addToCartButton.setAttribute('data-event-bound', 'true');

      // 存储事件处理器引用以便后续清理
      this._clickHandler = clickHandler;
      this._addToCartButton = addToCartButton;

    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError(error, {
          operation: 'setupEventListeners',
          component: 'ProductCard',
          elementId: this.getAttribute('data-product-id')
        });
      } else {
        console.error('ProductCard: Error setting up event listeners:', error);
      }
    }
  }

  /**
   * 提取和验证产品数据
   *
   * 从组件属性中提取产品信息并进行严格的数据验证，
   * 确保数据的完整性和有效性。
   *
   * @returns {Object|null} 验证后的产品数据或null
   * @private
   */
  extractProductData() {
    try {
      // 获取原始属性值
      const rawId = this.getAttribute('data-product-id');
      const rawName = this.getAttribute('data-name');
      const rawPrice = this.getAttribute('data-price');
      const rawImage = this.getAttribute('data-image');
      const rawDescription = this.getAttribute('data-description');

      // 验证必需字段
      if (!rawId || !rawName || !rawPrice) {
        console.error('ProductCard: Missing required product attributes', {
          id: rawId,
          name: rawName,
          price: rawPrice
        });
        return null;
      }

      // 验证和转换价格
      const price = parseFloat(rawPrice);
      if (isNaN(price) || price < 0) {
        console.error(`ProductCard: Invalid price value: ${rawPrice}`);
        return null;
      }

      // 验证产品ID
      if (typeof rawId !== 'string' || rawId.trim().length === 0) {
        console.error(`ProductCard: Invalid product ID: ${rawId}`);
        return null;
      }

      // 验证产品名称
      if (typeof rawName !== 'string' || rawName.trim().length === 0) {
        console.error(`ProductCard: Invalid product name: ${rawName}`);
        return null;
      }

      // 构建产品数据对象
      const productData = {
        id: rawId.trim(),
        name: rawName.trim(),
        price: Math.round(price * 100) / 100, // 保留两位小数
        image: rawImage ? rawImage.trim() : '',
        description: rawDescription ? rawDescription.trim() : '',
        timestamp: Date.now(),
        source: 'product-card'
      };

      // 额外验证
      if (productData.name.length > 200) {
        console.warn('ProductCard: Product name is very long, truncating');
        productData.name = productData.name.substring(0, 200);
      }

      if (productData.image && productData.image.length > 500) {
        console.warn('ProductCard: Product image URL is very long, truncating');
        productData.image = productData.image.substring(0, 500);
      }

      return productData;

    } catch (error) {
      console.error('ProductCard: Error extracting product data:', error);
      return null;
    }
  }

  /**
   * 显示添加到购物车成功的反馈
   *
   * 提供用户友好的视觉反馈，包括按钮状态变化和防重复点击保护。
   *
   * @private
   */
  showAddToCartFeedback() {
    try {
      const addToCartButton = this.shadowRoot?.querySelector('.add-to-cart');
      if (!addToCartButton) {
        console.warn('ProductCard: Cannot show feedback - button not found');
        return;
      }

      // 保存原始状态
      const originalText = addToCartButton.textContent;
      const originalBackgroundColor = addToCartButton.style.backgroundColor;

      // 显示成功状态
      addToCartButton.textContent = 'Added!';
      addToCartButton.style.backgroundColor = '#28a745';
      addToCartButton.disabled = true;

      // 2秒后重置按钮状态，允许再次添加
      this._feedbackTimer = setTimeout(() => {
        if (addToCartButton) {
          addToCartButton.textContent = originalText || 'Add to Cart';
          addToCartButton.style.backgroundColor = originalBackgroundColor;
          addToCartButton.disabled = false;
        }
      }, this.cssConstants.FEEDBACK_RESET_TIMEOUT);

    } catch (error) {
      console.error('ProductCard: Error showing add to cart feedback:', error);
    }
  }

  /**
   * 显示错误反馈
   *
   * 当操作失败时向用户显示错误信息，提供多种反馈方式。
   *
   * @param {string} message - 错误消息
   * @private
   */
  showErrorFeedback(message = '操作失败') {
    try {
      // 优先使用全局错误处理器
      if (window.errorHandler) {
        window.errorHandler.handleError({
          type: 'ui',
          operation: '产品卡片操作',
          message: message,
          component: 'ProductCard'
        });
        return;
      }

      // 检查是否有通知系统可用
      if (typeof window.utils !== 'undefined' &&
        typeof window.utils.showNotification === 'function') {
        window.utils.showNotification(message, 'error');
        return;
      }

      // 降级处理：在按钮上显示临时错误状态
      const addToCartButton = this.shadowRoot?.querySelector('.add-to-cart');
      if (addToCartButton) {
        const originalText = addToCartButton.textContent;
        const originalBackgroundColor = addToCartButton.style.backgroundColor;

        addToCartButton.textContent = 'Error';
        addToCartButton.style.backgroundColor = '#dc3545';
        addToCartButton.disabled = true;

        this._feedbackTimer = setTimeout(() => {
          if (addToCartButton) {
            addToCartButton.textContent = originalText || 'Add to Cart';
            addToCartButton.style.backgroundColor = originalBackgroundColor;
            addToCartButton.disabled = false;
          }
        }, this.cssConstants.FEEDBACK_RESET_TIMEOUT);
      }

      // 控制台输出
      console.error(`ProductCard: ${message}`);

    } catch (error) {
      console.error('ProductCard: Error showing error feedback:', error);
    }
  }

  /**
   * 组件从DOM中移除时的清理工作
   *
   * 执行完整的资源清理，包括事件监听器移除、定时器清理、
   * 引用清空等，防止内存泄漏和资源浪费。
   *
   * @override
   */
  disconnectedCallback() {
    try {
      console.debug('ProductCard: Disconnecting component');

      // 清理事件监听器
      this.cleanupEventListeners();

      // 清理定时器
      this.cleanupTimers();

      // 清理引用
      this.cleanupReferences();

      console.debug('ProductCard: Component disconnected successfully');

    } catch (error) {
      console.error('ProductCard: Error during component disconnection:', error);
    }
  }

  /**
   * 清理事件监听器
   * @private
   */
  cleanupEventListeners() {
    try {
      // 清理添加到购物车按钮的事件监听器
      if (this._addToCartButton && this._clickHandler) {
        this._addToCartButton.removeEventListener('click', this._clickHandler);
        console.debug('ProductCard: Click event listener removed');
      }

      // 清理其他可能的事件监听器
      if (this.shadowRoot) {
        const elements = this.shadowRoot.querySelectorAll('[data-event-bound]');
        elements.forEach(element => {
          element.removeAttribute('data-event-bound');
          element.removeAttribute('data-processing');
        });
      }

    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError(error, {
          operation: 'cleanupEventListeners',
          component: 'ProductCard'
        }, { showUserFeedback: false });
      } else {
        console.error('ProductCard: Error cleaning up event listeners:', error);
      }
    }
  }

  /**
   * 清理定时器
   * @private
   */
  cleanupTimers() {
    try {
      // 清理可能存在的定时器
      if (this._feedbackTimer) {
        clearTimeout(this._feedbackTimer);
        this._feedbackTimer = null;
        console.debug('ProductCard: Feedback timer cleared');
      }

      if (this._processingTimer) {
        clearTimeout(this._processingTimer);
        this._processingTimer = null;
        console.debug('ProductCard: Processing timer cleared');
      }

    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError(error, {
          operation: 'cleanupTimers',
          component: 'ProductCard'
        }, { showUserFeedback: false });
      } else {
        console.error('ProductCard: Error cleaning up timers:', error);
      }
    }
  }

  /**
   * 清理对象引用
   * @private
   */
  cleanupReferences() {
    try {
      // 清理DOM引用
      this._addToCartButton = null;
      this._clickHandler = null;

      // 清理其他可能的引用
      this._productData = null;
      this._isInitialized = false;

      console.debug('ProductCard: References cleaned up');

    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError(error, {
          operation: 'cleanupReferences',
          component: 'ProductCard'
        }, { showUserFeedback: false });
      } else {
        console.error('ProductCard: Error cleaning up references:', error);
      }
    }
  }

  /**
   * 检查组件健康状态
   * @returns {boolean} 组件是否处于健康状态
   * @public
   */
  isHealthy() {
    try {
      // 检查基本结构
      if (!this.shadowRoot) {
        console.warn('ProductCard: Shadow DOM not available');
        return false;
      }

      // 检查必需的DOM元素
      const requiredElements = [
        '.product-image',
        '.product-info',
        '.add-to-cart'
      ];

      for (const selector of requiredElements) {
        if (!this.shadowRoot.querySelector(selector)) {
          console.warn(`ProductCard: Required element missing: ${selector}`);
          return false;
        }
      }

      // 检查必需的属性
      const requiredAttributes = ['data-product-id', 'data-name', 'data-price'];
      for (const attr of requiredAttributes) {
        if (!this.hasAttribute(attr)) {
          console.warn(`ProductCard: Required attribute missing: ${attr}`);
          return false;
        }
      }

      return true;

    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError(error, {
          operation: 'healthCheck',
          component: 'ProductCard',
          elementConnected: this.isConnected,
          shadowRootExists: !!this.shadowRoot
        }, { showUserFeedback: false });
      } else {
        console.error('ProductCard: Error checking component health:', error);
      }
      return false;
    }
  }
}

// 向浏览器注册自定义元素
// 注册后可在HTML中使用<product-card>标签
customElements.define('product-card', ProductCard);
