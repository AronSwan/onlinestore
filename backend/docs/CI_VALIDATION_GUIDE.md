# 🔧 CI 文档校验配置指南

本文档提供了完整的 CI/CD 文档质量校验配置，包括 Markdown 格式检查、链接验证、拼写检查等自动化质量保证工具。

## 📋 目录

- [工具概览](#工具概览)
- [GitHub Actions 配置](#github-actions-配置)
- [Markdownlint 配置](#markdownlint-配置)
- [链接检查配置](#链接检查配置)
- [拼写检查配置](#拼写检查配置)
- [文档结构验证](#文档结构验证)
- [本地开发配置](#本地开发配置)
- [故障排除](#故障排除)

---

## 🛠️ 工具概览

### 核心校验工具

| 工具 | 用途 | 配置文件 | 运行频率 |
|------|------|----------|----------|
| **markdownlint** | Markdown 格式检查 | `.markdownlint.json` | 每次提交 |
| **markdown-link-check** | 链接有效性验证 | `.markdown-link-check.json` | 每日/每次提交 |
| **cspell** | 拼写检查 | `.cspell.json` | 每次提交 |
| **remark-lint** | Markdown 语法检查 | `.remarkrc.js` | 每次提交 |
| **alex** | 包容性语言检查 | `.alexrc` | 每周 |

### 质量指标

- **格式合规率**：> 95%
- **链接有效率**：> 98%
- **拼写准确率**：> 99%
- **文档覆盖率**：> 90%

---

## 🚀 GitHub Actions 配置

### 主工作流文件

创建 `.github/workflows/docs-validation.yml`：

```yaml
name: 📚 文档质量检查

on:
  push:
    branches: [ main, develop ]
    paths: 
      - 'backend/docs/**'
      - '.github/workflows/docs-validation.yml'
  pull_request:
    branches: [ main ]
    paths: 
      - 'backend/docs/**'
  schedule:
    # 每日凌晨2点运行完整检查
    - cron: '0 2 * * *'

jobs:
  markdown-lint:
    name: 🔍 Markdown 格式检查
    runs-on: ubuntu-latest
    steps:
      - name: 📥 检出代码
        uses: actions/checkout@v4

      - name: 🔧 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: 📦 安装依赖
        run: |
          npm install -g markdownlint-cli2
          npm install -g @markdownlint/cli2-formatter-pretty

      - name: 🔍 运行 Markdownlint
        run: |
          markdownlint-cli2 "backend/docs/**/*.md" \
            --config .markdownlint.json \
            --formatter pretty

  link-check:
    name: 🔗 链接有效性检查
    runs-on: ubuntu-latest
    steps:
      - name: 📥 检出代码
        uses: actions/checkout@v4

      - name: 🔧 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: 📦 安装 markdown-link-check
        run: npm install -g markdown-link-check

      - name: 🔗 检查链接
        run: |
          find backend/docs -name "*.md" -exec \
            markdown-link-check {} \
            --config .markdown-link-check.json \;

  spell-check:
    name: ✏️ 拼写检查
    runs-on: ubuntu-latest
    steps:
      - name: 📥 检出代码
        uses: actions/checkout@v4

      - name: 🔧 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: 📦 安装 cspell
        run: npm install -g cspell

      - name: ✏️ 运行拼写检查
        run: |
          cspell "backend/docs/**/*.md" \
            --config .cspell.json \
            --show-context

  structure-validation:
    name: 📋 文档结构验证
    runs-on: ubuntu-latest
    steps:
      - name: 📥 检出代码
        uses: actions/checkout@v4

      - name: 🔧 设置 Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: 📦 安装依赖
        run: |
          pip install pyyaml requests

      - name: 📋 验证文档结构
        run: |
          python .github/scripts/validate-docs-structure.py

  generate-report:
    name: 📊 生成质量报告
    runs-on: ubuntu-latest
    needs: [markdown-lint, link-check, spell-check, structure-validation]
    if: always()
    steps:
      - name: 📥 检出代码
        uses: actions/checkout@v4

      - name: 📊 生成质量报告
        run: |
          python .github/scripts/generate-quality-report.py

      - name: 📤 上传报告
        uses: actions/upload-artifact@v4
        with:
          name: docs-quality-report
          path: docs-quality-report.html
          retention-days: 30
```

---

## 📝 Markdownlint 配置

### 配置文件 `.markdownlint.json`

```json
{
  "default": true,
  "MD001": true,
  "MD003": {
    "style": "atx"
  },
  "MD004": {
    "style": "dash"
  },
  "MD007": {
    "indent": 2
  },
  "MD013": {
    "line_length": 120,
    "code_blocks": false,
    "tables": false
  },
  "MD024": {
    "allow_different_nesting": true
  },
  "MD025": {
    "front_matter_title": ""
  },
  "MD026": {
    "punctuation": ".,;:!?"
  },
  "MD029": {
    "style": "ordered"
  },
  "MD033": {
    "allowed_elements": [
      "details",
      "summary",
      "br",
      "sub",
      "sup",
      "kbd",
      "mark",
      "mcfile",
      "mcsymbol",
      "mcurl",
      "mcfolder",
      "mcreference"
    ]
  },
  "MD034": false,
  "MD036": false,
  "MD041": false,
  "MD046": {
    "style": "fenced"
  },
  "MD048": {
    "style": "backtick"
  }
}
```

### 自定义规则配置

创建 `.markdownlint-cli2.jsonc`：

```jsonc
{
  "config": {
    "extends": ".markdownlint.json"
  },
  "globs": [
    "backend/docs/**/*.md"
  ],
  "ignores": [
    "backend/docs/node_modules/**",
    "backend/docs/dist/**",
    "backend/docs/.git/**"
  ],
  "customRules": [
    "./scripts/markdownlint-rules/chinese-punctuation.js",
    "./scripts/markdownlint-rules/api-format.js"
  ]
}
```

---

## 🔗 链接检查配置

### 配置文件 `.markdown-link-check.json`

```json
{
  "ignorePatterns": [
    {
      "pattern": "^http://localhost"
    },
    {
      "pattern": "^https://localhost"
    },
    {
      "pattern": "^http://127.0.0.1"
    },
    {
      "pattern": "^https://example.com"
    }
  ],
  "replacementPatterns": [
    {
      "pattern": "^/",
      "replacement": "https://github.com/your-org/your-repo/blob/main/"
    }
  ],
  "httpHeaders": [
    {
      "urls": ["https://github.com"],
      "headers": {
        "User-Agent": "Mozilla/5.0 (compatible; docs-link-checker)"
      }
    }
  ],
  "timeout": "20s",
  "retryOn429": true,
  "retryCount": 3,
  "fallbackRetryDelay": "30s",
  "aliveStatusCodes": [200, 206, 301, 302, 303, 304, 307, 308]
}
```

### 高级链接检查脚本

创建 `.github/scripts/advanced-link-check.py`：

```python
#!/usr/bin/env python3
"""
高级链接检查脚本
支持内部链接验证、锚点检查、图片链接验证等
"""

import os
import re
import requests
import json
from pathlib import Path
from urllib.parse import urljoin, urlparse
import time

class AdvancedLinkChecker:
    def __init__(self, docs_dir="backend/docs"):
        self.docs_dir = Path(docs_dir)
        self.base_url = "https://github.com/your-org/your-repo/blob/main/"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (compatible; docs-link-checker)'
        })
        
    def extract_links(self, content):
        """提取 Markdown 文件中的所有链接"""
        # Markdown 链接格式: [text](url)
        md_links = re.findall(r'\[([^\]]*)\]\(([^)]+)\)', content)
        
        # HTML 链接格式: <a href="url">
        html_links = re.findall(r'<a[^>]+href=["\']([^"\']+)["\']', content)
        
        # 图片链接: ![alt](url)
        img_links = re.findall(r'!\[([^\]]*)\]\(([^)]+)\)', content)
        
        return {
            'markdown': md_links,
            'html': html_links,
            'images': img_links
        }
    
    def check_internal_link(self, link, current_file):
        """检查内部链接是否有效"""
        if link.startswith('#'):
            # 锚点链接，检查当前文件是否有对应标题
            return self.check_anchor(link[1:], current_file)
        
        if link.startswith('./') or link.startswith('../'):
            # 相对路径链接
            target_path = (current_file.parent / link).resolve()
            return target_path.exists()
        
        if not link.startswith('http'):
            # 绝对路径链接
            target_path = self.docs_dir / link.lstrip('/')
            return target_path.exists()
        
        return True
    
    def check_anchor(self, anchor, file_path):
        """检查锚点是否存在于文件中"""
        try:
            content = file_path.read_text(encoding='utf-8')
            # 查找标题
            headers = re.findall(r'^#+\s+(.+)$', content, re.MULTILINE)
            # 转换为锚点格式
            anchors = [self.title_to_anchor(h) for h in headers]
            return anchor in anchors
        except Exception:
            return False
    
    def title_to_anchor(self, title):
        """将标题转换为锚点格式"""
        # 移除特殊字符，转换为小写，空格替换为连字符
        anchor = re.sub(r'[^\w\s-]', '', title.lower())
        anchor = re.sub(r'[-\s]+', '-', anchor)
        return anchor.strip('-')
    
    def check_external_link(self, url):
        """检查外部链接是否有效"""
        try:
            response = self.session.head(url, timeout=10, allow_redirects=True)
            return response.status_code < 400
        except Exception:
            try:
                response = self.session.get(url, timeout=10, allow_redirects=True)
                return response.status_code < 400
            except Exception:
                return False
    
    def generate_report(self, results):
        """生成检查报告"""
        report = {
            'summary': {
                'total_files': len(results),
                'total_links': sum(len(r['links']) for r in results.values()),
                'broken_links': sum(len(r['broken']) for r in results.values()),
                'success_rate': 0
            },
            'details': results
        }
        
        total_links = report['summary']['total_links']
        broken_links = report['summary']['broken_links']
        
        if total_links > 0:
            report['summary']['success_rate'] = (
                (total_links - broken_links) / total_links * 100
            )
        
        return report

if __name__ == "__main__":
    checker = AdvancedLinkChecker()
    # 运行检查逻辑...
```

---

## ✏️ 拼写检查配置

### 配置文件 `.cspell.json`

```json
{
  "version": "0.2",
  "language": "en,zh-CN",
  "words": [
    "NestJS",
    "TypeScript",
    "TiDB",
    "Redis",
    "Redpanda",
    "Kubernetes",
    "Grafana",
    "Prometheus",
    "JWT",
    "OAuth",
    "API",
    "CRUD",
    "HTTP",
    "HTTPS",
    "JSON",
    "YAML",
    "Dockerfile",
    "nginx",
    "backend",
    "frontend",
    "middleware",
    "microservice",
    "monorepo",
    "DevOps",
    "CI/CD",
    "GitHub",
    "GitLab",
    "Webhook",
    "Elasticsearch",
    "Kibana",
    "Logstash",
    "Swagger",
    "OpenAPI",
    "GraphQL",
    "WebSocket",
    "gRPC",
    "Protobuf",
    "MongoDB",
    "PostgreSQL",
    "MySQL",
    "SQLite",
    "NoSQL",
    "RDBMS",
    "ORM",
    "TypeORM",
    "Prisma",
    "Sequelize"
  ],
  "ignorePaths": [
    "node_modules/**",
    "dist/**",
    "build/**",
    "*.log",
    "*.json",
    "*.lock",
    "*.min.js",
    "*.min.css"
  ],
  "overrides": [
    {
      "filename": "**/*.md",
      "words": [
        "markdownlint",
        "cspell",
        "remarkrc",
        "alexrc",
        "jsonc",
        "CHANGELOG",
        "TODO",
        "FIXME",
        "README"
      ]
    },
    {
      "filename": "**/API_*.md",
      "words": [
        "auth",
        "login",
        "logout",
        "signup",
        "signin",
        "userid",
        "username",
        "userinfo",
        "accesstoken",
        "refreshtoken",
        "tokentype",
        "expiresin"
      ]
    }
  ],
  "dictionaries": [
    "typescript",
    "node",
    "npm",
    "html",
    "css",
    "bash",
    "powershell"
  ]
}
```

---

## 📋 文档结构验证

### 验证脚本 `.github/scripts/validate-docs-structure.py`

```python
#!/usr/bin/env python3
"""
文档结构验证脚本
检查文档目录结构、必需文件、命名规范等
"""

import os
import yaml
import json
from pathlib import Path
import re

class DocsStructureValidator:
    def __init__(self, docs_dir="backend/docs"):
        self.docs_dir = Path(docs_dir)
        self.required_files = [
            "index.md",
            "API_DOCUMENTATION.md",
            "ARCHITECTURE_DOCUMENTATION.md",
            "DEPLOYMENT_GUIDE.md",
            "CHANGELOG.md"
        ]
        self.required_dirs = [
            "quality",
            "security",
            "monitoring",
            "templates",
            "standards"
        ]
        
    def validate_file_naming(self):
        """验证文件命名规范"""
        errors = []
        
        for md_file in self.docs_dir.rglob("*.md"):
            filename = md_file.name
            
            # 检查命名规范
            if not re.match(r'^[A-Z][A-Z0-9_]*\.md$|^[a-z][a-z0-9-]*\.md$', filename):
                errors.append(f"文件命名不规范: {md_file.relative_to(self.docs_dir)}")
            
            # 检查文件内容结构
            try:
                content = md_file.read_text(encoding='utf-8')
                if not content.strip():
                    errors.append(f"空文件: {md_file.relative_to(self.docs_dir)}")
                elif not content.startswith('#'):
                    errors.append(f"缺少主标题: {md_file.relative_to(self.docs_dir)}")
            except Exception as e:
                errors.append(f"读取文件失败 {md_file.relative_to(self.docs_dir)}: {e}")
        
        return errors
    
    def validate_required_files(self):
        """验证必需文件是否存在"""
        errors = []
        
        for required_file in self.required_files:
            file_path = self.docs_dir / required_file
            if not file_path.exists():
                errors.append(f"缺少必需文件: {required_file}")
        
        return errors
    
    def validate_directory_structure(self):
        """验证目录结构"""
        errors = []
        
        for required_dir in self.required_dirs:
            dir_path = self.docs_dir / required_dir
            if not dir_path.exists():
                errors.append(f"缺少必需目录: {required_dir}")
            elif not dir_path.is_dir():
                errors.append(f"路径不是目录: {required_dir}")
        
        return errors
    
    def validate_frontmatter(self):
        """验证文档前置元数据"""
        errors = []
        
        for md_file in self.docs_dir.rglob("*.md"):
            try:
                content = md_file.read_text(encoding='utf-8')
                
                # 检查是否有 YAML 前置元数据
                if content.startswith('---\n'):
                    end_pos = content.find('\n---\n', 4)
                    if end_pos > 0:
                        frontmatter = content[4:end_pos]
                        try:
                            yaml.safe_load(frontmatter)
                        except yaml.YAMLError as e:
                            errors.append(f"前置元数据格式错误 {md_file.relative_to(self.docs_dir)}: {e}")
            except Exception as e:
                errors.append(f"验证前置元数据失败 {md_file.relative_to(self.docs_dir)}: {e}")
        
        return errors
    
    def generate_report(self):
        """生成验证报告"""
        report = {
            'file_naming': self.validate_file_naming(),
            'required_files': self.validate_required_files(),
            'directory_structure': self.validate_directory_structure(),
            'frontmatter': self.validate_frontmatter()
        }
        
        total_errors = sum(len(errors) for errors in report.values())
        report['summary'] = {
            'total_errors': total_errors,
            'validation_passed': total_errors == 0
        }
        
        return report

if __name__ == "__main__":
    validator = DocsStructureValidator()
    report = validator.generate_report()
    
    print(json.dumps(report, indent=2, ensure_ascii=False))
    
    if not report['summary']['validation_passed']:
        exit(1)
```

---

## 💻 本地开发配置

### package.json 脚本

```json
{
  "name": "docs-validation",
  "version": "1.0.0",
  "scripts": {
    "docs:lint": "markdownlint-cli2 'backend/docs/**/*.md'",
    "docs:lint:fix": "markdownlint-cli2 'backend/docs/**/*.md' --fix",
    "docs:links": "markdown-link-check backend/docs/**/*.md",
    "docs:spell": "cspell 'backend/docs/**/*.md'",
    "docs:spell:fix": "cspell 'backend/docs/**/*.md' --wordsOnly --unique",
    "docs:validate": "npm run docs:lint && npm run docs:links && npm run docs:spell",
    "docs:serve": "docsify serve backend/docs",
    "docs:build": "docsify build backend/docs",
    "docs:preview": "python -m http.server 8080 -d backend/docs"
  },
  "devDependencies": {
    "markdownlint-cli2": "^0.10.0",
    "markdown-link-check": "^3.11.2",
    "cspell": "^8.0.0",
    "docsify-cli": "^4.4.4"
  }
}
```

### VS Code 配置

创建 `.vscode/settings.json`：

```json
{
  "markdownlint.config": {
    "extends": ".markdownlint.json"
  },
  "cSpell.words": [
    "NestJS",
    "TypeScript",
    "TiDB",
    "Redis",
    "Redpanda"
  ],
  "cSpell.enableFiletypes": [
    "markdown"
  ],
  "files.associations": {
    "*.md": "markdown"
  },
  "editor.rulers": [120],
  "editor.wordWrap": "wordWrapColumn",
  "editor.wordWrapColumn": 120
}
```

### Git Hooks 配置

创建 `.husky/pre-commit`：

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# 运行文档校验
npm run docs:validate

# 检查是否有未提交的修复
if [ -n "$(git diff --name-only)" ]; then
  echo "⚠️  发现自动修复的文件，请重新提交"
  exit 1
fi
```

---

## 🔧 故障排除

### 常见问题

#### 1. Markdownlint 规则冲突

**问题**：某些规则与项目需求冲突

**解决方案**：
```json
{
  "MD013": false,  // 禁用行长度限制
  "MD033": {       // 允许特定 HTML 标签
    "allowed_elements": ["details", "summary", "br"]
  }
}
```

#### 2. 链接检查超时

**问题**：外部链接检查经常超时

**解决方案**：
```json
{
  "timeout": "30s",
  "retryCount": 5,
  "retryOn429": true
}
```

#### 3. 拼写检查误报

**问题**：技术术语被标记为拼写错误

**解决方案**：
```json
{
  "words": [
    "NestJS",
    "TypeScript",
    "microservice"
  ]
}
```

### 性能优化

#### 1. 并行执行

```yaml
strategy:
  matrix:
    check: [lint, links, spell]
  max-parallel: 3
```

#### 2. 缓存优化

```yaml
- name: 缓存 Node.js 依赖
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

#### 3. 增量检查

```bash
# 只检查变更的文件
git diff --name-only --diff-filter=AM HEAD~1 HEAD | grep '\.md$' | xargs markdownlint
```

---

## 📊 质量报告

### 自动生成报告

创建 `.github/scripts/generate-quality-report.py`：

```python
#!/usr/bin/env python3
"""
生成文档质量报告
"""

import json
import datetime
from pathlib import Path

def generate_html_report(data):
    """生成 HTML 格式的质量报告"""
    html_template = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>文档质量报告</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
            .metric { display: inline-block; margin: 10px; padding: 15px; 
                     background: white; border: 1px solid #ddd; border-radius: 5px; }
            .success { color: green; }
            .warning { color: orange; }
            .error { color: red; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📚 文档质量报告</h1>
            <p>生成时间: {timestamp}</p>
        </div>
        
        <div class="metrics">
            <div class="metric">
                <h3>格式检查</h3>
                <p class="{lint_class}">通过率: {lint_rate}%</p>
            </div>
            <div class="metric">
                <h3>链接检查</h3>
                <p class="{link_class}">有效率: {link_rate}%</p>
            </div>
            <div class="metric">
                <h3>拼写检查</h3>
                <p class="{spell_class}">准确率: {spell_rate}%</p>
            </div>
        </div>
        
        <h2>详细结果</h2>
        <table>
            <tr>
                <th>检查项</th>
                <th>状态</th>
                <th>详情</th>
            </tr>
            {detail_rows}
        </table>
    </body>
    </html>
    """
    
    # 填充模板数据
    return html_template.format(
        timestamp=datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        **data
    )

if __name__ == "__main__":
    # 生成报告逻辑...
    pass
```

---

## 🔗 相关链接

- [Markdownlint 规则文档](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)
- [Markdown Link Check 配置](https://github.com/tcort/markdown-link-check)
- [CSpell 配置指南](https://cspell.org/configuration/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)

---

**最后更新**：2025-01-26  
**配置版本**：v1.0.0  
**维护团队**：DevOps 团队