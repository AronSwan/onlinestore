# Test Monitor 安全功能实现指南

## 概述

本指南详细介绍了Test Monitor统一版本中实现的安全功能，包括配置文件加密存储和进程运行用户验证。这些功能增强了Test Monitor的安全性，使其更适合在生产环境中使用。

## 安全功能列表

1. **配置文件加密存储 (SEC-1.3.2)**
2. **进程运行用户验证 (SEC-1.4.2)**

## 1. 配置文件加密存储

### 功能描述

配置文件加密存储功能允许您对敏感配置信息进行加密，防止未经授权的访问。该功能使用AES-256-GCM加密算法，确保配置数据的机密性和完整性。

### 实现原理

1. **密钥管理**:
   - 使用PBKDF2算法从用户密码派生加密密钥
   - 盐值存储在用户主目录的`.test-monitor`文件夹中
   - 支持环境变量`CONFIG_ENCRYPTION_PASSWORD`设置密码

2. **加密过程**:
   - 生成随机IV（初始化向量）
   - 使用AES-256-GCM算法加密配置数据
   - 生成认证标签确保数据完整性

3. **存储格式**:
   ```json
   {
     "iv": "base64编码的IV",
     "tag": "base64编码的认证标签",
     "data": "base64编码的加密数据"
   }
   ```

### 使用方法

#### 1. 加密配置文件

```bash
# 设置加密密码环境变量
export CONFIG_ENCRYPTION_PASSWORD="your-secure-password"

# 加密配置文件
node backend/scripts/security/config-encryption.js encrypt
```

#### 2. 解密配置文件

```bash
# 设置加密密码环境变量
export CONFIG_ENCRYPTION_PASSWORD="your-secure-password"

# 解密配置文件
node backend/scripts/security/config-encryption.js decrypt
```

#### 3. 检查配置文件是否已加密

```bash
node backend/scripts/security/config-encryption.js check
```

#### 4. 在Test Monitor中使用加密配置

1. 启用配置加密功能:
   ```json
   {
     "security": {
       "encryption": {
         "enabled": true,
         "password": "your-secure-password"
       }
     }
   }
   ```

2. 设置环境变量:
   ```bash
   export CONFIG_ENCRYPTION_PASSWORD="your-secure-password"
   ```

3. 运行Test Monitor:
   ```bash
   node backend/scripts/test-monitor.cjs --once
   ```

### 最佳实践

1. **密码管理**:
   - 使用强密码（至少12个字符，包含大小写字母、数字和特殊字符）
   - 定期更换密码
   - 不要在代码中硬编码密码
   - 使用密码管理器存储密码

2. **环境配置**:
   - 在生产环境中启用配置加密
   - 使用环境变量设置加密密码
   - 限制对加密配置文件的访问权限

3. **备份策略**:
   - 定期备份加密配置文件
   - 安全存储加密密码
   - 测试配置文件的解密和恢复过程

## 2. 进程运行用户验证

### 功能描述

进程运行用户验证功能确保Test Monitor只能由授权用户运行，防止未经授权的用户执行测试监控任务。该功能支持用户白名单、用户组验证和禁止用户列表。

### 实现原理

1. **用户验证**:
   - 获取当前运行用户信息
   - 检查用户是否在禁止列表中
   - 检查用户是否在允许列表中（严格模式）

2. **用户组验证**:
   - 获取用户所属的组
   - 检查用户组是否在允许列表中
   - 支持跨平台用户组获取

3. **配置管理**:
   - 支持从配置文件加载用户验证规则
   - 支持环境变量配置
   - 提供默认安全配置

### 使用方法

#### 1. 检查当前用户

```bash
node backend/scripts/security/user-validation.js current
```

#### 2. 检查用户所属的组

```bash
node backend/scripts/security/user-validation.js groups
```

#### 3. 验证当前用户

```bash
node backend/scripts/security/user-validation.js check
```

#### 4. 生成用户验证配置

```bash
node backend/scripts/security/user-validation.js generate-config
```

#### 5. 在Test Monitor中启用用户验证

1. 启用用户验证功能:
   ```json
   {
     "security": {
       "userValidation": {
         "enabled": true,
         "strictMode": false,
         "allowedUsers": ["test-monitor", "ci"],
         "allowedGroups": ["test-monitor", "docker"],
         "forbiddenUsers": ["root", "Administrator"]
       }
     }
   }
   ```

2. 运行Test Monitor:
   ```bash
   node backend/scripts/test-monitor.cjs --once
   ```

### 配置选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| enabled | boolean | false | 是否启用用户验证 |
| strictMode | boolean | false | 是否启用严格模式（只允许白名单中的用户） |
| allowedUsers | array | [] | 允许的用户列表 |
| allowedGroups | array | [] | 允许的用户组列表 |
| forbiddenUsers | array | ["root", "Administrator"] | 禁止的用户列表 |

### 环境变量

| 变量名 | 描述 |
|--------|------|
| TEST_MONITOR_STRICT_MODE | 启用严格模式（true/false） |
| TEST_MONITOR_ALLOWED_USERS | 允许的用户列表（逗号分隔） |
| TEST_MONITOR_ALLOWED_GROUPS | 允许的用户组列表（逗号分隔） |

### 最佳实践

1. **生产环境配置**:
   - 启用用户验证功能
   - 使用非特权用户运行Test Monitor
   - 配置适当的用户和用户组权限

2. **CI/CD环境**:
   - 创建专用的CI/CD用户
   - 将用户添加到允许列表中
   - 使用最小权限原则

3. **容器化部署**:
   - 在Dockerfile中创建非root用户
   - 设置适当的用户权限
   - 配置容器内的用户验证

## 安全功能集成示例

### 完整的安全配置

```json
{
  "security": {
    "commandWhitelist": ["npm", "node", "jest", "mocha"],
    "allowedPaths": ["/app", "/app/coverage", "/app/reports", "/app/test"],
    "enableSignatureVerification": true,
    "publicKeyPath": "/app/keys/public.pem",
    "logSanitization": true,
    "filePermissions": {
      "log": 384,
      "report": 420,
      "lock": 384
    },
    "pathValidation": {
      "enabled": true,
      "strictMode": false
    },
    "encryption": {
      "enabled": true,
      "password": ""
    },
    "userValidation": {
      "enabled": true,
      "strictMode": false,
      "allowedUsers": ["test-monitor"],
      "allowedGroups": ["test-monitor"],
      "forbiddenUsers": ["root", "Administrator"]
    }
  },
  "features": {
    "security": {
      "enabled": true,
      "pathValidation": true,
      "signatureVerification": true,
      "encryption": true,
      "userValidation": true
    }
  }
}
```

### Docker部署示例

#### Dockerfile

```dockerfile
FROM node:16-alpine

# 创建非root用户
RUN addgroup -g 1001 -S test-monitor && \
    adduser -S test-monitor -u 1001

# 设置工作目录
WORKDIR /app

# 复制文件
COPY --chown=test-monitor:test-monitor . .

# 设置权限
RUN chmod +x scripts/test-monitor.cjs

# 切换到非root用户
USER test-monitor

# 设置环境变量
ENV CONFIG_ENCRYPTION_PASSWORD=""
ENV NODE_ENV=production

# 运行Test Monitor
CMD ["node", "scripts/test-monitor.cjs", "--once"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  test-monitor:
    build: .
    environment:
      - CONFIG_ENCRYPTION_PASSWORD=${CONFIG_ENCRYPTION_PASSWORD}
      - NODE_ENV=production
    volumes:
      - ./reports:/app/reports
      - ./logs:/app/logs
      - ./keys:/app/keys
```

## 故障排除

### 常见问题

1. **配置文件解密失败**:
   - 检查加密密码是否正确
   - 确认配置文件确实已加密
   - 验证加密算法和参数是否匹配

2. **用户验证失败**:
   - 检查当前用户是否在禁止列表中
   - 确认用户组配置是否正确
   - 验证用户权限设置

3. **权限错误**:
   - 检查文件和目录权限
   - 确认用户有读取配置文件的权限
   - 验证用户有写入日志和报告目录的权限

### 调试技巧

1. **启用详细日志**:
   ```bash
   node backend/scripts/test-monitor.cjs --logLevel=DEBUG --once
   ```

2. **单独测试安全功能**:
   ```bash
   # 测试配置加密
   node backend/scripts/security/config-encryption.js check
   
   # 测试用户验证
   node backend/scripts/security/user-validation.js check
   ```

3. **检查配置文件**:
   ```bash
   # 检查配置文件是否加密
   node backend/scripts/security/config-encryption.js check test-monitor.config.json
   
   # 验证配置文件签名
   node backend/scripts/security/signature-verification.js verify
   ```

## 安全建议

1. **多层次安全**:
   - 结合使用所有安全功能
   - 不要依赖单一安全措施
   - 定期审查和更新安全配置

2. **监控和审计**:
   - 启用详细的日志记录
   - 定期检查安全事件日志
   - 设置安全事件告警

3. **定期更新**:
   - 保持Test Monitor为最新版本
   - 定期更新依赖库
   - 监控安全漏洞和威胁

4. **安全测试**:
   - 定期进行安全测试
   - 验证所有安全功能正常工作
   - 测试各种攻击场景

## 总结

通过实施配置文件加密存储和进程运行用户验证功能，Test Monitor的安全性得到了显著提升。这些功能与其他安全措施（如命令白名单、路径验证、签名验证等）一起，构成了一个全面的安全防护体系，确保Test Monitor在各种环境中都能安全可靠地运行。

为了最大化安全性，建议在生产环境中启用所有安全功能，并遵循本指南中的最佳实践。