/* global Utils */
/**
 * 支付管理系统核心模块
 * 提供支付流程、支付验证、支付状态管理等功能
 */

/**
 * 支付状态枚举
 */
const PaymentStatus = {
  PENDING: 'pending',         // 待支付
  PROCESSING: 'processing',   // 处理中
  COMPLETED: 'completed',     // 已完成
  FAILED: 'failed',          // 失败
  CANCELLED: 'cancelled',     // 已取消
  EXPIRED: 'expired',        // 已过期
  REFUNDED: 'refunded'       // 已退款
};

class PaymentManager {
  constructor() {
    this.payments = new Map();
    this.paymentMethods = new Map();
    this.eventListeners = new Map();
    this.config = {
      timeout: 300000, // 5分钟支付超时
      retryAttempts: 3,
      supportedCurrencies: ['CNY', 'USD'],
      minAmount: 0.01,
      maxAmount: 999999.99
    };

    this.initializePaymentMethods();
    this.loadPaymentsFromStorage();

    // 绑定事件
    this.bindEvents();
  }

  /**
     * 初始化支付方式
     */
  initializePaymentMethods() {
    // 支付宝
    this.paymentMethods.set('alipay', {
      id: 'alipay',
      name: '支付宝',
      icon: '💰',
      enabled: true,
      minAmount: 0.01,
      maxAmount: 50000,
      processingFee: 0.006, // 0.6%手续费
      supportedCurrencies: ['CNY'],
      description: '使用支付宝安全快捷支付'
    });

    // 微信支付
    this.paymentMethods.set('wechat', {
      id: 'wechat',
      name: '微信支付',
      icon: '💚',
      enabled: true,
      minAmount: 0.01,
      maxAmount: 50000,
      processingFee: 0.006,
      supportedCurrencies: ['CNY'],
      description: '使用微信支付便捷付款'
    });

    // 银行卡
    this.paymentMethods.set('bankcard', {
      id: 'bankcard',
      name: '银行卡',
      icon: '💳',
      enabled: true,
      minAmount: 0.01,
      maxAmount: 100000,
      processingFee: 0.008,
      supportedCurrencies: ['CNY', 'USD'],
      description: '支持各大银行借记卡和信用卡'
    });

    // PayPal（国际支付）
    this.paymentMethods.set('paypal', {
      id: 'paypal',
      name: 'PayPal',
      icon: '🌐',
      enabled: true,
      minAmount: 0.01,
      maxAmount: 10000,
      processingFee: 0.029, // 2.9%
      supportedCurrencies: ['USD'],
      description: '国际通用的在线支付方式'
    });
  }

  /**
     * 创建支付订单
     * @param {Object} paymentData 支付数据
     * @returns {Object} 支付订单信息
     */
  async createPayment(paymentData) {
    try {
      // 验证支付数据
      const validation = this.validatePaymentData(paymentData);
      if (!validation.isValid) {
        throw new Error(`支付数据验证失败: ${validation.errors.join(', ')}`);
      }

      // 生成支付ID
      const paymentId = this.generatePaymentId();

      // 计算手续费
      const paymentMethod = this.paymentMethods.get(paymentData.method);
      const processingFee = paymentData.amount * paymentMethod.processingFee;
      const totalAmount = paymentData.amount + processingFee;

      // 创建支付订单
      const payment = {
        id: paymentId,
        orderId: paymentData.orderId,
        amount: paymentData.amount,
        processingFee: processingFee,
        totalAmount: totalAmount,
        currency: paymentData.currency || 'CNY',
        method: paymentData.method,
        status: PaymentStatus.PENDING,
        description: paymentData.description || '',
        customerInfo: {
          userId: paymentData.userId,
          email: paymentData.email,
          phone: paymentData.phone
        },
        metadata: paymentData.metadata || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.config.timeout).toISOString(),
        attempts: 0,
        maxAttempts: this.config.retryAttempts,
        transactionId: null,
        gatewayResponse: null,
        refundInfo: null
      };

      // 保存支付订单
      this.payments.set(paymentId, payment);
      this.savePaymentsToStorage();

      // 触发支付创建事件
      this.emit('paymentCreated', { payment });

      console.log('支付订单创建成功:', paymentId);
      return {
        success: true,
        payment: payment,
        paymentUrl: this.generatePaymentUrl(payment)
      };

    } catch (error) {
      console.error('创建支付订单失败:', error);
      this.emit('paymentError', { error: error.message, data: paymentData });
      throw error;
    }
  }

  /**
     * 处理支付
     * @param {string} paymentId 支付ID
     * @param {Object} paymentDetails 支付详情
     * @returns {Object} 支付结果
     */
  async processPayment(paymentId, paymentDetails = {}) {
    try {
      const payment = this.payments.get(paymentId);
      if (!payment) {
        throw new Error('支付订单不存在');
      }

      // 检查支付状态
      if (payment.status !== PaymentStatus.PENDING) {
        throw new Error(`支付订单状态无效: ${payment.status}`);
      }

      // 检查是否过期
      if (new Date() > new Date(payment.expiresAt)) {
        await this.updatePaymentStatus(paymentId, PaymentStatus.EXPIRED);
        throw new Error('支付订单已过期');
      }

      // 增加尝试次数
      payment.attempts += 1;
      payment.updatedAt = new Date().toISOString();

      // 更新状态为处理中
      await this.updatePaymentStatus(paymentId, PaymentStatus.PROCESSING);

      // 模拟支付网关处理
      const gatewayResult = await this.simulatePaymentGateway(payment, paymentDetails);

      if (gatewayResult.success) {
        // 支付成功
        payment.transactionId = gatewayResult.transactionId;
        payment.gatewayResponse = gatewayResult.response;
        await this.updatePaymentStatus(paymentId, PaymentStatus.COMPLETED);

        // 触发支付成功事件
        this.emit('paymentCompleted', { payment });

        return {
          success: true,
          payment: payment,
          transactionId: gatewayResult.transactionId
        };
      }
      // 支付失败
      payment.gatewayResponse = gatewayResult.response;

      if (payment.attempts >= payment.maxAttempts) {
        await this.updatePaymentStatus(paymentId, PaymentStatus.FAILED);
      } else {
        await this.updatePaymentStatus(paymentId, PaymentStatus.PENDING);
      }

      throw new Error(gatewayResult.error || '支付处理失败');


    } catch (error) {
      console.error('处理支付失败:', error);

      const payment = this.payments.get(paymentId);
      if (payment && payment.attempts >= payment.maxAttempts) {
        await this.updatePaymentStatus(paymentId, PaymentStatus.FAILED);
      }

      this.emit('paymentError', { paymentId, error: error.message });
      throw error;
    }
  }

  /**
     * 模拟支付网关处理
     * @param {Object} payment 支付信息
     * @param {Object} paymentDetails 支付详情
     * @returns {Object} 网关处理结果
     */
  async simulatePaymentGateway(payment, _paymentDetails) {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // 模拟支付成功率（90%成功率）
    const isSuccess = Math.random() > 0.1;

    if (isSuccess) {
      return {
        success: true,
        transactionId: this.generateTransactionId(),
        response: {
          code: '0000',
          message: '支付成功',
          timestamp: new Date().toISOString(),
          gateway: payment.method,
          amount: payment.totalAmount,
          currency: payment.currency
        }
      };
    }
    // 模拟各种失败原因
    const failureReasons = [
      { code: '1001', message: '余额不足' },
      { code: '1002', message: '银行卡被冻结' },
      { code: '1003', message: '密码错误' },
      { code: '1004', message: '网络超时' },
      { code: '1005', message: '银行系统维护' }
    ];

    const failure = failureReasons[Math.floor(Math.random() * failureReasons.length)];

    return {
      success: false,
      error: failure.message,
      response: {
        code: failure.code,
        message: failure.message,
        timestamp: new Date().toISOString(),
        gateway: payment.method
      }
    };

  }

  /**
     * 更新支付状态
     * @param {string} paymentId 支付ID
     * @param {string} status 新状态
     */
  async updatePaymentStatus(paymentId, status) {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error('支付订单不存在');
    }

    const oldStatus = payment.status;
    payment.status = status;
    payment.updatedAt = new Date().toISOString();

    // 保存到存储
    this.savePaymentsToStorage();

    // 触发状态变更事件
    this.emit('paymentStatusChanged', {
      paymentId,
      oldStatus,
      newStatus: status,
      payment
    });

    console.log(`支付状态更新: ${paymentId} ${oldStatus} -> ${status}`);
  }

  /**
     * 取消支付
     * @param {string} paymentId 支付ID
     * @param {string} reason 取消原因
     */
  async cancelPayment(paymentId, reason = '用户取消') {
    try {
      const payment = this.payments.get(paymentId);
      if (!payment) {
        throw new Error('支付订单不存在');
      }

      // 只有待支付和处理中的订单可以取消
      if (![PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(payment.status)) {
        throw new Error(`无法取消状态为 ${payment.status} 的支付订单`);
      }

      payment.cancelReason = reason;
      await this.updatePaymentStatus(paymentId, PaymentStatus.CANCELLED);

      this.emit('paymentCancelled', { payment, reason });

      return { success: true, payment };

    } catch (error) {
      console.error('支付处理失败:', error);

      // 使用全局错误处理器
      if (window.errorHandler) {
        window.errorHandler.handleError({
          type: 'payment',
          operation: '处理支付',
          message: error.message || '支付处理失败',
          error: error
        });
      }

      throw error;
    }
  }

  /**
     * 申请退款
     * @param {string} paymentId 支付ID
     * @param {number} amount 退款金额
     * @param {string} reason 退款原因
     * @returns {Object} 退款结果
     */
  async requestRefund(paymentId, amount, reason = '') {
    try {
      const payment = this.payments.get(paymentId);
      if (!payment) {
        throw new Error('支付订单不存在');
      }

      // 只有已完成的支付可以退款
      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new Error('只有已完成的支付可以申请退款');
      }

      // 验证退款金额
      if (amount <= 0 || amount > payment.amount) {
        throw new Error('退款金额无效');
      }

      // 检查是否已有退款记录
      if (payment.refundInfo) {
        throw new Error('该支付订单已申请过退款');
      }

      const refundId = this.generateRefundId();

      // 创建退款信息
      payment.refundInfo = {
        id: refundId,
        amount: amount,
        reason: reason,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        processedAt: null,
        transactionId: null
      };

      // 模拟退款处理
      const refundResult = await this.processRefund(payment.refundInfo);

      if (refundResult.success) {
        payment.refundInfo.status = 'completed';
        payment.refundInfo.processedAt = new Date().toISOString();
        payment.refundInfo.transactionId = refundResult.transactionId;

        await this.updatePaymentStatus(paymentId, PaymentStatus.REFUNDED);

        this.emit('refundCompleted', { payment, refund: payment.refundInfo });
      } else {
        payment.refundInfo.status = 'failed';
        payment.refundInfo.error = refundResult.error;

        this.emit('refundFailed', { payment, refund: payment.refundInfo });
      }

      this.savePaymentsToStorage();

      return {
        success: refundResult.success,
        refund: payment.refundInfo
      };

    } catch (error) {
      console.error('申请退款失败:', error);
      throw error;
    }
  }

  /**
     * 处理退款
     * @param {Object} refundInfo 退款信息
     * @returns {Object} 退款处理结果
     */
  async processRefund(_refundInfo) {
    // 模拟退款处理延迟
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 模拟退款成功率（95%）
    const isSuccess = Math.random() > 0.05;

    if (isSuccess) {
      return {
        success: true,
        transactionId: this.generateTransactionId()
      };
    }
    return {
      success: false,
      error: '银行系统繁忙，请稍后重试'
    };

  }

  /**
     * 查询支付状态
     * @param {string} paymentId 支付ID
     * @returns {Object} 支付信息
     */
  getPaymentStatus(paymentId) {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      return { found: false };
    }

    return {
      found: true,
      payment: {
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        totalAmount: payment.totalAmount,
        currency: payment.currency,
        method: payment.method,
        status: payment.status,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        transactionId: payment.transactionId,
        refundInfo: payment.refundInfo
      }
    };
  }

  /**
     * 获取用户的支付历史
     * @param {string} userId 用户ID
     * @param {Object} options 查询选项
     * @returns {Array} 支付历史列表
     */
  getUserPaymentHistory(userId, options = {}) {
    const {
      status = null,
      method = null,
      startDate = null,
      endDate = null,
      limit = 50,
      offset = 0
    } = options;

    let payments = Array.from(this.payments.values())
      .filter(payment => payment.customerInfo.userId === userId);

    // 状态筛选
    if (status) {
      payments = payments.filter(payment => payment.status === status);
    }

    // 支付方式筛选
    if (method) {
      payments = payments.filter(payment => payment.method === method);
    }

    // 日期范围筛选
    if (startDate) {
      payments = payments.filter(payment =>
        new Date(payment.createdAt) >= new Date(startDate)
      );
    }
    if (endDate) {
      payments = payments.filter(payment =>
        new Date(payment.createdAt) <= new Date(endDate)
      );
    }

    // 按创建时间倒序排列
    payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 分页
    const total = payments.length;
    payments = payments.slice(offset, offset + limit);

    return {
      payments: payments.map(payment => ({
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        totalAmount: payment.totalAmount,
        currency: payment.currency,
        method: payment.method,
        status: payment.status,
        createdAt: payment.createdAt,
        transactionId: payment.transactionId
      })),
      total,
      hasMore: offset + limit < total
    };
  }

  /**
     * 获取支付统计信息
     * @param {Object} options 统计选项
     * @returns {Object} 统计信息
     */
  getPaymentStatistics(options = {}) {
    const {
      startDate = null,
      endDate = null,
      userId = null
    } = options;

    let payments = Array.from(this.payments.values());

    // 用户筛选
    if (userId) {
      payments = payments.filter(payment => payment.customerInfo.userId === userId);
    }

    // 日期范围筛选
    if (startDate) {
      payments = payments.filter(payment =>
        new Date(payment.createdAt) >= new Date(startDate)
      );
    }
    if (endDate) {
      payments = payments.filter(payment =>
        new Date(payment.createdAt) <= new Date(endDate)
      );
    }

    // 统计计算
    const stats = {
      total: payments.length,
      completed: payments.filter(p => p.status === PaymentStatus.COMPLETED).length,
      pending: payments.filter(p => p.status === PaymentStatus.PENDING).length,
      failed: payments.filter(p => p.status === PaymentStatus.FAILED).length,
      cancelled: payments.filter(p => p.status === PaymentStatus.CANCELLED).length,
      refunded: payments.filter(p => p.status === PaymentStatus.REFUNDED).length,
      totalAmount: 0,
      completedAmount: 0,
      averageAmount: 0,
      methodStats: {},
      currencyStats: {}
    };

    // 金额统计
    const completedPayments = payments.filter(p => p.status === PaymentStatus.COMPLETED);
    stats.totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    stats.completedAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    stats.averageAmount = stats.completed > 0 ? stats.completedAmount / stats.completed : 0;

    // 支付方式统计
    payments.forEach(payment => {
      if (!stats.methodStats[payment.method]) {
        stats.methodStats[payment.method] = { count: 0, amount: 0 };
      }
      stats.methodStats[payment.method].count++;
      if (payment.status === PaymentStatus.COMPLETED) {
        stats.methodStats[payment.method].amount += payment.amount;
      }
    });

    // 货币统计
    payments.forEach(payment => {
      if (!stats.currencyStats[payment.currency]) {
        stats.currencyStats[payment.currency] = { count: 0, amount: 0 };
      }
      stats.currencyStats[payment.currency].count++;
      if (payment.status === PaymentStatus.COMPLETED) {
        stats.currencyStats[payment.currency].amount += payment.amount;
      }
    });

    return stats;
  }

  /**
     * 验证支付数据
     * @param {Object} paymentData 支付数据
     * @returns {Object} 验证结果
     */
  validatePaymentData(paymentData) {
    const errors = [];

    // 必填字段检查
    if (!paymentData.orderId) {errors.push('订单ID不能为空');}
    if (!paymentData.amount) {errors.push('支付金额不能为空');}
    if (!paymentData.method) {errors.push('支付方式不能为空');}
    if (!paymentData.userId) {errors.push('用户ID不能为空');}

    // 金额验证
    if (paymentData.amount) {
      if (typeof paymentData.amount !== 'number' || paymentData.amount <= 0) {
        errors.push('支付金额必须为正数');
      }
      if (paymentData.amount < this.config.minAmount) {
        errors.push(`支付金额不能小于 ${this.config.minAmount}`);
      }
      if (paymentData.amount > this.config.maxAmount) {
        errors.push(`支付金额不能大于 ${this.config.maxAmount}`);
      }
    }

    // 支付方式验证
    if (paymentData.method && !this.paymentMethods.has(paymentData.method)) {
      errors.push('不支持的支付方式');
    }

    // 货币验证
    const currency = paymentData.currency || 'CNY';
    if (!this.config.supportedCurrencies.includes(currency)) {
      errors.push('不支持的货币类型');
    }

    // 支付方式与货币兼容性检查
    if (paymentData.method && this.paymentMethods.has(paymentData.method)) {
      const method = this.paymentMethods.get(paymentData.method);
      if (!method.supportedCurrencies.includes(currency)) {
        errors.push(`${method.name} 不支持 ${currency} 货币`);
      }
      if (paymentData.amount && paymentData.amount < method.minAmount) {
        errors.push(`${method.name} 最小支付金额为 ${method.minAmount}`);
      }
      if (paymentData.amount && paymentData.amount > method.maxAmount) {
        errors.push(`${method.name} 最大支付金额为 ${method.maxAmount}`);
      }
    }

    // 邮箱验证
    if (paymentData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paymentData.email)) {
      errors.push('邮箱格式无效');
    }

    // 手机号验证
    if (paymentData.phone && !/^1[3-9]\d{9}$/.test(paymentData.phone)) {
      errors.push('手机号格式无效');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
     * 获取可用的支付方式
     * @param {string} currency 货币类型
     * @param {number} amount 支付金额
     * @returns {Array} 可用的支付方式列表
     */
  getAvailablePaymentMethods(currency = 'CNY', amount = 0) {
    return Array.from(this.paymentMethods.values())
      .filter(method => {
        return method.enabled &&
                    method.supportedCurrencies.includes(currency) &&
                    amount >= method.minAmount &&
                    amount <= method.maxAmount;
      })
      .map(method => ({
        id: method.id,
        name: method.name,
        icon: method.icon,
        description: method.description,
        processingFee: method.processingFee,
        estimatedFee: amount * method.processingFee
      }));
  }

  /**
     * 生成支付ID
     * @returns {string} 支付ID
     */
  generatePaymentId() {
    const timestamp = Date.now().toString(36);
    const random = Utils.generateSecureId('', 5);
    return `PAY_${timestamp}_${random}`.toUpperCase();
  }

  /**
     * 生成交易ID
     * @returns {string} 交易ID
     */
  generateTransactionId() {
    const timestamp = Date.now().toString(36);
    const random = Utils.generateSecureId('', 8);
    return `TXN_${timestamp}_${random}`.toUpperCase();
  }

  /**
     * 生成退款ID
     * @returns {string} 退款ID
     */
  generateRefundId() {
    const timestamp = Date.now().toString(36);
    const random = Utils.generateSecureId('', 5);
    return `REF_${timestamp}_${random}`.toUpperCase();
  }

  /**
     * 生成支付URL
     * @param {Object} payment 支付信息
     * @returns {string} 支付URL
     */
  generatePaymentUrl(payment) {
    const baseUrl = window.location.origin;
    return `${baseUrl}/payment?id=${payment.id}&method=${payment.method}`;
  }

  /**
     * 从本地存储加载支付数据
     */
  loadPaymentsFromStorage() {
    try {
      const stored = localStorage.getItem('payments');
      if (stored) {
        const paymentsData = JSON.parse(stored);
        paymentsData.forEach(payment => {
          this.payments.set(payment.id, payment);
        });
        console.log(`从存储加载了 ${paymentsData.length} 个支付记录`);
      }
    } catch (error) {
      console.error('加载支付数据失败:', error);
    }
  }

  /**
     * 保存支付数据到本地存储
     */
  savePaymentsToStorage() {
    try {
      const paymentsData = Array.from(this.payments.values());
      localStorage.setItem('payments', JSON.stringify(paymentsData));
    } catch (error) {
      console.error('保存支付数据失败:', error);
    }
  }

  /**
     * 清理过期的支付订单
     */
  cleanupExpiredPayments() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [, payment] of this.payments) {
      if (payment.status === PaymentStatus.PENDING &&
                new Date(payment.expiresAt) < now) {
        payment.status = PaymentStatus.EXPIRED;
        payment.updatedAt = now.toISOString();
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.savePaymentsToStorage();
      console.log(`清理了 ${cleanedCount} 个过期支付订单`);
    }
  }

  /**
     * 绑定事件
     */
  bindEvents() {
    // 定期清理过期订单
    setInterval(() => {
      this.cleanupExpiredPayments();
    }, 60000); // 每分钟检查一次

    // 页面卸载时保存数据
    window.addEventListener('beforeunload', () => {
      this.savePaymentsToStorage();
    });
  }

  /**
     * 添加事件监听器
     * @param {string} event 事件名称
     * @param {Function} callback 回调函数
     */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
     * 移除事件监听器
     * @param {string} event 事件名称
     * @param {Function} callback 回调函数
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
     * @param {string} event 事件名称
     * @param {Object} data 事件数据
     */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件处理器错误 (${event}):`, error);
        }
      });
    }
  }

  /**
     * 获取配置信息
     * @returns {Object} 配置信息
     */
  getConfig() {
    return { ...this.config };
  }

  /**
     * 更新配置
     * @param {Object} newConfig 新配置
     */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('支付配置已更新:', this.config);
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PaymentManager, PaymentStatus };
} else {
  window.PaymentManager = PaymentManager;
  window.PaymentStatus = PaymentStatus;
}
