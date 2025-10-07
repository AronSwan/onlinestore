# MeiliSearch + ZincSearch 集成部署指南

## 🚀 快速开始

### 1. 环境准备
确保系统已安装：
- Kubernetes (kubectl)
- Node.js 16+
- npm 或 yarn

### 2. 一键部署

#### 方式一：Kubernetes部署
```bash
# 部署搜索服务到Kubernetes
kubectl apply -f k8s/search/

# 启动应用
cd backend
npm run start:dev
```

#### 方式二：原生进程部署
```bash
# 1. 启动MeiliSearch
./meilisearch --http-addr 127.0.0.1:7700 --master-key your-master-key

# 2. 启动ZincSearch  
./zincsearch server

# 3. 安装依赖
npm install

# 4. 配置环境
cp .env.example .env
# 编辑 .env 文件，配置搜索服务连接信息

# 5. 启动应用
npm run start:dev
```

## 📊 服务状态检查

### 验证搜索服务
```bash
# 检查MeiliSearch
curl http://localhost:7700/health

# 检查ZincSearch  
curl http://localhost:4080/health

# 查看服务日志
kubectl logs -f deployment/search-service
```

### 验证应用集成
```bash
# 测试搜索功能
curl "http://localhost:3000/api/v1/products/search?keyword=test"

# 检查搜索状态
curl "http://localhost:3000/api/v1/products/search/status"
```

## 🔧 配置说明

### 环境变量配置 (.env)
```env
# 搜索服务配置
SEARCH_ENGINE_PRIMARY=meilisearch
SEARCH_ENGINE_FALLBACK=zincsearch

# MeiliSearch配置
MEILI_SEARCH_URL=http://localhost:7700
MEILI_SEARCH_API_KEY=自动生成

# ZincSearch配置  
ZINC_SEARCH_URL=http://localhost:4080
ZINC_SEARCH_USERNAME=admin
ZINC_SEARCH_PASSWORD=自动生成
```

### 服务配置
- **MeiliSearch**: 端口 7700，数据目录 `./meili_data`
- **ZincSearch**: 端口 4080，数据目录 `./zinc_data`

## 🛠️ 管理命令

### 服务管理
```bash
# Kubernetes部署管理
kubectl get pods -n search
kubectl logs -f deployment/meilisearch -n search
kubectl logs -f deployment/zincsearch -n search

# 原生进程管理
# 停止服务：Ctrl+C 或 kill 进程
# 重启服务：重新执行启动命令
```

### 数据管理
```bash
# 重新索引所有产品
curl -X POST "http://localhost:3000/api/v1/products/search/reindex"

# 备份数据（原生部署）
tar -czf meili-backup.tar.gz ./meili_data
tar -czf zinc-backup.tar.gz ./zinc_data
```

## 📈 监控和日志

### 性能监控
- 搜索响应时间监控
- 搜索引擎切换统计
- 错误率和成功率监控

### 日志查看
```bash
# Kubernetes日志
kubectl logs -f deployment/meilisearch -n search
kubectl logs -f deployment/zincsearch -n search

# 原生进程日志
# 查看进程输出或日志文件
tail -f meilisearch.log
tail -f zincsearch.log

# 查看应用搜索日志
tail -f logs/search.log
```

## 🔄 故障转移测试

### 模拟故障
```bash
# Kubernetes环境：删除MeiliSearch Pod模拟故障
kubectl delete pod -l app=meilisearch -n search

# 原生环境：停止MeiliSearch进程
killall meilisearch

# 测试搜索功能（应自动切换到ZincSearch）
curl "http://localhost:3000/api/v1/products/search?keyword=test"

# 恢复服务
# Kubernetes: Pod会自动重启
# 原生环境: 重新启动meilisearch进程
```

### 验证故障转移
系统会在以下情况自动切换：
1. MeiliSearch服务不可用（5秒超时）
2. MeiliSearch返回错误响应
3. 网络连接问题

## 🚨 故障排除

### 常见问题

**问题1: 搜索服务启动失败**
```bash
# 检查端口占用
netstat -tulpn | grep :7700
netstat -tulpn | grep :4080

# 清理并重新启动
# Kubernetes: kubectl delete -f k8s/search/ && kubectl apply -f k8s/search/
# 原生进程: 重启相关进程
```

**问题2: 应用连接失败**
```bash
# 检查环境变量
cat .env | grep SEARCH

# 测试连接
curl $MEILI_SEARCH_URL/health
curl $ZINC_SEARCH_URL/health
```

**问题3: 数据索引失败**
```bash
# 检查磁盘空间
df -h

# 重新索引数据
curl -X POST "http://localhost:3000/api/v1/products/search/reindex"
```

## 📋 部署检查清单

- [ ] Kubernetes或原生进程环境已准备
- [ ] 端口7700和4080未被占用
- [ ] 环境配置文件已正确设置
- [ ] 搜索服务启动成功
- [ ] 应用能够连接搜索服务
- [ ] 搜索功能测试通过
- [ ] 故障转移功能验证

## 📞 支持信息

如果遇到问题，请检查：
1. Kubernetes Pod日志：`kubectl logs` 或进程输出日志
2. 应用日志：查看应用控制台输出
3. 搜索服务健康状态：访问服务健康检查端点

## 🎯 性能优化建议

1. **索引优化**: 定期重新索引保持数据新鲜度
2. **缓存策略**: 结合Redis缓存热门搜索结果
3. **查询优化**: 使用合适的搜索参数和过滤器
4. **监控告警**: 设置搜索引擎可用性监控