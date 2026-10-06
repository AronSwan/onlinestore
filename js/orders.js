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

// 批一(5) toast 四物种归一：本文件私货 showToast（Tailwind 绿/红/蓝三色顶右角）
// 退役，改调 shared/toast.js；批一(7) 订单弹窗 ESC 关闭走 overlay-escape 全站分发器
import { showToast } from './shared/toast.js';
import { registerOverlayEscape } from './shared/overlay-escape.js';

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
            searchEmptyState: document.getElementById('searchEmptyState'),
            filterButtons: document.querySelectorAll('.order-filter-btn'),
            orderDetailModal: document.getElementById('orderDetailModal'),
            modalTitle: document.getElementById('modalTitle'),
            modalContent: document.getElementById('modalContent'),
            closeModal: document.getElementById('closeModal'),
            demoDataBadge: document.getElementById('demoDataBadge')
        };
        
        // 是否正在展示演示数据（后端不可用时的回退）
        this.isDemoData = false;
        
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

        // 批四(11): 搜索无果独立空态的"清空搜索"按钮（没命中≠没有订单，不指责记忆）
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => this.clearSearch());
        }
        
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
        
        // 批一(7)：ESC 关闭模态框——走 overlay-escape 全站分发器
        //（与购物袋/用户菜单/移动菜单/搜索条同一位分发者，替代本文件私挂 document keydown）
        registerOverlayEscape('order-modal', () => {
            if (!this.elements.orderDetailModal.classList.contains('hidden')) {
                this.closeOrderDetailModal();
                return true;
            }
            return false;
        });
    }
    
    /**
     * 加载订单数据
     * 优先携带 token 请求用户级订单路由 GET /api/orders/user/{userId}
     * （GET /api/orders 是 ADMIN-only 路由，RolesGuard 强制，普通用户必 403；
     * token/userId 存取键名与 auth.js 保持一致）；
     * 未登录、无法确定 userId、401/403 或网络错误时回退到本地演示数据，
     * 并显示"演示数据"徽标，避免用户把演示数据误认为真实订单。
     */
    async loadOrders() {
        this.showLoading();

        try {
            const token = this.getAccessToken();

            // A9（流程体验官终版裁决·三席共中）：游客默认引导态——未登录不再
            // 直铺演示数据（"惊吓在前解释在后"）；"登录看真实订单"CTA 挂
            // returnUrl 回跳，演示数据折进"先看看长什么样"（展开后黄条徽标保持）
            if (!token) {
                this.showGuestState();
                return;
            }

            const userId = this.resolveUserId(token);

            if (userId) {
                const response = await fetch(`/api/orders/user/${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    // 后端 findByUserId 返回 { orders: [...], total }（orders.service.ts），
                    // 兼容常见的返回形状：数组、{orders: [...]}、{items: [...]}
                    const rawOrders = Array.isArray(data) ? data : (data.orders || data.items || []);
                    this.orders = this.normalizeApiOrders(rawOrders);
                    this.isDemoData = false;
                    this.hideDemoBadge();
                    this.filterAndDisplayOrders();
                    return;
                }

                console.warn(`订单API返回 ${response.status}，回退到演示数据`);
            } else {
                console.warn('无法确定当前用户ID（storage 与令牌均无有效 userId），使用演示数据');
            }

            // 已登录但无法确定 userId 或API返回非2xx：回退演示数据
            this.loadDemoData();
        } catch (error) {
            console.warn('从API加载订单失败，回退到演示数据:', error.message);
            this.loadDemoData();
        } finally {
            this.hideLoading();
        }
    }

    /**
     * A9：游客引导态——"登录看真实订单"（login.html?returnUrl=orders.html 回跳）
     * + 演示数据折叠展开。展开后 loadDemoData 照常亮黄条徽标并保持可见
     *（苏黎世保留意见：该页唯一值得守住的资产）。
     */
    showGuestState() {
        this.hideLoading();
        const guest = document.getElementById('guestState');
        if (guest) guest.classList.remove('hidden');
        this.elements.emptyState.classList.add('hidden');
        this.elements.ordersList.classList.add('hidden');
        this.elements.pagination.classList.add('hidden');
        if (this.elements.searchEmptyState) this.elements.searchEmptyState.classList.add('hidden');

        const expandBtn = document.getElementById('demoExpandBtn');
        if (expandBtn && !expandBtn.dataset.bound) {
            expandBtn.dataset.bound = '1';
            expandBtn.addEventListener('click', () => {
                guest.classList.add('hidden');
                this.loadDemoData();
            });
        }
    }
    
    /**
     * 加载演示数据（标记为演示模式并显示徽标）
     */
    loadDemoData() {
        this.orders = this.generateMockOrders();
        this.isDemoData = true;
        this.showDemoBadge();
        this.filterAndDisplayOrders();
    }
    
    /**
     * 读取登录令牌（键名与 auth.js 的登录逻辑保持一致：'token'）
     */
    getAccessToken() {
        return localStorage.getItem('token') || sessionStorage.getItem('token');
    }
    
    /**
     * 解析当前用户ID（供 GET /api/orders/user/{userId} 使用）：
     * 1. 优先读 storage 的 'userId'（auth.js 登录/注册成功时随令牌写入，
     *    键名与 user-behavior-analytics.js 等既有约定一致）；
     * 2. 否则客户端解码 JWT payload 取 sub（后端签发令牌时 sub = user.id，
     *    见 backend/src/auth/auth.service.ts generateTokens）。
     * 返回正整数字符串；两者都拿不到时返回 null（调用方直接回落演示数据，不发请求）。
     */
    resolveUserId(token) {
        const stored = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        if (stored && /^\d+$/.test(String(stored).trim())) {
            return String(stored).trim();
        }
        return this.getJwtSub(token);
    }
    
    /**
     * 解码 JWT payload 并提取 sub。
     * JWT 的 payload 段是 base64url 编码：需要把 '-' 换回 '+'、'_' 换回 '/'，
     * 并补齐 '=' padding 后才能用 atob 解码。
     */
    getJwtSub(token) {
        try {
            const parts = String(token).split('.');
            if (parts.length < 2) {
                return null;
            }
            let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            while (payload.length % 4 !== 0) {
                payload += '=';
            }
            const decoded = JSON.parse(atob(payload));
            const id = Number(decoded && decoded.sub);
            return Number.isInteger(id) && id > 0 ? String(id) : null;
        } catch (error) {
            console.warn('解析令牌中的用户ID失败:', error.message);
            return null;
        }
    }
    
    /**
     * 将后端返回的订单归一化为渲染所需的形状（防御性映射，
     * 兼容 camelCase / snake_case 字段，最终以后端对齐为准）
     */
    normalizeApiOrders(rawOrders) {
        return (rawOrders || []).map((raw, index) => {
            // F9 防御：后端数组中可能混入 null/undefined 元素，跳过，
            // 并在链尾 filter(Boolean) 剔除，避免下游渲染抛错
            if (!raw) return null;
            const rawItems = Array.isArray(raw.items) ? raw.items : [];
            const items = rawItems.map(item => {
                // 求真修复(2026-10-04): 后端字段是 unitPrice/unit_price 而非 price——兼容
                const price = Number(item.price ?? item.unitPrice ?? item.unit_price) || 0;
                const quantity = Number(item.quantity) || 1;
                return {
                    id: item.id || item.itemId || '',
                    productId: item.productId || item.product_id || '',
                    name: item.name || item.productName || '商品',
                    sku: item.sku || '',
                    price: price,
                    quantity: quantity,
                    subtotal: Number(item.subtotal) || price * quantity,
                    image: item.image || 'images/products/product-1.jpg'
                };
            });
            
            const address = raw.shippingAddress || raw.shipping_address || {};
            const total = Number(raw.total ?? raw.totalAmount ?? raw.total_amount) ||
                items.reduce((sum, item) => sum + item.subtotal, 0);

            // 日期防御：后端可能返回非法日期串（如空对象、乱码），
            // new Date(非法输入) 产出 Invalid Date，而后续
            // Intl.DateTimeFormat.format(Invalid Date) 会抛
            // RangeError: Invalid time value，导致订单列表/详情渲染中断
            // （此时演示徽标已隐藏，用户看到空白页）。
            // 在归一化边界统一兜底为当前时间，保证下游
            // formatDate/formatDateTime/order.date.getTime() 永远拿到合法 Date。
            const parsedDate = new Date(raw.date || raw.createdAt || raw.created_at || Date.now());

            return {
                id: raw.id || raw.orderId || raw.orderNumber || `ORD-${String(index + 1).padStart(6, '0')}`,
                reference: raw.reference || raw.orderRef || raw.id || '',
                date: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
                status: raw.status || 'pending',
                total: total,
                currency: raw.currency || 'CNY',
                items: items,
                shippingAddress: {
                    name: address.name || '-',
                    phone: address.phone || '-',
                    address: address.address || address.street || '-',
                    city: address.city || '-',
                    province: address.province || address.state || '-',
                    postalCode: address.postalCode || address.postal_code || '-'
                },
                paymentMethod: raw.paymentMethod || raw.payment_method || '-',
                trackingNumber: raw.trackingNumber || raw.tracking_number || null,
                invoiceUrl: raw.invoiceUrl || raw.invoice_url || null
            };
        }).filter(Boolean);
    }
    
    /**
     * 显示"演示数据"徽标
     */
    showDemoBadge() {
        if (this.elements.demoDataBadge) {
            this.elements.demoDataBadge.classList.remove('hidden');
        }
    }
    
    /**
     * 隐藏"演示数据"徽标
     */
    hideDemoBadge() {
        if (this.elements.demoDataBadge) {
            this.elements.demoDataBadge.classList.add('hidden');
        }
    }
    
    /**
     * 生成模拟订单数据
     */
    generateMockOrders() {
        const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        const products = [
            { name: '渐变褶皱手袋', price: 299, image: 'images/products/product-1.jpg' },
            { name: '黑皮波士顿包', price: 259, image: 'images/products/product-2.jpg' },
            { name: '湖蓝锁扣手提包', price: 189, image: 'images/products/product-3.jpg' },
            { name: '双色糖果链条包', price: 168, image: 'images/products/product-4.jpg' },
            { name: '花语皮革手提包', price: 229, image: 'images/products/product-5.jpg' }
        ];
        
        const orders = [];
        // 国际用户批冲突仲裁#6(哥本哈根极简+PM双源): 25→5——6 只包的店配
        // 25 条演示订单是"账本比店铺隆重", 5 条一页放下, 分页器随之退场
        for (let i = 1; i <= 5; i++) {
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
            
            // M7·香港挂位: mock 日期线对齐序号——序号越大越新（隔 3 天一单），
            // 消除"ORD-000013 早于 000008"的做数穿帮；与尾部 sort(date desc) 自洽。
            const orderDate = new Date();
            orderDate.setDate(orderDate.getDate() - (26 - i) * 3);
            
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
                trackingNumber: status === 'shipped' || status === 'delivered' ? `TN${String(i).padStart(10, '0')}` : null
                // F9 诚实化：演示数据不再伪造 invoiceUrl——/api/orders/{id}/invoice
                // 在演示环境并不存在；渲染模板已有 order.invoiceUrl 条件判断，
                // 去掉后"下载发票"按钮自然消失
            });
        }
        
        return orders.sort((a, b) => b.date - a.date);
    }
    
    /**
     * 筛选和显示订单
     */
    filterAndDisplayOrders() {
        // 应用筛选（国际用户批#6：processing 档聚合 pending/processing/shipped/delivered
        // 四个活跃态——3 档筛选器下"进行中"覆盖未完结全谱）
        this.filteredOrders = this.orders.filter(order => {
            const activeStatuses = ['pending', 'processing', 'shipped', 'delivered'];
            const matchesFilter = this.currentFilter === 'all' ||
                (this.currentFilter === 'processing' ? activeStatuses.includes(order.status) : order.status === this.currentFilter);
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
        
        // 显示空状态或订单列表（批四(11): 搜索无果走独立空态——词没命中≠没有订单）
        if (this.filteredOrders.length === 0) {
            if (this.searchTerm && this.orders.length > 0) {
                this.showSearchEmptyState();
            } else {
                this.showEmptyState();
            }
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
        // F7 渲染层转义：状态可能原样回显后端数据（getStatusText 兜底 || status），
        // class 属性与文本节点统一转义
        const statusClass = `order-status ${escapeHtml(order.status)}`;

        return `
            <article class="order-card" data-order-id="${escapeHtml(order.id)}">
                <div class="order-card-header">
                    <div>
                        <h3 class="order-number">${escapeHtml(order.id)}</h3>
                        <p class="order-date">${this.formatDate(order.date)}</p>
                    </div>
                    <span class="${statusClass}">${escapeHtml(statusText)}</span>
                </div>

                <div class="order-card-body">
                    <div class="order-items">
                        ${order.items.slice(0, 2).map(item => this.createOrderItem(item)).join('')}
                        ${order.items.length > 2 ? `<p class="text-sm text-[var(--text-muted)]">还有 ${order.items.length - 2} 件商品...</p>` : ''}
                    </div>

                    <div class="order-summary">
                        <span class="order-total"><span class="order-total-label">总计：</span>${this.formatCurrency(order.total)}</span><!-- 批四(8)+批五(10): 拆两 span（中文段 0.75em 对齐）+全角冒号 -->
                    </div>
                </div>

                <div class="order-card-footer">
                    <button class="order-action-btn primary" onclick="orderManager.showOrderDetail('${escapeHtml(order.id)}')">
                        查看详情
                    </button>
                    ${order.status === 'delivered' ? `
                        <button class="order-action-btn secondary" onclick="orderManager.reorder('${escapeHtml(order.id)}')">
                            再次购买
                        </button>
                    ` : ''}
                    ${order.invoiceUrl ? `
                        <button class="order-action-btn secondary" onclick="orderManager.downloadInvoice('${escapeHtml(order.id)}')">
                            下载发票
                        </button>
                    ` : ''}
                    ${order.status === 'delivered' ? `
                        <button class="order-action-btn outline" onclick="orderManager.requestReturn('${escapeHtml(order.id)}')">
                            申请退货
                        </button>
                    ` : ''}
                </div>
            </article>
        `;
    }
    
    /**
     * 订单项缩略图（A 档 4：160w 档实载——72px 缩略此前吃整张 800w jpg，10 倍超标最刺眼）。
     * 本地商品图管线产物挂 160w/480w srcset（DPR2 亦覆盖）；外域/异名图回落单源 src。
     */
    thumbImage(image, name, cls, sizes) {
        const m = String(image || '').match(/^(.*\/)?images\/products\/(product-\d+)\.jpe?g$/i);
        const srcset = m
            ? ` srcset="${m[1] || ''}images/products/${m[2]}-160.webp 160w, ${m[1] || ''}images/products/${m[2]}-480.webp 480w" sizes="${sizes}"`
            : '';
        return `<img src="${escapeHtml(image)}"${srcset} alt="${escapeHtml(name)}" class="${cls}" loading="lazy">`;
    }

    /**
     * 创建订单项HTML
     */
    createOrderItem(item) {
        return `
            <div class="order-item">
                ${this.thumbImage(item.image, item.name, 'order-item-image', '72px')}
                <div class="order-item-details">
                    <h4 class="order-item-name">${escapeHtml(item.name)}</h4>
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
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
        // F7 渲染层转义：与 createOrderCard 一致
        const statusClass = `order-status ${escapeHtml(order.status)}`;

        return `
            <div class="order-detail-section">
                <h3 class="order-detail-title">基本信息</h3>
                <div class="order-detail-grid">
                    <div class="order-detail-item">
                        <span class="order-detail-label">订单号</span>
                        <span class="order-detail-value">${escapeHtml(order.id)}</span>
                    </div>
                    <div class="order-detail-item">
                        <span class="order-detail-label">订单参考</span>
                        <span class="order-detail-value">${escapeHtml(order.reference)}</span>
                    </div>
                    <div class="order-detail-item">
                        <span class="order-detail-label">下单时间</span>
                        <span class="order-detail-value">${this.formatDateTime(order.date)}</span>
                    </div>
                    <div class="order-detail-item">
                        <span class="order-detail-label">订单状态</span>
                        <span class="${statusClass}">${escapeHtml(statusText)}</span>
                    </div>
                    <div class="order-detail-item">
                        <span class="order-detail-label">支付方式</span>
                        <span class="order-detail-value">${escapeHtml(order.paymentMethod)}</span>
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
                        <span class="order-detail-value">${escapeHtml(order.shippingAddress.name)}</span>
                    </div>
                    <div class="order-detail-item">
                        <span class="order-detail-label">联系电话</span>
                        <span class="order-detail-value">${escapeHtml(order.shippingAddress.phone)}</span>
                    </div>
                    <div class="order-detail-item">
                        <span class="order-detail-label">收货地址</span>
                        <span class="order-detail-value">${escapeHtml(order.shippingAddress.address)}</span>
                    </div>
                    <div class="order-detail-item">
                        <span class="order-detail-label">城市</span>
                        <span class="order-detail-value">${escapeHtml(order.shippingAddress.city)}</span>
                    </div>
                    <div class="order-detail-item">
                        <span class="order-detail-label">省份</span>
                        <span class="order-detail-value">${escapeHtml(order.shippingAddress.province)}</span>
                    </div>
                    <div class="order-detail-item">
                        <span class="order-detail-label">邮政编码</span>
                        <span class="order-detail-value">${escapeHtml(order.shippingAddress.postalCode)}</span>
                    </div>
                </div>
            </div>

            ${order.trackingNumber ? `
                <div class="order-detail-section">
                    <h3 class="order-detail-title">物流信息</h3>
                    <div class="order-detail-item">
                        <span class="order-detail-label">运单号</span>
                        <span class="order-detail-value">${escapeHtml(order.trackingNumber)}</span>
                    </div>
                    <div class="order-detail-timeline mt-6">
                        <div class="order-detail-timeline-item">
                            <div class="order-detail-timeline-dot completed">
                                <svg class="order-detail-timeline-icon text-white" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>
                            </div>
                            <div class="order-detail-timeline-content">
                                <h4 class="order-detail-timeline-title">订单已确认</h4>
                                <p class="order-detail-timeline-description">我们已收到您的订单</p>
                                <p class="order-detail-timeline-time">${this.formatDateTime(order.date)}</p>
                            </div>
                        </div>
                        <div class="order-detail-timeline-item">
                            <div class="order-detail-timeline-dot completed">
                                <svg class="order-detail-timeline-icon text-white" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5"/><path d="M12 12v9"/></svg>
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
                                    <svg class="order-detail-timeline-icon text-white" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/></svg>
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
                    <button class="order-action-btn primary" onclick="orderManager.reorder('${escapeHtml(order.id)}')">
                        再次购买
                    </button>
                    ${order.invoiceUrl ? `
                        <button class="order-action-btn secondary" onclick="orderManager.downloadInvoice('${escapeHtml(order.id)}')">
                            下载发票
                        </button>
                    ` : ''}
                    ${order.status === 'delivered' ? `
                        <button class="order-action-btn outline" onclick="orderManager.requestReturn('${escapeHtml(order.id)}')">
                            申请退货
                        </button>
                    ` : ''}
                    ${order.status === 'pending' ? `
                        <button class="order-action-btn outline" onclick="orderManager.cancelOrder('${escapeHtml(order.id)}')">
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
                ${this.thumbImage(item.image, item.name, 'order-detail-item-image', '80px')}
                <div class="order-detail-item-info">
                    <h4 class="order-detail-item-name">${escapeHtml(item.name)}</h4>
                    <p class="order-detail-item-sku">SKU: ${escapeHtml(item.sku)}</p>
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
     * 将订单项映射为 cart.js CartManager.addToCart 的真实参数键
     * （productId/productSkuId/productName/productPrice/productQuantity/productPic，
     * 其中 productId、productSkuId、productName、productPrice 为必填校验项）。
     * cartManager 不存在或任一商品添加失败时明确报错，绝不假报成功。
     */
    async reorder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;
        
        const cartManager = window.cartManager;
        if (!cartManager || typeof cartManager.addToCart !== 'function') {
            this.showError('购物袋模块未就绪，添加失败，请稍后重试'); // 批五(19): 术语表口径"购物袋"
            return;
        }
        
        let addedCount = 0;
        let failedCount = 0;
        for (const item of order.items) {
            try {
                await cartManager.addToCart({
                    productId: item.productId || item.id,
                    productSkuId: item.sku || item.id || item.productId,
                    productName: item.name,
                    productPrice: item.price,
                    productQuantity: item.quantity || 1,
                    productPic: item.image
                });
                addedCount++;
            } catch (error) {
                console.error('再次购买：添加商品到购物车失败:', error);
                failedCount++;
            }
        }
        
        if (failedCount > 0) {
            // 有失败：不提示成功、不跳转（部分已加入的商品保留在购物袋中）
            this.showError(`添加到购物袋失败：成功 ${addedCount} 件，失败 ${failedCount} 件，请稍后重试`); // 批五(19): 术语表口径
            return;
        }
        
        // 显示成功消息
        this.showSuccess('商品已加入购物袋'); // 批五(19): ATC 动作词唯一——"加入购物袋"（弃"添加到购物车"）
        
        // 关闭模态框
        this.closeOrderDetailModal();
        
        // 跳转回首页（首页加载了 cart.js 可查看购物车；cart.html 页面不存在）
        setTimeout(() => {
            window.location.href = 'index.html';
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
        
        // 退货申请页面不存在（return-request.html），演示站明确告知功能未开通
        this.showSuccess(`退货申请功能即将上线，如需退货请联系客服（订单号 ${orderId}）`);
    }
    
    /**
     * 取消订单
     * 对齐 requestReturn 的既有写法：演示环境未开通后端取消接口，
     * 如实提示而非本地假改状态+假报成功（F9 诚实化）
     */
    cancelOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        this.showToast(`订单取消功能未开通，请联系客服（订单号 ${orderId}）`, 'info');
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
        if (this.elements.searchEmptyState) this.elements.searchEmptyState.classList.add('hidden');
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
        if (this.elements.searchEmptyState) this.elements.searchEmptyState.classList.add('hidden');
    }

    /**
     * 批四(11) 搜索无果独立空态：有订单、只是这个词没命中——
     * "没找到含'xxx'的订单"+一键清空，不再借"还没有订单"指责用户记忆
     */
    showSearchEmptyState() {
        const el = this.elements.searchEmptyState;
        if (el) {
            const term = this.elements.orderSearch ? this.elements.orderSearch.value.trim() : '';
            const q = el.querySelector('.search-empty-term');
            if (q) q.textContent = `「${term}」`;
            el.classList.remove('hidden');
        }
        this.elements.emptyState.classList.add('hidden');
        this.elements.ordersList.classList.add('hidden');
        this.elements.pagination.classList.add('hidden');
    }

    /**
     * 批四(11): 清空搜索词并复位列表（焦点回搜索框，便于换词再试）
     */
    clearSearch() {
        this.searchTerm = '';
        if (this.elements.orderSearch) this.elements.orderSearch.value = '';
        this.currentPage = 1;
        this.filterAndDisplayOrders();
        if (this.elements.orderSearch) this.elements.orderSearch.focus();
    }

    /**
     * 显示订单列表
     */
    showOrdersList() {
        this.elements.ordersList.classList.remove('hidden');
        this.elements.emptyState.classList.add('hidden');
        if (this.elements.searchEmptyState) this.elements.searchEmptyState.classList.add('hidden');
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
     * 显示提示消息（批一(5) toast 归一：原 Tailwind 三色顶右角私货退役，
     * 改调 shared/toast.js 纯通知语态——同语系同进出同位置，只保留文案。
     * type 形参保留仅为调用点兼容，归一后无色分语义）
     */
    showToast(message) {
        showToast({ message, confirmText: null, dismissText: null });
    }
    
    /**
     * 获取状态文本
     */
    getStatusText(status) {
        const statusMap = {
            'pending': '待付款',
            'processing': '进行中',
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
