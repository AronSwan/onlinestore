# 签名系统快速开始指南

## 🚀 快速入门

本指南将帮助您在10分钟内完成签名系统的安装、配置和基础使用。系统采用模块化架构，操作简单直观。

## ⚡ 5分钟快速部署

### 环境要求检查

```bash
# 检查Node.js版本
node --version  # 需要 Node.js 16.0+

# 检查系统环境
npm --version   # 需要 npm 6.0+

# 检查磁盘空间
df -h .  # 需要至少100MB可用空间
```

### 一键初始化脚本

```bash
#!/bin/bash
# quick-init.sh

echo "🚀 开始签名系统快速初始化..."

# 1. 创建必要目录
mkdir -p {keys,trust,signatures,logs,backups}

# 2. 设置基础环境变量
export KEY_MANAGEMENT_KEYS_DIR="./keys"
export ENFORCE_STRONG_PASSPHRASE="true"
export MIN_PASSPHRASE_LENGTH="12"

# 3. 运行系统初始化
node cli/key-management-cli.js init --quick

# 4. 生成演示密钥对
node cli/key-management-cli.js generate \
  --key-id "demo-key" \
  --passphrase "TempPass123!" \
  --comment "演示用途密钥"

echo "✅ 初始化完成！"
```

## 🛠️ 基础配置

### 最小化配置

创建 `.env` 文件：

```bash
# 基础配置
KEY_MANAGEMENT_KEYS_DIR=./keys
SIGNATURE_SERVICE_SIGNATURES_DIR=./signatures
KEY_MANAGEMENT_TRUST_DIR=./trust

# 安全配置
ENFORCE_STRONG_PASSPHRASE=true
MIN_PASSPHRASE_LENGTH=12

# 性能配置
MAX_CACHE_SIZE=50
CACHE_TTL=300000
```

### 验证配置

```javascript
// verify-config.js
const CONFIG = require('./shared/config');
const requiredConfigs = [
  'keysDir',
  'signaturesDir', 
  'trustStoreDir'
];

console.log('📋 配置验证结果:');
requiredConfigs.forEach(key => {
  const value = CONFIG[key];
  const status = value ? '✅' : '❌';
  console.log(`${status} ${key}: ${value || '未设置'}`);
});
```

## 🔑 密钥管理快速开始

### 1. 生成第一个密钥对

```bash
# 方法1: 使用CLI（推荐）
node cli/key-management-cli.js generate \
  --key-id "my-first-key" \
  --passphrase "MyStrongPass123!" \
  --algorithm "RSA" \
  --key-size 2048

# 方法2: 使用Node.js API
const { KeyManager } = require('./key-management');
const keyManager = new KeyManager();

const keyPair = await keyManager.generateKeyPair(
  'my-first-key',
  'MyStrongPass123!'
);
console.log('密钥对生成成功:', keyPair);
```

### 2. 查看密钥列表

```bash
# 查看所有密钥
node cli/key-management-cli.js list-keys

# 查看密钥详情
node cli/key-management-cli.js key-info --key-id "my-first-key"
```

### 3. 导出公钥

```bash
# 导出到文件
node cli/key-management-cli.js export-public \
  --key-id "my-first-key" \
  --output "my-first-key.pub"

# 控制台显示公钥
node cli/key-management-cli.js export-public --key-id "my-first-key"
```

## ✍️ 签名操作快速开始

### 1. 数据签名

```javascript
// 使用CLI签名数据
const data = "重要业务数据";
const signature = await signer.signData(data, "my-first-key", "MyStrongPass123!");

console.log('原始数据:', data);
console.log('数字签名:', signature);
```

```bash
# 使用CLI签名文件
node cli/signature-service-cli.js sign \
  --file "important-document.txt" \
  --key-id "my-first-key" \
  --passphrase "MyStrongPass123!" \
  --output "document.sig"
```

### 2. 签名验证

```javascript
// 验证签名
const isValid = await verifier.verifySignature(
  "重要业务数据", 
  signature, 
  publicKey
);

console.log('签名验证结果:', isValid ? '✅ 有效' : '❌ 无效');
```

```bash
# 使用CLI验证签名
node cli/signature-service-cli.js verify \
  --file "important-document.txt" \
  --signature "document.sig" \
  --public-key "my-first-key.pub"
```

## 🔐 信任管理快速开始

### 1. 添加受信任密钥

```bash
# 添加本地密钥到信任库
node cli/key-management-cli.js trust-add \
  --key-id "my-first-key" \
  --reason "我自己的密钥"

# 添加外部公钥到信任库
node cli/key-management-cli.js trust-add \
  --public-key "partner-key.pub" \
  --alias "合作伙伴" \
  --reason "业务合作伙伴密钥"
```

### 2. 查看信任库

```bash
# 查看所有受信任密钥
node cli/key-management-cli.js trust-list

# 查看信任详情
node cli/key-management-cli.js trust-info --fingerprint "ABCD1234..."
```

### 3. 验证信任链

```javascript
const trustStatus = await trustManager.verifySignerTrust(publicKey);
console.log('信任验证结果:', trustStatus);
```

## 📊 系统状态检查

### 健康检查

```bash
# 运行完整健康检查
node cli/unified-cli.js health-check

# 快速状态检查
node cli/key-management-cli.js status
```

### 性能监控

```javascript
// 获取系统性能指标
const { KeyCache } = require('./key-management/key-cache');
const cacheStats = KeyCache.getInstance().getStats();

console.log('🔧 系统性能指标:');
console.log('缓存命中率:', cacheStats.hitRate);
console.log('缓存大小:', cacheStats.size);
console.log('内存使用:', process.memoryUsage().heapUsed / 1024 / 1024, 'MB');
```

## 🎯 常用操作示例

### 场景1: 文档签名工作流

```javascript
// 完整的文档签名流程
const documentSigningWorkflow = async (filePath, keyId, passphrase) => {
  console.log('📄 开始文档签名流程...');
  
  // 1. 加载文档
  const fs = require('fs');
  const documentContent = fs.readFileSync(filePath, 'utf8');
  
  // 2. 创建签名
  const { Signer } = require('./signature-service');
  const signer = new Signer(keyManager);
  const signature = await signer.signData(documentContent, keyId, passphrase);
  
  // 3. 保存签名
  const signaturePath = `${filePath}.sig`;
  fs.writeFileSync(signaturePath, signature);
  
  // 4. 验证签名
  const { Verifier } = require('./signature-service');
  const verifier = new Verifier(keyManager);
  const publicKey = keyManager.exportPublicKey(keyId);
  const isValid = await verifier.verifySignature(documentContent, signature, publicKey);
  
  console.log('✅ 文档签名完成');
  console.log('📁 签名文件:', signaturePath);
  console.log('🔍 验证结果:', isValid ? '有效' : '无效');
  
  return { signaturePath, isValid };
};
```

### 场景2: 批量文件签名

```bash
#!/bin/bash
# batch-sign.sh

echo "🔄 开始批量文件签名..."

# 签名所有 .txt 文件
for file in *.txt; do
  echo "签名文件: $file"
  node cli/signature-service-cli.js sign \
    --file "$file" \
    --key-id "batch-key" \
    --passphrase-env BATCH_KEY_PASSPHRASE \
    --output "${file}.sig"
done

echo "✅ 批量签名完成"
```

### 场景3: 自动化验证脚本

```javascript
// auto-verify.js
const fs = require('fs');
const path = require('path');

class AutoVerifier {
  constructor() {
    this.verifier = new (require('./signature-service/verifier'))();
  }
  
  async verifyDirectory(directoryPath) {
    const files = fs.readdirSync(directoryPath);
    const results = [];
    
    for (const file of files) {
      if (file.endsWith('.sig')) {
        const originalFile = file.replace('.sig', '');
        const originalPath = path.join(directoryPath, originalFile);
        const signaturePath = path.join(directoryPath, file);
        
        if (fs.existsSync(originalPath)) {
          const isValid = await this.verifyFile(originalPath, signaturePath);
          results.push({
            file: originalFile,
            signature: file,
            valid: isValid,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    return results;
  }
}
```

## 🔧 故障排除快速参考

### 常见问题速查

| 问题 | 症状 | 快速解决方案 |
|------|------|-------------|
| 初始化失败 | 目录创建错误 | 手动创建目录: `mkdir -p keys trust signatures` |
| 密钥生成失败 | 内存不足 | 设置 `export NODE_OPTIONS="--max-old-space-size=512"` |
| 签名验证失败 | 信任链问题 | 运行 `node cli/key-management-cli.js trust-rebuild` |
| 性能缓慢 | 响应时间长 | 调整 `export MAX_CACHE_SIZE="100"` |

### 一键修复脚本

```bash
#!/bin/bash
# quick-fix.sh

echo "🔧 运行快速修复..."

# 1. 清理临时文件
find . -name "*.tmp" -delete

# 2. 重置缓存
node -e "require('./key-management/key-cache').getInstance().clear()"

# 3. 验证配置
node cli/unified-cli.js verify-config

# 4. 运行健康检查
node cli/unified-cli.js health-check

echo "✅ 修复完成"
```

## 📈 下一步操作

### 进阶功能探索

完成基础使用后，可以尝试：

1. **多签名功能**
   ```bash
   node cli/signature-service-cli.js multi-sign --help
   ```

2. **密钥轮换**
   ```bash
   node cli/key-management-cli.js rotate --key-id "my-first-key"
   ```

3. **自动化监控**
   ```bash
   node cli/signature-service-cli.js watch --dir "./documents"
   ```

### 生产环境部署

准备投入生产环境时：

1. **安全加固**
   - 使用强口令生成器
   - 启用审计日志
   - 配置定期备份

2. **性能优化**
   - 调整缓存大小
   - 配置并发限制
   - 设置监控告警

3. **高可用配置**
   - 部署多个实例
   - 配置负载均衡
   - 设置故障转移

## 📚 学习资源

### 文档链接
- [完整系统文档](SIGNATURE_SYSTEM_README.md)
- [性能优化指南](PERFORMANCE_OPTIMIZATION.md)
- [安全配置指南](SECURITY_GUIDELINES.md)
- [故障排除指南](TROUBLESHOOTING_GUIDE.md)

### 示例代码
查看 `examples/` 目录获取更多使用示例：
- 批量处理脚本
- 集成测试用例
- 自动化工作流

### 社区支持
- 查看测试用例了解预期行为
- 参考重构文档理解架构设计
- 使用诊断工具排查问题

---

**快速开始完成时间**: 约10分钟 ⏱️  
**系统状态**: 就绪可用 ✅  
**下一步建议**: 运行健康检查验证系统状态

> 💡 **提示**: 完成快速开始后，建议运行 `node cli/unified-cli.js health-check` 验证系统完整性。