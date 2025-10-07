/**
 * OAuth认证处理器
 */

class OAuthHandler {
    constructor() {
        this.providers = {
            google: {
                name: 'Google',
                icon: 'fab fa-google',
                color: 'text-red-500',
                authUrl: '/api/auth/oauth/google'
            },
            github: {
                name: 'GitHub', 
                icon: 'fab fa-github',
                color: 'text-gray-800',
                authUrl: '/api/auth/oauth/github'
            },
            casdoor: {
                name: 'Casdoor',
                icon: 'fas fa-shield-alt',
                color: 'text-blue-600',
                authUrl: '/api/auth/oauth/casdoor'
            }
        };
        
        this.init();
    }

    init() {
        this.handleCallback();
        this.bindSocialButtons();
    }

    handleCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const provider = urlParams.get('provider');
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const state = urlParams.get('state');

        if (error) {
            this.handleOAuthError(error, provider);
            return;
        }

        if (provider && code) {
            this.processCallback(provider, code, state);
        }
    }

    async processCallback(provider, code, state) {
        const loadingOverlay = this.createLoadingOverlay(provider);
        document.body.appendChild(loadingOverlay);

        try {
            // 验证state参数防止CSRF攻击
            const storedState = sessionStorage.getItem(`oauth_state_${provider}`);
            if (state !== storedState) {
                throw new Error('Invalid state parameter');
            }

            const response = await fetch('/api/auth/oauth/callback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                },
                body: JSON.stringify({
                    provider,
                    code,
                    state
                })
            });

            const result = await response.json();

            if (response.ok) {
                this.handleOAuthSuccess(result, provider);
            } else {
                this.handleOAuthError(result.message, provider);
            }
        } catch (error) {
            console.error('OAuth回调处理错误:', error);
            this.handleOAuthError('认证过程中发生错误', provider);
        } finally {
            loadingOverlay.remove();
            // 清理URL参数
            this.cleanupUrl();
            // 清理存储的state
            sessionStorage.removeItem(`oauth_state_${provider}`);
        }
    }

    createLoadingOverlay(provider) {
        const providerInfo = this.providers[provider] || { name: provider };
        
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        overlay.innerHTML = `
            <div class="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
                <div class="oauth-spinner mx-auto mb-4"></div>
                <h3 class="text-lg font-semibold mb-2">正在处理${providerInfo.name}登录</h3>
                <p class="text-gray-600">请稍候，我们正在验证您的身份...</p>
                <div class="mt-4 text-sm text-gray-500">
                    <i class="fas fa-shield-alt mr-1"></i>
                    安全连接已建立
                </div>
            </div>
        `;
        
        return overlay;
    }

    handleOAuthSuccess(result, provider) {
        const providerInfo = this.providers[provider] || { name: provider };
        
        LoginUtils.showNotification(`${providerInfo.name}登录成功！正在跳转...`, 'success');
        
        // 存储用户信息（如果需要）
        if (result.user) {
            sessionStorage.setItem('user_info', JSON.stringify(result.user));
        }
        
        // 跳转到目标页面
        setTimeout(() => {
            window.location.href = result.redirect || '/dashboard';
        }, 1500);
    }

    handleOAuthError(error, provider) {
        const providerInfo = this.providers[provider] || { name: provider };
        
        let errorMessage = '';
        switch (error) {
            case 'access_denied':
                errorMessage = `您取消了${providerInfo.name}授权`;
                break;
            case 'invalid_request':
                errorMessage = '请求参数无效';
                break;
            case 'invalid_scope':
                errorMessage = '请求权限无效';
                break;
            case 'server_error':
                errorMessage = '服务器错误，请稍后重试';
                break;
            default:
                errorMessage = error || `${providerInfo.name}登录失败`;
        }
        
        LoginUtils.showNotification(errorMessage, 'error');
        this.cleanupUrl();
    }

    bindSocialButtons() {
        const socialButtons = document.querySelectorAll('.social-btn');
        
        socialButtons.forEach(button => {
            button.addEventListener('click', this.handleSocialLogin.bind(this));
        });
    }

    async handleSocialLogin(event) {
        event.preventDefault();
        
        const button = event.currentTarget;
        const buttonText = button.textContent.trim();
        
        // 确定提供商
        let provider = '';
        if (buttonText.includes('Google')) {
            provider = 'google';
        } else if (buttonText.includes('GitHub')) {
            provider = 'github';
        } else if (buttonText.includes('Casdoor')) {
            provider = 'casdoor';
        } else {
            LoginUtils.showNotification('不支持的登录方式', 'error');
            return;
        }

        const providerConfig = this.providers[provider];
        if (!providerConfig) {
            LoginUtils.showNotification('登录配置错误', 'error');
            return;
        }

        try {
            // 生成state参数防止CSRF攻击
            const state = this.generateState();
            sessionStorage.setItem(`oauth_state_${provider}`, state);
            
            // 构建授权URL
            const authUrl = new URL(providerConfig.authUrl, window.location.origin);
            authUrl.searchParams.set('state', state);
            
            // 添加loading状态
            LoginUtils.setButtonLoading(button, true);
            
            // 跳转到OAuth授权页面
            window.location.href = authUrl.toString();
            
        } catch (error) {
            console.error('OAuth初始化错误:', error);
            LoginUtils.showNotification('登录初始化失败', 'error');
            LoginUtils.setButtonLoading(button, false);
        }
    }

    generateState() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    cleanupUrl() {
        const url = new URL(window.location);
        url.searchParams.delete('provider');
        url.searchParams.delete('code');
        url.searchParams.delete('error');
        url.searchParams.delete('state');
        window.history.replaceState({}, document.title, url.toString());
    }

    // 静态方法：检查OAuth提供商可用性
    static async checkProviderAvailability() {
        try {
            const response = await fetch('/api/auth/oauth/providers');
            const result = await response.json();
            return result.providers || [];
        } catch (error) {
            console.error('检查OAuth提供商可用性错误:', error);
            return [];
        }
    }

    // 静态方法：获取OAuth提供商配置
    static async getProviderConfig(provider) {
        try {
            const response = await fetch(`/api/auth/oauth/config/${provider}`);
            const result = await response.json();
            return result.config || null;
        } catch (error) {
            console.error('获取OAuth配置错误:', error);
            return null;
        }
    }
}

// 全局实例
window.OAuthHandler = OAuthHandler;