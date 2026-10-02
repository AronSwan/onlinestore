# 后端Docker配置优化指南

## 📚 文档导航

### 总领文档
- **[Docker 部署指南](../README-DOCKER.md)** - 完整的Docker部署和使用说明（总领文档）

### 后端Docker配置文档
- **[当前文档 - Docker配置优化指南](DOCKER_OPTIMIZATION_GUIDE.md)** - 详细的优化过程和最佳实践
- **[Docker配置优化总结](DOCKER_OPTIMIZATION_SUMMARY.md)** - 优化成果和效果总结

### 后端Docker快速参考
- **[Docker使用说明](docker/README.md)** - 简化的使用说明和快速开始

### 文档关系图
```
../README-DOCKER.md (总领文档)
    ↓
    ├── DOCKER_OPTIMIZATION_GUIDE.md (当前文档 - 详细优化指南)
    ├── DOCKER_OPTIMIZATION_SUMMARY.md (优化总结)
    └── docker/README.md (快速使用说明)
```

## 优化概述

本指南提供了后端Docker配置的全面优化方案，将原本约15个配置文件减少到4-7个核心文件，同时保持完整功能。

## 优化前后对比

### 优化前（原配置）
- 约15个配置文件
- 多个独立的服务配置
- 重复的监控配置
- 分散的环境变量
- 复杂的网络和卷管理

### 优化后（新配置）
- 4-7个核心文件
- 统一的服务配置
- 单一监控方案（OpenObserve）
- 集中的环境变量管理
- 简化的网络和卷配置
- 保留独立服务配置文件（用于独立部署场景）

## 核心优化文件

### 1. 必需文件（4个）

#### [`docker-compose.yml`](docker-compose.yml)
- **作用**：统一的Docker Compose配置文件，包含所有服务
- **特点**：
  - 集成所有服务配置
  - 使用OpenObserve作为统一监控方案
  - 内置网络和卷配置
  - 支持Docker Compose profiles

#### [`Dockerfile`](Dockerfile)
- **作用**：生产环境后端服务镜像构建
- **特点**：
  - 多阶段构建优化
  - 安全的非root用户运行
  - 内置健康检查

#### [`.dockerignore`](.dockerignore)
- **作用**：Docker构建忽略文件
- **特点**：
  - 排除不必要的文件
  - 减少构建上下文大小

#### [`.env.example`](.env.example)
- **作用**：统一的环境变量模板
- **特点**：
  - 包含所有服务配置
  - 集中管理环境变量
  - 包含端口分配说明

### 2. 可选文件（3个）

#### [`docker/start.sh`](docker/start.sh)
- **作用**：Linux/macOS快速启动脚本
- **特点**：
  - 跨平台支持
  - 智能依赖检查
  - 支持所有服务类型

#### [`docker/start.bat`](docker/start.bat)
- **作用**：Windows快速启动脚本
- **特点**：
  - Windows原生支持
  - 与Linux版本功能一致

#### [`DOCKER_OPTIMIZATION_GUIDE.md`](DOCKER_OPTIMIZATION_GUIDE.md)
- **作用**：优化指南文档
- **特点**：
  - 完整的使用说明
  - 优化建议和最佳实践

## 可移除的文件列表

### 1. 重复配置文件
- [`docker-compose.yml.backup`](docker-compose.yml.backup) - 原配置文件备份
- [`docker/networks-volumes.yml`](docker/networks-volumes.yml) - 配置已集成到主文件
- [`docker/port-allocation.yml`](docker/port-allocation.yml) - 端口规则已在主文件中注释说明

### 2. 重复监控配置
- [`docker/openobserve/prometheus-openobserve.yml`](docker/openobserve/prometheus-openobserve.yml) - 使用OpenObserve统一监控
- [`docker/prometheus/prometheus-backend.yml`](docker/prometheus/prometheus-backend.yml) - 使用OpenObserve统一监控

### 3. 服务特定配置
- [`docker/openobserve/config.yaml`](docker/openobserve/config.yaml) - 配置通过环境变量管理

### 4. 旧启动脚本
- [`docker/start.sh.backup`](docker/start.sh.backup) - 原启动脚本备份
- [`docker/start.bat.backup`](docker/start.bat.backup) - 原启动脚本备份

### 5. 保留的独立服务配置
- [`docker/openobserve/docker-compose.yml`](docker/openobserve/docker-compose.yml) - 用于独立部署OpenObserve
- [`docker/redpanda/docker-compose.yml`](docker/redpanda/docker-compose.yml) - 用于独立部署RedPanda
- [`docker/docker-compose.tidb.yml`](docker/docker-compose.tidb.yml) - 用于独立部署TiDB
- [`src/payment/docker-compose.yml`](src/payment/docker-compose.yml) - 用于独立部署支付服务

## 优化特点

### 1. 统一监控方案
- 使用OpenObserve作为唯一的日志和指标收集方案
- 移除Prometheus重复配置
- 支付服务监控集成到主方案中

### 2. 环境变量集中化
- 所有环境变量集中在.env文件中
- 提供.env.example作为模板
- 支持服务特定配置覆盖

### 3. 配置集成
- 网络和卷配置直接在主文件中定义
- 端口分配规则作为注释说明
- 所有服务配置集中管理

### 4. 灵活的部署选项
- 使用Docker Compose profiles控制可选服务
- 支持开发、测试、生产环境
- 支持完整部署和最小部署

## 使用方法

### 1. 环境准备
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
vim .env
```

### 2. 启动服务

#### Linux/macOS
```bash
# 给脚本添加执行权限
chmod +x docker/start.sh

# 启动所有基础服务
./docker/start.sh

# 启动包含支付服务的所有服务
./docker/start.sh -p payment all

# 启动包含TiDB的所有服务
./docker/start.sh -p tidb all

# 后台启动开发环境
./docker/start.sh -d dev
```

#### Windows
```cmd
# 启动所有基础服务
docker\start.bat

# 启动包含支付服务的所有服务
docker\start.bat -p payment all

# 启动包含TiDB的所有服务
docker\start.bat -p tidb all

# 后台启动开发环境
docker\start.bat -d dev
```

### 3. 服务管理
```bash
# 查看服务状态
./docker/start.sh --status

# 查看服务日志
./docker/start.sh -l backend

# 重启特定服务
./docker/start.sh -r backend

# 停止所有服务
./docker/start.sh -s

# 清理资源
./docker/start.sh -c
```

## 部署场景

### 1. 最小部署（开发环境）
```bash
# 仅启动核心服务
./docker/start.sh backend
```
包含服务：backend、postgres、redis、email-verifier、openobserve

### 2. 标准部署（测试环境）
```bash
# 启动所有基础服务
./docker/start.sh all
```
包含服务：所有核心服务 + RedPanda + 监控

### 3. 完整部署（生产环境）
```bash
# 启动包含支付和TiDB的完整服务
./docker/start.sh -p payment -p tidb prod
```
包含服务：所有服务 + 支付服务 + TiDB集群

## 迁移指南

### 从原配置迁移到优化配置

1. **备份原配置**
   ```bash
   # 原配置已自动备份为：
   # docker-compose.yml.backup
   # docker/start.sh.backup
   # docker/start.bat.backup
   ```

2. **使用新配置**
   ```bash
   # 复制环境变量模板
   cp .env.example .env
   
   # 从原环境变量文件迁移配置
   # 手动合并.env文件中的配置
   ```

3. **测试新配置**
   ```bash
   # 使用新的启动脚本
   ./docker/start.sh dev
   ```

4. **验证服务**
   ```bash
   # 检查服务状态
   ./docker/start.sh --status
   
   # 查看服务日志
   ./docker/start.sh -l
   ```

## 故障排除

### 1. 常见问题

#### 环境变量问题
- 确保已从.env.example创建.env文件
- 检查所有必需的环境变量是否已设置

#### 端口冲突
- 检查.env文件中的端口配置
- 确保端口未被其他服务占用

#### 服务启动失败
- 查看服务日志：`./docker/start-optimized.sh -l service_name`
- 检查服务依赖关系

### 2. 调试方法

#### 详细日志
```bash
# 启用详细输出
./docker/start-optimized.sh -v all

# 查看特定服务日志
./docker/start-optimized.sh -l backend
```

#### 强制重建
```bash
# 强制重新创建容器
./docker/start-optimized.sh -f -d all
```

## 性能优化

### 1. 资源限制
- 所有服务都配置了资源限制
- 可根据实际需求调整

### 2. 存储优化
- 使用命名卷进行数据持久化
- 配置日志轮转防止磁盘空间耗尽

### 3. 网络优化
- 使用自定义网络隔离服务
- 配置合适的子网避免冲突

## 安全建议

### 1. 罯件更新
定期更新Docker镜像：
```bash
docker-compose pull
docker-compose up -d
```

### 2. 访问控制
- 修改默认密码
- 配置防火墙规则
- 限制不必要的端口暴露

### 3. 数据安全
- 定期备份重要数据
- 使用加密存储敏感信息
- 配置适当的文件权限

## 总结

通过这次优化，我们实现了：
1. **文件数量减少**：从约15个文件减少到4-7个核心文件
2. **配置集中化**：所有配置集中在主文件和环境变量中
3. **监控统一化**：使用OpenObserve作为统一监控方案
4. **部署简化**：通过profiles和脚本简化部署流程
5. **维护性提升**：减少配置文件数量，降低维护复杂度
6. **独立部署支持**：保留独立服务配置文件，支持独立部署场景

这种优化方案既保持了功能的完整性，又大大简化了配置管理的复杂度，同时保留了独立部署的灵活性，适合各种规模的部署需求。

## 📖 相关文档

- 返回 [Docker 部署指南](../README-DOCKER.md) 查看完整的部署说明
- 查看 [Docker配置优化总结](DOCKER_OPTIMIZATION_SUMMARY.md) 了解优化成果
- 查看 [Docker使用说明](docker/README.md) 获取快速开始指南