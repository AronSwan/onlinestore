# 安全风险热力图生成工具

## 概述

这个工具用于根据漏洞追踪表数据生成风险热力图，帮助安全团队快速识别高风险系统和漏洞分布情况。

## 功能特性

- **鲁棒的Markdown解析**: 能够处理各种格式的漏洞表格，支持多行单元格和管道字符转义
- **多语言支持**: 支持中文和英文界面，可扩展更多语言
- **可配置的系统分类**: 支持自定义系统分类字典、优先级和别名
- **自适应颜色梯度**: 根据漏洞数量自动调整颜色强度
- **保留用户自定义备注**: 更新文档时保留用户添加的备注
- **多种锚点支持**: 支持多种可能的标题格式和自动生成内容标记
- **完整的测试覆盖**: 包含单元测试、性能测试和异常路径测试

## 使用方法

### 生成风险热力图

```bash
npm run security:heatmap
```

### 运行单元测试

```bash
# 简单测试
npm run security:heatmap:test

# Jest测试（推荐）
npm run security:heatmap:jest
```

### 生成英文热力图

```bash
node -e "const { generateRiskHeatmap } = require('./scripts/generate-risk-heatmap.js'); generateRiskHeatmap({ language: 'en' });"
```

## 配置选项

脚本使用默认配置，但可以通过修改 `DEFAULT_CONFIG` 对象来自定义：

```javascript
const DEFAULT_CONFIG = {
  // 多语言支持和锚点配置
  localization: {
    supportedLanguages: ['zh', 'en'],
    defaultLanguage: 'zh',
    labels: {
      zh: {
        heatmapTitle: '风险热力图',
        systemSeverity: '系统/严重度',
        // ... 更多标签
      },
      en: {
        heatmapTitle: 'Risk Heatmap',
        systemSeverity: 'System/Severity',
        // ... 更多标签
      }
    }
  },
  // 系统分类字典，支持多标签和优先级
  systemMapping: {
    '性能问题': {
      keywords: ['索引', '查询', '性能', '缓存', '优化', 'performance', 'index'],
      priority: 1,
      color: '#43a047',
      aliases: ['性能', 'Performance']
    },
    // ... 更多系统分类
  },
  // 严重度颜色映射（支持多语言）
  severityColors: {
    '严重': '#d32f2f',
    '高': '#f57c00',
    '中': '#fbc02d',
    '低': '#388e3c',
    'Critical': '#d32f2f',
    'High': '#f57c00',
    'Medium': '#fbc02d',
    'Low': '#388e3c'
  }
};
```

## 输出文件

- **SVG热力图**: `docs/security-risk-heatmap.svg`
- **更新的追踪表**: 自动更新 `SECURITY_VULNERABILITY_TRACKING.md` 中的热力图部分

## CI/CD集成

脚本已配置在 `.github/workflows/security-dashboard.yml` 中，支持：

- 每日自动更新（UTC 00:00）
- 手动触发
- 漏洞追踪表更新时自动执行
- 自动运行测试
- 使用最新版本的GitHub Actions

## 测试覆盖

### 单元测试
1. 解析漏洞表格（包括英文表格）
2. 系统分类（包括英文关键词）
3. 颜色梯度生成
4. 分组功能
5. SVG生成（包括多语言）
6. 更新热力图段落（包括多语言）

### 性能测试
- 处理大量漏洞数据（1000+条记录）的性能测试

### 异常路径测试
- 文件不存在处理
- 文件读写错误处理
- 格式错误数据处理

## 高级功能

### 多语言支持
脚本支持中文和英文界面，包括：
- 标题和标签的多语言映射
- 严重度级别的多语言显示
- 锚点和自动生成内容标记的多语言支持

### 增强的表格解析
- 支持转义的管道字符 `\|`
- 支持多行单元格内容
- 支持英文表格标题

### 锚点规范化
- 支持多种可能的标题格式
- 支持中英文自动生成内容标记
- 智能匹配和更新

## 故障排除

如果遇到问题，请检查：

1. 漏洞追踪表文件是否存在
2. 表格格式是否正确
3. 文件权限是否允许读写
4. 运行测试以诊断问题：`npm run security:heatmap:jest`

## 贡献指南

如需改进脚本，请：

1. 运行Jest测试确保现有功能正常：`npm run security:heatmap:jest`
2. 添加新的测试用例
3. 更新文档
4. 确保所有测试通过

## 版本历史

- v1.0: 初始版本
- v2.0: 添加鲁棒解析、可配置分类、颜色梯度和用户备注保留功能
- v3.0: 添加多语言支持、增强表格解析、锚点规范化和完整测试覆盖