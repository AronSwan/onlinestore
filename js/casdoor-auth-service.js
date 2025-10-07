/**
 * Casdoor 认证服务
 * 提供完整的 Casdoor 认证功能集成
 */
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：提供Casdoor认证服务集成，包括登录、登出、令牌管理和用户信息处理
// 依赖文件：casdoor-config.js

class CasdoorAuthService {
  constructor(config = window.CasdoorConfig) {
    this.config = config;
    this.isInitialized = false;
    this.eventListeners = new Map();
  }

  /**
   * 初始化认证服务
   */
  async init() {
    if (this.isInitialized) return;

    try {
      // 检查是否已登录
      await this.checkAuthStatus();
      
      // 设置自动刷新令牌
      this.setupTokenRefresh();
      
      // 监听页面可见性变化
      this.setupVisibilityListener();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      console.log('Casdoor 认证服务初始化完成');
    } catch (error) {
      console.error('Casdoor 认证服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 检查认证状态
   */
  async checkAuthStatus() {
    const accessToken = window.CasdoorAuth.TokenManager.getAccessToken();
    
    if (!accessToken) {
      this.emit('unauthenticated');
      return false;
    }

    try {
      const userInfo = await window.CasdoorAuth.UserManager.getUserInfo();
      this.emit('authenticated', userInfo);
      return true;
    } catch (error) {
      console.error('检查认证状态失败:', error);
      this.logout();
      return false;
    }
  }

  /**
   * 启动登录流程
   */
  async login(options = {}) {
    try {
      // 合并配置
      const config = { ...this.config, ...options };
      
      // 构建授权 URL
      const authUrl = await window.CasdoorAuth.URLBuilder.buildAuthUrl(config);
      
      // 跳转到授权页面
      window.location.href = authUrl;
    } catch (error) {
      console.error('启动登录流程失败:', error);
      this.emit('loginError', error);
      throw error;
    }
  }

  /**
   * 第三方登录
   */
  async loginWithProvider(providerName) {
    try {
      const providerUrl = window.CasdoorAuth.URLBuilder.buildProviderUrl(providerName, this.config);
      window.location.href = providerUrl;
    } catch (error) {
      console.error(`${providerName} 登录失败:`, error);
      this.emit('loginError', error);
      throw error;
    }
  }

  /**
   * 处理登录回调
   */
  async handleCallback(urlParams = new URLSearchParams(window.location.search)) {
    try {
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      // 检查是否有错误
      if (error) {
        const errorDescription = urlParams.get('error_description') || error;
        throw new Error(`认证失败: ${errorDescription}`);
      }

      // 检查是否有授权码
      if (!code) {
        throw new Error('未收到授权码');
      }

      // 验证状态参数
      const authState = window.CasdoorAuth.StateManager.getAuthState();
      if (!authState || authState.state !== state) {
        throw new Error('状态参数不匹配，可能存在安全风险');
      }

      // 交换授权码获取令牌
      const tokenData = await window.CasdoorAuth.TokenManager.exchangeCodeForToken(code, this.config);
      
      // 获取用户信息
      const userInfo = await window.CasdoorAuth.UserManager.getUserInfo();
      
      // 触发登录成功事件
      this.emit('loginSuccess', { tokenData, userInfo });
      
      return { tokenData, userInfo };
    } catch (error) {
      console.error('处理登录回调失败:', error);
      this.emit('loginError', error);
      throw error;
    }
  }

  /**
   * 登出
   */
  async logout(redirectToLogin = true) {
    try {
      // 清除本地存储的令牌和用户信息
      window.CasdoorAuth.TokenManager.clearTokens();
      window.CasdoorAuth.UserManager.clearUserInfo();
      window.CasdoorAuth.StateManager.clearAuthState();

      // 调用服务器登出接口
      try {
        await fetch(`${this.config.serverUrl}/api/logout`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.warn('服务器登出失败:', error);
      }

      // 触发登出事件
      this.emit('logout');

      // 重定向到登录页面
      if (redirectToLogin) {
        window.location.href = '/login.html';
      }
    } catch (error) {
      console.error('登出失败:', error);
      this.emit('logoutError', error);
      throw error;
    }
  }

  /**
   * 获取当前用户信息
   */
  getCurrentUser() {
    return window.CasdoorAuth.UserManager.getStoredUserInfo();
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated() {
    const accessToken = window.CasdoorAuth.TokenManager.getAccessToken();
    const userInfo = this.getCurrentUser();
    return !!(accessToken && userInfo);
  }

  /**
   * 刷新令牌
   */
  async refreshToken() {
    try {
      const newAccessToken = await window.CasdoorAuth.TokenManager.refreshToken();
      this.emit('tokenRefreshed', newAccessToken);
      return newAccessToken;
    } catch (error) {
      console.error('刷新令牌失败:', error);
      this.logout();
      throw error;
    }
  }

  /**
   * 设置自动刷新令牌
   */
  setupTokenRefresh() {
    // 每5分钟检查一次令牌是否需要刷新
    setInterval(async () => {
      const storage = this.config.session.storage === 'localStorage' ? localStorage : sessionStorage;
      const stored = storage.getItem('casdoor_tokens');
      
      if (!stored) return;

      try {
        const tokenInfo = JSON.parse(stored);
        const timeUntilExpiry = tokenInfo.expiresAt - Date.now();
        
        // 如果令牌在5分钟内过期，则刷新
        if (timeUntilExpiry < this.config.session.refreshThreshold) {
          await this.refreshToken();
        }
      } catch (error) {
        console.error('自动刷新令牌失败:', error);
      }
    }, 5 * 60 * 1000); // 5分钟
  }

  /**
   * 监听页面可见性变化
   */
  setupVisibilityListener() {
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden && this.isAuthenticated()) {
        // 页面变为可见时检查认证状态
        await this.checkAuthStatus();
      }
    });
  }

  /**
   * 获取认证头
   */
  getAuthHeaders() {
    const accessToken = window.CasdoorAuth.TokenManager.getAccessToken();
    
    if (!accessToken) {
      return {};
    }

    return {
      'Authorization': `Bearer ${accessToken}`,
    };
  }

  /**
   * 发起认证请求
   */
  async authenticatedFetch(url, options = {}) {
    const authHeaders = this.getAuthHeaders();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...authHeaders,
      },
    });

    // 如果返回401，尝试刷新令牌
    if (response.status === 401) {
      try {
        await this.refreshToken();
        
        // 重新获取认证头并重试请求
        const newAuthHeaders = this.getAuthHeaders();
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            ...newAuthHeaders,
          },
        });
      } catch (error) {
        this.logout();
        throw error;
      }
    }

    return response;
  }

  /**
   * 事件监听器管理
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.eventListeners.has(event)) return;
    
    const listeners = this.eventListeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.eventListeners.has(event)) return;
    
    this.eventListeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`事件监听器执行失败 (${event}):`, error);
      }
    });
  }

  /**
   * 获取用户权限
   */
  async getUserPermissions() {
    try {
      const response = await this.authenticatedFetch(`${this.config.serverUrl}/api/get-permissions`);
      
      if (!response.ok) {
        throw new Error(`获取权限失败: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('获取用户权限失败:', error);
      return [];
    }
  }

  /**
   * 检查用户是否有特定权限
   */
  async hasPermission(permission) {
    try {
      const permissions = await this.getUserPermissions();
      return permissions.includes(permission);
    } catch (error) {
      console.error('检查权限失败:', error);
      return false;
    }
  }

  /**
   * 更新用户信息
   */
  async updateUserInfo(userInfo) {
    try {
      const response = await this.authenticatedFetch(`${this.config.serverUrl}/api/update-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userInfo),
      });

      if (!response.ok) {
        throw new Error(`更新用户信息失败: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status === 'ok') {
        // 更新本地存储的用户信息
        const storage = this.config.session.storage === 'localStorage' ? localStorage : sessionStorage;
        storage.setItem('casdoor_user', JSON.stringify(result.data));
        
        this.emit('userInfoUpdated', result.data);
        return result.data;
      } else {
        throw new Error(result.msg || '更新用户信息失败');
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  }
}

// 创建全局实例
window.CasdoorAuthService = CasdoorAuthService;

// 自动初始化（如果配置存在）
if (window.CasdoorConfig) {
  window.casdoorAuth = new CasdoorAuthService();
}