# 代码审计环境检查报告
生成时间: 2025-09-08 19:12:08

## 基础工具检查
✅ node : v22.19.0
✅ npm : 10.9.3
✅ python : Python 3.13.7
✅ pip : pip 25.2 from D:\Programs\Python\Python313\Lib\site-packages\pip (python 3.13)

❌ git : MISSING


## 专业审计工具检查
⚠️ semgrep : NOT_INSTALLED
⚠️ bandit : NOT_INSTALLED
⚠️ eslint : NOT_INSTALLED
⚠️ codeql : NOT_INSTALLED
⚠️ syft : NOT_INSTALLED
⚠️ cosign : NOT_INSTALLED


## 环境信息
- PowerShell版本: 5.1.22621.5624
- 操作系统: 
- 工作目录: D:\codes\onlinestore\caddy-style-shopping-site
- 项目类型: JavaScript/TypeScript Web应用

## 审计策略
基于可用工具，将采用以下审计策略：
1. 使用内置工具进行基础代码分析
2. 利用npm audit进行依赖漏洞扫描
3. 使用自定义脚本进行代码质量检查
4. 生成SARIF格式报告（如工具支持）
