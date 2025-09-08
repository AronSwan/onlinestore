/* global Utils */
/**
 * 订单管理系统
 * 负责订单的创建、状态跟踪、历史记录等功能
 */
class OrderManager {
  constructor() {
    this.orders = new Map();
    this.orderHistory = [];
    this.orderCounter = 1;
    this.eventListeners = new Map();

    // 订单状态枚举
    this.ORDER_STATUS = {
      PENDING: 'pending',           // 待处理
      CONFIRMED: 'confirmed',       // 已确认
      PROCESSING: 'processing',     // 处理中
      SHIPPED: 'shipped',          // 已发货
      DELIVERED: 'delivered',      // 已送达
      CANCELLED: 'cancelled',      // 已取消
      REFUNDED: 'refunded'         // 已退款
    };

    this.loadOrdersFromStorage();
  }

  /**
     * 创建新订单
     * @param {Object} orderData - 订单数据
     * @param {Array} orderData.items - 商品列表
     * @param {Object} orderData.customer - 客户信息
     * @param {Object} orderData.shipping - 配送信息
     * @param {Object} orderData.payment - 支付信息
     * @returns {Object} 创建的订单对象
     */
  createOrder(orderData) {
    try {
      // 验证订单数据
      this.validateOrderData(orderData);

      // 生成订单ID
      const orderId = this.generateOrderId();

      // 创建订单对象
      const order = {
        id: orderId,
        orderNumber: `ORD-${Date.now()}-${orderId}`,
        status: this.ORDER_STATUS.PENDING,
        items: orderData.items.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity
        })),
        customer: {
          id: orderData.customer.id,
          name: orderData.customer.name,
          email: orderData.customer.email,
          phone: orderData.customer.phone
        },
        shipping: {
          address: orderData.shipping.address,
          city: orderData.shipping.city,
          postalCode: orderData.shipping.postalCode,
          method: orderData.shipping.method || 'standard'
        },
        payment: {
          method: orderData.payment.method,
          amount: this.calculateOrderTotal(orderData.items),
          currency: orderData.payment.currency || 'CNY',
          status: 'pending'
        },
        timestamps: {
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        },
        notes: orderData.notes || '',
        trackingNumber: null
      };

      // 保存订单
      this.orders.set(orderId, order);
      this.orderHistory.push({
        orderId,
        action: 'created',
        timestamp: new Date().toISOString(),
        details: '订单创建成功'
      });

      // 保存到本地存储
      this.saveOrdersToStorage();

      // 触发订单创建事件
      this.emit('orderCreated', { order });

      console.log(`订单创建成功: ${order.orderNumber}`);
      return order;

    } catch (error) {
      console.error('创建订单失败:', error);

      // 使用全局错误处理器
      if (window.errorHandler) {
        window.errorHandler.handleError({
          type: 'order',
          operation: '创建订单',
          message: error.message || '订单创建失败',
          error: error
        });
      }

      throw new Error(`订单创建失败: ${error.message}`);
    }
  }

  /**
     * 更新订单状态
     * @param {string} orderId - 订单ID
     * @param {string} newStatus - 新状态
     * @param {string} notes - 备注信息
     * @returns {boolean} 更新是否成功
     */
  updateOrderStatus(orderId, newStatus, notes = '') {
    try {
      const order = this.orders.get(orderId);
      if (!order) {
        throw new Error('订单不存在');
      }

      // 验证状态转换是否合法
      if (!this.isValidStatusTransition(order.status, newStatus)) {
        throw new Error(`无效的状态转换: ${order.status} -> ${newStatus}`);
      }

      const oldStatus = order.status;
      order.status = newStatus;
      order.timestamps.updated = new Date().toISOString();

      // 记录状态变更历史
      this.orderHistory.push({
        orderId,
        action: 'statusChanged',
        timestamp: new Date().toISOString(),
        details: `状态从 ${oldStatus} 变更为 ${newStatus}`,
        notes
      });

      // 特殊状态处理
      if (newStatus === this.ORDER_STATUS.SHIPPED) {
        order.trackingNumber = this.generateTrackingNumber();
      }

      // 保存到本地存储
      this.saveOrdersToStorage();

      // 触发状态更新事件
      this.emit('orderStatusUpdated', {
        order,
        oldStatus,
        newStatus,
        notes
      });

      console.log(`订单 ${order.orderNumber} 状态更新: ${oldStatus} -> ${newStatus}`);
      return true;

    } catch (error) {
      console.error('更新订单状态失败:', error);
      return false;
    }
  }

  /**
     * 获取订单信息
     * @param {string} orderId - 订单ID
     * @returns {Object|null} 订单对象
     */
  getOrder(orderId) {
    return this.orders.get(orderId) || null;
  }

  /**
     * 根据订单号获取订单
     * @param {string} orderNumber - 订单号
     * @returns {Object|null} 订单对象
     */
  getOrderByNumber(orderNumber) {
    for (const order of this.orders.values()) {
      if (order.orderNumber === orderNumber) {
        return order;
      }
    }
    return null;
  }

  /**
     * 获取用户的所有订单
     * @param {string} customerId - 客户ID
     * @returns {Array} 订单列表
     */
  getOrdersByCustomer(customerId) {
    const customerOrders = [];
    for (const order of this.orders.values()) {
      if (order.customer.id === customerId) {
        customerOrders.push(order);
      }
    }
    return customerOrders.sort((a, b) =>
      new Date(b.timestamps.created) - new Date(a.timestamps.created)
    );
  }

  /**
     * 获取订单历史记录
     * @param {string} orderId - 订单ID
     * @returns {Array} 历史记录列表
     */
  getOrderHistory(orderId) {
    return this.orderHistory.filter(record => record.orderId === orderId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
     * 取消订单
     * @param {string} orderId - 订单ID
     * @param {string} reason - 取消原因
     * @returns {boolean} 取消是否成功
     */
  cancelOrder(orderId, reason = '') {
    const order = this.orders.get(orderId);
    if (!order) {
      console.error('订单不存在');
      return false;
    }

    // 只有特定状态的订单可以取消
    const cancellableStatuses = [
      this.ORDER_STATUS.PENDING,
      this.ORDER_STATUS.CONFIRMED
    ];

    if (!cancellableStatuses.includes(order.status)) {
      console.error('当前订单状态不允许取消');
      return false;
    }

    return this.updateOrderStatus(orderId, this.ORDER_STATUS.CANCELLED, reason);
  }

  /**
     * 验证订单数据
     * @param {Object} orderData - 订单数据
     */
  validateOrderData(orderData) {
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      throw new Error('订单必须包含至少一个商品');
    }

    if (!orderData.customer || !orderData.customer.id) {
      throw new Error('订单必须包含有效的客户信息');
    }

    if (!orderData.shipping || !orderData.shipping.address) {
      throw new Error('订单必须包含配送地址');
    }

    if (!orderData.payment || !orderData.payment.method) {
      throw new Error('订单必须包含支付方式');
    }

    // 验证商品数据
    for (const item of orderData.items) {
      if (!item.productId || !item.name || !item.price || !item.quantity) {
        throw new Error('商品信息不完整');
      }

      if (item.quantity <= 0 || item.price <= 0) {
        throw new Error('商品数量和价格必须大于0');
      }
    }
  }

  /**
     * 计算订单总金额
     * @param {Array} items - 商品列表
     * @returns {number} 总金额
     */
  calculateOrderTotal(items) {
    return items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }

  /**
     * 验证状态转换是否合法
     * @param {string} currentStatus - 当前状态
     * @param {string} newStatus - 新状态
     * @returns {boolean} 是否合法
     */
  isValidStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      [this.ORDER_STATUS.PENDING]: [
        this.ORDER_STATUS.CONFIRMED,
        this.ORDER_STATUS.CANCELLED
      ],
      [this.ORDER_STATUS.CONFIRMED]: [
        this.ORDER_STATUS.PROCESSING,
        this.ORDER_STATUS.CANCELLED
      ],
      [this.ORDER_STATUS.PROCESSING]: [
        this.ORDER_STATUS.SHIPPED,
        this.ORDER_STATUS.CANCELLED
      ],
      [this.ORDER_STATUS.SHIPPED]: [
        this.ORDER_STATUS.DELIVERED
      ],
      [this.ORDER_STATUS.DELIVERED]: [
        this.ORDER_STATUS.REFUNDED
      ],
      [this.ORDER_STATUS.CANCELLED]: [],
      [this.ORDER_STATUS.REFUNDED]: []
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
     * 生成订单ID
     * @returns {string} 订单ID
     */
  generateOrderId() {
    return `order_${this.orderCounter++}_${Date.now()}`;
  }

  /**
     * 生成物流跟踪号
     * @returns {string} 跟踪号
     */
  generateTrackingNumber() {
    const prefix = 'TRK';
    const timestamp = Date.now().toString().slice(-8);
    const random = Utils.generateSecureId('', 4).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  /**
     * 从本地存储加载订单数据
     */
  loadOrdersFromStorage() {
    try {
      const ordersData = localStorage.getItem('nexusshop_orders');
      const historyData = localStorage.getItem('nexusshop_order_history');
      const counterData = localStorage.getItem('nexusshop_order_counter');

      if (ordersData) {
        const parsedOrders = JSON.parse(ordersData);
        this.orders = new Map(Object.entries(parsedOrders));
      }

      if (historyData) {
        this.orderHistory = JSON.parse(historyData);
      }

      if (counterData) {
        this.orderCounter = parseInt(counterData, 10) || 1;
      }

    } catch (error) {
      console.error('加载订单数据失败:', error);
    }
  }

  /**
     * 保存订单数据到本地存储
     */
  saveOrdersToStorage() {
    try {
      const ordersObj = Object.fromEntries(this.orders);
      localStorage.setItem('nexusshop_orders', JSON.stringify(ordersObj));
      localStorage.setItem('nexusshop_order_history', JSON.stringify(this.orderHistory));
      localStorage.setItem('nexusshop_order_counter', this.orderCounter.toString());
    } catch (error) {
      console.error('保存订单数据失败:', error);
    }
  }

  /**
     * 添加事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
     * 移除事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {Object} data - 事件数据
     */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件处理器执行失败 (${event}):`, error);
        }
      });
    }
  }

  /**
     * 获取订单统计信息
     * @returns {Object} 统计信息
     */
  getOrderStatistics() {
    const stats = {
      total: this.orders.size,
      byStatus: {},
      totalRevenue: 0
    };

    // 初始化状态统计
    Object.values(this.ORDER_STATUS).forEach(status => {
      stats.byStatus[status] = 0;
    });

    // 计算统计数据
    for (const order of this.orders.values()) {
      stats.byStatus[order.status]++;
      if (order.status === this.ORDER_STATUS.DELIVERED) {
        stats.totalRevenue += order.payment.amount;
      }
    }

    return stats;
  }
}

// 导出类供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrderManager;
}
