/**
 * Login Validation Extensions
 * 登录验证扩展功能
 */

Object.assign(LoginEnhanced.prototype, {
    
    // 验证相关方法
    validateEmail(input) {
        const email = input.value.trim();
        if (!this.validators.isValidEmail(email)) {
            this.showValidationError(input.id, '请输入有效的邮箱地址');
            return false;
        }
        this.clearValidationError(input);
        return true;
    },

    validatePassword(input) {
        const password = input.value;
        if (input.id === 'register-password') {
            const strength = this.validators.getPasswordStrength(password);
            if (strength.score < 3) {
                this.showValidationError(input.id, '密码强度不足，请包含大小写字母、数字和特殊字符');
                return false;
            }
        } else if (!password) {
            this.showValidationError(input.id, '请输入密码');
            return false;
        }
        this.clearValidationError(input);
        return true;
    },

    validateUsername(input) {
        const username = input.value.trim();
        if (!this.validators.isValidUsername(username)) {
            this.showValidationError(input.id, '用户名必须是3-20个字符，只能包含字母、数字和下划线');
            return false;
        }
        this.clearValidationError(input);
        return true;
    },

    validatePasswordMatch() {
        const password = document.getElementById('register-password')?.value;
        const confirmPassword = document.getElementById('confirm-password')?.value;
        
        if (password && confirmPassword && password !== confirmPassword) {
            this.showValidationError('confirm-password', '两次输入的密码不一致');
            return false;
        }
        this.clearValidationError(document.getElementById('confirm-password'));
        return true;
    },

    // 验证错误显示方法
    showValidationError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(`${fieldId}-error`) || 
                           field?.parentNode.querySelector('.invalid-feedback');
        
        if (field) {
            field.classList.add('is-invalid');
            field.setAttribute('aria-invalid', 'true');
        }
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            errorElement.setAttribute('role', 'alert');
        }
    },

    clearValidationError(input) {
        if (!input) return;
        
        input.classList.remove('is-invalid');
        input.removeAttribute('aria-invalid');
        
        const errorElement = document.getElementById(`${input.id}-error`) || 
                           input.parentNode.querySelector('.invalid-feedback');
        
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
            errorElement.removeAttribute('role');
        }
    },

    clearAllValidationErrors() {
        const invalidInputs = document.querySelectorAll('.is-invalid');
        invalidInputs.forEach(input => this.clearValidationError(input));
    },

    // 密码强度指示器
    initPasswordStrengthMeter() {
        const passwordInput = document.getElementById('register-password');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                this.updatePasswordStrength(e.target.value);
            });
        }
    },

    updatePasswordStrength(password) {
        const strength = this.validators.getPasswordStrength(password);
        const bar = document.getElementById('password-strength-bar');
        const text = document.getElementById('password-strength-text');
        
        if (bar && text) {
            bar.className = 'password-strength-bar';
            
            switch (strength.score) {
                case 0:
                case 1:
                    bar.classList.add('password-strength-weak');
                    text.textContent = '弱';
                    break;
                case 2:
                    bar.classList.add('password-strength-fair');
                    text.textContent = '一般';
                    break;
                case 3:
                    bar.classList.add('password-strength-good');
                    text.textContent = '良好';
                    break;
                case 4:
                    bar.classList.add('password-strength-strong');
                    text.textContent = '强';
                    break;
            }
        }
    }
});