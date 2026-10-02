# 项目冗余文件清理指南

## 文档信息
- **作者**: AI助手  
- **时间**: 2025-01-26 15:45:00
- **用途**: 指导项目冗余文件的识别、评估和清理工作
- **依赖文件**: package.json, .gitignore, 项目目录结构

## 一、清理原则

### 1.1 安全第一原则
- 清理前必须备份重要文件
- 优先清理临时文件和缓存文件
- 保留核心配置和业务代码

### 1.2 分类处理原则
- **立即清理**: 临时文件、重复备份
- **合并优化**: 重复配置文件
- **归档处理**: 历史文档和报告
- **保留重要**: 核心配置和最新备份

### 1.3 删除前检查引用
- 不要删除被 `package.json` 中 `scripts` 依赖的脚本或配置。
- 删除前先全局搜索引用，示例（Windows）：
  - `findstr /S /N /I "jwt-secret-check.js" backend\package.json backend\scripts\*`
  - `findstr /S /N /I "test-api.js" backend\*`
- 示例（Linux/macOS）：
  - `grep -Rni "jwt-secret-check.js" backend/`
  - `grep -Rni "test-api.js" backend/`

## 二、冗余文件清单

### 2.1 立即清理文件（高优先级）

#### 临时和缓存文件
```
backend/.test-cache/              # 测试缓存目录
backend/.test-output/             # 测试输出目录
backend/test-temp/                # 临时测试文件
backend/test-output/              # 测试输出目录
backend/run.err                   # 错误日志
backend/run.out                   # 输出日志
backend/build.out                 # 构建输出
backend/undefined                 # 未定义文件
```

#### 重复备份文件
```
backups/full-backup-2025-10-07T04-10-41-810Z-report.json
backups/full-backup-2025-10-07T04-10-41-810Z.tar.gz
# 保留最新的备份文件即可
```

### 2.2 合并优化文件（中优先级）

#### 重复配置文件
```
# TypeScript配置 (保留tsconfig.json，合并其他)
backend/tsconfig.base.json
backend/tsconfig.build.json
backend/tsconfig.spec.json
backend/tsconfig.strict.json
backend/tsconfig.email-adapter.json

# Jest配置 (保留jest.config.cjs，合并其他)
backend/jest.config.e2e.cjs
backend/jest.config.integration.cjs
backend/jest.config.scripts.cjs
backend/jest.config.test.cjs
backend/jest.config.unit.cjs
backend/jest.soft.config.cjs

# Prettier配置 (保留.prettierrc.json)
backend/.prettierrc
```

#### 重复Docker文件
```
backend/Dockerfile.dev
backend/Dockerfile.optimized
backend/Dockerfile.test-monitor
backend/docker-compose.yml.backup
backend/docker-compose.simple.yml
backend/docker-compose.test-monitor.yml
backend/docker-compose.tracing.yml
```

### 2.3 归档处理文件（低优先级）

#### 历史文档和报告
```
backend/ANCHOR_GUIDE.md
backend/BACKEND_CODE_SYNTAX_ANALYSIS_REPORT.md
backend/BACKEND_IMPROVEMENT_PLAN.md
backend/BACKEND_OPTIMIZATION_COMPLETION_REPORT.md
backend/BACKEND_OPTIMIZATION_PLAN.md
backend/CACHE_DATA_VERIFICATION_REPORT.md
backend/CACHE_UPGRADE_SUMMARY.md
backend/CODE_FIX_EXAMPLES.md
backend/CODE_INSPECTION_REPORT.md
backend/CODE_INSPECTION_SUMMARY.md
backend/CRITICAL_FIXES_SUMMARY.md
backend/DECORATOR_ERRORS_FIXED.md
backend/DEPENDENCY_UPDATE_REPORT.md
backend/DEPLOYMENT_CHECKLIST.md
backend/DEPLOYMENT_GUIDE.md
backend/DEPLOYMENT_OPTIMIZATION_PLAN.md
backend/DEPLOYMENT_SUMMARY.md
backend/DOCKER_BUILD_OPTIMIZATION_GUIDE.md
backend/DOCKER_BUILD_VERIFICATION_REPORT.md
backend/DOCKER_OPTIMIZATION_GUIDE.md
backend/DOCKER_OPTIMIZATION_SUMMARY.md
backend/EMERGENCY_FIXES_GUIDE.md
backend/EMERGENCY_FIXES_STATUS.md
backend/ERROR_FIX_REPORT.md
backend/FINAL_DECORATOR_FIX_REPORT.md
backend/GLOBAL_EXCEPTION_HANDLING_GUIDE.md
backend/GLOBAL_EXCEPTION_HANDLING_VERIFICATION_REPORT.md
backend/IMPROVEMENT_CHECKLIST.md
backend/IMPROVEMENT_EXECUTION_CHECKLIST.md
backend/IMPROVEMENT_PLAN_TODO.md
backend/IMPROVEMENT_TODO_CHECKLIST.md
backend/IMPROVEMENT_TODO_ISSUES.md
backend/JEST_VERSION_FIX.md
backend/JEST_VERSION_FIXED_SUMMARY.md
backend/JEST_VERSION_ISSUES_FINAL_REPORT.md
backend/JWT_SECRET_TECHNICAL_DEBT_RESOLUTION.md
backend/LEARNING_FROM_ERRORS.md
backend/MONITORING_ALERT_SYSTEM_REPORT.md
backend/MONITORING_METRICS_VERIFICATION_REPORT.md
backend/OPTIMIZATION_FILES_INDEX.md
backend/OPTIMIZATION_FINAL_REPORT.md
backend/OPTIMIZATION_MASTER_PLAN.md
backend/OPTIMIZATION_SUMMARY.md
backend/PERFORMANCE_OPTIMIZATION_PLAN.md
backend/QUICK_FIX_GUIDE.md
backend/QUICK_START.md
backend/README_CACHING.md
backend/README_FIXES.md
backend/README_PERFORMANCE.md
backend/README_REDPANDA.md
backend/README_SECURITY_HEATMAP.md
backend/REDIS_DEPENDENCY_FIX_PLAN.md
backend/REDIS_DEPENDENCY_FIX_VERIFICATION.md
backend/REDPANDA_INTEGRATION_SUMMARY.md
backend/REFACTORING_SUMMARY.md
backend/SECURITY_AUDIT_REPORT.md
backend/SECURITY_AUDIT_SUMMARY.md
backend/SECURITY_CHECKLIST.md
backend/SECURITY_DASHBOARD_FILE_READING_SUMMARY.md
backend/SECURITY_ENHANCEMENT_PLAN.md
backend/SECURITY_FIX_PRIORITY.md
backend/SECURITY_IMPROVEMENT_PLAN.md
backend/SECURITY_NOTIFICATION_SETUP.md
backend/SECURITY_RELEASE_GATE.md
backend/SECURITY_VULNERABILITY_TRACKING.md
backend/SOURCE_PATCH_FRAGMENTS.md
backend/TESTING_IMPROVEMENTS_REPORT.md
backend/TEST_COVERAGE_EMERGENCY_PLAN.md
backend/TEST_COVERAGE_EXECUTION_TRACKER.md
backend/TEST_COVERAGE_IMPROVEMENT_PLAN.md
backend/TEST_COVERAGE_IMPROVEMENT_REPORT.md
backend/TEST_EXECUTION_PLAN.md
backend/TEST_EXECUTION_REPORT.md
backend/TEST_RUNNER_FIX_SUMMARY.md
backend/TEST_SKELETON_EXAMPLES.md
backend/TYPESCRIPT_FIX_REPORT.md
backend/UPDATE_COMPLETION_SUMMARY.md
backend/VERIFICATION_REPORT.md
backend/WINDOWS_SETUP.md
```

#### 重复测试脚本
```
backend/cache-data-generation-test.js
backend/cache-data-integration-test.js
backend/cache-data-real-usage-test.js
backend/cache-data-verification.js
backend/create-monitoring-test.js
backend/jwt-secret-check.js
backend/kubernetes-test.js
backend/test-api.js
backend/test-config.js
backend/test-embedded-data.html
backend/test-file-reading.js
backend/test-logging.js
backend/test-meilisearch-setup.js
backend/test-monitoring-performance.js
backend/test-openobserve.js
backend/test-payment.js
backend/test-security-monitoring.js
backend/test-simple-file-reading.html
```

#### 重复修复脚本
```
backend/apply-fixes.js
backend/fix-decorators.js
backend/fix-final-decorators.js
backend/fix-remaining-decorators.js
backend/upgrade-startup-script.js
backend/verify-fixes.js
```

### 2.4 根目录冗余文件
```
MicrosoftEdgeWebview2Setup.exe    # 浏览器安装程序
PrestaShop-src.zip                # 第三方源码压缩包
delete                            # 删除标记文件
qc                                # 质量检查文件
query                             # 查询文件
queryex                           # 扩展查询文件
```

## 三、清理操作指南

### 3.1 备份策略
```bash
# 创建清理前备份
tar -czf cleanup-backup-$(date +%Y%m%d).tar.gz ./
```

### 3.2 清理脚本示例

#### Windows PowerShell 清理脚本
```powershell
# 推荐使用仓库根目录的自动清理脚本（支持干运行）：
#   .\cleanup-project.ps1 -DryRun:$true
# 实际清理：
#   .\cleanup-project.ps1 -DryRun:$false

# 清理临时文件
Remove-Item -Path "backend\run.err" -Force
Remove-Item -Path "backend\run.out" -Force
Remove-Item -Path "backend\build.out" -Force
Remove-Item -Path "backend\undefined" -Force

# 清理测试缓存目录
if (Test-Path "backend\.test-cache") {
    Remove-Item -Path "backend\.test-cache" -Recurse -Force
}
if (Test-Path "backend\.test-output") {
    Remove-Item -Path "backend\.test-output" -Recurse -Force
}
if (Test-Path "backend\test-temp") {
    Remove-Item -Path "backend\test-temp" -Recurse -Force
}
if (Test-Path "backend\test-output") {
    Remove-Item -Path "backend\test-output" -Recurse -Force
}

# 清理旧备份文件（保留最新）
$backupFiles = Get-ChildItem "backups\" -Filter "full-backup-*" | Sort-Object LastWriteTime -Descending
if ($backupFiles.Count -gt 1) {
    $backupFiles | Select-Object -Skip 1 | Remove-Item -Force
}
```

#### Linux/Mac 清理脚本
```bash
#!/bin/bash
# 清理临时文件
rm -f backend/run.err
rm -f backend/run.out
rm -f backend/build.out
rm -f backend/undefined

# 清理测试缓存目录
rm -rf backend/.test-cache
rm -rf backend/.test-output
rm -rf backend/test-temp
rm -rf backend/test-output

# 清理旧备份文件（保留最新）
cd backups
ls -t full-backup-* | tail -n +2 | xargs rm -f
cd ..
```

### 3.3 配置文件合并建议

#### TypeScript配置合并
建议保留 `tsconfig.json` 作为主配置，通过 `extends` 引用其他配置：
```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    // 项目特定配置
  }
}
```

#### Jest配置合并
创建统一的 `jest.config.cjs`，支持多环境：
```javascript
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['**/__tests__/**/*.test.[jt]s?(x)']
    },
    {
      displayName: 'integration',
      testMatch: ['**/__tests__/**/*.integration.[jt]s?(x)']
    }
  ]
};
```

## 四、清理后验证

### 4.1 功能验证
```bash
# 验证项目构建
cd backend && npm run build

# 验证测试运行
npm test

# 验证依赖安装
npm install && npm run start:dev
```

### 4.2 完整性检查
```bash
# 检查关键文件是否存在
ls -la backend/package.json
ls -la backend/src/main.ts
ls -la backend/Dockerfile

# 检查.gitignore是否包含清理的文件
cat .gitignore | grep -E "(run\.err|run\.out|build\.out)"
```

## 五、预防措施

### 5.1 .gitignore 更新建议
```gitignore
# 临时文件
run.err
run.out
build.out
undefined

# 测试缓存
.test-cache/
.test-output/
test-temp/

# 备份文件（保留最新）
backups/full-backup-*.tar.gz
backups/full-backup-*-report.json
```

### 5.2 定期清理计划
建议每月执行一次清理操作：
1. 备份当前状态
2. 执行清理脚本
3. 验证功能完整性
4. 更新清理文档

## 六、风险控制

### 6.1 回滚策略
- 保留清理前备份7天
- 记录清理操作日志
- 准备快速回滚脚本

### 6.2 紧急恢复
如清理后发现问题，立即执行：
```bash
# 从备份恢复
tar -xzf cleanup-backup-YYYYMMDD.tar.gz
```

## 七、清理效益评估

### 7.1 空间节省
- 预计可节省磁盘空间：500MB-1GB
- 减少Git仓库体积：200-500MB

### 7.2 性能提升
- 构建时间减少：10-20%
- 测试执行速度提升：15-25%
- 开发环境启动更快

---

**文档维护**: 每次清理操作后更新此文档，记录清理结果和经验教训。
