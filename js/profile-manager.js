// 用途：用户个人资料管理器，处理用户信息的加载、编辑、地址管理等功能
// 依赖文件：无（navigation-state-manager.js 已移出工作树，见 git 历史）
// 作者：系统开发团队
// 时间：2025-10-01 19:05:51

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.addresses = [];
        // 同源相对路径，与 auth.js 等其他模块的 fetch 写法保持一致
        this.baseUrl = '/api';
        // 注意：构造函数不再调用 init()——profile.html 在 DOMContentLoaded 中
        // 会显式调用 profileManager.init()，构造函数内再调一次会导致双跑
        // （重复绑定 submit、重复加载数据）
    }

    init() {
        // 国际挑剔用户批 A 档 12（PM 推荐案，2026-10-06）：未登录直访
        // profile.html#wishlist 走游客降级视图——本地 reich_wishlist 照常渲染
        // （可移除）+"登录可同步"提示条；其余区仍守卫（checkAuth 照旧跳登录页）
        if (!this.isLoggedIn() && window.location.hash === '#wishlist') {
            this.initGuestWishlist();
            return;
        }

        // 登录守卫：未登录时 checkAuth() 会跳转到登录页并返回 false，
        // 此处按其现有行为接入，跳转后不再继续加载/绑定
        if (!this.checkAuth()) {
            return;
        }

        // 确保DOM完全加载后再初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.loadUserData();
                this.bindEvents();
            });
        } else {
            // DOM已经加载完成
            this.loadUserData();
            this.bindEvents();
        }
    }

    /** 登录态判定（与 checkAuth 同源，抽公共只读版供 A 档 12 游客分流） */
    isLoggedIn() {
        if (window.Auth && window.Auth.isLoggedIn()) {
            return true;
        }
        return localStorage.getItem('userLoggedIn') === 'true' ||
               sessionStorage.getItem('userLoggedIn') === 'true';
    }

    /**
     * A 档 12 · 心愿单游客降级视图：心愿单是浏览器本地资产（localStorage
     * reich_wishlist），游客本就可看可移除——未登录不再整页踢去登录页。
     * 与隐私页"购物数据存在浏览器本地存储"声明自洽；其余区（账户数据）
     * 由页内菜单守卫继续跳登录（见 profile.html 内联脚本）。
     */
    initGuestWishlist() {
        // 只亮心愿单区（默认激活的 basic-info 属账户数据，游客不渲染）
        document.querySelectorAll('.profile-section').forEach(s => s.classList.remove('active'));
        const wishSection = document.getElementById('wishlist');
        if (wishSection) wishSection.classList.add('active');

        // 侧边栏当前项标心头好
        document.querySelectorAll('.profile-menu a').forEach(l => {
            l.classList.toggle('active', l.getAttribute('href') === '#wishlist');
        });

        // "登录可同步"提示条（幂等）
        if (wishSection && !document.getElementById('guest-wishlist-note')) {
            const note = document.createElement('p');
            note.id = 'guest-wishlist-note';
            note.className = 'guest-wishlist-note';
            note.innerHTML = '心头好先记在这台浏览器上——<a href="login.html?returnUrl=' +
                encodeURIComponent('/profile.html#wishlist') + '">登录可同步</a>到你的账户。';
            wishSection.insertBefore(note, document.getElementById('wishlist-list'));
        }

        // 本地心愿单渲染（复用登录态同一渲染管线：列表+可移除）
        this.renderWishlist();
    }

    checkAuth() {
        // 检查认证状态
        if (window.Auth && window.Auth.isLoggedIn()) {
            return true;
        }

        // 检查本地存储
        const userLoggedIn = localStorage.getItem('userLoggedIn') === 'true' || 
                           sessionStorage.getItem('userLoggedIn') === 'true';
        
        if (!userLoggedIn) {
            // 批一(2) 大师会诊 IA 席裁决（2026-10-06）：回跳参数统一 returnUrl，
            // 值为相对路径+锚编码（/profile.html%23wishlist）——原 redirect=绝对URL
            // 与 auth.js 读的 returnUrl 参数名双重断裂（登录后回不到来处）。
            // auth.js isSafeReturnUrl 白名单：单 / 开头、非 //、首段无冒号——
            // /profile.html#wishlist 编码后合法；URLSearchParams 解码还原 #wishlist。
            window.location.href = 'login.html?returnUrl=' + encodeURIComponent('/profile.html#wishlist');
            return false;
        }

        return true;
    }

    async loadUserData() {
        try {
            // 获取当前用户信息
            await this.getCurrentUser();
            
            // 加载收货地址
            await this.loadAddresses();
            
            // 更新UI
            this.updateUserInfo();
            this.renderAddresses();
        } catch (error) {
            console.error('加载用户数据失败:', error);
            this.showNotification('加载用户数据失败，请刷新页面重试', 'error');
        }
    }

    async getCurrentUser() {
        try {
            // 尝试从后端API获取用户信息
            const response = await fetch(`${this.baseUrl}/users/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.getAccessToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                this.currentUser = userData;
                return userData;
            } else {
                // 如果后端API不可用，使用本地存储的数据
                this.loadUserFromStorage();
            }
        } catch (error) {
            console.warn('后端API不可用，使用本地存储数据:', error);
            this.loadUserFromStorage();
        }
    }

    loadUserFromStorage() {
        // 从本地存储加载用户信息
        const userData = localStorage.getItem('user_info') || 
                        sessionStorage.getItem('user_info');
        
        if (userData) {
            this.currentUser = JSON.parse(userData);
        } else {
            // 如果没有用户信息，重定向到登录页
            window.location.href = 'login.html';
        }
    }

    async loadAddresses() {
        try {
            const response = await fetch(`${this.baseUrl}/users/addresses`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.getAccessToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.addresses = data.addresses || [];
            } else {
                // 如果后端API不可用，使用示例数据
                this.addresses = this.getSampleAddresses();
            }
        } catch (error) {
            console.warn('加载地址失败，使用示例数据:', error);
            this.addresses = this.getSampleAddresses();
        }
    }

    getSampleAddresses() {
        return [
            {
                id: 1,
                name: '张三',
                phone: '13800138000',
                province: '北京市',
                city: '北京市',
                detail: '朝阳区建国路88号',
                postalCode: '100020',
                isDefault: true
            },
            {
                id: 2,
                name: '李四',
                phone: '13900139000',
                province: '上海市',
                city: '上海市',
                detail: '浦东新区陆家嘴金融中心',
                postalCode: '200120',
                isDefault: false
            }
        ];
    }

    updateUserInfo() {
        if (!this.currentUser) return;

        // 更新基本信息表单
        const form = document.getElementById('basic-info-form');
        if (form) {
            // 检查表单字段是否存在
            if (form.username) form.username.value = this.currentUser.username || this.currentUser.name || '';
            if (form.email) form.email.value = this.currentUser.email || '';
            if (form.phone) form.phone.value = this.currentUser.phone || '';
            if (form.nickname) form.nickname.value = this.currentUser.nickname || '';
            if (form.birthday) form.birthday.value = this.currentUser.birthday || '';
            if (form.gender) form.gender.value = this.currentUser.gender || '';
        }

        // 更新偏好设置
        const prefsForm = document.getElementById('preferences-form');
        if (prefsForm) {
            if (prefsForm.language) prefsForm.language.value = this.currentUser.language || 'zh-CN';
            if (prefsForm.currency) prefsForm.currency.value = this.currentUser.currency || 'CNY';
            if (prefsForm.newsletter) prefsForm.newsletter.checked = this.currentUser.newsletter || false;
            if (prefsForm['sms-notifications']) prefsForm['sms-notifications'].checked = this.currentUser.smsNotifications || false;
        }
    }

    renderAddresses() {
        const container = document.getElementById('addresses-list');
        if (!container) {
            console.warn('Addresses list container not found');
            return;
        }

        if (this.addresses.length === 0) {
            container.innerHTML = '<p class="no-addresses">还没有收货地址——先加一个？</p>';
            return;
        }

        // F7 渲染层转义：地址数据（后端/示例数据）插值统一包 escapeHtml()
        // （js/utils/escape-html.js 由 profile.html 在本文件之前加载）
        container.innerHTML = this.addresses.map(address => `
            <div class="address-card ${address.isDefault ? 'default' : ''}" data-id="${escapeHtml(address.id)}">
                <div class="address-header">
                    <h4>${escapeHtml(address.name)} ${escapeHtml(address.phone)}</h4>
                    ${address.isDefault ? '<span class="default-badge">默认</span>' : ''}
                </div>
                <div class="address-content">
                    <p>${escapeHtml(address.province)} ${escapeHtml(address.city)} ${escapeHtml(address.detail)}</p>
                    <p>邮编: ${escapeHtml(address.postalCode)}</p>
                </div>
                <div class="address-actions">
                    ${!address.isDefault ? '<button class="btn-secondary set-default-btn">设为默认</button>' : ''}
                    <button class="btn-secondary edit-address-btn">编辑</button>
                    <button class="btn-danger delete-address-btn">删除</button>
                </div>
            </div>
        `).join('');

        // 绑定地址操作事件
        this.bindAddressEvents();
    }

    /**
     * M6·B4 · 渲染"我的心头好"区块（localStorage reich_wishlist → 可移除列表）。
     * 与 wishlist.js 同一存储键；渲染插值统一 escapeHtml（心愿单 name 来自卡片 DOM
     * textContent，本站内容，仍按不可信处理——F7 渲染层转义纪律）。
     * 空态文案过 voice-sheet：俏皮但不尖叫（上海席："空态是全店性价比最高的可爱位"）。
     */
    renderWishlist() {
        const container = document.getElementById('wishlist-list');
        if (!container) {
            return;
        }

        let items = [];
        try {
            items = JSON.parse(localStorage.getItem('reich_wishlist')) || [];
        } catch (e) {
            console.warn('心头好数据读取失败，按空处理', e);
            items = [];
        }

        if (items.length === 0) {
            container.innerHTML = '<p class="no-wishlist">还没记下心头好——逛到喜欢的，点一下卡片上的小心形就好。</p>';
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="wishlist-item" data-id="${escapeHtml(String(item.id))}">
                <img src="${escapeHtml(String(item.image))}" alt="${escapeHtml(String(item.name))}" class="wishlist-item-image" loading="lazy">
                <div class="wishlist-item-info">
                    <h4>${escapeHtml(String(item.name))}</h4>
                    <p>${escapeHtml(String(item.price))}</p>
                </div>
                <button type="button" class="btn-secondary wishlist-remove-btn" data-id="${escapeHtml(String(item.id))}">不心动了</button>
            </div>
        `).join('');

        // 可移除：本地即时更新（心愿单是本地资产，无后端往返）
        container.querySelectorAll('.wishlist-remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                let remaining = [];
                try {
                    remaining = (JSON.parse(localStorage.getItem('reich_wishlist')) || []).filter(i => String(i.id) !== id);
                } catch (e) {
                    remaining = [];
                }
                localStorage.setItem('reich_wishlist', JSON.stringify(remaining));
                this.renderWishlist();
            });
        });
    }

    /** M6·B4 · 深链激活：profile.html#wishlist 直达心头好区块（头部心形/toast 的落点） */
    activateSectionFromHash() {
        const hash = window.location.hash;
        if (!hash || hash === '#') return;
        const link = document.querySelector(`.profile-menu a[href="${hash}"]`);
        if (!link) return;
        this.switchSection(hash);
        document.querySelectorAll('.profile-menu a').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
    }

    bindEvents() {
        // 基本信息表单提交
        const basicInfoForm = document.getElementById('basic-info-form');
        if (basicInfoForm) {
            basicInfoForm.addEventListener('submit', (e) => this.handleBasicInfoSubmit(e));
        }

        // 偏好设置表单提交
        const prefsForm = document.getElementById('preferences-form');
        if (prefsForm) {
            prefsForm.addEventListener('submit', (e) => this.handlePreferencesSubmit(e));
        }

        // 地址管理相关事件
        this.bindAddressModalEvents();
        
        // 密码修改相关事件
        this.bindPasswordModalEvents();

        // 权益批 B10（隐私 P1② 被遗忘权）：注销账号入口——两步确认 armed 模式
        // （与购物袋"清空袋子"同款：第一步亮"再点一次确认"，3s 还原；不用原生 confirm）
        this.bindAccountDeletion();

        // 侧边栏导航事件
        this.bindSidebarEvents();

        // M6·B4: 心头好区块渲染 + 深链激活（头部心形 → profile.html#wishlist）
        this.renderWishlist();
        this.activateSectionFromHash();
    }

    bindSidebarEvents() {
        const sidebarLinks = document.querySelectorAll('.profile-menu a');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.target.getAttribute('href');
                this.switchSection(target);
                
                // 更新活动状态
                sidebarLinks.forEach(l => l.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }

    switchSection(target) {
        const sections = document.querySelectorAll('.profile-section');
        sections.forEach(section => section.classList.remove('active'));
        
        const targetSection = document.querySelector(target);
        if (targetSection) {
            targetSection.classList.add('active');
        }
    }

    bindAddressModalEvents() {
        const modal = document.getElementById('address-modal');
        const addBtn = document.getElementById('add-address-btn');
        const closeBtn = modal?.querySelector('.close');
        const cancelBtn = document.getElementById('cancel-address');
        const form = document.getElementById('address-form');

        if (addBtn) {
            addBtn.addEventListener('click', () => this.openAddressModal());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeAddressModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeAddressModal());
        }

        if (form) {
            form.addEventListener('submit', (e) => this.handleAddressSubmit(e));
        }

        // 点击模态框外部关闭
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAddressModal();
                }
            });
        } else {
            console.warn('Address modal elements not found - some functionality may be limited');
        }
    }

    /**
     * 权益批 B10（隐私 P1② 被遗忘权）：注销账号——两步确认（armed 模式，对齐
     * 购物袋"清空袋子"：第一步亮"再点一次确认注销"3s 还原，第二步真调
     * DELETE /api/users/me）。成功后清空本地登录态回首页；失败诚实提示。
     */
    bindAccountDeletion() {
        const btn = document.getElementById('delete-account-btn');
        if (!btn) return;
        this.deleteArmed = false;
        this.deleteTimer = null;

        const disarm = () => {
            clearTimeout(this.deleteTimer);
            this.deleteTimer = null;
            this.deleteArmed = false;
            btn.textContent = '注销账号';
            btn.classList.remove('armed');
            btn.setAttribute('aria-label', '注销账号');
        };

        btn.addEventListener('click', async () => {
            if (!this.deleteArmed) {
                // 第一步：亮确认态并起 3s 还原计时
                this.deleteArmed = true;
                btn.textContent = '再点一次确认注销';
                btn.classList.add('armed');
                btn.setAttribute('aria-label', '再点一次确认注销账号（3 秒内有效）');
                clearTimeout(this.deleteTimer);
                this.deleteTimer = setTimeout(disarm, 3000);
                return;
            }
            disarm();
            btn.disabled = true;
            btn.textContent = '注销中...';
            try {
                const response = await fetch(`${this.baseUrl}/users/me`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.getAccessToken()}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.message || `注销失败（${response.status}）`);
                }
                // 成功：清空本地登录态（五键，与登录写入清单对齐）+ 本地资产提示后离场
                ['userLoggedIn', 'userEmail', 'token', 'refreshToken', 'userId'].forEach((k) => {
                    localStorage.removeItem(k);
                    sessionStorage.removeItem(k);
                });
                this.showNotification('账号已注销，浏览器的购物袋与心头好缓存请自行清除（见隐私政策"怎么删"）', 'info');
                setTimeout(() => { window.location.href = 'index.html'; }, 1800);
            } catch (error) {
                console.error('注销账号失败:', error);
                btn.disabled = false;
                disarm();
                this.showNotification(`注销未完成：${error.message || '请稍后重试'}`, 'error');
            }
        });
    }

    bindPasswordModalEvents() {        const modal = document.getElementById('password-modal');
        const changeBtn = document.getElementById('change-password-btn');
        const closeBtn = modal?.querySelector('.close');
        const cancelBtn = document.getElementById('cancel-password');
        const form = document.getElementById('password-form');

        if (changeBtn) {
            changeBtn.addEventListener('click', () => this.openPasswordModal());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closePasswordModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closePasswordModal());
        }

        if (form) {
            form.addEventListener('submit', (e) => this.handlePasswordSubmit(e));
        }

        // 点击模态框外部关闭
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closePasswordModal();
                }
            });
        } else {
            console.warn('Password modal elements not found - some functionality may be limited');
        }
    }

    bindAddressEvents() {
        // 绑定地址相关按钮事件，包含空值检查防止TypeError
        // 设为默认地址按钮事件
        const setDefaultButtons = document.querySelectorAll('.set-default-btn');
        setDefaultButtons.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', (e) => {
                    const card = e.target.closest('.address-card');
                    if (card && card.dataset.id) {
                        const addressId = card.dataset.id;
                        this.setDefaultAddress(addressId);
                    }
                });
            }
        });

        // 编辑地址按钮事件
        const editButtons = document.querySelectorAll('.edit-address-btn');
        editButtons.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', (e) => {
                    const card = e.target.closest('.address-card');
                    if (card && card.dataset.id) {
                        const addressId = card.dataset.id;
                        this.editAddress(addressId);
                    }
                });
            }
        });

        // 删除地址按钮事件
        const deleteButtons = document.querySelectorAll('.delete-address-btn');
        deleteButtons.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', (e) => {
                    const card = e.target.closest('.address-card');
                    if (card && card.dataset.id) {
                        const addressId = card.dataset.id;
                        this.deleteAddress(addressId);
                    }
                });
            }
        });
    }

    async handleBasicInfoSubmit(e) {
        e.preventDefault();

        // F5-min 诚实 UI：PUT /api/users/profile 在演示环境未开通（404），
        // 在提交入口直接提示并返回，不再发起注定失败的请求
        this.showNotification('演示环境未开通：基本信息保存功能暂不可用', 'info');
    }

    async handlePreferencesSubmit(e) {
        e.preventDefault();

        // F5-min 诚实 UI：PUT /api/users/preferences 在演示环境未开通（404），
        // 在提交入口直接提示并返回，不再发起注定失败的请求
        this.showNotification('演示环境未开通：偏好设置保存功能暂不可用', 'info');
    }

    openAddressModal(address = null) {
        const modal = document.getElementById('address-modal');
        const title = document.getElementById('address-modal-title');
        const form = document.getElementById('address-form');
        
        if (!modal || !title || !form) {
            return;
        }
        
        if (address) {
            // 编辑模式
            title.textContent = '编辑收货地址';
            form['id'].value = address.id;
            form['name'].value = address.name;
            form['phone'].value = address.phone;
            form['province'].value = address.province;
            form['city'].value = address.city;
            form['detail'].value = address.detail;
            form['postalCode'].value = address.postalCode;
            form['isDefault'].checked = address.isDefault;
        } else {
            // 添加模式
            title.textContent = '添加收货地址';
            form.reset();
        }
        
        modal.style.display = 'block';
    }

    closeAddressModal() {
        const modal = document.getElementById('address-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    openPasswordModal() {
        const modal = document.getElementById('password-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    closePasswordModal() {
        const modal = document.getElementById('password-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        const form = document.getElementById('password-form');
        if (form) {
            form.reset();
        }
    }

    async handleAddressSubmit(e) {
        e.preventDefault();

        // F5-min 诚实 UI：POST/PUT /api/users/addresses* 在演示环境未开通（404），
        // 地址新增/编辑在提交入口直接提示并返回，不再发起注定失败的请求
        this.showNotification('演示环境未开通：地址保存功能暂不可用', 'info');
        this.closeAddressModal();
    }

    async handlePasswordSubmit(e) {
        e.preventDefault();

        // F5-min 诚实 UI：POST /api/users/change-password 在演示环境未开通（404），
        // 改密码在提交入口直接提示并返回，不再发起注定失败的请求
        this.showNotification('演示环境未开通：密码修改功能暂不可用', 'info');
        this.closePasswordModal();
    }

    async setDefaultAddress(addressId) {
        // F5-min 诚实 UI：PUT /api/users/addresses/{id}/default 在演示环境未开通（404），
        // 直接提示并返回，不再发起注定失败的请求
        void addressId;
        this.showNotification('演示环境未开通：默认地址设置功能暂不可用', 'info');
    }

    editAddress(addressId) {
        const address = this.addresses.find(addr => addr.id == addressId);
        if (address) {
            this.openAddressModal(address);
        }
    }

    async deleteAddress(addressId) {
        // F5-min 诚实 UI：DELETE /api/users/addresses/{id} 在演示环境未开通（404），
        // 在删除入口直接提示并返回（不发 confirm，也不发起注定失败的请求）
        void addressId;
        this.showNotification('演示环境未开通：地址删除功能暂不可用', 'info');
    }

    getAccessToken() {
        // auth.js 登录成功后写入的键名是 'token'（rememberMe 时在 localStorage，否则 sessionStorage）；
        // 'access_token' 作为旧键名兜底保留
        return localStorage.getItem('token') || sessionStorage.getItem('token') ||
               localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    }

    saveUserToStorage() {
        if (this.currentUser) {
            localStorage.setItem('user_info', JSON.stringify(this.currentUser));
        }
    }

    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// 导出类，供其他模块使用
window.ProfileManager = ProfileManager;