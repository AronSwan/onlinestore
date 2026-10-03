/**
 * Login System Helper Classes
 * 登录系统辅助类
 */

// 表单验证器
class FormValidators {
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidUsername(username) {
        if (!username || username.length < 3 || username.length > 20) {
            return false;
        }
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        return usernameRegex.test(username);
    }

    getPasswordStrength(password) {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            numbers: /\d/.test(password),
            symbols: /[^A-Za-z0-9]/.test(password),
        };

        Object.values(checks).forEach(check => {
            if (check) score++;
        });

        return {
            score,
            checks,
            level: this.getPasswordLevel(score)
        };
    }

    getPasswordLevel(score) {
        if (score < 2) return 'weak';
        if (score < 3) return 'fair';
        if (score < 4) return 'good';
        return 'strong';
    }
}

// 安全管理器
class SecurityManager {
    constructor() {
        this.encryptionKey = this.generateKey();
    }

    generateKey() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '');
    }

    validateCSRFToken(token) {
        const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        return token === metaToken;
    }

    checkSecureConnection() {
        return window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    }

    generateNonce() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
}

// 通知管理器
class NotificationManager {
    constructor() {
        this.container = this.createContainer();
        this.notifications = new Map();
    }

    createContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        return container;
    }

    show(message, type = 'info', duration = 5000) {
        const id = Date.now().toString();
        const notification = this.createNotification(message, type, id);
        
        this.container.appendChild(notification);
        this.notifications.set(id, notification);

        // 显示动画
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // 自动隐藏
        if (duration > 0) {
            setTimeout(() => {
                this.hide(id);
            }, duration);
        }

        return id;
    }

    createNotification(message, type, id) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${this.getBackgroundColor(type)};
            color: ${this.getTextColor(type)};
            padding: 16px 20px;
            margin-bottom: 10px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            pointer-events: auto;
            max-width: 400px;
            word-wrap: break-word;
            display: flex;
            align-items: center;
            gap: 12px;
        `;

        const icon = this.getIcon(type);
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            background: none;
            border: none;
            color: inherit;
            font-size: 20px;
            cursor: pointer;
            margin-left: auto;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        closeButton.onclick = () => this.hide(id);

        notification.innerHTML = `
            <i class="${icon}" style="font-size: 16px;"></i>
            <span style="flex: 1;">${message}</span>
        `;
        notification.appendChild(closeButton);

        return notification;
    }

    getBackgroundColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    getTextColor(type) {
        return type === 'warning' ? '#92400e' : '#ffffff';
    }

    getIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    hide(id) {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications.delete(id);
            }, 300);
        }
    }

    clear() {
        this.notifications.forEach((notification, id) => {
            this.hide(id);
        });
    }
}

// 速率限制器
class RateLimiter {
    constructor() {
        this.attempts = new Map();
    }

    checkLimit(action, maxAttempts, timeWindow) {
        const now = Date.now();
        const key = `${action}_${Math.floor(now / timeWindow)}`;
        
        const currentAttempts = this.attempts.get(key) || 0;
        
        if (currentAttempts >= maxAttempts) {
            return false;
        }
        
        this.attempts.set(key, currentAttempts + 1);
        
        // 清理过期的记录
        this.cleanup(timeWindow);
        
        return true;
    }

    cleanup(timeWindow) {
        const now = Date.now();
        const cutoff = now - timeWindow * 2;
        
        for (const [key, timestamp] of this.attempts.entries()) {
            if (timestamp < cutoff) {
                this.attempts.delete(key);
            }
        }
    }

    reset(action) {
        const keysToDelete = [];
        for (const key of this.attempts.keys()) {
            if (key.startsWith(action)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.attempts.delete(key));
    }
}

// 导出类供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FormValidators,
        SecurityManager,
        NotificationManager,
        RateLimiter
    };
}