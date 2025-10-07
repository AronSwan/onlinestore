/**
 * Casdoor 认证配置
 * 基于 Casdoor 开源身份认证平台的配置文件
 */
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 修改者：AI助手
// 修改时间：2025-06-18 10:30:00
// 用途：提供Casdoor认证服务的配置参数，包括服务器配置、OAuth2/OIDC设置、UI主题和安全选项
// 依赖文件：navigation-state-manager.js (通过window.navStateManager使用)
// 作者：AI Assistant
// 时间：2025-09-27 11:50:59

// Casdoor 配置对象
const CasdoorConfig = {
  // 服务器配置
  serverUrl: "https://door.casdoor.com", // 默认 Casdoor 服务器，可配置为自建实例
  clientId: "reich-shopping-site", // 应用客户端ID
  organizationName: "built-in", // 组织名称
  applicationName: "reich-app", // 应用名称
  
  // OAuth2/OIDC 配置
  redirectUri: window.location.origin + "/login-callback.html", // 回调地址
  scope: "openid profile email", // 权限范围
  responseType: "code", // 响应类型：code（推荐）或 token
  
  // 安全配置
  enablePKCE: true, // 启用 PKCE（推荐用于公共客户端）
  state: null, // 状态参数，用于防止 CSRF 攻击
  nonce: null, // 随机数，用于防止重放攻击
  
  // UI 配置
  theme: {
    primaryColor: "#2c2c2c", // Reich 主色（深黑）
    secondaryColor: "#d4af37", // 金色
    accentColor: "#8c1c13", // 强调色（酒红）
    borderRadius: "8px",
    fontFamily: "'Playfair Display', serif",
  },
  
  // 支持的登录方式
  signinMethods: [
    { name: "Password", enabled: true, displayName: "密码登录" },
    { name: "Verification code", enabled: true, displayName: "验证码登录" },
    { name: "WebAuthn", enabled: true, displayName: "生物识别" },
    { name: "OAuth", enabled: true, displayName: "第三方登录" },
  ],
  
  // 第三方登录提供商配置
  providers: [
    { name: "Google", enabled: true, icon: "fab fa-google" },
    { name: "Facebook", enabled: true, icon: "fab fa-facebook" },
    { name: "WeChat", enabled: true, icon: "fab fa-weixin" },
    { name: "QQ", enabled: true, icon: "fab fa-qq" },
    { name: "Weibo", enabled: true, icon: "fab fa-weibo" },
    { name: "Twitter", enabled: true, icon: "fab fa-twitter" },
    { name: "Apple", enabled: true, icon: "fab fa-apple" },
    { name: "Microsoft", enabled: true, icon: "fab fa-microsoft" } // Font Awesome 4.7.0 使用 fa-windows 代替 fa-microsoft
  ],
  
  // 本地化配置
  language: "zh-CN",
  
  // 开发模式配置
  debug: false,
  
  // 会话配置
  session: {
    timeout: 24 * 60 * 60 * 1000, // 24小时
    refreshThreshold: 5 * 60 * 1000, // 5分钟前刷新
    storage: "localStorage", // localStorage 或 sessionStorage
  },
};

// PKCE 工具函数
const PKCEUtils = {
  // 生成随机字符串
  generateRandomString(length = 128) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    
    for (let i = 0; i < length; i++) {
      result += charset[randomValues[i] % charset.length];
    }
    return result;
  },
  
  // 生成 code verifier
  generateCodeVerifier() {
    return this.generateRandomString(128);
  },
  
  // 生成 code challenge
  async generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    
    // 转换为 base64url
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  },
};

// 状态管理工具
const StateManager = {
  // 生成状态参数
  generateState() {
    return PKCEUtils.generateRandomString(32);
  },
  
  // 生成 nonce
  generateNonce() {
    return PKCEUtils.generateRandomString(32);
  },
  
  // 存储认证状态
  storeAuthState(state, verifier, nonce) {
    const authState = {
      state,
      codeVerifier: verifier,
      nonce,
      timestamp: Date.now(),
    };
    
    sessionStorage.setItem('casdoor_auth_state', JSON.stringify(authState));
  },
  
  // 获取认证状态
  getAuthState() {
    const stored = sessionStorage.getItem('casdoor_auth_state');
    if (!stored) return null;
    
    try {
      const authState = JSON.parse(stored);
      // 检查是否过期（10分钟）
      if (Date.now() - authState.timestamp > 10 * 60 * 1000) {
        this.clearAuthState();
        return null;
      }
      return authState;
    } catch (error) {
      console.error('解析认证状态失败:', error);
      this.clearAuthState();
      return null;
    }
  },
  
  // 清除认证状态
  clearAuthState() {
    sessionStorage.removeItem('casdoor_auth_state');
  },
};

// URL 构建工具
const URLBuilder = {
  // 构建授权 URL
  async buildAuthUrl(config = CasdoorConfig) {
    const state = StateManager.generateState();
    const nonce = StateManager.generateNonce();
    
    let authUrl = `${config.serverUrl}/login/oauth/authorize`;
    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: config.responseType,
      redirect_uri: config.redirectUri,
      scope: config.scope,
      state: state,
      nonce: nonce,
    });
    
    // 如果启用 PKCE
    if (config.enablePKCE && config.responseType === 'code') {
      const codeVerifier = PKCEUtils.generateCodeVerifier();
      const codeChallenge = await PKCEUtils.generateCodeChallenge(codeVerifier);
      
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
      
      // 存储状态
      StateManager.storeAuthState(state, codeVerifier, nonce);
    } else {
      StateManager.storeAuthState(state, null, nonce);
    }
    
    return `${authUrl}?${params.toString()}`;
  },
  
  // 构建第三方登录 URL
  buildProviderUrl(providerName, config = CasdoorConfig) {
    return `${config.serverUrl}/login/oauth/authorize/${config.organizationName}/${config.applicationName}?provider=${providerName}`;
  },
};

// 令牌管理
const TokenManager = {
  // 交换授权码获取令牌
  async exchangeCodeForToken(code, config = CasdoorConfig) {
    const authState = StateManager.getAuthState();
    if (!authState) {
      throw new Error('认证状态已过期，请重新登录');
    }
    
    const tokenUrl = `${config.serverUrl}/api/login/oauth/access_token`;
    const body = {
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code: code,
      redirect_uri: config.redirectUri,
    };
    
    // 如果使用 PKCE
    if (authState.codeVerifier) {
      body.code_verifier = authState.codeVerifier;
    }
    
    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`令牌交换失败: ${response.status} ${response.statusText}`);
      }
      
      const tokenData = await response.json();
      
      // 验证状态参数
      if (tokenData.state !== authState.state) {
        throw new Error('状态参数不匹配，可能存在安全风险');
      }
      
      // 存储令牌
      this.storeTokens(tokenData);
      
      // 清除认证状态
      StateManager.clearAuthState();
      
      return tokenData;
    } catch (error) {
      console.error('令牌交换失败:', error);
      throw error;
    }
  },
  
  // 存储令牌
  storeTokens(tokenData) {
    const storage = CasdoorConfig.session.storage === 'localStorage' ? localStorage : sessionStorage;
    
    const tokenInfo = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      idToken: tokenData.id_token,
      tokenType: tokenData.token_type || 'Bearer',
      expiresIn: tokenData.expires_in,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
      scope: tokenData.scope,
    };
    
    storage.setItem('casdoor_tokens', JSON.stringify(tokenInfo));
  },
  
  // 获取访问令牌
  getAccessToken() {
    const storage = CasdoorConfig.session.storage === 'localStorage' ? localStorage : sessionStorage;
    const stored = storage.getItem('casdoor_tokens');
    
    if (!stored) return null;
    
    try {
      const tokenInfo = JSON.parse(stored);
      
      // 检查是否过期
      if (Date.now() >= tokenInfo.expiresAt) {
        this.clearTokens();
        return null;
      }
      
      return tokenInfo.accessToken;
    } catch (error) {
      console.error('解析令牌失败:', error);
      this.clearTokens();
      return null;
    }
  },
  
  // 清除令牌
  clearTokens() {
    const storage = CasdoorConfig.session.storage === 'localStorage' ? localStorage : sessionStorage;
    storage.removeItem('casdoor_tokens');
  },
  
  // 刷新令牌
  async refreshToken() {
    const storage = CasdoorConfig.session.storage === 'localStorage' ? localStorage : sessionStorage;
    const stored = storage.getItem('casdoor_tokens');
    
    if (!stored) return null;
    
    try {
      const tokenInfo = JSON.parse(stored);
      
      if (!tokenInfo.refreshToken) {
        throw new Error('没有刷新令牌');
      }
      
      const response = await fetch(`${CasdoorConfig.serverUrl}/api/login/oauth/refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: tokenInfo.refreshToken,
          client_id: CasdoorConfig.clientId,
        }),
      });
      
      if (!response.ok) {
        throw new Error('刷新令牌失败');
      }
      
      const newTokenData = await response.json();
      this.storeTokens(newTokenData);
      
      return newTokenData.access_token;
    } catch (error) {
      console.error('刷新令牌失败:', error);
      this.clearTokens();
      throw error;
    }
  },
};

// 用户信息管理
const UserManager = {
  // 获取用户信息
  async getUserInfo() {
    const accessToken = TokenManager.getAccessToken();
    if (!accessToken) {
      throw new Error('未找到访问令牌');
    }
    
    try {
      const response = await fetch(`${CasdoorConfig.serverUrl}/api/get-account`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`获取用户信息失败: ${response.status}`);
      }
      
      const userData = await response.json();
      
      if (userData.status === 'ok') {
        // 存储用户信息
        const storage = CasdoorConfig.session.storage === 'localStorage' ? localStorage : sessionStorage;
        storage.setItem('casdoor_user', JSON.stringify(userData.data));
        return userData.data;
      } else {
        throw new Error(userData.msg || '获取用户信息失败');
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw error;
    }
  },
  
  // 获取存储的用户信息
  getStoredUserInfo() {
    const storage = CasdoorConfig.session.storage === 'localStorage' ? localStorage : sessionStorage;
    const stored = storage.getItem('casdoor_user');
    
    if (!stored) return null;
    
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('解析用户信息失败:', error);
      return null;
    }
  },
  
  // 清除用户信息
  clearUserInfo() {
    const storage = CasdoorConfig.session.storage === 'localStorage' ? localStorage : sessionStorage;
    storage.removeItem('casdoor_user');
  },
};

// 导出配置和工具
window.CasdoorConfig = CasdoorConfig;
window.CasdoorAuth = {
  PKCEUtils,
  StateManager,
  URLBuilder,
  TokenManager,
  UserManager,
};