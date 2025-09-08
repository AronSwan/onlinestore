/* global Utils */
/**
 * 订单管理UI组件
 * 提供订单创建、查看、管理的用户界面
 */
class OrderUI {
  constructor(orderManager, authManager) {
    this.orderManager = orderManager;
    this.authManager = authManager;
    this.currentOrder = null;
    this.isInitialized = false;

    // 绑定方法上下文
    this.handleCreateOrder = this.handleCreateOrder.bind(this);
    this.handleCancelOrder = this.handleCancelOrder.bind(this);
    this.handleTrackOrder = this.handleTrackOrder.bind(this);
  }

  /**
     * 初始化订单UI
     */
  init() {
    if (this.isInitialized) {
      return;
    }

    this.createOrderModals();
    this.bindEvents();
    this.setupOrderEventListeners();
    this.isInitialized = true;

    if (window.errorUtils) {
      window.errorUtils.handleError(null, {
        context: 'OrderUI.init',
        severity: 'info',
        category: 'lifecycle',
        userMessage: '订单UI初始化完成'
      });
    } else {
      console.log('订单UI初始化完成');
    }
  }

  /**
     * 创建订单相关的模态框
     */
  createOrderModals() {
    // 创建订单确认模态框
    this.createOrderConfirmModal();

    // 创建订单详情模态框
    this.createOrderDetailsModal();

    // 创建订单跟踪模态框
    this.createOrderTrackingModal();

    // 创建订单历史模态框
    this.createOrderHistoryModal();
  }

  /**
     * 创建订单确认模态框
     */
  createOrderConfirmModal() {
    const modal = document.createElement('div');
    modal.id = 'order-confirm-modal';
    modal.className = 'modal';
    modal.innerHTML = `
            <div class="modal-content order-confirm-content">
                <div class="modal-header">
                    <h2>确认订单</h2>
                    <button class="modal-close" data-modal="order-confirm-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="order-summary">
                        <h3>订单摘要</h3>
                        <div class="order-items" id="order-items-list">
                            <!-- 订单商品列表 -->
                        </div>
                        <div class="order-total">
                            <div class="total-row">
                                <span>商品总计:</span>
                                <span id="order-subtotal">¥0.00</span>
                            </div>
                            <div class="total-row">
                                <span>配送费:</span>
                                <span id="order-shipping">¥0.00</span>
                            </div>
                            <div class="total-row total-final">
                                <span>订单总计:</span>
                                <span id="order-total">¥0.00</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="order-form">
                        <div class="form-section">
                            <h3>配送信息</h3>
                            <div class="form-group">
                                <label for="shipping-address">配送地址 *</label>
                                <textarea id="shipping-address" required placeholder="请输入详细地址"></textarea>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="shipping-city">城市 *</label>
                                    <input type="text" id="shipping-city" required placeholder="城市">
                                </div>
                                <div class="form-group">
                                    <label for="shipping-postal">邮政编码</label>
                                    <input type="text" id="shipping-postal" placeholder="邮政编码">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="shipping-method">配送方式</label>
                                <select id="shipping-method">
                                    <option value="standard">标准配送 (免费)</option>
                                    <option value="express">快速配送 (+¥15)</option>
                                    <option value="overnight">次日达 (+¥30)</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h3>支付方式</h3>
                            <div class="payment-methods">
                                <label class="payment-option">
                                    <input type="radio" name="payment-method" value="alipay" checked>
                                    <span class="payment-icon">💰</span>
                                    <span>支付宝</span>
                                </label>
                                <label class="payment-option">
                                    <input type="radio" name="payment-method" value="wechat">
                                    <span class="payment-icon">💚</span>
                                    <span>微信支付</span>
                                </label>
                                <label class="payment-option">
                                    <input type="radio" name="payment-method" value="card">
                                    <span class="payment-icon">💳</span>
                                    <span>银行卡</span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <div class="form-group">
                                <label for="order-notes">订单备注</label>
                                <textarea id="order-notes" placeholder="如有特殊要求请在此说明"></textarea>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" data-modal="order-confirm-modal">取消</button>
                    <button class="btn btn-primary" id="confirm-order-btn">
                        <i class="fas fa-check"></i> 确认下单
                    </button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);
  }

  /**
     * 创建订单详情模态框
     */
  createOrderDetailsModal() {
    const modal = document.createElement('div');
    modal.id = 'order-details-modal';
    modal.className = 'modal';
    modal.innerHTML = `
            <div class="modal-content order-details-content">
                <div class="modal-header">
                    <h2>订单详情</h2>
                    <button class="modal-close" data-modal="order-details-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="order-info" id="order-details-info">
                        <!-- 订单详情内容 -->
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" data-modal="order-details-modal">关闭</button>
                    <button class="btn btn-danger" id="cancel-order-btn" style="display: none;">
                        <i class="fas fa-times"></i> 取消订单
                    </button>
                    <button class="btn btn-primary" id="track-order-btn" style="display: none;">
                        <i class="fas fa-truck"></i> 物流跟踪
                    </button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);
  }

  /**
     * 创建订单跟踪模态框
     */
  createOrderTrackingModal() {
    const modal = document.createElement('div');
    modal.id = 'order-tracking-modal';
    modal.className = 'modal';
    modal.innerHTML = `
            <div class="modal-content order-tracking-content">
                <div class="modal-header">
                    <h2>物流跟踪</h2>
                    <button class="modal-close" data-modal="order-tracking-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="tracking-info" id="tracking-info">
                        <!-- 物流跟踪信息 -->
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" data-modal="order-tracking-modal">关闭</button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);
  }

  /**
     * 创建订单历史模态框
     */
  createOrderHistoryModal() {
    const modal = document.createElement('div');
    modal.id = 'order-history-modal';
    modal.className = 'modal';
    modal.innerHTML = `
            <div class="modal-content order-history-content">
                <div class="modal-header">
                    <h2>我的订单</h2>
                    <button class="modal-close" data-modal="order-history-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="order-filters">
                        <select id="order-status-filter">
                            <option value="">全部订单</option>
                            <option value="pending">待处理</option>
                            <option value="confirmed">已确认</option>
                            <option value="processing">处理中</option>
                            <option value="shipped">已发货</option>
                            <option value="delivered">已送达</option>
                            <option value="cancelled">已取消</option>
                        </select>
                    </div>
                    <div class="order-list" id="order-history-list">
                        <!-- 订单历史列表 -->
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" data-modal="order-history-modal">关闭</button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);
  }

  /**
     * 绑定事件监听器
     */
  bindEvents() {
    // 确认订单按钮
    const confirmOrderBtn = document.getElementById('confirm-order-btn');
    if (confirmOrderBtn) {
      confirmOrderBtn.addEventListener('click', this.handleCreateOrder);
    }

    // 取消订单按钮
    const cancelOrderBtn = document.getElementById('cancel-order-btn');
    if (cancelOrderBtn) {
      cancelOrderBtn.addEventListener('click', this.handleCancelOrder);
    }

    // 物流跟踪按钮
    const trackOrderBtn = document.getElementById('track-order-btn');
    if (trackOrderBtn) {
      trackOrderBtn.addEventListener('click', this.handleTrackOrder);
    }

    // 配送方式变更
    const shippingMethod = document.getElementById('shipping-method');
    if (shippingMethod) {
      shippingMethod.addEventListener('change', this.updateOrderTotal.bind(this));
    }

    // 订单状态筛选
    const statusFilter = document.getElementById('order-status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', this.filterOrderHistory.bind(this));
    }

    // 模态框关闭事件
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-close') || e.target.dataset.modal) {
        const modalId = e.target.dataset.modal || e.target.closest('[data-modal]')?.dataset.modal;
        if (modalId) {
          this.closeModal(modalId);
        }
      }
    });
  }

  /**
     * 设置订单事件监听器
     */
  setupOrderEventListeners() {
    // 监听订单创建事件
    this.orderManager.on('orderCreated', (data) => {
      this.showOrderSuccess(data.order);
    });

    // 监听订单状态更新事件
    this.orderManager.on('orderStatusUpdated', (data) => {
      this.showStatusUpdateNotification(data);
    });
  }

  /**
     * 显示订单确认界面
     * @param {Array} cartItems - 购物车商品
     */
  showOrderConfirm(cartItems) {
    if (!cartItems || cartItems.length === 0) {
      this.showMessage('购物车为空，无法创建订单', 'error');
      return;
    }

    // 检查用户登录状态
    const currentUser = this.authManager.getCurrentUser();
    if (!currentUser) {
      this.showMessage('请先登录后再下单', 'error');
      return;
    }

    // 填充订单商品列表
    this.populateOrderItems(cartItems);

    // 更新订单总计
    this.updateOrderTotal();

    // 显示模态框
    this.showModal('order-confirm-modal');
  }

  /**
     * 填充订单商品列表
     * @param {Array} items - 商品列表
     */
  populateOrderItems(items) {
    const container = document.getElementById('order-items-list');
    if (!container) {return;}

    const orderHTML = items.map(item => `
            <div class="order-item">
                <div class="item-image">
                    <img src="${item.image || 'https://placehold.co/60x60/e5e7eb/6b7280?text=商品'}" alt="${item.name}">
                </div>
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <p class="item-price">¥${item.price.toFixed(2)}</p>
                </div>
                <div class="item-quantity">
                    <span>×${item.quantity}</span>
                </div>
                <div class="item-subtotal">
                    <span>¥${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            </div>
        `).join('');
    Utils.setElementHTML(container, orderHTML, true); // 内部生成的安全HTML

    // 保存商品数据供后续使用
    this.currentOrderItems = items;
  }

  /**
     * 更新订单总计
     */
  updateOrderTotal() {
    if (!this.currentOrderItems) {return;}

    const subtotal = this.currentOrderItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // 获取配送费
    const shippingMethod = document.getElementById('shipping-method')?.value || 'standard';
    const shippingCosts = {
      standard: 0,
      express: 15,
      overnight: 30
    };
    const shippingCost = shippingCosts[shippingMethod] || 0;

    const total = subtotal + shippingCost;

    // 更新显示
    const subtotalEl = document.getElementById('order-subtotal');
    const shippingEl = document.getElementById('order-shipping');
    const totalEl = document.getElementById('order-total');

    if (subtotalEl) {subtotalEl.textContent = `¥${subtotal.toFixed(2)}`;}
    if (shippingEl) {shippingEl.textContent = `¥${shippingCost.toFixed(2)}`;}
    if (totalEl) {totalEl.textContent = `¥${total.toFixed(2)}`;}
  }

  /**
     * 处理创建订单
     */
  async handleCreateOrder() {
    try {
      // 获取表单数据
      const orderData = this.collectOrderData();

      // 验证表单
      if (!this.validateOrderForm(orderData)) {
        return;
      }

      // 显示加载状态
      const confirmBtn = document.getElementById('confirm-order-btn');
      // const originalText = confirmBtn.innerHTML; // 暂时注释，未使用
      Utils.setElementHTML(confirmBtn, '<i class="fas fa-spinner fa-spin"></i> 处理中...', true);
      confirmBtn.disabled = true;

      // 创建订单
      // const order = this.orderManager.createOrder(orderData); // 暂时注释，未使用
      this.orderManager.createOrder(orderData);

      // 关闭确认模态框
      this.closeModal('order-confirm-modal');

      // 清空购物车（如果有购物车管理器）
      if (window.cartManager) {
        window.cartManager.clearCart();
      }

    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError(error, {
          context: 'OrderUI.handleCreateOrder',
          severity: 'error',
          category: 'order',
          userMessage: '创建订单失败',
          metadata: { orderData: this.collectOrderData() }
        });
      } else {
        console.error('创建订单失败:', error);
      }

      // 使用全局错误处理器
      if (window.errorHandler) {
        window.errorHandler.handleError({
          type: 'order',
          operation: '创建订单',
          message: error.message || '创建订单失败',
          component: 'OrderUI',
          details: { orderData: this.collectOrderData() }
        });
      } else {
        this.showMessage(`创建订单失败: ${error.message}`, 'error');
      }
    } finally {
      // 恢复按钮状态
      const confirmBtn = document.getElementById('confirm-order-btn');
      if (confirmBtn) {
        Utils.setElementHTML(confirmBtn, '<i class="fas fa-check"></i> 确认下单', true);
        confirmBtn.disabled = false;
      }
    }
  }

  /**
     * 收集订单数据
     * @returns {Object} 订单数据
     */
  collectOrderData() {
    const currentUser = this.authManager.getCurrentUser();
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value;

    return {
      items: this.currentOrderItems,
      customer: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone || ''
      },
      shipping: {
        address: document.getElementById('shipping-address')?.value || '',
        city: document.getElementById('shipping-city')?.value || '',
        postalCode: document.getElementById('shipping-postal')?.value || '',
        method: document.getElementById('shipping-method')?.value || 'standard'
      },
      payment: {
        method: paymentMethod || 'alipay',
        currency: 'CNY'
      },
      notes: document.getElementById('order-notes')?.value || ''
    };
  }

  /**
     * 验证订单表单
     * @param {Object} orderData - 订单数据
     * @returns {boolean} 验证是否通过
     */
  validateOrderForm(orderData) {
    if (!orderData.shipping.address.trim()) {
      this.showMessage('请填写配送地址', 'error');
      return false;
    }

    if (!orderData.shipping.city.trim()) {
      this.showMessage('请填写城市', 'error');
      return false;
    }

    return true;
  }

  /**
     * 显示订单成功信息
     * @param {Object} order - 订单对象
     */
  showOrderSuccess(order) {
    this.showMessage(`订单创建成功！订单号: ${order.orderNumber}`, 'success');

    // 可以选择显示订单详情
    setTimeout(() => {
      this.showOrderDetails(order.id);
    }, 2000);
  }

  /**
     * 显示订单详情
     * @param {string} orderId - 订单ID
     */
  showOrderDetails(orderId) {
    const order = this.orderManager.getOrder(orderId);
    if (!order) {
      this.showMessage('订单不存在', 'error');
      return;
    }

    // 填充订单详情
    this.populateOrderDetails(order);

    // 显示相关按钮
    this.updateOrderActionButtons(order);

    // 显示模态框
    this.showModal('order-details-modal');

    // 保存当前订单
    this.currentOrder = order;
  }

  /**
     * 填充订单详情
     * @param {Object} order - 订单对象
     */
  populateOrderDetails(order) {
    const container = document.getElementById('order-details-info');
    if (!container) {return;}

    const statusText = this.getStatusText(order.status);
    const statusClass = this.getStatusClass(order.status);

    const orderDetailsHTML = `
            <div class="order-header">
                <div class="order-number">
                    <h3>订单号: ${order.orderNumber}</h3>
                    <span class="order-status ${statusClass}">${statusText}</span>
                </div>
                <div class="order-date">
                    <span>下单时间: ${new Date(order.timestamps.created).toLocaleString()}</span>
                </div>
            </div>
            
            <div class="order-items-section">
                <h4>商品信息</h4>
                <div class="order-items-detail">
                    ${order.items.map(item => `
                        <div class="order-item-detail">
                            <span class="item-name">${item.name}</span>
                            <span class="item-price">¥${item.price.toFixed(2)}</span>
                            <span class="item-quantity">×${item.quantity}</span>
                            <span class="item-subtotal">¥${item.subtotal.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="order-total-detail">
                    <strong>订单总计: ¥${order.payment.amount.toFixed(2)}</strong>
                </div>
            </div>
            
            <div class="order-shipping-section">
                <h4>配送信息</h4>
                <p><strong>地址:</strong> ${order.shipping.address}</p>
                <p><strong>城市:</strong> ${order.shipping.city}</p>
                ${order.shipping.postalCode ? `<p><strong>邮编:</strong> ${order.shipping.postalCode}</p>` : ''}
                <p><strong>配送方式:</strong> ${this.getShippingMethodText(order.shipping.method)}</p>
                ${order.trackingNumber ? `<p><strong>物流单号:</strong> ${order.trackingNumber}</p>` : ''}
            </div>
            
            <div class="order-payment-section">
                <h4>支付信息</h4>
                <p><strong>支付方式:</strong> ${this.getPaymentMethodText(order.payment.method)}</p>
                <p><strong>支付状态:</strong> ${order.payment.status}</p>
            </div>
            
            ${order.notes ? `
                <div class="order-notes-section">
                    <h4>订单备注</h4>
                    <p>${order.notes}</p>
                </div>
            ` : ''}
        `;
    Utils.setElementHTML(container, orderDetailsHTML, true); // 内部生成的安全HTML
  }

  /**
     * 更新订单操作按钮
     * @param {Object} order - 订单对象
     */
  updateOrderActionButtons(order) {
    const cancelBtn = document.getElementById('cancel-order-btn');
    const trackBtn = document.getElementById('track-order-btn');

    // 取消订单按钮
    if (cancelBtn) {
      const canCancel = ['pending', 'confirmed'].includes(order.status);
      cancelBtn.style.display = canCancel ? 'inline-block' : 'none';
    }

    // 物流跟踪按钮
    if (trackBtn) {
      const canTrack = ['shipped', 'delivered'].includes(order.status);
      trackBtn.style.display = canTrack ? 'inline-block' : 'none';
    }
  }

  /**
     * 处理取消订单
     */
  async handleCancelOrder() {
    if (!this.currentOrder) {return;}

    // 使用模态框替代prompt
    const reason = await this.showCancelReasonDialog();
    if (!reason) {return;} // 用户取消了操作

    const success = this.orderManager.cancelOrder(this.currentOrder.id, reason);
    if (success) {
      this.showMessage('订单已取消', 'success');
      this.closeModal('order-details-modal');
    } else {
      this.showMessage('取消订单失败', 'error');
    }
  }

  /**
     * 处理物流跟踪
     */
  handleTrackOrder() {
    if (!this.currentOrder) {return;}

    this.showOrderTracking(this.currentOrder.id);
  }

  /**
     * 显示物流跟踪信息
     * @param {string} orderId - 订单ID
     */
  showOrderTracking(orderId) {
    const order = this.orderManager.getOrder(orderId);
    if (!order || !order.trackingNumber) {
      this.showMessage('暂无物流信息', 'info');
      return;
    }

    // 模拟物流跟踪信息
    const trackingInfo = this.generateTrackingInfo(order);

    const container = document.getElementById('tracking-info');
    if (container) {
      const trackingHTML = `
                <div class="tracking-header">
                    <h3>物流单号: ${order.trackingNumber}</h3>
                    <p>订单号: ${order.orderNumber}</p>
                </div>
                
                <div class="tracking-timeline">
                    ${trackingInfo.map(info => `
                        <div class="tracking-item ${info.completed ? 'completed' : ''}">
                            <div class="tracking-icon">
                                <i class="fas ${info.icon}"></i>
                            </div>
                            <div class="tracking-content">
                                <h4>${info.title}</h4>
                                <p>${info.description}</p>
                                ${info.time ? `<span class="tracking-time">${info.time}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
      Utils.setElementHTML(container, trackingHTML, true); // 内部生成的安全HTML
    }

    this.showModal('order-tracking-modal');
  }

  /**
     * 生成物流跟踪信息
     * @param {Object} order - 订单对象
     * @returns {Array} 跟踪信息列表
     */
  generateTrackingInfo(order) {
    const baseInfo = [
      {
        title: '订单确认',
        description: '您的订单已确认，正在准备发货',
        icon: 'fa-check-circle',
        completed: true,
        time: new Date(order.timestamps.created).toLocaleString()
      },
      {
        title: '商品出库',
        description: '商品已从仓库发出',
        icon: 'fa-box',
        completed: order.status !== 'confirmed',
        time: order.status !== 'confirmed' ? new Date(order.timestamps.updated).toLocaleString() : null
      },
      {
        title: '运输中',
        description: '商品正在运输途中',
        icon: 'fa-truck',
        completed: ['shipped', 'delivered'].includes(order.status),
        time: ['shipped', 'delivered'].includes(order.status) ? new Date(order.timestamps.updated).toLocaleString() : null
      },
      {
        title: '已送达',
        description: '商品已成功送达',
        icon: 'fa-home',
        completed: order.status === 'delivered',
        time: order.status === 'delivered' ? new Date(order.timestamps.updated).toLocaleString() : null
      }
    ];

    return baseInfo;
  }

  /**
     * 显示订单历史
     */
  showOrderHistory() {
    const currentUser = this.authManager.getCurrentUser();
    if (!currentUser) {
      this.showMessage('请先登录', 'error');
      return;
    }

    const orders = this.orderManager.getOrdersByCustomer(currentUser.id);
    this.populateOrderHistory(orders);
    this.showModal('order-history-modal');
  }

  /**
     * 填充订单历史列表
     * @param {Array} orders - 订单列表
     */
  populateOrderHistory(orders) {
    const container = document.getElementById('order-history-list');
    if (!container) {return;}

    if (orders.length === 0) {
      Utils.setElementHTML(container, '<div class="empty-orders">暂无订单记录</div>', true);
      return;
    }

    const ordersHTML = orders.map(order => {
      const statusText = this.getStatusText(order.status);
      const statusClass = this.getStatusClass(order.status);

      return `
                <div class="order-history-item" data-order-id="${order.id}">
                    <div class="order-summary">
                        <div class="order-info">
                            <h4>${order.orderNumber}</h4>
                            <p class="order-date">${new Date(order.timestamps.created).toLocaleDateString()}</p>
                        </div>
                        <div class="order-status">
                            <span class="status-badge ${statusClass}">${statusText}</span>
                        </div>
                        <div class="order-amount">
                            <span>¥${order.payment.amount.toFixed(2)}</span>
                        </div>
                        <div class="order-actions">
                            <button class="btn btn-sm btn-outline" onclick="orderUI.showOrderDetails('${order.id}')">
                                查看详情
                            </button>
                        </div>
                    </div>
                    <div class="order-items-preview">
                        ${order.items.slice(0, 3).map(item => `
                            <span class="item-preview">${item.name}</span>
                        `).join('')}
                        ${order.items.length > 3 ? `<span class="more-items">等${order.items.length}件商品</span>` : ''}
                    </div>
                </div>
            `;
    }).join('');
    Utils.setElementHTML(container, ordersHTML, true); // 内部生成的安全HTML
  }

  /**
     * 筛选订单历史
     */
  filterOrderHistory() {
    const currentUser = this.authManager.getCurrentUser();
    if (!currentUser) {return;}

    const statusFilter = document.getElementById('order-status-filter')?.value;
    let orders = this.orderManager.getOrdersByCustomer(currentUser.id);

    if (statusFilter) {
      orders = orders.filter(order => order.status === statusFilter);
    }

    this.populateOrderHistory(orders);
  }

  /**
     * 显示状态更新通知
     * @param {Object} data - 状态更新数据
     */
  showStatusUpdateNotification(data) {
    const statusText = this.getStatusText(data.newStatus);
    this.showMessage(`订单 ${data.order.orderNumber} 状态已更新为: ${statusText}`, 'info');
  }

  /**
     * 获取状态文本
     * @param {string} status - 状态值
     * @returns {string} 状态文本
     */
  getStatusText(status) {
    const statusMap = {
      pending: '待处理',
      confirmed: '已确认',
      processing: '处理中',
      shipped: '已发货',
      delivered: '已送达',
      cancelled: '已取消',
      refunded: '已退款'
    };
    return statusMap[status] || status;
  }

  /**
     * 获取状态样式类
     * @param {string} status - 状态值
     * @returns {string} 样式类名
     */
  getStatusClass(status) {
    const classMap = {
      pending: 'status-pending',
      confirmed: 'status-confirmed',
      processing: 'status-processing',
      shipped: 'status-shipped',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled',
      refunded: 'status-refunded'
    };
    return classMap[status] || 'status-default';
  }

  /**
     * 获取配送方式文本
     * @param {string} method - 配送方式
     * @returns {string} 配送方式文本
     */
  getShippingMethodText(method) {
    const methodMap = {
      standard: '标准配送',
      express: '快速配送',
      overnight: '次日达'
    };
    return methodMap[method] || method;
  }

  /**
     * 获取支付方式文本
     * @param {string} method - 支付方式
     * @returns {string} 支付方式文本
     */
  getPaymentMethodText(method) {
    const methodMap = {
      alipay: '支付宝',
      wechat: '微信支付',
      card: '银行卡'
    };
    return methodMap[method] || method;
  }

  /**
     * 显示模态框
     * @param {string} modalId - 模态框ID
     */
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  /**
     * 关闭模态框
     * @param {string} modalId - 模态框ID
     */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  /**
     * 显示消息提示
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型
     */
  showMessage(message, type = 'info') {
    // 对于错误类型，优先使用全局错误处理器
    if (type === 'error' && window.errorHandler) {
      window.errorHandler.handleError({
        type: 'ui',
        operation: '订单UI消息',
        message: message,
        component: 'OrderUI'
      });
      return;
    }

    // 创建消息元素
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    const messageHTML = `
            <div class="message-content">
                <i class="fas ${this.getMessageIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
    Utils.setElementHTML(messageEl, messageHTML, true); // 内部生成的安全HTML

    // 添加到页面
    document.body.appendChild(messageEl);

    // 自动移除
    setTimeout(() => {
      if (messageEl.parentElement) {
        messageEl.remove();
      }
    }, 3000);
  }

  /**
     * 获取消息图标
     * @param {string} type - 消息类型
     * @returns {string} 图标类名
     */
  getMessageIcon(type) {
    const iconMap = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };
    return iconMap[type] || 'fa-info-circle';
  }

  showCancelReasonDialog() {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal fade';
      const modalHTML = `
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">取消订单</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <label for="cancelReason" class="form-label">请输入取消原因（可选）：</label>
              <textarea id="cancelReason" class="form-control" rows="3" placeholder="请输入取消原因..."></textarea>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
              <button type="button" class="btn btn-danger" id="confirmCancel">确认取消订单</button>
            </div>
          </div>
        </div>
      `;
      Utils.setElementHTML(modal, modalHTML, true); // 内部生成的安全HTML

      document.body.appendChild(modal);
      const bsModal = new window.bootstrap.Modal(modal);

      modal.querySelector('#confirmCancel').addEventListener('click', () => {
        const reason = modal.querySelector('#cancelReason').value.trim() || '用户取消订单';
        bsModal.hide();
        resolve(reason);
      });

      modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
        resolve(null);
      });

      bsModal.show();
    });
  }
}

// 导出类供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrderUI;
}
