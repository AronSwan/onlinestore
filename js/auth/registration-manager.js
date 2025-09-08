/**
 * 用户注册流程管理器
 * 整合验证、安全、唯一性检查，实现完整注册流程
 * @author AI Assistant
 * @version 1.0
 * @date 2025-01-12
 */

class RegistrationManager {
  constructor(options = {}) {
    this.config = {
      // 注册流程配置
      enableEmailVerification: options.enableEmailVerification !== false,
      enableUsernameReservation: options.enableUsernameReservation !== false,
      reservationTimeout: options.reservationTimeout || 300000, // 5分钟

      // 重试配置
      maxRetryAttempts: options.maxRetryAttempts || 3,
      retryDelay: options.retryDelay || 1000,

      // 安全配置
      enableRateLimiting: options.enableRateLimiting !== false,
      enableConcurrencyControl: options.enableConcurrencyControl !== false,
      enableSecurityProtection: options.enableSecurityProtection !== false,

      // 存储配置
      enableDataStorage: options.enableDataStorage !== false,
      enableDataPersistence: options.enableDataPersistence !== false,
      enableDataBackup: options.enableDataBackup !== false,

      ...options
    };

    // 依赖模块
    this.inputValidator = null;
    this.passwordSecurity = null;
    this.uniquenessChecker = null;
    this.apiManager = null;
    this.eventBus = null;
    this.securityManager = null;
    this.storageManager = null;
    this.resilienceManager = null;
    this.performanceMonitor = null;

    // 注册状态跟踪
    this.registrationState = new Map();
    this.activeRegistrations = new Set();

    // 初始化
    this.initialize();
  }

  /**
   * 初始化注册管理器
   */
  initialize() {
    try {
      this.initializeDependencies();
      this.setupEventListeners();
      console.log('注册管理器初始化完成');
    } catch (error) {
      console.error('注册管理器初始化失败:', error);
      throw new Error('注册管理器初始化失败');
    }
  }

  /**
   * 初始化依赖模块
   */
  initializeDependencies() {
    // 输入验证模块
    if (typeof window !== 'undefined' && window.RealTimeValidationManager) {
      this.inputValidator = new window.RealTimeValidationManager({
        enableRealTimeValidation: true,
        showValidationMessages: true
      });
    } else {
      console.warn('RealTimeValidationManager not available');
    }

    // 密码安全模块
    if (typeof window !== 'undefined' && window.PasswordSecurityManager) {
      this.passwordSecurity = new window.PasswordSecurityManager();
    } else {
      console.warn('PasswordSecurityManager not available');
    }

    // 用户唯一性检查模块
    if (typeof window !== 'undefined' && window.UniquenessChecker) {
      this.uniquenessChecker = new window.UniquenessChecker();
    } else if (typeof window.UniquenessChecker !== 'undefined') {
      this.uniquenessChecker = new window.UniquenessChecker();
    } else {
      console.warn('UniquenessChecker not available');
    }

    // API管理模块
    if (typeof window !== 'undefined' && window.APIIntegrationManager) {
      this.apiManager = new window.APIIntegrationManager();
    } else {
      console.warn('APIIntegrationManager not available');
    }

    // 安全管理模块
    if (typeof window !== 'undefined' && window.SecurityManager) {
      this.securityManager = new window.SecurityManager({
        enableRateLimiting: this.config.enableRateLimiting,
        enableConcurrencyControl: this.config.enableConcurrencyControl
      });
    } else {
      console.warn('SecurityManager not available');
    }

    // 存储管理模块
    if (typeof window !== 'undefined' && window.StorageManager) {
      this.storageManager = new window.StorageManager({
        enableLocalStorage: true,
        enableIndexedDB: true,
        enableDataValidation: true,
        enableBackup: this.config.enableDataBackup,
        enableEncryption: this.config.enableSecurityProtection
      });
    } else {
      console.warn('StorageManager not available');
    }

    // 容错管理模块
    if (typeof window !== 'undefined' && window.RegistrationResilienceManager) {
      this.resilienceManager = new window.RegistrationResilienceManager({
        maxRetries: this.config.maxRetryAttempts || 3,
        baseDelay: this.config.retryDelay || 1000,
        enableLogging: this.config.enableLogging !== false
      });
    } else {
      console.warn('RegistrationResilienceManager not available');
    }

    // 性能监控模块
    if (typeof window !== 'undefined' && window.PerformanceMonitor) {
      this.performanceMonitor = new window.PerformanceMonitor({
        enableMetrics: this.config.enablePerformanceMonitoring !== false,
        enableProfiling: this.config.enableProfiling || false,
        enableReporting: this.config.enablePerformanceReporting || false,
        reportingInterval: this.config.performanceReportingInterval || 60000
      });
    } else {
      console.warn('PerformanceMonitor not available');
    }

    // 事件总线 - 集成新的事件系统
    this.eventBus = (typeof window !== 'undefined' ? window : global) || {};

    // 初始化事件集成系统
    if (typeof window !== 'undefined' && window.RegistrationEventIntegration) {
      this.eventIntegration = new window.RegistrationEventIntegration({
        enableEventLogging: this.config.enableEventLogging,
        enablePerformanceMonitoring: this.config.enablePerformanceMonitoring,
        enableErrorRecovery: true
      });
    } else {
      console.warn('RegistrationEventIntegration not available');
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    if (typeof document !== 'undefined') {
      // 监听注册相关事件
      document.addEventListener('registration:start', this.handleRegistrationStart.bind(this));
      document.addEventListener('registration:validate', this.handleRegistrationValidate.bind(this));
      document.addEventListener('registration:submit', this.handleRegistrationSubmit.bind(this));
      document.addEventListener('registration:cancel', this.handleRegistrationCancel.bind(this));
    }

    // 设置新事件系统的监听器
    if (this.eventIntegration) {
      this.setupAdvancedEventListeners();
    }
  }

  /**
   * 设置高级事件监听器
   */
  setupAdvancedEventListeners() {
    const eventTypes = this.eventIntegration.getEventTypes();

    // 注册成功事件监听
    this.eventIntegration.on(eventTypes.REGISTRATION_SUCCESS, (eventData) => {
      this.handleAdvancedRegistrationSuccess(eventData);
    });

    // 注册失败事件监听
    this.eventIntegration.on(eventTypes.REGISTRATION_FAILED, (eventData) => {
      this.handleAdvancedRegistrationError(eventData);
    });

    // 验证事件监听
    this.eventIntegration.on(eventTypes.REGISTRATION_VALIDATION_FAILED, (eventData) => {
      this.handleValidationError(eventData);
    });

    // 性能警告监听
    this.eventIntegration.on(eventTypes.PERFORMANCE_WARNING, (eventData) => {
      this.handlePerformanceWarning(eventData);
    });
  }

  /**
   * 完整注册流程
   * @param {Object} userData - 用户注册数据
   * @returns {Promise<Object>} 注册结果
   */
  async register(userData) {
    const registrationId = this.generateRegistrationId();

    // 使用容错机制包装整个注册流程
    if (this.resilienceManager) {
      return await this.resilienceManager.handleRegistrationWithDegradation(
        userData,
        async (data) => {
          return await this.performRegistration(registrationId, data);
        }
      );
    }
    // 降级到直接执行
    return await this.performRegistration(registrationId, userData);

  }

  /**
   * 执行注册流程
   * @param {string} registrationId - 注册ID
   * @param {Object} userData - 用户注册数据
   * @returns {Promise<Object>} 注册结果
   */
  async performRegistration(registrationId, userData) {
    // 开始性能监控
    const performanceSession = this.performanceMonitor ?
      this.performanceMonitor.startSession(`registration_${registrationId}`) : null;

    try {
      // 1. 安全检查
      if (this.config.enableSecurityProtection && this.securityManager) {
        const securityTimer = performanceSession?.startTimer('security_check');
        await this.performSecurityCheck(userData);
        securityTimer?.end();
      }

      // 2. 开始注册流程
      this.startRegistration(registrationId, userData);

      // 3. 输入数据验证
      const validationTimer = performanceSession?.startTimer('input_validation');
      await this.validateInput(userData);
      validationTimer?.end();

      // 4. 用户唯一性检查
      const uniquenessTimer = performanceSession?.startTimer('uniqueness_check');
      await this.checkUniqueness(userData);
      uniquenessTimer?.end();

      // 5. 密码安全处理
      const passwordTimer = performanceSession?.startTimer('password_security');
      const secureData = await this.processPasswordSecurity(userData);
      passwordTimer?.end();

      // 6. 预留用户名和邮箱（可选）
      let reservationId = null;
      if (this.config.enableUsernameReservation) {
        const reservationTimer = performanceSession?.startTimer('identity_reservation');
        reservationId = await this.reserveUserIdentity(userData);
        reservationTimer?.end();
      }

      // 7. 提交注册请求
      const submissionTimer = performanceSession?.startTimer('registration_submission');
      const result = await this.submitRegistration(secureData, reservationId);
      submissionTimer?.end();

      // 8. 处理注册成功
      const successTimer = performanceSession?.startTimer('success_handling');
      await this.handleRegistrationSuccess(registrationId, result);
      successTimer?.end();

      // 结束性能监控会话
      performanceSession?.end({
        success: true,
        userId: result.user?.id,
        registrationMethod: userData.registrationMethod || 'standard'
      });

      return {
        success: true,
        registrationId,
        user: result.user,
        message: result.message || '注册成功',
        requiresEmailVerification: result.requiresEmailVerification || false
      };

    } catch (error) {
      // 记录性能监控错误
      performanceSession?.recordError({
        error: error.message,
        errorType: error.constructor.name,
        registrationId,
        timestamp: Date.now()
      });

      // 处理注册失败
      await this.handleRegistrationError(registrationId, error);
      throw error;
    } finally {
      // 结束性能监控会话（如果还未结束）
      if (performanceSession && !performanceSession.isEnded) {
        performanceSession.end({
          success: false,
          registrationId,
          aborted: true
        });
      }

      // 清理注册状态
      this.cleanupRegistration(registrationId);
    }
  }

  /**
   * 生成注册ID
   */
  generateRegistrationId() {
    return `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 开始注册流程
   */
  startRegistration(registrationId, userData) {
    // 检查并发限制
    if (this.config.enableConcurrencyControl && this.activeRegistrations.size >= 10) {
      throw new Error('系统繁忙，请稍后重试');
    }

    // 记录注册状态
    this.registrationState.set(registrationId, {
      startTime: Date.now(),
      userData: { ...userData, password: '[HIDDEN]' }, // 隐藏密码
      status: 'started',
      steps: []
    });

    this.activeRegistrations.add(registrationId);

    // 触发注册开始事件 - 使用新事件系统
    if (this.eventIntegration) {
      this.eventIntegration.emitRegistrationStarted({
        registrationId,
        username: userData.username,
        email: userData.email
      });
    }

    // 保持向后兼容
    this.dispatchEvent('registration:started', {
      registrationId,
      timestamp: Date.now()
    });
  }

  /**
   * 执行安全检查
   * @param {Object} userData - 用户数据
   * @returns {Promise<void>}
   */
  async performSecurityCheck(userData) {
    // 触发安全检查开始事件
    if (this.eventIntegration) {
      this.eventIntegration.emit(this.eventIntegration.getEventTypes().REGISTRATION_SECURITY_CHECK_STARTED, {
        userData: { username: userData.username, email: userData.email }
      });
    }

    if (!this.securityManager) {
      console.warn('SecurityManager not available, skipping security check');
      return;
    }

    try {
      // 验证输入数据的安全性
      const securityResult = this.securityManager.validateSecurityRules(userData, {
        username: { escapeHtml: true, maxLength: 50 },
        email: { escapeHtml: true, maxLength: 100 },
        password: { escapeHtml: false, maxLength: 200 },
        firstName: { escapeHtml: true, maxLength: 50 },
        lastName: { escapeHtml: true, maxLength: 50 }
      });

      // 触发安全检查结果事件
      if (this.eventIntegration) {
        this.eventIntegration.emitSecurityEvent('registration', 'comprehensive', securityResult);
      }

      if (!securityResult.isValid) {
        const violations = securityResult.violations.map(v =>
          `${v.field}: ${v.violations.join(', ')}`
        ).join('; ');
        throw new Error(`Security validation failed: ${violations}`);
      }

      // 更新用户数据为清理后的数据
      Object.assign(userData, securityResult.sanitizedData);

    } catch (error) {
      console.error('Security check failed:', error);
      throw error;
    }
  }

  /**
   * 输入数据验证
   */
  async validateInput(userData) {
    // 触发验证开始事件
    if (this.eventIntegration) {
      this.eventIntegration.emit(this.eventIntegration.getEventTypes().REGISTRATION_VALIDATION_STARTED, {
        userData: { username: userData.username, email: userData.email }
      });
    }

    if (!this.inputValidator) {
      throw new Error('输入验证模块未初始化');
    }

    // 验证注册表单
    const validationResult = this.inputValidator.validateRegistrationForm(userData);

    // 触发验证结果事件
    if (this.eventIntegration) {
      this.eventIntegration.emitValidationEvent('input', 'all', userData, validationResult);
    }

    if (!validationResult.isValid) {
      const errors = validationResult.errors.join(', ');
      throw new Error(`输入验证失败: ${errors}`);
    }

    // 验证密码确认
    if (userData.password !== userData.confirmPassword) {
      throw new Error('密码和确认密码不匹配');
    }

    // 验证服务条款同意
    if (!userData.agreeTerms) {
      throw new Error('请同意服务条款');
    }

    return validationResult;
  }

  /**
   * 用户唯一性检查
   */
  async checkUniqueness(userData) {
    // 触发唯一性检查开始事件
    if (this.eventIntegration) {
      this.eventIntegration.emit(this.eventIntegration.getEventTypes().REGISTRATION_UNIQUENESS_CHECK_STARTED, {
        userData: { username: userData.username, email: userData.email }
      });
    }

    if (!this.uniquenessChecker) {
      throw new Error('唯一性检查模块未初始化');
    }

    // 批量检查用户名和邮箱唯一性
    const uniquenessResult = await this.uniquenessChecker.checkBatchUniqueness(
      userData.username,
      userData.email
    );

    // 触发唯一性检查结果事件
    if (this.eventIntegration) {
      this.eventIntegration.emitUniquenessEvent('username', userData.username, uniquenessResult);
      this.eventIntegration.emitUniquenessEvent('email', userData.email, uniquenessResult);
    }

    if (!uniquenessResult.isValid) {
      const errors = uniquenessResult.errors.join(', ');
      throw new Error(`唯一性检查失败: ${errors}`);
    }

    return uniquenessResult;
  }

  /**
   * 密码安全处理
   */
  async processPasswordSecurity(userData) {
    if (!this.passwordSecurity) {
      throw new Error('密码安全模块未初始化');
    }

    // 密码强度检查
    const strengthResult = this.passwordSecurity.checkPasswordStrength(userData.password);
    if (strengthResult.score < 60) {
      throw new Error(`密码强度不足: ${strengthResult.feedback.join(', ')}`);
    }

    // 密码哈希处理
    const passwordHash = await this.passwordSecurity.hashPassword(userData.password);

    // 构建安全的用户数据
    return {
      username: userData.username.trim(),
      email: userData.email.trim().toLowerCase(),
      passwordHash,
      agreeTerms: userData.agreeTerms,
      createdAt: new Date().toISOString(),
      deviceInfo: this.getDeviceInfo()
    };
  }

  /**
   * 预留用户身份
   */
  async reserveUserIdentity(userData) {
    if (!this.uniquenessChecker || !this.uniquenessChecker.reserveUser) {
      console.warn('用户预留功能不可用');
      return null;
    }

    try {
      const reservationResult = await this.uniquenessChecker.reserveUser(
        userData.username,
        userData.email
      );

      return reservationResult.reservationId;
    } catch (error) {
      console.warn('用户预留失败:', error.message);
      return null;
    }
  }

  /**
   * 提交注册请求
   */
  async submitRegistration(secureData, reservationId = null) {
    if (!this.apiManager) {
      throw new Error('API管理模块未初始化');
    }

    // 准备请求数据
    const requestData = {
      ...secureData,
      reservationId,
      timestamp: Date.now()
    };

    // 发送注册请求
    const result = await this.apiManager.register(requestData);

    if (!result.success) {
      throw new Error(result.message || '注册请求失败');
    }

    // 数据持久化处理
    if (this.config.enableDataPersistence && this.storageManager) {
      await this.handleDataPersistence(secureData, result);
    }

    return result;
  }

  /**
   * 处理注册成功
   */
  async handleRegistrationSuccess(registrationId, result) {
    // 更新注册状态
    const state = this.registrationState.get(registrationId);
    if (state) {
      state.status = 'completed';
      state.completedAt = Date.now();
      state.result = result;
    }

    // 确认用户预留（如果有）
    if (result.reservationId && this.uniquenessChecker && this.uniquenessChecker.confirmReservation) {
      try {
        await this.uniquenessChecker.confirmReservation(result.reservationId);
      } catch (error) {
        console.warn('确认用户预留失败:', error.message);
      }
    }

    // 触发成功事件 - 使用新事件系统
    if (this.eventIntegration) {
      this.eventIntegration.emitRegistrationSuccess(
        state ? state.userData : {},
        result
      );
    }

    // 保持向后兼容
    this.dispatchEvent('registration:success', {
      registrationId,
      user: result.user,
      timestamp: Date.now()
    });
  }

  /**
   * 处理注册错误
   */
  async handleRegistrationError(registrationId, error) {
    // 更新注册状态
    const state = this.registrationState.get(registrationId);
    if (state) {
      state.status = 'failed';
      state.failedAt = Date.now();
      state.error = error.message;
    }

    // 触发错误事件 - 使用新事件系统
    if (this.eventIntegration) {
      this.eventIntegration.emitRegistrationFailed(
        state ? state.userData : {},
        error
      );
    }

    // 保持向后兼容
    this.dispatchEvent('registration:error', {
      registrationId,
      error: error.message,
      timestamp: Date.now()
    });
  }

  /**
   * 清理注册状态
   */
  cleanupRegistration(registrationId) {
    this.activeRegistrations.delete(registrationId);

    // 延迟清理注册状态（保留一段时间用于调试）
    setTimeout(() => {
      this.registrationState.delete(registrationId);
    }, 300000); // 5分钟后清理
  }

  /**
   * 数据持久化处理
   */
  async handleDataPersistence(userData, registrationResult) {
    try {
      // 触发存储开始事件
      if (this.eventIntegration) {
        this.eventIntegration.emit(this.eventIntegration.getEventTypes().REGISTRATION_STORAGE_STARTED, {
          userId: registrationResult.user?.id || this.generateUserId(),
          operation: 'store_user_data'
        });
      }

      if (!this.storageManager) {
        console.warn('StorageManager not available for data persistence');

        // 触发存储失败事件
        if (this.eventIntegration) {
          this.eventIntegration.emitStorageEvent('store_user_data', {
            success: false,
            reason: 'StorageManager not available'
          });
        }

        return;
      }

      console.log('开始数据持久化处理');

      // 保存用户基本信息
      const userRecord = {
        id: registrationResult.user?.id || this.generateUserId(),
        username: userData.username,
        email: userData.email,
        createdAt: new Date().toISOString(),
        status: 'active'
      };

      await this.storageManager.store(`user_${userRecord.id}`, userRecord, {
        persistent: true,
        encrypted: true,
        backup: this.config.enableDataBackup
      });

      // 触发存储成功事件
      if (this.eventIntegration) {
        this.eventIntegration.emitStorageEvent('store_user_data', {
          success: true,
          userId: userRecord.id
        });
      }

      // 更新用户索引
      await this.updateUserIndex(userRecord);

      // 记录用户活动
      await this.recordUserActivity(userRecord.id, 'registration');

      console.log('数据持久化处理完成');
    } catch (error) {
      console.error('数据持久化处理失败:', error);

      // 触发存储失败事件
      if (this.eventIntegration) {
        this.eventIntegration.emitStorageEvent('store_user_data', {
          success: false,
          error: error.message
        });
      }

      // 持久化失败不应该影响注册流程
    }
  }

  /**
   * 更新用户索引
   */
  async updateUserIndex(userRecord) {
    try {
      const userIndex = await this.storageManager.retrieve('user_index') || {
        byUsername: {},
        byEmail: {},
        byId: {},
        count: 0
      };

      userIndex.byUsername[userRecord.username] = userRecord.id;
      userIndex.byEmail[userRecord.email] = userRecord.id;
      userIndex.byId[userRecord.id] = {
        username: userRecord.username,
        email: userRecord.email,
        createdAt: userRecord.createdAt,
        status: userRecord.status
      };
      userIndex.count++;

      await this.storageManager.store('user_index', userIndex, {
        persistent: true,
        encrypted: false,
        backup: true
      });
    } catch (error) {
      console.error('用户索引更新失败:', error);
    }
  }

  /**
   * 记录用户活动
   */
  async recordUserActivity(userId, activity) {
    try {
      const activityRecord = {
        userId,
        activity,
        timestamp: new Date().toISOString(),
        deviceInfo: this.getDeviceInfo()
      };

      let activities = await this.storageManager.retrieve(`activities_${userId}`) || [];
      activities.push(activityRecord);

      // 保持最近100条记录
      if (activities.length > 100) {
        activities = activities.slice(-100);
      }

      await this.storageManager.store(`activities_${userId}`, activities, {
        persistent: true,
        encrypted: true,
        backup: false
      });
    } catch (error) {
      console.error('用户活动记录失败:', error);
    }
  }

  /**
   * 生成用户ID
   */
  generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取设备信息
   */
  getDeviceInfo() {
    if (typeof navigator === 'undefined') {
      return { platform: 'server', userAgent: 'node.js' };
    }

    return {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language,
      timestamp: Date.now()
    };
  }

  /**
   * 触发事件
   */
  dispatchEvent(eventName, detail) {
    if (typeof document !== 'undefined') {
      const event = new CustomEvent(eventName, { detail });
      document.dispatchEvent(event);
    }
  }

  /**
   * 事件处理器
   */
  handleRegistrationStart(event) {
    console.log('注册开始:', event.detail);
  }

  handleRegistrationValidate(event) {
    console.log('注册验证:', event.detail);
  }

  handleRegistrationSubmit(event) {
    console.log('注册提交:', event.detail);
  }

  handleRegistrationCancel(event) {
    console.log('注册取消:', event.detail);

    // 清理相关状态
    const { registrationId } = event.detail;
    if (registrationId) {
      this.cleanupRegistration(registrationId);
    }
  }

  /**
   * 获取注册统计信息
   */
  getRegistrationStats() {
    const stats = {
      activeRegistrations: this.activeRegistrations.size,
      totalRegistrations: this.registrationState.size,
      completedRegistrations: 0,
      failedRegistrations: 0
    };

    for (const state of this.registrationState.values()) {
      if (state.status === 'completed') {
        stats.completedRegistrations++;
      } else if (state.status === 'failed') {
        stats.failedRegistrations++;
      }
    }

    // 添加性能监控统计信息
    if (this.performanceMonitor) {
      const performanceStats = this.performanceMonitor.getStats();
      stats.performance = {
        averageRegistrationTime: performanceStats.averageSessionDuration || 0,
        totalSessions: performanceStats.totalSessions || 0,
        errorRate: performanceStats.errorRate || 0,
        slowestOperations: performanceStats.slowestOperations || [],
        memoryUsage: performanceStats.memoryUsage || {},
        lastReportTime: performanceStats.lastReportTime || null
      };
    }

    return stats;
  }

  /**
   * 重置注册管理器
   */
  reset() {
    this.registrationState.clear();
    this.activeRegistrations.clear();
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RegistrationManager;
}

if (typeof window !== 'undefined') {
  window.RegistrationManager = RegistrationManager;
}
