/**
 * 订单管理JavaScript模块
 * 参考PrestaShop的订单管理功能实现
 * 
 * 功能特性：
 * - 订单列表展示
 * - 订单筛选和搜索
 * - 订单详情查看
 * - 订单操作（重新下单、查看发票、退货等）
 * - 分页功能
 * - 响应式设计
 * - 无障碍性支持
 */

// 订单管理类
class OrderManager {
    constructor() {
        this.orders = [];
        this.filteredOrders = [];
        this.currentPage = 1;
        this.ordersPerPage = 10;
        this.totalPages = 1;
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.isLoading = false;
        
        // DOM元素
        this.elements = {
            loadingState: document.getElementById('loadingState'),
            emptyState: document.getElementById('emptyState'),
            ordersList: document.getElementById('ordersList'),
            pagination: document.getElementById('pagination'),
            orderSearch: document.getElementById('orderSearch'),
            filterButtons: document.querySelectorAll('.order-filter-btn'),
            orderDetailModal: document.getElementById('orderDetailModal'),
            modalTitle: document.getElementById('modalTitle'),
            modalContent: document.getElementById('modalContent'),
            closeModal: document.getElementById('closeModal')
        };
        
        // 初始化
        this.init();
    }
    
    /**
     * 初始化订单管理器
     */
    init() {
        this.setupEventListeners();
        this.loadOrders();
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 搜索功能
        if (this.elements.orderSearch) {
            this.elements.orderSearch.addEventListener('input', this.debounce((e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.currentPage = 1;
                this.filterAndDisplayOrders();
            }, 300));
        }
        
        // 筛选按钮
        this.elements.filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveFilter(e.target);
                this.currentFilter = e.target.dataset.status;
                this.currentPage = 1;
                this.filterAndDisplayOrders();
            });
        });
        
        // 模态框关闭
        if (this.elements.closeModal) {
            this.elements.closeModal.addEventListener('click', () => {
                this.closeOrderDetailModal();
            });
        }
        
        // 点击模态框外部关闭
        if (this.elements.orderDetailModal) {
            this.elements.orderDetailModal.addEventListener('click', (e) => {
                if (e.target === this.elements.orderDetailModal) {
                    this.closeOrderDetailModal();
                }
            });
        }
        
        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.elements.orderDetailModal.classList.contains('hidden')) {
                this.closeOrderDetailModal();
            }
        });
    }
    
    /**
     * 加载订单数据
     */
    async loadOrders() {
        this.showLoading();
        
        try {
            // 模拟API调用
            const mockOrders = this.generateMockOrders();
            this.orders = mockOrders;
            this.filterAndDisplayOrders();
        } catch (error) {
            console.error('加载订单失败:', error);
            this.showError('加载订单失败，请稍后重试');
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * 生成模拟订单数据
     */
    generateMockOrders() {
        const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        const products = [
            { name: '女士手袋系列', price: 8800, image: 'images/products/product-1.jpg' },
            { name: '男士西装系列', price: 12500, image: 'images/products/product-2.jpg' },
            { name: '奢华配饰系列', price: 5200, image: 'images/products/product-3.jpg' },
            { name: '经典香水', price: 1200, image: 'images/products/product-4.jpg' },
            { name: '丝巾系列', price: 2800, image: 'images/products/product-5.jpg' }
        ];
        
        const orders = [];
        for (let i = 1; i <= 25; i++) {
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const productCount = Math.floor(Math.random() * 3) + 1;
            const items = [];
            let total = 0;
            
            for (let j = 0; j < productCount; j++) {
                const product = products[Math.floor(Math.random() * products.length)];
                const quantity = Math.floor(Math.random() * 2) + 1;
                const subtotal = product.price * quantity;
                total += subtotal;
                
                items.push({
                    id: `item-${i}-${j}`,
                    productId: `product-${product.name}`,
                    name: product.name,
                    sku: `SKU${1000 + i}${j}`,
                    price: product.price,
                    quantity: quantity,
                    subtotal: subtotal,
                    image: product.image
                });
            }
            
            const orderDate = new Date();
            orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 90));
            
            orders.push({
                id: `ORD-${String(i).padStart(6, '0')}`,
                reference: `REF-${String(i).padStart(8, '0')}`,
                date: orderDate,
                status: status,
                total: total,
                currency: 'CNY',
                items: items,
                shippingAddress: {
                    name: '张三',
                    phone: '13800138000',
                    address: '北京市朝阳区某某街道123号',
                    city: '北京市',
                    province: '北京',
                    postalCode: '100000'
                },
                paymentMethod: '支付宝',
                trackingNumber: status === 'shipped' || status === 'delivered' ? `TN${String(i).padStart(10, '0')}` : null,
                invoiceUrl: status !== 'cancelled' ? `/api/orders/${i}/invoice` : null
            });
        }
        
        return orders.sort((a, b) => b.date - a.date);
    }
    
    /**
     * 筛选和显示订单
     */
    filterAndDisplayOrders() {
        // 应用筛选
        this.filteredOrders = this.orders.filter(order => {
            const matchesFilter = this.currentFilter === 'all' || order.status === this.currentFilter;
            const matchesSearch = !this.searchTerm || 
                order.id.toLowerCase().includes(this.searchTerm) ||
                order.reference.toLowerCase().includes(this.searchTerm) ||
                order.items.some(item => item.name.toLowerCase().includes(this.searchTerm));
            
            return matchesFilter && matchesSearch;
        });
        
        // 计算分页
        this.totalPages = Math.ceil(this.filteredOrders.length / this.ordersPerPage);
        
        // 显示订单
        this.displayOrders();
        this.displayPagination();
        
        // 显示空状态或订单列表
        if (this.filteredOrders.length === 0) {
            this.showEmptyState();
        } else {
            this.showOrdersList();
        }
    }
    
    /**
     * 显示订单列表
     */
    displayOrders() {
        const startIndex = (this.currentPage - 1) * this.ordersPerPage;
        const endIndex = startIndex + this.ordersPerPage;
        const ordersToShow = this.filteredOrders.slice(startIndex, endIndex);
        
        this.elements.ordersList.innerHTML = ordersToShow.map(order => this.createOrderCard(order)).join('');
        
        // 添加订单卡片事件监听器
        this.addOrderCardEventListeners();
    }
    
    /**
     * 创建订单卡片HTML
     */
    createOrderCard(order) {
        const statusText = this.getStatusText(order.status);
        const statusClass = `order-status ${order.status}`;
        
        return `
            <article class="order-card" data-order-id="${order.id}">
                <div class="order-card-header">
                    <div>
                        <h3 class="order-number">${order.id}</h3>
                        <p class="order-date">${this.formatDate(order.date)}</p>
                    </div>
                    <span class="${statusClass}">${statusText}</span>
                </div>
                
                <div class="order-card-body">
                    <div class="order-items">
                        ${order.items.slice(0, 2).map(item => this.createOrderItem(item)).join('')}
                        ${order.items.length > 2 ? `<p class="text-sm text-[var(--text-muted)]">还有 ${order.items.length - 2} 件商品...</p>` : ''}
                    </div>
                    
                    <div class="order-summary">
                        <span class="order-total">总计: ${this.formatCurrency(order.total)}</span>
                    </div>
                </div>
                
                <div class="order-card-footer">
                    <button class="order-action-btn primary" onclick="orderManager.showOrderDetail('${order.id}')">
                        查看详情
                    </button>
                    ${order.status === 'delivered' ? `
                        <button class="order-action-btn secondary" onclick="orderManager.reorder('${order.id}')">
                            再次购买
                        </button>
                    ` : ''}
                    ${order.invoiceUrl ? `
                        <button class="order-action-btn secondary" onclick="orderManager.downloadInvoice('${order.id}')">
                            下载发票
                        </button>
                    ` : ''}
                    ${order.status === 'delivered' ? `
                        <button class="order-action-btn outline" onclick="orderManager.requestReturn('${order.id}')">
                            申请退货
                        </button>
                    ` : ''}
                </div>
            </article>
        `;
    }
    
    /**
     * 创建订单项HTML
     */
    createOrderItem(item) {
        return `
            <div class="order-item">
                <img src="${item.image}" alt="${item.name}" class="order-item-image" loading="lazy">
                <div class="order-item-details">
                    <h4 class="order-item-name">${item.name}</h4>
                    <p class="order-item-quantity">数量: ${item.quantity}</p>
                </div>
                <span class="order-item-price">${this.formatCurrency(item.subtotal)}</span>
            </div>
        `;
    }
    
    /**
     * 显示分页
     */
    displayPagination() {
        if (this.totalPages <= 1) {
            this.elements.pagination.classList.add('hidden');
            return;
        }
        
        this.elements.pagination.classList.remove('hidden');
        
        let paginationHTML = '';
        
        // 上一页按钮
        paginationHTML += `
            <li>
                <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} 
                        onclick="orderManager.goToPage(${this.currentPage - 1})">
                    <i class="fas fa-chevron-left" aria-hidden="true"></i>
                </button>
            </li>
        `;
        
        // 页码按钮
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            paginationHTML += `<li><button class="pagination-btn" onclick="orderManager.goToPage(1)">1</button></li>`;
            if (startPage > 2) {
                paginationHTML += `<li><span class="px-2">...</span></li>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li>
                    <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                            onclick="orderManager.goToPage(${i})">
                        ${i}
                    </button>
                </li>
            `;
        }
        
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                paginationHTML += `<li><span class="px-2">...</span></li>`;
            }
            paginationHTML += `<li><button class="pagination-btn" onclick="orderManager.goToPage(${this.totalPages})">${this.totalPages}</button></li>`;
        }
        
        // 下一页按钮
        paginationHTML += `
            <li>
                <button class="pagination-btn" ${this.currentPage === this.totalPages ? 'disabled' : ''} 
                        onclick="orderManager.goToPage(${this.currentPage + 1})">
                    <i class="fas fa-chevron-right" aria-hidden="true"></i>
                </button>
            </li>
        `;
        
        this.elements.pagination.querySelector('ul').innerHTML = paginationHTML;
    }
    
    /**
     * 显示订单详情模态框
     */
    showOrderDetail(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;
        
        this.elements.modalTitle.textContent = `订单详情 - ${order.id}`;
        this.elements.modalContent.innerHTML = this.createOrderDetailContent(order);
        this.elements.orderDetailModal.classList.remove('hidden');
        
        // 禁用背景滚动
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * 创建订单详情内容HTML
     */
    createOrderDetailContent(order) {
        const statusText = this.getStatusText(order.status);
        const statusClass = `order-status ${order.status}`;
        
        return `
            <div class="order-detail-section">
                <h3 class="order-detail-title">基本信息</h3>
                <div class="order-detail-grid">
                    <div class="order-detail-item">
                        <span class="order-detail-label">订单号</span>
                        <span class="order-detail-value">${order.id}</span>
                    </div>
                    <div class="order-detail-item">
                        <span class="order-detail-label">订单参考</span>
                        <span class="order-detail-value">${order.reference}</span>
                    </div>
                    <div class="order-detail-item">
                        <span class="order-detail-label">下单时间</span>
                        <span class="order-detail-value">${this.formatDateTime(order.date)}</span>
                    </div>
                    <div class="order-detail-item">
                        <span class="order-detail-label">订单状态</span>
                        <span class="${statusClass}">${statusText}</span>
                    </div>
                    <div class="order-detail-item">
                        <span class="order-detail-label">支付方式</span>
                        <span class="order-detail-value">${order.paymentMethod}</span>
                    </div>
                    <div class="order-detail-item">
                        <span class="order-detail-label">订单总额</span>
                        <span class="order-detail-value font-semibold">${this.formatCurrency(order.total)}</span>
                    </div>
                </div>
            </div>
            
            <div class="order-detail-section">
                <h3 class="order-detail-title">商品清单</h3>
                <div class="order-detail-items-list">
                    ${order.items.map(item => this.createOrderDetailItem(item)).join('')}
                </div>
            </div>
            
            <div class="order-detail-section">
                <h3 class="order-detail-title">收货信息</h3>
                <div class="order-detail-grid">
                    <div class="order-detail-item">
                        <span class="order-detail-label">收货人</span>
                        <span class="order-detail-value">${order.shippingAddress.name}</span>
                    </div>
                    <div class="order-detail-item">
                        <span class="order-detail-label">联系电话</span>
                        <span class="order-detail-value">${order.shippingAddress.phone}</span>
                    </div>
                    <div class="order-detail-item">
                        <span class="order-detail-label">收货地址</span>
                        <span class="order-detail-value">${order.shippingAddress.address}</span>
                    </div>
                    <div class="order-detail-item">
                        <span class="order-detail-label">城市</span>
                        <span class="order-detail-value">${order.shippingAddress.city}</span>
                    </div>
                    <div class="order-detail-item">
                        <span class="order-detail-label">省份</span>
                        <span class="order-detail-value">${order.shippingAddress.province}</span>
                    </div>
                    <div class="order-detail-item">
                        <span class="order-detail-label">邮政编码</span>
                        <span class="order-detail-value">${order.shippingAddress.postalCode}</span>
                    </div>
                </div>
            </div>
            
            ${order.trackingNumber ? `
                <div class="order-detail-section">
                    <h3 class="order-detail-title">物流信息</h3>
                    <div class="order-detail-item">
                        <span class="order-detail-label">运单号</span>
                        <span class="order-detail-value">${order.trackingNumber}</span>
                    </div>
                    <div class="order-detail-timeline mt-6">
                        <div class="order-detail-timeline-item">
                            <div class="order-detail-timeline-dot completed">
                                <i class="fas fa-check order-detail-timeline-icon text-white"></i>
                            </div>
                            <div class="order-detail-timeline-content">
                                <h4 class="order-detail-timeline-title">订单已确认</h4>
                                <p class="order-detail-timeline-description">我们已收到您的订单</p>
                                <p class="order-detail-timeline-time">${this.formatDateTime(order.date)}</p>
                            </div>
                        </div>
                        <div class="order-detail-timeline-item">
                            <div class="order-detail-timeline-dot completed">
                                <i class="fas fa-box order-detail-timeline-icon text-white"></i>
                            </div>
                            <div class="order-detail-timeline-content">
                                <h4 class="order-detail-timeline-title">商品已发货</h4>
                                <p class="order-detail-timeline-description">您的商品已交付物流</p>
                                <p class="order-detail-timeline-time">${this.formatDateTime(new Date(order.date.getTime() + 2 * 24 * 60 * 60 * 1000))}</p>
                            </div>
                        </div>
                        ${order.status === 'delivered' ? `
                            <div class="order-detail-timeline-item">
                                <div class="order-detail-timeline-dot completed">
                                    <i class="fas fa-home order-detail-timeline-icon text-white"></i>
                                </div>
                                <div class="order-detail-timeline-content">
                                    <h4 class="order-detail-timeline-title">已送达</h4>
                                    <p class="order-detail-timeline-description">商品已送达收货地址</p>
                                    <p class="order-detail-timeline-time">${this.formatDateTime(new Date(order.date.getTime() + 5 * 24 * 60 * 60 * 1000))}</p>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
            
            <div class="order-detail-section">
                <h3 class="order-detail-title">订单操作</h3>
                <div class="flex flex-wrap gap-3">
                    <button class="order-action-btn primary" onclick="orderManager.reorder('${order.id}')">
                        再次购买
                    </button>
                    ${order.invoiceUrl ? `
                        <button class="order-action-btn secondary" onclick="orderManager.downloadInvoice('${order.id}')">
                            下载发票
                        </button>
                    ` : ''}
                    ${order.status === 'delivered' ? `
                        <button class="order-action-btn outline" onclick="orderManager.requestReturn('${order.id}')">
                            申请退货
                        </button>
                    ` : ''}
                    ${order.status === 'pending' ? `
                        <button class="order-action-btn outline" onclick="orderManager.cancelOrder('${order.id}')">
                            取消订单
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * 创建订单详情项HTML
     */
    createOrderDetailItem(item) {
        return `
            <div class="order-detail-item-row">
                <img src="${item.image}" alt="${item.name}" class="order-detail-item-image" loading="lazy">
                <div class="order-detail-item-info">
                    <h4 class="order-detail-item-name">${item.name}</h4>
                    <p class="order-detail-item-sku">SKU: ${item.sku}</p>
                    <p class="order-detail-item-quantity">数量: ${item.quantity}</p>
                </div>
                <div class="text-right">
                    <p class="order-detail-item-price">${this.formatCurrency(item.price)}</p>
                    <p class="text-sm text-[var(--text-muted)]">小计: ${this.formatCurrency(item.subtotal)}</p>
                </div>
            </div>
        `;
    }
    
    /**
     * 关闭订单详情模态框
     */
    closeOrderDetailModal() {
        this.elements.orderDetailModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    /**
     * 添加订单卡片事件监听器
     */
    addOrderCardEventListeners() {
        // 这里可以添加特定的事件监听器
        // 目前大部分功能通过onclick处理
    }
    
    /**
     * 设置活动筛选器
     */
    setActiveFilter(activeButton) {
        this.elements.filterButtons.forEach(btn => {
            btn.classList.remove('active');
        });
        activeButton.classList.add('active');
    }
    
    /**
     * 跳转到指定页面
     */
    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.filterAndDisplayOrders();
            // 滚动到页面顶部
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    
    /**
     * 再次购买
     */
    reorder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;
        
        // 将商品添加到购物车
        order.items.forEach(item => {
            if (typeof addToCart === 'function') {
                addToCart({
                    id: item.productId,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    image: item.image
                });
            }
        });
        
        // 显示成功消息
        this.showSuccess('商品已添加到购物车');
        
        // 关闭模态框
        this.closeOrderDetailModal();
        
        // 跳转到购物车页面
        setTimeout(() => {
            window.location.href = 'cart.html';
        }, 1000);
    }
    
    /**
     * 下载发票
     */
    downloadInvoice(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order || !order.invoiceUrl) return;
        
        // 模拟下载发票
        window.open(order.invoiceUrl, '_blank');
        this.showSuccess('发票下载已开始');
    }
    
    /**
     * 申请退货
     */
    requestReturn(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;
        
        // 跳转到退货申请页面
        window.location.href = `return-request.html?orderId=${orderId}`;
    }
    
    /**
     * 取消订单
     */
    cancelOrder(orderId) {
        if (!confirm('确定要取消这个订单吗？')) return;
        
        // 模拟取消订单
        const orderIndex = this.orders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            this.orders[orderIndex].status = 'cancelled';
            this.filterAndDisplayOrders();
            this.showSuccess('订单已取消');
            this.closeOrderDetailModal();
        }
    }
    
    /**
     * 显示加载状态
     */
    showLoading() {
        this.isLoading = true;
        this.elements.loadingState.classList.remove('hidden');
        this.elements.emptyState.classList.add('hidden');
        this.elements.ordersList.classList.add('hidden');
        this.elements.pagination.classList.add('hidden');
    }
    
    /**
     * 隐藏加载状态
     */
    hideLoading() {
        this.isLoading = false;
        this.elements.loadingState.classList.add('hidden');
    }
    
    /**
     * 显示空状态
     */
    showEmptyState() {
        this.elements.emptyState.classList.remove('hidden');
        this.elements.ordersList.classList.add('hidden');
        this.elements.pagination.classList.add('hidden');
    }
    
    /**
     * 显示订单列表
     */
    showOrdersList() {
        this.elements.ordersList.classList.remove('hidden');
        this.elements.emptyState.classList.add('hidden');
    }
    
    /**
     * 显示成功消息
     */
    showSuccess(message) {
        this.showToast(message, 'success');
    }
    
    /**
     * 显示错误消息
     */
    showError(message) {
        this.showToast(message, 'error');
    }
    
    /**
     * 显示提示消息
     */
    showToast(message, type = 'info') {
        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = `fixed top-24 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300`;
        
        // 设置样式
        if (type === 'success') {
            toast.classList.add('bg-green-500', 'text-white');
        } else if (type === 'error') {
            toast.classList.add('bg-red-500', 'text-white');
        } else {
            toast.classList.add('bg-blue-500', 'text-white');
        }
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // 显示toast
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);
        
        // 自动隐藏
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
    
    /**
     * 获取状态文本
     */
    getStatusText(status) {
        const statusMap = {
            'pending': '待付款',
            'processing': '处理中',
            'shipped': '已发货',
            'delivered': '已送达',
            'cancelled': '已取消'
        };
        return statusMap[status] || status;
    }
    
    /**
     * 格式化日期
     */
    formatDate(date) {
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date);
    }
    
    /**
     * 格式化日期时间
     */
    formatDateTime(date) {
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }
    
    /**
     * 格式化货币
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('zh-CN', {
            style: 'currency',
            currency: 'CNY'
        }).format(amount);
    }
    
    /**
     * 防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// 全局订单管理器实例
let orderManager;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    orderManager = new OrderManager();
    
    // 暴露给全局作用域，以便HTML中的onclick可以访问
    window.orderManager = orderManager;
});

// 导出模块（如果需要）
export default OrderManager;
