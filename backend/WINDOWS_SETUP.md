# Windows 环境设置指南

## 概述
本文档提供在 Windows 环境下运行 Reich 购物网站后端系统的详细指南。

## 环境要求

### 必需软件
- **Node.js 20.x+**: 从 [Node.js官网](https://nodejs.org/)下载安装
- **Redis**: 使用 [Redis for Windows](https://github.com/microsoftarchive/redis/releases) 或 Chocolatey 安装
- **MySQL 8.0+**: 使用 [MySQL Installer](https://dev.mysql.com/downloads/installer/) 安装
- **PowerShell 7+** (推荐): 比传统 CMD 更强大

### 可选工具
- **Git Bash**: 提供类 Linux 命令行体验
- **Windows Terminal**: 现代化的终端工具

## 快速设置

### 1. 使用 PowerShell (推荐)

```powershell
# 克隆项目
git clone <repository-url>
cd caddy-style-shopping-site/backend

# 安装依赖
npm install

# 复制环境配置文件
Copy-Item .env.example .env

# 编辑环境配置
notepad .env
```

### 2. 使用传统 CMD

```cmd
# 克隆项目
git clone <repository-url>
cd caddy-style-shopping-site/backend

# 安装依赖
npm install

# 复制环境配置文件
copy .env.example .env

# 编辑环境配置
notepad .env
```

## 端口占用检查

### PowerShell
```powershell
# 检查端口占用
netstat -ano | findstr :3000

# 终止占用进程 (替换 PID 为实际进程ID)
taskkill /PID 1234 /F
```

### CMD
```cmd
netstat -ano | findstr :3000
taskkill /PID 1234 /F
```

## 数据库设置

### 手动安装 MySQL
1. 下载并安装 MySQL Community Server
2. 启动 MySQL 服务
3. 创建数据库:
```sql
CREATE DATABASE caddy_shopping;
```

### 手动安装 Redis
1. 下载 Redis for Windows
2. 启动 Redis 服务
3. 或使用 Chocolatey 安装:
```powershell
choco install redis-64
```

## 常见问题解决

### Node.js 模块编译问题
```powershell
# 清理 npm 缓存
npm cache clean --force

# 删除 node_modules 重新安装
Remove-Item -Recurse -Force node_modules
npm install

# 如果遇到 node-gyp 问题，安装构建工具
npm install --global windows-build-tools
```

### 权限问题
```powershell
# 以管理员身份运行 PowerShell
# 设置执行策略
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 路径问题
Windows 使用反斜杠 `\` 作为路径分隔符，但在命令行中正斜杠 `/` 通常也能正常工作。

## 性能优化

### 增加 Node.js 内存限制
```powershell
# 在 package.json 的脚本中添加
"start:prod": "node --max-old-space-size=4096 dist/main.js"
```

### Windows 特定优化
```powershell
# 调整 TCP 参数以提高网络性能
netsh int tcp set global autotuninglevel=normal
netsh int tcp set global rss=enabled
```

## 开发工具配置

### VS Code 推荐扩展
- ESLint
- Prettier - Code formatter
- GitLens
- Thunder Client (API 测试)

### 调试配置
在 `.vscode/launch.json` 中添加:
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Debug Backend",
            "program": "${workspaceFolder}\\dist\\main.js",
            "preLaunchTask": "build",
            "outFiles": ["${workspaceFolder}\\dist\\**\\*.js"]
        }
    ]
}
```

## 部署注意事项

### 生产环境
- 使用 PM2 进行进程管理
- 配置正确的环境变量
- 确保防火墙规则允许必要端口



## 故障排除

### 服务无法启动
1. 检查端口是否被占用
2. 验证环境变量配置
3. 查看日志文件 `logs/` 目录

### 数据库连接失败
1. 确认数据库服务正在运行
2. 检查连接字符串格式
3. 验证防火墙设置

### 缓存问题
1. 确认 Redis 服务正常运行
2. 检查 Redis 连接配置
3. 验证缓存键命名规则

## 获取帮助

如果遇到问题，请:
1. 查看项目 README.md
2. 检查日志文件获取详细错误信息
3. 在 GitHub Issues 中提交问题

## 相关资源

- [Node.js Windows 安装指南](https://nodejs.org/en/download/)

- [PowerShell 文档](https://docs.microsoft.com/en-us/powershell/)

---
*最后更新: 2025-09-30*