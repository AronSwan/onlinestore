/**
 * 前端邮箱验证客户端
 * 用于在注册、登录等表单中实时验证邮箱
 */

class EmailVerificationClient {
    constructor(options = {}) {
        this.apiBaseUrl = options.apiBaseUrl || '/api/email';
        this.timeout = options.timeout || 10000;
        this.enableRealTimeValidation = options.enableRealTimeValidation !== false;
        this.debounceDelay = options.debounceDelay || 500;
        this.cache = new Map();
        this.cacheExpiry = options.cacheExpiry || 300000; // 5分钟
        
        // 绑定方法
        this.verify = this.verify.bind(this);
        this.verifyBatch = this.verifyBatch.bind(this);
        this.setupFormValidation = this.setupFormValidation.bind(this);
    }

    /**
     * 验证单个邮箱地址
     * @param {string} email - 邮箱地址
     * @returns {Promise<Object>} 验证结果
     */
    async verify(email) {
        try {
            // 基础检查
            if (!email || typeof email !== 'string') {
                throw new Error('Invalid email parameter');
            }

            email = email.trim().toLowerCase();

            // 检查缓存
            const cacheKey = email;
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiry) {
                    return cached.result;
                }
                this.cache.delete(cacheKey);
            }

            // 调用 API
            const response = await fetch(`${this.apiBaseUrl}/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
                signal: AbortSignal.timeout(this.timeout)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Verification failed');
            }

            // 缓存结果
            this.cache.set(cacheKey, {
                result: data.data,
                timestamp: Date.now()
            });

            return data.data;

        } catch (error) {
            console.error('Email verification error:', error);
            
            // 返回降级结果
            return {
                email,
                valid: this.isValidEmailSyntax(email),
                reason: error.message || 'Verification failed',
                fallback: true,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 批量验证邮箱地址
     * @param {string[]} emails - 邮箱地址数组
     * @returns {Promise<Object>} 批量验证结果
     */
    async verifyBatch(emails) {
        try {
            if (!Array.isArray(emails)) {
                throw new Error('Emails must be an array');
            }

            const response = await fetch(`${this.apiBaseUrl}/verify-batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ emails }),
                signal: AbortSignal.timeout(this.timeout * 2) // 批量验证允许更长时间
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Batch verification failed');
            }

            return data.data;

        } catch (error) {
            console.error('Batch email verification error:', error);
            throw error;
        }
    }

    /**
     * 为表单设置邮箱验证
     * @param {HTMLFormElement|string} form - 表单元素或选择器
     * @param {Object} options - 配置选项
     */
    setupFormValidation(form, options = {}) {
        const formElement = typeof form === 'string' ? document.querySelector(form) : form;
        
        if (!formElement) {
            console.error('Form element not found');
            return;
        }

        const emailInputs = formElement.querySelectorAll('input[type="email"]');
        
        emailInputs.forEach(input => {
            this.setupInputValidation(input, options);
        });
    }

    /**
     * 为单个输入框设置验证
     * @param {HTMLInputElement} input - 邮箱输入框
     * @param {Object} options - 配置选项
     */
    setupInputValidation(input, options = {}) {
        if (!input || input.type !== 'email') {
            console.error('Invalid email input element');
            return;
        }

        // 创建状态显示元素
        const statusElement = this.createStatusElement(input, options);
        
        // 防抖验证函数
        const debouncedVerify = this.debounce(async (email) => {
            if (!email || email.length < 3) {
                this.updateStatus(statusElement, null);
                return;
            }

            this.updateStatus(statusElement, { loading: true });
            
            try {
                const result = await this.verify(email);
                this.updateStatus(statusElement, result);
                
                // 触发自定义事件
                input.dispatchEvent(new CustomEvent('emailVerified', {
                    detail: result,
                    bubbles: true
                }));
                
            } catch (error) {
                this.updateStatus(statusElement, {
                    valid: false,
                    reason: 'Verification failed',
                    error: true
                });
            }
        }, this.debounceDelay);

        // 绑定事件
        input.addEventListener('input', (e) => {
            const email = e.target.value.trim();
            if (this.enableRealTimeValidation) {
                debouncedVerify(email);
            }
        });

        input.addEventListener('blur', (e) => {
            const email = e.target.value.trim();
            if (email && !this.enableRealTimeValidation) {
                debouncedVerify(email);
            }
        });
    }

    /**
     * 创建状态显示元素
     */
    createStatusElement(input, options) {
        const existingStatus = input.parentNode.querySelector('.email-verification-status');
        if (existingStatus) {
            return existingStatus;
        }

        const statusElement = document.createElement('div');
        statusElement.className = 'email-verification-status';
        statusElement.style.cssText = `
            margin-top: 4px;
            font-size: 12px;
            min-height: 16px;
            transition: all 0.3s ease;
        `;

        input.parentNode.insertBefore(statusElement, input.nextSibling);
        return statusElement;
    }

    /**
     * 更新状态显示
     */
    updateStatus(statusElement, result) {
        if (!result) {
            statusElement.innerHTML = '';
            statusElement.className = 'email-verification-status';
            return;
        }

        if (result.loading) {
            statusElement.innerHTML = '🔍 验证中...';
            statusElement.className = 'email-verification-status loading';
            statusElement.style.color = '#666';
            return;
        }

        if (result.valid) {
            statusElement.innerHTML = '✅ 邮箱地址有效';
            statusElement.className = 'email-verification-status valid';
            statusElement.style.color = '#28a745';
        } else {
            const reason = this.getDisplayReason(result.reason);
            statusElement.innerHTML = `❌ ${reason}`;
            statusElement.className = 'email-verification-status invalid';
            statusElement.style.color = '#dc3545';
        }

        // 显示详细信息（可选）
        if (result.details && result.details.suggestion) {
            const suggestion = document.createElement('div');
            suggestion.style.cssText = 'font-size: 11px; color: #007bff; margin-top: 2px;';
            suggestion.innerHTML = `💡 建议: ${result.details.suggestion}`;
            statusElement.appendChild(suggestion);
        }
    }

    /**
     * 获取用户友好的错误信息
     */
    getDisplayReason(reason) {
        const reasonMap = {
            'Invalid email syntax': '邮箱格式不正确',
            'Domain has no MX records': '域名无法接收邮件',
            'Disposable email addresses are not allowed': '不允许使用临时邮箱',
            'Role-based email addresses are not allowed': '不允许使用角色邮箱',
            'Email address is not deliverable': '邮箱地址无法投递',
            'Email address is undeliverable': '邮箱地址不可达'
        };

        return reasonMap[reason] || reason || '验证失败';
    }

    /**
     * 基础邮箱语法检查
     */
    isValidEmailSyntax(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= 254;
    }

    /**
     * 防抖函数
     */
    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * 清理缓存
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * 获取缓存统计
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxAge: this.cacheExpiry
        };
    }
}

// 全局实例
window.EmailVerificationClient = EmailVerificationClient;

// 自动初始化（如果页面有邮箱输入框）
document.addEventListener('DOMContentLoaded', () => {
    const emailInputs = document.querySelectorAll('input[type="email"]');
    if (emailInputs.length > 0) {
        const client = new EmailVerificationClient();
        emailInputs.forEach(input => {
            client.setupInputValidation(input);
        });
    }
});

// 导出（如果使用模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailVerificationClient;
}