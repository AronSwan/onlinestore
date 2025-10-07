/**
 * 登录页面工具函数
 */

class LoginUtils {
    static generateCaptcha() {
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 40;
        canvas.className = 'captcha-image';
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', '验证码图片，点击刷新');
        
        const ctx = canvas.getContext('2d');
        
        // 生成随机验证码
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let captchaText = '';
        for (let i = 0; i < 4; i++) {
            captchaText += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // 绘制背景
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, 120, 40);

        // 添加干扰线
        for (let i = 0; i < 5; i++) {
            ctx.strokeStyle = `hsl(${Math.random() * 360}, 50%, 70%)`;
            ctx.beginPath();
            ctx.moveTo(Math.random() * 120, Math.random() * 40);
            ctx.lineTo(Math.random() * 120, Math.random() * 40);
            ctx.stroke();
        }

        // 绘制验证码文字
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for (let i = 0; i < captchaText.length; i++) {
            ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 40%)`;
            const x = 20 + i * 20;
            const y = 20 + (Math.random() - 0.5) * 10;
            const angle = (Math.random() - 0.5) * 0.5;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.fillText(captchaText[i], 0, 0);
            ctx.restore();
        }

        return { canvas, text: captchaText };
    }

    static showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container') || document.body;
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${message}</span>
                <button type="button" class="ml-4 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        container.appendChild(notification);
        
        // 显示通知
        setTimeout(() => notification.classList.add('show'), 100);
        
        // 自动隐藏
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    static setButtonLoading(button, loading) {
        if (loading) {
            button.classList.add('btn-loading');
            button.disabled = true;
        } else {
            button.classList.remove('btn-loading');
            button.disabled = false;
        }
    }

    static handleOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const provider = urlParams.get('provider');
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
            this.showNotification(`OAuth登录失败: ${error}`, 'error');
            return;
        }

        if (provider && code) {
            this.processOAuthCallback(provider, code);
        }
    }

    static async processOAuthCallback(provider, code) {
        const loadingContainer = document.createElement('div');
        loadingContainer.className = 'oauth-callback-loading';
        loadingContainer.innerHTML = `
            <div class="oauth-spinner"></div>
            <h3>正在处理${provider}登录...</h3>
            <p>请稍候，我们正在验证您的身份</p>
        `;
        
        document.body.appendChild(loadingContainer);

        try {
            const response = await fetch('/api/auth/oauth/callback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ provider, code })
            });

            const result = await response.json();

            if (response.ok) {
                this.showNotification('登录成功！正在跳转...', 'success');
                setTimeout(() => {
                    window.location.href = result.redirect || '/dashboard';
                }, 1500);
            } else {
                this.showNotification(result.message || 'OAuth登录失败', 'error');
                // 清理URL参数
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (error) {
            console.error('OAuth回调错误:', error);
            this.showNotification('网络错误，请稍后重试', 'error');
        } finally {
            loadingContainer.remove();
        }
    }

    static initPasswordToggle() {
        const toggleButtons = document.querySelectorAll('[id^="toggle-"]');
        
        toggleButtons.forEach(button => {
            button.addEventListener('click', function() {
                const targetId = this.id.replace('toggle-', '');
                const passwordField = document.getElementById(targetId);
                const icon = this.querySelector('i');
                
                if (passwordField.type === 'password') {
                    passwordField.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                    this.setAttribute('aria-label', '隐藏密码');
                } else {
                    passwordField.type = 'password';
                    icon.className = 'fas fa-eye';
                    this.setAttribute('aria-label', '显示密码');
                }
            });
        });
    }

    static initTabSwitching() {
        const loginTab = document.getElementById('login-tab');
        const registerTab = document.getElementById('register-tab');
        const loginContainer = document.getElementById('login-form-container');
        const registerContainer = document.getElementById('register-form-container');

        if (loginTab && registerTab) {
            loginTab.addEventListener('click', () => {
                loginTab.classList.add('active');
                registerTab.classList.remove('active');
                loginContainer.classList.remove('hidden');
                registerContainer.classList.add('hidden');
                
                // 无障碍访问支持
                loginTab.setAttribute('aria-selected', 'true');
                registerTab.setAttribute('aria-selected', 'false');
            });

            registerTab.addEventListener('click', () => {
                registerTab.classList.add('active');
                loginTab.classList.remove('active');
                registerContainer.classList.remove('hidden');
                loginContainer.classList.add('hidden');
                
                // 无障碍访问支持
                registerTab.setAttribute('aria-selected', 'true');
                loginTab.setAttribute('aria-selected', 'false');
            });
        }
    }

    static bindSocialLogin() {
        const socialButtons = document.querySelectorAll('.social-btn');
        
        socialButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                const provider = this.textContent.trim().toLowerCase();
                let authUrl = '';
                
                switch(provider) {
                    case 'google':
                        authUrl = '/api/auth/oauth/google';
                        break;
                    case 'github':
                        authUrl = '/api/auth/oauth/github';
                        break;
                    case 'casdoor 统一登录':
                        authUrl = '/api/auth/oauth/casdoor';
                        break;
                    default:
                        LoginUtils.showNotification('暂不支持该登录方式', 'error');
                        return;
                }
                
                // 打开OAuth授权窗口
                window.location.href = authUrl;
            });
        });
    }

    // 邮箱即时验证 - 使用高级验证器
    static validateEmail(email) {
        // 如果高级验证器可用，使用它进行验证
        if (window.AdvancedEmailVerifier) {
            const verifier = new window.AdvancedEmailVerifier();
            return verifier.quickValidate(email);
        }
        
        // 回退到基本验证
        return this.basicEmailValidation(email);
    }

    // 基本邮箱验证（回退方案）
    static basicEmailValidation(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            return { valid: false, message: '请输入邮箱地址' };
        }
        
        if (email.length < 5) {
            return { valid: false, message: '邮箱地址太短' };
        }
        
        if (email.length > 254) {
            return { valid: false, message: '邮箱地址太长' };
        }
        
        if (!email.includes('@')) {
            return { valid: false, message: '邮箱地址必须包含@符号' };
        }
        
        const parts = email.split('@');
        if (parts.length !== 2) {
            return { valid: false, message: '邮箱格式不正确' };
        }
        
        const [localPart, domain] = parts;
        
        if (localPart.length === 0) {
            return { valid: false, message: '邮箱用户名不能为空' };
        }
        
        if (localPart.length > 64) {
            return { valid: false, message: '邮箱用户名太长' };
        }
        
        if (!domain.includes('.')) {
            return { valid: false, message: '邮箱域名格式不正确' };
        }
        
        if (domain.length < 3) {
            return { valid: false, message: '邮箱域名太短' };
        }
        
        if (!emailRegex.test(email)) {
            return { valid: false, message: '邮箱格式不正确' };
        }
        
        return { valid: true, message: '邮箱格式正确' };
    }

    // 密码即时验证和强度检查
    static validatePassword(password) {
        if (!password) {
            return { 
                valid: false, 
                strength: 0, 
                level: '未输入', 
                message: '请输入密码',
                feedback: ['请输入密码'] 
            };
        }
        
        let strength = 0;
        let feedback = [];
        let errors = [];

        // 长度检查
        if (password.length >= 8) {
            strength++;
        } else {
            errors.push('密码至少需要8个字符');
            feedback.push('至少8个字符');
        }
        
        if (password.length > 128) {
            errors.push('密码不能超过128个字符');
        }

        // 小写字母检查
        if (/[a-z]/.test(password)) {
            strength++;
        } else {
            feedback.push('包含小写字母');
        }

        // 大写字母检查
        if (/[A-Z]/.test(password)) {
            strength++;
        } else {
            feedback.push('包含大写字母');
        }

        // 数字检查
        if (/[0-9]/.test(password)) {
            strength++;
        } else {
            feedback.push('包含数字');
        }

        // 特殊字符检查
        if (/[^A-Za-z0-9]/.test(password)) {
            strength++;
        } else {
            feedback.push('包含特殊字符(!@#$%^&*等)');
        }
        
        // 常见弱密码检查
        const commonPasswords = ['password', '123456', '123456789', 'qwerty', 'abc123', 'password123'];
        if (commonPasswords.includes(password.toLowerCase())) {
            errors.push('不能使用常见的弱密码');
            strength = Math.max(0, strength - 2);
        }
        
        // 重复字符检查
        if (/(.)\1{2,}/.test(password)) {
            errors.push('不能包含3个或更多连续相同字符');
        }

        const levels = ['很弱', '弱', '一般', '强', '很强'];
        const level = levels[Math.min(strength, 4)] || '很弱';
        
        // 判断是否有效（至少需要达到"一般"强度且无错误）
        const isValid = strength >= 3 && errors.length === 0 && password.length >= 8;
        
        return {
            valid: isValid,
            strength: strength,
            level: level,
            message: isValid ? '密码强度良好' : (errors.length > 0 ? errors[0] : '密码强度不足'),
            feedback: feedback,
            errors: errors
        };
    }

    // 显示验证错误信息
    static showValidationError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(fieldId + '-error');
        
        if (field && errorElement) {
            field.classList.add('is-invalid');
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    // 清除验证错误信息
    static clearValidationError(fieldId) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(fieldId + '-error');
        
        if (field && errorElement) {
            field.classList.remove('is-invalid');
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }

    // 显示验证成功信息
    static showValidationSuccess(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(fieldId + '-error');
        
        if (field && errorElement) {
            field.classList.remove('is-invalid');
            field.classList.add('is-valid');
            errorElement.textContent = message;
            errorElement.className = 'valid-feedback';
            errorElement.style.display = 'block';
            errorElement.style.color = '#28a745';
        }
    }

    // 初始化即时验证
    static initRealTimeValidation() {
        // 邮箱字段即时验证
        const emailFields = ['login-email', 'register-email'];
        emailFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', function() {
                    const result = LoginUtils.validateEmail(this.value);
                    if (this.value.length === 0) {
                        LoginUtils.clearValidationError(fieldId);
                    } else if (result.valid) {
                        LoginUtils.showValidationSuccess(fieldId, result.message);
                    } else {
                        LoginUtils.showValidationError(fieldId, result.message);
                    }
                });

                field.addEventListener('blur', function() {
                    if (this.value.length > 0) {
                        const result = LoginUtils.validateEmail(this.value);
                        if (result.valid) {
                            LoginUtils.showValidationSuccess(fieldId, result.message);
                        } else {
                            LoginUtils.showValidationError(fieldId, result.message);
                        }
                    }
                });
            }
        });

        // 登录密码字段 - 只做基本验证，不检查强度
        const loginPasswordField = document.getElementById('login-password');
        if (loginPasswordField) {
            loginPasswordField.addEventListener('input', function() {
                if (this.value.length === 0) {
                    LoginUtils.clearValidationError('login-password');
                } else if (this.value.length < 6) {
                    LoginUtils.showValidationError('login-password', '密码长度不能少于6位');
                } else {
                    LoginUtils.clearValidationError('login-password');
                }
            });
        }

        // 注册密码字段 - 需要强度检查
        const registerPasswordField = document.getElementById('register-password');
        if (registerPasswordField) {
            registerPasswordField.addEventListener('input', function() {
                const result = LoginUtils.validatePassword(this.value);
                
                if (this.value.length === 0) {
                    LoginUtils.clearValidationError('register-password');
                    LoginUtils.hidePasswordStrength();
                } else {
                    if (result.valid) {
                        LoginUtils.showValidationSuccess('register-password', result.message);
                    } else {
                        LoginUtils.showValidationError('register-password', result.message);
                    }
                    
                    // 显示密码强度
                    LoginUtils.showPasswordStrength(result);
                }
            });

            registerPasswordField.addEventListener('blur', function() {
                if (this.value.length > 0) {
                    const result = LoginUtils.validatePassword(this.value);
                    if (result.valid) {
                        LoginUtils.showValidationSuccess('register-password', result.message);
                    } else {
                        LoginUtils.showValidationError('register-password', result.message);
                    }
                }
            });
        }

        // 确认密码验证
        const confirmPasswordField = document.getElementById('confirm-password');
        if (confirmPasswordField) {
            confirmPasswordField.addEventListener('input', function() {
                const password = document.getElementById('register-password').value;
                const confirmPassword = this.value;
                
                if (confirmPassword.length === 0) {
                    LoginUtils.clearValidationError('confirm-password');
                } else if (password === confirmPassword) {
                    LoginUtils.showValidationSuccess('confirm-password', '密码确认正确');
                } else {
                    LoginUtils.showValidationError('confirm-password', '两次输入的密码不一致');
                }
            });
        }
    }

    // 显示密码强度指示器
    static showPasswordStrength(result) {
        const strengthContainer = document.getElementById('password-strength');
        const strengthText = document.getElementById('password-strength-text');
        const strengthBars = document.querySelectorAll('.strength-bar');
        
        if (strengthContainer && strengthText && strengthBars.length > 0) {
            strengthContainer.classList.remove('hidden');
            
            // 更新强度条
            strengthBars.forEach((bar, index) => {
                bar.className = 'strength-bar flex-1 h-1 rounded';
                if (index < result.strength) {
                    if (result.strength <= 1) {
                        bar.classList.add('bg-red-500');
                    } else if (result.strength <= 2) {
                        bar.classList.add('bg-orange-500');
                    } else if (result.strength <= 3) {
                        bar.classList.add('bg-yellow-500');
                    } else {
                        bar.classList.add('bg-green-500');
                    }
                } else {
                    bar.classList.add('bg-gray-200');
                }
            });
            
            // 更新强度文本
            let strengthColor = '';
            switch(result.strength) {
                case 0:
                case 1:
                    strengthColor = 'text-red-600';
                    break;
                case 2:
                    strengthColor = 'text-orange-600';
                    break;
                case 3:
                    strengthColor = 'text-yellow-600';
                    break;
                case 4:
                case 5:
                    strengthColor = 'text-green-600';
                    break;
            }
            
            strengthText.className = `text-xs mt-1 ${strengthColor}`;
            strengthText.textContent = `${result.level}${result.feedback.length > 0 ? ' - 建议：' + result.feedback.join('、') : ''}`;
        }
    }

    // 隐藏密码强度指示器
    static hidePasswordStrength() {
        const strengthContainer = document.getElementById('password-strength');
        if (strengthContainer) {
            strengthContainer.classList.add('hidden');
        }
    }
}