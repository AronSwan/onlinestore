# 运维脚本使用指南

## 📋 概述
本文档为运维人员提供文档系统相关脚本的详细使用说明，帮助快速定位和运行各种自动化工具。



### 快速开始

#### 1. 安装依赖
```bash
npm install
npm run docs:install
```

#### 2. 初始化系统
```bash
npm run docs:system:init
```

#### 3. 启动文档系统
```bash
npm run docs:system:start
```


- 用户名: admin
- 密码: admin123

### 文档集成管理

#### 文档扫描和导入
```bash
# 扫描所有文档
npm run docs:integration:scan

# 批量导入文档
npm run docs:integration:import

# 实时监控文档变化
npm run docs:integration:watch


```

#### 同步守护进程
```bash
# 启动守护进程
npm run docs:sync:start

# 停止守护进程
npm run docs:sync:stop

# 查看守护进程状态
npm run docs:sync:status
```

#### 系统控制
```bash
# 系统状态检查
npm run docs:system:status

# 健康检查
npm run docs:system:health

# 生成系统报告
npm run docs:system:report

# 重启系统
npm run docs:system:restart

# 停止系统
npm run docs:system:stop
```



## 🔧 可用脚本清单

### 1. 文档协调性检查 {#coordination-check}
**脚本位置**: `backend/scripts/docs-coordination-check.js`
**使用方法**: `cd backend && npm run docs:coordination-check`
**功能**: 检查文档系统的协调性问题，包括链接有效性、内容重复性、导航一致性等
**输出**: 详细的问题报告，包含高/中/低优先级问题统计

**完整命令选项**:
```bash
# 基本检查
npm run docs:coordination-check

# 检查特定目录
npm run docs:coordination-check -- --path=backend/docs

# 生成详细报告
npm run docs:coordination-check -- --verbose

# 只检查高优先级问题
npm run docs:coordination-check -- --priority=high
```

### 2. 文档协调性修复 {#coordination-fix}
**脚本位置**: `backend/scripts/docs-coordination-fix.js`
**使用方法**: `cd backend && npm run docs:coordination-fix`
**功能**: 自动修复常见的文档协调性问题
**输出**: 修复统计报告和应用的具体修复详情

**完整命令选项**:
```bash
# 自动修复所有问题
npm run docs:coordination-fix

# 只修复高优先级问题
npm run docs:coordination-fix -- --priority=high

# 预览修复（不实际执行）
npm run docs:coordination-fix -- --dry-run

# 修复特定类型的问题
npm run docs:coordination-fix -- --fix-types=links,anchors
```

### 3. 文档覆盖率检查 {#coverage-check}
**脚本位置**: `backend/scripts/docs-coverage-check.js`
**使用方法**: `cd backend && npm run docs:coverage-check`
**功能**: 检查项目文档的覆盖率，识别缺失的文档文件
**输出**: 覆盖率统计和缺失文档清单

**完整命令选项**:
```bash
# 基本覆盖率检查
npm run docs:coverage-check

# 检查特定模块
npm run docs:coverage-check -- --module=api

# 生成HTML报告
npm run docs:coverage-check -- --format=html

# 设置覆盖率阈值
npm run docs:coverage-check -- --threshold=80
```

### 4. 实时文档监控 {#docs-watch}
**脚本位置**: `backend/scripts/docs-watcher.ts`
**使用方法**: `cd backend && npm run docs:watch`
**功能**: 实时监控文档变更，自动触发相关检查和修复
**输出**: 实时监控日志和自动处理结果

**完整命令选项**:
```bash
# 启动实时监控
npm run docs:watch

# 监控特定目录
npm run docs:watch -- --watch-dir=backend/docs

# 设置轮询间隔（秒）
npm run docs:watch -- --interval=5

# 启用自动修复
npm run docs:watch -- --auto-fix
```

问题统计: 高优先级 0 个, 中优先级 165 个, 低优先级 0 个
```

**优先级说明**:
- **高优先级**: 必须立即修复的关键问题（如失效的外部链接）
- **中优先级**: 需要优化的内部问题（如锚点链接、交叉引用）
- **低优先级**: 可延后处理的次要问题

### 协调性修复报告示例
```
📋 文档协调性修复报告
=============================================
修复统计: 共应用 8972 个修复
```
=======
## 📊 脚本运行结果解读

### 协调性检查报告示例 {#check-report}
```
📊 文档协调性检查报告
=============================================
问题统计: 高优先级 0 个, 中优先级 165 个, 低优先级 0 个
```

**优先级说明**:
- **高优先级**: 必须立即修复的关键问题（如失效的外部链接、关键功能缺失）
- **中优先级**: 需要优化的内部问题（如锚点链接、交叉引用、格式一致性）
- **低优先级**: 可延后处理的次要问题（如拼写错误、格式微调）

### 协调性修复报告示例 {#fix-report}
```
📋 文档协调性修复报告
=============================================
修复统计: 共应用 8972 个修复
- 链接修复: 4500 个
- 锚点修复: 3200 个
- 格式修复: 1272 个
```

**修复类型说明**:
- **链接修复**: 修复失效的URL链接和内部文件引用
- **锚点修复**: 修复文档内部的锚点跳转链接
- **格式修复**: 统一文档格式和样式规范
=============================================
问题统计: 高优先级 0 个, 中优先级 165 个, 低优先级 0 个
```

**优先级说明**:
- **高优先级**: 必须立即修复的关键问题（如失效的外部链接）
- **中优先级**: 需要优化的内部问题（如锚点链接、交叉引用）
- **低优先级**: 可延后处理的次要问题

### 协调性修复报告示例
```
📋 文档协调性修复报告
=============================================
修复统计: 共应用 8972 个修复
```

## 🚀 快速开始

### 日常维护流程 {#daily-maintenance}
1. **运行检查**: `npm run docs:coordination-check`
2. **查看报告**: 分析高优先级问题
3. **自动修复**: `npm run docs:coordination-fix`
4. **验证修复**: 再次运行检查脚本
5. **提交变更**: 将修复后的文档提交到版本控制

### 紧急问题处理 {#emergency-fix}
如果发现高优先级问题:
1. **立即运行修复脚本**: `npm run docs:coordination-fix -- --priority=high`
2. **手动检查关键链接**: 验证重要功能的文档链接
3. **验证修复效果**: 重新运行检查脚本确认问题已解决
4. **通知团队**: 如有必要，通知相关开发人员

### 新功能文档流程 {#new-feature-docs}
1. **创建文档**: 使用标准模板创建新功能文档
2. **运行检查**: `npm run docs:coordination-check`
3. **修复问题**: 根据报告修复协调性问题
4. **提交审核**: 将文档提交给团队审核

## 🛠️ 故障排除 {#troubleshooting}

### 常见问题及解决方案

#### 脚本无法找到文件
**问题**: 运行脚本时提示文件不存在
**解决方案**: 
```bash
# 确保在正确的目录下运行
cd backend

# 检查脚本文件是否存在
ls scripts/

# 重新安装依赖
npm install
```

#### 权限问题
**问题**: 脚本无法写入文件或目录
**解决方案**:
```bash
# 检查文件权限
ls -la backend/docs/

# 修复权限问题
chmod +x backend/scripts/*.js
```

#### 依赖问题
**问题**: 缺少必要的依赖包
**解决方案**:
```bash
# 安装所有依赖
npm install

# 检查特定依赖
npm list markdownlint
```

#### 内存不足
**问题**: 处理大型文档库时内存不足
**解决方案**:
```bash
# 增加Node.js内存限制
node --max-old-space-size=4096 scripts/docs-coordination-check.js

# 或使用npm脚本
npm run docs:coordination-check -- --max-memory=4096
```

## ❓ 常见问题解答 {#faq}

### Q: 脚本运行时间过长怎么办？
**A**: 可以尝试以下优化：
- 使用 `--priority=high` 只检查高优先级问题
- 设置 `--max-files=1000` 限制处理文件数量
- 分模块运行检查脚本

### Q: 如何自定义检查规则？
**A**: 编辑 `backend/docs/quality/markdownlint.json` 配置文件，调整规则设置。

### Q: 脚本是否可以集成到CI/CD流水线？
**A**: 是的，所有脚本都设计为可以在CI/CD环境中运行，返回适当的退出代码。

### Q: 如何处理脚本报告的误报？
**A**: 可以在配置文件中添加忽略规则，或使用 `--ignore-pattern` 参数。

### Q: 如何添加新的检查规则？
**A**: 修改 `backend/scripts/docs-coordination-check.js` 中的检查逻辑，添加新的验证函数。

## 📁 脚本文件位置
所有脚本文件位于 `backend/scripts/` 目录下:
- `docs-coordination-check.js` - 协调性检查
- `docs-coordination-fix.js` - 协调性修复
- `docs-coverage-check.js` - 覆盖率检查
- `docs-watcher.ts` - 实时监控

## 🔄 自动化集成
脚本已集成到 GitHub Actions，每日自动运行:
- 检查文档协调性
- 生成质量报告
- 发送通知提醒

## 📞 技术支持
如遇脚本运行问题，请联系:
- 技术支持邮箱: tech-support@example.com
- 文档反馈邮箱: docs-feedback@example.com

## 📝 更新日志
- 2024-10-05: 创建运维指南，集成所有脚本使用说明
- 2024-10-05: 优化脚本路径配置，修复协调性问题
- 2024-10-05: 添加故障排除和FAQ章节

---
*最后更新: 2024-10-05*