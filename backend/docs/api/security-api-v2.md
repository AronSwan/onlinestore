# Test Monitor 安全 API v2.0

## 概述

Test Monitor 安全 API v2.0 基于新的安全模型，提供了更强大、更灵活的安全功能。与 v1.0 相比，v2.0 重点关注测试本身的影响，而不是用户的身份。

## 主要变化

### 新增功能

1. **测试影响评估**: 评估测试对环境的潜在影响
2. **环境隔离检查**: 检查测试是否在隔离环境中运行
3. **审计日志**: 记录所有测试活动的详细信息
4. **安全建议**: 提供针对性的安全建议

### 配置变化

1. **新增 testValidation 配置节**: 控制测试验证行为
2. **用户验证配置增强**: 分离特权用户列表和禁止用户列表
3. **日志脱敏配置增强**: 支持自定义脱敏模式

## API 接口

### 用户验证

#### getCurrentUser()

获取当前用户信息。

**返回值**:
```javascript
{
  username: string,    // 用户名
  uid: number,         // 用户ID
  gid: number,         // 组ID
  homedir: string,     // 主目录
  shell: string        // 默认shell
}
```

#### isUserAllowed(username)

检查用户是否在允许列表中。

**参数**:
- `username` (string): 用户名

**返回值**:
- `boolean`: 用户是否被允许

#### isUserForbidden(username)

检查用户是否在禁止列表中。

**参数**:
- `username` (string): 用户名

**返回值**:
- `boolean`: 用户是否被禁止

#### isPrivilegedUser(username)

检查用户是否为特权用户。

**参数**:
- `username` (string): 用户名

**返回值**:
- `boolean`: 用户是否为特权用户

#### validateCurrentUser(config)

验证当前用户是否有权限运行测试。

**参数**:
- `config` (object): 验证配置

**返回值**:
```javascript
{
  valid: boolean,           // 验证是否通过
  reason: string,            // 验证结果原因
  suggestion: string,        // 建议（如果验证失败）
  user: object,              // 用户信息
  groups: Array<string>,     // 用户组
  impact: object,            // 测试影响评估
  isolation: object,         // 环境隔离情况
  recommendations: Array<object>  // 安全建议
}
```

### 测试影响评估

#### assessTestImpact(testConfig)

评估测试对环境的潜在影响。

**参数**:
- `testConfig` (object): 测试配置

**返回值**:
```javascript
{
  level: string,             // 影响级别: low, medium, high
  areas: Array<string>,      // 影响区域: filesystem, network, system, database
  description: string,       // 影响描述
  recommendations: Array<string>  // 建议
}
```

### 环境隔离检查

#### checkEnvironmentIsolation()

检查当前环境是否为隔离环境。

**返回值**:
```javascript
{
  isIsolated: boolean,       // 是否隔离
  type: string,              // 隔离类型: docker, vm, container, native
  details: object            // 隔离详细信息
}
```

### 审计日志

#### logTestActivity(user, testConfig, impact, isolation)

记录测试活动到审计日志。

**参数**:
- `user` (object): 用户信息
- `testConfig` (object): 测试配置
- `impact` (object): 测试影响评估
- `isolation` (object): 环境隔离情况

**返回值**:
- `string`: 日志文件路径

### 安全建议

#### provideSecurityRecommendations(user, testConfig, impact, isolation)

提供针对性的安全建议。

**参数**:
- `user` (object): 用户信息
- `testConfig` (object): 测试配置
- `impact` (object): 测试影响评估
- `isolation` (object): 环境隔离情况

**返回值**:
```javascript
Array<{
  type: string,              // 建议类型: user, test, environment
  priority: string,          // 优先级: high, medium, low
  message: string,           // 建议消息
  reason: string             // 建议原因
}>
```

## 配置

### 默认配置

```javascript
{
  security: {
    version: "2.0.0",
    userValidation: {
      enabled: true,
      strictMode: false,
      allowedUsers: [
        "test-monitor",
        "ci",
        "jenkins",
        "gitlab-runner",
        "github-runner",
        "node"
      ],
      allowedGroups: [
        "test-monitor",
        "ci",
        "jenkins",
        "gitlab-runner",
        "github-runner",
        "node",
        "docker",
        "Users"
      ],
      forbiddenUsers: [
        "root",
        "Administrator"
      ],
      privilegedUsers: [
        "root",
        "Administrator"
      ],
      forbidPrivilegedUsers: false,
      checkGroups: true
    },
    testValidation: {
      enabled: true,
      defaultImpactLevel: "medium",
      requireIsolation: {
        low: false,
        medium: true,
        high: true
      },
      logActivities: true,
      maxLogEntries: 1000,
      auditLogPath: "./reports/test-audit-log.json"
    },
    encryption: {
      enabled: true,
      algorithm: "aes-256-gcm",
      keyDerivation: "pbkdf2",
      iterations: 100000
    },
    signatureVerification: {
      enabled: true,
      algorithm: "rsa-sha256",
      keySize: 2048
    },
    logSanitization: {
      enabled: true,
      patterns: [
        {
          name: "password",
          pattern: "password\\s*=\\s*[\"'][^\"']+[\"']",
          replacement: "password=\"***\""
        },
        {
          name: "api_key",
          pattern: "api_key\\s*=\\s*[\"'][^\"']+[\"']",
          replacement: "api_key=\"***\""
        },
        {
          name: "token",
          pattern: "token\\s*=\\s*[\"'][^\"']+[\"']",
          replacement: "token=\"***\""
        },
        {
          name: "path",
          pattern: "(/Users/[^/]+|/home/[^/]+|C:\\\\\\\\Users\\\\\\\\[^\\\\\\\\]+)",
          replacement: "$1***"
        }
      ]
    }
  },
  features: {
    security: {
      enabled: true,
      pathValidation: true,
      signatureVerification: true,
      encryption: true,
      userValidation: true,
      testValidation: true,
      logSanitization: true
    },
    performance: {
      enabled: false
    },
    notifications: {
      enabled: false
    },
    reports: {
      enabled: true,
      html: false,
      json: true
    }
  },
  logging: {
    level: "INFO",
    format: "json",
    file: "./logs/test-monitor.log",
    maxFileSize: "10MB",
    maxFiles: 5
  }
}
```

### 配置迁移

使用配置迁移工具从 v1.0 迁移到 v2.0：

```bash
node scripts/security/config-migration-tool.cjs old-config.json new-config.json migration-report.json
```

## 使用示例

### 基本验证

```javascript
const { validateCurrentUser } = require('./security/user-validation-compatibility');

const result = validateCurrentUser();
if (result.valid) {
  console.log('用户验证通过');
} else {
  console.log(`用户验证失败: ${result.reason}`);
  console.log(`建议: ${result.suggestion}`);
}
```

### 测试影响评估

```javascript
const { assessTestImpact } = require('./security/user-validation-compatibility');

const testConfig = {
  type: 'integration',
  name: 'API集成测试',
  description: '测试API集成功能'
};

const impact = assessTestImpact(testConfig);
console.log(`测试影响级别: ${impact.level}`);
console.log(`影响区域: ${impact.areas.join(', ')}`);
console.log(`建议: ${impact.recommendations.join(', ')}`);
```

### 完整验证流程

```javascript
const { validateTestRun } = require('./security/user-validation-compatibility');

const testConfig = {
  type: 'integration',
  name: 'API集成测试',
  description: '测试API集成功能'
};

const result = validateTestRun(testConfig);

// 显示测试影响
console.log(`测试影响级别: ${result.impact.level}`);
console.log(`影响区域: ${result.impact.areas.join(', ')}`);

// 显示环境隔离情况
console.log(`环境隔离: ${result.isolation.isIsolated ? result.isolation.type : '未隔离'}`);

// 显示安全建议
if (result.recommendations.length > 0) {
  console.log('\n安全建议:');
  result.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec.message}`);
  });
}

// 记录测试活动
console.log(`测试活动已记录: ${result.logPath}`);
```

## 兼容性

### 向后兼容

v2.0 API 提供了与 v1.0 兼容的接口，通过兼容性适配器实现：

```javascript
// v1.0 接口（仍然可用）
const { 
  getCurrentUser, 
  isUserAllowed, 
  isUserForbidden, 
  isPrivilegedUser, 
  getUserGroups, 
  isGroupAllowed, 
  validateCurrentUser, 
  loadUserConfig 
} = require('./security/user-validation-compatibility');

// v2.0 新接口
const { 
  assessTestImpact, 
  checkEnvironmentIsolation, 
  logTestActivity, 
  provideSecurityRecommendations, 
  validateTestRun 
} = require('./security/user-validation-compatibility');
```

### 迁移指南

详细的迁移指南请参考 [安全模型迁移指南](./security-model-migration-guide.md)。

## 最佳实践

1. **使用测试影响评估**: 在运行测试前，评估测试对环境的潜在影响
2. **检查环境隔离**: 对于中等和高影响的测试，确保在隔离环境中运行
3. **遵循安全建议**: 根据系统提供的建议调整测试配置
4. **定期审查审计日志**: 定期检查审计日志，了解测试活动和安全状况
5. **保持配置更新**: 定期更新配置，确保使用最新的安全设置

## 故障排除

### 常见问题

1. **配置验证失败**: 检查配置文件格式和内容是否正确
2. **审计日志无法写入**: 检查日志目录权限和磁盘空间
3. **环境隔离检测失败**: 检查系统环境和权限

### 调试模式

启用调试模式获取更多信息：

```javascript
process.env.DEBUG = 'test-monitor:*';
```

## 更新日志

### v2.0.0

- 新增测试影响评估功能
- 新增环境隔离检查功能
- 新增审计日志功能
- 新增安全建议功能
- 重构用户验证逻辑，分离特权用户和禁止用户
- 增强日志脱敏配置
- 提供配置迁移工具