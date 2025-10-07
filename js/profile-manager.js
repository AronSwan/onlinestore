// 用途：用户个人资料管理器，处理用户信息的加载、编辑、地址管理等功能
// 依赖文件：navigation-state-manager.js (通过window.navStateManager使用)
// 作者：系统开发团队
// 时间：2025-10-01 19:05:51

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.addresses = [];
        this.baseUrl = 'http://localhost:3000/api';
        this.init();
    }

    init() {
        // 确保DOM完全加载后再初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.loadUserInfo();
                this.bindEvents();
            });
        } else {
            // DOM已经加载完成
            this.loadUserInfo();
            this.bindEvents();
        }
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
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
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
            container.innerHTML = '<p class="no-addresses">暂无收货地址，请添加您的收货地址。</p>';
            return;
        }

        container.innerHTML = this.addresses.map(address => `
            <div class="address-card ${address.isDefault ? 'default' : ''}" data-id="${address.id}">
                <div class="address-header">
                    <h4>${address.name} ${address.phone}</h4>
                    ${address.isDefault ? '<span class="default-badge">默认</span>' : ''}
                </div>
                <div class="address-content">
                    <p>${address.province} ${address.city} ${address.detail}</p>
                    <p>邮编: ${address.postalCode}</p>
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

        // 侧边栏导航事件
        this.bindSidebarEvents();
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

    bindPasswordModalEvents() {
        const modal = document.getElementById('password-modal');
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
        
        const formData = new FormData(e.target);
        const data = {
            phone: formData.get('phone'),
            nickname: formData.get('nickname'),
            birthday: formData.get('birthday'),
            gender: formData.get('gender')
        };

        try {
            const response = await fetch(`${this.baseUrl}/users/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.getAccessToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showNotification('基本信息更新成功', 'success');
                // 更新本地用户数据
                Object.assign(this.currentUser, data);
                this.saveUserToStorage();
            } else {
                throw new Error('更新失败');
            }
        } catch (error) {
            console.error('更新基本信息失败:', error);
            this.showNotification('更新失败，请稍后重试', 'error');
        }
    }

    async handlePreferencesSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            language: formData.get('language'),
            currency: formData.get('currency'),
            newsletter: formData.get('newsletter') === 'on',
            smsNotifications: formData.get('sms-notifications') === 'on'
        };

        try {
            const response = await fetch(`${this.baseUrl}/users/preferences`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.getAccessToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showNotification('偏好设置更新成功', 'success');
                // 更新本地用户数据
                Object.assign(this.currentUser, data);
                this.saveUserToStorage();
            } else {
                throw new Error('更新失败');
            }
        } catch (error) {
            console.error('更新偏好设置失败:', error);
            this.showNotification('更新失败，请稍后重试', 'error');
        }
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
        
        const formData = new FormData(e.target);
        const addressData = {
            id: formData.get('id'),
            name: formData.get('name'),
            phone: formData.get('phone'),
            province: formData.get('province'),
            city: formData.get('city'),
            detail: formData.get('detail'),
            postalCode: formData.get('postalCode'),
            isDefault: formData.get('isDefault') === 'on'
        };

        try {
            let response;
            if (addressData.id) {
                // 更新地址
                response = await fetch(`${this.baseUrl}/users/addresses/${addressData.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${this.getAccessToken()}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(addressData)
                });
            } else {
                // 添加新地址
                response = await fetch(`${this.baseUrl}/users/addresses`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.getAccessToken()}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(addressData)
                });
            }

            if (response.ok) {
                this.showNotification(addressData.id ? '地址更新成功' : '地址添加成功', 'success');
                this.closeAddressModal();
                // 重新加载地址列表
                await this.loadAddresses();
                this.renderAddresses();
            } else {
                throw new Error('操作失败');
            }
        } catch (error) {
            console.error('地址操作失败:', error);
            this.showNotification('操作失败，请稍后重试', 'error');
        }
    }

    async handlePasswordSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        // 验证新密码
        if (newPassword !== confirmPassword) {
            this.showNotification('两次输入的新密码不一致', 'error');
            return;
        }

        if (newPassword.length < 6) {
            this.showNotification('新密码长度不能少于6位', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/users/change-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getAccessToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            if (response.ok) {
                this.showNotification('密码修改成功', 'success');
                this.closePasswordModal();
            } else {
                throw new Error('密码修改失败');
            }
        } catch (error) {
            console.error('密码修改失败:', error);
            this.showNotification('密码修改失败，请检查当前密码是否正确', 'error');
        }
    }

    async setDefaultAddress(addressId) {
        try {
            const response = await fetch(`${this.baseUrl}/users/addresses/${addressId}/default`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.getAccessToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.showNotification('已设为默认地址', 'success');
                // 重新加载地址列表
                await this.loadAddresses();
                this.renderAddresses();
            } else {
                throw new Error('设置失败');
            }
        } catch (error) {
            console.error('设置默认地址失败:', error);
            this.showNotification('设置失败，请稍后重试', 'error');
        }
    }

    editAddress(addressId) {
        const address = this.addresses.find(addr => addr.id == addressId);
        if (address) {
            this.openAddressModal(address);
        }
    }

    async deleteAddress(addressId) {
        if (!confirm('确定要删除这个地址吗？')) {
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/users/addresses/${addressId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.getAccessToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.showNotification('地址删除成功', 'success');
                // 重新加载地址列表
                await this.loadAddresses();
                this.renderAddresses();
            } else {
                throw new Error('删除失败');
            }
        } catch (error) {
            console.error('删除地址失败:', error);
            this.showNotification('删除失败，请稍后重试', 'error');
        }
    }

    getAccessToken() {
        return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
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