# Test Runner Secure 故障排除

## 📋 概述

本文档提供了 Test Runner Secure 常见问题的解决方案和故障排除指南，包括安全优化和测试相关的问题。

## 🚨 常见问题

### 安装和启动问题

#### 问题：无法启动测试运行器

**错误信息**：
```
Error: Cannot find module 'test-runner-secure.cjs'
```

**解决方案**：
1. 确认你在正确的目录中：
   ```bash
   cd backend
   ```
2. 确认文件存在：
   ```bash
   ls scripts/test-runner-secure.cjs
   ```
3. 检查文件路径：
   ```bash
   node scripts/test-runner-secure.cjs
   ```

#### 问题：依赖模块缺失

**错误信息**：
```
Error: Cannot find module 'ioredis'
```

**解决方案**：
1. 安装依赖：
   ```bash
   npm install
   ```
2. 检查 package.json 中的依赖是否完整
3. 清除 npm 缓存：
   ```bash
   npm cache clean --force
   npm install
   ```

### Redis 连接问题

#### 问题：无法连接到 Redis

**错误信息**：
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**解决方案**：
1. 确认 Redis 服务正在运行：
   ```bash
   redis-cli ping
   ```
2. 启动 Redis 服务：
   ```bash
   # 使用 Docker
   docker run -d -p 6379:6379 redis:7-alpine
   
   # 或使用系统服务
   sudo systemctl start redis
   ```
3. 检查 Redis 配置：
   ```javascript
   // 在 test-runner-secure.config.cjs 中
   locks: {
       redisHost: 'localhost',
       redisPort: 6379
   }
   ```

#### 问题：Redis 认证失败

**错误信息**：
```
Error: NOAUTH Authentication required
```

**解决方案**：
1. 检查 Redis 是否需要密码：
   ```bash
   redis-cli -a your-password ping
   ```
2. 更新配置文件：
   ```javascript
   // 在 test-runner-secure.config.cjs 中
   locks: {
       redisHost: 'localhost',
       redisPort: 6379,
       redisPassword: 'your-password'
   }
   ```

### 锁相关问题

#### 问题：无法获取锁

**错误信息**：
```
Error: Failed to acquire lock after multiple attempts
```

**解决方案**：
1. 检查锁是否已被其他进程占用：
   ```javascript
   // 在 Redis CLI 中
   keys *lock*
   ```
2. 增加重试次数或超时时间：
   ```javascript
   const lockId = await runner.acquireDistributedLock('resource-name', {
       timeout: 60000, // 增加到60秒
       retryInterval: 2000 // 增加到2秒
   });
   ```
3. 手动释放卡住的锁：
   ```javascript
   // 在 Redis CLI 中
   del lock:resource-name
   ```

#### 问题：锁超时

**错误信息**：
```
Error: Lock timeout exceeded
```

**解决方案**：
1. 增加锁超时时间：
   ```javascript
   const lockId = await runner.acquireDistributedLock('resource-name', {
       timeout: 60000 // 增加到60秒
   });
   ```
2. 实现锁续期机制：
   ```javascript
   // 定期续期锁
   const renewInterval = setInterval(async () => {
       await runner.renewLock(lockId);
   }, 30000); // 每30秒续期一次
   ```

### 沙箱相关问题

#### 问题：容器沙箱无法启动

**错误信息**：
```
Error: Docker daemon is not running
```

**解决方案**：
1. 启动 Docker 服务：
   ```bash
   # Linux/macOS
   sudo systemctl start docker
   
   # Windows
   # 启动 Docker Desktop
   ```
2. 检查 Docker 权限：
   ```bash
   # 将用户添加到 docker 组
   sudo usermod -aG docker $USER
   # 重新登录或重启
   ```
3. 检查 Docker Socket：
   ```bash
   ls -la /var/run/docker.sock
   ```

#### 问题：容器内执行命令失败

**错误信息**：
```
Error: Command execution failed in container
```

**解决方案**：
1. 检查容器镜像是否存在：
   ```bash
   docker images node:18-alpine
   ```
2. 拉取缺失的镜像：
   ```bash
   docker pull node:18-alpine
   ```
3. 检查容器日志：
   ```bash
   docker logs container-id
   ```
4. 增加资源限制：
   ```javascript
   const result = await runner.executeInContainerSandbox({
       code: 'console.log("Hello");',
       image: 'node:18-alpine',
       memoryLimit: '256m', // 增加内存限制
       cpuLimit: '1.0'     // 增加CPU限制
   });
   ```

### 加密相关问题

#### 问题：加密/解密失败

**错误信息**：
```
Error: Invalid encryption key or corrupted data
```

**解决方案**：
1. 检查加密密钥配置：
   ```javascript
   // 在 test-runner-secure.config.cjs 中
   security: {
       encryptionKey: 'your-32-character-encryption-key'
   }
   ```
2. 确认密钥长度为32个字符：
   ```javascript
   const key = crypto.randomBytes(32).toString('hex');
   console.log(key.length); // 应该是64个十六进制字符
   ```
3. 重新生成加密密钥并更新所有相关数据

#### 问题："Invalid digest: pbkdf2" 错误

**错误信息**：
```
Error: Invalid digest: pbkdf2
```

**解决方案**：
1. 检查 Node.js 版本兼容性：
   ```bash
   node --version
   ```
2. 确认使用固定的哈希算法：
   ```javascript
   // 在加密实现中
   crypto.pbkdf2Sync(
       password,
       salt,
       iterations,
       keyLength,
       'sha256'  // 使用固定算法
   );
   ```
3. 如果问题持续，考虑使用其他加密库

#### 问题：GCM 模式加密失败

**错误信息**：
```
Error: GCM encryption failed
```

**解决方案**：
1. 检查系统是否支持 GCM 模式：
   ```javascript
   try {
       crypto.createCipheriv('aes-256-gcm', key, iv);
   } catch (error) {
       console.log('GCM not supported:', error.message);
   }
   ```
2. 使用自动回退机制：
   ```javascript
   try {
       // 尝试 GCM 模式
       return this.encryptDataGCM(data);
   } catch (error) {
       // 回退到 CBC 模式
       return this.encryptDataCBC(data);
   }
   ```

### 监控相关问题

#### 问题：无法连接到 OpenObserve

**错误信息**：
```
Error: connect ECONNREFUSED 127.0.0.1:5080
```

**解决方案**：
1. 确认 OpenObserve 服务正在运行：
   ```bash
   curl http://localhost:5080/health
   ```
2. 检查 OpenObserve 配置：
   ```javascript
   // 在 test-runner-secure.config.cjs 中
   monitoring: {
       enableOpenObserve: true,
       openobserveEndpoint: 'http://localhost:5080',
       openobserveUsername: 'admin',
       openobservePassword: 'complexpassword'
   }
   ```
3. 启动 OpenObserve 服务：
   ```bash
   # 使用 Docker
   docker run -d -p 5080:5080 -v data:/data public.ecr.aws/zinclabs/openobserve:latest
   ```

### 性能问题

#### 问题：内存使用过高

**症状**：
- 系统响应变慢
- 内存使用率持续增长

**解决方案**：
1. 监控内存使用：
   ```javascript
   const memoryUsage = await runner.getMemoryUsage();
   console.log('Memory usage:', memoryUsage);
   ```
2. 调整内存限制：
   ```javascript
   // 在 test-runner-secure.config.cjs 中
   sandbox: {
       memoryLimit: '256m' // 根据需要调整
   }
   ```
3. 启用内存垃圾回收：
   ```javascript
   if (global.gc) {
       global.gc();
   }
   ```

#### 问题：CPU使用率过高

**症状**：
- CPU使用率持续在90%以上
- 系统响应延迟

**解决方案**：
1. 监控CPU使用：
   ```javascript
   const cpuUsage = await runner.getCpuUsage();
   console.log('CPU usage:', cpuUsage);
   ```
2. 调整CPU限制：
   ```javascript
   // 在 test-runner-secure.config.cjs 中
   sandbox: {
       cpuLimit: '1.0' // 根据需要调整
   }
   ```
3. 优化测试脚本：
   - 减少循环次数
   - 优化算法复杂度
   - 使用异步操作

#### 问题：缓存管理器性能问题

**症状**：
- Cache Evict 操作耗时过长 (263.46ms)
- 缓存命中率低

**解决方案**：
1. 监控缓存性能：
   ```javascript
   const cacheStats = await runner.getCacheStats();
   console.log('Cache stats:', cacheStats);
   ```
2. 调整缓存配置：
   ```javascript
   // 在 test-runner-secure.config.cjs 中
   cache: {
       maxSize: 1000,      // 增加缓存大小
       ttl: 300000,        // 调整TTL
       evictionPolicy: 'lru' // 使用LRU策略
   }
   ```
3. 考虑使用其他缓存策略：
   - LFU (Least Frequently Used)
   - Random
   - FIFO (First In First Out)

### 测试相关问题

#### 问题：测试脚本资源清理不完善

**症状**：
- 测试后遗留临时文件
- 监控器未正确关闭
- 内存泄漏

**解决方案**：
1. 使用改进的测试脚本：
   ```bash
   node scripts/test-final-functionality-v2.cjs
   ```
2. 确保每个测试都有 finally 块：
   ```javascript
   try {
       // 测试逻辑
   } catch (error) {
       recordTest('测试名称', false, error);
   } finally {
       // 清理资源
       if (resource) {
           try {
               await resource.cleanup();
           } catch (e) {
               // 忽略清理错误
           }
       }
   }
   ```
3. 使用时间戳报告：
   ```bash
   node scripts/test-final-functionality-v2.cjs --timestamp
   ```

#### 问题：测试结果分类不准确

**症状**：
- 无法区分"容错通过"和"严格通过"
- 成功率计算不准确

**解决方案**：
1. 使用改进的测试脚本：
   ```javascript
   function recordTest(name, passed, error = null, severity = 'strict') {
       if (passed) {
           if (severity === 'warn') {
               testResults.warnings++;
           } else {
               testResults.passed++;
           }
       } else {
           testResults.failed++;
       }
   }
   ```
2. 查看两种成功率：
   - 严格成功率 (passed / total)
   - 总体成功率 ((passed + warnings) / total)

#### 问题：日志敏感信息脱敏测试失败

**症状**：
- 密码信息未正确脱敏
- 测试日志内容检查逻辑问题

**解决方案**：
1. 检查日志内容是否包含脱敏标记：
   ```javascript
   // 在测试中
   const logContent = getLogContent();
   const isMasked = logContent.includes('[MASKED]') || !logContent.includes(password);
   assert(isMasked, '密码信息应该被脱敏');
   ```
2. 确认脱敏配置：
   ```javascript
   // 在 test-runner-secure.config.cjs 中
   security: {
       enableMasking: true,
       maskingPatterns: [
           /password/i,
           /token/i,
           /secret/i
       ]
   }
   ```

#### 问题：通知系统测试失败

**症状**：
- "Cannot read properties of undefined (reading 'enabled')"
- 通知系统在测试配置中被禁用

**解决方案**：
1. 修改测试逻辑，适应禁用状态的通知系统：
   ```javascript
   // 在测试中
   if (notificationSystem && notificationSystem.enabled) {
       // 测试通知功能
   } else {
       // 跳过测试或标记为警告
       recordTest('通知系统', true, null, 'warn');
   }
   ```
2. 启用通知系统进行测试：
   ```javascript
   // 在测试配置中
   notifications: {
       enabled: true,
       type: 'console'
   }
   ```

### 安全扫描相关问题

#### 问题：网络安全扫描失败

**症状**：
- 开放端口检查失败
- SSL/TLS 配置检查失败
- Docker 安全配置检查失败

**解决方案**：
1. 检查扫描配置：
   ```javascript
   // 在 test-runner-secure.config.cjs 中
   security: {
       networkSecurity: {
           checks: {
               openPorts: true,
               sslTls: true,
               docker: true,
               kubernetes: true
           }
       }
   }
   ```
2. 手动验证扫描结果：
   ```javascript
   // 运行安全扫描
   const scanResult = await runner.runSecurityScan({
       target: './src',
       scanType: 'network'
   });
   
   // 检查结果
   console.log('扫描结果:', scanResult.issues);
   ```
3. 添加自定义扫描规则：
   ```javascript
   // 在配置中
   security: {
       customRules: [
           {
               name: 'custom-rule',
               pattern: /dangerous-pattern/,
               severity: 'high'
           }
       ]
   }
   ```

#### 问题：跨平台兼容性问题

**症状**：
- Windows 环境下路径问题
- 文件系统权限问题
- 命令执行失败

**解决方案**：
1. 使用跨平台路径处理：
   ```javascript
   const path = require('path');
   const configPath = path.join(__dirname, 'config.json');
   ```
2. 检查文件系统权限：
   ```javascript
   const fs = require('fs');
   try {
       fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);
   } catch (error) {
       console.log('权限不足:', error.message);
   }
   ```
3. 使用跨平台命令执行：
   ```javascript
   const { spawn } = require('child_process');
   const isWindows = process.platform === 'win32';
   const cmd = isWindows ? 'cmd' : 'sh';
   const args = isWindows ? ['/c', command] : ['-c', command];
   
   spawn(cmd, args, { stdio: 'inherit' });
   ```

## 🔧 调试技巧

### 启用调试模式

```javascript
// 在 test-runner-secure.config.cjs 中
{
    logLevel: 'debug',
    enableDebugMode: true,
    debugOptions: {
        logRequests: true,
        logResponses: true,
        logErrors: true
    }
}
```

### 查看详细日志

```bash
# 启用详细日志
DEBUG=test-runner-secure* node scripts/test-runner-secure.cjs

# 查看日志文件
tail -f logs/test-runner-secure.log
```

### 使用断点调试

```javascript
// 在代码中添加断点
const debugger = require('debug')('test-runner-secure:debug');
debugger('Debug message here');

// 使用 Node.js 调试器
node --inspect scripts/test-runner-secure.cjs
```

### 选择性测试

```bash
# 只运行特定测试
node scripts/test-final-functionality-v2.cjs --only=读写锁

# 跳过特定测试
node scripts/test-final-functionality-v2.cjs --skip=加密,安全

# 详细输出
node scripts/test-final-functionality-v2.cjs --verbose
```

## 📞 获取帮助

### 查看帮助信息

```bash
node scripts/test-runner-secure.cjs --help
```

### 运行诊断测试

```bash
node scripts/test-runner-secure.validation-tests.cjs
```

### 查看系统状态

```javascript
const status = await runner.getSystemStatus();
console.log('System status:', status);
```

## 🔄 恢复程序

### 重置配置

```bash
# 备份当前配置
cp scripts/test-runner-secure.config.cjs scripts/test-runner-secure.config.cjs.bak

# 重置为默认配置
cp scripts/test-runner-secure.config.default.cjs scripts/test-runner-secure.config.cjs
```

### 清理临时文件

```bash
# 清理日志文件
rm -rf logs/*

# 清理临时文件
rm -rf tmp/*

# 清理测试结果
rm -f scripts/.test-*.json
```

### 重启服务

```bash
# 停止所有相关进程
pkill -f test-runner-secure

# 重新启动
node scripts/test-runner-secure.cjs
```

## 🔗 相关文档

- [README](./README-test-runner-secure.md) - 项目概述
- [API文档](./API-test-runner-secure.md) - 详细的API接口说明
- [快速使用指南](./QUICK_START-test-runner-secure.md) - 简明的使用指南

## 📝 报告问题

如果遇到本文档未涵盖的问题，请提交以下信息：

1. 错误信息和堆栈跟踪
2. 操作系统和Node.js版本
3. 相关配置文件内容
4. 重现步骤
5. 预期行为和实际行为

这样可以帮助我们更快地定位和解决问题。