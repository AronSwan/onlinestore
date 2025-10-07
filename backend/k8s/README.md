# Kubernetes 部署指南

## 用途
本目录包含Caddy Shopping后端应用的Kubernetes部署配置文件，用于实现容器编排、自动化部署和分布式部署。

**重要提示**：有关分布式部署的详细配置和指南，请参阅[README_DISTRIBUTED.md](README_DISTRIBUTED.md)文件。

## 依赖文件
- package.json - 应用依赖配置
- tsconfig.json - TypeScript编译配置

## 文件说明

### 核心配置文件
- `apply-all.yaml` - 一键部署所有资源（包含ConfigMap、Secret、Deployment、Service、HPA和Ingress）

### 部署脚本
- `deploy.sh` - Linux生产环境部署脚本
- `undeploy.sh` - Linux生产环境卸载脚本
- `health-check.sh` - Linux生产环境健康检查脚本

## 快速开始

### 1. 准备工作
确保已安装以下工具：
- kubectl
- 访问Kubernetes集群的权限

### 2. 配置密钥
```bash
# 创建Kubernetes密钥
kubectl create secret generic caddy-shopping-secrets \
  --from-literal=db-host=your-db-host \
  --from-literal=db-username=your-username \
  --from-literal=db-password=your-password \
  --from-literal=jwt-secret=your-jwt-secret \
  --from-literal=redis-password=your-redis-password
```

### 3. 准备应用
```bash
# 构建应用
npm run build

# 准备部署包
npm run pack
```

### 4. 部署应用
```bash
# 方法一：使用Linux生产环境部署脚本
chmod +x deploy.sh undeploy.sh health-check.sh
./deploy.sh

# 方法二：使用自定义命名空间
./deploy.sh --namespace my-namespace

# 方法三：手动部署
kubectl apply -f apply-all.yaml -n caddy-shopping
```

## Linux生产环境部署指南

### 准备脚本权限

在Linux环境中，首先为脚本添加执行权限：

```bash
chmod +x deploy.sh undeploy.sh health-check.sh
```

### 部署应用

使用deploy.sh脚本部署应用：

```bash
# 使用默认命名空间 (caddy-shopping)
./deploy.sh

# 指定自定义命名空间
./deploy.sh --namespace my-namespace
```

部署脚本将执行以下操作：
- 检查kubectl是否已安装
- 创建命名空间（如果不存在）
- 验证Kubernetes配置文件
- 部署应用到Kubernetes集群
- 等待部署完成
- 检查服务状态
- 显示服务访问地址

### 验证部署

部署完成后，可以使用以下命令验证部署状态：

```bash
# 查看Pod状态
kubectl get pods -n caddy-shopping -l app=caddy-shopping-backend

# 查看服务状态
kubectl get svc -n caddy-shopping -l app=caddy-shopping-backend

# 查看应用日志
kubectl logs -n caddy-shopping deployment/caddy-shopping-backend
```

### 健康检查

使用health-check.sh脚本执行健康检查：

```bash
# 执行一次性健康检查
./health-check.sh

# 持续监控应用状态
./health-check.sh --watch

# 在指定命名空间中执行健康检查
./health-check.sh --namespace my-namespace
```

### 卸载应用

使用undeploy.sh脚本卸载应用：

```bash
# 卸载默认命名空间中的应用
./undeploy.sh

# 卸载指定命名空间中的应用
./undeploy.sh --namespace my-namespace
```

## 配置说明

### 环境变量
应用支持以下环境变量：
- `NODE_ENV` - 运行环境（production/development）
- `PORT` - 服务端口（默认3000）
- 数据库相关配置
- Redis相关配置
- JWT相关配置

### 资源限制
- 内存请求：1Gi，限制：2Gi
- CPU请求：1000m，限制：2000m

### 健康检查
- 就绪检查：/health端点，5秒间隔
- 存活检查：/health端点，30秒间隔

### 限流配置
应用已配置以下限流参数：
- 全局限流：每秒5000次请求
- 认证接口限流：每秒1500次请求

### 性能优化配置
应用已针对1.5k并发进行了性能优化：
- 数据库连接池大小：300
- 集群工作进程数：6
- 内存限制：2Gi
- CPU限制：1000m

### 自动扩缩容
应用配置了HPA（Horizontal Pod Autoscaler）：
- 最小副本数：3
- 最大副本数：10
- CPU使用率目标：70%
- 内存使用率目标：80%

## 清理资源

使用清理脚本安全删除所有资源：

```bash
# 使用Linux生产环境卸载脚本
./undeploy.sh

# 或者手动删除
kubectl delete -f apply-all.yaml -n caddy-shopping

# 删除命名空间（谨慎操作）
kubectl delete namespace caddy-shopping
```

## 配置说明

### ConfigMap 配置

`apply-all.yaml` 文件中的ConfigMap部分包含应用的非敏感配置：

- 应用环境变量（NODE_ENV, PORT, LOG_LEVEL）
- 数据库连接配置
- Redis连接配置
- JWT配置
- CORS配置
- 限流配置
- 健康检查配置

### Secret 配置

`apply-all.yaml` 文件中的Secret部分包含敏感信息（base64编码）：

- 数据库认证信息
- Redis密码
- JWT密钥
- API密钥
- 第三方服务密钥

**安全提醒**：生产环境请使用安全的密钥管理方案，如：

- Kubernetes External Secrets
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault

## 监控和维护

### 查看应用状态

```bash
# 查看 Pod 状态
kubectl get pods -n caddy-shopping

# 查看服务状态
kubectl get svc -n caddy-shopping

# 查看 HPA 状态
kubectl get hpa -n caddy-shopping

# 查看配置
kubectl get configmap,secret -n caddy-shopping
```

### 日志查看

```bash
# 查看实时日志
kubectl logs -f deployment/caddy-shopping-backend -n caddy-shopping

# 查看特定 Pod 日志
kubectl logs <pod-name> -n caddy-shopping
```

### 健康检查

```bash
# 执行健康检查
kubectl exec deployment/caddy-shopping-backend -n caddy-shopping -- curl -s http://localhost:3000/health

# 使用健康检查脚本
./health-check.sh
```

### 故障排查

```bash
# 进入 Pod 调试
kubectl exec -it <pod-name> -n caddy-shopping -- /bin/sh

# 查看 Pod 详细信息
kubectl describe pod <pod-name> -n caddy-shopping

# 查看事件
kubectl get events -n caddy-shopping --sort-by=.lastTimestamp
```

## 故障排除

### 常见问题

1. **Pod无法启动**
   - 检查镜像是否正确构建并推送到镜像仓库
   - 查看Pod日志：`kubectl logs -n caddy-shopping <pod-name>`

2. **服务无法访问**
   - 检查Service和Ingress配置
   - 确认网络策略是否允许访问

3. **资源不足**
   - 检查集群资源使用情况
   - 调整资源限制或增加集群资源

### 日志收集

```bash
# 查看所有Pod的日志
kubectl logs -n caddy-shopping -l app=caddy-shopping-backend --tail=100

# 持续查看日志
kubectl logs -n caddy-shopping -l app=caddy-shopping-backend -f
```

### 事件查看

```bash
# 查看命名空间中的事件
kubectl get events -n caddy-shopping --sort-by='.lastTimestamp'

# 查看特定资源的事件
kubectl describe pod -n caddy-shopping <pod-name>
```

## 安全注意事项

1. **密钥管理** - 确保Secrets中的敏感信息已加密
2. **网络策略** - 根据需要配置网络策略限制访问
3. **RBAC** - 配置适当的角色和权限
4. **镜像安全** - 使用可信的基础镜像，定期扫描漏洞

## 性能监控

建议使用以下工具监控应用性能：
1. **Prometheus + Grafana** - 指标收集和可视化
2. **ELK Stack** - 日志收集和分析
3. **Jaeger** - 分布式追踪

## 作者
后端开发团队

## 更新
AI助手 - 增强分布式部署配置和Linux生产环境支持

## 时间
2025-09-30 11:35:00