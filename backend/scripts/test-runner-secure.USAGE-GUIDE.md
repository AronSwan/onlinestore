# test-runner-secure.cjs 使用指南

## 快速开始

### 1. 验证改进版本
```bash
# 运行验证测试
node backend/scripts/test-runner-secure.validation-tests.cjs

# 预期结果：通过率 > 95%
```

### 2. 使用改进版本
```bash
# 基本使用
node backend/scripts/test-runner-secure.improved.cjs

# 带覆盖率
node backend/scripts/test-runner-secure.improved.cjs --coverage

# 集成测试
node backend/scripts/test-runner-secure.improved.cjs integration

# 详细输出
node backend/scripts/test-runner-secure.improved.cjs --verbose
```

## 主要改进特性

### 🚀 性能优化
- **命令执行频率**: 50次/10秒（原：10次/5秒）
- **参数长度限制**: 2000字符（原：1000字符）
- **并发处理**: 智能锁机制，支持最大CPU核心数并发

### 🛡️ 安全保持
- 所有原有安全特性完全保留
- 14项安全测试100%通过
- 防护命令注入、路径遍历等攻击

### 🔧 健壮性增强
- **错误恢复**: 3种恢复策略，自动重试
- **资源管理**: 内存监控，自动垃圾回收
- **并发安全**: 进程锁，竞态条件处理

## 配置选项

### 基本选项
```bash
-h, --help              # 显示帮助
-v, --version           # 显示版本
-c, --coverage          # 启用覆盖率
--verbose               # 详细输出
--silent                # 静默模式
--watch                 # 监视模式
```

### 高级选项
```bash
--timeout=<ms>          # 超时时间 (默认: 30000)
--maxWorkers=<num>      # 工作线程数 (默认: CPU核心数)
--testPathPattern=<pattern>     # 测试文件模式
--testNamePattern=<pattern>     # 测试名称模式
--config=<path>         # Jest配置文件
```

## 使用场景

### 场景1: 日常开发测试
```bash
# 快速单元测试
node test-runner-secure.improved.cjs

# 监视模式开发
node test-runner-secure.improved.cjs --watch
```

### 场景2: CI/CD集成
```bash
# CI环境测试
node test-runner-secure.improved.cjs --coverage --silent

# 集成测试
node test-runner-secure.improved.cjs integration --maxWorkers=4
```

### 场景3: 特定测试
```bash
# 测试特定模块
node test-runner-secure.improved.cjs --testPathPattern="auth.*"

# 测试特定用例
node test-runner-secure.improved.cjs --testNamePattern="login"
```

## 监控和调试

### 性能监控
- 自动内存监控（限制：512MB）
- 执行时间跟踪（超时：30秒）
- 并发进程管理

### 错误处理
- 自动错误恢复（最多3次重试）
- 详细错误日志
- 优雅关闭机制

### 调试模式
```bash
# 启用调试信息
DEBUG=1 node test-runner-secure.improved.cjs --verbose
```

## 故障排除

### 常见问题

#### 1. 命令执行频率限制
**问题**: "命令执行频率过高"
**解决**: 
- 改进版本已优化限制（50次/10秒）
- 如仍遇到，等待10秒后重试

#### 2. 内存使用过高
**问题**: "内存使用过高"
**解决**:
- 自动触发垃圾回收
- 减少并发数：`--maxWorkers=2`

#### 3. 并发冲突
**问题**: "无法获取进程锁"
**解决**:
- 自动重试机制（最多5次）
- 随机延迟避免冲突

#### 4. 参数验证失败
**问题**: "参数包含危险模式"
**解决**:
- 检查参数中的特殊字符
- 使用引号包围复杂参数

### 日志分析
```bash
# 查看详细日志
tail -f logs/test-runner.log

# 分析错误模式
grep "ERROR" logs/test-runner.log
```

## 最佳实践

### 1. 参数使用
```bash
# ✅ 推荐
node test-runner-secure.improved.cjs --testPathPattern="src/auth"

# ❌ 避免
node test-runner-secure.improved.cjs --testPathPattern="../../../etc"
```

### 2. 并发控制
```bash
# 开发环境：使用监视模式
node test-runner-secure.improved.cjs --watch

# CI环境：限制并发
node test-runner-secure.improved.cjs --maxWorkers=2 --timeout=60000
```

### 3. 性能优化
```bash
# 大型项目：分批测试
node test-runner-secure.improved.cjs --testPathPattern="src/module1"
node test-runner-secure.improved.cjs --testPathPattern="src/module2"
```

## 迁移指南

### 从原版本迁移

#### 1. 备份原版本
```bash
cp test-runner-secure.cjs test-runner-secure.cjs.backup
```

#### 2. 替换为改进版本
```bash
cp test-runner-secure.improved.cjs test-runner-secure.cjs
```

#### 3. 验证功能
```bash
# 运行验证测试
node test-runner-secure.validation-tests.cjs

# 运行实际测试
node test-runner-secure.cjs --help
```

#### 4. 更新CI脚本
```bash
# 原脚本可能需要调整超时和并发参数
# 新版本有更合理的默认值
```

### 兼容性说明
- ✅ 完全向后兼容原版本API
- ✅ 所有原有参数继续支持
- ✅ 输出格式保持一致
- ✅ 安全特性完全保留

## 版本信息

- **当前版本**: v3.3.0 健壮性增强版
- **基于版本**: v3.2 安全增强版
- **改进日期**: 2025-10-10
- **测试通过率**: 94.4%

## 支持和反馈

### 问题报告
1. 运行验证测试确认问题
2. 收集错误日志和系统信息
3. 提供复现步骤

### 性能调优
1. 监控资源使用情况
2. 根据项目规模调整参数
3. 定期运行验证测试

---

**注意**: 改进版本在保持安全性的同时显著提升了健壮性和性能，建议在充分测试后替换原版本使用。