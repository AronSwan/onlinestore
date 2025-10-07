/**
 * 高级邮箱验证器 - 基于AfterShip email-verifier的功能理念
 * 提供更全面的邮箱验证功能
 */

class AdvancedEmailVerifier {
    constructor() {
        // 一次性邮箱域名列表（常见的临时邮箱服务）
        this.disposableEmailDomains = new Set([
            '10minutemail.com', '10minutemail.net', 'tempmail.org', 'guerrillamail.com',
            'mailinator.com', 'maildrop.cc', 'temp-mail.org', 'throwaway.email',
            'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'pokemail.net',
            'spam4.me', 'bccto.me', 'chacuo.net', 'dispostable.com', 'fakeinbox.com',
            'getnada.com', 'harakirimail.com', 'incognitomail.org', 'jetable.org',
            'koszmail.pl', 'lookugly.com', 'lopl.co.cc', 'lovespell.us', 'mt2014.com',
            'mytrashmail.com', 'no-spam.ws', 'nowmymail.com', 'objectmail.com',
            'pookmail.com', 'proxymail.eu', 'rcpt.at', 'safe-mail.net', 'selfdestructingmail.com',
            'sendspamhere.com', 'spamhereplease.com', 'spamthisplease.com', 'superrito.com',
            'tempemail.com', 'tempinbox.com', 'tempymail.com', 'thankyou2010.com',
            'trash2009.com', 'trashmail.at', 'trashmail.com', 'trashmail.ws',
            'wegwerfmail.de', 'wegwerfmail.net', 'wegwerfmail.org', 'wh4f.org'
        ]);

        // 角色邮箱前缀列表
        this.roleBasedPrefixes = new Set([
            'admin', 'administrator', 'postmaster', 'hostmaster', 'webmaster',
            'www', 'ftp', 'mail', 'email', 'marketing', 'sales', 'support',
            'help', 'info', 'contact', 'service', 'noreply', 'no-reply',
            'donotreply', 'do-not-reply', 'bounce', 'bounces', 'mailer-daemon',
            'mailerdaemon', 'nobody', 'abuse', 'security', 'privacy',
            'legal', 'compliance', 'billing', 'accounts', 'accounting'
        ]);

        // 常见域名的MX记录缓存
        this.mxCache = new Map();
        
        // 验证结果缓存
        this.validationCache = new Map();
    }

    /**
     * 全面验证邮箱地址
     * @param {string} email - 邮箱地址
     * @param {Object} options - 验证选项
     * @returns {Promise<Object>} 验证结果
     */
    async verifyEmail(email, options = {}) {
        const {
            checkDisposable = true,
            checkRole = true,
            checkMX = false, // MX检查需要后端支持
            checkSMTP = false, // SMTP检查需要后端支持
            useCache = true
        } = options;

        // 检查缓存
        const cacheKey = `${email}_${JSON.stringify(options)}`;
        if (useCache && this.validationCache.has(cacheKey)) {
            return this.validationCache.get(cacheKey);
        }

        const result = {
            email: email,
            valid: false,
            syntax: false,
            disposable: false,
            role: false,
            mx: null,
            smtp: null,
            score: 0,
            reason: '',
            suggestions: []
        };

        try {
            // 1. 语法验证
            const syntaxResult = this.validateSyntax(email);
            result.syntax = syntaxResult.valid;
            if (!syntaxResult.valid) {
                result.reason = syntaxResult.reason;
                result.suggestions = syntaxResult.suggestions;
                return this.cacheResult(cacheKey, result, useCache);
            }

            const [localPart, domain] = email.toLowerCase().split('@');

            // 2. 一次性邮箱检查
            if (checkDisposable) {
                result.disposable = this.isDisposableEmail(domain);
                if (result.disposable) {
                    result.reason = '检测到临时邮箱地址，请使用常用邮箱';
                    result.suggestions.push('请使用Gmail、Outlook、QQ邮箱等常用邮箱服务');
                    return this.cacheResult(cacheKey, result, useCache);
                }
            }

            // 3. 角色邮箱检查
            if (checkRole) {
                result.role = this.isRoleBasedEmail(localPart);
                if (result.role) {
                    result.reason = '检测到系统邮箱地址，请使用个人邮箱';
                    result.suggestions.push('请使用个人邮箱而非系统管理邮箱');
                    return this.cacheResult(cacheKey, result, useCache);
                }
            }

            // 4. 域名和MX记录检查（需要后端API支持）
            if (checkMX) {
                try {
                    const mxResult = await this.checkMXRecord(domain);
                    result.mx = mxResult;
                    if (!mxResult.valid) {
                        result.reason = '邮箱域名无效或无法接收邮件';
                        result.suggestions.push('请检查邮箱地址是否正确');
                        return this.cacheResult(cacheKey, result, useCache);
                    }
                } catch (error) {
                    console.warn('MX记录检查失败:', error);
                    // MX检查失败不影响整体验证
                }
            }

            // 5. SMTP验证（需要后端API支持）
            if (checkSMTP) {
                try {
                    const smtpResult = await this.checkSMTPDeliverability(email);
                    result.smtp = smtpResult;
                    if (!smtpResult.deliverable) {
                        result.reason = '邮箱地址可能不存在或无法接收邮件';
                        result.suggestions.push('请确认邮箱地址是否正确');
                        return this.cacheResult(cacheKey, result, useCache);
                    }
                } catch (error) {
                    console.warn('SMTP验证失败:', error);
                    // SMTP检查失败不影响整体验证
                }
            }

            // 6. 计算总体评分
            result.score = this.calculateScore(result);
            result.valid = result.score >= 80; // 80分以上认为有效
            result.reason = result.valid ? '邮箱地址验证通过' : '邮箱地址质量较低';

            return this.cacheResult(cacheKey, result, useCache);

        } catch (error) {
            console.error('邮箱验证错误:', error);
            result.reason = '验证过程中发生错误';
            return result;
        }
    }

    /**
     * 语法验证
     */
    validateSyntax(email) {
        const result = {
            valid: false,
            reason: '',
            suggestions: []
        };

        if (!email) {
            result.reason = '请输入邮箱地址';
            return result;
        }

        // 基本格式检查
        if (typeof email !== 'string') {
            result.reason = '邮箱地址格式无效';
            return result;
        }

        email = email.trim();

        // 长度检查
        if (email.length < 5) {
            result.reason = '邮箱地址太短';
            result.suggestions.push('邮箱地址至少需要5个字符');
            return result;
        }

        if (email.length > 254) {
            result.reason = '邮箱地址太长';
            result.suggestions.push('邮箱地址不能超过254个字符');
            return result;
        }

        // @ 符号检查
        const atCount = (email.match(/@/g) || []).length;
        if (atCount === 0) {
            result.reason = '邮箱地址必须包含@符号';
            result.suggestions.push('正确格式：username@domain.com');
            return result;
        }

        if (atCount > 1) {
            result.reason = '邮箱地址只能包含一个@符号';
            return result;
        }

        const [localPart, domain] = email.split('@');

        // 本地部分检查
        if (!localPart || localPart.length === 0) {
            result.reason = '邮箱用户名不能为空';
            result.suggestions.push('请在@符号前添加用户名');
            return result;
        }

        if (localPart.length > 64) {
            result.reason = '邮箱用户名太长';
            result.suggestions.push('用户名部分不能超过64个字符');
            return result;
        }

        // 域名部分检查
        if (!domain || domain.length === 0) {
            result.reason = '邮箱域名不能为空';
            result.suggestions.push('请在@符号后添加域名');
            return result;
        }

        if (domain.length > 253) {
            result.reason = '邮箱域名太长';
            return result;
        }

        if (!domain.includes('.')) {
            result.reason = '邮箱域名格式不正确';
            result.suggestions.push('域名必须包含点号，如：gmail.com');
            return result;
        }

        // 域名格式检查
        const domainParts = domain.split('.');
        if (domainParts.some(part => part.length === 0)) {
            result.reason = '邮箱域名格式不正确';
            result.suggestions.push('域名不能包含连续的点号');
            return result;
        }

        if (domainParts[domainParts.length - 1].length < 2) {
            result.reason = '顶级域名太短';
            result.suggestions.push('顶级域名至少需要2个字符');
            return result;
        }

        // 正则表达式最终验证
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        
        if (!emailRegex.test(email)) {
            result.reason = '邮箱格式不正确';
            result.suggestions.push('请检查邮箱地址是否包含无效字符');
            return result;
        }

        result.valid = true;
        return result;
    }

    /**
     * 检查是否为一次性邮箱
     */
    isDisposableEmail(domain) {
        return this.disposableEmailDomains.has(domain.toLowerCase());
    }

    /**
     * 检查是否为角色邮箱
     */
    isRoleBasedEmail(localPart) {
        return this.roleBasedPrefixes.has(localPart.toLowerCase());
    }

    /**
     * 检查MX记录（需要后端API支持）
     */
    async checkMXRecord(domain) {
        // 检查缓存
        if (this.mxCache.has(domain)) {
            return this.mxCache.get(domain);
        }

        try {
            const response = await fetch('/api/email/check-mx', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ domain })
            });

            const result = await response.json();
            
            // 缓存结果（5分钟）
            setTimeout(() => this.mxCache.delete(domain), 5 * 60 * 1000);
            this.mxCache.set(domain, result);
            
            return result;
        } catch (error) {
            console.error('MX记录检查失败:', error);
            return { valid: false, error: error.message };
        }
    }

    /**
     * 检查SMTP可达性（需要后端API支持）
     */
    async checkSMTPDeliverability(email) {
        try {
            const response = await fetch('/api/email/check-smtp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            return await response.json();
        } catch (error) {
            console.error('SMTP验证失败:', error);
            return { deliverable: false, error: error.message };
        }
    }

    /**
     * 计算邮箱质量评分
     */
    calculateScore(result) {
        let score = 0;

        // 语法正确 +40分
        if (result.syntax) score += 40;

        // 非一次性邮箱 +20分
        if (!result.disposable) score += 20;

        // 非角色邮箱 +15分
        if (!result.role) score += 15;

        // MX记录有效 +15分
        if (result.mx && result.mx.valid) score += 15;

        // SMTP可达 +10分
        if (result.smtp && result.smtp.deliverable) score += 10;

        return Math.min(score, 100);
    }

    /**
     * 缓存验证结果
     */
    cacheResult(key, result, useCache) {
        if (useCache) {
            // 缓存1小时
            setTimeout(() => this.validationCache.delete(key), 60 * 60 * 1000);
            this.validationCache.set(key, result);
        }
        return result;
    }

    /**
     * 获取邮箱建议
     */
    getEmailSuggestions(email) {
        const suggestions = [];
        
        if (!email || !email.includes('@')) {
            return ['请输入完整的邮箱地址，格式：username@domain.com'];
        }

        const [localPart, domain] = email.toLowerCase().split('@');
        
        // 常见域名拼写错误修正
        const domainSuggestions = {
            'gmai.com': 'gmail.com',
            'gmial.com': 'gmail.com',
            'gmail.co': 'gmail.com',
            'hotmai.com': 'hotmail.com',
            'hotmial.com': 'hotmail.com',
            'outlok.com': 'outlook.com',
            'outlokk.com': 'outlook.com',
            'qq.co': 'qq.com',
            '163.co': '163.com',
            '126.co': '126.com'
        };

        if (domainSuggestions[domain]) {
            suggestions.push(`您是否想输入：${localPart}@${domainSuggestions[domain]}`);
        }

        return suggestions;
    }

    /**
     * 快速验证（仅语法和基本检查）
     */
    quickValidate(email) {
        const syntaxResult = this.validateSyntax(email);
        if (!syntaxResult.valid) {
            return {
                valid: false,
                message: syntaxResult.reason,
                suggestions: syntaxResult.suggestions
            };
        }

        const [localPart, domain] = email.toLowerCase().split('@');
        
        if (this.isDisposableEmail(domain)) {
            return {
                valid: false,
                message: '请使用常用邮箱，不支持临时邮箱',
                suggestions: ['建议使用Gmail、Outlook、QQ邮箱等']
            };
        }

        if (this.isRoleBasedEmail(localPart)) {
            return {
                valid: false,
                message: '请使用个人邮箱，不支持系统邮箱',
                suggestions: ['请使用个人邮箱进行注册']
            };
        }

        return {
            valid: true,
            message: '邮箱格式正确',
            suggestions: []
        };
    }
}

// 导出全局实例
window.AdvancedEmailVerifier = AdvancedEmailVerifier;