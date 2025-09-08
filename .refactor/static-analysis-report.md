# Step-2 静态分析报告

**生成时间**: 2025-09-08 18:55:23  
**项目路径**: D:\codes\onlinestore\caddy-style-shopping-site  
**分析范围**: JavaScript, HTML, CSS 文件（排除 node_modules）

## 安全问题统计

### JavaScript 安全问题
- **发现数量**: 62个
- **主要问题**: eval(), innerHTML, document.write 使用
- **详细报告**: .refactor\js-security-issues.txt

### HTML 安全问题
- **发现数量**: 16个
- **主要问题**: 内联事件处理器, javascript: 协议
- **详细报告**: .refactor\html-security-issues.txt

### CSS 安全问题
- **发现数量**: 0个
- **状态**: 通过安全检查
- **详细报告**: .refactor\css-security-issues.txt

## 总体评估

- **总安全问题**: 78个
- **风险等级**: 中等（主要为前端XSS风险）
- **建议**: 重点关注JavaScript中的动态代码执行和HTML中的内联事件

## AI生成代码分析

- **AI代码块数量**: 127个
- **安全问题占比**: 约61% (78/127)
- **建议**: 对AI生成代码进行专项安全审查

## 下一步行动

1. 进入 Step-3 动态分析阶段
2. 重点测试发现的安全问题
3. 生成修复建议和补丁

---
*报告生成工具: PowerShell 静态分析脚本*
