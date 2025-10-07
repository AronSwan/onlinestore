# 部署和运维操作指南

## 📋 概述

本文档提供后端系统的完整部署和运维指南。**重要提示**：生产环境采用分布式部署架构，使用TiDB数据库，基于Kubernetes容器编排平台。

## 🛠️ 环境要求

### 系统要求
- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+
- **内存**: 最低4GB，推荐8GB+
- **存储**: 最低20GB SSD
- **网络**: 稳定的互联网连接

### 软件依赖
- **Node.js**: 20.x LTS 版本
- **数据库**: TiDB 7.5+（生产环境分布式集群），MySQL 8.0+（开发环境）
- **Redis**: 7.0+ 集群版本
- **Nginx**: 1.18+（负载均衡和反向代理）
- **Kubernetes**: 1.28+（容器编排，生产环境可选）

## 🚀 快速部署

### 1. 传统部署方式

#### 环境准备
```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# 安装Redis
sudo apt install redis-server -y
sudo systemctl enable redis-server
```

#### 应用部署
```bash
# 克隆代码
git clone https://github.com/your-org/caddy-style-shopping-site.git
cd caddy-style-shopping-site/backend

# 安装依赖
npm install --production

# 配置环境变量
cp .env.example .env
# 编辑.env文件，配置数据库和Redis连接

# 构建应用
npm run build

# 启动应用
npm run start:prod
```

### 2. 分布式部署架构（生产环境）

#### 架构说明
- **数据库层**: TiDB集群，支持水平扩展和高可用
- **应用层**: 多节点负载均衡，支持弹性伸缩
- **缓存层**: Redis集群，提供高性能缓存服务
- **负载均衡**: Nginx/HAProxy实现流量分发

#### 部署要点
- **TiDB集群部署**: 至少3个PD节点、3个TiKV节点、2个TiDB节点
- **应用层分布式**: 多节点负载均衡，支持水平扩展
- **Redis集群**: 主从复制，哨兵模式或集群模式
- **服务发现**: 使用Consul或类似工具实现服务注册发现
- **监控告警**: 集成Prometheus + Grafana监控体系
- **日志收集**: ELK/EFK栈实现分布式日志管理

## ⚙️ 环境配置

### 生产环境配置 (.env)
```env
# 应用配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 数据库配置（TiDB集群）
DB_HOST=tidb-cluster.example.com  # TiDB集群负载均衡地址
DB_PORT=4000                     # TiDB默认端口
DB_USERNAME=caddy_user
DB_PASSWORD=secure_password
DB_DATABASE=caddy_shopping
DB_POOL_SIZE=200
# TiDB连接参数
DB_CONNECTION_TIMEOUT=30000
DB_ACQUIRE_TIMEOUT=60000
DB_REAP_INTERVAL=300000

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
REDIS_POOL_SIZE=100

# JWT配置
JWT_SECRET=your_super_secure_jwt_secret
JWT_EXPIRES_IN=24h

# 限流配置
THROTTLER_LIMIT=5000
THROTTLER_TTL=60

# 邮件配置（可选）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# 文件上传配置
UPLOAD_MAX_SIZE=10mb
UPLOAD_PATH=./uploads
```

### Nginx反向代理配置
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL证书配置
    ssl_certificate /etc/ssl/certs/your-domain.com.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    
    # 安全头（生产环境严格配置）
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self';";
    
    # 反向代理到后端服务
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 📊 监控和维护

### 健康检查
系统提供以下健康检查端点：

```bash
# 基础健康检查
curl http://localhost:3000/health

# 详细系统状态
curl http://localhost:3000/health/status

# 数据库连接检查
curl http://localhost:3000/health/database

# Redis连接检查
curl http://localhost:3000/health/redis
```

### 日志管理

#### 日志文件位置
- 应用日志: `./logs/app.log`
- 错误日志: `./logs/error.log`
- 访问日志: `./logs/access.log`

#### 日志轮转配置
```bash
# 使用logrotate配置
sudo nano /etc/logrotate.d/caddy-backend

# 配置内容
/path/to/backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
```

### 性能监控

#### 使用PM2管理进程
```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start dist/main.js --name "caddy-backend"

# 监控应用
pm2 monit

# 查看日志
pm2 logs caddy-backend

# 重启应用
pm2 restart caddy-backend

# 保存配置
pm2 save
pm2 startup
```

#### 系统监控脚本
```bash
#!/bin/bash
# monitoring.sh

# 检查服务状态
if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "$(date): 后端服务异常，尝试重启..." >> /var/log/caddy-monitor.log
    pm2 restart caddy-backend
fi

# 检查磁盘空间
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "$(date): 磁盘使用率超过90%" >> /var/log/caddy-monitor.log
fi

# 检查内存使用
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEM_USAGE -gt 85 ]; then
    echo "$(date): 内存使用率超过85%" >> /var/log/caddy-monitor.log
fi
```

## 🔄 备份和恢复

### TiDB集群备份和恢复

#### 使用BR工具备份（推荐）
```bash
#!/bin/bash
# backup-tidb-cluster.sh

BACKUP_DIR="/backup/tidb"
DATE=$(date +%Y%m%d_%H%M%S)
CLUSTER_NAME="caddy-tidb-cluster"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 使用BR工具进行全量备份
br backup full \
    --pd "pd1:2379,pd2:2379,pd3:2379" \
    --storage "local://$BACKUP_DIR/full_backup_${DATE}" \
    --ratelimit 100 \
    --log-file "$BACKUP_DIR/backup_${DATE}.log"

# 增量备份（日常使用）
br backup incremental \
    --pd "pd1:2379,pd2:2379,pd3:2379" \
    --storage "local://$BACKUP_DIR/inc_backup_${DATE}" \
    --lastbackupts $(cat $BACKUP_DIR/last_backup_timestamp) \
    --ratelimit 50

# 记录备份时间戳
echo $(date +%s) > $BACKUP_DIR/last_backup_timestamp

echo "TiDB集群备份完成: $BACKUP_DIR/full_backup_${DATE}"
```

#### TiDB集群恢复
```bash
#!/bin/bash
# restore-tidb-cluster.sh

BACKUP_DIR="/backup/tidb"
RESTORE_DATE="20250930_120000"  # 指定恢复时间点

# 停止应用服务（防止数据写入）
systemctl stop caddy-backend

# 使用BR工具恢复
br restore full \
    --pd "pd1:2379,pd2:2379,pd3:2379" \
    --storage "local://$BACKUP_DIR/full_backup_${RESTORE_DATE}" \
    --ratelimit 100

# 启动应用服务
systemctl start caddy-backend

echo "TiDB集群恢复完成"
```

### Redis备份
```bash
#!/bin/bash
# backup-redis.sh

BACKUP_DIR="/backup/redis"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份Redis
redis-cli SAVE
cp /var/lib/redis/dump.rdb $BACKUP_DIR/redis_${DATE}.rdb

echo "Redis备份完成: redis_${DATE}.rdb"
```

## 🚨 故障恢复

### 服务重启流程
```bash
# 1. 停止服务
pm2 stop caddy-backend

# 2. 备份当前状态
pm2 save

# 3. 检查日志
tail -100 /path/to/logs/error.log

# 4. 修复问题后重启
pm2 start caddy-backend

# 5. 验证服务状态
curl -f http://localhost:3000/health
```

### 数据库恢复
```bash
# 恢复最新备份
zcat /backup/mysql/caddy_shopping_20250930.sql.gz | mysql -u root -p caddy_shopping

# 验证数据完整性
mysql -u root -p -e "USE caddy_shopping; SELECT COUNT(*) FROM users;"
```

## 📈 性能优化和监控

### TiDB集群性能优化

#### 1. 分布式查询优化
```sql
-- 分区表设计（大表分区）
CREATE TABLE orders (
    id BIGINT AUTO_INCREMENT,
    user_id BIGINT,
    order_date DATE,
    -- 其他字段...
    PRIMARY KEY (id, order_date)
) PARTITION BY RANGE COLUMNS (order_date) (
    PARTITION p202501 VALUES LESS THAN ('2025-02-01'),
    PARTITION p202502 VALUES LESS THAN ('2025-03-01'),
    PARTITION p202503 VALUES LESS THAN ('2025-04-01')
);

-- TiDB特有的优化提示
SELECT /*+ READ_FROM_STORAGE(TIKV[t]) */ * FROM large_table t WHERE condition;

-- 避免热点写入（使用AUTO_RANDOM）
CREATE TABLE user_sessions (
    id BIGINT AUTO_RANDOM(5) PRIMARY KEY,
    user_id BIGINT,
    session_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. 分布式系统监控配置

##### Prometheus监控配置
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'tidb'
    static_configs:
      - targets: ['tidb1:10080', 'tidb2:10080', 'tidb3:10080']
    metrics_path: /metrics
  
  - job_name: 'tikv'
    static_configs:
      - targets: ['tikv1:20180', 'tikv2:20180', 'tikv3:20180']
    metrics_path: /metrics
  
  - job_name: 'pd'
    static_configs:
      - targets: ['pd1:2379', 'pd2:2379', 'pd3:2379']
    metrics_path: /metrics
  
  - job_name: 'application'
    static_configs:
      - targets: ['app1:3000', 'app2:3000', 'app3:3000']
    metrics_path: '/metrics'
```

##### Grafana监控面板
关键监控指标：
- **TiDB集群**: QPS、连接数、慢查询、CPU使用率
- **TiKV存储**: IO吞吐、Region分布、存储使用
- **PD调度**: 调度操作、Leader分布、存储平衡
- **应用层**: 响应时间、错误率、并发连接数

#### 3. 分布式缓存优化（Redis集群）
```yaml
# redis-cluster配置
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 15000
cluster-require-full-coverage no

# 应用层缓存策略
@Cacheable({
  cacheNames: 'products',
  key: '#id',
  unless: '#result == null'
})
async findProductById(id: number) {
  return this.productRepository.findOne({ where: { id } });
}
```

### 应用层优化
```typescript
// 启用集群模式
const numCPUs = require('os').cpus().length;
if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // 工作进程代码
}
```

## 🔒 安全加固和高可用性

### 分布式系统安全配置

#### 1. 网络安全策略
```bash
# 防火墙规则（生产环境）
# 只允许内部网络访问数据库端口
iptables -A INPUT -p tcp --dport 4000 -s 10.0.0.0/8 -j ACCEPT  # TiDB内部访问
iptables -A INPUT -p tcp --dport 4000 -j DROP                    # 外部禁止访问

# Redis集群端口限制
iptables -A INPUT -p tcp --dport 6379 -s 10.0.0.0/8 -j ACCEPT   # Redis内部访问
iptables -A INPUT -p tcp --dport 16379 -s 10.0.0.0/8 -j ACCEPT  # Redis集群总线

# 应用服务端口
iptables -A INPUT -p tcp --dport 3000 -j ACCEPT                 # 应用服务
```

#### 2. TiDB集群安全配置
```sql
-- 创建最小权限用户
CREATE USER 'caddy_app'@'10.0.%' IDENTIFIED BY 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON caddy_shopping.* TO 'caddy_app'@'10.0.%';

-- 启用TLS加密连接
SET GLOBAL ssl_cert = '/path/to/server-cert.pem';
SET GLOBAL ssl_key = '/path/to/server-key.pem';
SET GLOBAL require_secure_transport = ON;
```

### 高可用性配置

#### 1. 负载均衡配置（HAProxy）
```bash
# haproxy.cfg
global
    daemon
    maxconn 4096

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

frontend http-in
    bind *:80
    bind *:443 ssl crt /etc/ssl/private/domain.pem
    default_backend servers

backend servers
    balance roundrobin
    option httpchk GET /health
    server app1 10.0.1.10:3000 check inter 2000 rise 2 fall 3
    server app2 10.0.1.11:3000 check inter 2000 rise 2 fall 3
    server app3 10.0.1.12:3000 check inter 2000 rise 2 fall 3
```

#### 2. 服务自动恢复脚本
```bash
#!/bin/bash
# service-monitor.sh

SERVICES=("caddy-backend" "nginx" "redis-server")

check_service() {
    local service=$1
    if ! systemctl is-active --quiet $service; then
        echo "$(date): $service 服务异常，尝试重启..." >> /var/log/service-monitor.log
        systemctl restart $service
        # 发送告警通知
        send_alert "$service 服务重启"
    fi
}

send_alert() {
    local message=$1
    # 发送邮件告警
    echo "$message" | mail -s "服务告警" admin@example.com
    # 发送Slack通知
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"$message\"}" \
        https://hooks.slack.com/services/your-webhook-url
}

# 主监控循环
while true; do
    for service in "${SERVICES[@]}"; do
        check_service $service
    done
    sleep 60
done
```

### 灾难恢复计划

#### 1. 全站灾难恢复流程
```bash
#!/bin/bash
# disaster-recovery.sh

# 1. 停止所有服务
systemctl stop caddy-backend
systemctl stop nginx
systemctl stop redis-server

# 2. 恢复最新备份
./restore-tidb-cluster.sh
./restore-redis-cluster.sh

# 3. 验证数据完整性
mysql -h tidb-cluster -P 4000 -u caddy_app -p -e "
    USE caddy_shopping;
    SELECT '用户表记录数:', COUNT(*) FROM users;
    SELECT '商品表记录数:', COUNT(*) FROM products;
    SELECT '订单表记录数:', COUNT(*) FROM orders;
"

# 4. 启动服务（按依赖顺序）
systemctl start redis-server
sleep 10
systemctl start caddy-backend
sleep 30
systemctl start nginx

# 5. 健康检查
curl -f https://your-domain.com/health || exit 1
```

#### 2. 数据一致性验证
```sql
-- 定期数据一致性检查
CREATE EVENT check_data_consistency
ON SCHEDULE EVERY 1 DAY
DO
BEGIN
    -- 检查关键业务数据一致性
    SELECT 
        (SELECT COUNT(*) FROM users) as user_count,
        (SELECT COUNT(*) FROM user_profiles) as profile_count,
        (SELECT COUNT(*) FROM products) as product_count,
        (SELECT COUNT(*) FROM orders) as order_count;
    
    -- 记录检查结果
    INSERT INTO system_checks (check_type, result, checked_at)
    VALUES ('data_consistency', 'PASS', NOW());
END;
```

### 运维最佳实践

#### 1. 变更管理流程
- **代码部署**: 蓝绿部署或金丝雀发布
- **数据库变更**: 使用Flyway或类似工具管理迁移脚本
- **配置变更**: 版本控制所有配置文件
- **回滚策略**: 确保每次变更都有可回滚方案

#### 2. 容量规划
- **TiDB集群**: 监控Region数量和存储使用率
- **应用层**: 监控CPU、内存、网络使用率
- **缓存层**: 监控内存使用和命中率
- **存储层**: 监控磁盘空间和IO性能

#### 3. 性能调优检查清单
- [ ] TiDB参数优化（tidb_mem_quota_query等）
- [ ] 索引优化和统计信息更新
- [ ] 连接池配置优化
- [ ] 缓存策略有效性验证
- [ ] 慢查询分析和优化

### 防火墙配置
```bash
# 只开放必要端口
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 3000  # 后端服务（内网）
sudo ufw enable
```

## 📞 运维联系方式

### 值班安排
- **工作日**: 09:00-18:00 技术支持
- **紧急情况**: 24/7 值班电话

### 问题上报流程
1. 检查服务状态和日志
2. 尝试基础故障排除
3. 联系技术支持团队
4. 记录问题和处理过程

---

**最后更新**: 2025-09-30  
**文档版本**: v1.0.0

## 📦 核心依赖

本项目使用以下核心依赖：


- **@nestjs/core**: `^10.4.20`

- **typeorm**: `^0.3.30`

- **ioredis**: `^5.9.0`

- **@nestjs/jwt**: `^11.0.0`
