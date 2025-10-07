// 用途：增强的登录页面功能
// 包含表单验证、密码强度检查、验证码、OAuth回调等功能
// 作者：AI Assistant
// 时间：2024-11-09 10:30:00

class LoginEnhanced {
    constructor() {
        this.loginAttempts = 0;
        this.maxAttempts = 5;
        this.lockoutTime = 15 * 60 * 1000; // 15分钟
        this.captchaRequired = false;
        this.currentCaptcha = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.initPasswordToggle();
        this.initTabSwitching();
        this.checkLockoutStatus();
        this.handleOAuthCallback();
        this.generateCaptcha();
    }

    bindEvents() {
        // 表单提交事件
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }

        // 实时验证
        this.bindRealTimeValidation();
        
        // 密码强度检查
        const registerPassword = document.getElementById('register-password');
        if (registerPassword) {
            registerPassword.addEventListener('input', this.checkPasswordStrength.bind(this));
        }

        // 社交登录
        this.bindSocialLogin();
    }
    
    // 添加缺失的handleLogin方法
    handleLogin(event) {
        event.preventDefault();
        
        // 获取表单数据
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        
        // 表单验证
        if (!this.validateField(document.getElementById('login-email')) || 
            !this.validateField(document.getElementById('login-password'))) {
            return;
        }
        
        // 这里添加登录逻辑，目前使用模拟数据
        console.log('登录请求:', { email, password });
        
        // 模拟登录成功
        alert('登录成功！');
        window.location.href = 'index.html';
    }
    
    // 添加缺失的handleRegister方法
    handleRegister(event) {
        event.preventDefault();
        
        // 获取表单数据
        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirmPassword').value;
        
        // 表单验证
        if (!this.validateField(document.getElementById('register-username')) ||
            !this.validateField(document.getElementById('register-email')) ||
            !this.validateField(document.getElementById('register-password')) ||
            !this.validateField(document.getElementById('register-confirmPassword'))) {
            return;
        }
        
        // 这里添加注册逻辑，目前使用模拟数据
        console.log('注册请求:', { username, email, password });
        
        // 模拟注册成功
        alert('注册成功！请登录。');
        // 切换到登录选项卡
        this.initTabSwitching('login');
    }
    
    // 添加缺失的initTabSwitching方法
    initTabSwitching(activeTab = 'login') {
        const loginTab = document.getElementById('login-tab');
        const registerTab = document.getElementById('register-tab');
        const loginFormContainer = document.getElementById('login-form-container');
        const registerFormContainer = document.getElementById('register-form-container');
        
        if (loginTab && registerTab && loginFormContainer && registerFormContainer) {
            // 设置初始状态
            if (activeTab === 'login') {
                loginTab.classList.add('active');
                loginFormContainer.classList.add('active');
                registerTab.classList.remove('active');
                registerFormContainer.classList.remove('active');
            } else {
                registerTab.classList.add('active');
                registerFormContainer.classList.add('active');
                loginTab.classList.remove('active');
                loginFormContainer.classList.remove('active');
            }
            
            // 添加切换事件
            loginTab.addEventListener('click', () => {
                loginTab.classList.add('active');
                loginFormContainer.classList.add('active');
                registerTab.classList.remove('active');
                registerFormContainer.classList.remove('active');
            });
            
            registerTab.addEventListener('click', () => {
                registerTab.classList.add('active');
                registerFormContainer.classList.add('active');
                loginTab.classList.remove('active');
                loginFormContainer.classList.remove('active');
            });
        }
    }
    
    // 添加缺失的checkLockoutStatus方法
    checkLockoutStatus() {
        // 检查用户是否被锁定，这里只是一个示例实现
        const lastFailedAttempt = localStorage.getItem('lastFailedLoginAttempt');
        const attempts = parseInt(localStorage.getItem('loginAttempts') || '0');
        
        if (lastFailedAttempt && attempts >= this.maxAttempts) {
            const now = Date.now();
            const elapsed = now - parseInt(lastFailedAttempt);
            
            if (elapsed < this.lockoutTime) {
                const remaining = Math.ceil((this.lockoutTime - elapsed) / 60000);
                alert(`账号已被临时锁定，请${remaining}分钟后再试。`);
                this.disableLoginForm();
            } else {
                // 锁定时间已过，重置登录尝试次数
                localStorage.removeItem('lastFailedLoginAttempt');
                localStorage.removeItem('loginAttempts');
            }
        }
    }
    
    // 添加缺失的disableLoginForm方法
    disableLoginForm() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            const inputs = loginForm.querySelectorAll('input');
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            
            inputs.forEach(input => {
                input.disabled = true;
            });
            
            if (submitBtn) {
                submitBtn.disabled = true;
            }
        }
    }
    
    // 添加缺失的handleOAuthCallback方法
    handleOAuthCallback() {
        // 处理OAuth登录回调，这里只是一个示例实现
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
            console.log('OAuth授权码:', code);
            // 这里应该向服务器发送授权码以获取访问令牌
            alert('OAuth登录成功！');
            window.location.href = 'index.html';
        }
    }
    
    // 添加缺失的generateCaptcha方法
    generateCaptcha() {
        // 生成验证码，这里只是一个示例实现
        if (this.captchaRequired) {
            const captchaContainer = document.getElementById('captcha-container');
            if (captchaContainer) {
                // 生成随机验证码
                const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                let captcha = '';
                for (let i = 0; i < 6; i++) {
                    captcha += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                
                this.currentCaptcha = captcha;
                captchaContainer.textContent = captcha;
            }
        }
    }
    
    // 添加缺失的bindSocialLogin方法
    bindSocialLogin() {
        // 绑定社交登录按钮事件，这里只是一个示例实现
        const socialButtons = document.querySelectorAll('.social-login-btn');
        socialButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const provider = e.target.getAttribute('data-provider') || e.target.parentNode.getAttribute('data-provider');
                console.log('使用社交登录:', provider);
                // 这里应该重定向到相应的社交登录页面
                alert(`即将跳转到${provider}登录页面`);
            });
        });
    }
    
    // 添加缺失的initPasswordToggle方法
    initPasswordToggle() {
        // 初始化密码显示/隐藏功能，这里只是一个示例实现
        const toggleButtons = document.querySelectorAll('.password-toggle');
        toggleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const passwordInput = e.target.previousElementSibling || e.target.parentNode.previousElementSibling;
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                // 切换图标或文本
                const icon = button.querySelector('i');
                if (icon) {
                    if (type === 'text') {
                        icon.className = 'fa fa-eye-slash';
                    } else {
                        icon.className = 'fa fa-eye';
                    }
                }
            });
        });
    }

    bindRealTimeValidation() {
        const inputs = document.querySelectorAll('.form-input');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name;
        let isValid = true;
        let errorMessage = '';

        // 清除之前的验证状态
        this.clearFieldError(field);

        switch (fieldName) {
            case 'email':
                if (!value) {
                    errorMessage = '邮箱地址不能为空';
                    isValid = false;
                } else if (!this.isValidEmail(value)) {
                    errorMessage = '请输入有效的邮箱地址';
                    isValid = false;
                }
                break;

            case 'password':
                if (!value) {
                    errorMessage = '密码不能为空';
                    isValid = false;
                } else if (field.id === 'register-password' && value.length < 8) {
                    errorMessage = '密码至少需要8个字符';
                    isValid = false;
                }
                break;

            case 'username':
                if (!value) {
                    errorMessage = '用户名不能为空';
                    isValid = false;
                } else if (value.length < 3 || value.length > 20) {
                    errorMessage = '用户名长度应在3-20个字符之间';
                    isValid = false;
                } else if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(value)) {
                    errorMessage = '用户名只能包含字母、数字、下划线和中文';
                    isValid = false;
                }
                break;

            case 'confirmPassword':
                const password = document.getElementById('register-password').value;
                if (!value) {
                    errorMessage = '请确认密码';
                    isValid = false;
                } else if (value !== password) {
                    errorMessage = '两次输入的密码不一致';
                    isValid = false;
                }
                break;
        }

        if (!isValid) {
            this.showFieldError(field, errorMessage);
        } else {
            this.showFieldSuccess(field);
        }

        return isValid;
    }

    showFieldError(field, message) {
        field.classList.add('is-invalid');
        field.classList.remove('is-valid');
        
        const errorElement = document.getElementById(field.id + '-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }

        // 无障碍访问支持
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute('aria-describedby', field.id + '-error');
    }

    showFieldSuccess(field) {
        field.classList.remove('is-invalid');
        field.classList.add('is-valid');
        
        const errorElement = document.getElementById(field.id + '-error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }

        field.setAttribute('aria-invalid', 'false');
        field.removeAttribute('aria-describedby');
    }

    clearFieldError(field) {
        field.classList.remove('is-invalid', 'is-valid');
        
        const errorElement = document.getElementById(field.id + '-error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }

        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
    }

    checkPasswordStrength(event) {
        const password = event.target.value;
        const strengthContainer = document.getElementById('password-strength') || this.createPasswordStrengthIndicator();
        
        const strength = this.calculatePasswordStrength(password);
        
        strengthContainer.className = `password-strength ${strength.level}`;
        strengthContainer.textContent = strength.message;
        strengthContainer.setAttribute('aria-live', 'polite');
    }

    createPasswordStrengthIndicator() {
        const container = document.createElement('div');
        container.id = 'password-strength';
        container.className = 'password-strength';
        
        const passwordField = document.getElementById('register-password');
        passwordField.parentNode.appendChild(container);
        
        return container;
    }

    calculatePasswordStrength(password) {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            numbers: /\d/.test(password),
            symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        score = Object.values(checks).filter(Boolean).length;

        if (score < 3) {
            return { level: 'weak', message: '密码强度：弱 - 建议包含大小写字母、数字和特殊字符' };
        } else if (score < 5) {
            return { level: 'medium', message: '密码强度：中等 - 可以进一步增强' };
        } else {
            return { level: 'strong', message: '密码强度：强 - 很好的密码！' };
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// 初始化登录增强功能
document.addEventListener('DOMContentLoaded', function() {
    new LoginEnhanced();
});