# 签名系统文档

## 📋 概述

基于模块化架构的签名管理系统，提供完整的密钥管理、数字签名和验证功能。本系统从单文件架构成功重构为清晰的模块化设计，具备高安全性、高性能和良好的可维护性。

## 🏗️ 架构设计

### 模块化架构
```
backend/scripts/security/
├── key-management/          # 密钥管理基础设施
│   ├── index.js            # 模块入口
│   ├── key-manager.js      # 核心密钥管理
│   ├── trust-manager.js    # 信任策略管理
│   ├── key-cache.js        # 密钥缓存
│   └── windows-acl.js      # Windows ACL安全
├── signature-service/       # 签名业务服务
│   ├── index.js            # 模块入口
│   ├── signer.js           # 签名器
│   ├── verifier.js         # 验证器
│   └── multi-signature.js  # 多签名管理
├── shared/                  # 共享组件
│   ├── security-utils.js   # 安全工具
│   ├── error-handler.js    # 错误处理
│   └── config.js           # 配置管理
└── cli/                     # 命令行接口
    ├── key-management-cli.js
    ├── signature-service-cli.js
    └── unified-cli.js
```

### 核心特性

#### 密钥管理
- **密钥生命周期管理**: 生成、导入、导出、轮换、归档
- **信任策略管理**: 指纹信任、撤销、验证
- **密钥缓存**: 内存缓存提升性能
- **安全存储**: Windows ACL权限控制

#### 签名服务
- **数字签名**: RSA、ECDSA算法支持
- **多签名支持**: 多重签名和阈值签名
- **批量操作**: 批量签名和验证
- **文件监控**: 自动重新签名

#### 安全特性
- **口令策略**: 强制强口令验证
- **输入验证**: 严格的输入清理和验证
- **错误处理**: 结构化的错误恢复机制
- **审计日志**: 完整的操作审计

## 🚀 快速开始

### 系统要求
- Node.js 16.0+
- 支持的操作系统: Windows, Linux, macOS
- 磁盘空间: 至少100MB可用空间

### 安装和初始化

```bash
# 进入安全脚本目录
cd backend/scripts/security

# 初始化密钥管理系统
node cli/key-management-cli.js init

# 生成第一个密钥对
node cli/key-management-cli.js generate --key-id "main-key" --passphrase-env KEY_PASSPHRASE

# 验证系统状态
node cli/key-management-cli.js status
```

### 基础使用示例

```javascript
// 使用密钥管理
const { KeyManager } = require('./key-management');
const keyManager = new KeyManager();

// 生成密钥对
await keyManager.generateKeyPair('my-key', 'strong-passphrase');

// 导出公钥
const publicKey = keyManager.exportPublicKey('my-key');

// 使用签名服务
const { Signer } = require('./signature-service');
const signer = new Signer(keyManager);

// 签名数据
const signature = await signer.signData('重要数据', 'my-key', 'strong-passphrase');

// 验证签名
const { Verifier } = require('./signature-service');
const verifier = new Verifier(keyManager);
const isValid = await verifier.verifySignature('重要数据', signature, publicKey);
```

## ⚙️ 配置说明

### 环境变量
```bash
# 密钥管理配置
export KEY_MANAGEMENT_KEYS_DIR="./keys"
export KEY_ROTATION_INTERVAL="2592000000"  # 30天
export ENFORCE_STRONG_PASSPHRASE="true"
export MIN_PASSPHRASE_LENGTH="16"

# 签名服务配置
export MIN_SIGNATURES_REQUIRED="2"
export ASYNC_OPERATION_TIMEOUT="30000"
export MAX_CONCURRENT_OPERATIONS="5"

# 性能配置
export MAX_CACHE_SIZE="100"
export CACHE_TTL="300000"  # 5分钟
```

### 配置文件
系统使用 [`shared/config.js`](shared/config.js) 统一管理配置，支持环境变量覆盖和默认值。

## 📚 相关文档

- [快速开始指南](SIGNATURE_SYSTEM_QUICKSTART.md) - 快速上手教程
- [性能优化指南](SIGNATURE_SYSTEM_PERFORMANCE.md) - 性能调优和基准测试
- [安全指南](SIGNATURE_SYSTEM_SECURITY.md) - 安全配置和最佳实践
- [故障排除指南](SIGNATURE_SYSTEM_TROUBLESHOOTING.md) - 常见问题解决方案
- [重构完成报告](REFACTORING_COMPLETION_REPORT.md) - 架构重构详细记录

## 🧪 测试和验证

### 运行测试套件
```bash
# 运行所有测试
npm test

# 运行特定模块测试
npm test -- --testPathPattern="key-management"
npm test -- --testPathPattern="signature-service"

# 性能测试
node __tests__/performance/benchmark.js
```

### 测试覆盖
- **单元测试**: 42个测试用例覆盖核心功能
- **集成测试**: 组件间协作验证
- **性能测试**: 关键操作性能基准
- **安全测试**: 安全机制验证

## 🔧 开发指南

### 代码结构
- **key-management/**: 专注于密钥基础设施
- **signature-service/**: 专注于签名业务逻辑
- **shared/**: 可重用的共享组件
- **cli/**: 命令行接口封装

### 扩展开发
添加新算法支持：
```javascript
// 在 signature-service/signer.js 中添加
class Signer {
  async signWithNewAlgorithm(data, keyId, algorithm) {
    // 实现新算法签名逻辑
  }
}
```

## 🤝 贡献指南

### 开发流程
1. Fork 项目仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 代码规范
- 使用 ESLint 进行代码规范检查
- 编写完整的单元测试
- 更新相关文档
- 通过所有现有测试

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

### 获取帮助
- 查看 [故障排除指南](SIGNATURE_SYSTEM_TROUBLESHOOTING.md)
- 检查测试用例了解预期行为
- 查看重构文档了解架构设计

### 报告问题
如遇问题，请提供：
1. 错误信息和堆栈跟踪
2. 系统环境信息
3. 复现步骤
4. 相关配置信息

---

**最后更新**: 2025-10-14  
**版本**: 2.0.0 (模块化架构)  
**状态**: 生产就绪 ✅