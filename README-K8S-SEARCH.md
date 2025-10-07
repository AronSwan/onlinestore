# Kubernetes 环境搜索服务部署指南

## 🚀 快速部署

### 1. 环境要求
- Kubernetes 集群 (v1.19+)
- kubectl 命令行工具
- 持久化存储支持 (StorageClass)

### 2. 一键部署
```bash
cd k8s/search
chmod +x deploy-search.sh
./deploy-search.sh
```

### 3. 使用 Kustomize 部署
```bash
kubectl apply -k k8s/search/
```

## 📋 部署清单

### 创建的资源
- **命名空间**: `search`
- **Deployment**: 
  - `meilisearch` (2个副本)
  - `zincsearch` (2个副本)
- **Service**:
  - `meilisearch-service` (ClusterIP)
  - `zincsearch-service` (ClusterIP)
- **存储**: 
  - `meili-pvc` (10GB)
  - `zinc-pvc` (10GB)
- **配置**: 
  - `search-config` (ConfigMap)
  - `search-secrets` (Secret)

## 🔧 配置说明

### 服务连接信息
```yaml
# 在应用配置中使用的服务地址
meili.url: "http://meilisearch-service.search.svc.cluster.local:7700"
zinc.url: "http://zincsearch-service.search.svc.cluster.local:4080"
```

### 环境变量配置
更新应用的 `.env` 文件：
```env
# 搜索服务配置 (Kubernetes环境)
SEARCH_ENGINE_PRIMARY=meilisearch
SEARCH_ENGINE_FALLBACK=zincsearch

# MeiliSearch配置
MEILI_SEARCH_URL=http://meilisearch-service.search.svc.cluster.local:7700
MEILI_SEARCH_API_KEY=从Secret获取

# ZincSearch配置
ZINC_SEARCH_URL=http://zincsearch-service.search.svc.cluster.local:4080
ZINC_SEARCH_USERNAME=admin
ZINC_SEARCH_PASSWORD=从Secret获取
```

## 📊 监控和管理

### 查看服务状态
```bash
# 查看所有资源
kubectl get all -n search

# 查看Pod状态
kubectl get pods -n search -l app=meilisearch
kubectl get pods -n search -l app=zincsearch

# 查看服务详情
kubectl describe service meilisearch-service -n search
```

### 日志查看
```bash
# 查看MeiliSearch日志
kubectl logs -n search -l app=meilisearch --tail=100

# 查看ZincSearch日志
kubectl logs -n search -l app=zincsearch --tail=100

# 实时日志监控
kubectl logs -n search -f deployment/meilisearch
```

### 健康检查
```bash
# 端口转发到本地检查
kubectl port-forward -n search svc/meilisearch-service 7700:7700
curl http://localhost:7700/health

kubectl port-forward -n search svc/zincsearch-service 4080:4080
curl http://localhost:4080/health
```

## 🔄 故障转移测试

### 模拟Pod故障
```bash
# 删除MeiliSearch Pod（模拟故障）
kubectl delete pod -n search -l app=meilisearch

# 观察自动恢复
kubectl get pods -n search -l app=meilisearch -w

# 测试搜索功能
curl "http://your-app-service/api/v1/products/search?keyword=test"
```

### 服务可用性验证
系统会在以下情况自动故障转移：
1. Pod不可用（Kubernetes自动重启）
2. 服务端点健康检查失败
3. 网络分区或连接超时

## 🛠️ 运维操作

### 扩容缩容
```bash
# 扩容MeiliSearch
kubectl scale deployment meilisearch -n search --replicas=3

# 缩容ZincSearch
kubectl scale deployment zincsearch -n search --replicas=1
```

### 更新配置
```bash
# 更新ConfigMap
kubectl edit configmap search-config -n search

# 重启服务应用新配置
kubectl rollout restart deployment -n search
```

### 数据备份
```bash
# 创建数据快照（需要CSI支持）
kubectl create -f snapshot.yaml

# 备份Secret配置
kubectl get secret search-secrets -n search -o yaml > secrets-backup.yaml
```

## 🚨 故障排除

### 常见问题

**问题1: Pod无法启动**
```bash
# 查看Pod详情
kubectl describe pod <pod-name> -n search

# 检查事件
kubectl get events -n search --sort-by='.lastTimestamp'
```

**问题2: 持久化存储问题**
```bash
# 检查PVC状态
kubectl get pvc -n search

# 检查存储类
kubectl get storageclass
```

**问题3: 服务无法连接**
```bash
# 检查服务端点
kubectl get endpoints -n search

# 网络诊断
kubectl run -i --rm --tty debug --image=busybox -n search -- sh
nslookup meilisearch-service.search
```

### 性能监控
```bash
# 资源使用情况
kubectl top pods -n search

# 详细资源监控
kubectl describe nodes | grep -A 10 "Allocated resources"
```

## 📈 高可用配置

### 节点亲和性
```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - meilisearch
        topologyKey: kubernetes.io/hostname
```

### 资源限制优化
根据实际负载调整：
```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "200m"
  limits:
    memory: "2Gi"
    cpu: "1"
```

## 🔒 安全配置

### 网络策略
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: search-network-policy
  namespace: search
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: your-app-namespace
    ports:
    - protocol: TCP
      port: 7700
    - protocol: TCP
      port: 4080
```

## 🎯 最佳实践

1. **监控告警**: 设置Pod重启、资源使用率告警
2. **定期备份**: 定期备份搜索索引数据
3. **版本控制**: 使用明确的镜像标签版本
4. **资源隔离**: 为搜索服务分配专用节点
5. **日志聚合**: 集成集中式日志系统

## 📞 支持信息

如果遇到部署问题，请检查：
1. Kubernetes集群版本兼容性
2. 存储类配置是否正确
3. 资源配额是否充足
4. 网络策略是否允许访问