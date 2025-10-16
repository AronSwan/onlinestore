# Test Runner Secure 快速使用指南

## 🚀 5分钟快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 启动Redis

```bash
# 使用Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### 3. 基本使用

```bash
# 运行测试运行器
node scripts/test-runner-secure.cjs

# 查看帮助信息
node scripts/test-runner-secure.cjs --help

# 运行验证测试
node scripts/test-runner-secure.validation-tests.cjs
```

## 🔒 使用安全功能

### 1. 使用读写锁

```javascript
const TestRunnerSecure = require('./test-runner-secure.cjs');
const runner = new TestRunnerSecure();

async function testWithLock() {
    // 获取读锁
    const readLockId = await runner.acquireReadLock('test-resource');
    console.log('📖 获取了读锁');
    
    try {
        // 执行读操作
        const data = await readData();
        console.log('📖 读取数据:', data);
    } finally {
        // 释放读锁
        await runner.releaseLock(readLockId);
        console.log('🔓 释放了读锁');
    }
    
    // 获取写锁
    const writeLockId = await runner.acquireWriteLock('test-resource');
    console.log('✏️ 获取了写锁');
    
    try {
        // 执行写操作
        await writeData('new value');
        console.log('✏️ 写入数据完成');
    } finally {
        // 释放写锁
        await runner.releaseLock(writeLockId);
        console.log('🔓 释放了写锁');
    }
}

testWithLock();
```

### 2. 使用分布式锁

```javascript
async function testWithDistributedLock() {
    // 获取分布式锁
    const lockId = await runner.acquireDistributedLock('shared-resource', {
        timeout: 30000, // 30秒超时
        retryInterval: 1000 // 1秒重试间隔
    });
    console.log('🔐 获取了分布式锁');
    
    try {
        // 执行需要互斥的操作
        console.log('🔐 执行互斥操作...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('🔐 互斥操作完成');
    } finally {
        // 释放分布式锁
        await runner.releaseLock(lockId);
        console.log('🔓 释放了分布式锁');
    }
}

testWithDistributedLock();
```

### 3. 使用沙箱执行代码

```javascript
async function testWithSandbox() {
    // 在进程沙箱中执行代码
    const result1 = await runner.executeInSandbox({
        code: `
            const result = 2 + 3;
            console.log('计算结果:', result);
            result;
        `,
        timeout: 5000
    });
    console.log('📦 沙箱执行结果:', result1);
    
    // 在容器沙箱中执行代码
    const result2 = await runner.executeInContainerSandbox({
        code: `
            const fs = require('fs');
            const os = require('os');
            
            console.log('平台:', os.platform());
            console.log('架构:', os.arch());
            console.log('内存:', os.totalmem());
            
            { platform: os.platform(), arch: os.arch() };
        `,
        image: 'node:18-alpine',
        timeout: 10000
    });
    console.log('🐳 容器沙箱执行结果:', result2);
}

testWithSandbox();
```

### 4. 使用增强的加密功能

```javascript
async function testEnhancedEncryption() {
    // 加密数据 (使用GCM模式)
    const sensitiveData = 'user-password-123';
    const encryptedData = await runner.encrypt(sensitiveData);
    console.log('🔐 加密数据 (GCM):', encryptedData);
    
    // 解密数据
    const decryptedData = await runner.decrypt(encryptedData);
    console.log('🔓 解密数据:', decryptedData);
    
    // 验证数据一致性
    console.log('✅ 数据一致性:', sensitiveData === decryptedData);
    
    // 检查加密模式
    const encryptionMode = encryptedData.algorithm;
    console.log('🔒 加密模式:', encryptionMode); // 应该是 'aes-256-gcm'
}

testEnhancedEncryption();
```

### 5. 使用安全扫描插件

```javascript
async function testSecurityScanning() {
    // 运行网络安全扫描
    const networkScanResult = await runner.runSecurityScan({
        target: './src',
        scanType: 'network',
        options: {
            checkOpenPorts: true,
            checkSslTls: true,
            checkDocker: true,
            checkKubernetes: true
        }
    });
    
    console.log('🔍 网络安全扫描结果:');
    console.log('  扫描的文件数:', networkScanResult.filesScanned);
    console.log('  发现的问题数:', networkScanResult.issues.length);
    
    if (networkScanResult.issues.length > 0) {
        console.log('  发现的问题:');
        networkScanResult.issues.forEach(issue => {
            console.log(`    - ${issue.severity}: ${issue.message} (${issue.file}:${issue.line})`);
        });
    } else {
        console.log('  ✅ 未发现安全问题');
    }
    
    // 运行代码安全扫描
    const codeScanResult = await runner.runSecurityScan({
        target: './src',
        scanType: 'code',
        rules: ['sqli', 'xss', 'path-traversal']
    });
    
    console.log('🔍 代码安全扫描结果:');
    console.log('  扫描的文件数:', codeScanResult.filesScanned);
    console.log('  发现的问题数:', codeScanResult.issues.length);
}

testSecurityScanning();
```

## 🔐 加密和审计

### 1. 加密敏感数据

```javascript
async function testEncryption() {
    // 加密数据
    const sensitiveData = 'user-password-123';
    const encryptedData = await runner.encrypt(sensitiveData);
    console.log('🔐 加密数据:', encryptedData);
    
    // 解密数据
    const decryptedData = await runner.decrypt(encryptedData);
    console.log('🔓 解密数据:', decryptedData);
    
    // 验证数据一致性
    console.log('✅ 数据一致性:', sensitiveData === decryptedData);
}

testEncryption();
```

### 2. 记录审计日志

```javascript
async function testAuditLogging() {
    // 记录用户登录事件
    await runner.logAuditEvent({
        level: 'info',
        action: 'USER_LOGIN',
        userId: 'user123',
        details: { ip: '192.168.1.1', userAgent: 'Mozilla/5.0...' }
    });
    console.log('📝 记录了用户登录事件');
    
    // 记录安全事件
    await runner.logAuditEvent({
        level: 'warn',
        action: 'FAILED_LOGIN',
        userId: 'user456',
        details: { ip: '192.168.1.2', reason: 'invalid_password', attempts: 3 }
    });
    console.log('📝 记录了登录失败事件');
    
    // 查询审计日志
    const logs = await runner.getAuditLogs({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 最近24小时
        level: 'warn',
        action: 'FAILED_LOGIN'
    });
    console.log('📋 查询到警告日志数量:', logs.length);
}

testAuditLogging();
```

## 📊 监控和指标

### 1. 获取性能指标

```javascript
async function testMonitoring() {
    // 获取内存使用情况
    const memoryUsage = await runner.getMemoryUsage();
    console.log('💾 内存使用:', {
        used: Math.round(memoryUsage.used / 1024 / 1024) + 'MB',
        total: Math.round(memoryUsage.total / 1024 / 1024) + 'MB',
        percentage: Math.round(memoryUsage.percentage) + '%'
    });
    
    // 获取系统状态
    const systemStatus = await runner.getSystemStatus();
    console.log('⚙️ 系统状态:', systemStatus);
    
    // 记录自定义指标
    runner.recordMetric('test.execution.count', 1, {
        unit: 'count',
        tags: { testType: 'integration', environment: 'test' }
    });
    console.log('📈 记录了自定义指标');
}

testMonitoring();
```

## 🔧 配置示例

### 基本配置

```javascript
// scripts/test-runner-secure.config.cjs
module.exports = {
    // 日志级别
    logLevel: 'info',
    
    // 安全配置
    security: {
        encryptionKey: 'your-32-character-encryption-key',
        enableAuditLogging: true,
        auditLogPath: './logs/audit.log',
        enableMasking: true,
        maskingPatterns: [
            /password/i,
            /token/i,
            /secret/i
        ]
    },
    
    // Redis配置
    locks: {
        redisHost: 'localhost',
        redisPort: 6379,
        lockTimeout: 30000
    },
    
    // 沙箱配置
    sandbox: {
        enableContainerSandbox: true,
        memoryLimit: '128m',
        cpuLimit: '0.5'
    },
    
    // 监控配置
    monitoring: {
        enableOpenObserve: false,
        metricsInterval: 60000
    },
    
    // 安全扫描配置
    securityScan: {
        enableNetworkScan: true,
        enableCodeScan: true,
        networkSecurity: {
            checks: {
                openPorts: true,
                sslTls: true,
                docker: true,
                kubernetes: true
            }
        }
    }
};
```

### 开发环境配置

```javascript
// scripts/test-runner-secure.config.dev.cjs
module.exports = {
    logLevel: 'debug',
    security: {
        encryptionKey: 'dev-key-32-characters-long-key',
        enableAuditLogging: true
    },
    locks: {
        redisHost: 'localhost',
        redisPort: 6379,
        lockTimeout: 10000 // 较短的超时时间，便于开发
    },
    sandbox: {
        enableContainerSandbox: true,
        memoryLimit: '256m', // 较大的内存限制，便于调试
        cpuLimit: '1.0'
    },
    monitoring: {
        enableOpenObserve: false,
        metricsInterval: 30000 // 更频繁的指标收集
    }
};
```

## 🧪 运行测试

### 1. 运行验证测试

```bash
# 运行基本验证测试
node scripts/test-runner-secure.validation-tests.cjs

# 运行分布式锁测试
node scripts/direct-test-distributed-lock.cjs

# 运行容器沙箱测试
node scripts/direct-test-container-sandbox.cjs
```

### 2. 使用改进的测试脚本

```bash
# 运行所有测试
node scripts/test-final-functionality-v2.cjs

# 只运行特定测试
node scripts/test-final-functionality-v2.cjs --only=读写锁

# 跳过特定测试
node scripts/test-final-functionality-v2.cjs --skip=加密,安全

# 详细输出
node scripts/test-final-functionality-v2.cjs --verbose

# 带时间戳的报告
node scripts/test-final-functionality-v2.cjs --timestamp

# 使用环境变量配置
OPENOBSERVE_ENDPOINT=http://localhost:9090 node scripts/test-final-functionality-v2.cjs
```

### 3. 运行Docker测试

```bash
# 启动Redis和测试容器
cd backend/docker/test-runner
docker-compose up -d

# 运行Docker环境测试
node scripts/simple-docker-test.cjs

# 停止容器
docker-compose down
```

## 🎯 常见用例

### 1. 并发测试

```javascript
async function concurrentTest() {
    const promises = [];
    
    // 创建10个并发任务
    for (let i = 0; i < 10; i++) {
        promises.push((async (index) => {
            // 每个任务获取一个锁
            const lockId = await runner.acquireDistributedLock(`task-${index}`);
            
            try {
                // 模拟任务执行
                await new Promise(resolve => setTimeout(resolve, 1000));
                console.log(`✅ 任务 ${index} 完成`);
            } finally {
                await runner.releaseLock(lockId);
            }
        })(i));
    }
    
    // 等待所有任务完成
    await Promise.all(promises);
    console.log('🎉 所有并发任务完成');
}

concurrentTest();
```

### 2. 安全测试

```javascript
async function securityTest() {
    // 运行安全扫描
    const scanResult = await runner.runSecurityScan({
        target: './src',
        scanType: 'full',
        rules: ['sqli', 'xss', 'path-traversal']
    });
    
    console.log('🔒 安全扫描结果:');
    console.log('  扫描的文件数:', scanResult.filesScanned);
    console.log('  发现的问题数:', scanResult.issues.length);
    
    if (scanResult.issues.length > 0) {
        console.log('  发现的问题:');
        scanResult.issues.forEach(issue => {
            console.log(`    - ${issue.severity}: ${issue.message} (${issue.file}:${issue.line})`);
        });
    } else {
        console.log('  ✅ 未发现安全问题');
    }
}

securityTest();
```

### 3. 性能基准测试

```javascript
async function performanceBenchmark() {
    console.log('📊 性能基准测试开始...');
    
    // 锁性能测试
    console.log('🔒 测试锁性能...');
    const lockStart = Date.now();
    const lockId = await runner.acquireDistributedLock('benchmark-test');
    await runner.releaseLock(lockId);
    const lockTime = Date.now() - lockStart;
    console.log(`  锁获取+释放时间: ${lockTime}ms`);
    
    // 加密性能测试
    console.log('🔐 测试加密性能...');
    const testData = 'Performance test data '.repeat(100);
    const encryptStart = Date.now();
    const encrypted = await runner.encrypt(testData);
    const encryptTime = Date.now() - encryptStart;
    console.log(`  加密时间: ${encryptTime}ms`);
    
    const decryptStart = Date.now();
    await runner.decrypt(encrypted);
    const decryptTime = Date.now() - decryptStart;
    console.log(`  解密时间: ${decryptTime}ms`);
    
    // 沙箱性能测试
    console.log('📦 测试沙箱性能...');
    const sandboxStart = Date.now();
    await runner.executeInSandbox({
        code: 'Math.random()',
        timeout: 5000
    });
    const sandboxTime = Date.now() - sandboxStart;
    console.log(`  沙箱执行时间: ${sandboxTime}ms`);
    
    console.log('📊 性能基准测试完成');
}

performanceBenchmark();
```

## 🔗 相关文档

- [README](./README-test-runner-secure.md) - 项目概述
- [API文档](./API-test-runner-secure.md) - 详细的API接口说明
- [故障排除](./TROUBLESHOOTING-test-runner-secure.md) - 常见问题解决方案

## 🎉 下一步

现在你已经掌握了 Test Runner Secure 的基本用法，可以：

1. 🔧 自定义配置文件以适应你的环境
2. 🔒 探索更多安全功能
3. 📊 集成监控系统
4. 🐳 使用Docker部署
5. 🧪 编写和运行自己的测试

祝你使用愉快！🎊

## 📈 测试结果参考

根据最新测试结果，各功能模块的通过率如下：

- **安全功能**: 71.4% (5/7通过)
- **功能增强**: 57.1% (4/7通过)
- **性能优化**: 80.0% (4/5通过)
- **集成测试**: 50.0% (2/4通过)

总体通过率: 65.2% (15/23通过)

这些结果可以帮助你了解各功能的稳定性和可靠性。