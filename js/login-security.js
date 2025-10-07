/**
 * Login Security Extensions
 * 登录安全扩展功能
 */

Object.assign(LoginEnhanced.prototype, {
    
    // 账户锁定相关方法
    checkLockoutStatus() {
        const lastFailedLogin = this.state.lastFailedLogin;
        const now = Date.now();
        
        if (this.state.loginAttempts >= this.config.maxLoginAttempts) {
            if (now - lastFailedLogin < this.config.lockoutDuration) {
                this.state.isLocked = true;
                const remainingTime = Math.ceil((this.config.lockoutDuration - (now - lastFailedLogin)) / 1000 / 60);
                this.showSecurityNotice(`账户已锁定，请在 ${remainingTime} 分钟后重试`);
                
                setTimeout(() => {
                    this.unlockAccount();
                }, this.config.lockoutDuration - (now - lastFailedLogin));
            } else {
                this.unlockAccount();
            }
        }
    },

    lockAccount() {
        this.state.isLocked = true;
        this.showSecurityNotice('登录失败次数过多，账户已锁定15分钟');
        
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            const inputs = loginForm.querySelectorAll('input, button');
            inputs.forEach(input => input.disabled = true);
        }
        
        setTimeout(() => {
            this.unlockAccount();
        }, this.config.lockoutDuration);
    },

    unlockAccount() {
        this.state.isLocked = false;
        this.state.loginAttempts = 0;
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('lastFailedLogin');
        
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            const inputs = loginForm.querySelectorAll('input, button');
            inputs.forEach(input => input.disabled = false);
        }
        
        this.hideSecurityNotice();
        this.notification.show('账户已解锁', 'success');
    },

    showSecurityNotice(message) {
        let notice = document.getElementById('security-notice');
        if (!notice) {
            notice = document.createElement('div');
            notice.id = 'security-notice';
            notice.className = 'alert alert-warning security-notice';
            notice.style.cssText = `
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9999;
                max-width: 500px;
                padding: 16px 20px;
                background: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 8px;
                color: #92400e;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                gap: 12px;
            `;
            document.body.appendChild(notice);
        }
        
        notice.innerHTML = `
            <i class="fas fa-shield-alt" style="color: #f59e0b;"></i>
            <span>${message}</span>
        `;
        notice.style.display = 'flex';
    },

    hideSecurityNotice() {
        const notice = document.getElementById('security-notice');
        if (notice) {
            notice.style.display = 'none';
        }
    },

    // 验证码相关方法
    showCaptcha() {
        const captchaContainer = document.getElementById('captcha-container');
        if (captchaContainer) {
            captchaContainer.style.display = 'block';
            this.generateCaptcha();
        }
    },

    hideCaptcha() {
        const captchaContainer = document.getElementById('captcha-container');
        if (captchaContainer) {
            captchaContainer.style.display = 'none';
        }
    },

    generateCaptcha() {
        const canvas = document.getElementById('captcha-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const captchaText = this.generateCaptchaText();
        
        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 设置背景
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 添加干扰线
        for (let i = 0; i < 5; i++) {
            ctx.strokeStyle = this.getRandomColor();
            ctx.beginPath();
            ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.stroke();
        }
        
        // 绘制验证码文字
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for (let i = 0; i < captchaText.length; i++) {
            ctx.fillStyle = this.getRandomColor();
            ctx.save();
            ctx.translate(30 + i * 25, canvas.height / 2);
            ctx.rotate((Math.random() - 0.5) * 0.5);
            ctx.fillText(captchaText[i], 0, 0);
            ctx.restore();
        }
        
        // 添加干扰点
        for (let i = 0; i < 50; i++) {
            ctx.fillStyle = this.getRandomColor();
            ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
        }
        
        // 保存验证码答案
        this.captchaAnswer = captchaText;
    },

    generateCaptchaText() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 4; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    getRandomColor() {
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#34495e'];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    refreshCaptcha() {
        if (this.state.loginAttempts >= this.config.captchaThreshold) {
            this.generateCaptcha();
        }
    },

    // 按钮状态管理
    setButtonLoading(button, isLoading) {
        if (!button) return;
        
        if (isLoading) {
            button.classList.add('btn-loading');
            button.disabled = true;
            button.setAttribute('aria-busy', 'true');
            
            const originalText = button.textContent;
            button.dataset.originalText = originalText;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';
        } else {
            button.classList.remove('btn-loading');
            button.disabled = false;
            button.removeAttribute('aria-busy');
            
            const originalText = button.dataset.originalText;
            if (originalText) {
                button.textContent = originalText;
            }
        }
    }
});