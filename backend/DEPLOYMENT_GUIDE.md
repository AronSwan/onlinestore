# 部署指南与最佳实践

## 部署拓扑推荐

### 1. 开发环境配置
```yaml
# 资源需求
CPU: 2核心
内存: 4GB
数据库连接池: 50
Redis连接池: 20
副本数: 1
```

### 2. 测试环境配置
```yaml
# 资源需求
CPU: 4核心
内存: 8GB
数据库连接池: 100
Redis连接池: 30
副本数: 2
```

### 3. 生产环境配置（支持1.5k并发）
```yaml
# 资源需求（最小配置）
CPU: 8核心
内存: 16GB
数据库连接池: 200
Redis连接池: 50
副本数: 3-5（根据负载自动扩展）

# 推荐配置（高并发场景）
CPU: 16核心
内存: 32GB
数据库连接池: 500
Redis连接池: 100
副本数: 5-10
```

## 环境变量配置

### 生产环境必须配置
```env
NODE_ENV=production
JWT_SECRET=your-super-strong-secret-key-at-least-32-characters-long
DB_HOST=your-production-db-host
DB_PASSWORD=your-secure-db-password
REDIS_PASSWORD=your-redis-password
```

### 安全配置
```env
# CORS精确白名单
CORS_ORIGINS=https://your-frontend-domain.com,https://admin.your-domain.com

# 限流配置（根据业务调整）
THROTTLER_LIMIT=5000
THROTTLER_TTL=60

# 数据库SSL
DB_SSL=true
```

## 部署方案

### Kubernetes部署（推荐）
```bash
# 部署应用到Kubernetes
kubectl apply -f k8s/

# 查看部署状态
kubectl get pods
kubectl get services
```

### 原生进程部署（开发环境）
```bash
# 直接运行Node.js应用
npm run start:dev

# 生产环境运行
npm run start:prod
```
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: caddy-shopping-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: caddy-shopping-backend
  template:
    metadata:
      labels:
        app: caddy-shopping-backend
    spec:
      containers:
      - name: backend
        image: your-registry/caddy-shopping-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "2Gi"
            cpu: "500m"
          limits:
            memory: "4Gi"
            cpu: "2"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## 性能调优参数

### 数据库连接池
```env
# 根据并发量调整
DB_POOL_SIZE=200  # 默认值，支持1.5k并发
DB_CONNECTION_TIMEOUT=60000
DB_ACQUIRE_TIMEOUT=60000
```

### Redis配置
```env
REDIS_TTL=3600
REDIS_POOL_SIZE=50
```

### Node.js内存限制
```bash
# 启动时设置内存限制
node --max-old-space-size=4096 dist/main.js
```

## 监控与告警

### 关键指标监控
- **CPU使用率**: 超过80%告警
- **内存使用率**: 超过85%告警  
- **数据库连接数**: 超过80%告警
- **API响应时间**: P95 > 500ms告警
- **错误率**: 超过1%告警

### 健康检查端点
```bash
# 基础健康检查
curl http://localhost:3000/health

# 详细状态检查
curl http://localhost:3000/health/status
```

## 安全最佳实践

### 1. 网络隔离
- 数据库和Redis不暴露公网
- 使用VPC或私有网络
- 配置安全组规则

### 2. 访问控制
- 生产环境Swagger需要认证
- API限流防止滥用
- 定期轮换JWT密钥

### 3. 数据保护
- 数据库连接使用SSL
- 敏感信息加密存储
- 定期备份数据

## 故障排除

### Windows环境等价命令
```powershell
# 查看端口占用（替代 lsof）
netstat -ano | findstr :3000

# 进程管理（替代 ps）
Get-Process -Name node

# 健康检查（替代 curl）
Invoke-WebRequest -Uri http://localhost:3000/health

# 环境变量设置
$env:NODE_ENV="production"
```

### 常见问题解决

**内存泄漏**
```bash
# 增加内存限制
node --max-old-space-size=8192 dist/main.js

# 监控内存使用
pm2 monit
```

**数据库连接超时**
```env
# 增加超时时间
DB_CONNECTION_TIMEOUT=120000
DB_ACQUIRE_TIMEOUT=120000
```

**Redis连接问题**
```env
# 开发环境回退到内存缓存
NODE_ENV=development
```

## 扩展性设计

### 水平扩展
- 通过负载均衡器扩展应用实例
- 数据库读写分离
- Redis集群模式

### 垂直扩展
- 增加服务器资源（CPU、内存）
- 优化数据库配置
- 使用更快的存储方案

### 微服务拆分
- 按业务模块拆分服务
- 使用消息队列解耦
- 实现服务发现和负载均衡

## 备份与恢复

### 数据库备份
```bash
# 定期备份
mysqldump -u username -p database_name > backup.sql

# 恢复数据
mysql -u username -p database_name < backup.sql
```

### 配置文件备份
- 环境变量文件
- Kubernetes manifests

## 版本升级

### 安全更新
- 定期更新依赖包
- 监控安全漏洞
- 及时应用补丁

### 数据库迁移
```bash
# 生成迁移文件
npm run migration:generate

# 运行迁移
npm run migration:run

# 回滚迁移
npm run migration:revert
```

---

**最后更新**: 2025-09-30