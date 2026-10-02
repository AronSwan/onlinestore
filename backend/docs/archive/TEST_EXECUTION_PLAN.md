# 测试执行计划与完整执行指南

> 📋 **文档索引**: 
> - 📊 [整体改进计划](./BACKEND_IMPROVEMENT_PLAN.md) - 8周改进路线图
> - 🔧 [关键修正清单](./CRITICAL_FIXES_SUMMARY.md) - 问题修正摘要
> - 💻 [代码修复示例](./CODE_FIX_EXAMPLES.md) - 技术实现细节
> - 🧪 [测试骨架示例](./TEST_SKELETON_EXAMPLES.md) - 测试用例骨架
> - 🔧 [源文件补丁片段](./SOURCE_PATCH_FRAGMENTS.md) - 可直接落盘的源文件
> - 🧪 [测试执行计划](./TEST_EXECUTION_PLAN.md) - 完整测试执行指南（当前文档）
> - 📊 [测试执行报告](./TEST_EXECUTION_REPORT.md) - 测试执行结果

## 🎯 概述

本文档提供了完整的测试执行指南，包括环境准备、执行步骤、复现顺序、校验标准和CI建议。通过遵循本计划，可以系统性地解决测试中发现的问题，提高测试覆盖率和系统稳定性。

## 🖥️ 环境与前置条件

### 系统要求
- **操作系统**: Windows 11 + PowerShell 7
- **Node.js**: 22.20.0（与报告一致）
- **包管理器**: npm
- **内存**: 最少8GB RAM
- **磁盘空间**: 至少2GB可用空间

### 项目路径
```bash
# 主仓库位置
d:/codes/onlinestore/caddy-style-shopping-site

# 后端目录
d:/codes/onlinestore/caddy-style-shopping-site/backend
```

### 环境变量配置
```bash
# 创建 .env.test 文件
NODE_ENV=test
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=test_user
DB_PASSWORD=test_password
DB_DATABASE=test_db
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1
```

## 🚀 安装与准备

### 1. 环境初始化
```powershell
# 切换到 backend 目录
cd d:/codes/onlinestore/caddy-style-shopping-site/backend

# 检查 Node.js 版本
node --version  # 应显示 v22.20.0

# 检查 npm 版本
npm --version
```

### 2. 依赖安装
```powershell
# 清理现有依赖（可选）
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue

# 安装依赖
npm ci

# 验证安装
npm list --depth=0
```

### 3. 数据库准备
```powershell
# 启动 MySQL 服务（如果未运行）
net start mysql

# 创建测试数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS test_db;"

# 运行数据库迁移
npm run migration:run
```

### 4. Redis 准备
```powershell
# 启动 Redis 服务
redis-server

# 验证 Redis 连接
redis-cli ping
```

### 5. 环境清理（可选）
```powershell
# 清理测试缓存
npm run clean --if-present

# 清理 Jest 缓存
npx jest --clearCache

# 清理覆盖率报告
Remove-Item -Recurse -Force coverage -ErrorAction SilentlyContinue
```

## 🧪 标准执行流程

### 1. 全量测试执行
```powershell
# 基础全量测试
npm test

# 带覆盖率的全量测试
npm test -- --coverage

# 串行执行（避免并发问题）
npm test -- --runInBand

# 详细输出
npm test -- --verbose
```

### 2. 指定测试套件
```powershell
# 单个文件测试
npx jest src/address/address.spec.ts

# 目录级别测试
npx jest src/auth/

# 模式匹配测试
npx jest --testPathPattern="service"
```

### 3. 特定测试用例
```powershell
# 按名称匹配
npx jest -t "should validate address"

# 按标签匹配
npx jest --testNamePattern="transaction"

# 跳过特定测试
npx jest --testPathIgnorePatterns="integration"
```

### 4. 调试模式
```powershell
# 调试模式
npx jest --runInBand --detectOpenHandles

# 详细错误信息
npx jest --verbose --no-cache

# 监听模式
npx jest --watch --coverage
```

## 🔄 问题复现与修复顺序

### 阶段1: P0级别问题修复（优先级最高）

#### 1.1 依赖注入问题复现
```powershell
# 复现依赖注入问题
npx jest src/address/address.spec.ts --verbose

# 预期错误：
# Nest cannot resolve dependencies of the AddressService (?)
# Cannot resolve dependency of AddressService (?)
```

**修复步骤**:
1. 应用补丁: [SOURCE_PATCH_FRAGMENTS.md](./SOURCE_PATCH_FRAGMENTS.md#A1.1)
2. 参考示例: [CODE_FIX_EXAMPLES.md](./CODE_FIX_EXAMPLES.md#F1.1)
3. 验证修复:
```powershell
npx jest src/address/address.spec.ts --verbose
```

#### 1.2 异步Mock问题复现
```powershell
# 复现异步Mock问题
npx jest src/auth/guards/roles.guard.spec.ts --verbose

# 预期错误：
# TypeError: Cannot read property 'then' of undefined
# Promise rejected with non-Error: undefined
```

**修复步骤**:
1. 应用补丁: [SOURCE_PATCH_FRAGMENTS.md](./SOURCE_PATCH_FRAGMENTS.md#A2.1)
2. 参考示例: [CODE_FIX_EXAMPLES.md](./CODE_FIX_EXAMPLES.md#F2.1)
3. 验证修复:
```powershell
npx jest src/auth/guards/roles.guard.spec.ts --verbose
```

#### 1.3 数据库事务问题复现
```powershell
# 复现数据库事务问题
npx jest src/payment/payment.service.spec.ts --detectOpenHandles

# 预期错误：
# QueryRunner connection failed
# Transaction rollback not called
# Connection leak detected
```

**修复步骤**:
1. 应用补丁: [SOURCE_PATCH_FRAGMENTS.md](./SOURCE_PATCH_FRAGMENTS.md#A3.1)
2. 参考示例: [CODE_FIX_EXAMPLES.md](./CODE_FIX_EXAMPLES.md#F3.1)
3. 验证修复:
```powershell
npx jest src/payment/payment.service.spec.ts --detectOpenHandles
```

### 阶段2: P1级别问题修复

#### 2.1 定时器清理问题复现
```powershell
# 复现定时器清理问题
npx jest src/monitoring/monitoring.service.spec.ts --detectOpenHandles

# 预期错误：
# Jest has detected the following 2 open handles
#   - setInterval()
#   - setTimeout()
```

**修复步骤**:
1. 应用补丁: [SOURCE_PATCH_FRAGMENTS.md](./SOURCE_PATCH_FRAGMENTS.md#A4.1)
2. 参考示例: [CODE_FIX_EXAMPLES.md](./CODE_FIX_EXAMPLES.md#F4.1)
3. 验证修复:
```powershell
npx jest src/monitoring/monitoring.service.spec.ts --detectOpenHandles --forceExit
```

#### 2.2 通知服务问题复现
```powershell
# 复现通知服务问题
npx jest src/notification/notification.service.spec.ts --verbose

# 预期错误：
# Mock method not called
# Expected 1 call but received 0
```

**修复步骤**:
1. 应用补丁: [SOURCE_PATCH_FRAGMENTS.md](./SOURCE_PATCH_FRAGMENTS.md#A2.2)
2. 参考示例: [CODE_FIX_EXAMPLES.md](./CODE_FIX_EXAMPLES.md#F2.2)
3. 验证修复:
```powershell
npx jest src/notification/notification.service.spec.ts --verbose
```

### 阶段3: P2级别问题修复

#### 3.1 缓存断言问题复现
```powershell
# 复现缓存断言问题
npx jest src/cache/enhanced-cache.spec.ts --verbose

# 预期错误：
# Expected mock to have been called with:
#   ["key", "value", 3600]
# But it was called with:
#   ["enhanced:key", '{"data":"value"}', "EX", 3600]
```

**修复步骤**:
1. 应用补丁: [SOURCE_PATCH_FRAGMENTS.md](./SOURCE_PATCH_FRAGMENTS.md#A5.1)
2. 参考示例: [CODE_FIX_EXAMPLES.md](./CODE_FIX_EXAMPLES.md#F5.1)
3. 验证修复:
```powershell
npx jest src/cache/enhanced-cache.spec.ts --verbose
```

#### 3.2 业务逻辑测试问题复现
```powershell
# 复现业务逻辑测试问题
npx jest src/cart/cart.service.spec.ts --verbose

# 预期错误：
# Test cases missing boundary conditions
# Error handling scenarios not covered
```

**修复步骤**:
1. 应用补丁: [SOURCE_PATCH_FRAGMENTS.md](./SOURCE_PATCH_FRAGMENTS.md#A5.2)
2. 参考示例: [CODE_FIX_EXAMPLES.md](./CODE_FIX_EXAMPLES.md#F5.2)
3. 验证修复:
```powershell
npx jest src/cart/cart.service.spec.ts --coverage
```

## 📊 输出与校验标准

### 1. 成功标准

#### 测试通过率
- **套件成功率**: ≥95% (26/27 套件通过)
- **用例成功率**: ≥95% (516/543 用例通过)
- **P0问题**: 100%修复
- **P1问题**: 100%修复
- **P2问题**: ≥80%修复

#### 覆盖率指标
- **语句覆盖率**: ≥85%
- **分支覆盖率**: ≥75%
- **函数覆盖率**: ≥85%
- **行覆盖率**: ≥85%

#### 性能指标
- **执行时间**: ≤30秒
- **内存使用**: 无明显泄漏
- **文件句柄**: 无未关闭句柄

### 2. 输出文件

#### 覆盖率报告
```bash
# 生成覆盖率报告
npm test -- --coverage

# 查看报告
# HTML报告: coverage/lcov-report/index.html
# 文本报告: coverage/lcov.info
# 控制台: 直接显示
```

#### 测试报告
```bash
# 生成详细报告
npm test -- --verbose --coverage --json --outputFile=test-results.json

# JUnit格式报告
npm test -- --coverage --ci --testResultsProcessor=jest-junit
```

### 3. 校验命令

#### 快速校验
```powershell
# 基础校验
npm test -- --passWithNoTests --verbose

# 覆盖率校验
npm test -- --coverage --coverageReporters=text-summary

# 性能校验
npm test -- --runInBand --detectOpenHandles
```

#### 完整校验
```powershell
# 完整测试套件
npm test -- --coverage --runInBand --verbose --detectOpenHandles

# 特定问题校验
npx jest src/address/address.spec.ts src/auth/guards/roles.guard.spec.ts --verbose
```

## 🛠️ 故障排除指南

### 1. 常见问题

#### 依赖注入问题
**症状**: 
```
Nest cannot resolve dependencies
Cannot resolve dependency of Service (?)
```

**解决方案**:
1. 检查所有依赖是否正确导入
2. 确认Mock配置完整
3. 验证provider配置正确
4. 参考修复指南: [CRITICAL_FIXES_SUMMARY.md#P0.1-依赖注入系统故障](./CRITICAL_FIXES_SUMMARY.md#P0.1-依赖注入系统故障)

#### 异步Mock问题
**症状**:
```
TypeError: Cannot read property 'then' of undefined
Promise rejected with non-Error: undefined
```

**解决方案**:
1. 确保异步方法返回Promise
2. 使用mockResolvedValue替代mockReturnValue
3. 检查async/await使用正确
4. 参考修复指南: [CRITICAL_FIXES_SUMMARY.md#P0.2-异步Mock配置错误](./CRITICAL_FIXES_SUMMARY.md#P0.2-异步Mock配置错误)

#### 定时器泄漏问题
**症状**:
```
Jest has detected open handles
- setInterval()
- setTimeout()
```

**解决方案**:
1. 在beforeEach中使用jest.useFakeTimers()
2. 在afterEach中清理定时器
3. 使用jest.clearAllTimers()
4. 参考修复指南: [CRITICAL_FIXES_SUMMARY.md#P1.2-定时器资源泄漏](./CRITICAL_FIXES_SUMMARY.md#P1.2-定时器资源泄漏)

#### 数据库连接问题
**症状**:
```
QueryRunner connection failed
Connection leak detected
ECONNREFUSED
```

**解决方案**:
1. 检查数据库服务状态
2. 验证连接配置正确
3. 完善Mock配置
4. 确保事务正确回滚
5. 参考修复指南: [CRITICAL_FIXES_SUMMARY.md#P1.1-数据库事务处理缺陷](./CRITICAL_FIXES_SUMMARY.md#P1.1-数据库事务处理缺陷)

### 2. 调试技巧

#### 详细日志
```powershell
# 启用详细日志
DEBUG=* npx jest src/problematic.spec.ts --verbose

# Jest调试
npx jest --runInBand --detectOpenHandles --no-cache
```

#### 内存分析
```powershell
# 内存使用分析
node --inspect node_modules/.bin/jest --runInBand

# 堆转储分析
node --inspect-brk node_modules/.bin/jest --runInBand
```

#### 性能分析
```powershell
# 性能分析
node --prof node_modules/.bin/jest --runInBand

# 分析结果
node --prof-process isolate-*.log > performance-analysis.txt
```

### 3. 环境问题

#### Node.js版本问题
```powershell
# 检查版本
node --version

# 切换版本（使用nvm）
nvm use 22.20.0

# 或使用n
n 22.20.0
```

#### 依赖问题
```powershell
# 清理依赖
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# 重新安装
npm ci

# 检查依赖
npm ls
```

#### 权限问题
```powershell
# 以管理员身份运行PowerShell
Start-Process PowerShell -Verb RunAs

# 或修改执行策略
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 🚀 CI/CD 集成建议

### 1. GitHub Actions 工作流

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: test_db
        ports:
          - 3306:3306
        options: --health-cmd="mysqladmin ping" --health-interval=10s --health-timeout=5s --health-retries=3
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: --health-cmd="redis-cli ping" --health-interval=10s --health-timeout=5s --health-retries=3

    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '22'
        cache: 'npm'
        cache-dependency-path: backend/package-lock.json
    
    - name: Install dependencies
      working-directory: ./backend
      run: npm ci
    
    - name: Run tests
      working-directory: ./backend
      run: npm run test:ci
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./backend/coverage/lcov.info
        flags: unittests
        name: codecov-umbrella
    
    - name: Archive test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results
        path: |
          backend/coverage/
          backend/test-results.json
```

### 2. package.json 脚本配置

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --coverage --watchAll=false --ci --reporters=default --reporters=jest-junit",
    "test:debug": "jest --runInBand --detectOpenHandles --verbose",
    "test:specific": "jest --testPathPattern",
    "test:problems": "jest src/address src/auth src/payment src/monitoring --verbose",
    "clean": "jest --clearCache && rimraf coverage",
    "pretest": "npm run lint",
    "posttest": "npm run test:check-coverage"
  },
  "jest": {
    "testTimeout": 30000,
    "verbose": true,
    "collectCoverageFrom": [
      "src/**/*.ts",
      "!src/**/*.dto.ts",
      "!src/**/*.entity.ts",
      "!src/main.ts",
      "!src/**/*.module.ts"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 75,
        "functions": 85,
        "lines": 85,
        "statements": 85
      }
    }
  }
}
```

### 3. 质量门禁配置

```yaml
# .github/workflows/quality-gate.yml
name: Quality Gate

on:
  pull_request:
    branches: [ main ]

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '22'
        cache: 'npm'
    
    - name: Install dependencies
      working-directory: ./backend
      run: npm ci
    
    - name: Run tests with coverage
      working-directory: ./backend
      run: npm run test:ci
    
    - name: Check coverage threshold
      working-directory: ./backend
      run: |
        COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
        if (( $(echo "$COVERAGE < 85" | bc -l) )); then
          echo "Coverage $COVERAGE% is below threshold 85%"
          exit 1
        fi
    
    - name: Run linting
      working-directory: ./backend
      run: npm run lint
    
    - name: Security audit
      working-directory: ./backend
      run: npm audit --audit-level=high
```

## 📈 性能优化建议

### 1. 测试执行优化

#### 并行执行
```powershell
# 启用并行执行（在资源充足时）
npm test -- --maxWorkers=4

# 根据CPU核心数自动设置
npm test -- --maxWorkers=$(nproc)
```

#### 智能运行
```powershell
# 只运行相关测试
npm test -- --onlyChanged

# 跳过已通过的测试
npm test -- --passWithNoTests
```

#### 缓存优化
```powershell
# 启用缓存
npm test -- --cache

# 清理缓存
npm test -- --clearCache
```

### 2. 内存优化

#### 垃圾回收
```powershell
# 启用垃圾回收
node --expose-gc node_modules/.bin/jest

# 限制内存使用
node --max-old-space-size=4096 node_modules/.bin/jest
```

#### 资源清理
```powershell
# 强制退出
npm test -- --forceExit

# 检测打开句柄
npm test -- --detectOpenHandles
```

### 3. 监控与分析

#### 性能监控
```powershell
# 生成性能报告
npm test -- --verbose --coverage --json

# 分析慢测试
npm test -- --verbose | grep "slow test"
```

#### 资源监控
```powershell
# 监控内存使用
Get-Process node | Select-Object ProcessName, WorkingSet, CPU

# 监控文件句柄
Get-Process node | Select-Object ProcessName, HandleCount
```

## 📋 执行检查清单

### 执行前检查
- [ ] Node.js版本为22.20.0
- [ ] 所有依赖已安装
- [ ] 数据库服务运行正常
- [ ] Redis服务运行正常
- [ ] 环境变量配置正确
- [ ] 测试数据库已创建

### 执行中检查
- [ ] 测试按预期顺序执行
- [ ] 无内存泄漏警告
- [ ] 无未关闭的文件句柄
- [ ] 覆盖率报告生成成功
- [ ] 所有P0/P1问题已修复

### 执行后检查
- [ ] 测试通过率达到目标
- [ ] 覆盖率达到阈值
- [ ] 性能指标符合要求
- [ ] 报告文件生成完整
- [ ] CI/CD流程正常

### 问题修复检查
- [ ] 依赖注入问题已解决
- [ ] 异步Mock问题已解决
- [ ] 事务处理问题已解决
- [ ] 定时器泄漏问题已解决
- [ ] 缓存断言问题已解决

---

**文档创建时间**: 2025-10-04  
**文档版本**: v1.0  
**下次更新**: 执行结果分析后更新