# 📋 Paperless-NGX 后端部署指南

## 🎯 项目概述

本指南将帮助您在后端环境中部署 [Paperless-NGX](https://github.com/paperless-ngx/paperless-ngx) 项目，这是一个功能强大的文档管理系统，我们将其作为文档系统的参考实现和学习案例。

## 📋 前置要求

### 系统要求
- **操作系统**：Windows 11 Pro（当前环境）
- **Python**：3.9+ 
- **Node.js**：18+ 
- **Docker**：推荐使用 Docker 部署
- **内存**：至少 4GB RAM
- **存储**：至少 10GB 可用空间

### 依赖服务
- **数据库**：PostgreSQL 13+ 或 SQLite（开发环境）
- **消息队列**：Redis 6+
- **搜索引擎**：Apache Tika（可选）
- **Web 服务器**：Nginx（生产环境）

## 🚀 快速部署方案

### 方案一：Docker Compose 部署（推荐）

#### 1. 创建部署目录
```powershell
# 在后端项目中创建 paperless-ngx 目录
mkdir backend\paperless-ngx
cd backend\paperless-ngx
```

#### 2. 下载 Docker Compose 配置
```powershell
# 下载官方 docker-compose 文件
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/paperless-ngx/paperless-ngx/main/docker/compose/docker-compose.postgres.yml" -OutFile "docker-compose.yml"

# 下载环境变量模板
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/paperless-ngx/paperless-ngx/main/docker/compose/docker-compose.env" -OutFile ".env"
```

#### 3. 配置环境变量
```bash
# .env 文件配置
PAPERLESS_REDIS=redis://broker:6379
PAPERLESS_DBHOST=db
PAPERLESS_DBNAME=paperless
PAPERLESS_DBUSER=paperless
PAPERLESS_DBPASS=paperless
PAPERLESS_DBPORT=5432

# 管理员账户配置
PAPERLESS_ADMIN_USER=admin
PAPERLESS_ADMIN_PASSWORD=admin123
PAPERLESS_ADMIN_MAIL=admin@caddy-shopping.com

# 应用配置
PAPERLESS_URL=http://localhost:8010
PAPERLESS_SECRET_KEY=your-secret-key-here
PAPERLESS_TIME_ZONE=Asia/Shanghai
PAPERLESS_OCR_LANGUAGE=chi_sim+eng

# 存储配置
PAPERLESS_CONSUMPTION_DIR=/usr/src/paperless/consume
PAPERLESS_DATA_DIR=/usr/src/paperless/data
PAPERLESS_MEDIA_ROOT=/usr/src/paperless/media

# 安全配置
PAPERLESS_ALLOWED_HOSTS=localhost,127.0.0.1,caddy-shopping-backend
PAPERLESS_CORS_ALLOWED_HOSTS=http://localhost:3000,http://localhost:8080

# 功能配置
PAPERLESS_CONSUMER_POLLING=30
PAPERLESS_CONSUMER_DELETE_DUPLICATES=true
PAPERLESS_CONSUMER_RECURSIVE=true
PAPERLESS_CONSUMER_SUBDIRS_AS_TAGS=true
```

#### 4. 启动服务
```powershell
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f webserver
```

#### 5. 初始化设置
```powershell
# 创建管理员用户（如果环境变量未生效）
docker-compose exec webserver python3 manage.py createsuperuser

# 收集静态文件
docker-compose exec webserver python3 manage.py collectstatic --noinput

# 运行数据库迁移
docker-compose exec webserver python3 manage.py migrate
```

### 方案二：本地开发部署

#### 1. 克隆项目
```powershell
# 在后端目录中克隆项目
cd backend
git clone https://github.com/paperless-ngx/paperless-ngx.git
cd paperless-ngx
```

#### 2. 创建 Python 虚拟环境
```powershell
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
.\venv\Scripts\Activate.ps1

# 升级 pip
python -m pip install --upgrade pip
```

#### 3. 安装依赖
```powershell
# 安装 Python 依赖
pip install -r requirements.txt

# 安装开发依赖（可选）
pip install -r requirements-dev.txt
```

#### 4. 配置数据库
```powershell
# 使用 SQLite（开发环境）
$env:PAPERLESS_DBENGINE = "sqlite"
$env:PAPERLESS_DBNAME = "paperless.sqlite3"

# 或使用 PostgreSQL
$env:PAPERLESS_DBENGINE = "postgresql"
$env:PAPERLESS_DBHOST = "localhost"
$env:PAPERLESS_DBNAME = "paperless"
$env:PAPERLESS_DBUSER = "paperless"
$env:PAPERLESS_DBPASS = "paperless"
```

#### 5. 运行迁移和启动服务
```powershell
# 运行数据库迁移
python manage.py migrate

# 创建管理员用户
python manage.py createsuperuser

# 收集静态文件
python manage.py collectstatic

# 启动开发服务器
python manage.py runserver 0.0.0.0:8010
```

## 🔧 集成配置

### 与现有后端项目集成

#### 1. 反向代理配置
```nginx
# nginx 配置示例
server {
    listen 80;
    server_name docs.caddy-shopping.com;

    location /paperless/ {
        proxy_pass http://localhost:8010/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:3000/api/;
        # 现有 API 配置
    }
}
```

#### 2. 环境变量集成
```javascript
// backend/config/paperless.js
module.exports = {
  paperless: {
    url: process.env.PAPERLESS_URL || 'http://localhost:8010',
    apiToken: process.env.PAPERLESS_API_TOKEN,
    webhookSecret: process.env.PAPERLESS_WEBHOOK_SECRET,
    integrationEnabled: process.env.PAPERLESS_INTEGRATION === 'true'
  }
};
```

#### 3. API 集成示例
```javascript
// backend/services/paperlessService.js
const axios = require('axios');

class PaperlessService {
  constructor() {
    this.baseURL = process.env.PAPERLESS_URL;
    this.apiToken = process.env.PAPERLESS_API_TOKEN;
    this.client = axios.create({
      baseURL: `${this.baseURL}/api`,
      headers: {
        'Authorization': `Token ${this.apiToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // 获取文档列表
  async getDocuments(params = {}) {
    try {
      const response = await this.client.get('/documents/', { params });
      return response.data;
    } catch (error) {
      console.error('获取文档失败:', error.message);
      throw error;
    }
  }

  // 上传文档
  async uploadDocument(file, metadata = {}) {
    try {
      const formData = new FormData();
      formData.append('document', file);
      
      Object.keys(metadata).forEach(key => {
        formData.append(key, metadata[key]);
      });

      const response = await this.client.post('/documents/post_document/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('上传文档失败:', error.message);
      throw error;
    }
  }

  // 搜索文档
  async searchDocuments(query) {
    try {
      const response = await this.client.get('/documents/', {
        params: { query }
      });
      return response.data;
    } catch (error) {
      console.error('搜索文档失败:', error.message);
      throw error;
    }
  }
}

module.exports = new PaperlessService();
```

## 📊 监控和维护

### 健康检查
```powershell
# 检查服务状态
docker-compose exec webserver python3 manage.py check

# 检查数据库连接
docker-compose exec webserver python3 manage.py dbshell

# 查看系统信息
docker-compose exec webserver python3 manage.py showmigrations
```

### 备份策略
```powershell
# 数据库备份
docker-compose exec db pg_dump -U paperless paperless > backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql

# 媒体文件备份
docker-compose exec webserver tar -czf /tmp/media_backup_$(date +%Y%m%d_%H%M%S).tar.gz /usr/src/paperless/media

# 完整备份脚本
docker-compose exec webserver python3 manage.py document_exporter /tmp/export/
```

### 性能优化
```yaml
# docker-compose.yml 性能优化
services:
  webserver:
    environment:
      - PAPERLESS_TASK_WORKERS=4
      - PAPERLESS_THREADS_PER_WORKER=2
      - PAPERLESS_WORKER_TIMEOUT=3600
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

## 🚀 部署脚本自动化

### 一键部署脚本
```powershell
# deploy-paperless.ps1
param(
    [string]$Environment = "development",
    [string]$Domain = "localhost",
    [int]$Port = 8010
)

Write-Host "🚀 开始部署 Paperless-NGX..." -ForegroundColor Green

# 创建部署目录
$deployDir = "backend\paperless-ngx"
if (!(Test-Path $deployDir)) {
    New-Item -ItemType Directory -Path $deployDir -Force
    Write-Host "✅ 创建部署目录: $deployDir" -ForegroundColor Green
}

Set-Location $deployDir

# 下载配置文件
Write-Host "📥 下载配置文件..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/paperless-ngx/paperless-ngx/main/docker/compose/docker-compose.postgres.yml" -OutFile "docker-compose.yml"
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/paperless-ngx/paperless-ngx/main/docker/compose/docker-compose.env" -OutFile ".env"
    Write-Host "✅ 配置文件下载完成" -ForegroundColor Green
} catch {
    Write-Host "❌ 下载配置文件失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 生成随机密钥
$secretKey = -join ((1..50) | ForEach {Get-Random -Input ([char[]]([char]'a'..[char]'z') + [char[]]([char]'A'..[char]'Z') + [char[]]([char]'0'..[char]'9'))})

# 更新环境变量
$envContent = @"
PAPERLESS_REDIS=redis://broker:6379
PAPERLESS_DBHOST=db
PAPERLESS_DBNAME=paperless
PAPERLESS_DBUSER=paperless
PAPERLESS_DBPASS=paperless_$(Get-Random -Minimum 1000 -Maximum 9999)
PAPERLESS_DBPORT=5432

PAPERLESS_ADMIN_USER=admin
PAPERLESS_ADMIN_PASSWORD=admin_$(Get-Random -Minimum 1000 -Maximum 9999)
PAPERLESS_ADMIN_MAIL=admin@caddy-shopping.com

PAPERLESS_URL=http://${Domain}:${Port}
PAPERLESS_SECRET_KEY=$secretKey
PAPERLESS_TIME_ZONE=Asia/Shanghai
PAPERLESS_OCR_LANGUAGE=chi_sim+eng

PAPERLESS_ALLOWED_HOSTS=$Domain,127.0.0.1,localhost
PAPERLESS_CORS_ALLOWED_HOSTS=http://localhost:3000,http://localhost:8080

PAPERLESS_CONSUMER_POLLING=30
PAPERLESS_CONSUMER_DELETE_DUPLICATES=true
PAPERLESS_CONSUMER_RECURSIVE=true
PAPERLESS_CONSUMER_SUBDIRS_AS_TAGS=true
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8
Write-Host "✅ 环境变量配置完成" -ForegroundColor Green

# 启动服务
Write-Host "🚀 启动 Paperless-NGX 服务..." -ForegroundColor Yellow
try {
    docker-compose up -d
    Write-Host "✅ 服务启动成功" -ForegroundColor Green
    
    # 等待服务就绪
    Write-Host "⏳ 等待服务就绪..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    # 检查服务状态
    $status = docker-compose ps --services --filter "status=running"
    if ($status) {
        Write-Host "✅ 所有服务运行正常" -ForegroundColor Green
        Write-Host "📱 访问地址: http://${Domain}:${Port}" -ForegroundColor Cyan
        Write-Host "👤 管理员账户信息已保存在 .env 文件中" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️ 部分服务可能未正常启动，请检查日志" -ForegroundColor Yellow
        docker-compose logs
    }
} catch {
    Write-Host "❌ 服务启动失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Paperless-NGX 部署完成！" -ForegroundColor Green
```

### package.json 集成
```json
{
  "scripts": {
    "paperless:deploy": "powershell -ExecutionPolicy Bypass -File scripts/deploy-paperless.ps1",
    "paperless:start": "cd backend/paperless-ngx && docker-compose up -d",
    "paperless:stop": "cd backend/paperless-ngx && docker-compose down",
    "paperless:logs": "cd backend/paperless-ngx && docker-compose logs -f",
    "paperless:backup": "cd backend/paperless-ngx && docker-compose exec webserver python3 manage.py document_exporter /tmp/export/",
    "paperless:health": "cd backend/paperless-ngx && docker-compose exec webserver python3 manage.py check"
  }
}
```

## 📋 验证部署

### 功能测试清单
- [ ] Web 界面可访问 (http://localhost:8010)
- [ ] 管理员登录正常
- [ ] 文档上传功能
- [ ] OCR 识别功能
- [ ] 搜索功能
- [ ] API 接口响应
- [ ] 数据库连接正常
- [ ] Redis 缓存工作
- [ ] 文件存储正常

### 性能测试
```powershell
# 测试 API 响应时间
Measure-Command { Invoke-RestMethod -Uri "http://localhost:8010/api/documents/" -Headers @{"Authorization"="Token your-token"} }

# 测试文件上传
$file = Get-Item "test-document.pdf"
$form = @{
    document = $file
    title = "Test Document"
}
Invoke-RestMethod -Uri "http://localhost:8010/api/documents/post_document/" -Method Post -Form $form -Headers @{"Authorization"="Token your-token"}
```

## 🔧 故障排除

### 常见问题

#### 1. 端口冲突
```powershell
# 检查端口占用
netstat -ano | findstr :8010

# 修改端口配置
# 在 docker-compose.yml 中修改端口映射
```

#### 2. 内存不足
```yaml
# 调整内存限制
services:
  webserver:
    deploy:
      resources:
        limits:
          memory: 2G
```

#### 3. 权限问题
```powershell
# 检查 Docker 权限
docker info

# 重启 Docker 服务
Restart-Service docker
```

## 📚 参考资源

### 官方文档
- [Paperless-NGX 官方文档](https://paperless-ngx.readthedocs.io/)
- [Docker 部署指南](https://paperless-ngx.readthedocs.io/en/latest/setup.html#docker)
- [API 文档](https://paperless-ngx.readthedocs.io/en/latest/api.html)

### 社区资源
- [GitHub 仓库](https://github.com/paperless-ngx/paperless-ngx)
- [Discord 社区](https://discord.gg/paperlessngx)
- [Reddit 社区](https://www.reddit.com/r/paperless_ngx/)

## 📞 技术支持

如需技术支持，请联系：
- **技术团队**：[tech-support@caddy-shopping.com](mailto:tech-support@caddy-shopping.com)
- **文档团队**：[docs@caddy-shopping.com](mailto:docs@caddy-shopping.com)
- **运维团队**：[devops@caddy-shopping.com](mailto:devops@caddy-shopping.com)

---

*创建日期：2025年10月5日*  
*基于：Paperless-NGX v2.x 官方部署指南*  
*环境：Windows 11 Pro + Docker Desktop*