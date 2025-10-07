# Paperless-NGX 文档管理系统集成指南

## 概述

本指南介绍如何将后端文档系统与 Paperless-NGX 文档管理系统进行集成，实现统一的文档监管和管理。

## 系统架构

```
后端文档系统 ←→ Paperless-NGX 文档管理系统
     ↓                    ↓
文档监控守护进程 ←→ 自动化文档导入
     ↓                    ↓
实时同步服务 ←→ 文档分类和标签管理
```

## 快速开始

### 1. 初始化系统

```bash
# 初始化文档系统集成
npm run docs:system:init
```

这个命令会：
- 部署 Paperless-NGX（如果未部署）
- 启动 Paperless-NGX 服务
- 扫描现有文档
- 导入文档到 Paperless-NGX
- 创建系统状态文件

### 2. 启动文档系统

```bash
# 启动文档系统
npm run docs:system:start
```

### 3. 检查系统状态

```bash
# 查看系统状态
npm run docs:system:status

# 执行健康检查
npm run docs:system:health

# 生成详细报告
npm run docs:system:report
```

## 详细功能

### 文档集成功能

#### 扫描文档
```bash
# 扫描所有文档并生成报告
npm run docs:integration:scan
```

#### 导入文档
```bash
# 批量导入所有文档到 Paperless-NGX
npm run docs:integration:import
```

#### 实时监控
```bash
# 启动实时文档监控
npm run docs:integration:watch
```

#### 检查 Paperless-NGX 状态
```bash
# 检查 Paperless-NGX 服务状态
npm run docs:integration:status
```

### 同步守护进程

#### 启动守护进程
```bash
# 启动文档同步守护进程
npm run docs:sync:start
```

#### 停止守护进程
```bash
# 停止文档同步守护进程
npm run docs:sync:stop
```

#### 查看守护进程状态
```bash
# 查看守护进程状态
npm run docs:sync:status
```

### 系统控制

#### 完整系统管理
```bash
# 初始化系统
npm run docs:system:init

# 启动系统
npm run docs:system:start

# 停止系统
npm run docs:system:stop

# 重启系统
npm run docs:system:restart

# 查看状态
npm run docs:system:status

# 健康检查
npm run docs:system:health

# 生成报告
npm run docs:system:report
```

## 文档分类和标签

### 自动分类规则

系统会根据文件路径自动分类文档：

- **documentation**: `docs/`, `documentation/` 目录下的文件
- **api-docs**: `api/`, `swagger/`, `openapi/` 目录下的文件
- **guides**: `guides/`, `tutorial/`, `howto/` 目录下的文件
- **templates**: `templates/`, `template/` 目录下的文件
- **specifications**: `specs/`, `specification/`, `requirements/` 目录下的文件
- **readme**: `README` 文件
- **configuration**: `config/`, `configuration/`, `settings/` 目录下的文件
- **scripts**: `scripts/`, `automation/` 目录下的文件

### 自动标签生成

系统会为每个文档自动生成标签：

- **格式标签**: `format:md`, `format:pdf`, `format:doc` 等
- **分类标签**: `category:documentation`, `category:api-docs` 等
- **路径标签**: `path:docs`, `path:api` 等
- **内容标签**: `api`, `guide`, `specification`, `template`, `readme` 等

## 监控的文件类型

系统监控以下类型的文档文件：

- Markdown 文件 (`.md`)
- PDF 文件 (`.pdf`)
- Word 文档 (`.doc`, `.docx`)
- 文本文件 (`.txt`)
- RTF 文件 (`.rtf`)
- OpenDocument 文件 (`.odt`)
- HTML 文件 (`.html`)
- JSON 文件 (`.json`)

## 目录结构

```
backend/
├── config/
│   └── docs-integration.json          # 集成配置文件
├── docs/
│   ├── PAPERLESS_INTEGRATION_GUIDE.md # 本指南
│   └── ...                            # 其他文档
├── scripts/
│   ├── docs-paperless-integration.js  # 文档集成脚本
│   ├── docs-sync-daemon.js           # 同步守护进程
│   └── docs-system-controller.js     # 系统主控制器
├── paperless-ngx/
│   ├── consume/                       # 文档导入目录
│   ├── export/                        # 文档导出目录
│   └── docker-compose.yml            # Docker 配置
└── logs/
    ├── docs-integration.log           # 集成日志
    ├── docs-sync-daemon.log          # 守护进程日志
    └── docs-system.log               # 系统日志
```

## 配置说明

### 主配置文件 (`config/docs-integration.json`)

```json
{
  "integration": {
    "name": "Backend Documentation System Integration",
    "version": "1.0.0",
    "autoStart": false,
    "enableMonitoring": true
  },
  "monitoring": {
    "syncInterval": 300000,        // 同步间隔 (5分钟)
    "healthCheckInterval": 120000, // 健康检查间隔 (2分钟)
    "watchedExtensions": [".md", ".pdf", ".doc", ".docx", ".txt"],
    "excludePatterns": ["node_modules", ".git", "dist", "build"]
  },
  "paperless": {
    "url": "http://localhost:8000",
    "autoStartService": true,
    "timezone": "Asia/Shanghai",
    "ocrLanguage": "eng"
  }
}
```

## 访问 Paperless-NGX

### Web 界面

- **URL**: http://localhost:8000
- **默认用户名**: admin
- **默认密码**: admin123

### 主要功能

1. **文档浏览**: 查看所有导入的文档
2. **搜索功能**: 全文搜索和标签搜索
3. **分类管理**: 管理文档分类和标签
4. **OCR 识别**: 自动识别图片和 PDF 中的文字
5. **工作流**: 设置自动化文档处理规则

## 故障排除

### 常见问题

#### 1. Paperless-NGX 无法启动

```bash
# 检查 Docker 服务
docker --version
docker-compose --version

# 查看容器状态
cd backend/paperless-ngx
docker-compose ps

# 查看日志
docker-compose logs
```

#### 2. 文档导入失败

```bash
# 检查 consume 目录权限
ls -la backend/paperless-ngx/consume/

# 查看集成日志
tail -f backend/logs/docs-integration.log
```

#### 3. 守护进程无法启动

```bash
# 检查进程状态
npm run docs:sync:status

# 查看守护进程日志
tail -f backend/logs/docs-sync-daemon.log

# 手动停止并重启
npm run docs:system:stop
npm run docs:system:start
```

### 日志文件

- `backend/logs/docs-integration.log`: 文档集成操作日志
- `backend/logs/docs-sync-daemon.log`: 同步守护进程日志
- `backend/logs/docs-system.log`: 系统控制器日志
- `backend/paperless-ngx/`: Docker 容器日志

### 重置系统

如果需要完全重置系统：

```bash
# 停止所有服务
npm run docs:system:stop
npm run paperless:stop-local

# 清理数据（谨慎操作）
rm -rf backend/paperless-ngx/data/*
rm -rf backend/paperless-ngx/media/*
rm -rf backend/logs/*

# 重新初始化
npm run docs:system:init
```

## 最佳实践

### 1. 文档组织

- 使用清晰的目录结构
- 为文档添加有意义的文件名
- 使用标准的文档格式

### 2. 监控和维护

- 定期检查系统健康状态
- 监控日志文件大小
- 定期备份重要文档

### 3. 性能优化

- 避免监控大型二进制文件
- 合理设置同步间隔
- 定期清理旧日志文件

## 扩展功能

### 自定义分类规则

编辑 `config/docs-integration.json` 文件中的 `categorization.rules` 部分：

```json
{
  "categorization": {
    "rules": {
      "custom-category": ["custom-dir", "special-files"],
      "important-docs": ["critical", "important"]
    }
  }
}
```

### 自定义标签

编辑 `config/docs-integration.json` 文件中的 `tagging.customTags` 部分：

```json
{
  "tagging": {
    "customTags": {
      "project-alpha": "project-alpha-docs",
      "confidential": "confidential-document"
    }
  }
}
```

## 支持和帮助

如果遇到问题，请：

1. 查看相关日志文件
2. 检查系统状态和健康检查
3. 参考故障排除部分
4. 查看 Paperless-NGX 官方文档

---

**注意**: 本系统会自动监控和导入文档文件，请确保敏感文档的访问权限设置正确。