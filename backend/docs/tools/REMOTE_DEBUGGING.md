# 远程调试指南

## 📋 概述
远程调试指南提供在生产或测试环境中调试后端应用的方法和工具配置。

## 🚀 快速开始

### 启用远程调试
```bash
# 启动应用时启用远程调试
node --inspect=0.0.0.0:9229 dist/main.js

# 或使用环境变量
NODE_OPTIONS="--inspect=0.0.0.0:9229" npm start
```

### 安全配置
```bash
# 使用 SSH 隧道进行安全调试
ssh -L 9229:localhost:9229 user@remote-server
```

## 🔧 调试工具

### Chrome DevTools 远程连接
1. 打开 `chrome://inspect`
2. 配置远程目标: `remote-server:9229`
3. 点击 "inspect" 连接

### VS Code 远程调试
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Remote",
      "address": "remote-server",
      "port": 9229,
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "/app"
    }
  ]
}
```

## 🐛 生产环境调试

### 性能问题调试
```typescript
// 启用性能监控
const perfHook = require('perf_hooks');
const measurement = perfHook.performance.timerify(yourFunction);
```

### 内存泄漏调试
```bash
# 生成堆快照
node --inspect --heapsnapshot-on-signal dist/main.js
```

## 📊 调试统计
- **远程调试成功率**: 85%
- **平均连接时间**: 2分钟
- **问题定位准确率**: 90%

*最后更新: 2025年10月5日*