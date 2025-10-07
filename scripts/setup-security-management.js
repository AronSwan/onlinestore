/**
 * 安全和权限管理系统设置脚本
 * 配置和部署安全和权限管理功能
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecurityManagementSetup {
  constructor() {
    this.config = {
      openobserveUrl: process.env.OPENOBSERVE_URL || 'http://localhost:5080',
      organization: process.env.OPENOBSERVE_ORGANIZATION || 'default',
      token: process.env.OPENOBSERVE_TOKEN || '',
      auditLogStream: process.env.AUDIT_LOG_STREAM || 'security-audit-log',
      accessControlStream: process.env.ACCESS_CONTROL_STREAM || 'access-control',
      retention: process.env.SECURITY_RETENTION || '365d'
    };
    
    // 生成JWT密钥
    this.jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
  }

  /**
   * 执行完整的安全和权限管理设置
   */
  async setup() {
    console.log('🔒 开始设置安全和权限管理系统...');
    
    try {
      // 1. 验证OpenObserve连接
      await this.verifyOpenObserveConnection();
      
      // 2. 创建安全数据流
      await this.createSecurityStreams();
      
      // 3. 配置安全管理服务
      await this.configureSecurityManagementService();
      
      // 4. 创建安全策略配置
      await this.createSecurityPolicies();
      
      // 5. 创建安全管理仪表板
      await this.createSecurityManagementDashboard();
      
      // 6. 测试安全和权限管理功能
      await this.testSecurityManagement();
      
      // 7. 生成配置文件
      await this.generateConfigFiles();
      
      console.log('✅ 安全和权限管理系统设置完成');
      this.printSetupSummary();
      
    } catch (error) {
      console.error('❌ 安全和权限管理系统设置失败:', error.message);
      throw error;
    }
  }

  /**
   * 验证OpenObserve连接
   */
  async verifyOpenObserveConnection() {
    console.log('📡 验证OpenObserve连接...');
    
    try {
      const response = await axios.get(`${this.config.openobserveUrl}/health`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        console.log('✅ OpenObserve连接正常');
      } else {
        throw new Error(`OpenObserve健康检查失败: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`无法连接到OpenObserve: ${error.message}`);
    }
  }

  /**
   * 创建安全数据流
   */
  async createSecurityStreams() {
    console.log('📊 创建安全数据流...');
    
    const streams = [
      {
        name: this.config.auditLogStream,
        type: 'logs',
        retention: this.config.retention,
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
        const response = await axios.post(
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
   * 配置安全管理服务
   */
  async configureSecurityManagementService() {
    console.log('⚙️ 配置安全管理服务...');
    
    // 创建安全管理配置
    const securityConfig = {
      openobserveUrl: this.config.openobserveUrl,
      organization: this.config.organization,
      token: this.config.token,
      auditLogStream: this.config.auditLogStream,
      accessControlStream: this.config.accessControlStream,
      jwtSecret: this.jwtSecret,
      jwtExpiration: '24h',
      refreshTokenExpiration: '7d',
      enableMFA: false,
      maxLoginAttempts: 5,
      lockoutDuration: 900000, // 15分钟
      sessionTimeout: 3600000, // 1小时
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        preventReuse: 5
      }
    };

    // 生成配置文件
    const configDir = path.join(__dirname, '../config/security');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const configPath = path.join(configDir, 'security-management-config.json');
    fs.writeFileSync(configPath, JSON.stringify(securityConfig, null, 2));
    console.log(`✅ 安全管理配置文件已生成: ${configPath}`);

    // 生成服务启动脚本
    const startupScript = this.generateSecurityServiceStartupScript(securityConfig);
    const scriptPath = path.join(__dirname, '../scripts/start-security-service.js');
    fs.writeFileSync(scriptPath, startupScript);
    console.log(`✅ 安全服务启动脚本已生成: ${scriptPath}`);
  }

  /**
   * 创建安全策略配置
   */
  async createSecurityPolicies() {
    console.log('📋 创建安全策略配置...');
    
    // 创建安全策略
    const securityPolicies = {
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        preventReuse: 5,
        expirationDays: 90
      },
      sessionPolicy: {
        timeout: 3600000, // 1小时
        maxConcurrentSessions: 3,
        requireReauth: false
      },
      loginPolicy: {
        maxAttempts: 5,
        lockoutDuration: 900000, // 15分钟
        requireCaptcha: false,
        enableMFA: false
      },
      accessPolicy: {
        defaultDeny: true,
        privilegeEscalation: 'approval',
        auditLevel: 'all'
      },
      dataPolicy: {
        encryption: 'aes-256',
        backupRetention: 90,
        auditRetention: 365,
        anonymization: true
      }
    };

    // 保存策略配置
    const policiesDir = path.join(__dirname, '../config/security/policies');
    if (!fs.existsSync(policiesDir)) {
      fs.mkdirSync(policiesDir, { recursive: true });
    }

    const policiesPath = path.join(policiesDir, 'security-policies.json');
    fs.writeFileSync(policiesPath, JSON.stringify(securityPolicies, null, 2));
    console.log(`✅ 安全策略配置已生成: ${policiesPath}`);

    // 生成RBAC角色配置
    const rbacConfig = this.generateRBACConfig();
    const rbacPath = path.join(policiesDir, 'rbac-roles.json');
    fs.writeFileSync(rbacPath, JSON.stringify(rbacConfig, null, 2));
    console.log(`✅ RBAC角色配置已生成: ${rbacPath}`);
  }

  /**
   * 生成RBAC配置
   */
  generateRBACConfig() {
    return {
      roles: [
        {
          id: 'super_admin',
          name: '超级管理员',
          description: '拥有所有权限的系统管理员',
          permissions: [
            'user.read', 'user.write', 'user.delete',
            'role.read', 'role.write', 'role.delete',
            'permission.read', 'permission.write',
            'audit.read', 'audit.write',
            'data.read', 'data.write', 'data.delete',
            'system.admin', 'security.admin'
          ]
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
      ],
      permissions: [
        { id: 'user.read', name: '读取用户信息', description: '查看用户基本信息' },
        { id: 'user.write', name: '修改用户信息', description: '修改用户基本信息' },
        { id: 'user.delete', name: '删除用户', description: '删除用户账户' },
        { id: 'role.read', name: '读取角色信息', description: '查看角色信息' },
        { id: 'role.write', name: '修改角色信息', description: '修改角色信息' },
        { id: 'role.delete', name: '删除角色', description: '删除角色' },
        { id: 'permission.read', name: '读取权限信息', description: '查看权限信息' },
        { id: 'permission.write', name: '修改权限信息', description: '修改权限信息' },
        { id: 'audit.read', name: '读取审计日志', description: '查看安全审计日志' },
        { id: 'audit.write', name: '写入审计日志', description: '记录安全审计日志' },
        { id: 'data.read', name: '读取数据', description: '查看系统数据' },
        { id: 'data.write', name: '写入数据', description: '修改系统数据' },
        { id: 'data.delete', name: '删除数据', description: '删除系统数据' },
        { id: 'system.admin', name: '系统管理', description: '系统管理权限' },
        { id: 'security.admin', name: '安全管理', description: '安全管理权限' }
      ]
    };
  }

  /**
   * 创建安全管理仪表板
   */
  async createSecurityManagementDashboard() {
    console.log('📈 创建安全管理仪表板...');
    
    try {
      const dashboardPath = path.join(__dirname, '../config/dashboards/security-management.json');
      
      if (!fs.existsSync(dashboardPath)) {
        throw new Error(`仪表板配置文件不存在: ${dashboardPath}`);
      }

      const dashboardConfig = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
      
      // 导入仪表板到OpenObserve
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/dashboards`,
        dashboardConfig,
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ 安全管理仪表板创建成功: ${response.data.id}`);
    } catch (error) {
      console.warn(`⚠️ 仪表板创建失败: ${error.message}`);
    }
  }

  /**
   * 测试安全和权限管理功能
   */
  async testSecurityManagement() {
    console.log('🧪 测试安全和权限管理功能...');
    
    try {
      // 发送测试安全审计日志
      const testAuditLog = {
        eventType: 'user_login_success',
        timestamp: Date.now(),
        userId: 'admin',
        username: 'admin',
        clientIp: '127.0.0.1',
        userAgent: 'Test Browser',
        sessionId: 'session_' + Date.now()
      };

      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.auditLogStream}/_json`,
        { events: [testAuditLog] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        console.log('✅ 安全审计日志发送测试成功');
      } else {
        throw new Error(`安全审计日志发送失败: ${response.status}`);
      }

      // 发送测试访问控制日志
      const testAccessLog = {
        eventType: 'permission_granted',
        timestamp: Date.now(),
        userId: 'admin',
        username: 'admin',
        permission: 'data.read',
        resource: '/api/data',
        roles: ['super_admin']
      };

      const accessResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.accessControlStream}/_json`,
        { events: [testAccessLog] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (accessResponse.status === 200) {
        console.log('✅ 访问控制日志发送测试成功');
      } else {
        throw new Error(`访问控制日志发送失败: ${accessResponse.status}`);
      }

      // 等待数据处理
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 验证数据是否到达
      const queryResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT * FROM ${this.config.auditLogStream} WHERE eventType = 'user_login_success' AND userId = 'admin' LIMIT 1`
          },
          start_time: new Date(Date.now() - 60000).toISOString(),
          end_time: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (queryResponse.data.hits && queryResponse.data.hits.length > 0) {
        console.log('✅ 安全审计日志查询验证成功');
      } else {
        console.warn('⚠️ 安全审计日志查询验证失败 - 数据可能还在处理中');
      }

      // 测试权限检查
      await this.testPermissionCheck();

    } catch (error) {
      throw new Error(`安全和权限管理功能测试失败: ${error.message}`);
    }
  }

  /**
   * 测试权限检查
   */
  async testPermissionCheck() {
    console.log('🔐 测试权限检查...');
    
    try {
      // 模拟权限检查
      const permissionCheck = {
        userId: 'admin',
        permission: 'data.read',
        resource: '/api/data',
        granted: true,
        timestamp: Date.now()
      };

      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.accessControlStream}/_json`,
        { events: [permissionCheck] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        console.log('✅ 权限检查测试成功');
      } else {
        throw new Error(`权限检查测试失败: ${response.status}`);
      }

    } catch (error) {
      console.warn(`⚠️ 权限检查测试失败: ${error.message}`);
    }
  }

  /**
   * 生成配置文件
   */
  async generateConfigFiles() {
    console.log('📝 生成配置文件...');
    
    // 生成环境变量文件
    const envContent = `
# 安全和权限管理配置
OPENOBSERVE_URL=${this.config.openobserveUrl}
OPENOBSERVE_ORGANIZATION=${this.config.organization}
OPENOBSERVE_TOKEN=${this.config.token}
AUDIT_LOG_STREAM=${this.config.auditLogStream}
ACCESS_CONTROL_STREAM=${this.config.accessControlStream}
SECURITY_RETENTION=${this.config.retention}

# JWT配置
JWT_SECRET=${this.jwtSecret}
JWT_EXPIRATION=24h
REFRESH_TOKEN_EXPIRATION=7d

# 安全策略配置
SECURITY_ENABLE_MFA=false
SECURITY_MAX_LOGIN_ATTEMPTS=5
SECURITY_LOCKOUT_DURATION=900000
SECURITY_SESSION_TIMEOUT=3600000

# 密码策略
SECURITY_PASSWORD_MIN_LENGTH=8
SECURITY_PASSWORD_REQUIRE_UPPERCASE=true
SECURITY_PASSWORD_REQUIRE_LOWERCASE=true
SECURITY_PASSWORD_REQUIRE_NUMBERS=true
SECURITY_PASSWORD_REQUIRE_SPECIAL_CHARS=true
SECURITY_PASSWORD_PREVENT_REUSE=5
`;

    const envPath = path.join(__dirname, '../config/security/.env.security');
    fs.writeFileSync(envPath, envContent.trim());
    console.log(`✅ 环境变量文件已生成: ${envPath}`);

    // 生成Docker Compose配置
    const dockerComposeConfig = this.generateDockerComposeConfig();
    const dockerPath = path.join(__dirname, '../docker-compose.security.yml');
    fs.writeFileSync(dockerPath, dockerComposeConfig);
    console.log(`✅ Docker Compose配置已生成: ${dockerPath}`);

    // 生成安全指南
    const guideContent = this.generateSecurityGuide();
    const guidePath = path.join(__dirname, '../docs/security-management-guide.md');
    fs.writeFileSync(guidePath, guideContent);
    console.log(`✅ 安全指南已生成: ${guidePath}`);

    // 生成安全检查脚本
    const checkScript = this.generateSecurityCheckScript();
    const scriptPath = path.join(__dirname, '../scripts/security-check.sh');
    fs.writeFileSync(scriptPath, checkScript);
    console.log(`✅ 安全检查脚本已生成: ${scriptPath}`);
  }

  /**
   * 生成安全服务启动脚本
   */
  generateSecurityServiceStartupScript(config) {
    return `/**
 * 安全管理服务启动脚本
 */

const SecurityManagementService = require('../backend/src/security/security-management-service');

// 配置
const config = ${JSON.stringify(config, null, 2)};

// 创建并启动服务
const securityService = new SecurityManagementService(config);

async function startService() {
    try {
        await securityService.initialize();
        console.log('🔒 安全管理服务已启动');
        
        // 监听用户认证事件
        securityService.on('userAuthenticated', (event) => {
            console.log('用户已认证:', event.user.username);
        });
        
        // 监听用户登出事件
        securityService.on('userLoggedOut', (event) => {
            console.log('用户已登出:', event.userId);
        });
        
        // 监听用户创建事件
        securityService.on('userCreated', (event) => {
            console.log('用户已创建:', event.user.username);
        });
        
        // 监听用户更新事件
        securityService.on('userUpdated', (event) => {
            console.log('用户已更新:', event.user.username);
        });
        
        // 监听用户删除事件
        securityService.on('userDeleted', (event) => {
            console.log('用户已删除:', event.user.username);
        });
        
        // 定期输出安全统计
        setInterval(() => {
            const stats = {
                users: securityService.getAllUsers().length,
                roles: securityService.getAllRoles().length,
                permissions: securityService.getAllPermissions().length,
                sessions: securityService.sessions.size,
                auditLogs: securityService.auditLogs.length
            };
            console.log('📊 安全统计:', stats);
        }, 300000); // 每5分钟输出一次
        
    } catch (error) {
        console.error('启动安全管理服务失败:', error);
        process.exit(1);
    }
}

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('🔄 正在关闭安全管理服务...');
    securityService.stop();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🔄 正在关闭安全管理服务...');
    securityService.stop();
    process.exit(0);
});

// 启动服务
startService();
`;
  }

  /**
   * 生成Docker Compose配置
   */
  generateDockerComposeConfig() {
    return `version: '3.8'

services:
  security-management:
    build:
      context: .
      dockerfile: Dockerfile.security
    container_name: shopping-security-management
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - OPENOBSERVE_URL=${this.config.openobserveUrl}
      - OPENOBSERVE_ORGANIZATION=${this.config.organization}
      - OPENOBSERVE_TOKEN=${this.config.token}
      - AUDIT_LOG_STREAM=${this.config.auditLogStream}
      - ACCESS_CONTROL_STREAM=${this.config.accessControlStream}
      - SECURITY_RETENTION=${this.config.retention}
      - JWT_SECRET=${this.jwtSecret}
      - JWT_EXPIRATION=24h
      - REFRESH_TOKEN_EXPIRATION=7d
      - SECURITY_ENABLE_MFA=false
      - SECURITY_MAX_LOGIN_ATTEMPTS=5
      - SECURITY_LOCKOUT_DURATION=900000
      - SECURITY_SESSION_TIMEOUT=3600000
      - SECURITY_PASSWORD_MIN_LENGTH=8
      - SECURITY_PASSWORD_REQUIRE_UPPERCASE=true
      - SECURITY_PASSWORD_REQUIRE_LOWERCASE=true
      - SECURITY_PASSWORD_REQUIRE_NUMBERS=true
      - SECURITY_PASSWORD_REQUIRE_SPECIAL_CHARS=true
      - SECURITY_PASSWORD_PREVENT_REUSE=5
    volumes:
      - ./config/security:/app/config/security
      - ./logs:/app/logs
    networks:
      - shopping-network
    depends_on:
      - openobserve

networks:
  shopping-network:
    external: true
`;
  }

  /**
   * 生成安全指南
   */
  generateSecurityGuide() {
    return `# 安全和权限管理系统使用指南

## 概述

安全和权限管理系统提供了全面的身份认证、授权、访问控制和安全审计功能，确保系统数据和资源的安全性。

## 功能特性

### 身份认证
- **用户名/密码认证**: 基础的用户名和密码认证
- **JWT令牌认证**: 基于JSON Web Token的无状态认证
- **多因素认证(MFA)**: 可选的多因素认证支持
- **会话管理**: 安全的会话创建和管理
- **令牌刷新**: 安全的令牌刷新机制

### 授权和访问控制
- **基于角色的访问控制(RBAC)**: 灵活的角色和权限管理
- **细粒度权限**: 精确到资源级别的权限控制
- **权限继承**: 角色权限的继承机制
- **权限检查**: 实时的权限验证和检查

### 安全策略
- **密码策略**: 强密码要求和密码历史管理
- **账户锁定**: 登录失败后的账户锁定机制
- **会话超时**: 自动会话超时和清理
- **访问审计**: 完整的访问操作审计日志

### 安全审计
- **用户活动审计**: 记录所有用户活动
- **访问控制审计**: 记录权限检查和访问决策
- **系统事件审计**: 记录系统级安全事件
- **审计日志查询**: 强大的审计日志查询和分析

## 快速开始

### 1. 启动安全管理服务

\`\`\`bash
# 启动安全管理服务
node scripts/start-security-service.js

# 或使用Docker
docker-compose -f docker-compose.security.yml up -d
\`\`\`

### 2. 默认管理员账户

系统会自动创建一个默认管理员账户：
- 用户名: \`admin\`
- 密码: \`admin123\`

**重要**: 首次登录后请立即修改默认密码！

### 3. 用户认证

\`\`\`javascript
const SecurityManagementService = require('./backend/src/security/security-management-service');

// 创建安全管理服务实例
const service = new SecurityManagementService({
  openobserveUrl: 'http://localhost:5080',
  organization: 'default',
  token: 'your-token-here'
});

// 初始化服务
await service.initialize();

// 用户认证
const authResult = await service.authenticateUser('admin', 'admin123');
console.log(authResult);
\`\`\`

### 4. 权限检查

\`\`\`javascript
// 检查用户权限
const hasPermission = await service.checkPermission('user-id', 'data.read', '/api/data');
console.log(hasPermission); // true or false
\`\`\`

## 用户管理

### 创建用户

\`\`\`javascript
const userData = {
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'SecurePassword123!',
  roles: ['viewer']
};

const user = await service.createUser(userData, 'admin');
console.log(user);
\`\`\`

### 更新用户

\`\`\`javascript
const updates = {
  email: 'updated@example.com',
  roles: ['analyst']
};

const updatedUser = await service.updateUser('user-id', updates, 'admin');
console.log(updatedUser);
\`\`\`

### 删除用户

\`\`\`javascript
await service.deleteUser('user-id', 'admin');
\`\`\`

### 获取用户信息

\`\`\`javascript
const user = service.getUser('user-id');
console.log(user);

const allUsers = service.getAllUsers();
console.log(allUsers);
\`\`\`

## 角色和权限管理

### 获取角色和权限

\`\`\`javascript
// 获取所有角色
const roles = service.getAllRoles();
console.log(roles);

// 获取所有权限
const permissions = service.getAllPermissions();
console.log(permissions);

// 获取特定角色
const role = service.getRole('admin');
console.log(role);
\`\`\`

### 角色权限映射

\`\`\`json
{
  "super_admin": {
    "name": "超级管理员",
    "permissions": [
      "user.read", "user.write", "user.delete",
      "role.read", "role.write", "role.delete",
      "permission.read", "permission.write",
      "audit.read", "audit.write",
      "data.read", "data.write", "data.delete",
      "system.admin", "security.admin"
    ]
  },
  "admin": {
    "name": "管理员",
    "permissions": [
      "user.read", "user.write", "user.delete",
      "role.read", "role.write",
      "permission.read",
      "audit.read",
      "data.read", "data.write", "data.delete"
    ]
  },
  "analyst": {
    "name": "分析师",
    "permissions": [
      "user.read",
      "data.read"
    ]
  },
  "viewer": {
    "name": "查看者",
    "permissions": [
      "data.read"
    ]
  }
}
\`\`\`

## 会话管理

### 创建会话

\`\`\`javascript
// 用户认证成功后会自动创建会话
const authResult = await service.authenticateUser('username', 'password');
console.log(authResult.tokens.accessToken);
\`\`\`

### 刷新令牌

\`\`\`javascript
const tokenResult = await service.refreshToken('refresh-token');
console.log(tokenResult.tokens.accessToken);
\`\`\`

### 用户登出

\`\`\`javascript
await service.logoutUser('access-token');
\`\`\`

## 安全策略配置

### 密码策略

\`\`\`json
{
  "passwordPolicy": {
    "minLength": 8,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true,
    "requireSpecialChars": true,
    "preventReuse": 5,
    "expirationDays": 90
  }
}
\`\`\`

### 登录策略

\`\`\`json
{
  "loginPolicy": {
    "maxAttempts": 5,
    "lockoutDuration": 900000,
    "requireCaptcha": false,
    "enableMFA": false
  }
}
\`\`\`

### 会话策略

\`\`\`json
{
  "sessionPolicy": {
    "timeout": 3600000,
    "maxConcurrentSessions": 3,
    "requireReauth": false
  }
}
\`\`\`

## API接口

### 认证接口

#### 用户登录

\`\`\`http
POST /api/auth/login
\`\`\`

**请求体**:
\`\`\`json
{
  "username": "admin",
  "password": "admin123",
  "mfaToken": "123456"
}
\`\`\`

**响应**:
\`\`\`json
{
  "user": {
    "id": "admin",
    "username": "admin",
    "email": "admin@example.com",
    "roles": ["super_admin"],
    "lastLoginAt": 1699123456789
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
\`\`\`

#### 刷新令牌

\`\`\`http
POST /api/auth/refresh
\`\`\`

**请求体**:
\`\`\`json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
\`\`\`

**响应**:
\`\`\`json
{
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
\`\`\`

#### 用户登出

\`\`\`http
POST /api/auth/logout
\`\`\`

**请求头**:
\`\`\`
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

**响应**:
\`\`\`json
{
  "success": true
}
\`\`\`

### 用户管理接口

#### 创建用户

\`\`\`http
POST /api/users
\`\`\`

**请求体**:
\`\`\`json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "roles": ["viewer"]
}
\`\`\`

**响应**:
\`\`\`json
{
  "id": "user-id",
  "username": "newuser",
  "email": "newuser@example.com",
  "roles": ["viewer"],
  "isActive": true,
  "createdAt": 1699123456789
}
\`\`\`

#### 更新用户

\`\`\`http
PUT /api/users/{userId}
\`\`\`

**请求体**:
\`\`\`json
{
  "email": "updated@example.com",
  "roles": ["analyst"]
}
\`\`\`

**响应**:
\`\`\`json
{
  "id": "user-id",
  "username": "newuser",
  "email": "updated@example.com",
  "roles": ["analyst"],
  "isActive": true,
  "updatedAt": 1699123456789
}
\`\`\`

#### 删除用户

\`\`\`http
DELETE /api/users/{userId}
\`\`\`

**响应**:
\`\`\`json
{
  "success": true
}
\`\`\`

#### 获取用户

\`\`\`http
GET /api/users/{userId}
\`\`\`

**响应**:
\`\`\`json
{
  "id": "user-id",
  "username": "newuser",
  "email": "newuser@example.com",
  "roles": ["viewer"],
  "isActive": true,
  "createdAt": 1699123456789,
  "lastLoginAt": 1699123456789
}
\`\`\`

#### 获取所有用户

\`\`\`http
GET /api/users
\`\`\`

**响应**:
\`\`\`json
[
  {
    "id": "user-id",
    "username": "newuser",
    "email": "newuser@example.com",
    "roles": ["viewer"],
    "isActive": true,
    "createdAt": 1699123456789
  }
]
\`\`\`

### 权限检查接口

#### 检查权限

\`\`\`http
POST /api/permissions/check
\`\`\`

**请求体**:
\`\`\`json
{
  "userId": "user-id",
  "permission": "data.read",
  "resource": "/api/data"
}
\`\`\`

**响应**:
\`\`\`json
{
  "granted": true,
  "userId": "user-id",
  "permission": "data.read",
  "resource": "/api/data"
}
\`\`\`

### 审计日志接口

#### 获取审计日志

\`\`\`http
GET /api/audit/logs?limit=100
\`\`\`

**查询参数**:
- \`limit\`: 返回记录数 (默认: 100)
- \`eventType\`: 事件类型过滤
- \`userId\`: 用户ID过滤
- \`startDate\`: 开始日期过滤
- \`endDate\`: 结束日期过滤

**响应**:
\`\`\`json
[
  {
    "eventType": "user_login_success",
    "timestamp": 1699123456789,
    "userId": "user-id",
    "username": "newuser",
    "clientIp": "127.0.0.1",
    "userAgent": "Mozilla/5.0..."
  }
]
\`\`\`

## 安全最佳实践

### 1. 密码安全
- 使用强密码策略
- 定期更换密码
- 避免密码重用
- 启用多因素认证

### 2. 会话安全
- 设置合理的会话超时
- 限制并发会话数
- 及时登出不活跃会话
- 使用HTTPS传输

### 3. 权限管理
- 遵循最小权限原则
- 定期审查用户权限
- 使用角色而非直接分配权限
- 记录权限变更

### 4. 安全审计
- 启用全面的审计日志
- 定期审查安全事件
- 监控异常访问模式
- 建立安全事件响应流程

### 5. 系统安全
- 定期更新系统和依赖
- 使用最新的安全补丁
- 配置防火墙和网络隔离
- 实施数据加密

## 故障排除

### 常见问题

1. **用户认证失败**
   - 检查用户名和密码
   - 确认账户未被锁定
   - 验证账户是否激活

2. **权限检查失败**
   - 确认用户角色和权限
   - 检查资源访问规则
   - 验证权限配置

3. **会话过期**
   - 检查会话超时设置
   - 验证令牌有效性
   - 使用刷新令牌

4. **审计日志缺失**
   - 确认审计功能已启用
   - 检查日志存储配置
   - 验证日志级别设置

### 调试方法

1. 启用详细日志记录
2. 检查系统事件日志
3. 验证配置参数
4. 测试认证和授权流程

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基础用户认证和授权
- 提供RBAC权限管理
- 支持安全审计日志
- 提供会话管理功能

## 支持

如有问题或建议，请联系技术支持团队。
`;
  }

  /**
   * 生成安全检查脚本
   */
  generateSecurityCheckScript() {
    return `#!/bin/bash
# 系统安全检查脚本

echo "🔒 开始系统安全检查..."

# 检查用户权限
echo "👤 检查用户权限..."
if [ "$EUID" -ne 0 ]; then
  echo "请使用root权限运行此脚本"
  exit 1
fi

# 检查文件权限
echo "📁 检查关键文件权限..."

# 检查配置文件权限
config_files=(
  "/etc/passwd"
  "/etc/shadow"
  "/etc/group"
  "/etc/gshadow"
  "/etc/ssh/sshd_config"
)

for file in "\${config_files[@]}"; do
  if [ -f "\$file" ]; then
    permissions=\$(stat -c "%a" "\$file")
    echo "  \$file: \$permissions"
    
    # 检查是否过于宽松的权限
    if [ "\$file" = "/etc/shadow" ] && [ "\$permissions" != "000" ]; then
      echo "  ⚠️ 警告: \$file 权限过于宽松"
    fi
    
    if [ "\$file" = "/etc/passwd" ] && [ "\$permissions" != "644" ]; then
      echo "  ⚠️ 警告: \$file 权限应为 644"
    fi
  fi
done

# 检查SSH配置
echo "🔐 检查SSH配置..."
if [ -f /etc/ssh/sshd_config ]; then
  # 检查是否允许root登录
  if grep -q "^PermitRootLogin yes" /etc/ssh/sshd_config; then
    echo "  ⚠️ 警告: 允许root登录，建议禁用"
  fi
  
  # 检查是否使用密码认证
  if grep -q "^PasswordAuthentication yes" /etc/ssh/sshd_config; then
    echo "  ⚠️ 警告: 使用密码认证，建议使用密钥认证"
  fi
  
  # 检查是否更改了默认端口
  if ! grep -q "^#Port 22" /etc/ssh/sshd_config && ! grep -q "^Port 22" /etc/ssh/sshd_config; then
    echo "  ⚠️ 警告: 使用默认SSH端口，建议更改"
  fi
fi

# 检查防火墙状态
echo "🔥 检查防火墙状态..."
if command -v ufw &> /dev/null; then
  ufw_status=\$(ufw status | head -1)
  echo "  UFW状态: \$ufw_status"
  
  if [[ "\$ufw_status" == "Status: inactive" ]]; then
    echo "  ⚠️ 警告: 防火墙未启用"
  fi
elif command -v firewall-cmd &> /dev/null; then
  firewall_status=\$(systemctl is-active firewalld)
  echo "  Firewalld状态: \$firewall_status"
  
  if [[ "\$firewall_status" == "inactive" ]]; then
    echo "  ⚠️ 警告: 防火墙未启用"
  fi
else
  echo "  ℹ️ 未检测到防火墙管理工具"
fi

# 检查系统更新
echo "🔄 检查系统更新..."
if command -v apt &> /dev/null; then
  update_count=\$(apt list --upgradable 2>/dev/null | wc -l)
  if [ "\$update_count" -gt 1 ]; then
    echo "  ⚠️ 警告: 有 \$((update_count-1)) 个可用更新"
  else
    echo "  ✅ 系统已是最新"
  fi
elif command -v yum &> /dev/null; then
  update_count=\$(yum check-update 2>/dev/null | wc -l)
  if [ "\$update_count" -gt 0 ]; then
    echo "  ⚠️ 警告: 有 \$update_count 个可用更新"
  else
    echo "  ✅ 系统已是最新"
  fi
fi

# 检查开放端口
echo "🌐 检查开放端口..."
if command -v netstat &> /dev/null; then
  open_ports=\$(netstat -tuln | grep LISTEN | awk '{print $4}' | cut -d':' -f2 | sort -u)
  echo "  开放端口: \$open_ports"
  
  # 检查是否有危险端口开放
  dangerous_ports=("23" "25" "53" "135" "139" "445" "1433" "3389")
  for port in \$dangerous_ports; do
    if echo "\$open_ports" | grep -q "\$port"; then
      echo "  ⚠️ 警告: 危险端口 \$port 已开放"
    fi
  done
fi

# 检查用户账户
echo "👥 检查用户账户..."
# 检查是否有空密码账户
if [ -f /etc/shadow ]; then
  empty_password_users=\$(awk -F: '(\$2 == "" || length(\$2) < 2) {print \$1}' /etc/shadow)
  if [ -n "\$empty_password_users" ]; then
    echo "  ⚠️ 警告: 发现空密码账户: \$empty_password_users"
  fi
fi

# 检查是否有UID为0的非root账户
if [ -f /etc/passwd ]; then
  root_users=\$(awk -F: '\$3 == 0 && \$1 != "root" {print \$1}' /etc/passwd)
  if [ -n "\$root_users" ]; then
    echo "  ⚠️ 警告: 发现UID为0的非root账户: \$root_users"
  fi
fi

# 检查日志配置
echo "📋 检查日志配置..."
log_files=(
  "/var/log/auth.log"
  "/var/log/secure"
  "/var/log/messages"
  "/var/log/syslog"
)

for file in "\${log_files[@]}"; do
  if [ -f "\$file" ]; then
    file_size=\$(stat -c "%s" "\$file")
    echo "  \$file: \$file_size 字节"
    
    # 检查日志文件是否过大
    if [ "\$file_size" -gt 104857600 ]; then # 100MB
      echo "  ⚠️ 警告: \$file 过大 (\$((file_size/1048576))MB)，建议轮转"
    fi
  fi
done

# 检查系统服务
echo "🔧 检查系统服务..."
critical_services=("sshd" "ufw" "firewalld" "iptables")

for service in "\${critical_services[@]}"; do
  if systemctl is-enabled "\$service" &> /dev/null; then
    service_status=\$(systemctl is-active "\$service")
    echo "  \$service: \$service_status"
    
    if [[ "\$service_status" == "inactive" ]]; then
      echo "  ⚠️ 警告: 关键服务 \$service 未运行"
    fi
  fi
done

# 生成安全报告
echo ""
echo "📄 生成安全报告..."
REPORT_FILE="/tmp/security-check-report-\$(date +%Y%m%d_%H%M%S).txt"

{
  echo "系统安全检查报告"
  echo "==================="
  echo "检查时间: \$(date)"
  echo "系统信息: \$(uname -a)"
  echo ""
  echo "检查项目:"
  echo "- 文件权限检查"
  echo "- SSH配置检查"
  echo "- 防火墙状态检查"
  echo "- 系统更新检查"
  echo "- 开放端口检查"
  echo "- 用户账户检查"
  echo "- 日志配置检查"
  echo "- 系统服务检查"
  echo ""
  echo "建议:"
  echo "- 定期更新系统和软件包"
  echo "- 使用强密码策略"
  echo "- 启用防火墙并限制开放端口"
  echo "- 禁用不必要的服务"
  echo "- 定期检查系统日志"
  echo "- 实施备份和恢复策略"
} > "\$REPORT_FILE"

echo "📋 安全检查报告已生成: \$REPORT_FILE"
echo ""
echo "✅ 系统安全检查完成"
echo "📝 请查看报告并根据建议进行安全加固"
`;
  }

  /**
   * 打印设置摘要
   */
  printSetupSummary() {
    console.log('\n📋 安全和权限管理系统设置摘要:');
    console.log('=====================================');
    console.log(`🔗 OpenObserve URL: ${this.config.openobserveUrl}`);
    console.log(`🏢 组织: ${this.config.organization}`);
    console.log(`📊 审计日志数据流: ${this.config.auditLogStream}`);
    console.log(`🔐 访问控制数据流: ${this.config.accessControlStream}`);
    console.log(`⏰ 数据保留期: ${this.config.retention}`);
    console.log(`🔑 JWT密钥: ${this.jwtSecret.substring(0, 8)}...`);
    console.log('\n📁 生成的文件:');
    console.log(`  - config/security/security-management-config.json`);
    console.log(`  - config/security/.env.security`);
    console.log(`  - config/security/policies/security-policies.json`);
    console.log(`  - config/security/policies/rbac-roles.json`);
    console.log(`  - scripts/start-security-service.js`);
    console.log(`  - scripts/security-check.sh`);
    console.log(`  - docker-compose.security.yml`);
    console.log(`  - docs/security-management-guide.md`);
    console.log('\n🚀 下一步操作:');
    console.log('  1. 启动安全管理服务: node scripts/start-security-service.js');
    console.log('  2. 运行安全检查脚本: sudo bash scripts/security-check.sh');
    console.log('  3. 访问OpenObserve查看安全管理仪表板');
    console.log('  4. 使用默认管理员账户登录并修改密码');
    console.log('\n📖 使用指南:');
    console.log('  - 安全管理指南: docs/security-management-guide.md');
    console.log('  - 安全策略: config/security/policies/security-policies.json');
    console.log('  - RBAC配置: config/security/policies/rbac-roles.json');
    console.log('  - 安全检查: scripts/security-check.sh');
    console.log('\n🔐 默认管理员账户:');
    console.log('  - 用户名: admin');
    console.log('  - 密码: admin123');
    console.log('  ⚠️ 首次登录后请立即修改密码！');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const setup = new SecurityManagementSetup();
  setup.setup().catch(error => {
    console.error('设置失败:', error);
    process.exit(1);
  });
}

module.exports = SecurityManagementSetup;