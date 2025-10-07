# 搜索服务集成文档

## 概述
本项目集成了MeiliSearch和ZincSearch两个搜索引擎，提供高可用的搜索服务。当主搜索引擎(MeiliSearch)不可用时，系统会自动降级到备用搜索引擎(ZincSearch)。

## 架构设计

### 搜索策略模式
- **SearchStrategy**: 搜索策略接口，定义统一的搜索操作
- **MeiliSearchService**: MeiliSearch实现
- **ZincSearchService**: ZincSearch实现  
- **SearchManagerService**: 搜索管理器，负责故障转移和状态管理

### 故障转移机制
1. **健康检查**: 定期检查搜索引擎可用性
2. **自动降级**: 主引擎不可用时自动切换到备用引擎
3. **状态恢复**: 主引擎恢复后自动切换回主引擎
4. **数据同步**: 确保两个搜索引擎的数据一致性

## 部署指南

### 1. 启动搜索服务
```bash
# 使用Kubernetes部署搜索服务
kubectl apply -f k8s/search/meilisearch-deployment.yaml
kubectl apply -f k8s/search/zincsearch-deployment.yaml
kubectl apply -f k8s/search/search-service.yaml
```

### 2. 配置环境变量
复制环境配置文件：
```bash
cp .env.example .env
```

编辑`.env`文件，配置搜索服务连接信息。

### 3. 安装依赖
```bash
cd backend
npm install
```

### 4. 启动应用
```bash
npm run start:dev
```

## API接口

### 搜索产品
```http
GET /api/v1/products/search?keyword=手机&categoryId=1&page=1&limit=20
```

### 批量重新索引
```http
POST /api/v1/products/search/reindex
```

### 获取搜索状态
```http
GET /api/v1/products/search/status
```

## 配置说明

### 环境变量
| 变量名 | 说明 | 默认值 |
|-------|------|--------|
| `SEARCH_ENGINE_PRIMARY` | 主搜索引擎 | `meilisearch` |
| `SEARCH_ENGINE_FALLBACK` | 备用搜索引擎 | `zincsearch` |
| `MEILI_SEARCH_URL` | MeiliSearch服务地址 | `http://localhost:7700` |
| `ZINC_SEARCH_URL` | ZincSearch服务地址 | `http://localhost:4080` |

### 性能配置
- 搜索超时: 5秒
- 重试次数: 3次
- 健康检查间隔: 30秒

## 监控指标

### 搜索性能指标
- 搜索响应时间
- 搜索引擎切换次数
- 搜索成功率
- 数据索引延迟

### 系统健康指标
- 搜索引擎可用性
- 内存使用情况
- 索引大小
- 并发连接数

## 故障排除

### 常见问题

1. **搜索服务连接失败**
   - 检查Kubernetes Pod是否运行
   - 验证端口是否被占用
   - 检查防火墙设置

2. **数据索引失败**
   - 检查搜索引擎磁盘空间
   - 验证API密钥权限
   - 查看应用日志错误信息

3. **搜索性能下降**
   - 检查索引碎片化
   - 优化搜索查询
   - 增加硬件资源

### 日志分析
搜索相关的日志标记为`[Search]`，便于故障排查：
- 搜索引擎切换日志
- 索引操作日志
- 性能监控日志

## 扩展指南

### 添加新的搜索引擎
1. 实现`SearchStrategy`接口
2. 在`SearchModule`中注册服务
3. 更新`SearchManagerService`配置

### 性能优化建议
1. 使用批量索引操作
2. 实现搜索缓存层
3. 优化搜索查询语法
4. 定期清理过期数据