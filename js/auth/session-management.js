/**
 * 会话管理模块
 * 提供用户会话创建、验证、更新和销毁功能
 * 基于 design/auth_session_management.md 伪代码实现
 */

/**
 * 令牌生成器
 * 负责生成和验证各种类型的令牌
 */
class TokenGenerator {
  constructor() {
    this.secretKey = this.generateSecretKey();
    this.algorithm = 'HS256'; // 简化实现
  }

  /**
   * 生成会话ID
   * @returns {string} 会话ID
   */
  generateSessionId() {
    const timestamp = Date.now().toString(36);
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const randomString = Array.from(randomBytes, byte => byte.toString(36)).join('');
    return `${timestamp}_${randomString}`;
  }

  /**
   * 生成访问令牌
   * @param {Object} userData - 用户数据
   * @param {number} expiresIn - 过期时间（毫秒）
   * @returns {string} 访问令牌
   */
  generateAccessToken(userData, expiresIn = 30 * 60 * 1000) {
    const header = {
      alg: this.algorithm,
      typ: 'JWT'
    };

    const payload = {
      userId: userData.userId,
      username: userData.username,
      role: userData.role || 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + expiresIn) / 1000)
    };

    return this.createJWT(header, payload);
  }

  /**
   * 生成刷新令牌
   * @param {Object} userData - 用户数据
   * @param {number} expiresIn - 过期时间（毫秒）
   * @returns {string} 刷新令牌
   */
  generateRefreshToken(userData, expiresIn = 7 * 24 * 60 * 60 * 1000) {
    const header = {
      alg: this.algorithm,
      typ: 'JWT'
    };

    const payload = {
      userId: userData.userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + expiresIn) / 1000)
    };

    return this.createJWT(header, payload);
  }

  /**
   * 验证访问令牌
   * @param {string} token - 访问令牌
   * @param {Object} sessionData - 会话数据
   * @returns {boolean} 验证结果
   */
  verifyAccessToken(token, sessionData) {
    try {
      const decoded = this.verifyJWT(token);
      if (!decoded) {
        return false;
      }

      // 验证用户ID匹配
      if (decoded.userId !== sessionData.userId) {
        return false;
      }

      // 验证令牌未过期
      if (decoded.exp * 1000 < Date.now()) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('验证访问令牌失败:', error);
      return false;
    }
  }

  /**
   * 创建JWT令牌
   * @param {Object} header - 头部
   * @param {Object} payload - 载荷
   * @returns {string} JWT令牌
   */
  createJWT(header, payload) {
    const encodedHeader = btoa(JSON.stringify(header)).replace(/[+/=]/g, m => ({'+':'-','/':'_','=':''}[m]));
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/[+/=]/g, m => ({'+':'-','/':'_','=':''}[m]));
    const signature = this.createSignature(`${encodedHeader}.${encodedPayload}`);
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * 验证JWT令牌
   * @param {string} token - JWT令牌
   * @returns {Object|null} 解码后的载荷
   */
  verifyJWT(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const [header, payload, signature] = parts;
      const expectedSignature = this.createSignature(`${header}.${payload}`);

      if (signature !== expectedSignature) {
        return null;
      }

      const decodedPayload = JSON.parse(atob(payload.replace(/[-_]/g, m => ({'-':'+','_':'/'}[m]))));
      return decodedPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * 创建签名
   * @param {string} data - 待签名数据
   * @returns {string} 签名
   */
  createSignature(data) {
    // 简化的签名实现（生产环境应使用更安全的方法）
    const combined = data + this.secretKey;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 生成密钥
   * @returns {string} 密钥
   */
  generateSecretKey() {
    const KEY_LENGTH = 32;
    const array = new Uint8Array(KEY_LENGTH);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(36)).join('');
  }
}

/**
 * 会话存储器
 * 负责会话数据的持久化存储
 */
class SessionStore {
  constructor() {
    this.storage = localStorage; // 可配置为其他存储方式
    this.keyPrefix = 'auth_session_';
  }

  /**
   * 保存会话
   * @param {Object} sessionData - 会话数据
   * @returns {Promise<boolean>} 保存结果
   */
  async saveSession(sessionData) {
    try {
      const key = this.keyPrefix + sessionData.sessionId;
      this.storage.setItem(key, JSON.stringify(sessionData));

      // 更新用户会话索引
      await this.updateUserSessionIndex(sessionData.userId, sessionData.sessionId, 'add');

      return true;
    } catch (error) {
      console.error('保存会话失败:', error);
      return false;
    }
  }

  /**
   * 获取会话
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object|null>} 会话数据
   */
  async getSession(sessionId) {
    try {
      const key = this.keyPrefix + sessionId;
      const data = this.storage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('获取会话失败:', error);
      return null;
    }
  }

  /**
   * 更新会话
   * @param {string} sessionId - 会话ID
   * @param {Object} sessionData - 会话数据
   * @returns {Promise<boolean>} 更新结果
   */
  async updateSession(sessionId, sessionData) {
    try {
      const key = this.keyPrefix + sessionId;
      this.storage.setItem(key, JSON.stringify(sessionData));
      return true;
    } catch (error) {
      console.error('更新会话失败:', error);
      return false;
    }
  }

  /**
   * 删除会话
   * @param {string} sessionId - 会话ID
   * @returns {Promise<boolean>} 删除结果
   */
  async deleteSession(sessionId) {
    try {
      const sessionData = await this.getSession(sessionId);
      if (sessionData) {
        // 从用户会话索引中移除
        await this.updateUserSessionIndex(sessionData.userId, sessionId, 'remove');
      }

      const key = this.keyPrefix + sessionId;
      this.storage.removeItem(key);
      return true;
    } catch (error) {
      console.error('删除会话失败:', error);
      return false;
    }
  }

  /**
   * 获取用户的活跃会话
   * @param {string} userId - 用户ID
   * @returns {Promise<Array>} 会话列表
   */
  async getActiveSessions(userId) {
    try {
      const indexKey = `user_sessions_${userId}`;
      const sessionIds = JSON.parse(this.storage.getItem(indexKey) || '[]');

      const sessions = [];
      for (const sessionId of sessionIds) {
        const sessionData = await this.getSession(sessionId);
        if (sessionData && sessionData.isActive && Date.now() < sessionData.expiresAt) {
          sessions.push(sessionData);
        }
      }

      return sessions;
    } catch (error) {
      console.error('获取活跃会话失败:', error);
      return [];
    }
  }

  /**
   * 更新最后活动时间
   * @param {string} sessionId - 会话ID
   * @param {number} timestamp - 时间戳
   * @returns {Promise<boolean>} 更新结果
   */
  async updateLastActivity(sessionId, timestamp) {
    try {
      const sessionData = await this.getSession(sessionId);
      if (sessionData) {
        sessionData.lastActivity = timestamp;
        return await this.updateSession(sessionId, sessionData);
      }
      return false;
    } catch (error) {
      console.error('更新最后活动时间失败:', error);
      return false;
    }
  }

  /**
   * 清理过期会话
   * @param {string} userId - 用户ID（可选）
   * @returns {Promise<number>} 清理的会话数量
   */
  async cleanupExpiredSessions(userId = null) {
    try {
      let cleanedCount = 0;
      const now = Date.now();

      if (userId) {
        // 清理特定用户的过期会话
        const sessions = await this.getActiveSessions(userId);
        for (const session of sessions) {
          if (now > session.expiresAt) {
            await this.deleteSession(session.sessionId);
            cleanedCount++;
          }
        }
      } else {
        // 清理所有过期会话
        for (let i = 0; i < this.storage.length; i++) {
          const key = this.storage.key(i);
          if (key && key.startsWith(this.keyPrefix)) {
            try {
              const sessionData = JSON.parse(this.storage.getItem(key));
              if (now > sessionData.expiresAt) {
                const sessionId = key.replace(this.keyPrefix, '');
                await this.deleteSession(sessionId);
                cleanedCount++;
              }
            } catch (e) {
              // 忽略解析错误的数据
            }
          }
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('清理过期会话失败:', error);
      return 0;
    }
  }

  /**
   * 更新用户会话索引
   * @param {string} userId - 用户ID
   * @param {string} sessionId - 会话ID
   * @param {string} action - 操作类型（add/remove）
   * @returns {Promise<boolean>} 更新结果
   */
  async updateUserSessionIndex(userId, sessionId, action) {
    try {
      const indexKey = `user_sessions_${userId}`;
      let sessionIds = JSON.parse(this.storage.getItem(indexKey) || '[]');

      if (action === 'add') {
        if (!sessionIds.includes(sessionId)) {
          sessionIds.push(sessionId);
        }
      } else if (action === 'remove') {
        sessionIds = sessionIds.filter(id => id !== sessionId);
      }

      this.storage.setItem(indexKey, JSON.stringify(sessionIds));
      return true;
    } catch (error) {
      console.error('更新用户会话索引失败:', error);
      return false;
    }
  }
}

/**
 * 会话安全验证器
 * 负责会话的安全性检查
 */
class SessionSecurityValidator {
  constructor() {
    this.suspiciousActivityThreshold = 10; // 可疑活动阈值
    this.maxInactiveTime = 2 * 60 * 60 * 1000; // 最大非活跃时间（2小时）
  }

  /**
   * 验证会话安全性
   * @param {Object} sessionData - 会话数据
   * @returns {Promise<Object>} 验证结果
   */
  async validateSession(sessionData) {
    try {
      // 检查会话完整性
      if (!this.validateSessionIntegrity(sessionData)) {
        return {
          isValid: false,
          reason: '会话数据不完整'
        };
      }

      // 检查非活跃时间
      if (this.isSessionInactive(sessionData)) {
        return {
          isValid: false,
          reason: '会话非活跃时间过长'
        };
      }

      // 检查可疑活动
      if (await this.detectSuspiciousActivity(sessionData)) {
        return {
          isValid: false,
          reason: '检测到可疑活动'
        };
      }

      return {
        isValid: true,
        reason: '会话安全验证通过'
      };
    } catch (error) {
      console.error('会话安全验证失败:', error);
      return {
        isValid: false,
        reason: '安全验证过程出错'
      };
    }
  }

  /**
   * 验证会话数据完整性
   * @param {Object} sessionData - 会话数据
   * @returns {boolean} 验证结果
   */
  validateSessionIntegrity(sessionData) {
    const requiredFields = [
      'sessionId', 'userId', 'accessToken', 'createdAt',
      'lastActivity', 'expiresAt', 'isActive'
    ];

    return requiredFields.every(field =>
      Object.prototype.hasOwnProperty.call(sessionData, field) && sessionData[field] !== null
    );
  }

  /**
   * 检查会话是否非活跃时间过长
   * @param {Object} sessionData - 会话数据
   * @returns {boolean} 是否非活跃时间过长
   */
  isSessionInactive(sessionData) {
    const inactiveTime = Date.now() - sessionData.lastActivity;
    return inactiveTime > this.maxInactiveTime;
  }

  /**
   * 检测可疑活动
   * @param {Object} sessionData - 会话数据
   * @returns {Promise<boolean>} 是否存在可疑活动
   */
  async detectSuspiciousActivity(sessionData) {
    try {
      // 检查IP地址变化（简化实现）
      const storedIP = sessionData.ipAddress;
      const currentIP = await this.getCurrentIP();

      if (storedIP !== 'unknown' && currentIP !== 'unknown' && storedIP !== currentIP) {
        console.warn(`会话 ${sessionData.sessionId} IP地址发生变化: ${storedIP} -> ${currentIP}`);
        return true;
      }

      // 检查用户代理变化
      const storedUserAgent = sessionData.userAgent;
      const currentUserAgent = navigator.userAgent;

      if (storedUserAgent !== 'unknown' && storedUserAgent !== currentUserAgent) {
        console.warn(`会话 ${sessionData.sessionId} 用户代理发生变化`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('检测可疑活动失败:', error);
      return false;
    }
  }

  /**
   * 获取当前IP地址（模拟实现）
   * @returns {Promise<string>} IP地址
   */
  async getCurrentIP() {
    // 实际实现中应该调用API获取真实IP
    return 'unknown';
  }
}

/**
 * 会话管理器
 * 处理用户会话的完整生命周期管理
 */
class SessionManager {
  constructor() {
    this.tokenGenerator = new TokenGenerator();
    this.sessionStore = new SessionStore();
    this.securityValidator = new SessionSecurityValidator();

    // 会话配置
    this.config = {
      sessionTimeout: 30 * 60 * 1000, // 30分钟
      refreshThreshold: 5 * 60 * 1000, // 5分钟内自动刷新
      maxConcurrentSessions: 3, // 最大并发会话数
      secureOnly: true, // 仅HTTPS
      sameSite: 'strict' // CSRF保护
    };

    // 启动会话清理定时器
    this.startCleanupTimer();
  }

  /**
     * 创建新会话
     * @param {Object} userData - 用户数据
     * @param {Object} options - 会话选项
     * @returns {Promise<Object>} 会话信息
     */
  async createSession(userData, options = {}) {
    try {
      // 验证用户数据
      if (!userData || !userData.userId) {
        throw new Error('无效的用户数据');
      }

      // 检查并清理过期会话
      await this.cleanupExpiredSessions(userData.userId);

      // 检查并发会话限制
      const activeSessions = await this.sessionStore.getActiveSessions(userData.userId);
      if (activeSessions.length >= this.config.maxConcurrentSessions) {
        // 移除最旧的会话
        const oldestSession = activeSessions.sort((a, b) => a.createdAt - b.createdAt)[0];
        await this.destroySession(oldestSession.sessionId);
      }

      // 生成会话令牌
      const sessionId = this.tokenGenerator.generateSessionId();
      const accessToken = this.tokenGenerator.generateAccessToken(userData);
      const refreshToken = this.tokenGenerator.generateRefreshToken(userData);

      // 创建会话数据
      const sessionData = {
        sessionId,
        userId: userData.userId,
        username: userData.username,
        email: userData.email,
        role: userData.role || 'user',
        accessToken,
        refreshToken,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        expiresAt: Date.now() + this.config.sessionTimeout,
        ipAddress: options.ipAddress || 'unknown',
        userAgent: options.userAgent || 'unknown',
        deviceInfo: options.deviceInfo || {},
        permissions: userData.permissions || [],
        isActive: true
      };

      // 存储会话
      await this.sessionStore.saveSession(sessionData);

      // 设置客户端Cookie
      this.setSessionCookie(sessionId, accessToken);

      // 记录会话创建日志
      console.log(`会话已创建: ${sessionId} for user ${userData.userId}`);

      return {
        sessionId,
        accessToken,
        refreshToken,
        expiresAt: sessionData.expiresAt,
        user: {
          userId: userData.userId,
          username: userData.username,
          email: userData.email,
          role: userData.role
        }
      };
    } catch (error) {
      console.error('创建会话失败:', error);
      throw new Error(`会话创建失败: ${error.message}`);
    }
  }

  /**
     * 验证会话
     * @param {string} sessionId - 会话ID
     * @param {string} accessToken - 访问令牌
     * @returns {Promise<Object|null>} 会话数据或null
     */
  async validateSession(sessionId, accessToken) {
    try {
      if (!sessionId || !accessToken) {
        return null;
      }

      // 从存储中获取会话
      const sessionData = await this.sessionStore.getSession(sessionId);
      if (!sessionData) {
        return null;
      }

      // 检查会话是否过期
      if (Date.now() > sessionData.expiresAt) {
        await this.destroySession(sessionId);
        return null;
      }

      // 验证访问令牌
      if (!this.tokenGenerator.verifyAccessToken(accessToken, sessionData)) {
        console.warn(`无效的访问令牌: ${sessionId}`);
        return null;
      }

      // 安全验证
      const securityCheck = await this.securityValidator.validateSession(sessionData);
      if (!securityCheck.isValid) {
        console.warn(`会话安全验证失败: ${sessionId}, 原因: ${securityCheck.reason}`);
        await this.destroySession(sessionId);
        return null;
      }

      // 更新最后活动时间
      await this.updateLastActivity(sessionId);

      // 检查是否需要刷新令牌
      const timeUntilExpiry = sessionData.expiresAt - Date.now();
      if (timeUntilExpiry < this.config.refreshThreshold) {
        return await this.refreshSession(sessionId);
      }

      return {
        sessionId: sessionData.sessionId,
        userId: sessionData.userId,
        username: sessionData.username,
        email: sessionData.email,
        role: sessionData.role,
        permissions: sessionData.permissions,
        expiresAt: sessionData.expiresAt,
        lastActivity: sessionData.lastActivity
      };
    } catch (error) {
      console.error('验证会话失败:', error);
      return null;
    }
  }

  /**
     * 刷新会话
     * @param {string} sessionId - 会话ID
     * @returns {Promise<Object|null>} 新的会话信息
     */
  async refreshSession(sessionId) {
    try {
      const sessionData = await this.sessionStore.getSession(sessionId);
      if (!sessionData) {
        return null;
      }

      // 生成新的访问令牌
      const newAccessToken = this.tokenGenerator.generateAccessToken({
        userId: sessionData.userId,
        username: sessionData.username,
        role: sessionData.role
      });

      // 更新会话数据
      const updatedSession = {
        ...sessionData,
        accessToken: newAccessToken,
        lastActivity: Date.now(),
        expiresAt: Date.now() + this.config.sessionTimeout
      };

      await this.sessionStore.updateSession(sessionId, updatedSession);

      // 更新客户端Cookie
      this.setSessionCookie(sessionId, newAccessToken);

      console.log(`会话已刷新: ${sessionId}`);

      return {
        sessionId,
        accessToken: newAccessToken,
        expiresAt: updatedSession.expiresAt,
        refreshed: true
      };
    } catch (error) {
      console.error('刷新会话失败:', error);
      return null;
    }
  }

  /**
     * 销毁会话
     * @param {string} sessionId - 会话ID
     * @returns {Promise<boolean>} 销毁结果
     */
  async destroySession(sessionId) {
    try {
      if (!sessionId) {
        return false;
      }

      // 从存储中删除会话
      const result = await this.sessionStore.deleteSession(sessionId);

      // 清除客户端Cookie
      this.clearSessionCookie();

      console.log(`会话已销毁: ${sessionId}`);

      return result;
    } catch (error) {
      console.error('销毁会话失败:', error);
      return false;
    }
  }

  /**
     * 销毁用户的所有会话
     * @param {string} userId - 用户ID
     * @returns {Promise<number>} 销毁的会话数量
     */
  async destroyAllUserSessions(userId) {
    try {
      const sessions = await this.sessionStore.getActiveSessions(userId);
      let destroyedCount = 0;

      for (const session of sessions) {
        const result = await this.destroySession(session.sessionId);
        if (result) {
          destroyedCount++;
        }
      }

      console.log(`已销毁用户 ${userId} 的 ${destroyedCount} 个会话`);
      return destroyedCount;
    } catch (error) {
      console.error('销毁用户所有会话失败:', error);
      return 0;
    }
  }

  /**
     * 更新最后活动时间
     * @param {string} sessionId - 会话ID
     * @returns {Promise<boolean>} 更新结果
     */
  async updateLastActivity(sessionId) {
    try {
      return await this.sessionStore.updateLastActivity(sessionId, Date.now());
    } catch (error) {
      console.error('更新最后活动时间失败:', error);
      return false;
    }
  }

  /**
     * 获取用户活跃会话
     * @param {string} userId - 用户ID
     * @returns {Promise<Array>} 活跃会话列表
     */
  async getUserActiveSessions(userId) {
    try {
      const sessions = await this.sessionStore.getActiveSessions(userId);
      return sessions.map(session => ({
        sessionId: session.sessionId,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        deviceInfo: session.deviceInfo
      }));
    } catch (error) {
      console.error('获取用户活跃会话失败:', error);
      return [];
    }
  }

  /**
     * 设置会话Cookie
     * @param {string} sessionId - 会话ID
     * @param {string} accessToken - 访问令牌
     */
  setSessionCookie(sessionId, accessToken) {
    try {
      const cookieOptions = [
        `sessionId=${sessionId}`,
        `accessToken=${accessToken}`,
        `Max-Age=${this.config.sessionTimeout / 1000}`,
        'Path=/',
        'HttpOnly',
        `SameSite=${this.config.sameSite}`
      ];

      if (this.config.secureOnly && location.protocol === 'https:') {
        cookieOptions.push('Secure');
      }

      document.cookie = cookieOptions.join('; ');
    } catch (error) {
      console.error('设置会话Cookie失败:', error);
    }
  }

  /**
     * 清除会话Cookie
     */
  clearSessionCookie() {
    try {
      document.cookie = 'sessionId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    } catch (error) {
      console.error('清除会话Cookie失败:', error);
    }
  }

  /**
     * 清理过期会话
     * @param {string} userId - 用户ID（可选）
     * @returns {Promise<number>} 清理的会话数量
     */
  async cleanupExpiredSessions(userId = null) {
    try {
      return await this.sessionStore.cleanupExpiredSessions(userId);
    } catch (error) {
      console.error('清理过期会话失败:', error);
      return 0;
    }
  }

  /**
     * 启动会话清理定时器
     */
  startCleanupTimer() {
    // 每10分钟清理一次过期会话
    setInterval(async () => {
      try {
        const cleanedCount = await this.cleanupExpiredSessions();
        if (cleanedCount > 0) {
          console.log(`定时清理了 ${cleanedCount} 个过期会话`);
        }
      } catch (error) {
        console.error('定时清理会话失败:', error);
      }
    }, 10 * 60 * 1000);
  }

  /**
     * 获取当前会话
     * @returns {Promise<Object|null>} 当前会话数据或null
     */
  async getCurrentSession() {
    try {
      // 从Cookie中获取会话信息
      const sessionId = this.getSessionIdFromCookie();
      const accessToken = this.getAccessTokenFromCookie();

      if (!sessionId || !accessToken) {
        return null;
      }

      // 验证会话
      return await this.validateSession(sessionId, accessToken);
    } catch (error) {
      console.error('获取当前会话失败:', error);
      return null;
    }
  }

  /**
     * 从Cookie中获取会话ID
     * @returns {string|null} 会话ID
     */
  getSessionIdFromCookie() {
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'sessionId') {
          return value;
        }
      }
      return null;
    } catch (error) {
      console.error('获取会话ID失败:', error);
      return null;
    }
  }

  /**
     * 从Cookie中获取访问令牌
     * @returns {string|null} 访问令牌
     */
  getAccessTokenFromCookie() {
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'accessToken') {
          return value;
        }
      }
      return null;
    } catch (error) {
      console.error('获取访问令牌失败:', error);
      return null;
    }
  }

  /**
     * 清理会话管理器
     * 停止定时器并清理资源
     */
  cleanup() {
    // 停止清理定时器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // 清理过期会话
    this.cleanupExpiredSessions();

    console.log('会话管理器已清理');
  }
}

// TokenGenerator class and other classes moved to top of file

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SessionManager,
    TokenGenerator,
    SessionStore,
    SessionSecurityValidator
  };
} else {
  window.SessionManager = SessionManager;
  window.TokenGenerator = TokenGenerator;
  window.SessionStore = SessionStore;
  window.SessionSecurityValidator = SessionSecurityValidator;
}
