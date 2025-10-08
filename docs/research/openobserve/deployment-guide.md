# OpenObserve 部署指南

## 部署架构概述

### 单节点部署
适用于开发、测试和小规模生产环境：
- 所有组件运行在单个节点
- 简单的配置和管理
- 资源需求相对较低

### 集群部署
适用于大规模生产环境：
- 多节点分布式架构
- 高可用性和负载均衡
- 水平扩展能力

## 环境要求

### 硬件要求

#### 最小配置（开发/测试）
- **CPU**：2 核心
- **内存**：4 GB
- **存储**：50 GB SSD
- **网络**：1 Gbps

#### 生产配置建议
- **CPU**：8+ 核心
- **内存**：16+ GB
- **存储**：根据数据量确定，建议 SSD
- **网络**：10 Gbps

### 软件要求

#### 操作系统
- **Linux**：Ubuntu 20.04+, CentOS 8+, Amazon Linux 2
- **容器运行时**：Docker 20.10+, containerd 1.4+

#### 依赖组件
- **对象存储**（可选）：S3、MinIO、GCS、Azure Blob
- **数据库**：内置或外部 PostgreSQL（企业版）

## Docker 部署

### 快速开始

#### 1. 拉取镜像
```bash
docker pull o2cr.ai/openobserve/openobserve:latest
```

#### 2. 创建数据目录
```bash
mkdir -p /data/openobserve
```

#### 3. 运行容器
```bash
docker run -d \
  --name openobserve \
  -p 5080:5080 \
  -v /data/openobserve:/data \
  -e ZO_ROOT_USER_EMAIL=root@example.com \
  -e ZO_ROOT_USER_PASSWORD=Complexpass#123 \
  -e ZO_DATA_DIR=/data \
  o2cr.ai/openobserve/openobserve:latest
```

### 环境变量配置

#### 必需配置
```bash
ZO_ROOT_USER_EMAIL=admin@company.com
ZO_ROOT_USER_PASSWORD=secure_password
ZO_DATA_DIR=/data
```

#### 可选配置
```bash
# 对象存储配置
ZO_S3_REGION=us-east-1
ZO_S3_BUCKET_NAME=my-bucket
ZO_S3_ACCESS_KEY=access_key
ZO_S3_SECRET_KEY=secret_key

# 高级配置
ZO_HTTP_PORT=5080
ZO_LOG_LEVEL=info
ZO_MAX_FILE_SIZE=104857600  # 100MB
```

### Docker Compose 部署

#### docker-compose.yml
```yaml
version: '3.8'
services:
  openobserve:
    image: o2cr.ai/openobserve/openobserve:latest
    ports:
      - "5080:5080"
    environment:
      - ZO_ROOT_USER_EMAIL=admin@company.com
      - ZO_ROOT_USER_PASSWORD=secure_password
      - ZO_DATA_DIR=/data
    volumes:
      - openobserve_data:/data
    restart: unless-stopped

volumes:
  openobserve_data:
```

#### 启动服务
```bash
docker-compose up -d
```

## Kubernetes 部署

### 命名空间配置
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: openobserve
```

### Service 配置
```yaml
apiVersion: v1
kind: Service
metadata:
  name: openobserve
  namespace: openobserve
spec:
  selector:
    app: openobserve
  ports:
  - port: 5080
    targetPort: 5080
  type: ClusterIP
```

### StatefulSet 配置
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: openobserve
  namespace: openobserve
spec:
  serviceName: openobserve
  replicas: 3
  selector:
    matchLabels:
      app: openobserve
  template:
    metadata:
      labels:
        app: openobserve
    spec:
      securityContext:
        fsGroup: 2000
        runAsUser: 10000
        runAsGroup: 3000
        runAsNonRoot: true
      containers:
      - name: openobserve
        image: o2cr.ai/openobserve/openobserve:latest
        env:
        - name: ZO_ROOT_USER_EMAIL
          value: "root@example.com"
        - name: ZO_ROOT_USER_PASSWORD
          value: "Complexpass#123"
        - name: ZO_DATA_DIR
          value: "/data"
        ports:
        - containerPort: 5080
          name: http
        volumeMounts:
        - name: data
          mountPath: /data
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1"
        livenessProbe:
          httpGet:
            path: /health
            port: 5080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 5080
          initialDelaySeconds: 5
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 100Gi
```

### Ingress 配置（可选）
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: openobserve
  namespace: openobserve
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: openobserve.company.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: openobserve
            port:
              number: 5080
```

## 配置详解

### 基本配置

#### 数据目录配置
```bash
# 数据存储路径
ZO_DATA_DIR=/data

# 临时文件目录
ZO_TEMP_DIR=/tmp/openobserve
```

#### 网络配置
```bash
# HTTP 服务端口
ZO_HTTP_PORT=5080

# 节点间通信端口
ZO_CLUSTER_PORT=5081

# 绑定地址
ZO_HTTP_HOST=0.0.0.0
```

### 存储配置

#### 本地存储
```bash
# 使用本地文件系统
ZO_STORAGE_TYPE=disk
ZO_DISK_STORAGE_PATH=/data/storage
```

#### 对象存储配置（S3示例）
```bash
# S3 配置
ZO_STORAGE_TYPE=s3
ZO_S3_REGION=us-east-1
ZO_S3_BUCKET_NAME=my-openobserve-bucket
ZO_S3_ACCESS_KEY=your-access-key
ZO_S3_SECRET_KEY=your-secret-key

# 可选：自定义端点（用于MinIO等）
ZO_S3_ENDPOINT=https://minio.example.com
```

### 安全配置

#### TLS/SSL 配置
```bash
# 启用 HTTPS
ZO_HTTPS_ENABLED=true
ZO_HTTPS_CERT_FILE=/path/to/cert.pem
ZO_HTTPS_KEY_FILE=/path/to/key.pem
```

#### 认证配置
```bash
# JWT 密钥
ZO_JWT_SECRET=your-jwt-secret

# Session 配置
ZO_SESSION_TIMEOUT=3600
```

### 性能调优

#### 内存配置
```bash
# JVM 内存设置（如果使用JVM组件）
ZO_JAVA_OPTS="-Xmx4g -Xms2g"

# 缓存大小
ZO_CACHE_SIZE=2g
```

#### 并发配置
```bash
# 工作线程数
ZO_WORKER_THREADS=8

# 最大连接数
ZO_MAX_CONNECTIONS=1000
```

## 监控和维护

### 健康检查端点
```bash
# 健康检查
curl http://localhost:5080/health

# 就绪检查
curl http://localhost:5080/ready

# 指标端点
curl http://localhost:5080/metrics
```

### 日志配置
```bash
# 日志级别
ZO_LOG_LEVEL=info  # debug, info, warn, error

# 日志输出
ZO_LOG_FILE=/var/log/openobserve.log

# 日志轮转
ZO_LOG_MAX_SIZE=100MB
ZO_LOG_MAX_FILES=10
```

### 备份和恢复

#### 数据备份
```bash
# 备份数据目录
tar -czf openobserve-backup-$(date +%Y%m%d).tar.gz /data/openobserve

# 如果使用对象存储，确保存储桶有版本控制
```

#### 恢复流程
1. 停止 OpenObserve 服务
2. 恢复备份数据到数据目录
3. 重新启动服务

## 故障排除

### 常见问题

#### 启动失败
```bash
# 检查端口占用
netstat -tulpn | grep 5080

# 检查权限
ls -la /data/openobserve

# 查看日志
docker logs openobserve
```

#### 性能问题
```bash
# 监控资源使用
top
htop

# 检查磁盘 I/O
iostat -x 1

# 网络连接检查
netstat -an | grep 5080
```

#### 存储问题
```bash
# 检查磁盘空间
df -h

# 检查存储权限
ls -la /data/openobserve/

# 验证对象存储连接
aws s3 ls s3://your-bucket
```

### 性能优化建议

#### 硬件优化
- 使用 SSD 存储
- 确保足够的内存
- 优化网络配置

#### 配置优化
- 调整缓存大小
- 优化线程池配置
- 配置合适的存储后端

## 升级流程

### 版本升级
1. **备份数据**：确保有完整的数据备份
2. **查看发布说明**：了解版本变更和迁移要求
3. **停止服务**：优雅停止当前版本
4. **部署新版本**：使用新版本的镜像或二进制
5. **启动验证**：检查服务状态和功能
6. **监控运行**：观察一段时间确保稳定

### 回滚计划
- 保持旧版本镜像可用
- 准备快速回滚脚本
- 确保备份数据可恢复

## 安全最佳实践

### 网络安全
- 使用防火墙限制访问
- 配置 TLS/SSL 加密
- 定期更新安全补丁

### 访问控制
- 使用强密码策略
- 定期轮换访问密钥
- 配置适当的权限管理

### 数据安全
- 加密敏感配置信息
- 定期备份重要数据
- 监控异常访问模式

这个部署指南涵盖了 OpenObserve 的主要部署场景和配置选项，可以根据实际需求进行调整和优化。