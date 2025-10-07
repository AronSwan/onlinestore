# 后端文档系统与 Paperless-NGX 集成完成

## 🎉 集成概述

已成功将后端文档系统与 Paperless-NGX 文档管理系统进行完整集成，实现了统一的文档监管和管理。

## 📦 已创建的核心文件

### 1. 集成脚本
- `backend/scripts/docs-paperless-integration.js` - 文档集成主脚本
- `backend/scripts/docs-sync-daemon.js` - 文档同步守护进程
- `backend/scripts/docs-system-controller.js` - 系统主控制器

### 2. 配置文件
- `backend/config/docs-integration.json` - 集成系统配置
- `backend/paperless-ngx/docker-compose.yml` - Paperless-NGX 容器配置
- `backend/paperless-ngx/docker-compose.env` - 环境变量配置

### 3. 文档指南
- `backend/docs/PAPERLESS_INTEGRATION_GUIDE.md` - 详细集成指南
- `backend/docs/OPERATIONS_GUIDE.md` - 更新的运维指南

### 4. 部署脚本
- `backend/scripts/deploy-paperless-local.ps1` - 本地部署脚本
- `backend/scripts/paperless-setup-local.ps1` - 安装配置脚本

## 🚀 快速开始

### 第一步：安装依赖
```bash
cd backend
npm install
npm run docs:install
```

### 第二步：初始化系统
```bash
npm run docs:system:init
```

这个命令会：
- 部署 Paperless-NGX（如果未部署）
- 启动 Paperless-NGX 服务
- 扫描现有文档
- 导入文档到 Paperless-NGX
- 创建系统状态文件

### 第三步：启动文档系统
```bash
npm run docs:system:start
```

### 第四步：访问 Paperless-NGX
- **URL**: http://localhost:8000
- **用户名**: admin
- **密码**: admin123

## 🔧 主要功能

### 1. 自动文档监控
- 实时监控后端文档目录变化
- 自动导入新增或修改的文档
- 支持多种文档格式（.md, .pdf, .doc, .docx, .txt, .html, .json）

### 2. 智能分类和标签
- 根据文件路径自动分类文档
- 自动生成格式、分类、路径等标签
- 支持自定义分类规则和标签

### 3. 同步守护进程
- 后台持续运行的同步服务
- 定期健康检查和状态监控
- 错误处理和自动恢复

### 4. 统一系统控制
- 一键初始化、启动、停止系统
- 实时状态监控和健康检查
- 详细的系统报告生成

## 📊 可用的 npm 脚本

### 系统控制
```bash
npm run docs:system:init      # 初始化系统
npm run docs:system:start     # 启动系统
npm run docs:system:stop      # 停止系统
npm run docs:system:restart   # 重启系统
npm run docs:system:status    # 查看状态
npm run docs:system:health    # 健康检查
npm run docs:system:report    # 生成报告
```

### 文档集成
```bash
npm run docs:integration:scan   # 扫描文档
npm run docs:integration:import # 导入文档
npm run docs:integration:watch  # 实时监控
npm run docs:integration:status # 检查状态
```

### 同步守护进程
```bash
npm run docs:sync:start   # 启动守护进程
npm run docs:sync:stop    # 停止守护进程
npm run docs:sync:status  # 查看状态
```

### Paperless-NGX 服务
```bash
npm run paperless:start         # 启动服务
npm run paperless:stop-local    # 停止服务
npm run paperless:restart-local # 重启服务
npm run paperless:status-local  # 查看状态
npm run paperless:logs-local    # 查看日志
```

## 📁 目录结构

```
backend/
├── config/
│   └── docs-integration.json          # 集成配置
├── docs/
│   ├── PAPERLESS_INTEGRATION_GUIDE.md # 集成指南
│   └── OPERATIONS_GUIDE.md            # 运维指南
├── scripts/
│   ├── docs-paperless-integration.js  # 集成脚本
│   ├── docs-sync-daemon.js           # 守护进程
│   ├── docs-system-controller.js     # 主控制器
│   ├── install-dependencies.js       # 依赖安装
│   ├── deploy-paperless-local.ps1    # 部署脚本
│   └── paperless-setup-local.ps1     # 配置脚本
├── paperless-ngx/
│   ├── consume/                       # 文档导入目录
│   ├── export/                        # 文档导出目录
│   ├── docker-compose.yml            # Docker 配置
│   └── docker-compose.env            # 环境配置
└── logs/
    ├── docs-integration.log           # 集成日志
    ├── docs-sync-daemon.log          # 守护进程日志
    └── docs-system.log               # 系统日志
```

## 🔍 监控的文档类型

系统会自动监控以下类型的文档：
- Markdown 文件 (`.md`)
- PDF 文件 (`.pdf`)
- Word 文档 (`.doc`, `.docx`)
- 文本文件 (`.txt`)
- RTF 文件 (`.rtf`)
- OpenDocument 文件 (`.odt`)
- HTML 文件 (`.html`)
- JSON 文件 (`.json`)

## 🏷️ 自动分类规则

文档会根据路径自动分类：
- **documentation**: `docs/`, `documentation/` 目录
- **api-docs**: `api/`, `swagger/`, `openapi/` 目录
- **guides**: `guides/`, `tutorial/`, `howto/` 目录
- **templates**: `templates/`, `template/` 目录
- **specifications**: `specs/`, `specification/`, `requirements/` 目录
- **readme**: `README` 文件
- **configuration**: `config/`, `configuration/`, `settings/` 目录
- **scripts**: `scripts/`, `automation/` 目录

## 🛠️ 故障排除

### 常见问题

#### 1. Paperless-NGX 无法启动
```bash
# 检查 Docker 状态
docker --version
docker-compose --version

# 查看容器日志
cd backend/paperless-ngx
docker-compose logs
```

#### 2. 文档导入失败
```bash
# 检查目录权限
ls -la backend/paperless-ngx/consume/

# 查看集成日志
tail -f backend/logs/docs-integration.log
```

#### 3. 守护进程无法启动
```bash
# 检查进程状态
npm run docs:sync:status

# 查看日志
tail -f backend/logs/docs-sync-daemon.log
```

### 重置系统
```bash
# 停止所有服务
npm run docs:system:stop
npm run paperless:stop-local

# 重新初始化
npm run docs:system:init
```

## 📈 系统优势

1. **统一管理**: 所有后端文档通过 Paperless-NGX 统一管理
2. **自动化**: 文档变更自动同步，无需手动操作
3. **智能分类**: 基于路径和内容的智能分类系统
4. **全文搜索**: 支持 OCR 和全文搜索功能
5. **版本控制**: 文档版本历史和变更追踪
6. **权限管理**: 细粒度的文档访问权限控制

## 🔗 相关链接

- [Paperless-NGX 官方文档](https://github.com/paperless-ngx/paperless-ngx)
- [详细集成指南](./docs/PAPERLESS_INTEGRATION_GUIDE.md)
- [运维操作指南](./docs/OPERATIONS_GUIDE.md)

## ✅ 验证集成

运行以下命令验证集成是否成功：

```bash
# 1. 检查系统状态
npm run docs:system:status

# 2. 执行健康检查
npm run docs:system:health

# 3. 生成系统报告
npm run docs:system:report

# 4. 访问 Web 界面
# 打开浏览器访问 http://localhost:8000
```

---

**恭喜！** 后端文档系统与 Paperless-NGX 的集成已完成。现在您可以通过统一的界面管理所有后端文档，享受自动化的文档监管服务。