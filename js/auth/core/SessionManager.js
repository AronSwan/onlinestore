/**
 * SessionManager - 会话管理专职类
 * 职责: 用户会话的创建、验证、销毁
 * 符合单一职责原则(SRP)
 */
class SessionManager {
  constructor() {
    this.sessionKey = 'auth_session';
    this.tokenKey = 'auth_token';
    this.userKey = 'current_user';
  }

  /**
   * 创建用户会话
   * @param {Object} user - 用户信息
   * @param {string} token - 认证令牌
   */
  async createSession(user, token) {
    try {
      const sessionData = {
        user: user,
        token: token,
        createdAt: new Date().toISOString(),
        expiresAt: this.calculateExpirationTime(),
        isValid: true
      };

      // 存储会话数据
      localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
      localStorage.setItem(this.tokenKey, token);
      localStorage.setItem(this.userKey, JSON.stringify(user));

      console.log('Session created successfully');
      return sessionData;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw new Error('会话创建失败');
    }
  }

  /**
   * 获取当前会话
   * @returns {Object|null} 会话数据或null
   */
  getCurrentSession() {
    try {
      const sessionData = localStorage.getItem(this.sessionKey);
      if (!sessionData) {
        return null;
      }

      const session = JSON.parse(sessionData);

      // 检查会话是否过期
      if (this.isSessionExpired(session)) {
        this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to get current session:', error);
      this.clearSession(); // 清除损坏的会话数据
      return null;
    }
  }

  /**
   * 检查会话是否有效
   * @returns {boolean} 会话是否有效
   */
  isSessionValid() {
    const session = this.getCurrentSession();
    return session !== null && session.isValid && !this.isSessionExpired(session);
  }

  /**
   * 清除会话
   */
  clearSession() {
    try {
      localStorage.removeItem(this.sessionKey);
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      console.log('Session cleared successfully');
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  /**
   * 获取当前用户信息
   * @returns {Object|null} 用户信息或null
   */
  getCurrentUser() {
    try {
      const userData = localStorage.getItem(this.userKey);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * 获取认证令牌
   * @returns {string|null} 认证令牌或null
   */
  getAuthToken() {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * 更新会话过期时间
   */
  refreshSession() {
    const session = this.getCurrentSession();
    if (session) {
      session.expiresAt = this.calculateExpirationTime();
      localStorage.setItem(this.sessionKey, JSON.stringify(session));
    }
  }

  /**
   * 检查会话是否过期
   * @param {Object} session - 会话数据
   * @returns {boolean} 是否过期
   */
  isSessionExpired(session) {
    if (!session || !session.expiresAt) {
      return true;
    }
    return new Date() > new Date(session.expiresAt);
  }

  /**
   * 计算会话过期时间
   * @returns {string} ISO格式的过期时间
   */
  calculateExpirationTime() {
    const expirationHours = 24; // 24小时后过期
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + expirationHours);
    return expirationTime.toISOString();
  }

  /**
   * 销毁会话管理器
   */
  destroy() {
    this.clearSession();
    console.log('SessionManager destroyed');
  }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SessionManager;
}

// 浏览器环境下的全局暴露
if (typeof window !== 'undefined') {
  window.SessionManager = SessionManager;
}
