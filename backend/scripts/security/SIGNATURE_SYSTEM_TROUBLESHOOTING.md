# 签名系统故障排除指南

## 🚨 故障排除概述

本指南提供签名系统常见问题的诊断和解决方案。系统经过模块化重构后，问题定位更加清晰，便于快速解决各类运行问题。

## 🔍 故障诊断流程

### 问题诊断流程图

```
问题报告
    ↓
症状分析 → 错误日志检查 → 配置验证
    ↓
模块定位 → 具体组件诊断 → 解决方案实施
    ↓
验证修复 ← 回归测试 ← 修复措施
```

### 诊断工具

```javascript
// diagnostics/diagnostic-tool.js
class DiagnosticTool {
  static async runSystemDiagnostics() {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      system: await this.checkSystemEnvironment(),
      configuration: await this.checkConfiguration(),
      modules: await this.checkModules(),
      security: await this.checkSecurity(),
      performance: await this.checkPerformance()
    };
    
    return diagnostics;
  }
  
  static async checkSystemEnvironment() {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
  
  static async checkConfiguration() {
    const CONFIG = require('../shared/config');
    const configIssues = [];
    
    // 检查关键配置
    if (!CONFIG.keysDir) configIssues.push('密钥目录未配置');
    if (!CONFIG.trustStoreDir) configIssues.push('信任存储目录未配置');
    if (CONFIG.minPassphraseLength < 8) configIssues.push('口令最小长度不足');
    
    return {
      config: CONFIG,
      issues: configIssues,
      isValid: configIssues.length === 0
    };
  }
}
```

## 📋 常见问题分类

### 1. 初始化问题

#### 问题：系统初始化失败

**症状**：
- 错误信息：`初始化失败: 无法创建目录`
- 密钥生成操作返回错误
- 信任存储无法加载

**诊断步骤**：
```bash
# 1. 检查目录权限
ls -la backend/scripts/security/

# 2. 运行初始化诊断
node cli/key-management-cli.js diagnose-init

# 3. 检查环境变量
echo $KEY_MANAGEMENT_KEYS_DIR
echo $NODE_ENV
```

**解决方案**：
```javascript
// 手动创建必要目录
const fs = require('fs');
const path = require('path');

const directories = [
  './keys',
  './keys/history', 
  './trust',
  './signatures',
  './logs'
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    console.log(`创建目录: ${dir}`);
  }
});
```

#### 问题：环境变量配置错误

**症状**：
- 配置验证失败
- 系统使用默认配置而非预期配置
- 权限相关操作失败

**诊断步骤**：
```javascript
// 检查环境变量配置
const configCheck = require('./shared/config');
console.log('当前配置:', configCheck);

// 验证关键环境变量
const requiredEnvVars = [
  'KEY_MANAGEMENT_KEYS_DIR',
  'ENFORCE_STRONG_PASSPHRASE',
  'MIN_PASSPHRASE_LENGTH'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.warn(`警告: 环境变量 ${varName} 未设置`);
  }
});
```

**解决方案**：
```bash
# 设置必需的环境变量
export KEY_MANAGEMENT_KEYS_DIR="./keys"
export ENFORCE_STRONG_PASSPHRASE="true"
export MIN_PASSPHRASE_LENGTH="16"
export KEY_ROTATION_INTERVAL="2592000000"

# 验证配置
node -e "console.log(require('./shared/config'))"
```

### 2. 密钥管理问题

#### 问题：密钥生成失败

**症状**：
- 错误信息：`密钥生成失败`
- 密钥文件未创建
- 操作超时

**诊断步骤**：
```javascript
const { KeyManager } = require('./key-management');
const keyManager = new KeyManager();

try {
  const keyPair = await keyManager.generateKeyPair('test-key', 'test-passphrase');
  console.log('密钥生成成功:', keyPair);
} catch (error) {
  console.error('密钥生成失败:', error.message);
  console.error('堆栈跟踪:', error.stack);
  
  // 检查系统资源
  console.log('内存使用:', process.memoryUsage());
  console.log('磁盘空间:', await checkDiskSpace());
}
```

**解决方案**：
```javascript
// 解决方案1: 增加超时时间
const { AsyncOperationManager } = require('./shared/error-handler');
const asyncManager = new AsyncOperationManager();

const keyPair = await asyncManager.executeWithTimeout(
  'key-generation', 
  async () => keyManager.generateKeyPair('test-key', 'test-passphrase'),
  60000 // 60秒超时
);

// 解决方案2: 清理临时文件
await keyManager.cleanupTempFiles();

// 解决方案3: 检查磁盘空间
if (await getFreeDiskSpace() < 100 * 1024 * 1024) {
  console.error('磁盘空间不足，请清理空间');
}
```

#### 问题：密钥导入/导出失败

**症状**：
- 错误信息：`密钥格式无效`
- 文件权限错误
- 密钥验证失败

**诊断步骤**：
```bash
# 检查密钥文件
ls -la ./keys/
file ./keys/main-key.pub

# 验证密钥格式
openssl rsa -in ./keys/main-key -text -noout
```

**解决方案**：
```javascript
// 重新生成密钥对
await keyManager.generateKeyPair('recovery-key', 'new-strong-passphrase');

// 导出公钥进行验证
const publicKey = keyManager.exportPublicKey('recovery-key');
console.log('公钥格式验证:', validatePublicKeyFormat(publicKey));

// 修复文件权限
const WindowsACLManager = require('./key-management/windows-acl');
await WindowsACLManager.setSecurePermissions('./keys/recovery-key');
```

### 3. 签名服务问题

#### 问题：签名验证失败

**症状**：
- 错误信息：`签名验证失败`
- 验证返回 `false`
- 信任链验证错误

**诊断步骤**：
```javascript
const { Verifier } = require('./signature-service');
const verifier = new Verifier(keyManager);

// 分步诊断验证过程
const diagnosticSteps = {
  step1: '检查公钥格式',
  step2: '验证签名算法', 
  step3: '检查信任链',
  step4: '验证数据完整性'
};

for (const [step, description] of Object.entries(diagnosticSteps)) {
  try {
    const result = await performVerificationStep(step, data, signature, publicKey);
    console.log(`${description}: ${result ? '通过' : '失败'}`);
  } catch (error) {
    console.error(`${description}: 错误 - ${error.message}`);
  }
}
```

**解决方案**：
```javascript
// 解决方案1: 重新生成签名
const newSignature = await signer.signData(data, keyId, passphrase);
const isValid = await verifier.verifySignature(data, newSignature, publicKey);

// 解决方案2: 检查信任策略
const trustStatus = await trustManager.verifySignerTrust(publicKey);
console.log('信任状态:', trustStatus);

// 解决方案3: 更新信任存储
if (!trustStatus.trusted) {
  await trustManager.addTrustedFingerprint(
    SecurityUtils.generateFingerprint(publicKey),
    { reason: '手动添加信任' }
  );
}
```

#### 问题：多签名操作失败

**症状**：
- 错误信息：`多签名收集不完整`
- 阈值验证失败
- 签名者权限错误

**诊断步骤**：
```javascript
const { MultiSignatureManager } = require('./signature-service/multi-signature');
const multiSigManager = new MultiSignatureManager();

// 检查多签名状态
const status = await multiSigManager.getSignatureStatus(signatureId);
console.log('多签名状态:', status);

// 验证签名者列表
const signers = status.requiredSigners;
const collected = status.collectedSignatures;

console.log(`需要签名者: ${signers.length}`);
console.log(`已收集签名: ${collected.length}`);
console.log(`缺失签名者: ${signers.filter(s => !collected.includes(s))}`);
```

**解决方案**：
```javascript
// 解决方案1: 重新配置多签名策略
await multiSigManager.updateSignaturePolicy(signatureId, {
  requiredSigners: ['user1', 'user2', 'user3'],
  threshold: 2,
  timeout: 24 * 60 * 60 * 1000 // 24小时
});

// 解决方案2: 强制完成多签名
if (status.collectedSignatures.length >= status.threshold) {
  await multiSigManager.forceComplete(signatureId);
}

// 解决方案3: 重置多签名流程
await multiSigManager.resetSignatureCollection(signatureId);
```

### 4. 性能问题

#### 问题：系统响应缓慢

**症状**：
- 操作超时频繁
- 内存使用持续增长
- CPU使用率过高

**诊断步骤**：
```javascript
// 性能诊断工具
const performanceDiagnostics = {
  memory: process.memoryUsage(),
  cpu: process.cpuUsage(),
  uptime: process.uptime(),
  activeHandles: process._getActiveHandles().length,
  activeRequests: process._getActiveRequests().length
};

console.log('性能诊断:', performanceDiagnostics);

// 检查缓存状态
const { KeyCache } = require('./key-management/key-cache');
const cacheStats = KeyCache.getInstance().getStats();
console.log('缓存状态:', cacheStats);
```

**解决方案**：
```javascript
// 解决方案1: 优化缓存配置
const CONFIG = require('./shared/config');
CONFIG.maxCacheSize = 50; // 减少缓存大小
CONFIG.cacheTTL = 180000; // 3分钟TTL

// 解决方案2: 清理系统资源
await keyManager.cleanupTempFiles();
KeyCache.getInstance().clear();

// 解决方案3: 调整并发限制
CONFIG.maxConcurrentOperations = 3;
```

#### 问题：内存泄漏

**症状**：
- 内存使用持续增长不释放
- 系统运行一段时间后变慢
- 频繁垃圾回收

**诊断步骤**：
```bash
# 使用内存分析工具
node --inspect diagnostics/memory-leak-detector.js

# 监控内存使用
node diagnostics/memory-monitor.js
```

**解决方案**：
```javascript
// 内存泄漏修复
class MemoryLeakFix {
  static async applyFixes() {
    // 1. 清理缓存引用
    const cache = KeyCache.getInstance();
    cache.clear();
    
    // 2. 关闭未使用的连接
    await this.closeIdleConnections();
    
    // 3. 清理事件监听器
    this.cleanupEventListeners();
    
    // 4. 强制垃圾回收（开发环境）
    if (global.gc) {
      global.gc();
    }
  }
  
  static cleanupEventListeners() {
    // 清理模块级别的事件监听器
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
  }
}
```

### 5. 安全相关问题

#### 问题：权限验证失败

**症状**：
- Windows ACL权限错误
- 文件访问被拒绝
- 操作审计失败

**诊断步骤**：
```javascript
const WindowsACLManager = require('./key-management/windows-acl');

// 检查文件权限
const permissionCheck = await WindowsACLManager.verifyAllKeyFiles();
console.log('权限检查结果:', permissionCheck);

// 检查审计配置
const auditConfig = AuditManager.getConfiguration();
console.log('审计配置:', auditConfig);
```

**解决方案**：
```javascript
// 修复文件权限
await WindowsACLManager.setSecurePermissions('./keys');
await WindowsACLManager.setSecurePermissions('./trust');
await WindowsACLManager.setSecurePermissions('./signatures');

// 重新配置审计
await AuditManager.reconfigure({
  enable: true,
  retentionDays: 90,
  logLevel: 'INFO'
});
```

#### 问题：口令策略冲突

**症状**：
- 口令验证失败
- 口令历史检查错误
- 口令强度计算异常

**诊断步骤**：
```javascript
const SecurityUtils = require('./shared/security-utils');

// 测试口令验证
const testPassphrases = [
  'short',
  '1234567890123456',
  'StrongPass123!@#',
  'VeryStrongPassword123!@#$%'
];

testPassphrases.forEach(passphrase => {
  const result = SecurityUtils.validatePassphrase(passphrase);
  console.log(`"${passphrase}":`, result);
});
```

**解决方案**：
```javascript
// 调整口令策略
const relaxedPolicy = {
  minLength: 12,
  requireUpperCase: true,
  requireLowerCase: true, 
  requireNumbers: true,
  requireSpecialChars: false // 放宽特殊字符要求
};

// 使用调整后的策略验证
const validation = SecurityUtils.validatePassphrase(passphrase, relaxedPolicy);
if (validation.passed) {
  console.log('口令符合调整后的策略');
}
```

## 🛠️ 故障排除工具

### 系统健康检查脚本

```javascript
// diagnostics/health-check.js
#!/usr/bin/env node

const HealthChecker = {
  async runFullHealthCheck() {
    const checks = [
      { name: '系统环境', check: this.checkSystemEnvironment },
      { name: '目录结构', check: this.checkDirectoryStructure },
      { name: '配置文件', check: this.checkConfiguration },
      { name: '模块加载', check: this.checkModuleLoading },
      { name: '密钥操作', check: this.checkKeyOperations },
      { name: '签名服务', check: this.checkSignatureService },
      { name: '性能基准', check: this.checkPerformanceBenchmark }
    ];
    
    const results = [];
    for (const check of checks) {
      try {
        const result = await check.check();
        results.push({
          check: check.name,
          status: result.healthy ? 'HEALTHY' : 'UNHEALTHY',
          details: result.details,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        results.push({
          check: check.name,
          status: 'ERROR',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return this.generateHealthReport(results);
  },
  
  generateHealthReport(results) {
    const healthyCount = results.filter(r => r.status === 'HEALTHY').length;
    const totalCount = results.length;
    const healthScore = Math.round((healthyCount / totalCount) * 100);
    
    return {
      summary: {
        totalChecks: totalCount,
        healthyChecks: healthyCount,
        healthScore: healthScore,
        overallStatus: healthScore >= 80 ? 'HEALTHY' : 'UNHEALTHY'
      },
      details: results
    };
  }
};

// 运行健康检查
HealthChecker.runFullHealthCheck().then(report => {
  console.log(JSON.stringify(report, null, 2));
});
```

### 日志分析工具

```javascript
// diagnostics/log-analyzer.js
class LogAnalyzer {
  static analyzeErrorPatterns(logFile) {
    const patterns = {
      permission_errors: /(EACCES|EPERM|权限)/i,
      memory_errors: /(内存|Memory|heap)/i,
      network_errors: /(网络|Network|ECONN)/i,
      crypto_errors: /(加密|Crypto|密钥)/i,
      timeout_errors: /(超时|Timeout|ETIMEDOUT)/i
    };
    
    const analysis = {};
    Object.keys(patterns).forEach(pattern => {
      const matches = logFile.match(patterns[pattern]);
      analysis[pattern] = matches ? matches.length : 0;
    });
    
    return analysis;
  }
  
  static suggestSolutions(analysis) {
    const suggestions = [];
    
    if (analysis.permission_errors > 0) {
      suggestions.push('运行权限修复脚本: node diagnostics/fix-permissions.js');
    }
    
    if (analysis.memory_errors > 0) {
      suggestions.push('优化内存配置，减少缓存大小');
    }
    
    if (analysis.crypto_errors > 0) {
      suggestions.push('检查密钥文件和口令配置');
    }
    
    return suggestions;
  }
}
```

## 📞 技术支持

### 问题报告模板

当需要技术支持时，请提供以下信息：

```markdown
## 问题描述
[详细描述遇到的问题]

## 环境信息
- 系统版本: [操作系统和版本]
- Node.js版本: [node -v]
- 签名系统版本: [git rev-parse HEAD]

## 错误信息
[完整的错误信息和堆栈跟踪]

## 复现步骤
1. [步骤1]
2. [步骤2] 
3. [步骤3]

## 已尝试的解决方案
- [ ] 重启服务
- [ ] 检查日志
- [ ] 验证配置
- [ ] 运行健康检查

## 附加信息
[任何其他相关信息]
```

### 紧急恢复步骤

```bash
# 1. 停止所有相关服务
pkill -f "node.*security"

# 2. 备份当前状态
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz keys/ trust/ signatures/

# 3. 运行紧急修复
node diagnostics/emergency-recovery.js

# 4. 验证修复结果
node cli/key-management-cli.js status
```

## 📚 相关文档

- [签名系统README](SIGNATURE_SYSTEM_README.md)
- [性能优化指南](PERFORMANCE_OPTIMIZATION.md) 
- [安全指南](SECURITY_GUIDELINES.md)
- [快速开始指南](QUICK_START_GUIDE.md)

---

**最后更新**: 2025-10-14  
**支持状态**: 生产就绪 ✅  
**诊断工具**: 完整可用 🛠️