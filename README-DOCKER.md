# Docker 部署指南

本项目提供完整的 Docker 化解决方案，支持开发和生产环境的容器化部署。

## 🏗️ 架构概览

### 服务组件

- **前端服务** (Nginx + 静态文件)
- **后端服务** (Node.js + NestJS)
- **数据库** (PostgreSQL 15)
- **缓存** (Redis 7)
- **邮箱验证** (AfterShip email-verifier)
- **搜索引擎** (Elasticsearch 8)
- **监控系统** (Prometheus + Grafana)
- **负载均衡** (Nginx)

### 网络架构

```
Internet
    ↓
Nginx 负载均衡器 (80/443)
    ↓
前端服务 (80) ← → 后端服务 (3000)
    ↓                    ↓
静态文件              API 服务
                        ↓
            ┌─────────────────────┐
            ↓         ↓           ↓
        PostgreSQL  Redis  Email-Verifier
         (5432)    (6379)     (8080)
```

## 🚀 快速开始

### 1. 环境准备

```bash
# 安装 Docker 和 Docker Compose
# Windows: 下载 Docker Desktop
# macOS: brew install docker docker-compose
# Linux: 参考官方文档

# 验证安装
docker --version
docker-compose --version
```

### 2. 项目配置

```bash
# 复制环境配置文件
cp .env.docker .env

# 编辑配置文件
nano .env
```

### 3. 一键部署

```bash
# 给脚本执行权限
chmod +x scripts/docker-deploy.sh

# 启动生产环境
./scripts/docker-deploy.sh prod

# 或启动开发环境
./scripts/docker-deploy.sh dev
```

## 📋 部署命令

### 基础命令

```bash
# 生产环境部署
./scripts/docker-deploy.sh prod

# 开发环境部署
./scripts/docker-deploy.sh dev

# 启动监控服务
./scripts/docker-deploy.sh monitoring

# 停止所有服务
./scripts/docker-deploy.sh stop

# 重启服务
./scripts/docker-deploy.sh restart

# 查看日志
./scripts/docker-deploy.sh logs [service_name]

# 健康检查
./scripts/docker-deploy.sh health
```

### 数据管理

```bash
# 备份数据
./scripts/docker-deploy.sh backup

# 恢复数据
./scripts/docker-deploy.sh restore /path/to/backup

# 清理资源
./scripts/docker-deploy.sh clean --force
```

## 🔧 配置说明

### 环境变量 (.env)

```env
# 数据库配置
POSTGRES_DB=shopping_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password

# Redis 配置
REDIS_PASSWORD=your_redis_password

# 应用配置
JWT_SECRET=your_jwt_secret
NODE_ENV=production

# 邮箱验证配置
EMAIL_VERIFIER_API_URL=http://email-verifier:8080
ENABLE_SMTP_CHECK=false

# 监控配置
GRAFANA_PASSWORD=admin123
```

### Docker Compose 配置

#### 生产环境 (docker-compose.yml)

- 完整的生产级配置
- 包含健康检查和重启策略
- 资源限制和安全配置
- 数据持久化

#### 开发环境 (docker-compose.dev.yml)

- 热重载支持
- 调试端口开放
- 开发工具集成
- 数据库管理界面

## 🌐 服务访问

### 生产环境

| 服务 | 地址 | 说明 |
|------|------|------|
| 网站首页 | http://localhost | 主要网站 |
| API 接口 | http://localhost/api | 后端 API |
| 负载均衡器 | http://localhost:8000 | Nginx LB |

### 开发环境

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端开发 | http://localhost:3001 | 热重载前端 |
| 后端开发 | http://localhost:3000 | 热重载后端 |
| 数据库管理 | http://localhost:5050 | PgAdmin |
| Redis 管理 | http://localhost:8082 | Redis Commander |

### 监控服务

| 服务 | 地址 | 用户名/密码 |
|------|------|-------------|
| Grafana | http://localhost:3001 | admin/admin123 |
| Prometheus | http://localhost:9090 | - |
| Kibana | http://localhost:5601 | - |

## 📊 监控和日志

### 日志查看

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend

# 查看最近 100 行日志
docker-compose logs --tail=100 frontend
```

### 监控指标

- **应用性能**: 响应时间、吞吐量、错误率
- **系统资源**: CPU、内存、磁盘、网络
- **数据库**: 连接数、查询性能、锁等待
- **缓存**: 命中率、内存使用、键空间

### Grafana 仪表板

预配置的监控面板：

1. **应用概览**: 整体系统状态
2. **后端性能**: API 响应时间和错误率
3. **数据库监控**: PostgreSQL 性能指标
4. **Redis 监控**: 缓存性能和内存使用
5. **系统资源**: 容器资源使用情况

## 🔒 安全配置

### 网络安全

- 容器间通信使用内部网络
- 仅必要端口对外开放
- Nginx 反向代理和限流
- SSL/TLS 支持 (需配置证书)

### 数据安全

- 数据库密码加密存储
- Redis 密码保护
- JWT 令牌安全配置
- 敏感信息环境变量化

### 容器安全

- 非 root 用户运行
- 最小权限原则
- 镜像安全扫描
- 定期更新基础镜像

## 🚀 生产部署

### 1. 服务器准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. SSL 证书配置

```bash
# 使用 Let's Encrypt (推荐)
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com

# 复制证书到项目
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/key.pem
```

### 3. 域名配置

更新 `docker/nginx/nginx-lb.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # 其他配置...
}
```

### 4. 生产部署

```bash
# 克隆项目
git clone <your-repo-url>
cd caddy-style-shopping-site

# 配置环境变量
cp .env.docker .env
nano .env  # 修改生产配置

# 部署服务
./scripts/docker-deploy.sh prod

# 启动监控
./scripts/docker-deploy.sh monitoring
```

## 🔧 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   netstat -tulpn | grep :80
   
   # 修改端口映射
   nano docker-compose.yml
   ```

2. **内存不足**
   ```bash
   # 检查内存使用
   docker stats
   
   # 调整资源限制
   nano docker-compose.yml
   ```

3. **数据库连接失败**
   ```bash
   # 检查数据库状态
   docker-compose logs postgres
   
   # 重启数据库
   docker-compose restart postgres
   ```

4. **镜像构建失败**
   ```bash
   # 清理构建缓存
   docker builder prune -f
   
   # 重新构建
   docker-compose build --no-cache
   ```

### 调试技巧

```bash
# 进入容器调试
docker-compose exec backend sh

# 查看容器详细信息
docker inspect shopping-backend

# 查看网络配置
docker network ls
docker network inspect shopping-network

# 查看卷挂载
docker volume ls
docker volume inspect shopping_postgres_data
```

## 📈 性能优化

### 1. 镜像优化

- 使用多阶段构建
- 最小化镜像层数
- 使用 Alpine 基础镜像
- 清理不必要文件

### 2. 资源配置

```yaml
# 在 docker-compose.yml 中配置资源限制
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
    reservations:
      memory: 256M
      cpus: '0.25'
```

### 3. 缓存策略

- Redis 缓存配置优化
- Nginx 静态文件缓存
- 数据库查询缓存
- CDN 集成

### 4. 数据库优化

- 连接池配置
- 索引优化
- 查询性能调优
- 定期维护任务

## 🔄 更新和维护

### 应用更新

```bash
# 拉取最新代码
git pull origin main

# 重新构建和部署
docker-compose build
docker-compose up -d

# 滚动更新 (零停机)
docker-compose up -d --no-deps backend
```

### 数据库迁移

```bash
# 备份数据
./scripts/docker-deploy.sh backup

# 执行迁移
docker-compose exec backend npm run migration:run

# 验证迁移
docker-compose exec backend npm run migration:show
```

### 定期维护

```bash
# 清理未使用的镜像
docker image prune -f

# 清理未使用的卷
docker volume prune -f

# 更新基础镜像
docker-compose pull
docker-compose up -d
```

## 📚 扩展功能

### 水平扩展

```yaml
# 扩展后端服务实例
services:
  backend:
    deploy:
      replicas: 3
```

### 集群部署

- Docker Swarm 模式
- Kubernetes 配置
- 负载均衡配置
- 服务发现

### CI/CD 集成

- GitHub Actions 配置
- 自动化测试
- 自动部署流水线
- 镜像安全扫描

## 🆘 支持和帮助

### 文档资源

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Nginx 配置指南](https://nginx.org/en/docs/)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)

### 社区支持

- 项目 Issue 追踪
- 技术交流群
- 在线文档和教程
- 专业技术支持

---

**注意**: 生产环境部署前请务必：
1. 修改所有默认密码
2. 配置 SSL 证书
3. 设置防火墙规则
4. 配置备份策略
5. 设置监控告警