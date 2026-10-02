/**
 * 安全管理服务
 * 提供身份认证、授权、访问控制和安全审计功能
 */

const axios = require('axios');
const { EventEmitter } = require('events');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class SecurityManagementService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // 统一环境适配器（若 dist 存在则使用，否则回退 env）
    let adapterOO = null;
    try {
      const { EnvironmentAdapter } = require('../dist/src/config/environment-adapter.js');
      adapterOO = EnvironmentAdapter && typeof EnvironmentAdapter.getOpenObserve === 'function'
        ? EnvironmentAdapter.getOpenObserve()
        : null;
    } catch (_) {}

    this.config = {
      openobserveUrl: (adapterOO && adapterOO.baseUrl) || config.openobserveUrl || 'http://localhost:5080',
      organization: (adapterOO && adapterOO.organization) || config.organization || 'default',
      token: (adapterOO && adapterOO.token) || config.token || '',
      auditLogStream: config.auditLogStream || 'security-audit-log',
      accessControlStream: config.accessControlStream || 'access-control',
      jwtSecret: config.jwtSecret || crypto.randomBytes(64).toString('hex'),
      jwtExpiration: config.jwtExpiration || '24h',
      refreshTokenExpiration: config.refreshTokenExpiration || '7d',
      enableMFA: config.enableMFA || false,
      maxLoginAttempts: config.maxLoginAttempts || 5,
      lockoutDuration: config.lockoutDuration || 900000, // 15分钟
      sessionTimeout: config.sessionTimeout || 3600000, // 1小时
      passwordPolicy: {
        minLength: config.passwordPolicy?.minLength || 8,
        requireUppercase: config.passwordPolicy?.requireUppercase !== false,
        requireLowercase: config.passwordPolicy?.requireLowercase !== false,
        requireNumbers: config.passwordPolicy?.requireNumbers !== false,
        requireSpecialChars: config.passwordPolicy?.requireSpecialChars !== false,
        preventReuse: config.passwordPolicy?.preventReuse || 5
      },
      ...config
    };
    
    this.isInitialized = false;
    this.users = new Map();
    this.roles = new Map();
    this.permissions = new Map();
    this.sessions = new Map();
    this.loginAttempts = new Map();
    this.auditLogs = [];
    
    // 初始化默认角色和权限
    this.initializeDefaultRoles();
  }

  /**
   * 初始化安全管理服务
   */
  async initialize() {
    try {
      // 验证OpenObserve连接
      await this.verifyConnection();
      
      // 创建安全数据流
      await this.createSecurityStreams();
      
      // 加载用户和角色数据
      await this.loadUsersAndRoles();
      
      // 启动会话清理
      this.startSessionCleanup();
      
      this.isInitialized = true;
      console.log('🔒 安全管理服务已初始化');
      
    } catch (error) {
      console.error('安全管理服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 验证OpenObserve连接
   */
  async verifyConnection() {
    const response = await axios.get(`${this.config.openobserveUrl}/health`, {
      timeout: 5000
    });
    
    if (response.status !== 200) {
      throw new Error(`OpenObserve连接失败: ${response.status}`);
    }
  }

  /**
   * 创建安全数据流
   */
  async createSecurityStreams() {
    const streams = [
      {
        name: this.config.auditLogStream,
        type: 'logs',
        retention: '365d',
        description: '安全审计日志'
      },
      {
        name: this.config.accessControlStream,
        type: 'logs',
        retention: '90d',
        description: '访问控制日志'
      }
    ];

    for (const stream of streams) {
      try {
        await axios.post(
          `${this.config.openobserveUrl}/api/${this.config.organization}/streams`,
          stream,
          {
            headers: {
              'Authorization': `Bearer ${this.config.token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log(`✅ 安全数据流创建成功: ${stream.name}`);
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`ℹ️ 安全数据流已存在: ${stream.name}`);
        } else {
          throw new Error(`创建安全数据流失败 ${stream.name}: ${error.message}`);
        }
      }
    }
  }

  /**
   * 初始化默认角色和权限
   */
  initializeDefaultRoles() {
    // 定义权限
    const permissions = [
      { id: 'user.read', name: '读取用户信息', description: '查看用户基本信息' },
      { id: 'user.write', name: '修改用户信息', description: '修改用户基本信息' },
      { id: 'user.delete', name: '删除用户', description: '删除用户账户' },
      { id: 'role.read', name: '读取角色信息', description: '查看角色信息' },
      { id: 'role.write', name: '修改角色信息', description: '修改角色信息' },
      { id: 'role.delete', name: '删除角色', description: '删除角色' },
      { id: 'permission.read', name: '读取权限信息', description: '查看权限信息' },
      { id: 'permission.write', name: '修改权限信息', description: '修改权限信息' },
      { id: 'audit.read', name: '读取审计日志', description: '查看安全审计日志' },
      { id: 'data.read', name: '读取数据', description: '查看系统数据' },
      { id: 'data.write', name: '写入数据', description: '修改系统数据' },
      { id: 'data.delete', name: '删除数据', description: '删除系统数据' },
      { id: 'system.admin', name: '系统管理', description: '系统管理权限' }
    ];
    
    permissions.forEach(permission => {
      this.permissions.set(permission.id, permission);
    });
    
    // 定义角色
    const roles = [
      {
        id: 'super_admin',
        name: '超级管理员',
        description: '拥有所有权限的系统管理员',
        permissions: Array.from(this.permissions.keys())
      },
      {
        id: 'admin',
        name: '管理员',
        description: '拥有大部分管理权限的管理员',
        permissions: [
          'user.read', 'user.write', 'user.delete',
          'role.read', 'role.write',
          'permission.read',
          'audit.read',
          'data.read', 'data.write', 'data.delete'
        ]
      },
      {
        id: 'analyst',
        name: '分析师',
        description: '数据分析师，可以查看和分析数据',
        permissions: [
          'user.read',
          'data.read'
        ]
      },
      {
        id: 'viewer',
        name: '查看者',
        description: '只能查看基本信息的普通用户',
        permissions: [
          'data.read'
        ]
      }
    ];
    
    roles.forEach(role => {
      this.roles.set(role.id, role);
    });
    
    console.log(`🔑 已初始化 ${permissions.length} 个权限和 ${roles.length} 个角色`);
  }

  /**
   * 加载用户和角色数据
   */
  async loadUsersAndRoles() {
    try {
      // 创建默认管理员用户
      const adminUser = {
        id: 'admin',
        username: 'admin',
        email: 'admin@example.com',
        passwordHash: this.hashPassword(process.env.ADMIN_INITIAL_PASSWORD || 'CHANGE_ME_admin_initial_password'),
        roles: ['super_admin'],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastLoginAt: null,
        mfaEnabled: false
      };
      
      this.users.set(adminUser.id, adminUser);
      console.log('👤 已创建默认管理员用户');
      
      // 这里可以从数据库或文件加载更多用户
      // 简化实现，只使用内存存储
      
    } catch (error) {
      console.warn('⚠️ 加载用户和角色数据失败:', error.message);
    }
  }

  /**
   * 用户认证
   */
  async authenticateUser(username, password, mfaToken = null) {
    const clientIp = 'unknown'; // 实际应该从请求中获取
    const userAgent = 'unknown'; // 实际应该从请求中获取
    
    try {
      // 记录登录尝试
      await this.logAuditEvent('user_login_attempt', {
        username,
        clientIp,
        userAgent,
        timestamp: Date.now()
      });
      
      // 检查用户是否被锁定
      if (this.isUserLocked(username)) {
        await this.logAuditEvent('user_login_blocked', {
          username,
          reason: 'account_locked',
          clientIp,
          userAgent,
          timestamp: Date.now()
        });
        
        throw new Error('账户已被锁定，请稍后再试');
      }
      
      // 查找用户
      const user = Array.from(this.users.values()).find(u => u.username === username);
      if (!user) {
        await this.recordFailedLogin(username);
        throw new Error('用户名或密码错误');
      }
      
      // 检查用户是否激活
      if (!user.isActive) {
        await this.logAuditEvent('user_login_failed', {
          userId: user.id,
          username,
          reason: 'account_inactive',
          clientIp,
          userAgent,
          timestamp: Date.now()
        });
        
        throw new Error('账户已被禁用');
      }
      
      // 验证密码
      if (!this.verifyPassword(password, user.passwordHash)) {
        await this.recordFailedLogin(username);
        throw new Error('用户名或密码错误');
      }
      
      // 检查MFA
      if (user.mfaEnabled && this.config.enableMFA) {
        if (!mfaToken || !this.verifyMFAToken(user.id, mfaToken)) {
          await this.logAuditEvent('user_login_failed', {
            userId: user.id,
            username,
            reason: 'invalid_mfa_token',
            clientIp,
            userAgent,
            timestamp: Date.now()
          });
          
          throw new Error('多因素认证失败');
        }
      }
      
      // 清除登录失败记录
      this.clearFailedLoginAttempts(username);
      
      // 更新最后登录时间
      user.lastLoginAt = Date.now();
      
      // 创建会话
      const session = this.createSession(user);
      
      // 记录成功登录
      await this.logAuditEvent('user_login_success', {
        userId: user.id,
        username,
        sessionId: session.id,
        clientIp,
        userAgent,
        timestamp: Date.now()
      });
      
      // 发出事件
      this.emit('userAuthenticated', { user, session });
      
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles,
          lastLoginAt: user.lastLoginAt
        },
        tokens: {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresIn: this.config.jwtExpiration
        }
      };
      
    } catch (error) {
      await this.logAuditEvent('user_login_failed', {
        username,
        error: error.message,
        clientIp,
        userAgent,
        timestamp: Date.now()
      });
      
      throw error;
    }
  }

  /**
   * 刷新令牌
   */
  async refreshToken(refreshToken) {
    try {
      // 验证刷新令牌
      const decoded = jwt.verify(refreshToken, this.config.jwtSecret);
      
      // 查找会话
      const session = this.sessions.get(decoded.sessionId);
      if (!session || session.refreshToken !== refreshToken) {
        throw new Error('无效的刷新令牌');
      }
      
      // 检查会话是否过期
      if (Date.now() > session.expiresAt) {
        this.sessions.delete(decoded.sessionId);
        throw new Error('会话已过期');
      }
      
      // 查找用户
      const user = this.users.get(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('用户不存在或已被禁用');
      }
      
      // 创建新会话
      const newSession = this.createSession(user);
      
      // 删除旧会话
      this.sessions.delete(decoded.sessionId);
      
      // 记录令牌刷新
      await this.logAuditEvent('token_refreshed', {
        userId: user.id,
        username: user.username,
        oldSessionId: decoded.sessionId,
        newSessionId: newSession.id,
        timestamp: Date.now()
      });
      
      return {
        tokens: {
          accessToken: newSession.accessToken,
          refreshToken: newSession.refreshToken,
          expiresIn: this.config.jwtExpiration
        }
      };
      
    } catch (error) {
      await this.logAuditEvent('token_refresh_failed', {
        error: error.message,
        timestamp: Date.now()
      });
      
      throw error;
    }
  }

  /**
   * 用户登出
   */
  async logoutUser(accessToken) {
    try {
      // 验证访问令牌
      const decoded = jwt.verify(accessToken, this.config.jwtSecret);
      
      // 查找会话
      const session = this.sessions.get(decoded.sessionId);
      if (session) {
        // 查找用户
        const user = this.users.get(decoded.userId);
        
        // 删除会话
        this.sessions.delete(decoded.sessionId);
        
        // 记录登出
        await this.logAuditEvent('user_logout', {
          userId: decoded.userId,
          username: user ? user.username : 'unknown',
          sessionId: decoded.sessionId,
          timestamp: Date.now()
        });
        
        // 发出事件
        this.emit('userLoggedOut', { userId: decoded.userId, sessionId: decoded.sessionId });
      }
      
      return { success: true };
      
    } catch (error) {
      await this.logAuditEvent('user_logout_failed', {
        error: error.message,
        timestamp: Date.now()
      });
      
      throw error;
    }
  }

  /**
   * 创建用户
   */
  async createUser(userData, createdBy) {
    try {
      // 验证密码策略
      if (!this.validatePassword(userData.password)) {
        throw new Error('密码不符合安全策略');
      }
      
      // 检查用户名是否已存在
      const existingUser = Array.from(this.users.values()).find(u => u.username === userData.username);
      if (existingUser) {
        throw new Error('用户名已存在');
      }
      
      // 检查邮箱是否已存在
      const existingEmail = Array.from(this.users.values()).find(u => u.email === userData.email);
      if (existingEmail) {
        throw new Error('邮箱已存在');
      }
      
      // 创建用户
      const user = {
        id: this.generateId(),
        username: userData.username,
        email: userData.email,
        passwordHash: this.hashPassword(userData.password),
        roles: userData.roles || ['viewer'],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastLoginAt: null,
        mfaEnabled: userData.mfaEnabled || false
      };
      
      // 保存用户
      this.users.set(user.id, user);
      
      // 记录创建用户
      await this.logAuditEvent('user_created', {
        userId: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        createdBy,
        timestamp: Date.now()
      });
      
      // 发出事件
      this.emit('userCreated', { user, createdBy });
      
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        isActive: user.isActive,
        createdAt: user.createdAt
      };
      
    } catch (error) {
      await this.logAuditEvent('user_creation_failed', {
        username: userData.username,
        email: userData.email,
        error: error.message,
        createdBy,
        timestamp: Date.now()
      });
      
      throw error;
    }
  }

  /**
   * 更新用户
   */
  async updateUser(userId, userData, updatedBy) {
    try {
      // 查找用户
      const user = this.users.get(userId);
      if (!user) {
        throw new Error('用户不存在');
      }
      
      // 检查用户名是否已被其他用户使用
      if (userData.username && userData.username !== user.username) {
        const existingUser = Array.from(this.users.values()).find(u => u.username === userData.username);
        if (existingUser) {
          throw new Error('用户名已存在');
        }
      }
      
      // 检查邮箱是否已被其他用户使用
      if (userData.email && userData.email !== user.email) {
        const existingEmail = Array.from(this.users.values()).find(u => u.email === userData.email);
        if (existingEmail) {
          throw new Error('邮箱已存在');
        }
      }
      
      // 更新密码
      if (userData.password) {
        if (!this.validatePassword(userData.password)) {
          throw new Error('密码不符合安全策略');
        }
        user.passwordHash = this.hashPassword(userData.password);
      }
      
      // 更新其他字段
      const oldUserData = { ...user };
      if (userData.username) user.username = userData.username;
      if (userData.email) user.email = userData.email;
      if (userData.roles) user.roles = userData.roles;
      if (userData.isActive !== undefined) user.isActive = userData.isActive;
      if (userData.mfaEnabled !== undefined) user.mfaEnabled = userData.mfaEnabled;
      
      user.updatedAt = Date.now();
      
      // 记录更新用户
      await this.logAuditEvent('user_updated', {
        userId,
        username: user.username,
        changes: this.getUserChanges(oldUserData, userData),
        updatedBy,
        timestamp: Date.now()
      });
      
      // 发出事件
      this.emit('userUpdated', { user, updatedBy, changes: userData });
      
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        isActive: user.isActive,
        updatedAt: user.updatedAt
      };
      
    } catch (error) {
      await this.logAuditEvent('user_update_failed', {
        userId,
        error: error.message,
        updatedBy,
        timestamp: Date.now()
      });
      
      throw error;
    }
  }

  /**
   * 删除用户
   */
  async deleteUser(userId, deletedBy) {
    try {
      // 查找用户
      const user = this.users.get(userId);
      if (!user) {
        throw new Error('用户不存在');
      }
      
      // 不能删除超级管理员
      if (user.roles.includes('super_admin')) {
        throw new Error('不能删除超级管理员');
      }
      
      // 删除用户的所有会话
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.userId === userId) {
          this.sessions.delete(sessionId);
        }
      }
      
      // 保存用户信息用于审计
      const deletedUser = { ...user };
      
      // 删除用户
      this.users.delete(userId);
      
      // 记录删除用户
      await this.logAuditEvent('user_deleted', {
        userId,
        username: deletedUser.username,
        email: deletedUser.email,
        roles: deletedUser.roles,
        deletedBy,
        timestamp: Date.now()
      });
      
      // 发出事件
      this.emit('userDeleted', { user: deletedUser, deletedBy });
      
      return { success: true };
      
    } catch (error) {
      await this.logAuditEvent('user_deletion_failed', {
        userId,
        error: error.message,
        deletedBy,
        timestamp: Date.now()
      });
      
      throw error;
    }
  }

  /**
   * 检查权限
   */
  async checkPermission(userId, permission, resource = null) {
    try {
      // 查找用户
      const user = this.users.get(userId);
      if (!user || !user.isActive) {
        return false;
      }
      
      // 检查用户角色权限
      for (const roleId of user.roles) {
        const role = this.roles.get(roleId);
        if (role && role.permissions.includes(permission)) {
          // 记录权限检查成功
          await this.logAccessControlEvent('permission_granted', {
            userId,
            username: user.username,
            permission,
            resource,
            roles: user.roles,
            timestamp: Date.now()
          });
          
          return true;
        }
      }
      
      // 记录权限检查失败
      await this.logAccessControlEvent('permission_denied', {
        userId,
        username: user.username,
        permission,
        resource,
        roles: user.roles,
        timestamp: Date.now()
      });
      
      return false;
      
    } catch (error) {
      await this.logAccessControlEvent('permission_check_failed', {
        userId,
        permission,
        resource,
        error: error.message,
        timestamp: Date.now()
      });
      
      return false;
    }
  }

  /**
   * 创建会话
   */
  createSession(user) {
    const sessionId = this.generateId();
    const now = Date.now();
    
    // 创建JWT令牌
    const accessTokenPayload = {
      userId: user.id,
      username: user.username,
      roles: user.roles,
      sessionId,
      type: 'access'
    };
    
    const refreshTokenPayload = {
      userId: user.id,
      sessionId,
      type: 'refresh'
    };
    
    const accessToken = jwt.sign(accessTokenPayload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiration
    });
    
    const refreshToken = jwt.sign(refreshTokenPayload, this.config.jwtSecret, {
      expiresIn: this.config.refreshTokenExpiration
    });
    
    // 创建会话对象
    const session = {
      id: sessionId,
      userId: user.id,
      username: user.username,
      roles: user.roles,
      accessToken,
      refreshToken,
      createdAt: now,
      expiresAt: now + this.parseExpiration(this.config.jwtExpiration),
      lastAccessAt: now
    };
    
    // 保存会话
    this.sessions.set(sessionId, session);
    
    return session;
  }

  /**
   * 启动会话清理
   */
  startSessionCleanup() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // 每分钟清理一次过期会话
    
    console.log('🧹 会话清理已启动');
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 已清理 ${cleanedCount} 个过期会话`);
    }
  }

  /**
   * 记录失败登录
   */
  async recordFailedLogin(username) {
    const now = Date.now();
    const attempts = this.loginAttempts.get(username) || { count: 0, firstAttempt: now };
    
    attempts.count++;
    attempts.lastAttempt = now;
    
    this.loginAttempts.set(username, attempts);
    
    // 检查是否需要锁定账户
    if (attempts.count >= this.config.maxLoginAttempts) {
      await this.logAuditEvent('account_locked', {
        username,
        attempts: attempts.count,
        lockoutDuration: this.config.lockoutDuration,
        timestamp: now
      });
    }
  }

  /**
   * 清除登录失败记录
   */
  clearFailedLoginAttempts(username) {
    this.loginAttempts.delete(username);
  }

  /**
   * 检查用户是否被锁定
   */
  isUserLocked(username) {
    const attempts = this.loginAttempts.get(username);
    if (!attempts) return false;
    
    // 如果尝试次数超过限制，检查是否还在锁定期内
    if (attempts.count >= this.config.maxLoginAttempts) {
      const lockUntil = attempts.lastAttempt + this.config.lockoutDuration;
      return Date.now() < lockUntil;
    }
    
    return false;
  }

  /**
   * 验证密码
   */
  verifyPassword(password, hash) {
    return crypto.pbkdf2Sync(password, hash.split(':')[0], 10000, 64, 'sha512').toString('hex') === hash.split(':')[1];
  }

  /**
   * 哈希密码
   */
  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * 验证密码策略
   */
  validatePassword(password) {
    const policy = this.config.passwordPolicy;
    
    // 检查长度
    if (password.length < policy.minLength) {
      return false;
    }
    
    // 检查大写字母
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      return false;
    }
    
    // 检查小写字母
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      return false;
    }
    
    // 检查数字
    if (policy.requireNumbers && !/\d/.test(password)) {
      return false;
    }
    
    // 检查特殊字符
    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return false;
    }
    
    return true;
  }

  /**
   * 验证MFA令牌
   */
  verifyMFAToken(userId, token) {
    // 简化实现，实际应该集成TOTP或其他MFA方法
    return token === '123456'; // 模拟验证码
  }

  /**
   * 记录审计事件
   */
  async logAuditEvent(eventType, eventData) {
    try {
      const auditEvent = {
        eventType,
        timestamp: Date.now(),
        ...eventData
      };
      
      // 保存到内存
      this.auditLogs.push(auditEvent);
      
      // 保持审计日志大小
      if (this.auditLogs.length > 10000) {
        this.auditLogs = this.auditLogs.slice(-5000);
      }
      
      // 发送到OpenObserve
      await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.auditLogStream}/_json`,
        { events: [auditEvent] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('记录审计事件失败:', error);
    }
  }

  /**
   * 记录访问控制事件
   */
  async logAccessControlEvent(eventType, eventData) {
    try {
      const accessEvent = {
        eventType,
        timestamp: Date.now(),
        ...eventData
      };
      
      // 发送到OpenObserve
      await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.accessControlStream}/_json`,
        { events: [accessEvent] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('记录访问控制事件失败:', error);
    }
  }

  /**
   * 获取用户变更
   */
  getUserChanges(oldUserData, newUserData) {
    const changes = {};
    
    for (const key in newUserData) {
      if (oldUserData[key] !== newUserData[key]) {
        changes[key] = {
          old: oldUserData[key],
          new: newUserData[key]
        };
      }
    }
    
    return changes;
  }

  /**
   * 解析过期时间
   */
  parseExpiration(expiration) {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 3600000; // 默认1小时
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60000;
      case 'h': return value * 3600000;
      case 'd': return value * 86400000;
      default: return 3600000;
    }
  }

  /**
   * 生成ID
   */
  generateId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * 获取用户
   */
  getUser(userId) {
    const user = this.users.get(userId);
    if (!user) return null;
    
    // 返回不包含敏感信息的用户对象
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      mfaEnabled: user.mfaEnabled
    };
  }

  /**
   * 获取所有用户
   */
  getAllUsers() {
    return Array.from(this.users.values()).map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      mfaEnabled: user.mfaEnabled
    }));
  }

  /**
   * 获取角色
   */
  getRole(roleId) {
    return this.roles.get(roleId);
  }

  /**
   * 获取所有角色
   */
  getAllRoles() {
    return Array.from(this.roles.values());
  }

  /**
   * 获取权限
   */
  getPermission(permissionId) {
    return this.permissions.get(permissionId);
  }

  /**
   * 获取所有权限
   */
  getAllPermissions() {
    return Array.from(this.permissions.values());
  }

  /**
   * 获取审计日志
   */
  getAuditLogs(limit = 100) {
    return this.auditLogs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * 停止服务
   */
  stop() {
    this.sessions.clear();
    this.loginAttempts.clear();
    this.isInitialized = false;
    console.log('🔒 安全管理服务已停止');
  }
}

module.exports = SecurityManagementService;