# Docker 部署指南

本指南提供完整的 Docker 化解决方案，支持开发和生产环境的容器化部署。

## 📚 文档导航

### 总领文档
- **[当前文档 - Docker 部署指南](README-DOCKER.md)** - 完整的Docker部署和使用说明

### 后端Docker配置文档
- **[Docker配置优化指南](backend/DOCKER_OPTIMIZATION_GUIDE.md)** - 详细的优化过程和最佳实践
- **[Docker配置优化总结](backend/DOCKER_OPTIMIZATION_SUMMARY.md)** - 优化成果和效果总结

### 后端Docker快速参考
- **[Docker使用说明](backend/docker/README.md)** - 简化的使用说明和快速开始

### 文档关系图
```
README-DOCKER.md (总领文档)
    ↓
    ├── backend/DOCKER_OPTIMIZATION_GUIDE.md (详细优化指南)
    ├── backend/DOCKER_OPTIMIZATION_SUMMARY.md (优化总结)
    └── backend/docker/README.md (快速使用说明)
```

## 🏗️ 架构概览

### 服务组件

- **后端服务** (Node.js + NestJS)
- **数据库** (PostgreSQL 15)
- **缓存** (Redis 7)
- **邮箱验证** (AfterShip email-verifier)
- **消息队列** (RedPanda)
- **监控系统** (OpenObserve)
- **支付服务** (Gopay + 加密货币网关)
- **可选数据库** (TiDB 分布式数据库)

### 网络架构

```
Internet
    ↓
后端服务 (3000)
    ↓
API 服务
    ↓
┌─────────────────────────────────────────┐
↓         ↓           ↓           ↓       ↓
PostgreSQL  Redis  Email-Verifier  RedPanda  OpenObserve
 (5432)    (6379)     (8080)        (9092)     (5080)
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
cp backend/.env.example .env

# 编辑配置文件
nano .env
```

### 3. 一键部署

```bash
# 进入后端目录
cd backend

# 给脚本执行权限 (Linux/macOS)
chmod +x docker/start.sh

# 启动生产环境
docker/start.sh prod

# 或启动开发环境
docker/start.sh dev
```

## 📋 部署命令

### 基础命令

```bash
# 生产环境部署
docker/start.sh prod

# 开发环境部署
docker/start.sh dev

# 启动监控服务
docker/start.sh monitoring

# 启动包含支付服务的完整配置
docker/start.sh -p payment all

# 启动包含TiDB的完整配置
docker/start.sh -p tidb all

# 停止所有服务
docker/start.sh -s

# 重启服务
docker/start.sh -r

# 查看日志
docker/start.sh -l [service_name]

# 健康检查
docker/start.sh --status
```

### 数据管理

```bash
# 备份数据库
docker-compose exec postgres pg_dump -U postgres shopping_db > backup.sql

# 恢复数据库
docker-compose exec -T postgres psql -U postgres shopping_db < backup.sql

# 清理资源
docker/start.sh -c
```

## 🔧 配置说明

### 环境变量 (.env)

```env
# 数据库配置
POSTGRES_DB=shopping_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_postgres_password

# Redis配置
REDIS_PASSWORD=your_redis_password

# JWT配置
JWT_SECRET=your_jwt_secret_key

# OpenObserve配置
ZO_ROOT_USER_EMAIL=admin@example.com
ZO_ROOT_USER_PASSWORD=ComplexPass#123

# 支付服务配置
ALIPAY_APP_ID=your_alipay_app_id
ALIPAY_PRIVATE_KEY=your_alipay_private_key
ALIPAY_PUBLIC_KEY=your_alipay_public_key
WECHAT_APP_ID=your_wechat_app_id
WECHAT_MCH_ID=your_wechat_mch_id
WECHAT_API_KEY=your_wechat_api_key

# 应用配置
NODE_ENV=production
PORT=3000
CORS_ORIGIN=http://localhost
```

## 🌐 服务访问

### 核心服务

| 服务 | 地址 | 说明 |
|------|------|------|
| 后端API | http://localhost:3000 | 后端服务 |
| PostgreSQL | localhost:5432 | 数据库 |
| Redis | localhost:6379 | 缓存 |
| Email Verifier | http://localhost:8080 | 邮件验证服务 |

### 监控和管理

| 服务 | 地址 | 用户名/密码 |
|------|------|-------------|
| OpenObserve | http://localhost:5080 | admin@example.com / ComplexPass#123 |
| RedPanda Console | http://localhost:8081 | - |
| Node Exporter | http://localhost:9100 | - |

### 可选服务

| 服务 | 地址 | 说明 |
|------|------|------|
| Gopay服务 | http://localhost:8082 | 支付服务 (需要 -p payment) |
| 加密货币网关 | http://localhost:8083 | 加密货币支付 (需要 -p payment) |
| TiDB | http://localhost:4000 | 分布式数据库 (需要 -p tidb) |

## 📊 监控和日志

### 日志查看

```bash
# 查看所有服务日志
docker/start.sh -l

# 查看特定服务日志
docker/start.sh -l backend

# 查看最近 100 行日志
docker-compose logs --tail=100 backend
```

### 监控指标

OpenObserve 提供统一的日志和指标收集：

- **应用性能**: 响应时间、吞吐量、错误率
- **系统资源**: CPU、内存、磁盘、网络
- **数据库**: 连接数、查询性能
- **缓存**: 命中率、内存使用

## 🔒 安全配置

### 网络安全

- 容器间通信使用内部网络
- 仅必要端口对外开放
- 使用网络隔离服务

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

### 安全最佳实践

1. **修改默认密码**：部署前务必修改所有默认密码
2. **配置防火墙**：仅开放必要端口
3. **定期更新**：保持Docker镜像和基础系统更新
4. **监控告警**：配置安全事件监控和告警

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

### 2. SSL 证书配置 (可选)

```bash
# 使用 Let's Encrypt (推荐)
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com

# 配置证书到负载均衡器
```

### 3. 生产部署

```bash
# 克隆项目
git clone <your-repo-url>
cd onlinestore

# 配置环境变量
cp backend/.env.example .env
nano .env  # 修改生产配置

# 部署服务
cd backend
docker/start.sh prod

# 启动监控
docker/start.sh monitoring
```

## 🔧 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   netstat -tulpn | grep :3000
   
   # 修改端口映射
   nano .env  # 修改端口配置
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
   docker/start.sh -l postgres
   
   # 重启数据库
   docker/start.sh -r database
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
docker network inspect backend_backend-network

# 查看卷挂载
docker volume ls
docker volume inspect backend_postgres_data
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
      memory: 2G
      cpus: '1.0'
    reservations:
      memory: 1G
      cpus: '0.5'
```

### 3. 缓存策略

- Redis 缓存配置优化
- 数据库查询缓存
- 应用级缓存

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
cd backend
docker-compose build
docker/start.sh -r

# 滚动更新 (零停机)
docker-compose up -d --no-deps backend
```

### 数据库迁移

```bash
# 备份数据
docker-compose exec postgres pg_dump -U postgres shopping_db > backup.sql

# 执行迁移 (如果有)
docker-compose exec backend npm run migration:run
```

### 定期维护

```bash
# 清理未使用的镜像
docker image prune -f

# 清理未使用的卷 (谨慎操作)
docker volume prune -f

# 更新基础镜像
docker-compose pull
docker/start.sh -r
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

### 独立服务部署

如果需要独立部署特定服务：

```bash
# 独立部署OpenObserve
cd backend/docker/openobserve && docker-compose up -d

# 独立部署RedPanda
cd backend/docker/redpanda && docker-compose up -d

# 独立部署TiDB
cd backend && docker-compose -f docker/docker-compose.tidb.yml up -d

# 独立部署支付服务
cd backend/src/payment && docker-compose up -d
```

## 🆘 支持和帮助

### 文档资源

- [后端Docker配置优化指南](backend/DOCKER_OPTIMIZATION_GUIDE.md)
- [后端Docker配置优化总结](backend/DOCKER_OPTIMIZATION_SUMMARY.md)
- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [OpenObserve 文档](https://openobserve.ai/docs/)
- [RedPanda 文档](https://docs.redpanda.com/)
- [TiDB 文档](https://docs.pingcap.com/tidb/stable/)

## 📖 相关文档

- 查看 [Docker配置优化指南](backend/DOCKER_OPTIMIZATION_GUIDE.md) 了解详细的优化过程
- 查看 [Docker配置优化总结](backend/DOCKER_OPTIMIZATION_SUMMARY.md) 了解优化成果
- 查看 [Docker使用说明](backend/docker/README.md) 获取快速开始指南

---

**重要提醒**: 生产环境部署前请务必：
1. 修改所有默认密码
2. 配置适当的网络安全策略
3. 设置防火墙规则
4. 配置数据备份策略
5. 设置监控告警
6. 进行安全评估