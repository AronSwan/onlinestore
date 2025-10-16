# 测试监控脚本使用说明

## 概述

`test-monitor.js` 是一个用于自动化测试执行和覆盖率分析的监控脚本。改进版本 (`test-monitor-improved.js`) 增加了更多功能，提高了健壮性和可配置性。

## 主要功能

- ✅ 自动运行测试并生成覆盖率报告
- 📊 详细的覆盖率分析和热点识别
- 🔍 关键模块专项分析
- ⏰ 支持定时监控和单次运行
- 🔧 灵活的配置管理
- 📢 可选的通知机制
- 🛡️ 并发控制和错误恢复
- 📝 分级日志和日志轮转

## 快速开始

### 1. 基本使用

```bash
# 运行一次监控
node scripts/test-monitor-improved.js --once

# 启动定时监控（默认60分钟间隔）
node scripts/test-monitor-improved.js

# 自定义监控间隔（30分钟）
node scripts/test-monitor-improved.js 30
```

### 2. 高级选项

```bash
# 设置目标覆盖率为85%
node scripts/test-monitor-improved.js --targetCoverage=85

# 设置日志级别为DEBUG
node scripts/test-monitor-improved.js --logLevel=DEBUG

# 组合使用多个选项
node scripts/test-monitor-improved.js --targetCoverage=85 --interval=30 --logLevel=WARN
```

## 配置文件

创建 `test-monitor.config.json` 文件来自定义监控行为：

```json
{
  "targetCoverage": 80,
  "maxLogSize": 10485760,
  "logLevel": "INFO",
  "thresholds": {
    "lines": 75,
    "functions": 75,
    "branches": 75,
    "statements": 75
  },
  "keyModules": [
    "src/auth/auth.service.ts",
    "src/auth/auth.controller.ts"
  ],
  "notifications": {
    "enabled": false,
    "webhook": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
  },
  "testRunner": {
    "command": "node scripts/test-runner-secure.cjs",
    "timeout": 30000,
    "retries": 2
  }
}
```

### 配置项说明

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `targetCoverage` | number | 80 | 目标覆盖率百分比 |
| `maxLogSize` | number | 10485760 | 日志文件最大大小（字节） |
| `logLevel` | string | "INFO" | 日志级别：ERROR/WARN/INFO/DEBUG |
| `thresholds` | object | - | 各项覆盖率阈值 |
| `keyModules` | array | - | 需要特别关注的关键模块 |
| `notifications` | object | - | 通知配置 |
| `testRunner` | object | - | 测试运行器配置 |

## 通知设置

### Slack 通知

```json
{
  "notifications": {
    "enabled": true,
    "webhook": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
  }
}
```

### 邮件通知

```json
{
  "notifications": {
    "enabled": true,
    "email": {
      "smtp": {
        "host": "smtp.gmail.com",
        "port": 587,
        "secure": false,
        "auth": {
          "user": "your-email@gmail.com",
          "pass": "your-app-password"
        }
      },
      "from": "test-monitor@yourcompany.com",
      "to": ["dev-team@yourcompany.com"]
    }
  }
}
```

## 输出解读

### 覆盖率报告示例

```
📊 覆盖率报告
==================================================
📁 文件数量: 45
📏 行覆盖率: 82.5% (1250/1515)
⚙️  函数覆盖率: 78.9% (150/190)
🔀 分支覆盖率: 71.2% (280/393)
📝 语句覆盖率: 84.3% (1320/1565)
==================================================
🎉 恭喜！整体覆盖率 (84.3%) 已达到目标 (80%)

🔥 覆盖率热点（需要关注的文件）
--------------------------------------------------
🔴 src/utils/complex-helper.ts: 35.2% (25/71)
🟡 src/services/legacy-service.ts: 58.7% (44/75)
```

### 关键模块分析

```
🔍 关键模块分析
--------------------------------------------------
✅ src/auth/auth.service.ts: 92.1% (58/63)
⚠️ src/users/users.controller.ts: 65.4% (34/52)
❌ src/products/products.service.ts: 无覆盖率数据
```

## 故障排除

### 常见问题

1. **锁文件错误**
   ```
   错误: 另一个监控进程正在运行
   ```
   解决方案：删除 `.test-monitor.lock` 文件或等待前一个进程完成

2. **覆盖率文件不存在**
   ```
   ⚠️ 未找到覆盖率报告文件
   ```
   解决方案：确保测试运行器正确生成覆盖率报告

3. **权限错误**
   ```
   错误: EACCES: permission denied
   ```
   解决方案：检查文件权限，确保脚本有读写权限

### 调试模式

使用 DEBUG 日志级别获取详细信息：

```bash
node scripts/test-monitor-improved.js --logLevel=DEBUG --once
```

## 集成到 CI/CD

### GitHub Actions 示例

```yaml
name: Test Coverage Monitor
on:
  schedule:
    - cron: '0 */6 * * *'  # 每6小时运行一次

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: node scripts/test-monitor-improved.js --once
```

### Jenkins Pipeline 示例

```groovy
pipeline {
  agent any
  triggers {
    cron('H */4 * * *')  # 每4小时运行一次
  }
  steps {
    sh 'npm install'
    sh 'node scripts/test-monitor-improved.js --once'
  }
}
```

## 性能优化

1. **调整监控间隔**：根据项目大小和测试执行时间调整监控频率
2. **并行测试**：配置 Jest 的 `maxWorkers` 选项
3. **增量测试**：考虑只运行变更相关的测试
4. **资源限制**：设置合适的超时和内存限制

## 安全考虑

1. **敏感信息**：不要在配置文件中硬编码密码，使用环境变量
2. **权限控制**：限制脚本的文件系统访问权限
3. **网络安全**：确保 webhook URL 和 SMTP 配置的安全

## 版本历史

- v2.0.0 (改进版)：增加配置文件支持、通知机制、并发控制
- v1.0.0 (原版)：基本监控功能

## 支持

如有问题或建议，请联系开发团队或创建 Issue。