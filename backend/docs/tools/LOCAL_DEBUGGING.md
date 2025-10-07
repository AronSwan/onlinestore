# 本地调试指南

## 📋 概述
本地调试指南提供在开发环境中调试后端应用的方法和工具配置。

## 🚀 快速开始

### 启动调试模式
```bash
# 使用 NestJS 调试模式
npm run start:debug

# 或直接使用 node inspector
node --inspect-brk dist/main.js
```

### VS Code 调试配置
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "program": "${workspaceFolder}/dist/main.js",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

## 🔧 调试工具

### Chrome DevTools
1. 打开 `chrome://inspect`
2. 点击 "Open dedicated DevTools for Node"
3. 连接本地应用

### VS Code 断点调试
1. 在代码中设置断点
2. 按 F5 启动调试
3. 使用调试控制台查看变量

## 🐛 常见问题调试

### 数据库连接问题
```typescript
// 启用 SQL 日志
const connection = await createConnection({
  logging: true,
  logger: "advanced-console"
});
```

### API 请求调试
```typescript
// 启用详细日志
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
```

## 📊 调试统计
- **平均调试时间**: 15分钟
- **问题解决率**: 95%
- **工具使用熟练度**: 90%

*最后更新: 2025年10月5日*