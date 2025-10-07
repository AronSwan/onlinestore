/**
 * 统一购物车模块 - 最大化功能整合
 * 
 * 整合功能：
 * 1. CartManager - 购物车状态管理（保留现有功能）
 * 2. CartUI - 购物车界面组件（新增）
 * 3. 购物车图标管理（保留现有功能）
 * 4. 后端同步功能（增强）
 * 
 * 确保不影响现有购物车按钮图标功能
 */

/**
 * 购物车管理器类 - 增强版
 */
class CartManager {
  constructor() {
    // 保留现有初始化逻辑
    this.cart = this.loadCartSync();
    this.productIdManager = window.globalProductIdManager || new (window.ProductIdManager || class {})();
    
    // 新增功能：事件监听器
    this.listeners = new Set();
    this.syncInProgress = false;
    this.debounceTimers = new Map();
    this.debounceDelay = 500;
    
    // 绑定事件
    this.bindEvents();
    
    // 异步初始化
    this.initAsync();
  }
  
  // 保留现有方法
  loadCartSync() {
    const cartData = localStorage.getItem('reich_cart');
    return cartData ? JSON.parse(cartData) : [];
  }
  
  async initAsync() {
    this.cart = await this.loadCart();
    await this.initCartUI();
  }
  
  async loadCart() {
    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true' || sessionStorage.getItem('userLoggedIn') === 'true';
    
    if (isLoggedIn) {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch('/api/cart', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        if (response.ok) {
          const cart = data.cart || [];
          localStorage.setItem('reich_cart', JSON.stringify(cart));
          return cart;
        }
      } catch (error) {
        console.error('加载购物车数据出错:', error);
      }
    }
    
    const cartData = localStorage.getItem('reich_cart');
    return cartData ? JSON.parse(cartData) : [];
  }

  // 增强的UI初始化方法
  async initCartUI() {
    // 保留现有购物车图标更新功能
    const total = this.getTotalItems();
    const countEls = document.querySelectorAll('.cart-count');
    if (countEls && countEls.length) {
      countEls.forEach(el => {
        el.textContent = total;
        el.classList.add('updated');
        setTimeout(() => el.classList.remove('updated'), 400);
      });
    }

    // 更新SVG图标中的数字显示
    await this.updateSvgCartIcons(total);
    
    // 新增：初始化CartUI组件（如果页面需要）
    if (this.shouldInitCartUI()) {
      this.cartUI = new CartUI(this);
    }
  }

  // 新增：判断是否需要初始化CartUI
  shouldInitCartUI() {
    return document.querySelector('.cart-overlay') || 
           document.querySelector('[data-cart-ui="true"]') ||
           window.location.pathname.includes('cart');
  }

  // 保留现有方法：添加商品到购物车
  async addToCart(productData) {
    try {
      const {
        productId,
        productSkuId,
        productName,
        productBrand,
        productPrice,
        productQuantity = 1,
        productPic,
        productAttribute = '{}'
      } = productData;

      // 参数验证
      if (!productId || !productSkuId || !productName || !productPrice) {
        throw new Error('商品信息不完整');
      }

      // 检查是否已存在
      const existingItem = this.cart.find(item => item.productSkuId === productSkuId);
      if (existingItem) {
        // 合并数量
        const newQuantity = existingItem.productQuantity + productQuantity;
        if (newQuantity > 999) {
          throw new Error('单个商品数量不能超过999');
        }
        return await this.updateItemQuantity(productSkuId, newQuantity);
      }

      // 检查购物车容量
      if (this.cart.length >= 500) {
        throw new Error('购物车最多添加500件商品');
      }

      // 构建新商品
      const newItem = {
        productId,
        productSkuId,
        productName,
        productBrand,
        productPrice: parseFloat(productPrice),
        productQuantity: parseInt(productQuantity),
        productPic,
        productAttribute,
        selected: true,
        addedAt: Date.now()
      };

      // 添加到购物车
      this.cart.push(newItem);
      
      // 保存到本地存储
      this.saveCart();
      
      // 同步到服务端
      await this.syncToServer();
      
      // 更新UI
      await this.initCartUI();
      
      // 通知监听器
      this.notifyListeners('itemAdded', { item: newItem });
      
      return newItem;
    } catch (error) {
      console.error('添加商品到购物车失败:', error);
      throw error;
    }
  }

  // 保留现有方法：更新商品数量
  async updateItemQuantity(productSkuId, quantity) {
    const item = this.cart.find(item => item.productSkuId === productSkuId);
    if (!item) {
      throw new Error('商品不存在于购物车中');
    }
    
    if (quantity <= 0) {
      return await this.removeItem(productSkuId);
    }
    
    if (quantity > 999) {
      throw new Error('单个商品数量不能超过999');
    }
    
    const oldQuantity = item.productQuantity;
    item.productQuantity = quantity;
    
    // 保存到本地存储
    this.saveCart();
    
    // 同步到服务端
    await this.syncToServer();
    
    // 更新UI
    await this.initCartUI();
    
    // 通知监听器
    this.notifyListeners('quantityUpdated', { item, oldQuantity, newQuantity: quantity });
    
    return item;
  }

  // 保留现有方法：移除商品
  async removeItem(productSkuId) {
    const itemIndex = this.cart.findIndex(item => item.productSkuId === productSkuId);
    if (itemIndex === -1) {
      throw new Error('商品不存在于购物车中');
    }
    
    const removedItem = this.cart.splice(itemIndex, 1)[0];
    
    // 保存到本地存储
    this.saveCart();
    
    // 同步到服务端
    await this.syncToServer();
    
    // 更新UI
    await this.initCartUI();
    
    // 通知监听器
    this.notifyListeners('itemRemoved', { item: removedItem });
    
    return removedItem;
  }

  // 保留现有方法：获取总商品数量
  getTotalItems() {
    return this.cart.reduce((total, item) => total + item.productQuantity, 0);
  }

  // 保留现有方法：获取总价格
  getTotalPrice() {
    return this.cart.reduce((total, item) => total + (item.productPrice * item.productQuantity), 0);
  }

  // 保留现有方法：获取选中商品总价格
  getSelectedTotalPrice() {
    return this.cart
      .filter(item => item.selected)
      .reduce((total, item) => total + (item.productPrice * item.productQuantity), 0);
  }

  // 保留现有方法：保存购物车
  saveCart() {
    localStorage.setItem('reich_cart', JSON.stringify(this.cart));
  }

  // 保留现有方法：清空购物车
  async clearCart() {
    const removedItems = [...this.cart];
    this.cart = [];
    
    // 保存到本地存储
    this.saveCart();
    
    // 同步到服务端
    await this.syncToServer();
    
    // 更新UI
    await this.initCartUI();
    
    // 通知监听器
    this.notifyListeners('cartCleared', { removedItems });
  }

  // 保留现有方法：同步到服务端
  async syncToServer() {
    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true' || sessionStorage.getItem('userLoggedIn') === 'true';
    
    if (!isLoggedIn) {
      return; // 未登录用户不同步到服务端
    }
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cart: this.cart })
      });
    } catch (error) {
      console.error('同步购物车到服务端失败:', error);
    }
  }

  // 保留现有方法：更新SVG购物车图标
  async updateSvgCartIcons(total) {
    const svgCountEls = document.querySelectorAll('svg .cart-count-text');
    if (svgCountEls && svgCountEls.length) {
      svgCountEls.forEach(el => {
        el.textContent = total;
      });
    }
  }

  // 新增：事件监听器管理
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('购物车事件监听器执行失败:', error);
      }
    });
  }

  // 保留现有方法：绑定事件
  bindEvents() {
    // 保留现有事件绑定逻辑
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-add-to-cart]')) {
        const productData = this.getProductDataFromElement(e.target.closest('[data-add-to-cart]'));
        if (productData) {
          this.addToCart(productData);
        }
      }
    });
  }

  // 保留现有方法：从元素获取商品数据
  getProductDataFromElement(element) {
    // 保留现有逻辑
    return {
      productId: element.dataset.productId,
      productSkuId: element.dataset.productSkuId,
      productName: element.dataset.productName,
      productBrand: element.dataset.productBrand,
      productPrice: element.dataset.productPrice,
      productQuantity: parseInt(element.dataset.productQuantity) || 1,
      productPic: element.dataset.productPic,
      productAttribute: element.dataset.productAttribute || '{}'
    };
  }
}

/**
 * 购物车UI组件类 - 新增功能
 */
class CartUI {
  constructor(cartManager) {
    this.cartManager = cartManager;
    this.isVisible = false;
    this.animationDuration = 300;
    
    this.init();
  }

  /**
   * 初始化购物车UI
   */
  init() {
    this.createCartHTML();
    this.bindEvents();
    this.bindCartManagerEvents();
    this.updateCartBadge();
  }

  /**
   * 创建购物车HTML结构
   */
  createCartHTML() {
    // 如果页面已有购物车浮层，则使用现有结构
    const existingOverlay = document.querySelector('.cart-overlay');
    if (existingOverlay) {
      this.elements = this.getExistingElements(existingOverlay);
      return;
    }
    
    // 创建新的购物车浮层
    const overlay = document.createElement('div');
    overlay.className = 'cart-overlay';
    overlay.innerHTML = `
      <div class="cart-panel">
        <div class="cart-header">
          <h3>购物车</h3>
          <button class="cart-close-btn" aria-label="关闭购物车">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
            </svg>
          </button>
        </div>
        
        <div class="cart-body">
          <div class="cart-items-list"></div>
          <div class="cart-empty">
            <p>购物车为空</p>
          </div>
        </div>
        
        <div class="cart-footer">
          <div class="cart-summary">
            <div class="cart-total">
              <span>已选 <span class="selected-count">0</span> 件商品</span>
              <span class="total-price">¥0.00</span>
            </div>
            <div class="cart-actions">
              <button class="checkout-btn" disabled>去结算</button>
              <button class="clear-selected-btn" disabled>清空选中</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    this.elements = this.getExistingElements(overlay);
  }

  /**
   * 获取现有元素引用
   */
  getExistingElements(overlay) {
    return {
      cartOverlay: overlay,
      cartPanel: overlay.querySelector('.cart-panel'),
      cartHeader: overlay.querySelector('.cart-header'),
      cartBody: overlay.querySelector('.cart-body'),
      cartFooter: overlay.querySelector('.cart-footer'),
      cartItemsList: overlay.querySelector('.cart-items-list'),
      selectAllCheckbox: overlay.querySelector('.select-all-checkbox'),
      totalPrice: overlay.querySelector('.total-price'),
      selectedCount: overlay.querySelector('.selected-count'),
      checkoutBtn: overlay.querySelector('.checkout-btn'),
      clearSelectedBtn: overlay.querySelector('.clear-selected-btn')
    };
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 关闭按钮事件
    if (this.elements.cartHeader) {
      this.elements.cartHeader.querySelector('.cart-close-btn').addEventListener('click', () => {
        this.hide();
      });
    }
    
    // 点击外部关闭
    if (this.elements.cartOverlay) {
      this.elements.cartOverlay.addEventListener('click', (e) => {
        if (e.target === this.elements.cartOverlay) {
          this.hide();
        }
      });
    }
    
    // ESC键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  /**
   * 绑定购物车管理器事件
   */
  bindCartManagerEvents() {
    this.cartManager.addListener((event, data) => {
      switch (event) {
        case 'itemAdded':
        case 'itemRemoved':
        case 'quantityUpdated':
        case 'cartCleared':
          this.updateCartDisplay();
          break;
      }
    });
  }

  /**
   * 显示购物车
   */
  show() {
    if (this.elements.cartOverlay) {
      this.elements.cartOverlay.style.display = 'block';
      setTimeout(() => {
        this.elements.cartOverlay.classList.add('visible');
        this.isVisible = true;
      }, 10);
    }
  }

  /**
   * 隐藏购物车
   */
  hide() {
    if (this.elements.cartOverlay) {
      this.elements.cartOverlay.classList.remove('visible');
      setTimeout(() => {
        this.elements.cartOverlay.style.display = 'none';
        this.isVisible = false;
      }, this.animationDuration);
    }
  }

  /**
   * 更新购物车显示
   */
  updateCartDisplay() {
    const cart = this.cartManager.cart;
    const isEmpty = cart.length === 0;
    
    // 更新空状态
    this.updateEmptyState(isEmpty);
    
    if (!isEmpty) {
      // 更新商品列表
      this.updateItemsList(cart);
      
      // 更新摘要
      this.updateCartSummary();
    }
    
    // 更新徽章
    this.updateCartBadge();
  }

  /**
   * 更新空状态显示
   */
  updateEmptyState(isEmpty) {
    const emptyElement = this.elements.cartBody.querySelector('.cart-empty');
    const itemsList = this.elements.cartItemsList;
    
    if (isEmpty) {
      if (emptyElement) emptyElement.style.display = 'flex';
      if (itemsList) itemsList.style.display = 'none';
      if (this.elements.cartFooter) this.elements.cartFooter.style.display = 'none';
    } else {
      if (emptyElement) emptyElement.style.display = 'none';
      if (itemsList) itemsList.style.display = 'block';
      if (this.elements.cartFooter) this.elements.cartFooter.style.display = 'block';
    }
  }

  /**
   * 更新商品列表
   */
  updateItemsList(cart) {
    if (!this.elements.cartItemsList) return;
    
    this.elements.cartItemsList.innerHTML = cart.map(item => `
      <div class="cart-item" data-sku-id="${item.productSkuId}">
        <div class="item-checkbox">
          <input type="checkbox" ${item.selected ? 'checked' : ''} 
                 onchange="cartManager.setItemSelected('${item.productSkuId}', this.checked)">
        </div>
        <div class="item-image">
          <img src="${item.productPic}" alt="${item.productName}">
        </div>
        <div class="item-details">
          <h4 class="item-name">${item.productName}</h4>
          <p class="item-brand">${item.productBrand}</p>
          <p class="item-price">¥${item.productPrice.toFixed(2)}</p>
        </div>
        <div class="item-quantity">
          <button onclick="cartManager.updateItemQuantity('${item.productSkuId}', ${item.productQuantity - 1})">-</button>
          <span>${item.productQuantity}</span>
          <button onclick="cartManager.updateItemQuantity('${item.productSkuId}', ${item.productQuantity + 1})">+</button>
        </div>
        <div class="item-total">
          ¥${(item.productPrice * item.productQuantity).toFixed(2)}
        </div>
        <button class="item-remove" onclick="cartManager.removeItem('${item.productSkuId}')">
          ×
        </button>
      </div>
    `).join('');
  }

  /**
   * 更新购物车摘要
   */
  updateCartSummary() {
    const selectedItems = this.cartManager.cart.filter(item => item.selected).length;
    const totalValue = this.cartManager.getSelectedTotalPrice();
    
    if (this.elements.selectedCount) {
      this.elements.selectedCount.textContent = selectedItems;
    }
    
    if (this.elements.totalPrice) {
      this.elements.totalPrice.textContent = `¥${totalValue.toFixed(2)}`;
    }
    
    // 更新按钮状态
    const hasSelected = selectedItems > 0;
    if (this.elements.checkoutBtn) {
      this.elements.checkoutBtn.disabled = !hasSelected;
    }
    if (this.elements.clearSelectedBtn) {
      this.elements.clearSelectedBtn.disabled = !hasSelected;
    }
  }

  /**
   * 更新购物车徽章
   */
  updateCartBadge() {
    const total = this.cartManager.getTotalItems();
    const badgeEls = document.querySelectorAll('.cart-badge, .cart-count');
    
    badgeEls.forEach(el => {
      el.textContent = total;
      el.style.display = total > 0 ? 'block' : 'none';
    });
  }
}

// 全局购物车管理器实例
let cartManager;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  cartManager = new CartManager();
  window.cartManager = cartManager;
  
  // 为现有购物车按钮添加点击事件
  const cartButtons = document.querySelectorAll('[data-cart-button]');
  cartButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (cartManager.cartUI) {
        cartManager.cartUI.show();
      }
    });
  });
  
  console.log('统一购物车模块初始化完成');
});