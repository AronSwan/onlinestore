# 后端 Docker 配置

本目录包含后端服务的 Docker 配置文件。

## 📚 文档导航

### 总领文档
- **[Docker 部署指南](../../README-DOCKER.md)** - 完整的Docker部署和使用说明（总领文档）

### 后端Docker配置文档
- **[Docker配置优化指南](../DOCKER_OPTIMIZATION_GUIDE.md)** - 详细的优化过程和最佳实践
- **[Docker配置优化总结](../DOCKER_OPTIMIZATION_SUMMARY.md)** - 优化成果和效果总结

### 后端Docker快速参考
- **[当前文档 - Docker使用说明](README.md)** - 简化的使用说明和快速开始

### 文档关系图
```
../../README-DOCKER.md (总领文档)
    ↓
    ├── ../DOCKER_OPTIMIZATION_GUIDE.md (详细优化指南)
    ├── ../DOCKER_OPTIMIZATION_SUMMARY.md (优化总结)
    └── README.md (当前文档 - 快速使用说明)
```

## 快速开始

### 1. 环境准备

```bash
# 复制环境变量模板
cp ../.env.example ../.env

# 编辑环境变量文件，设置密码等配置
vim ../.env
```

### 2. 启动服务

```bash
# 启动所有基础服务
docker-compose up -d

# 启动特定服务
docker-compose up -d postgres redis email-verifier openobserve
docker-compose up -d backend

# 启动包含可选服务的完整配置
docker-compose --profile payment up -d
docker-compose --profile tidb up -d
```

## 服务说明

### 核心服务

- **backend**: 后端主服务 (端口 3000)
- **postgres**: PostgreSQL 数据库 (端口 5432)
- **redis**: Redis 缓存 (端口 6379)
- **email-verifier**: 邮件验证服务 (端口 8080)

### 监控服务

- **openobserve**: 统一日志和指标收集 (端口 5080)
- **node-exporter**: 系统监控 (端口 9100)

### 消息队列

- **redpanda**: 消息队列 (端口 9092)
- **redpanda-console**: RedPanda 管理界面 (端口 8081)

### 可选服务 (使用 profiles)

- **支付服务** (profile: payment)
  - gopay-service: Gopay 支付服务 (端口 8082)
  - crypto-gateway: 加密货币支付网关 (端口 8083)

- **TiDB 数据库** (profile: tidb)
  - tidb-pd: TiDB PD (端口 2379)
  - tidb-tikv: TiKV (端口 20160)
  - tidb: TiDB SQL 层 (端口 4000)

## 常用命令

### 服务管理

```bash
# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f
docker-compose logs -f backend

# 重启服务
docker-compose restart backend

# 停止所有服务
docker-compose down

# 清理未使用的资源
docker system prune -f
```

### 开发环境

```bash
# 启动开发环境
docker-compose up -d

# 启动生产环境
docker-compose -f docker-compose.yml up -d
```

## 环境变量

主要环境变量在 `.env` 文件中配置：

```bash
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
# ... 其他支付配置
```

## 端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| backend | 3000 | 后端 API |
| postgres | 5432 | PostgreSQL 数据库 |
| redis | 6379 | Redis 缓存 |
| email-verifier | 8080 | 邮件验证服务 |
| openobserve | 5080 | 日志和指标收集 |
| redpanda | 9092 | 消息队列 |
| redpanda-console | 8081 | RedPanda 管理界面 |
| gopay-service | 8082 | Gopay 支付服务 |
| crypto-gateway | 8083 | 加密货币支付网关 |
| node-exporter | 9100 | 系统监控 |
| tidb | 4000 | TiDB MySQL 兼容端口 |

## 故障排除

### 常见问题

1. **端口冲突**
   - 检查端口是否被其他服务占用
   - 修改 `.env` 文件中的端口配置

2. **环境变量问题**
   - 确保 `.env` 文件存在且配置正确
   - 检查必需的环境变量是否已设置

3. **服务启动失败**
   - 查看服务日志：`docker-compose logs -f service_name`
   - 检查服务依赖关系

### 调试方法

```bash
# 启用详细输出
docker-compose up --verbose

# 强制重新创建容器
docker-compose up -d --force-recreate

# 查看详细日志
docker-compose logs -f service_name
```

## 独立服务部署

如果需要独立部署特定服务，可以使用以下配置文件：

- `openobserve/docker-compose.yml` - 独立部署 OpenObserve
- `redpanda/docker-compose.yml` - 独立部署 RedPanda
- `docker-compose.tidb.yml` - 独立部署 TiDB
- `src/payment/docker-compose.yml` - 独立部署支付服务

## 更多信息

详细的优化指南和最佳实践请参考 [`../DOCKER_OPTIMIZATION_GUIDE.md`](../DOCKER_OPTIMIZATION_GUIDE.md)。