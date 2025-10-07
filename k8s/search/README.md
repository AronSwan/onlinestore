# Kubernetes 搜索服务部署

## 概述
本目录包含在Kubernetes集群中部署MeiliSearch和ZincSearch高可用搜索服务所需的配置文件。

## 文件结构
```
k8s/search/
├── deploy-search.sh          # 一键部署脚本
├── kustomization.yaml        # Kustomize配置
├── search-namespace.yaml     # 命名空间配置
├── search-configmap.yaml    # 应用配置
├── search-pvc.yaml          # 持久化存储
├── search-secrets.yaml     # 密钥配置（模板）
├── meilisearch-deployment.yaml  # MeiliSearch部署
├── zincsearch-deployment.yaml   # ZincSearch部署
└── README.md               # 本文档
```

## 部署方式

### 方式一：使用脚本部署（推荐）
```bash
chmod +x deploy-search.sh
./deploy-search.sh
```

### 方式二：使用Kustomize部署
```bash
kubectl apply -k ./
```

### 方式三：手动部署
```bash
# 按顺序应用配置文件
kubectl apply -f search-namespace.yaml
kubectl apply -f search-pvc.yaml
kubectl apply -f search-configmap.yaml

# 生成并应用密钥
kubectl create secret generic search-secrets -n search \
  --from-literal=meili-master-key=$(openssl rand -base64 32) \
  --from-literal=zinc-admin-user=admin \
  --from-literal=zinc-admin-password=$(openssl rand -base64 16)

# 部署搜索服务
kubectl apply -f meilisearch-deployment.yaml
kubectl apply -f zincsearch-deployment.yaml
```

## 服务访问

### 集群内访问
- MeiliSearch: `http://meilisearch-service.search.svc.cluster.local:7700`
- ZincSearch: `http://zincsearch-service.search.svc.cluster.local:4080`

### 本地访问（端口转发）
```bash
# MeiliSearch
kubectl port-forward -n search svc/meilisearch-service 7700:7700

# ZincSearch
kubectl port-forward -n search svc/zincsearch-service 4080:4080
```

## 配置说明

### 资源配额
- **MeiliSearch**: 每个Pod请求256Mi内存，限制1Gi内存
- **ZincSearch**: 每个Pod请求256Mi内存，限制1Gi内存
- **存储**: 每个服务10GB持久化存储

### 健康检查
- **就绪探针**: 5秒间隔，5秒初始延迟
- **存活探针**: 10秒间隔，30秒初始延迟

## 监控和维护

### 查看状态
```bash
# 查看所有资源
kubectl get all -n search

# 查看Pod日志
kubectl logs -n search -l app=meilisearch
```

### 运维操作
```bash
# 重启服务
kubectl rollout restart deployment -n search

# 扩容
kubectl scale deployment meilisearch -n search --replicas=3

# 删除部署
kubectl delete -f ./
```

## 故障排除

### 常见问题
1. **PVC挂载失败**: 检查StorageClass配置
2. **服务无法连接**: 检查网络策略和防火墙
3. **Pod不断重启**: 查看日志诊断启动问题

### 获取支持
- 查看详细部署指南: `../README-K8S-SEARCH.md`
- 应用集成文档: `../../README-SEARCH.md`