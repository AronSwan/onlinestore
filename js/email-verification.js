/**
 * 邮箱验证功能
 */

class EmailVerification {
    constructor() {
        this.verificationTimer = null;
        this.resendCooldown = 60; // 60秒冷却时间
        this.init();
    }

    init() {
        this.handleVerificationLink();
        this.bindResendEvents();
    }

    handleVerificationLink() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('verify_token');
        const email = urlParams.get('email');

        if (token && email) {
            this.verifyEmail(token, email);
        }
    }

    async verifyEmail(token, email) {
        const loadingContainer = this.createVerificationLoading();
        document.body.appendChild(loadingContainer);

        try {
            const response = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, email })
            });

            const result = await response.json();

            if (response.ok) {
                this.showVerificationSuccess();
                setTimeout(() => {
                    window.location.href = '/login?verified=true';
                }, 3000);
            } else {
                this.showVerificationError(result.message);
            }
        } catch (error) {
            console.error('邮箱验证错误:', error);
            this.showVerificationError('网络错误，请稍后重试');
        } finally {
            loadingContainer.remove();
        }
    }

    createVerificationLoading() {
        const container = document.createElement('div');
        container.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        container.innerHTML = `
            <div class="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
                <div class="oauth-spinner mx-auto mb-4"></div>
                <h3 class="text-lg font-semibold mb-2">正在验证邮箱...</h3>
                <p class="text-gray-600">请稍候，我们正在验证您的邮箱地址</p>
            </div>
        `;
        return container;
    }

    showVerificationSuccess() {
        const container = document.createElement('div');
        container.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        container.innerHTML = `
            <div class="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
                <div class="text-green-500 text-5xl mb-4">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3 class="text-lg font-semibold mb-2 text-green-600">邮箱验证成功！</h3>
                <p class="text-gray-600 mb-4">您的邮箱已成功验证，即将跳转到登录页面</p>
                <div class="text-sm text-gray-500">3秒后自动跳转...</div>
            </div>
        `;
        document.body.appendChild(container);
    }

    showVerificationError(message) {
        const container = document.createElement('div');
        container.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        container.innerHTML = `
            <div class="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
                <div class="text-red-500 text-5xl mb-4">
                    <i class="fas fa-times-circle"></i>
                </div>
                <h3 class="text-lg font-semibold mb-2 text-red-600">验证失败</h3>
                <p class="text-gray-600 mb-4">${message}</p>
                <button onclick="window.location.href='/login'" 
                        class="btn-luxury btn-primary">
                    返回登录页面
                </button>
            </div>
        `;
        document.body.appendChild(container);
    }

    showEmailVerificationNotice(email) {
        const container = document.getElementById('register-form-container');
        if (!container) return;

        const notice = document.createElement('div');
        notice.className = 'email-verification-notice';
        notice.innerHTML = `
            <i class="fas fa-envelope"></i>
            <div>
                <p>验证邮件已发送到 <strong>${email}</strong></p>
                <p>请检查您的邮箱（包括垃圾邮件文件夹）并点击验证链接</p>
                <button type="button" id="resend-verification" 
                        class="text-blue-600 hover:underline mt-2" 
                        data-email="${email}">
                    重新发送验证邮件
                </button>
            </div>
        `;
        
        container.appendChild(notice);
        this.bindResendEvents();
    }

    bindResendEvents() {
        const resendBtn = document.getElementById('resend-verification');
        if (resendBtn) {
            resendBtn.addEventListener('click', this.handleResendVerification.bind(this));
        }
    }

    async handleResendVerification(event) {
        const button = event.target;
        const email = button.dataset.email;
        
        if (button.disabled) return;

        try {
            button.disabled = true;
            button.textContent = '发送中...';

            const response = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const result = await response.json();

            if (response.ok) {
                LoginUtils.showNotification('验证邮件已重新发送', 'success');
                this.startResendCooldown(button);
            } else {
                LoginUtils.showNotification(result.message || '发送失败，请稍后重试', 'error');
                button.disabled = false;
                button.textContent = '重新发送验证邮件';
            }
        } catch (error) {
            console.error('重发验证邮件错误:', error);
            LoginUtils.showNotification('网络错误，请稍后重试', 'error');
            button.disabled = false;
            button.textContent = '重新发送验证邮件';
        }
    }

    startResendCooldown(button) {
        let countdown = this.resendCooldown;
        
        const updateButton = () => {
            if (countdown > 0) {
                button.textContent = `${countdown}秒后可重新发送`;
                countdown--;
                setTimeout(updateButton, 1000);
            } else {
                button.disabled = false;
                button.textContent = '重新发送验证邮件';
            }
        };
        
        updateButton();
    }

    // 检查邮箱验证状态
    static async checkEmailVerificationStatus(email) {
        try {
            const response = await fetch(`/api/auth/check-verification-status?email=${encodeURIComponent(email)}`);
            const result = await response.json();
            return result.verified || false;
        } catch (error) {
            console.error('检查验证状态错误:', error);
            return false;
        }
    }
}

// 全局实例
window.EmailVerification = EmailVerification;