/**
 * 用户唯一性检查模块
 * 负责检查用户名和邮箱的唯一性，处理并发冲突
 */
// 全局mockStorage用于测试模式下的数据共享
if (typeof global !== 'undefined') {
  global.mockStorageMap = global.mockStorageMap || new Map();
}

class UniquenessChecker {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'registeredUsers';
    this.lockTimeout = options.lockTimeout || 5000; // 5秒锁超时
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 100; // 100ms
    this.testMode = options.testMode || false;

    // 内存中的锁机制（用于并发控制）
    this.locks = new Map();

    // 初始化mockStorage
    this.mockStorage = [];

    // 初始化存储
    this.initializeStorage();
  }

  /**
   * 初始化存储
   */
  initializeStorage() {
    if (this.testMode) {
      // 测试模式：使用全局mockStorage
      if (typeof global !== 'undefined' && !global.mockStorageMap.has(this.storageKey)) {
        global.mockStorageMap.set(this.storageKey, []);
      }
    } else if (typeof localStorage !== 'undefined') {
      // 浏览器环境
      if (!localStorage.getItem(this.storageKey)) {
        localStorage.setItem(this.storageKey, JSON.stringify([]));
      }
    } else {
      // Node.js 环境或测试环境
      this.mockStorage = this.mockStorage || [];
    }
  }

  /**
   * 获取所有已注册用户
   */
  getRegisteredUsers() {
    if (this.testMode && typeof global !== 'undefined') {
      // 测试模式：使用全局mockStorage
      return global.mockStorageMap.get(this.storageKey) || [];
    } else if (typeof localStorage !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      } catch (error) {
        console.error('解析用户数据失败:', error);
        return [];
      }
    } else {
      return this.mockStorage || [];
    }
  }

  /**
   * 保存用户数据
   */
  saveUsers(users) {
    if (this.testMode && typeof global !== 'undefined') {
      // 测试模式：使用全局mockStorage
      global.mockStorageMap.set(this.storageKey, users);
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(users));
    } else {
      this.mockStorage = users;
    }
  }

  /**
   * 获取分布式锁
   */
  async acquireLock(key) {
    const lockKey = `lock_${key}`;
    const now = Date.now();

    // 检查是否已有锁
    if (this.locks.has(lockKey)) {
      const lockTime = this.locks.get(lockKey);
      if (now - lockTime < this.lockTimeout) {
        throw new Error(`资源 ${key} 正在被其他操作使用，请稍后重试`);
      }
    }

    // 获取锁
    this.locks.set(lockKey, now);

    // 设置自动释放锁
    setTimeout(() => {
      this.releaseLock(key);
    }, this.lockTimeout);

    return lockKey;
  }

  /**
   * 释放锁
   */
  releaseLock(key) {
    const lockKey = `lock_${key}`;
    this.locks.delete(lockKey);
  }

  /**
   * 检查用户名是否唯一
   */
  async checkUsernameUniqueness(username) {
    if (!username || typeof username !== 'string') {
      throw new Error('用户名不能为空');
    }

    const normalizedUsername = username.toLowerCase().trim();

    if (normalizedUsername.length === 0) {
      throw new Error('用户名不能为空');
    }

    const users = this.getRegisteredUsers();
    const exists = users.some(user =>
      user.username && user.username.toLowerCase() === normalizedUsername
    );

    return {
      isUnique: !exists,
      username: normalizedUsername,
      message: exists ? '用户名已被使用' : '用户名可用'
    };
  }

  /**
   * 检查邮箱是否唯一
   */
  async checkEmailUniqueness(email) {
    if (!email || typeof email !== 'string') {
      throw new Error('邮箱不能为空');
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (normalizedEmail.length === 0) {
      throw new Error('邮箱不能为空');
    }

    const users = this.getRegisteredUsers();
    const exists = users.some(user =>
      user.email && user.email.toLowerCase() === normalizedEmail
    );

    return {
      isUnique: !exists,
      email: normalizedEmail,
      message: exists ? '邮箱已被使用' : '邮箱可用'
    };
  }

  /**
   * 批量检查唯一性（用户名和邮箱）
   */
  async checkBatchUniqueness(username, email) {
    const results = {
      username: null,
      email: null,
      isValid: true,
      errors: []
    };

    try {
      // 并行检查用户名和邮箱
      const [usernameResult, emailResult] = await Promise.all([
        this.checkUsernameUniqueness(username),
        this.checkEmailUniqueness(email)
      ]);

      results.username = usernameResult;
      results.email = emailResult;

      if (!usernameResult.isUnique) {
        results.isValid = false;
        results.errors.push(usernameResult.message);
      }

      if (!emailResult.isUnique) {
        results.isValid = false;
        results.errors.push(emailResult.message);
      }

    } catch (error) {
      results.isValid = false;
      results.errors.push(error.message);
    }

    return results;
  }

  /**
   * 预留用户名和邮箱（防止并发注册）
   */
  async reserveUser(username, email, reservationId = null) {
    const _lockKey = await this.acquireLock('user_registration');

    try {
      // 再次检查唯一性（双重检查锁定模式）
      const uniquenessCheck = await this.checkBatchUniqueness(username, email);

      if (!uniquenessCheck.isValid) {
        throw new Error(`注册失败: ${uniquenessCheck.errors.join(', ')}`);
      }

      const users = this.getRegisteredUsers();
      const reservation = {
        id: reservationId || this.generateReservationId(),
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        status: 'reserved',
        reservedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 300000).toISOString() // 5分钟过期
      };

      users.push(reservation);
      this.saveUsers(users);

      return {
        success: true,
        reservationId: reservation.id,
        message: '用户名和邮箱已预留',
        expiresAt: reservation.expiresAt
      };

    } finally {
      this.releaseLock('user_registration');
    }
  }

  /**
   * 确认预留（将预留转为正式注册）
   */
  async confirmReservation(reservationId, userData) {
    const _lockKey = await this.acquireLock('user_registration');

    try {
      const users = this.getRegisteredUsers();
      const reservationIndex = users.findIndex(user =>
        user.id === reservationId && user.status === 'reserved'
      );

      if (reservationIndex === -1) {
        throw new Error('预留记录不存在或已过期');
      }

      const reservation = users[reservationIndex];

      // 检查是否过期
      if (reservation.expiresAt && new Date() > new Date(reservation.expiresAt)) {
        // 删除过期预留
        users.splice(reservationIndex, 1);
        this.saveUsers(users);
        throw new Error('预留已过期，请重新注册');
      }

      // 更新为正式用户
      users[reservationIndex] = {
        ...reservation,
        ...userData,
        status: 'active',
        registeredAt: new Date().toISOString()
      };

      this.saveUsers(users);

      return {
        success: true,
        userId: reservation.id,
        message: '注册成功'
      };

    } finally {
      this.releaseLock('user_registration');
    }
  }

  /**
   * 取消预留
   */
  async cancelReservation(reservationId) {
    const _lockKey = await this.acquireLock('user_registration');

    try {
      const users = this.getRegisteredUsers();
      const reservationIndex = users.findIndex(user =>
        user.id === reservationId && user.status === 'reserved'
      );

      if (reservationIndex !== -1) {
        users.splice(reservationIndex, 1);
        this.saveUsers(users);
      }

      return {
        success: true,
        message: '预留已取消'
      };

    } finally {
      this.releaseLock('user_registration');
    }
  }

  /**
   * 清理过期预留
   */
  async cleanupExpiredReservations() {
    const _lockKey = await this.acquireLock('cleanup');

    try {
      const users = this.getRegisteredUsers();
      const now = new Date();

      const activeUsers = users.filter(user => {
        if (user.status === 'reserved') {
          return new Date(user.expiresAt) > now;
        }
        return true; // 保留非预留用户
      });

      if (activeUsers.length !== users.length) {
        this.saveUsers(activeUsers);
        return {
          success: true,
          cleaned: users.length - activeUsers.length,
          message: `清理了 ${users.length - activeUsers.length} 个过期预留`
        };
      }

      return {
        success: true,
        cleaned: 0,
        message: '没有过期预留需要清理'
      };

    } finally {
      this.releaseLock('cleanup');
    }
  }

  /**
   * 生成预留ID
   */
  generateReservationId() {
    return 'res_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 获取用户统计信息
   */
  getStatistics() {
    const users = this.getRegisteredUsers();
    const now = new Date();

    const stats = {
      total: users.length,
      active: 0,
      reserved: 0,
      expired: 0
    };

    users.forEach(user => {
      if (user.status === 'active') {
        stats.active++;
      } else if (user.status === 'reserved') {
        if (new Date(user.expiresAt) > now) {
          stats.reserved++;
        } else {
          stats.expired++;
        }
      }
    });

    return stats;
  }

  /**
   * 重置所有数据（仅用于测试）
   */
  reset() {
    if (this.testMode && typeof global !== 'undefined') {
      // 测试模式：重置全局mockStorage
      global.mockStorageMap.set(this.storageKey, []);
    } else if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
    this.mockStorage = [];
    this.locks.clear();
    this.initializeStorage();
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UniquenessChecker;
} else if (typeof window !== 'undefined') {
  window.UniquenessChecker = UniquenessChecker;
}
