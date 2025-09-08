/* global Utils */
/**
 * 支付系统UI组件
 * 提供支付界面、支付方式选择、支付状态显示等用户交互功能
 */

class PaymentUI {
  constructor(paymentManager, diContainer) {
    this.paymentManager = paymentManager;
    this.diContainer = diContainer;
    this.currentPayment = null;
    this.paymentModal = null;
    this.statusModal = null;
    this.historyModal = null;

    this.init();
  }

  /**
     * 初始化UI组件
     */
  init() {
    this.createPaymentModal();
    this.createStatusModal();
    this.createHistoryModal();
    this.bindEvents();

    console.log('支付UI组件初始化完成');
  }

  /**
     * 创建支付模态框
     */
  createPaymentModal() {
    this.paymentModal = document.createElement('div');
    this.paymentModal.className = 'payment-modal modal';
    this.paymentModal.innerHTML = `
            <div class="modal-content payment-modal-content">
                <div class="modal-header">
                    <h2>选择支付方式</h2>
                    <button class="modal-close" data-action="close-payment">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="payment-info">
                        <div class="order-summary">
                            <h3>订单信息</h3>
                            <div class="order-details">
                                <div class="order-item">
                                    <span class="label">订单号:</span>
                                    <span class="value order-id">-</span>
                                </div>
                                <div class="order-item">
                                    <span class="label">商品总额:</span>
                                    <span class="value order-amount">¥0.00</span>
                                </div>
                                <div class="order-item processing-fee-item" style="display: none;">
                                    <span class="label">手续费:</span>
                                    <span class="value processing-fee">¥0.00</span>
                                </div>
                                <div class="order-item total-amount-item">
                                    <span class="label total">应付金额:</span>
                                    <span class="value total-amount">¥0.00</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="payment-methods">
                            <h3>选择支付方式</h3>
                            <div class="payment-method-list">
                                <!-- 支付方式将动态生成 -->
                            </div>
                        </div>
                        
                        <div class="payment-form" style="display: none;">
                            <h3>支付信息</h3>
                            <form class="payment-details-form">
                                <div class="form-group">
                                    <label for="customer-email">邮箱地址</label>
                                    <input type="email" id="customer-email" name="email" placeholder="请输入邮箱地址">
                                </div>
                                <div class="form-group">
                                    <label for="customer-phone">手机号码</label>
                                    <input type="tel" id="customer-phone" name="phone" placeholder="请输入手机号码">
                                </div>
                                <div class="form-group payment-method-details">
                                    <!-- 根据支付方式显示不同的表单 -->
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" data-action="close-payment">取消</button>
                    <button class="btn btn-primary payment-submit" disabled>确认支付</button>
                </div>
            </div>
        `;

    document.body.appendChild(this.paymentModal);
  }

  /**
     * 创建支付状态模态框
     */
  createStatusModal() {
    this.statusModal = document.createElement('div');
    this.statusModal.className = 'payment-status-modal modal';
    this.statusModal.innerHTML = `
            <div class="modal-content payment-status-content">
                <div class="modal-header">
                    <h2>支付状态</h2>
                    <button class="modal-close" data-action="close-status">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="payment-status-info">
                        <div class="status-icon">
                            <div class="status-spinner" style="display: none;">
                                <div class="spinner"></div>
                            </div>
                            <div class="status-success" style="display: none;">✓</div>
                            <div class="status-error" style="display: none;">✗</div>
                            <div class="status-warning" style="display: none;">⚠</div>
                        </div>
                        <div class="status-message">
                            <h3 class="status-title">处理中...</h3>
                            <p class="status-description">正在处理您的支付请求，请稍候...</p>
                        </div>
                        <div class="payment-details">
                            <div class="detail-item">
                                <span class="label">支付单号:</span>
                                <span class="value payment-id">-</span>
                            </div>
                            <div class="detail-item">
                                <span class="label">支付金额:</span>
                                <span class="value payment-amount">¥0.00</span>
                            </div>
                            <div class="detail-item">
                                <span class="label">支付方式:</span>
                                <span class="value payment-method">-</span>
                            </div>
                            <div class="detail-item transaction-id-item" style="display: none;">
                                <span class="label">交易号:</span>
                                <span class="value transaction-id">-</span>
                            </div>
                        </div>
                        <div class="status-actions">
                            <button class="btn btn-secondary" data-action="close-status">关闭</button>
                            <button class="btn btn-primary retry-payment" style="display: none;" data-action="retry-payment">重试支付</button>
                            <button class="btn btn-success view-order" style="display: none;" data-action="view-order">查看订单</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(this.statusModal);
  }

  /**
     * 创建支付历史模态框
     */
  createHistoryModal() {
    this.historyModal = document.createElement('div');
    this.historyModal.className = 'payment-history-modal modal';
    this.historyModal.innerHTML = `
            <div class="modal-content payment-history-content">
                <div class="modal-header">
                    <h2>支付历史</h2>
                    <button class="modal-close" data-action="close-history">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="payment-history-filters">
                        <div class="filter-group">
                            <label for="status-filter">状态筛选:</label>
                            <select id="status-filter" name="status">
                                <option value="">全部状态</option>
                                <option value="completed">已完成</option>
                                <option value="pending">待支付</option>
                                <option value="failed">失败</option>
                                <option value="cancelled">已取消</option>
                                <option value="refunded">已退款</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="method-filter">支付方式:</label>
                            <select id="method-filter" name="method">
                                <option value="">全部方式</option>
                                <option value="alipay">支付宝</option>
                                <option value="wechat">微信支付</option>
                                <option value="bankcard">银行卡</option>
                                <option value="paypal">PayPal</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <button class="btn btn-primary" data-action="apply-filters">应用筛选</button>
                            <button class="btn btn-secondary" data-action="reset-filters">重置</button>
                        </div>
                    </div>
                    <div class="payment-history-list">
                        <div class="loading-placeholder">加载中...</div>
                    </div>
                    <div class="payment-history-pagination">
                        <button class="btn btn-secondary prev-page" disabled>上一页</button>
                        <span class="page-info">第 1 页，共 1 页</span>
                        <button class="btn btn-secondary next-page" disabled>下一页</button>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(this.historyModal);
  }

  /**
     * 显示支付界面
     * @param {Object} orderData 订单数据
     */
  async showPaymentModal(orderData) {
    try {
      // 更新订单信息
      this.updateOrderSummary(orderData);

      // 获取可用的支付方式
      const availableMethods = this.paymentManager.getAvailablePaymentMethods(
        orderData.currency || 'CNY',
        orderData.amount
      );

      // 渲染支付方式
      this.renderPaymentMethods(availableMethods, orderData.amount);

      // 显示模态框
      this.paymentModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';

      // 重置表单状态
      this.resetPaymentForm();

    } catch (error) {
      console.error('显示支付界面失败:', error);
      this.showError('无法显示支付界面，请稍后重试');
    }
  }

  /**
     * 更新订单摘要
     * @param {Object} orderData 订单数据
     */
  updateOrderSummary(orderData) {
    const modal = this.paymentModal;

    modal.querySelector('.order-id').textContent = orderData.orderId || '-';
    modal.querySelector('.order-amount').textContent = `¥${orderData.amount.toFixed(2)}`;
    modal.querySelector('.total-amount').textContent = `¥${orderData.amount.toFixed(2)}`;

    // 存储订单数据
    this.currentOrderData = orderData;
  }

  /**
     * 渲染支付方式
     * @param {Array} methods 可用的支付方式
     * @param {number} amount 支付金额
     */
  renderPaymentMethods(methods, _amount) {
    const container = this.paymentModal.querySelector('.payment-method-list');

    if (methods.length === 0) {
      container.innerHTML = '<div class="no-methods">暂无可用的支付方式</div>';
      return;
    }

    container.innerHTML = methods.map(method => `
            <div class="payment-method-item" data-method="${method.id}">
                <div class="method-icon">${method.icon}</div>
                <div class="method-info">
                    <div class="method-name">${method.name}</div>
                    <div class="method-description">${method.description}</div>
                    ${method.estimatedFee > 0 ? `<div class="method-fee">手续费: ¥${method.estimatedFee.toFixed(2)}</div>` : ''}
                </div>
                <div class="method-select">
                    <input type="radio" name="payment-method" value="${method.id}" id="method-${method.id}">
                    <label for="method-${method.id}"></label>
                </div>
            </div>
        `).join('');
  }

  /**
     * 显示支付表单
     * @param {string} methodId 支付方式ID
     */
  showPaymentForm(methodId) {
    const paymentForm = this.paymentModal.querySelector('.payment-form');
    const methodDetails = paymentForm.querySelector('.payment-method-details');
    const submitButton = this.paymentModal.querySelector('.payment-submit');

    // 根据支付方式显示不同的表单
    switch (methodId) {
    case 'bankcard':
      methodDetails.innerHTML = `
                    <div class="form-group">
                        <label for="card-number">银行卡号</label>
                        <input type="text" id="card-number" name="cardNumber" placeholder="请输入银行卡号" maxlength="19">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="expiry-date">有效期</label>
                            <input type="text" id="expiry-date" name="expiryDate" placeholder="MM/YY" maxlength="5">
                        </div>
                        <div class="form-group">
                            <label for="cvv">CVV</label>
                            <input type="text" id="cvv" name="cvv" placeholder="CVV" maxlength="4">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="cardholder-name">持卡人姓名</label>
                        <input type="text" id="cardholder-name" name="cardholderName" placeholder="请输入持卡人姓名">
                    </div>
                `;
      break;
    case 'paypal':
      methodDetails.innerHTML = `
                    <div class="form-group">
                        <label for="paypal-email">PayPal邮箱</label>
                        <input type="email" id="paypal-email" name="paypalEmail" placeholder="请输入PayPal邮箱">
                    </div>
                    <div class="paypal-notice">
                        <p>您将被重定向到PayPal完成支付</p>
                    </div>
                `;
      break;
    default:
      methodDetails.innerHTML = `
                    <div class="payment-notice">
                        <p>点击确认支付后，将跳转到${this.getMethodName(methodId)}完成支付</p>
                    </div>
                `;
    }

    // 显示表单
    paymentForm.style.display = 'block';
    submitButton.disabled = false;

    // 更新手续费显示
    this.updateProcessingFee(methodId);
  }

  /**
     * 更新手续费显示
     * @param {string} methodId 支付方式ID
     */
  updateProcessingFee(methodId) {
    const method = this.paymentManager.paymentMethods.get(methodId);
    if (!method || !this.currentOrderData) {return;}

    const processingFee = this.currentOrderData.amount * method.processingFee;
    const totalAmount = this.currentOrderData.amount + processingFee;

    const modal = this.paymentModal;
    const feeItem = modal.querySelector('.processing-fee-item');
    const feeValue = modal.querySelector('.processing-fee');
    const totalValue = modal.querySelector('.total-amount');

    if (processingFee > 0) {
      feeValue.textContent = `¥${processingFee.toFixed(2)}`;
      feeItem.style.display = 'flex';
    } else {
      feeItem.style.display = 'none';
    }

    totalValue.textContent = `¥${totalAmount.toFixed(2)}`;
  }

  /**
     * 处理支付提交
     */
  async handlePaymentSubmit() {
    try {
      const form = this.paymentModal.querySelector('.payment-details-form');
      const formData = new FormData(form);
      const selectedMethod = this.paymentModal.querySelector('input[name="payment-method"]:checked');

      if (!selectedMethod) {
        this.showError('请选择支付方式');
        return;
      }

      // 验证表单数据
      const validation = this.validatePaymentForm(selectedMethod.value, formData);
      if (!validation.isValid) {
        this.showError(validation.errors.join('\n'));
        return;
      }

      // 准备支付数据
      const paymentData = {
        orderId: this.currentOrderData.orderId,
        amount: this.currentOrderData.amount,
        currency: this.currentOrderData.currency || 'CNY',
        method: selectedMethod.value,
        userId: this.getCurrentUserId(),
        email: formData.get('email'),
        phone: formData.get('phone'),
        description: `订单 ${this.currentOrderData.orderId} 的支付`,
        metadata: {
          orderData: this.currentOrderData,
          formData: Object.fromEntries(formData)
        }
      };

      // 隐藏支付模态框
      this.hidePaymentModal();

      // 显示支付状态
      this.showPaymentStatus('processing', {
        title: '正在处理支付',
        description: '请稍候，正在处理您的支付请求...'
      });

      // 创建支付订单
      const createResult = await this.paymentManager.createPayment(paymentData);
      if (!createResult.success) {
        throw new Error('创建支付订单失败');
      }

      this.currentPayment = createResult.payment;

      // 处理支付
      const processResult = await this.paymentManager.processPayment(
        createResult.payment.id,
        Object.fromEntries(formData)
      );

      if (processResult.success) {
        // 支付成功
        this.showPaymentStatus('success', {
          title: '支付成功',
          description: '您的支付已成功完成！',
          payment: processResult.payment
        });

        // 触发支付成功事件
        this.emit('paymentSuccess', {
          payment: processResult.payment,
          order: this.currentOrderData
        });
      } else {
        throw new Error('支付处理失败');
      }

    } catch (error) {
      console.error('支付提交失败:', error);

      // 使用全局错误处理器
      if (window.errorHandler) {
        window.errorHandler.handleError({
          type: 'payment',
          operation: '支付提交',
          message: error.message || '支付处理过程中发生错误',
          component: 'PaymentUI',
          details: {
            orderId: this.currentOrderData?.orderId,
            amount: this.currentOrderData?.amount
          }
        });
      }

      // 显示支付失败状态
      this.showPaymentStatus('error', {
        title: '支付失败',
        description: error.message || '支付处理过程中发生错误，请重试',
        showRetry: true
      });

      // 触发支付失败事件
      this.emit('paymentError', {
        error: error.message,
        order: this.currentOrderData
      });
    }
  }

  /**
     * 显示支付状态
     * @param {string} status 状态类型
     * @param {Object} options 选项
     */
  showPaymentStatus(status, options = {}) {
    const modal = this.statusModal;

    // 隐藏所有状态图标
    modal.querySelectorAll('.status-icon > div').forEach(el => {
      el.style.display = 'none';
    });

    // 隐藏所有操作按钮
    modal.querySelectorAll('.status-actions .btn').forEach(btn => {
      if (!btn.hasAttribute('data-action') || btn.getAttribute('data-action') === 'close-status') {
        btn.style.display = 'inline-block';
      } else {
        btn.style.display = 'none';
      }
    });

    // 根据状态显示对应图标和内容
    switch (status) {
    case 'processing':
      modal.querySelector('.status-spinner').style.display = 'block';
      modal.className = 'payment-status-modal modal processing';
      break;
    case 'success':
      modal.querySelector('.status-success').style.display = 'block';
      modal.querySelector('.view-order').style.display = 'inline-block';
      modal.className = 'payment-status-modal modal success';
      break;
    case 'error':
      modal.querySelector('.status-error').style.display = 'block';
      if (options.showRetry) {
        modal.querySelector('.retry-payment').style.display = 'inline-block';
      }
      modal.className = 'payment-status-modal modal error';
      break;
    case 'warning':
      modal.querySelector('.status-warning').style.display = 'block';
      modal.className = 'payment-status-modal modal warning';
      break;
    }

    // 更新状态信息
    modal.querySelector('.status-title').textContent = options.title || '';
    modal.querySelector('.status-description').textContent = options.description || '';

    // 更新支付详情
    if (options.payment) {
      this.updatePaymentDetails(options.payment);
    } else if (this.currentPayment) {
      this.updatePaymentDetails(this.currentPayment);
    }

    // 显示模态框
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  /**
     * 更新支付详情显示
     * @param {Object} payment 支付信息
     */
  updatePaymentDetails(payment) {
    const modal = this.statusModal;

    modal.querySelector('.payment-id').textContent = payment.id || '-';
    modal.querySelector('.payment-amount').textContent = `¥${payment.totalAmount.toFixed(2)}`;
    modal.querySelector('.payment-method').textContent = this.getMethodName(payment.method);

    const transactionItem = modal.querySelector('.transaction-id-item');
    const transactionId = modal.querySelector('.transaction-id');

    if (payment.transactionId) {
      transactionId.textContent = payment.transactionId;
      transactionItem.style.display = 'flex';
    } else {
      transactionItem.style.display = 'none';
    }
  }

  /**
     * 显示支付历史
     * @param {string} userId 用户ID
     */
  async showPaymentHistory(userId) {
    try {
      // 显示模态框
      this.historyModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';

      // 加载支付历史
      await this.loadPaymentHistory(userId);

    } catch (error) {
      console.error('显示支付历史失败:', error);

      // 使用全局错误处理器
      if (window.errorHandler) {
        window.errorHandler.handleError({
          type: 'payment',
          operation: '加载支付历史',
          message: error.message || '无法加载支付历史',
          component: 'PaymentUI',
          details: { userId }
        });
      } else {
        this.showError('无法加载支付历史，请稍后重试');
      }
    }
  }

  /**
     * 加载支付历史
     * @param {string} userId 用户ID
     * @param {Object} filters 筛选条件
     * @param {number} page 页码
     */
  async loadPaymentHistory(userId, filters = {}, page = 1) {
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
      const result = this.paymentManager.getUserPaymentHistory(userId, {
        ...filters,
        limit,
        offset
      });

      this.renderPaymentHistory(result.payments);
      this.updatePagination(page, Math.ceil(result.total / limit), result.total);

    } catch (error) {
      console.error('加载支付历史失败:', error);
      this.showHistoryError('加载失败，请稍后重试');
    }
  }

  /**
     * 渲染支付历史列表
     * @param {Array} payments 支付列表
     */
  renderPaymentHistory(payments) {
    const container = this.historyModal.querySelector('.payment-history-list');

    if (payments.length === 0) {
      container.innerHTML = '<div class="no-payments">暂无支付记录</div>';
      return;
    }

    container.innerHTML = payments.map(payment => `
            <div class="payment-history-item" data-payment-id="${payment.id}">
                <div class="payment-basic-info">
                    <div class="payment-method-icon">${this.getMethodIcon(payment.method)}</div>
                    <div class="payment-info">
                        <div class="payment-title">
                            <span class="order-id">订单 ${payment.orderId}</span>
                            <span class="payment-status status-${payment.status}">${this.getStatusText(payment.status)}</span>
                        </div>
                        <div class="payment-meta">
                            <span class="payment-amount">¥${payment.totalAmount.toFixed(2)}</span>
                            <span class="payment-method">${this.getMethodName(payment.method)}</span>
                            <span class="payment-time">${this.formatDateTime(payment.createdAt)}</span>
                        </div>
                    </div>
                </div>
                <div class="payment-actions">
                    <button class="btn btn-sm btn-secondary" data-action="view-payment-details" data-payment-id="${payment.id}">详情</button>
                    ${payment.status === 'completed' ? '<button class="btn btn-sm btn-outline" data-action="request-refund" data-payment-id="' + payment.id + '">申请退款</button>' : ''}
                    ${payment.status === 'failed' ? '<button class="btn btn-sm btn-primary" data-action="retry-payment" data-payment-id="' + payment.id + '">重新支付</button>' : ''}
                </div>
            </div>
        `).join('');
  }

  /**
     * 更新分页信息
     * @param {number} currentPage 当前页
     * @param {number} totalPages 总页数
     * @param {number} totalCount 总记录数
     */
  updatePagination(currentPage, totalPages, totalCount) {
    const pagination = this.historyModal.querySelector('.payment-history-pagination');
    const prevBtn = pagination.querySelector('.prev-page');
    const nextBtn = pagination.querySelector('.next-page');
    const pageInfo = pagination.querySelector('.page-info');

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
    pageInfo.textContent = `第 ${currentPage} 页，共 ${totalPages} 页 (${totalCount} 条记录)`;

    // 存储当前页码
    pagination.dataset.currentPage = currentPage;
    pagination.dataset.totalPages = totalPages;
  }

  /**
     * 验证支付表单
     * @param {string} method 支付方式
     * @param {FormData} formData 表单数据
     * @returns {Object} 验证结果
     */
  validatePaymentForm(method, formData) {
    const errors = [];

    // 邮箱验证
    const email = formData.get('email');
    if (!email) {
      errors.push('请输入邮箱地址');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('邮箱格式无效');
    }

    // 手机号验证
    const phone = formData.get('phone');
    if (!phone) {
      errors.push('请输入手机号码');
    } else if (!/^1[3-9]\d{9}$/.test(phone)) {
      errors.push('手机号格式无效');
    }

    // 根据支付方式验证特定字段
    switch (method) {
    case 'bankcard': {
      const cardNumber = formData.get('cardNumber');
      const expiryDate = formData.get('expiryDate');
      const cvv = formData.get('cvv');
      const cardholderName = formData.get('cardholderName');

      if (!cardNumber) {errors.push('请输入银行卡号');}
      else if (!/^\d{16,19}$/.test(cardNumber.replace(/\s/g, ''))) {errors.push('银行卡号格式无效');}

      if (!expiryDate) {errors.push('请输入有效期');}
      else if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {errors.push('有效期格式无效');}

      if (!cvv) {errors.push('请输入CVV');}
      else if (!/^\d{3,4}$/.test(cvv)) {errors.push('CVV格式无效');}

      if (!cardholderName) {errors.push('请输入持卡人姓名');}
      break;
    }
    case 'paypal': {
      const paypalEmail = formData.get('paypalEmail');
      if (!paypalEmail) {errors.push('请输入PayPal邮箱');}
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail)) {errors.push('PayPal邮箱格式无效');}
      break;
    }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
     * 重置支付表单
     */
  resetPaymentForm() {
    const form = this.paymentModal.querySelector('.payment-details-form');
    const paymentForm = this.paymentModal.querySelector('.payment-form');
    const submitButton = this.paymentModal.querySelector('.payment-submit');
    const feeItem = this.paymentModal.querySelector('.processing-fee-item');

    form.reset();
    paymentForm.style.display = 'none';
    submitButton.disabled = true;
    feeItem.style.display = 'none';

    // 取消选中的支付方式
    this.paymentModal.querySelectorAll('input[name="payment-method"]').forEach(input => {
      input.checked = false;
    });
  }

  /**
     * 隐藏支付模态框
     */
  hidePaymentModal() {
    this.paymentModal.style.display = 'none';
    document.body.style.overflow = '';
    this.resetPaymentForm();
  }

  /**
     * 隐藏支付状态模态框
     */
  hideStatusModal() {
    this.statusModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  /**
     * 隐藏支付历史模态框
     */
  hideHistoryModal() {
    this.historyModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  /**
     * 获取当前用户ID
     * @returns {string} 用户ID
     */
  getCurrentUserId() {
    // 从认证管理器获取当前用户ID
    try {
      const authManager = this.diContainer.get('AuthManager');
      const currentUser = authManager.getCurrentUser();
      return currentUser ? currentUser.id : 'guest';
    } catch (error) {
      console.warn('无法获取当前用户ID:', error);
      return 'guest';
    }
  }

  /**
     * 获取支付方式名称
     * @param {string} methodId 支付方式ID
     * @returns {string} 支付方式名称
     */
  getMethodName(methodId) {
    const method = this.paymentManager.paymentMethods.get(methodId);
    return method ? method.name : methodId;
  }

  /**
     * 获取支付方式图标
     * @param {string} methodId 支付方式ID
     * @returns {string} 支付方式图标
     */
  getMethodIcon(methodId) {
    const method = this.paymentManager.paymentMethods.get(methodId);
    return method ? method.icon : '💳';
  }

  /**
     * 获取状态文本
     * @param {string} status 状态
     * @returns {string} 状态文本
     */
  getStatusText(status) {
    const statusMap = {
      pending: '待支付',
      processing: '处理中',
      completed: '已完成',
      failed: '失败',
      cancelled: '已取消',
      expired: '已过期',
      refunded: '已退款'
    };
    return statusMap[status] || status;
  }

  /**
     * 格式化日期时间
     * @param {string} dateString 日期字符串
     * @returns {string} 格式化后的日期时间
     */
  formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
     * 显示错误信息
     * @param {string} message 错误信息
     */
  showError(message) {
    // 优先使用全局错误处理器
    if (window.errorHandler) {
      window.errorHandler.handleError({
        type: 'payment',
        operation: '支付UI操作',
        message: message,
        component: 'PaymentUI'
      });
      return;
    }

    // 降级处理：使用console.log
    console.log('Notification:', message);
  }

  /**
     * 显示历史记录错误
     * @param {string} message 错误信息
     */
  showHistoryError(message) {
    const container = this.historyModal.querySelector('.payment-history-list');
    const safeMessage = this.escapeHtml(message);
    const paymentHTML = `<div class="error-message">${safeMessage}</div>`;
    Utils.setElementHTML(container, paymentHTML, true); // 内部生成的安全HTML
  }

  /**
     * 绑定事件
     */
  bindEvents() {
    // 支付模态框事件
    this.paymentModal.addEventListener('click', (e) => {
      const action = e.target.getAttribute('data-action');

      switch (action) {
      case 'close-payment':
        this.hidePaymentModal();
        break;
      }
    });

    // 支付方式选择事件
    this.paymentModal.addEventListener('change', (e) => {
      if (e.target.name === 'payment-method') {
        this.showPaymentForm(e.target.value);
      }
    });

    // 支付提交事件
    this.paymentModal.querySelector('.payment-submit').addEventListener('click', () => {
      this.handlePaymentSubmit();
    });

    // 支付状态模态框事件
    this.statusModal.addEventListener('click', (e) => {
      const action = e.target.getAttribute('data-action');

      switch (action) {
      case 'close-status':
        this.hideStatusModal();
        break;
      case 'retry-payment':
        this.hideStatusModal();
        if (this.currentOrderData) {
          this.showPaymentModal(this.currentOrderData);
        }
        break;
      case 'view-order':
        this.hideStatusModal();
        this.emit('viewOrder', { order: this.currentOrderData });
        break;
      }
    });

    // 支付历史模态框事件
    this.historyModal.addEventListener('click', (e) => {
      const action = e.target.getAttribute('data-action');
      const paymentId = e.target.getAttribute('data-payment-id');

      switch (action) {
      case 'close-history':
        this.hideHistoryModal();
        break;
      case 'apply-filters':
        this.applyHistoryFilters();
        break;
      case 'reset-filters':
        this.resetHistoryFilters();
        break;
      case 'view-payment-details':
        this.viewPaymentDetails(paymentId);
        break;
      case 'request-refund':
        this.requestRefund(paymentId);
        break;
      case 'retry-payment':
        this.retryPayment(paymentId);
        break;
      }
    });

    // 分页事件
    this.historyModal.querySelector('.prev-page').addEventListener('click', () => {
      this.navigateHistoryPage(-1);
    });

    this.historyModal.querySelector('.next-page').addEventListener('click', () => {
      this.navigateHistoryPage(1);
    });

    // 模态框外部点击关闭
    [this.paymentModal, this.statusModal, this.historyModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
          document.body.style.overflow = '';
        }
      });
    });

    // 键盘事件
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.paymentModal.style.display === 'flex') {
          this.hidePaymentModal();
        } else if (this.statusModal.style.display === 'flex') {
          this.hideStatusModal();
        } else if (this.historyModal.style.display === 'flex') {
          this.hideHistoryModal();
        }
      }
    });
  }

  /**
     * 应用历史筛选
     */
  applyHistoryFilters() {
    const statusFilter = this.historyModal.querySelector('#status-filter').value;
    const methodFilter = this.historyModal.querySelector('#method-filter').value;

    const filters = {};
    if (statusFilter) {filters.status = statusFilter;}
    if (methodFilter) {filters.method = methodFilter;}

    const userId = this.getCurrentUserId();
    this.loadPaymentHistory(userId, filters, 1);
  }

  /**
     * 重置历史筛选
     */
  resetHistoryFilters() {
    this.historyModal.querySelector('#status-filter').value = '';
    this.historyModal.querySelector('#method-filter').value = '';

    const userId = this.getCurrentUserId();
    this.loadPaymentHistory(userId, {}, 1);
  }

  /**
     * 导航历史页面
     * @param {number} direction 方向 (-1: 上一页, 1: 下一页)
     */
  navigateHistoryPage(direction) {
    const pagination = this.historyModal.querySelector('.payment-history-pagination');
    const currentPage = parseInt(pagination.dataset.currentPage, 10) || 1;
    const totalPages = parseInt(pagination.dataset.totalPages, 10) || 1;

    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
      const userId = this.getCurrentUserId();
      const filters = this.getCurrentFilters();
      this.loadPaymentHistory(userId, filters, newPage);
    }
  }

  /**
     * 获取当前筛选条件
     * @returns {Object} 筛选条件
     */
  getCurrentFilters() {
    const statusFilter = this.historyModal.querySelector('#status-filter').value;
    const methodFilter = this.historyModal.querySelector('#method-filter').value;

    const filters = {};
    if (statusFilter) {filters.status = statusFilter;}
    if (methodFilter) {filters.method = methodFilter;}

    return filters;
  }

  /**
     * 查看支付详情
     * @param {string} paymentId 支付ID
     */
  viewPaymentDetails(paymentId) {
    const paymentStatus = this.paymentManager.getPaymentStatus(paymentId);
    if (paymentStatus.found) {
      this.hideHistoryModal();
      this.showPaymentStatus('success', {
        title: '支付详情',
        description: '支付订单详细信息',
        payment: paymentStatus.payment
      });
    }
  }

  /**
     * 申请退款
     * @param {string} paymentId 支付ID
     */
  async requestRefund(paymentId) {
    try {
      // 使用模态框替代prompt
      const reason = await this.showRefundReasonDialog();
      if (!reason) {return;}

      const paymentStatus = this.paymentManager.getPaymentStatus(paymentId);
      if (!paymentStatus.found) {
        this.showError('支付订单不存在');
        return;
      }

      const result = await this.paymentManager.requestRefund(
        paymentId,
        paymentStatus.payment.amount,
        reason
      );

      if (result.success) {
        console.log('退款申请已提交，请等待处理');
        // 刷新历史记录
        const userId = this.getCurrentUserId();
        const filters = this.getCurrentFilters();
        const currentPage = parseInt(this.historyModal.querySelector('.payment-history-pagination').dataset.currentPage, 10) || 1;
        this.loadPaymentHistory(userId, filters, currentPage);
      } else {
        this.showError('退款申请失败，请稍后重试');
      }

    } catch (error) {
      console.error('申请退款失败:', error);
      this.showError(error.message || '退款申请失败');
    }
  }

  /**
     * 重新支付
     * @param {string} paymentId 支付ID
     */
  retryPayment(paymentId) {
    const paymentStatus = this.paymentManager.getPaymentStatus(paymentId);
    if (paymentStatus.found && paymentStatus.payment.metadata && paymentStatus.payment.metadata.orderData) {
      this.hideHistoryModal();
      this.showPaymentModal(paymentStatus.payment.metadata.orderData);
    } else {
      this.showError('无法重新支付，订单信息不完整');
    }
  }

  /**
     * 添加事件监听器
     * @param {string} event 事件名称
     * @param {Function} callback 回调函数
     */
  on(event, callback) {
    if (!this.eventListeners) {
      this.eventListeners = new Map();
    }
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
     * 触发事件
     * @param {string} event 事件名称
     * @param {Object} data 事件数据
     */
  emit(event, data) {
    if (this.eventListeners && this.eventListeners.has(event)) {
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
   * HTML转义函数，防止XSS攻击
   * @param {string} str - 需要转义的字符串
   * @returns {string} 转义后的安全字符串
   */
  escapeHtml(str) {
    if (typeof str !== 'string') {return str;}
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  showRefundReasonDialog() {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal fade';
      modal.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">申请退款</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <label for="refundReason" class="form-label">请输入退款原因：</label>
              <textarea id="refundReason" class="form-control" rows="3" placeholder="请输入退款原因..." required></textarea>
              <div class="text-danger d-none" id="refundError">请输入退款原因</div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
              <button type="button" class="btn btn-primary" id="confirmRefund">确认申请</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      const bsModal = new window.bootstrap.Modal(modal);

      modal.querySelector('#confirmRefund').addEventListener('click', () => {
        const reason = modal.querySelector('#refundReason').value.trim();
        const errorDiv = modal.querySelector('#refundError');
        if (!reason) {
          errorDiv.classList.remove('d-none');
          return;
        }
        errorDiv.classList.add('d-none');
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

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PaymentUI;
} else {
  window.PaymentUI = PaymentUI;
}
