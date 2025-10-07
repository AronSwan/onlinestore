# Paperless-NGX Kubernetes 部署指南

## 概述
本文档提供 Paperless-NGX 在 Kubernetes 集群上的完整部署方案，包括高可用配置、数据迁移、监控告警等。

## 部署架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Ingress        │    │   Paperless-NGX │    │   PostgreSQL    │
│   Controller     │◄──►│   (3 Replicas)  │◄──►│   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer  │    │   Redis Cache   │    │   Persistent    │
│                 │    │                 │    │   Storage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 前置要求

### 1. Kubernetes 集群要求
- Kubernetes 版本：1.24+
- 存储类：支持 ReadWriteMany 的存储（如 NFS、CephFS、云存储）
- Ingress 控制器：Nginx Ingress Controller
- 监控系统：Prometheus + Grafana（可选）

### 2. 资源需求
- 最小节点数：3 个节点
- 内存：每个节点至少 4GB
- CPU：每个节点至少 2 核
- 存储：至少 150GB 可用空间

## 部署步骤

### 1. 准备环境

```bash
# 创建命名空间
kubectl create namespace paperless

# 创建 TLS 密钥（如果需要）
kubectl create secret tls paperless-tls-secret \
  --key=tls.key \
  --cert=tls.crt \
  --namespace=paperless
```

### 2. 部署存储

```bash
# 部署持久化存储
kubectl apply -f storage.yaml

# 验证存储创建
kubectl get pvc -n paperless
```

### 3. 部署数据库和缓存

```bash
# 部署 PostgreSQL
kubectl apply -f postgresql.yaml

# 部署 Redis
kubectl apply -f redis.yaml

# 等待数据库就绪
kubectl wait --for=condition=ready pod -l app=paperless-postgresql -n paperless --timeout=300s
kubectl wait --for=condition=ready pod -l app=paperless-redis -n paperless --timeout=300s
```

### 4. 数据迁移（从 SQLite 到 PostgreSQL）

```bash
# 运行数据迁移脚本
chmod +x data-migration.sh
./data-migration.sh
```

### 5. 部署 Paperless-NGX

```bash
# 部署应用
kubectl apply -f deployment.yaml

# 部署服务
kubectl apply -f service.yaml

# 部署 Ingress
kubectl apply -f ingress.yaml
```

### 6. 一键部署（推荐）

```bash
# 使用一键部署配置
kubectl apply -f apply-all.yaml
```

## 配置说明

### 环境变量配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| PAPERLESS_REDIS | Redis 连接地址 | redis://paperless-redis:6379 |
| PAPERLESS_DBHOST | PostgreSQL 主机 | paperless-postgresql |
| PAPERLESS_SECRET_KEY | 应用密钥 | 自动生成 |
| PAPERLESS_URL | 应用访问地址 | https://paperless.caddy-shopping.com |

### 存储配置

- **paperless-data-pvc**: 应用数据存储（10GB）
- **paperless-media-pvc**: 媒体文件存储（100GB）
- **paperless-export-pvc**: 导出文件存储（20GB）
- **paperless-consume-pvc**: 消费队列存储（10GB）

## 监控和告警

### 1. 部署监控配置

```bash
# 部署监控配置
kubectl apply -f monitoring.yaml
```

### 2. 关键监控指标

- **CPU 使用率**: 监控应用性能
- **内存使用**: 防止内存泄漏
- **数据库连接**: 确保数据库可用性
- **OCR 队列**: 监控文档处理状态

### 3. 告警规则

- 服务宕机告警（2分钟）
- CPU 使用率过高告警（80%，5分钟）
- 内存使用过高告警（800MB，5分钟）
- 数据库连接错误告警
- OCR 队列积压告警

## 运维操作

### 1. 查看应用状态

```bash
# 查看所有资源状态
kubectl get all -n paperless

# 查看 Pod 状态
kubectl get pods -n paperless

# 查看日志
kubectl logs -f deployment/paperless-ngx -n paperless
```

### 2. 备份和恢复

```bash
# 备份数据库
kubectl exec paperless-postgresql-pod -n paperless -- pg_dump -U paperless paperless > backup.sql

# 恢复数据库
kubectl exec -i paperless-postgresql-pod -n paperless -- psql -U paperless paperless < backup.sql
```

### 3. 扩缩容

```bash
# 扩展应用副本
kubectl scale deployment paperless-ngx --replicas=5 -n paperless

# 缩减应用副本
kubectl scale deployment paperless-ngx --replicas=2 -n paperless
```

## 故障排除

### 常见问题

1. **Pod 无法启动**
   - 检查存储卷是否正确挂载
   - 验证数据库连接配置
   - 查看 Pod 事件：`kubectl describe pod <pod-name> -n paperless`

2. **数据库连接失败**
   - 检查 PostgreSQL 服务状态
   - 验证用户名密码配置
   - 检查网络策略

3. **存储卷挂载失败**
   - 验证存储类配置
   - 检查 PVC 状态
   - 确认节点存储容量

### 日志分析

```bash
# 查看应用日志
kubectl logs -f deployment/paperless-ngx -n paperless

# 查看数据库日志
kubectl logs -f deployment/paperless-postgresql -n paperless

# 查看 Redis 日志
kubectl logs -f deployment/paperless-redis -n paperless
```

## 性能优化建议

### 1. 资源配置优化

- **应用层**: 根据并发用户数调整副本数量
- **数据库**: 根据数据量调整 PostgreSQL 资源限制
- **缓存**: 根据访问模式调整 Redis 内存配置

### 2. 存储优化

- 使用 SSD 存储提高 IO 性能
- 配置适当的存储类参数
- 定期清理无用文件

### 3. 网络优化

- 配置合适的 Ingress 参数
- 启用 HTTP/2 支持
- 配置合理的超时时间

## 安全配置

### 1. 网络安全

```yaml
# 网络策略示例
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: paperless-network-policy
  namespace: paperless
spec:
  podSelector:
    matchLabels:
      app: paperless-ngx
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8000
```

### 2. 密钥管理

- 使用 Kubernetes Secrets 管理敏感信息
- 定期轮换密钥
- 启用密钥加密

## 版本更新

### 1. 滚动更新

```bash
# 更新镜像版本
kubectl set image deployment/paperless-ngx paperless-ngx=ghcr.io/paperless-ngx/paperless-ngx:1.15.0 -n paperless

# 监控更新过程
kubectl rollout status deployment/paperless-ngx -n paperless
```

### 2. 回滚操作

```bash
# 查看更新历史
kubectl rollout history deployment/paperless-ngx -n paperless

# 回滚到上一个版本
kubectl rollout undo deployment/paperless-ngx -n paperless
```

## 联系我们

如有问题，请联系：
- 技术支持：tech-support@caddy-shopping.com
- 文档维护：docs@caddy-shopping.com

---

**最后更新**: 2025-09-30  
**版本**: v1.0.0