// 购物车功能模块 - 增强版本地存储持久化

/**
 * 购物车数据管理器 - 负责数据存储和业务逻辑
 * 分离数据管理和UI更新逻辑，提高代码可维护性
 */
class CartDataManager {
  constructor(dependencies = {}) {
    this.storage = dependencies.storage || window.diContainer?.get('storage');
    this.config = dependencies.config || window.config?.getModule('cart') || window.CONSTANTS?.CART || {};
    this.utils = dependencies.utils || window.utils;

    this.items = [];
    this.storageKey = this.config.storageKey || 'nexusShopCart';
    this.version = this.config.version || '1.0';
    this.maxItems = this.config.maxItems || window.MAGIC_NUMBERS?.LIMITS?.MAX_CART_ITEMS || 100;
    this.autoSaveInterval = this.config.autoSaveInterval || window.MAGIC_NUMBERS?.TIMEOUTS?.SAVE_DELAY || 30000;

    this.loadCart();
    this.setupAutoSave();
  }

  /**
   * 添加商品到购物车数据
   */
  addItem(product, quantity = 1) {
    // 输入验证
    if (!product || typeof product !== 'object' || !product.id) {
      return this.items;
    }

    const existingItem = this.items.find(item => item.id === product.id);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      // 确保价格是数字类型
      const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
      this.items.push({
        id: product.id,
        name: product.name,
        price: isNaN(price) ? 0 : price,
        image: product.image,
        quantity: quantity
      });
    }

    this.saveCart();
    return this.items;
  }

  /**
   * 从购物车移除商品
   */
  removeItem(productId) {
    this.items = this.items.filter(item => item.id !== productId);
    this.saveCart();
    return this.items;
  }

  /**
   * 更新商品数量
   */
  updateQuantity(productId, quantity) {
    const item = this.items.find(cartItem => cartItem.id === productId);
    if (item) {
      if (quantity <= 0) {
        return this.removeItem(productId);
      }
      item.quantity = quantity;
      this.saveCart();
      return this.items;

    }
    return this.items;
  }

  /**
   * 清空购物车
   */
  clearCart() {
    this.items = [];
    // 清空购物车时移除localStorage中的数据
    if (this.storage?.local?.removeItem) {
      this.storage.local.removeItem(this.storageKey);
    } else {
      localStorage.removeItem(this.storageKey);
    }
    return this.items;
  }

  /**
   * 获取购物车总金额
   */
  getTotal() {
    return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  /**
   * 获取购物车商品总数量
   */
  getTotalItems() {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * 获取购物车商品列表
   */
  getItems() {
    return [...this.items]; // 返回副本，防止外部修改
  }

  /**
   * 从本地存储加载购物车数据
   */
  loadCart() {
    try {
      const storedData = this.storage?.local?.getItem(this.storageKey) || localStorage.getItem(this.storageKey);
      if (!storedData) {
        this.items = [];
        return;
      }

      const data = JSON.parse(storedData);

      // 数据验证
      if (!Array.isArray(data)) {
        if (window.errorUtils) {
          window.errorUtils.handleError({
            type: 'warning',
            operation: '购物车数据验证',
            message: '购物车数据格式错误，重置购物车',
            error: new Error('购物车数据格式错误'),
            context: { component: 'CartDataManager', severity: 'medium', category: 'validation' }
          });
        } else {
          console.warn('购物车数据格式错误，重置购物车');
        }
        this.items = [];
        return;
      }

      // 验证每个商品项的结构
      this.items = data.filter(item => {
        return item &&
                    typeof item.id === 'string' &&
                    typeof item.name === 'string' &&
                    typeof item.price === 'number' &&
                    typeof item.quantity === 'number' &&
                    item.quantity > 0;
      });

    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError({
          type: 'error',
          operation: '加载购物车数据',
          message: '购物车数据加载失败，已重置为空购物车',
          error: error,
          context: { component: 'CartDataManager', severity: 'high', category: 'storage' }
        });
      } else {
        console.error('加载购物车数据失败:', error);
      }

      // 使用全局错误处理器
      if (window.errorHandler) {
        window.errorHandler.handleStorageError(error, '加载购物车数据');
      }

      // 清除损坏的数据
      if (this.storage?.local?.removeItem) {
        this.storage.local.removeItem(this.storageKey);
      } else {
        localStorage.removeItem(this.storageKey);
      }
      this.items = [];
    }
  }

  /**
   * 保存购物车到本地存储
   */
  saveCart() {
    try {
      const cartData = {
        version: this.version,
        timestamp: Date.now(),
        items: this.items,
        metadata: {
          totalItems: this.getTotalItems(),
          totalAmount: this.getTotal(),
          lastUpdated: new Date().toISOString()
        }
      };

      if (this.storage?.setItem) {
        this.storage.setItem(this.storageKey, JSON.stringify(cartData));
      } else if (this.storage?.local?.setItem) {
        this.storage.local.setItem(this.storageKey, JSON.stringify(cartData));
      } else {
        localStorage.setItem(this.storageKey, JSON.stringify(cartData));
      }

      // 触发自定义事件通知其他组件
      window.dispatchEvent(new CustomEvent('cartUpdated', {
        detail: {
          items: this.items,
          totalItems: this.getTotalItems(),
          totalAmount: this.getTotal()
        }
      }));

      return true;
    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError({
          type: 'error',
          operation: '保存购物车数据',
          message: '购物车数据保存失败，请稍后重试',
          error: error,
          context: { component: 'CartDataManager', severity: 'high', category: 'storage' }
        });
      } else {
        console.error('保存购物车数据失败:', error);
      }

      // 使用全局错误处理器
      if (window.errorHandler) {
        window.errorHandler.handleStorageError(error, '保存购物车数据');
      }

      // 如果是存储配额问题，尝试清理旧数据
      if (error.name === 'QuotaExceededError') {
        this.handleStorageQuotaExceeded();
      }

      return false;
    }
  }

  /**
   * 处理存储配额超限情况
   */
  handleStorageQuotaExceeded() {
    if (window.errorUtils) {
      window.errorUtils.handleError({
        type: 'warning',
        operation: '存储配额管理',
        message: '本地存储配额已满，正在尝试清理数据',
        error: new Error('本地存储配额已满'),
        context: { component: 'CartDataManager', severity: 'medium', category: 'storage' }
      });
    } else {
      console.warn('本地存储配额已满，尝试清理数据');
    }

    try {
      // 保留最近的100个商品记录
      if (this.items.length > 100) {
        this.items = this.items.slice(-100);
        this.saveCart();
        if (this.utils?.showNotification) {
          this.utils.showNotification('购物车数据已优化，保留最近100件商品', 'info');
        } else {
          if (window.errorUtils) {
            window.errorUtils.handleError({
              type: 'info',
              operation: '购物车数据优化',
              message: '购物车数据已优化，保留最近100件商品',
              context: { component: 'CartDataManager', severity: 'low', category: 'info' }
            });
          } else {
            console.info('购物车数据已优化，保留最近100件商品');
          }
        }
      } else {
        // 如果商品数量不多但仍然出错，可能是浏览器存储空间不足
        if (this.utils?.showNotification) {
          this.utils.showNotification('浏览器存储空间不足，请清理浏览器数据', 'error');
        } else {
          if (window.errorUtils) {
            window.errorUtils.handleError({
              type: 'error',
              operation: '存储空间检查',
              message: '浏览器存储空间不足，请清理浏览器数据',
              error: new Error('浏览器存储空间不足'),
              context: { component: 'CartDataManager', severity: 'high', category: 'storage' }
            });
          } else {
            console.error('浏览器存储空间不足，请清理浏览器数据');
          }
        }
      }
    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError({
          type: 'error',
          operation: '处理存储配额',
          message: '存储空间优化失败',
          error: error,
          context: { component: 'CartDataManager', severity: 'medium', category: 'storage' }
        });
      } else {
        console.error('处理存储配额失败:', error);
      }
    }
  }

  /**
   * 设置自动保存机制
   */
  setupAutoSave() {
    setInterval(() => {
      this.saveCart();
    }, this.autoSaveInterval);
  }

  // 这些方法在ShoppingCart类中已经实现，这里删除重复定义
}

/**
 * ShoppingCart UI管理器类
 * 负责购物车的UI更新和用户交互
 */
class ShoppingCart {
  constructor(dataManager = null) {
    this.dataManager = dataManager || new CartDataManager();
    this.domUtils = window.domUtils || null;
    this.utils = window.utils || null;
  }

  /**
   * 初始化购物车UI
   */
  init() {
    // 监听存储变化
    window.addEventListener('storage', (e) => {
      if (e.key === this.dataManager.storageKey) {
        this.dataManager.loadCart();
        this.updateCartDisplay();
      }
    });

    // 页面卸载时保存数据
    window.addEventListener('beforeunload', () => {
      this.dataManager.saveCart();
    });

    // 初始化显示
    this.updateCartDisplay();

    // 设置自动保存
    this.setupAutoSave();
  }

  /**
   * 设置自动保存机制
   */
  setupAutoSave() {
    setInterval(() => {
      this.dataManager.saveCart();
    }, 30000);
  }

  /**
   * 添加商品到购物车
   */
  addProduct(product) {
    const result = this.dataManager.addItem(product);
    this.updateCartDisplay();
    if (this.utils?.showNotification) {
      this.utils.showNotification(`${product.name} 已添加到购物车`, 'success');
    }
    return result;
  }

  /**
   * 从购物车移除商品
   */
  removeProduct(productId) {
    const result = this.dataManager.removeItem(productId);
    this.updateCartDisplay();
    if (this.utils?.showNotification) {
      this.utils.showNotification('商品已从购物车移除', 'info');
    }
    return result;
  }

  /**
   * 更新商品数量
   */
  updateProductQuantity(productId, quantity) {
    const result = this.dataManager.updateQuantity(productId, quantity);
    this.updateCartDisplay();
    return result;
  }

  /**
   * 清空购物车
   */
  clearCart() {
    this.dataManager.clearCart();
    this.updateCartDisplay();
    if (this.utils?.showNotification) {
      this.utils.showNotification('购物车已清空', 'info');
    }
  }

  /**
   * 更新购物车显示
   */
  updateCartDisplay() {
    this.updateCartCount();
    this.updateCartTotal();
    this.renderCartItems();
  }

  /**
   * 更新购物车数量显示
   */
  updateCartCount() {
    const countElements = document.querySelectorAll('.cart-count, #cart-count');
    const totalItems = this.dataManager.getTotalItems();

    countElements.forEach(element => {
      if (element) {
        element.textContent = totalItems;
        element.style.display = totalItems > 0 ? 'inline' : 'none';
      }
    });
  }

  /**
   * 更新购物车总价显示
   */
  updateCartTotal() {
    const totalElements = document.querySelectorAll('.cart-total, #cart-total');
    const total = this.dataManager.getTotal();

    totalElements.forEach(element => {
      if (element) {
        element.textContent = `¥${total.toFixed(2)}`;
      }
    });
  }

  /**
   * 渲染购物车商品列表
   */
  renderCartItems() {
    const cartContainer = document.querySelector('#cart-items, .cart-items');
    if (!cartContainer) {return;}

    const items = this.dataManager.getItems();

    if (items.length === 0) {
      cartContainer.innerHTML = '<p class="empty-cart">购物车为空</p>';
      return;
    }

    cartContainer.innerHTML = items.map(item => `
      <div class="cart-item" data-product-id="${item.id}">
        <img src="${item.image}" alt="${item.name}" class="cart-item-image">
        <div class="cart-item-details">
          <h4>${item.name}</h4>
          <p class="cart-item-price">¥${item.price.toFixed(2)}</p>
          <div class="cart-item-quantity">
            <button class="quantity-btn minus" onclick="cart.updateProductQuantity('${item.id}', ${item.quantity - 1})">-</button>
            <span class="quantity">${item.quantity}</span>
            <button class="quantity-btn plus" onclick="cart.updateProductQuantity('${item.id}', ${item.quantity + 1})">+</button>
          </div>
        </div>
        <button class="remove-item" onclick="cart.removeProduct('${item.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `).join('');
  }

  /**
   * 别名方法 - 为了兼容测试和向后兼容
   * 注意：推荐直接使用 cart.dataManager.method() 调用数据层方法
   */
  clear() {
    return this.clearCart();
  }

  updateUI() {
    return this.updateCartDisplay();
  }

  /**
   * 获取购物车商品数组 - 兼容测试（属性访问器）
   */
  get items() {
    return this.dataManager.getItems();
  }

  /**
   * 获取商品总数量 - 兼容测试
   */
  getItemCount() {
    return this.dataManager.getTotalItems();
  }

  /**
   * 获取唯一商品数量 - 兼容测试
   */
  getUniqueItemCount() {
    return this.dataManager.getItems().length;
  }
}

// 创建全局购物车实例
// 使用依赖注入容器创建购物车实例
if (typeof window !== 'undefined') {
  // 等待依赖注入容器初始化
  if (window.diContainer) {
    window.cart = new ShoppingCart();
    window.diContainer.register('cart', window.cart);
  } else {
    // 如果依赖注入容器未初始化，延迟创建
    document.addEventListener('DOMContentLoaded', () => {
      window.cart = new ShoppingCart();
      if (window.diContainer) {
        window.diContainer.register('cart', window.cart);
      }
    });
  }
}

// 导出类和实例
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CartDataManager, ShoppingCart };
} else {
  window.CartDataManager = CartDataManager;
  window.ShoppingCart = ShoppingCart;
}
