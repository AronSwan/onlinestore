# TiDB 分布式集群部署指南

## 概述
本指南介绍如何在本地环境部署 TiDB 分布式集群，替代 TiDB Cloud 方案，适用于开发和生产环境。

## 架构组件
- **PD (Placement Driver)**: 集群元数据管理
- **TiKV**: 分布式 KV 存储引擎  
- **TiDB**: SQL 层，兼容 MySQL 协议
- **TiFlash**: 列式存储引擎（可选）

## 快速部署（单机模拟集群）

### 1. 使用 TiUP 部署工具

```bash
# 安装 TiUP
curl --proto '=https' --tlsv1.2 -sSf https://tiup-mirrors.pingcap.com/install.sh | sh
source ~/.bashrc

# 部署本地测试集群
tiup playground --db 2 --pd 3 --kv 3 --monitor

# 或指定版本
tiup playground v7.5.0 --db 2 --pd 3 --kv 3
```

### 2. 集群信息
- **TiDB 连接**: `127.0.0.1:4000` (用户: root, 密码: 空)
- **监控面板**: `http://127.0.0.1:3000` (Grafana)
- **PD Dashboard**: `http://127.0.0.1:2379/dashboard`

## 生产环境部署

### 1. 准备拓扑配置文件

```yaml
# tidb-cluster.yaml
global:
  user: "tidb"
  ssh_port: 22
  deploy_dir: "/tidb-deploy"
  data_dir: "/tidb-data"

pd_servers:
  - host: 10.0.1.1
  - host: 10.0.1.2  
  - host: 10.0.1.3

tidb_servers:
  - host: 10.0.1.4
    port: 4000
    status_port: 10080
  - host: 10.0.1.5
    port: 4000
    status_port: 10080

tikv_servers:
  - host: 10.0.1.6
    port: 20160
    status_port: 20180
  - host: 10.0.1.7
    port: 20160
    status_port: 20180
  - host: 10.0.1.8
    port: 20160
    status_port: 20180

monitoring_servers:
  - host: 10.0.1.9

grafana_servers:
  - host: 10.0.1.9
```

### 2. 部署集群

```bash
# 检查环境
tiup cluster check tidb-cluster.yaml --user root

# 部署集群
tiup cluster deploy tidb-prod v7.5.0 tidb-cluster.yaml --user root

# 启动集群
tiup cluster start tidb-prod

# 查看集群状态
tiup cluster display tidb-prod
```

## 数据库配置

### 1. 创建应用数据库

```sql
-- 连接到 TiDB
mysql -h 127.0.0.1 -P 4000 -u root

-- 创建数据库
CREATE DATABASE caddy_shopping_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建应用用户
CREATE USER 'caddy_app'@'%' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON caddy_shopping_db.* TO 'caddy_app'@'%';
FLUSH PRIVILEGES;
```

### 2. 优化配置

```sql
-- 设置时区
SET GLOBAL time_zone = '+08:00';

-- 优化连接数
SET GLOBAL max_connections = 2000;

-- 启用慢查询日志
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
```

## 应用配置

### 1. 环境变量配置

```bash
# .env.tidb-local
DB_TYPE=mysql
DB_HOST=127.0.0.1
DB_PORT=4000
DB_USERNAME=caddy_app
DB_PASSWORD=your_secure_password
DB_DATABASE=caddy_shopping_db

# TiDB 特定配置
DB_CHARSET=utf8mb4
DB_TIMEZONE=+08:00
DB_POOL_SIZE=20
DB_CONNECTION_TIMEOUT=60000
DB_ACQUIRE_TIMEOUT=60000
DB_IDLE_TIMEOUT=300000

# 连接池配置
DB_MAX_CONNECTIONS=20
DB_MIN_CONNECTIONS=5
DB_IDLE_TIMEOUT_MILLIS=300000
DB_CONNECTION_TIMEOUT_MILLIS=60000
```

### 2. TypeORM 配置调整

```typescript
// src/config/typeorm-tidb.config.ts
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export const createTiDBDataSource = (configService: ConfigService) => {
  return new DataSource({
    type: 'mysql',
    host: configService.get('DB_HOST', '127.0.0.1'),
    port: configService.get('DB_PORT', 4000),
    username: configService.get('DB_USERNAME', 'caddy_app'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_DATABASE', 'caddy_shopping_db'),
    
    // TiDB 优化配置
    charset: 'utf8mb4',
    timezone: '+08:00',
    
    // 连接池配置
    poolSize: configService.get('DB_POOL_SIZE', 20),
    acquireTimeout: configService.get('DB_ACQUIRE_TIMEOUT', 60000),
    timeout: configService.get('DB_CONNECTION_TIMEOUT', 60000),
    
    // 实体和迁移
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    
    // 开发环境配置
    synchronize: false,
    logging: configService.get('NODE_ENV') === 'development' ? ['query', 'error'] : ['error'],
    
    // TiDB 兼容性配置
    extra: {
      connectionLimit: 20,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true,
      // TiDB 不支持外键约束
      supportBigNumbers: true,
      bigNumberStrings: true,
    },
  });
};
```

## 监控和维护

### 1. 集群监控

```bash
# 查看集群状态
tiup cluster display tidb-prod

# 查看组件日志
tiup cluster logs tidb-prod tidb

# 重启组件
tiup cluster restart tidb-prod -R tidb

# 扩容节点
tiup cluster scale-out tidb-prod scale-out.yaml
```

### 2. 性能监控

- **Grafana 面板**: `http://监控节点:3000`
- **TiDB Dashboard**: `http://PD节点:2379/dashboard`
- **关键指标**: QPS、延迟、连接数、存储使用率

### 3. 备份策略

```bash
# 使用 BR 工具备份
tiup br backup full --pd "127.0.0.1:2379" --storage "local:///backup/full-$(date +%Y%m%d)"

# 定时备份脚本
#!/bin/bash
BACKUP_DIR="/backup/$(date +%Y%m%d_%H%M%S)"
tiup br backup full --pd "127.0.0.1:2379" --storage "local://$BACKUP_DIR"
```

## 故障排查

### 1. 常见问题

```bash
# 检查集群健康状态
tiup cluster check tidb-prod

# 查看错误日志
tail -f /tidb-deploy/tidb-4000/log/tidb.log

# 检查网络连通性
telnet PD_IP 2379
```

### 2. 性能优化

```sql
-- 查看慢查询
SELECT * FROM INFORMATION_SCHEMA.SLOW_QUERY 
WHERE Time > '2024-01-01 00:00:00' 
ORDER BY Query_time DESC LIMIT 10;

-- 分析表统计信息
ANALYZE TABLE your_table_name;

-- 查看执行计划
EXPLAIN ANALYZE SELECT * FROM your_table WHERE condition;
```

## 迁移指南

### 1. 从 MySQL 迁移

```bash
# 使用 DM 工具迁移
tiup dm deploy dm-cluster dm-topology.yaml --user root
tiup dm start-task task.yaml
```

### 2. 数据同步验证

```sql
-- 检查数据一致性
SELECT COUNT(*) FROM source_table;
SELECT COUNT(*) FROM target_table;

-- 验证关键业务数据
SELECT * FROM orders WHERE created_at > '2024-01-01' LIMIT 10;
```

## 安全配置

### 1. 启用 TLS

```yaml
# 在拓扑文件中启用 TLS
global:
  enable_tls: true
  
server_configs:
  tidb:
    security.ssl-cert: "/path/to/tidb-server.crt"
    security.ssl-key: "/path/to/tidb-server.key"
    security.ssl-ca: "/path/to/ca.crt"
```

### 2. 访问控制

```sql
-- 创建只读用户
CREATE USER 'readonly'@'%' IDENTIFIED BY 'readonly_password';
GRANT SELECT ON caddy_shopping_db.* TO 'readonly'@'%';

-- 限制连接来源
CREATE USER 'app_user'@'10.0.1.%' IDENTIFIED BY 'app_password';
```

## 总结

TiDB 分布式部署提供了：
- **高可用性**: 多副本自动故障转移
- **水平扩展**: 按需增加节点
- **MySQL 兼容**: 无需修改应用代码
- **ACID 事务**: 强一致性保证
- **实时分析**: TiFlash 列式存储

建议在开发环境使用 `tiup playground`，生产环境使用完整集群部署。