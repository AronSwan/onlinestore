# 安全风险热力图

## 概述

安全风险热力图是一个可视化工具，用于展示系统中各个安全风险在不同系统组件和严重级别上的分布情况。它帮助安全团队快速识别高风险区域，优先处理关键安全问题。

## 功能特点

- **多维度风险分析**: 按系统组件和严重级别对风险进行分类
- **可视化展示**: 使用颜色梯度直观展示风险密度
- **自动更新**: 支持定期自动更新，保持数据最新
- **多语言支持**: 支持中英文界面
- **多数据源**: 支持JSON和Markdown格式的漏洞数据

## 使用方法

### 生成热力图

```bash
# 生成默认风险热力图
npm run security:heatmap:v2

# 生成英文版热力图
node scripts/generate-risk-heatmap-v2.js -- --language=en

# 使用自定义配置
node scripts/generate-risk-heatmap-v2.js -- --config=custom-config.js
```

### 运行测试

```bash
# 运行热力图生成脚本测试
npm run security:heatmap:test

# 使用Jest运行测试
npm run security:heatmap:jest
```

## 输出文件

热力图生成后，将在以下位置创建输出文件：

- **SVG热力图**: `docs/security-risk-heatmap.svg`
- **更新后的追踪表**: `SECURITY_VULNERABILITY_TRACKING.md`（热力图部分会自动更新）

## 数据源

热力图支持以下数据源：

1. **主要数据源**: `data/security-vulnerabilities.json`
2. **备用数据源**: `SECURITY_VULNERABILITY_TRACKING.md`

### JSON数据格式示例

```json
{
  "vulnerabilities": [
    {
      "id": "VULN-001",
      "title": "JWT认证守卫实现过于简单",
      "ruleId": "jwt-format-validation",
      "cvss": 7.5,
      "severity": "高",
      "status": "待修复",
      "owner": "张三",
      "priority": "高",
      "businessImpact": "可能导致未授权访问",
      "firstFound": "2025-10-01",
      "targetDate": "2025-10-05"
    }
  ]
}
```

### Markdown数据格式示例

```markdown
## 漏洞追踪表

| 漏洞ID | 标题 | 规则ID | CVSS评分 | 状态 | 负责人 |
|--------|------|--------|---------|------|--------|
| VULN-001 | JWT认证守卫实现过于简单 | jwt-format-validation | 7.5 (高) | 待修复 | 张三 |
```

## 系统分类

热力图将漏洞自动分类到以下系统类别：

- **性能问题**: 索引、查询、性能、缓存、优化相关
- **支付系统**: 支付、交易、结算、账单相关
- **认证授权**: 认证、角色、JWT、授权、登录、权限、守卫相关
- **数据安全**: 密码、用户、数据、敏感、加密、解密相关
- **其他**: 不属于以上类别的漏洞

## 严重级别

漏洞按以下严重级别分类：

- **严重**: 可能导致系统完全妥协
- **高**: 可能导致重要数据泄露或系统功能受损
- **中**: 可能导致有限的数据泄露或功能影响
- **低**: 影响较小，风险较低

## 自定义配置

可以通过修改 `scripts/generate-risk-heatmap-v2.js` 中的 `DEFAULT_CONFIG` 来自定义热力图的外观和行为：

```javascript
const DEFAULT_CONFIG = {
  // 系统分类字典
  systemMapping: {
    '性能问题': {
      keywords: ['索引', '查询', '性能', '缓存', '优化'],
      priority: 1,
      color: '#43a047'
    },
    // ...其他系统分类
  },
  
  // 严重度颜色映射
  severityColors: {
    '严重': { bg: '#d32f2f', text: '#ffffff' },
    '高': { bg: '#f57c00', text: '#ffffff' },
    // ...其他严重度
  },
  
  // 热力图尺寸配置
  dimensions: {
    cellWidth: 120,
    cellHeight: 40,
    headerHeight: 30,
    headerWidth: 100,
    legendHeight: 50
  }
};
```

## CI/CD集成

热力图生成已集成到CI/CD流水线中，每次代码提交都会自动生成最新的风险热力图。生成的热力图会作为构建产物保存，可以在CI/CD平台中查看。

## 故障排除

### 常见问题

1. **热力图生成失败**
   - 检查数据源文件是否存在
   - 确认数据格式是否符合要求
   - 查看错误日志获取详细信息

2. **系统分类不准确**
   - 检查 `systemMapping` 配置中的关键词
   - 根据需要添加或修改关键词

3. **SVG文件未生成**
   - 确认 `docs` 目录是否存在且有写入权限
   - 检查文件路径是否正确

### 调试模式

可以使用调试模式获取更详细的日志信息：

```bash
DEBUG=heatmap:* npm run security:heatmap:v2
```

## 贡献指南

如果您想为热力图生成工具贡献代码：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 版本历史

- **v2.0.0**: 重构为模块化结构，支持多数据源，增强错误处理
- **v1.0.0**: 初始版本，基本热力图生成功能

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。