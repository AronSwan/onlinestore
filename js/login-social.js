/**
 * Social Login Extensions
 * 社交登录扩展功能
 */

Object.assign(LoginEnhanced.prototype, {
    
    // 社交登录初始化
    initSocialLogin() {
        this.initGoogleLogin();
        this.initWeChatLogin();
        this.initGitHubLogin();
    },

    initGoogleLogin() {
        const googleBtn = document.getElementById('google-login-btn');
        if (googleBtn) {
            googleBtn.addEventListener('click', () => this.handleGoogleLogin());
        }
    },

    initWeChatLogin() {
        const wechatBtn = document.getElementById('wechat-login-btn');
        if (wechatBtn) {
            wechatBtn.addEventListener('click', () => this.handleWeChatLogin());
        }
    },

    initGitHubLogin() {
        const githubBtn = document.getElementById('github-login-btn');
        if (githubBtn) {
            githubBtn.addEventListener('click', () => this.handleGitHubLogin());
        }
    },

    async handleGoogleLogin() {
        try {
            this.notification.show('正在跳转到Google登录...', 'info');
            
            const response = await fetch(`${this.config.apiBaseUrl}/auth/google/url`, {
                method: 'GET',
                headers: {
                    'X-CSRF-TOKEN': this.state.csrfToken,
                },
                credentials: 'same-origin',
            });
            
            if (response.ok) {
                const data = await response.json();
                window.location.href = data.url;
            } else {
                throw new Error('获取Google登录URL失败');
            }
        } catch (error) {
            console.error('Google login error:', error);
            this.notification.show('Google登录失败，请重试', 'error');
        }
    },

    async handleWeChatLogin() {
        try {
            this.notification.show('正在生成微信登录二维码...', 'info');
            
            const response = await fetch(`${this.config.apiBaseUrl}/auth/wechat/qr`, {
                method: 'GET',
                headers: {
                    'X-CSRF-TOKEN': this.state.csrfToken,
                },
                credentials: 'same-origin',
            });
            
            if (response.ok) {
                const data = await response.json();
                this.showWeChatQR(data.qrCode, data.ticket);
            } else {
                throw new Error('获取微信登录二维码失败');
            }
        } catch (error) {
            console.error('WeChat login error:', error);
            this.notification.show('微信登录失败，请重试', 'error');
        }
    },

    async handleGitHubLogin() {
        try {
            this.notification.show('正在跳转到GitHub登录...', 'info');
            
            const response = await fetch(`${this.config.apiBaseUrl}/auth/github/url`, {
                method: 'GET',
                headers: {
                    'X-CSRF-TOKEN': this.state.csrfToken,
                },
                credentials: 'same-origin',
            });
            
            if (response.ok) {
                const data = await response.json();
                window.location.href = data.url;
            } else {
                throw new Error('获取GitHub登录URL失败');
            }
        } catch (error) {
            console.error('GitHub login error:', error);
            this.notification.show('GitHub登录失败，请重试', 'error');
        }
    },

    showWeChatQR(qrCode, ticket) {
        // 创建模态框显示二维码
        const modal = document.createElement('div');
        modal.className = 'wechat-qr-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div class="wechat-qr-content" style="
                background: white;
                padding: 30px;
                border-radius: 12px;
                text-align: center;
                max-width: 400px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            ">
                <h3 style="margin-bottom: 20px; color: #333;">微信扫码登录</h3>
                <div style="margin-bottom: 20px;">
                    <img src="${qrCode}" alt="微信登录二维码" style="width: 200px; height: 200px;">
                </div>
                <p style="color: #666; margin-bottom: 20px;">请使用微信扫描二维码登录</p>
                <button class="btn btn-secondary" onclick="this.closest('.wechat-qr-modal').remove()">
                    取消
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 轮询检查登录状态
        this.pollWeChatLogin(ticket, modal);
    },

    async pollWeChatLogin(ticket, modal) {
        const maxAttempts = 60; // 最多轮询60次（5分钟）
        let attempts = 0;
        
        const poll = async () => {
            if (attempts >= maxAttempts) {
                modal.remove();
                this.notification.show('微信登录超时，请重试', 'warning');
                return;
            }
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/auth/wechat/check`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': this.state.csrfToken,
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ ticket }),
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        modal.remove();
                        this.handleLoginSuccess(data);
                        return;
                    }
                }
                
                attempts++;
                setTimeout(poll, 5000); // 每5秒检查一次
            } catch (error) {
                console.error('WeChat login poll error:', error);
                attempts++;
                setTimeout(poll, 5000);
            }
        };
        
        poll();
    },

    // 键盘快捷键处理
    handleKeyboardShortcuts(event) {
        // Ctrl+Enter 提交表单
        if (event.ctrlKey && event.key === 'Enter') {
            event.preventDefault();
            const activeForm = this.state.currentForm === 'login' ? 
                document.getElementById('login-form') : 
                document.getElementById('register-form');
            
            if (activeForm) {
                const submitButton = activeForm.querySelector('button[type="submit"]');
                if (submitButton && !submitButton.disabled) {
                    submitButton.click();
                }
            }
        }
        
        // Escape 关闭模态框
        if (event.key === 'Escape') {
            const modal = document.querySelector('.wechat-qr-modal');
            if (modal) {
                modal.remove();
            }
        }
        
        // Tab 键在表单间切换
        if (event.key === 'Tab' && event.altKey) {
            event.preventDefault();
            const currentForm = this.state.currentForm;
            this.switchForm(currentForm === 'login' ? 'register' : 'login');
        }
    }
});