/**
 * 用户唯一性检查模块测试
 * 测试用户名和邮箱唯一性检查、并发控制、预留机制等功能
 */

const UniquenessChecker = require('../js/uniqueness-checker');

describe('UniquenessChecker', () => {
  let checker;
  let testCounter = 0;

  beforeEach(() => {
    testCounter++;
    const uniqueKey = `test_users_${testCounter}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    checker = new UniquenessChecker({
      testMode: true,  // 启用测试模式，使用全局mockStorage
      storageKey: uniqueKey,
      lockTimeout: 1000,
      retryAttempts: 2,
      retryDelay: 50
    });
    // 确保完全重置
    checker.reset();
    // 验证重置成功
    expect(checker.getRegisteredUsers()).toHaveLength(0);
  });

  afterEach(() => {
    checker.reset();
  });

  describe('初始化', () => {
    test('应该正确初始化配置', () => {
      expect(checker.storageKey).toContain('test_users');
      expect(checker.lockTimeout).toBe(1000);
      expect(checker.retryAttempts).toBe(2);
      expect(checker.retryDelay).toBe(50);
    });

    test('应该初始化空的用户存储', () => {
      const users = checker.getRegisteredUsers();
      expect(users).toEqual([]);
    });

    test('应该使用默认配置', () => {
      const defaultChecker = new UniquenessChecker();
      expect(defaultChecker.storageKey).toBe('registeredUsers');
      expect(defaultChecker.lockTimeout).toBe(5000);
    });
  });

  describe('用户名唯一性检查', () => {
    test('应该验证新用户名为唯一', async () => {
      const result = await checker.checkUsernameUniqueness('newuser');
      expect(result.isUnique).toBe(true);
      expect(result.username).toBe('newuser');
      expect(result.message).toBe('用户名可用');
    });

    test('应该检测重复用户名', async () => {
      // 添加一个用户
      const users = [{ username: 'existinguser', email: 'test@example.com' }];
      checker.saveUsers(users);

      const result = await checker.checkUsernameUniqueness('ExistingUser');
      expect(result.isUnique).toBe(false);
      expect(result.username).toBe('existinguser');
      expect(result.message).toBe('用户名已被使用');
    });

    test('应该处理大小写不敏感', async () => {
      const users = [{ username: 'TestUser', email: 'test@example.com' }];
      checker.saveUsers(users);

      const result = await checker.checkUsernameUniqueness('testuser');
      expect(result.isUnique).toBe(false);
    });

    test('应该处理空白字符', async () => {
      const result = await checker.checkUsernameUniqueness('  username  ');
      expect(result.username).toBe('username');
    });

    test('应该拒绝空用户名', async () => {
      await expect(checker.checkUsernameUniqueness('')).rejects.toThrow('用户名不能为空');
      await expect(checker.checkUsernameUniqueness(null)).rejects.toThrow('用户名不能为空');
      await expect(checker.checkUsernameUniqueness('   ')).rejects.toThrow('用户名不能为空');
    });
  });

  describe('邮箱唯一性检查', () => {
    test('应该验证新邮箱为唯一', async () => {
      const result = await checker.checkEmailUniqueness('new@example.com');
      expect(result.isUnique).toBe(true);
      expect(result.email).toBe('new@example.com');
      expect(result.message).toBe('邮箱可用');
    });

    test('应该检测重复邮箱', async () => {
      const users = [{ username: 'user1', email: 'existing@example.com' }];
      checker.saveUsers(users);

      const result = await checker.checkEmailUniqueness('Existing@Example.com');
      expect(result.isUnique).toBe(false);
      expect(result.email).toBe('existing@example.com');
      expect(result.message).toBe('邮箱已被使用');
    });

    test('应该处理邮箱大小写不敏感', async () => {
      const users = [{ username: 'user1', email: 'Test@Example.COM' }];
      checker.saveUsers(users);

      const result = await checker.checkEmailUniqueness('test@example.com');
      expect(result.isUnique).toBe(false);
    });

    test('应该拒绝空邮箱', async () => {
      await expect(checker.checkEmailUniqueness('')).rejects.toThrow('邮箱不能为空');
      await expect(checker.checkEmailUniqueness(null)).rejects.toThrow('邮箱不能为空');
    });
  });

  describe('批量唯一性检查', () => {
    test('应该同时检查用户名和邮箱唯一性', async () => {
      const result = await checker.checkBatchUniqueness('newuser', 'new@example.com');
      expect(result.isValid).toBe(true);
      expect(result.username.isUnique).toBe(true);
      expect(result.email.isUnique).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('应该检测用户名冲突', async () => {
      const users = [{ username: 'existinguser', email: 'other@example.com' }];
      checker.saveUsers(users);

      const result = await checker.checkBatchUniqueness('existinguser', 'new@example.com');
      expect(result.isValid).toBe(false);
      expect(result.username.isUnique).toBe(false);
      expect(result.email.isUnique).toBe(true);
      expect(result.errors).toContain('用户名已被使用');
    });

    test('应该检测邮箱冲突', async () => {
      const users = [{ username: 'otheruser', email: 'existing@example.com' }];
      checker.saveUsers(users);

      const result = await checker.checkBatchUniqueness('newuser', 'existing@example.com');
      expect(result.isValid).toBe(false);
      expect(result.username.isUnique).toBe(true);
      expect(result.email.isUnique).toBe(false);
      expect(result.errors).toContain('邮箱已被使用');
    });

    test('应该检测双重冲突', async () => {
      const users = [{ username: 'existinguser', email: 'existing@example.com' }];
      checker.saveUsers(users);

      const result = await checker.checkBatchUniqueness('existinguser', 'existing@example.com');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('锁机制', () => {
    test('应该成功获取锁', async () => {
      const lockKey = await checker.acquireLock('test_resource');
      expect(lockKey).toBe('lock_test_resource');
      expect(checker.locks.has(lockKey)).toBe(true);
    });

    test('应该阻止重复获取同一锁', async () => {
      await checker.acquireLock('test_resource');
      await expect(checker.acquireLock('test_resource')).rejects.toThrow('资源 test_resource 正在被其他操作使用');
    });

    test('应该释放锁', async () => {
      await checker.acquireLock('test_resource');
      checker.releaseLock('test_resource');
      
      // 应该能够重新获取锁
      const lockKey = await checker.acquireLock('test_resource');
      expect(lockKey).toBe('lock_test_resource');
    });

    test('应该自动释放过期锁', async () => {
      const shortTimeoutChecker = new UniquenessChecker({ lockTimeout: 100 });
      await shortTimeoutChecker.acquireLock('test_resource');
      
      // 等待锁过期
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // 应该能够重新获取锁
      const lockKey = await shortTimeoutChecker.acquireLock('test_resource');
      expect(lockKey).toBe('lock_test_resource');
    });
  });

  describe('用户预留机制', () => {
    test('应该成功预留用户', async () => {
      const result = await checker.reserveUser('newuser', 'new@example.com');
      expect(result.success).toBe(true);
      expect(result.reservationId).toBeDefined();
      expect(result.message).toBe('用户名和邮箱已预留');
      expect(result.expiresAt).toBeDefined();
    });

    test('应该阻止预留已存在的用户名', async () => {
      const users = [{ username: 'existinguser', email: 'other@example.com', status: 'active' }];
      checker.saveUsers(users);

      await expect(checker.reserveUser('existinguser', 'new@example.com'))
        .rejects.toThrow('注册失败: 用户名已被使用');
    });

    test('应该阻止预留已存在的邮箱', async () => {
      const users = [{ username: 'otheruser', email: 'existing@example.com', status: 'active' }];
      checker.saveUsers(users);

      await expect(checker.reserveUser('newuser', 'existing@example.com'))
        .rejects.toThrow('注册失败: 邮箱已被使用');
    });

    test('应该使用自定义预留ID', async () => {
      const customId = 'custom_reservation_123';
      const result = await checker.reserveUser('newuser', 'new@example.com', customId);
      expect(result.reservationId).toBe(customId);
    });
  });

  describe('预留确认', () => {
    test('应该成功确认预留', async () => {
      // 确保测试开始时存储为空
      expect(checker.getRegisteredUsers()).toHaveLength(0);
      
      const reservation = await checker.reserveUser('newuser', 'new@example.com');
      expect(reservation.success).toBe(true);
      expect(reservation.reservationId).toBeDefined();
      
      // 验证预留已创建
      const usersAfterReserve = checker.getRegisteredUsers();
      expect(usersAfterReserve).toHaveLength(1);
      expect(usersAfterReserve[0].status).toBe('reserved');
      
      const userData = {
        fullName: 'New User',
        passwordHash: 'hashed_password'
      };

      const result = await checker.confirmReservation(reservation.reservationId, userData);
      expect(result.success).toBe(true);
      expect(result.userId).toBe(reservation.reservationId);
      expect(result.message).toBe('注册成功');

      // 验证用户状态已更新
      const users = checker.getRegisteredUsers();
      const user = users.find(u => u.id === reservation.reservationId);
      expect(user.status).toBe('active');
      expect(user.fullName).toBe('New User');
    });

    test('应该拒绝不存在的预留ID', async () => {
      await expect(checker.confirmReservation('nonexistent_id', {}))
        .rejects.toThrow('预留记录不存在或已过期');
    });

    test('应该拒绝过期的预留', async () => {
      // 创建一个已过期的预留
      const users = [{
        id: 'expired_reservation',
        username: 'testuser',
        email: 'test@example.com',
        status: 'reserved',
        expiresAt: new Date(Date.now() - 1000).toISOString() // 1秒前过期
      }];
      checker.saveUsers(users);

      try {
        await checker.confirmReservation('expired_reservation', {});
        fail('应该抛出错误');
      } catch (error) {
        expect(error.message).toBe('预留已过期，请重新注册');
      }
    });
  });

  describe('预留取消', () => {
    test('应该成功取消预留', async () => {
      const reservation = await checker.reserveUser('newuser', 'new@example.com');
      const result = await checker.cancelReservation(reservation.reservationId);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('预留已取消');

      // 验证预留已被删除
      const users = checker.getRegisteredUsers();
      const user = users.find(u => u.id === reservation.reservationId);
      expect(user).toBeUndefined();
    });

    test('应该处理不存在的预留ID', async () => {
      const result = await checker.cancelReservation('nonexistent_id');
      expect(result.success).toBe(true);
      expect(result.message).toBe('预留已取消');
    });
  });

  describe('过期预留清理', () => {
    test('应该清理过期预留', async () => {
      // 使用reserveUser方法创建预留，然后手动修改过期时间
      const reservation1 = await checker.reserveUser('expired_user', 'expired@example.com');
      const reservation2 = await checker.reserveUser('valid_user', 'valid@example.com');
      
      // 手动修改第一个预留为过期状态
      const users = checker.getRegisteredUsers();
      const expiredUser = users.find(u => u.id === reservation1.reservationId);
      if (expiredUser) {
        expiredUser.expiresAt = new Date(Date.now() - 1000).toISOString();
        checker.saveUsers(users);
      }

      const result = await checker.cleanupExpiredReservations();
      expect(result.success).toBe(true);
      expect(result.cleaned).toBe(1);
      expect(result.message).toBe('清理了 1 个过期预留');

      // 验证只有有效用户保留
      const remainingUsers = checker.getRegisteredUsers();
      expect(remainingUsers).toHaveLength(1);
      expect(remainingUsers.find(u => u.id === reservation1.reservationId)).toBeUndefined();
      expect(remainingUsers.find(u => u.id === reservation2.reservationId)).toBeDefined();
    });

    test('应该处理无过期预留的情况', async () => {
      const users = [{
        id: 'valid1',
        status: 'reserved',
        expiresAt: new Date(Date.now() + 300000).toISOString()
      }];
      checker.saveUsers(users);

      const result = await checker.cleanupExpiredReservations();
      expect(result.success).toBe(true);
      expect(result.cleaned).toBe(0);
      expect(result.message).toBe('没有过期预留需要清理');
    });
  });

  describe('统计信息', () => {
    test('应该返回正确的统计信息', async () => {
      // 创建一个活跃用户（通过完整流程）
      const reservation1 = await checker.reserveUser('user1', 'user1@example.com');
      await checker.confirmReservation(reservation1.reservationId, { fullName: 'User 1' });
      
      // 创建一个有效预留
      await checker.reserveUser('user2', 'user2@example.com');
      
      // 创建一个过期预留
      const reservation3 = await checker.reserveUser('user3', 'user3@example.com');
      const users = checker.getRegisteredUsers();
      const expiredUser = users.find(u => u.id === reservation3.reservationId);
      if (expiredUser) {
        expiredUser.expiresAt = new Date(Date.now() - 1000).toISOString();
        checker.saveUsers(users);
      }

      const stats = checker.getStatistics();
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(1);
      expect(stats.reserved).toBe(1);
      expect(stats.expired).toBe(1);
    });

    test('应该处理空用户列表', () => {
      const stats = checker.getStatistics();
      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.reserved).toBe(0);
      expect(stats.expired).toBe(0);
    });
  });

  describe('预留ID生成', () => {
    test('应该生成唯一的预留ID', () => {
      const id1 = checker.generateReservationId();
      const id2 = checker.generateReservationId();
      
      expect(id1).toMatch(/^res_\d+_[a-z0-9]{9}$/);
      expect(id2).toMatch(/^res_\d+_[a-z0-9]{9}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('边界情况', () => {
    test('应该处理存储解析错误', () => {
      // 模拟损坏的存储数据
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(checker.storageKey, 'invalid json');
      }
      
      const users = checker.getRegisteredUsers();
      expect(users).toEqual([]);
    });

    test('应该处理极长的用户名和邮箱', async () => {
      const longUsername = 'a'.repeat(1000);
      const longEmail = 'a'.repeat(500) + '@example.com';
      
      const result = await checker.checkBatchUniqueness(longUsername, longEmail);
      expect(result.username.username).toBe(longUsername.toLowerCase());
      expect(result.email.email).toBe(longEmail.toLowerCase());
    });

    test('应该处理特殊字符', async () => {
      const specialUsername = 'user@#$%^&*()';
      const result = await checker.checkUsernameUniqueness(specialUsername);
      expect(result.username).toBe(specialUsername.toLowerCase());
    });
  });

  describe('并发测试', () => {
    test('应该处理并发预留请求', async () => {
      const promises = [];
      
      // 同时发起多个预留请求
      for (let i = 0; i < 5; i++) {
        promises.push(
          checker.reserveUser(`user${i}`, `user${i}@example.com`)
            .catch(error => ({ error: error.message }))
        );
      }
      
      const results = await Promise.all(promises);
      
      // 应该有一些成功，一些因为锁而失败
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => r.error);
      
      expect(successful.length + failed.length).toBe(5);
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  describe('性能测试', () => {
    test('批量唯一性检查应该在合理时间内完成', async () => {
      const startTime = Date.now();
      
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(checker.checkBatchUniqueness(`user${i}`, `user${i}@example.com`));
      }
      
      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });
  });
});