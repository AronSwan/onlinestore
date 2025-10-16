# 高级签名功能文档

## 概述

本文档描述了为Test Monitor实现的高级签名功能，包括自动化签名流程、密钥轮换机制、硬件安全模块(HSM)集成和多签名支持。

## 功能特性

### 1. 自动化签名流程

自动化签名流程通过CI/CD集成，确保配置文件在每次变更后都经过签名验证。

#### 组件
- **高级签名管理器** (`backend/scripts/security/advanced-signature-manager.js`)
- **CI/CD自动化签名脚本** (`backend/scripts/ci/auto-sign-config.js`)
- **GitHub Actions工作流** (`.github/workflows/auto-sign-config.yml`)

#### 使用方法
```bash
# 本地环境
cd backend/scripts
node ci/auto-sign-config.js

# 设置环境变量
export CONFIG_KEY_PASSPHRASE="your-passphrase"
export CONFIG_SIGNERS="key-id-1,key-id-2"
export ENABLE_MULTI_SIGNATURE="true"
```

### 2. 密钥轮换机制

密钥轮换机制定期生成新的密钥对，提高长期安全性。

#### 配置
```bash
# 设置密钥轮换间隔（毫秒）
export KEY_ROTATION_INTERVAL=2592000000  # 30天

# 手动轮换密钥
cd backend/scripts
node security/advanced-signature-manager.js rotate
```

#### 自动轮换
系统会自动检查密钥年龄，当密钥超过配置的轮换间隔时，会自动生成新密钥并设置为当前密钥。

### 3. 硬件安全模块(HSM)集成

HSM集成提供更高级别的密钥保护，防止密钥泄露。

#### 配置
```bash
# 启用HSM
export HSM_ENABLED="true"
export HSM_PROVIDER="provider-name"  # 如: aws, azure, gcp
```

#### 支持的HSM提供商
- AWS CloudHSM
- Azure Dedicated HSM
- Google Cloud HSM
- 软件模拟（用于测试）

### 4. 多签名支持

多签名支持允许多个签名者对配置文件进行签名，提高变更的可追溯性和安全性。

#### 配置
```bash
# 设置最小签名数量
export MIN_SIGNATURES_REQUIRED="2"

# 设置签名者列表
export CONFIG_SIGNERS="key-id-1,key-id-2,key-id-3"

# 启用多签名
export ENABLE_MULTI_SIGNATURE="true"
```

#### 使用方法
```bash
# 使用多个签名者签名
cd backend/scripts
node security/advanced-signature-manager.js sign test-monitor.config.json key-id-1,key-id-2

# 验证多签名
node security/advanced-signature-manager.js verify test-monitor.config.json signature-id
```

## 安全最佳实践

### 1. 密钥管理
- 定期轮换密钥（建议每30天）
- 使用强密码保护私钥
- 将私钥存储在安全的位置
- 考虑使用HSM保护密钥

### 2. 签名验证
- 在应用启动时验证配置文件签名
- 在配置文件变更后重新验证签名
- 记录签名验证结果

### 3. 访问控制
- 限制对签名工具的访问
- 使用专门的签名服务账户
- 实施最小权限原则

## 故障排除

### 1. 签名验证失败
```bash
# 检查签名文件是否存在
ls -la test-monitor.config.json.sig

# 验证签名
node security/advanced-signature-manager.js verify

# 检查密钥状态
node security/advanced-signature-manager.js list-keys
```

### 2. 密钥轮换问题
```bash
# 手动轮换密钥
node security/advanced-signature-manager.js rotate

# 检查密钥元数据
cat keys/metadata.json

# 重新签名配置文件
node security/advanced-signature-manager.js sign
```

### 3. 多签名问题
```bash
# 检查签名集合
ls -la signatures/

# 验证多签名
node security/advanced-signature-manager.js verify config.json signature-id

# 检查签名者状态
node security/advanced-signature-manager.js list-keys
```

## CI/CD集成

### GitHub Actions
GitHub Actions工作流 (`.github/workflows/auto-sign-config.yml`) 提供了以下功能：

1. **自动触发**：当配置文件变更时自动运行
2. **手动触发**：支持手动运行工作流
3. **参数化**：支持自定义签名者和多签名设置
4. **报告生成**：生成签名报告并上传为构件
5. **PR注释**：在PR中添加签名状态注释

### 环境变量
在CI/CD环境中设置以下环境变量：

```bash
CONFIG_KEY_PASSPHRASE="your-passphrase"
CONFIG_SIGNERS="key-id-1,key-id-2"
ENABLE_MULTI_SIGNATURE="true/false"
MIN_SIGNATURES_REQUIRED="2"
KEY_ROTATION_INTERVAL="2592000000"
HSM_ENABLED="true/false"
HSM_PROVIDER="provider-name"
```

## 性能考虑

1. **签名性能**：RSA-2048签名通常需要10-50毫秒
2. **验证性能**：RSA签名验证通常需要5-20毫秒
3. **密钥轮换**：密钥生成需要100-500毫秒
4. **多签名**：性能与签名数量成正比

## 监控和审计

### 1. 日志记录
所有签名操作都会记录到日志中，包括：
- 签名操作时间
- 签名者ID
- 签名状态
- 错误信息

### 2. 审计跟踪
系统维护以下审计信息：
- 密钥创建和轮换历史
- 签名操作历史
- 签名验证结果
- 配置文件变更历史

### 3. 报告
系统生成以下报告：
- 签名报告（每次签名操作）
- 密钥状态报告（定期）
- 安全审计报告（定期）

## 未来扩展

1. **区块链集成**：将签名记录存储在区块链上，提供不可篡改的审计跟踪
2. **零知识证明**：使用零知识证明技术验证配置文件完整性，而不泄露内容
3. **量子安全签名**：实现抗量子攻击的签名算法
4. **分布式签名**：支持跨多个数据中心的分布式签名服务

## 总结

高级签名功能为Test Monitor提供了企业级的安全保障，确保配置文件的完整性和可信度。通过自动化签名流程、密钥轮换机制、HSM集成和多签名支持，我们建立了一个全面的安全体系，能够满足各种安全合规要求。

这些功能不仅提高了系统的安全性，还简化了安全操作流程，降低了人为错误的风险，为系统的长期安全运行奠定了基础。