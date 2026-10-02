/**
 * 安全和权限管理系统测试脚本
 * 测试身份认证、授权、访问控制和安全审计功能
 */

const axios = require('axios');
const { performance } = require('perf_hooks');
const crypto = require('crypto');

class SecurityManagementTest {
  constructor() {
    this.config = {
      openobserveUrl: process.env.OPENOBSERVE_URL || 'http://localhost:5080',
      organization: process.env.OPENOBSERVE_ORGANIZATION || 'default',
      token: process.env.OPENOBSERVE_TOKEN || '',
      auditLogStream: process.env.AUDIT_LOG_STREAM || 'security-audit-log',
      accessControlStream: process.env.ACCESS_CONTROL_STREAM || 'access-control',
      testTimeout: 30000
    };
    
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
    
    this.testUserId = this.generateUserId();
    this.testSessionId = this.generateSessionId();
  }

  /**
   * 执行完整的安全和权限管理测试
   */
  async runTests() {
    console.log('🧪 开始安全和权限管理系统测试...');
    console.log('=====================================');
    
    const startTime = performance.now();
    
    try {
      // 1. 基础连接测试
      await this.testConnection();
      
      // 2. 数据流测试
      await this.testStreams();
      
      // 3. 用户认证测试
      await this.testUserAuthentication();
      
      // 4. 令牌刷新测试
      await this.testTokenRefresh();
      
      // 5. 用户登出测试
      await this.testUserLogout();
      
      // 6. 用户管理测试
      await this.testUserManagement();
      
      // 7. 角色和权限测试
      await this.testRolesAndPermissions();
      
      // 8. 权限检查测试
      await this.testPermissionCheck();
      
      // 9. 密码策略测试
      await this.testPasswordPolicy();
      
      // 10. 账户锁定测试
      await this.testAccountLockout();
      
      // 11. 会话管理测试
      await this.testSessionManagement();
      
      // 12. 安全审计日志测试
      await this.testSecurityAuditLogs();
      
      // 13. 访问控制日志测试
      await this.testAccessControlLogs();
      
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      
      this.printTestSummary(duration);
      
    } catch (error) {
      console.error('❌ 测试执行失败:', error.message);
      throw error;
    }
  }

  /**
   * 测试基础连接
   */
  async testConnection() {
    console.log('\n📡 测试基础连接...');
    
    await this.runTest('OpenObserve连接测试', async () => {
      const response = await axios.get(`${this.config.openobserveUrl}/health`, {
        timeout: 5000
      });
      
      if (response.status !== 200) {
        throw new Error(`健康检查失败: ${response.status}`);
      }
      
      return response.data;
    });
  }

  /**
   * 测试数据流
   */
  async testStreams() {
    console.log('\n📊 测试数据流...');
    
    await this.runTest('审计日志数据流存在性测试', async () => {
      const response = await axios.get(
        `${this.config.openobserveUrl}/api/${this.config.organization}/streams`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`
          }
        }
      );
      
      const streams = response.data.list || [];
      const auditLogStream = streams.find(s => s.name === this.config.auditLogStream);
      
      if (!auditLogStream) {
        throw new Error(`审计日志数据流不存在: ${this.config.auditLogStream}`);
      }
      
      return auditLogStream;
    });

    await this.runTest('访问控制数据流存在性测试', async () => {
      const response = await axios.get(
        `${this.config.openobserveUrl}/api/${this.config.organization}/streams`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`
          }
        }
      );
      
      const streams = response.data.list || [];
      const accessControlStream = streams.find(s => s.name === this.config.accessControlStream);
      
      if (!accessControlStream) {
        throw new Error(`访问控制数据流不存在: ${this.config.accessControlStream}`);
      }
      
      return accessControlStream;
    });
  }

  /**
   * 测试用户认证
   */
  async testUserAuthentication() {
    console.log('\n🔐 测试用户认证...');
    
    await this.runTest('成功用户认证测试', async () => {
      const authData = {
        username: 'admin',
        password: 'CHANGE_ME_admin_password'
      };
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/auth/login`,
        authData,
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`用户认证失败: ${response.status}`);
      }
      
      return response.data;
    });

    await this.runTest('失败用户认证测试', async () => {
      const authData = {
        username: 'admin',
        password: 'wrongpassword'
      };
      
      try {
        const response = await axios.post(
          `${this.config.openobserveUrl}/api/${this.config.organization}/auth/login`,
          authData,
          {
            headers: {
              'Authorization': `Bearer ${this.config.token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.status === 200) {
          throw new Error('应该认证失败但成功了');
        }
      } catch (error) {
        if (error.response?.status !== 401) {
          throw new Error(`预期的401错误，但得到: ${error.response?.status}`);
        }
        return { status: 'failed_as_expected', error: error.response.data };
      }
    });
  }

  /**
   * 测试令牌刷新
   */
  async testTokenRefresh() {
    console.log('\n🔄 测试令牌刷新...');
    
    await this.runTest('令牌刷新测试', async () => {
      // 先登录获取令牌
      const authResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/auth/login`,
        { username: 'admin', password: 'CHANGE_ME_admin_password' },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const refreshToken = authResponse.data.tokens.refreshToken;
      
      // 使用刷新令牌获取新令牌
      const refreshResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/auth/refresh`,
        { refreshToken },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (refreshResponse.status !== 200) {
        throw new Error(`令牌刷新失败: ${refreshResponse.status}`);
      }
      
      return refreshResponse.data;
    });
  }

  /**
   * 测试用户登出
   */
  async testUserLogout() {
    console.log('\n🚪 测试用户登出...');
    
    await this.runTest('用户登出测试', async () => {
      // 先登录获取令牌
      const authResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/auth/login`,
        { username: 'admin', password: 'CHANGE_ME_admin_password' },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const accessToken = authResponse.data.tokens.accessToken;
      
      // 登出
      const logoutResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/auth/logout`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (logoutResponse.status !== 200) {
        throw new Error(`用户登出失败: ${logoutResponse.status}`);
      }
      
      return logoutResponse.data;
    });
  }

  /**
   * 测试用户管理
   */
  async testUserManagement() {
    console.log('\n👥 测试用户管理...');
    
    await this.runTest('创建用户测试', async () => {
      // 先登录获取令牌
      const authResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/auth/login`,
        { username: 'admin', password: 'CHANGE_ME_admin_password' },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const accessToken = authResponse.data.tokens.accessToken;
      
      // 创建用户
      const userData = {
        username: `testuser_${Date.now()}`,
        email: `testuser_${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        roles: ['viewer']
      };
      
      const createResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/users`,
        userData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (createResponse.status !== 201) {
        throw new Error(`创建用户失败: ${createResponse.status}`);
      }
      
      return { user: createResponse.data, accessToken };
    });

    await this.runTest('获取用户测试', async () => {
      // 先登录获取令牌
      const authResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/auth/login`,
        { username: 'admin', password: 'CHANGE_ME_admin_password' },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const accessToken = authResponse.data.tokens.accessToken;
      
      // 获取用户列表
      const usersResponse = await axios.get(
        `${this.config.openobserveUrl}/api/${this.config.organization}/users`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (usersResponse.status !== 200) {
        throw new Error(`获取用户列表失败: ${usersResponse.status}`);
      }
      
      return usersResponse.data;
    });
  }

  /**
   * 测试角色和权限
   */
  async testRolesAndPermissions() {
    console.log('\n👑 测试角色和权限...');
    
    await this.runTest('获取角色列表测试', async () => {
      // 先登录获取令牌
      const authResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/auth/login`,
        { username: 'admin', password: 'CHANGE_ME_admin_password' },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const accessToken = authResponse.data.tokens.accessToken;
      
      // 获取角色列表
      const rolesResponse = await axios.get(
        `${this.config.openobserveUrl}/api/${this.config.organization}/roles`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (rolesResponse.status !== 200) {
        throw new Error(`获取角色列表失败: ${rolesResponse.status}`);
      }
      
      return rolesResponse.data;
    });

    await this.runTest('获取权限列表测试', async () => {
      // 先登录获取令牌
      const authResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/auth/login`,
        { username: 'admin', password: 'CHANGE_ME_admin_password' },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const accessToken = authResponse.data.tokens.accessToken;
      
      // 获取权限列表
      const permissionsResponse = await axios.get(
        `${this.config.openobserveUrl}/api/${this.config.organization}/permissions`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (permissionsResponse.status !== 200) {
        throw new Error(`获取权限列表失败: ${permissionsResponse.status}`);
      }
      
      return permissionsResponse.data;
    });
  }

  /**
   * 测试权限检查
   */
  async testPermissionCheck() {
    console.log('\n🔍 测试权限检查...');
    
    await this.runTest('权限检查测试', async () => {
      // 先登录获取令牌
      const authResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/auth/login`,
        { username: 'admin', password: 'CHANGE_ME_admin_password' },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const accessToken = authResponse.data.tokens.accessToken;
      const userId = authResponse.data.user.id;
      
      // 检查权限
      const permissionResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/permissions/check`,
        {
          userId,
          permission: 'data.read',
          resource: '/api/data'
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (permissionResponse.status !== 200) {
        throw new Error(`权限检查失败: ${permissionResponse.status}`);
      }
      
      return permissionResponse.data;
    });
  }

  /**
   * 测试密码策略
   */
  async testPasswordPolicy() {
    console.log('\n🔑 测试密码策略...');
    
    await this.runTest('强密码验证测试', async () => {
      // 先登录获取令牌
      const authResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/auth/login`,
        { username: 'admin', password: 'CHANGE_ME_admin_password' },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const accessToken = authResponse.data.tokens.accessToken;
      
      // 尝试创建用户，使用强密码
      const userData = {
        username: `testuser_strong_${Date.now()}`,
        email: `testuser_strong_${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        roles: ['viewer']
      };
      
      try {
        const createResponse = await axios.post(
          `${this.config.openobserveUrl}/api/${this.config.organization}/users`,
          userData,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (createResponse.status !== 201) {
          throw new Error(`创建用户失败: ${createResponse.status}`);
        }
        
        return { status: 'strong_password_accepted', user: createResponse.data };
      } catch (error) {
        throw new Error(`强密码验证失败: ${error.message}`);
      }
    });

    await this.runTest('弱密码拒绝测试', async () => {
      // 先登录获取令牌
      const authResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/auth/login`,
        { username: 'admin', password: 'CHANGE_ME_admin_password' },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const accessToken = authResponse.data.tokens.accessToken;
      
      // 尝试创建用户，使用弱密码
      const userData = {
        username: `testuser_weak_${Date.now()}`,
        email: `testuser_weak_${Date.now()}@example.com`,
        password: 'weak',
        roles: ['viewer']
      };
      
      try {
        const createResponse = await axios.post(
          `${this.config.openobserveUrl}/api/${this.config.organization}/users`,
          userData,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (createResponse.status === 201) {
          throw new Error('应该拒绝弱密码但接受了');
        }
        
        return { status: 'weak_password_rejected_as_expected' };
      } catch (error) {
        if (error.response?.status !== 400) {
          throw new Error(`预期的400错误，但得到: ${error.response?.status}`);
        }
        return { status: 'weak_password_rejected_as_expected', error: error.response.data };
      }
    });
  }

  /**
   * 测试账户锁定
   */
  async testAccountLockout() {
    console.log('\n🔒 测试账户锁定...');
    
    await this.runTest('账户锁定测试', async () => {
      const username = 'admin';
      const wrongPassword = 'wrongpassword';
      
      // 尝试多次错误登录
      for (let i = 0; i < 6; i++) {
        try {
          await axios.post(
            `${this.config.openobserveUrl}/api/${this.config.organization}/auth/login`,
            { username, password: wrongPassword },
            {
              headers: {
                'Authorization': `Bearer ${this.config.token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (i < 5) {
            // 前5次应该失败
            throw new Error(`第${i+1}次登录应该失败但成功了`);
          }
        } catch (error) {
          if (i < 5) {
            // 前5次应该返回401
            if (error.response?.status !== 401) {
              throw new Error(`第${i+1}次登录预期的401错误，但得到: ${error.response?.status}`);
            }
          } else {
            // 第6次应该返回423（账户锁定）
            if (error.response?.status !== 423) {
              throw new Error(`第6次登录预期的423错误，但得到: ${error.response?.status}`);
            }
            return { status: 'account_locked_as_expected', error: error.response.data };
          }
        }
      }
      
      return { status: 'account_locked_test_completed' };
    });
  }

  /**
   * 测试会话管理
   */
  async testSessionManagement() {
    console.log('\n📋 测试会话管理...');
    
    await this.runTest('会话创建和验证测试', async () => {
      // 先登录获取令牌
      const authResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/auth/login`,
        { username: 'admin', password: 'CHANGE_ME_admin_password' },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const accessToken = authResponse.data.tokens.accessToken;
      
      // 使用令牌访问受保护的资源
      const protectedResponse = await axios.get(
        `${this.config.openobserveUrl}/api/${this.config.organization}/users/me`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (protectedResponse.status !== 200) {
        throw new Error(`会话验证失败: ${protectedResponse.status}`);
      }
      
      return { 
        sessionValid: true, 
        user: protectedResponse.data,
        tokens: authResponse.data.tokens
      };
    });
  }

  /**
   * 测试安全审计日志
   */
  async testSecurityAuditLogs() {
    console.log('\n📝 测试安全审计日志...');
    
    await this.runTest('安全审计日志记录测试', async () => {
      // 先登录获取令牌
      const authResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/auth/login`,
        { username: 'admin', password: 'CHANGE_ME_admin_password' },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // 等待日志记录
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 查询审计日志
      const auditResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT * FROM ${this.config.auditLogStream} WHERE eventType = 'user_login_success' AND timestamp >= now() - INTERVAL '5 minutes' ORDER BY timestamp DESC LIMIT 1`
          },
          start_time: new Date(Date.now() - 300000).toISOString(),
          end_time: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!auditResponse.data.hits || auditResponse.data.hits.length === 0) {
        throw new Error('未找到预期的审计日志');
      }
      
      return auditResponse.data.hits[0];
    });
  }

  /**
   * 测试访问控制日志
   */
  async testAccessControlLogs() {
    console.log('\n🔍 测试访问控制日志...');
    
    await this.runTest('访问控制日志记录测试', async () => {
      // 先登录获取令牌
      const authResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/auth/login`,
        { username: 'admin', password: 'CHANGE_ME_admin_password' },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const accessToken = authResponse.data.tokens.accessToken;
      const userId = authResponse.data.user.id;
      
      // 执行权限检查
      await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/permissions/check`,
        {
          userId,
          permission: 'data.read',
          resource: '/api/data'
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // 等待日志记录
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 查询访问控制日志
      const accessResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT * FROM ${this.config.accessControlStream} WHERE eventType = 'permission_granted' AND timestamp >= now() - INTERVAL '5 minutes' ORDER BY timestamp DESC LIMIT 1`
          },
          start_time: new Date(Date.now() - 300000).toISOString(),
          end_time: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!accessResponse.data.hits || accessResponse.data.hits.length === 0) {
        throw new Error('未找到预期的访问控制日志');
      }
      
      return accessResponse.data.hits[0];
    });
  }

  /**
   * 运行单个测试
   */
  async runTest(testName, testFunction) {
    this.testResults.total++;
    
    try {
      const startTime = performance.now();
      const result = await testFunction();
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      
      this.testResults.passed++;
      this.testResults.details.push({
        name: testName,
        status: 'PASSED',
        duration,
        result
      });
      
      console.log(`  ✅ ${testName} (${duration}ms)`);
      
    } catch (error) {
      this.testResults.failed++;
      this.testResults.details.push({
        name: testName,
        status: 'FAILED',
        error: error.message
      });
      
      console.log(`  ❌ ${testName}: ${error.message}`);
    }
  }

  /**
   * 生成用户ID
   */
  generateUserId() {
    return 'user_' + crypto.randomBytes(8).toString('hex');
  }

  /**
   * 生成会话ID
   */
  generateSessionId() {
    return 'session_' + crypto.randomBytes(16).toString('hex');
  }

  /**
   * 打印测试摘要
   */
  printTestSummary(duration) {
    console.log('\n📋 测试摘要');
    console.log('=====================================');
    console.log(`⏱️ 总耗时: ${duration}ms`);
    console.log(`📊 总测试数: ${this.testResults.total}`);
    console.log(`✅ 通过测试: ${this.testResults.passed}`);
    console.log(`❌ 失败测试: ${this.testResults.failed}`);
    console.log(`📈 成功率: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(2)}%`);
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ 失败的测试:');
      this.testResults.details
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n📊 详细结果:');
    this.testResults.details.forEach(test => {
      const status = test.status === 'PASSED' ? '✅' : '❌';
      const duration = test.duration ? ` (${test.duration}ms)` : '';
      console.log(`  ${status} ${test.name}${duration}`);
    });
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 所有测试通过！安全和权限管理系统运行正常。');
    } else {
      console.log('\n⚠️ 部分测试失败，请检查配置和连接。');
    }
    
    console.log('\n🔗 测试数据查询:');
    console.log(`  用户ID: ${this.testUserId}`);
    console.log(`  会话ID: ${this.testSessionId}`);
    console.log(`  审计日志流: ${this.config.auditLogStream}`);
    console.log(`  访问控制流: ${this.config.accessControlStream}`);
    console.log(`  查询链接: ${this.config.openobserveUrl}/web/#/streams?stream=${this.config.auditLogStream}`);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const test = new SecurityManagementTest();
  test.runTests().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = SecurityManagementTest;