# Test Runner Secure API 文档

## 📋 概述

本文档详细介绍了 Test Runner Secure 的 API 接口，包括配置选项、方法和事件。

## 🔧 配置选项

### 基本配置

```javascript
const config = {
    // 日志级别
    logLevel: 'info', // 'debug', 'info', 'warn', 'error'
    
    // 安全配置
    security: {
        encryptionKey: 'your-encryption-key',
        enableAuditLogging: true,
        auditLogPath: './logs/audit.log'
    },
    
    // 锁配置
    locks: {
        redisHost: 'localhost',
        redisPort: 6379,
        lockTimeout: 30000 // 30秒
    },
    
    // 沙箱配置
    sandbox: {
        enableContainerSandbox: true,
        memoryLimit: '128m',
        cpuLimit: '0.5',
        networkMode: 'none'
    },
    
    // 监控配置
    monitoring: {
        enableOpenObserve: true,
        openObserveEndpoint: 'http://localhost:5080',
        metricsInterval: 60000 // 60秒
    }
};
```

## 🚀 方法

### 初始化

```javascript
const TestRunnerSecure = require('./test-runner-secure.cjs');

const runner = new TestRunnerSecure(config);
```

### 运行测试

```javascript
// 运行单个测试
const result = await runner.runTest({
    name: 'test-name',
    script: 'test-script.js',
    timeout: 5000
});

// 运行测试套件
const results = await runner.runTestSuite({
    name: 'test-suite',
    tests: [
        { name: 'test1', script: 'test1.js' },
        { name: 'test2', script: 'test2.js' }
    ]
});
```

### 锁操作

```javascript
// 获取读锁
const lockId = await runner.acquireReadLock('resource-name');

// 获取写锁
const lockId = await runner.acquireWriteLock('resource-name');

// 获取分布式锁
const lockId = await runner.acquireDistributedLock('resource-name', {
    timeout: 30000,
    retryInterval: 1000
});

// 释放锁
await runner.releaseLock(lockId);
```

### 沙箱操作

```javascript
// 在沙箱中执行代码
const result = await runner.executeInSandbox({
    code: 'console.log("Hello, World!");',
    timeout: 5000,
    memoryLimit: '64m'
});

// 在容器沙箱中执行代码
const result = await runner.executeInContainerSandbox({
    code: 'console.log("Hello, Container!");',
    image: 'node:18-alpine',
    timeout: 10000,
    memoryLimit: '128m',
    cpuLimit: '0.5'
});
```

### 审计日志

```javascript
// 记录审计事件
await runner.logAuditEvent({
    level: 'info',
    action: 'USER_LOGIN',
    userId: 'user123',
    details: { ip: '192.168.1.1' }
});

// 查询审计日志
const logs = await runner.getAuditLogs({
    startDate: '2023-01-01',
    endDate: '2023-01-31',
    level: 'info',
    action: 'USER_LOGIN'
});
```

### 监控

```javascript
// 获取性能指标
const metrics = await runner.getPerformanceMetrics();

// 获取内存使用情况
const memoryUsage = await runner.getMemoryUsage();

// 获取系统状态
const systemStatus = await runner.getSystemStatus();
```

## 📊 事件

### 测试事件

```javascript
// 监听测试开始事件
runner.on('testStart', (testInfo) => {
    console.log(`Test started: ${testInfo.name}`);
});

// 监听测试完成事件
runner.on('testComplete', (testResult) => {
    console.log(`Test completed: ${testResult.name}, Status: ${testResult.status}`);
});

// 监听测试失败事件
runner.on('testFailed', (testResult) => {
    console.log(`Test failed: ${testResult.name}, Error: ${testResult.error}`);
});
```

### 锁事件

```javascript
// 监听锁获取事件
runner.on('lockAcquired', (lockInfo) => {
    console.log(`Lock acquired: ${lockInfo.resourceId}, Type: ${lockInfo.type}`);
});

// 监听锁释放事件
runner.on('lockReleased', (lockInfo) => {
    console.log(`Lock released: ${lockInfo.resourceId}`);
});

// 监听锁超时事件
runner.on('lockTimeout', (lockInfo) => {
    console.log(`Lock timeout: ${lockInfo.resourceId}`);
});
```

### 沙箱事件

```javascript
// 监听沙箱创建事件
runner.on('sandboxCreated', (sandboxInfo) => {
    console.log(`Sandbox created: ${sandboxInfo.id}`);
});

// 监听沙箱销毁事件
runner.on('sandboxDestroyed', (sandboxInfo) => {
    console.log(`Sandbox destroyed: ${sandboxInfo.id}`);
});

// 监听沙箱执行事件
runner.on('sandboxExecuted', (executionInfo) => {
    console.log(`Sandbox executed: ${executionInfo.id}, Status: ${executionInfo.status}`);
});
```

## 🔒 安全功能

### 加密

```javascript
// 加密数据
const encryptedData = await runner.encrypt(data);

// 解密数据
const decryptedData = await runner.decrypt(encryptedData);
```

### 安全扫描

```javascript
// 运行安全扫描
const scanResult = await runner.runSecurityScan({
    target: './src',
    scanType: 'full', // 'quick', 'standard', 'full'
    rules: ['sqli', 'xss', 'path-traversal']
});
```

## 📈 性能监控

### 指标收集

```javascript
// 启用指标收集
runner.enableMetricsCollection({
    interval: 60000, // 60秒
    includeSystemMetrics: true,
    includeApplicationMetrics: true
});

// 获取指标数据
const metrics = await runner.getMetrics();
```

### 自定义指标

```javascript
// 记录自定义指标
runner.recordMetric('custom.metric', 100, {
    unit: 'count',
    tags: { environment: 'test' }
});
```

## 🐳 Docker 集成

### Docker 配置

```javascript
const dockerConfig = {
    enabled: true,
    socketPath: '/var/run/docker.sock',
    defaultImage: 'node:18-alpine',
    registry: 'your-registry.com',
    auth: {
        username: 'your-username',
        password: 'your-password'
    }
};
```

### Docker 操作

```javascript
// 创建容器
const container = await runner.createContainer({
    image: 'node:18-alpine',
    cmd: ['node', 'app.js'],
    env: { NODE_ENV: 'test' },
    volumes: ['./src:/app/src']
});

// 启动容器
await runner.startContainer(container.id);

// 停止容器
await runner.stopContainer(container.id);

// 删除容器
await runner.removeContainer(container.id);
```

## 🔄 错误处理

### 错误类型

```javascript
try {
    await runner.runTest({
        name: 'test-name',
        script: 'test-script.js'
    });
} catch (error) {
    if (error.code === 'TEST_TIMEOUT') {
        // 处理测试超时
    } else if (error.code === 'SANDBOX_ERROR') {
        // 处理沙箱错误
    } else if (error.code === 'LOCK_ERROR') {
        // 处理锁错误
    } else {
        // 处理其他错误
    }
}
```

### 错误恢复

```javascript
// 启用自动错误恢复
runner.enableAutoRecovery({
    maxRetries: 3,
    retryInterval: 1000,
    retryConditions: ['TEST_TIMEOUT', 'SANDBOX_ERROR']
});
```

## 📝 示例

### 完整示例

```javascript
const TestRunnerSecure = require('./test-runner-secure.cjs');

// 配置
const config = {
    logLevel: 'info',
    security: {
        enableAuditLogging: true
    },
    locks: {
        redisHost: 'localhost',
        redisPort: 6379
    },
    sandbox: {
        enableContainerSandbox: true
    }
};

// 初始化
const runner = new TestRunnerSecure(config);

// 设置事件监听器
runner.on('testComplete', (result) => {
    console.log(`Test completed: ${result.name}`);
});

// 运行测试
async function runTests() {
    try {
        // 获取锁
        const lockId = await runner.acquireWriteLock('test-resource');
        
        try {
            // 在沙箱中执行测试
            const result = await runner.executeInContainerSandbox({
                code: `
                    const assert = require('assert');
                    assert.strictEqual(1 + 1, 2);
                    console.log('Test passed');
                `,
                image: 'node:18-alpine',
                timeout: 5000
            });
            
            console.log('Test result:', result);
        } finally {
            // 释放锁
            await runner.releaseLock(lockId);
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// 运行测试
runTests();
```

## 🔗 相关文档

- [README](./README.md) - 项目概述
- [快速使用指南](./QUICK_START.md) - 简明的使用指南
- [故障排除](./TROUBLESHOOTING.md) - 常见问题解决方案