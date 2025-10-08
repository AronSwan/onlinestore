# OpenObserve部署和监控指南

## 1. 概述

本指南详细说明了如何部署和监控OpenObserve集成的电商网站日志收集和分析系统。

## 2. 环境准备

### 2.1 系统要求

- **CPU**: 2核以上
- **内存**: 4GB以上
- **存储**: 20GB以上可用空间
- **操作系统**: Linux、macOS或Windows (支持Docker)

### 2.2 软件依赖

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (用于本地开发)
- Git

## 3. 快速部署

### 3.1 克隆项目

```bash
git clone <repository-url>
cd <project-directory>
```

### 3.2 配置环境变量

```bash
# 复制环境变量模板
cp backend/.env.example backend/.env

# 编辑环境变量
nano backend/.env
```

确保以下OpenObserve相关配置正确设置：

```bash
# OpenObserve配置
OPENOBSERVE_URL=http://localhost:5080
OPENOBSERVE_ORGANIZATION=caddy-shopping
OPENOBSERVE_TOKEN=your-openobserve-token

# OpenObserve数据流配置
OPENOBSERVE_STREAM_APPLICATION_LOGS=application-logs
OPENOBSERVE_STREAM_BUSINESS_EVENTS=business-events
OPENOBSERVE_STREAM_USER_BEHAVIOR=user-behavior
OPENOBSERVE_STREAM_METRICS=metrics
OPENOBSERVE_STREAM_TRACES=traces

# OpenObserve性能配置
OPENOBSERVE_BATCH_SIZE=100
OPENOBSERVE_FLUSH_INTERVAL=5000
OPENOBSERVE_MAX_RETRIES=3
OPENOBSERVE_TIMEOUT=30000

# OpenObserve追踪配置
OPENOBSERVE_TRACING_ENABLED=true
OPENOBSERVE_TRACING_SAMPLING_RATE=0.1

# OpenObserve告警配置
OPENOBSERVE_ALERTS_ENABLED=true
OPENOBSERVE_ALERTS_EVALUATION_INTERVAL=60
```

### 3.3 启动服务

```bash
# 使用Docker Compose启动OpenObserve和相关服务
docker-compose -f docker-compose.openobserve.yml up -d

# 查看服务状态
docker-compose -f docker-compose.openobserve.yml ps

# 查看日志
docker-compose -f docker-compose.openobserve.yml logs -f
```

### 3.4 验证部署

1. **访问OpenObserve界面**
   - 打开浏览器访问: http://localhost:5080
   - 使用默认账户登录: admin@example.com / Complexpass#123

2. **访问应用健康检查**
   - 打开浏览器访问: http://localhost:3000/health
   - 应该返回: `{"status":"ok","timestamp":"..."}`

3. **测试日志API**
   ```bash
   # 测试业务日志记录
   curl -X POST http://localhost:3000/api/logging/user-action \
     -H "Content-Type: application/json" \
     -d '{"action":"LOGIN","userId":"test123","metadata":{"ip":"192.168.1.1"}}'
   
   # 测试用户行为追踪
   curl -X POST http://localhost:3000/api/logging/page-view \
     -H "Content-Type: application/json" \
     -d '{"sessionId":"session123","page":"/home","userId":"test123"}'
   ```

## 4. 生产环境部署

### 4.1 安全配置

1. **更改默认密码**
   ```bash
   # 登录OpenObserve后，立即更改默认管理员密码
   ```

2. **配置HTTPS**
   ```yaml
   # 在docker-compose.yml中添加HTTPS配置
   openobserve:
     # ...其他配置
     environment:
       - ZO_HTTPS_ENABLED=true
       - ZO_HTTPS_PORT=6443
     ports:
       - "6443:6443"
   ```

3. **配置防火墙**
   ```bash
   # 只开放必要的端口
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw allow 5080/tcp # OpenObserve (可选)
   ```

### 4.2 性能优化

1. **调整资源限制**
   ```yaml
   # 在docker-compose.yml中调整资源限制
   openobserve:
     # ...其他配置
     deploy:
       resources:
         limits:
           cpus: '2.0'
           memory: 4G
         reservations:
           cpus: '1.0'
           memory: 2G
   ```

2. **配置数据持久化**
   ```yaml
   # 确保数据持久化到合适的位置
   volumes:
     - /opt/openobserve/data:/data
     - /opt/openobserve/logs:/logs
   ```

3. **设置日志轮转**
   ```yaml
   # 在docker-compose.yml中添加日志配置
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

### 4.3 备份策略

1. **数据备份**
   ```bash
   # 创建备份脚本
   cat > backup-openobserve.sh << 'EOF'
   #!/bin/bash
   DATE=$(date +%Y%m%d%H%M%S)
   docker exec openobserve tar czf /tmp/backup_$DATE.tar.gz /data
   docker cp openobserve:/tmp/backup_$DATE.tar.gz /opt/backups/
   ```

2. **自动备份**
   ```bash
   # 添加到crontab
   crontab -e
   # 添加以下行，每天凌晨2点备份
   0 2 * * * /opt/scripts/backup-openobserve.sh
   ```

## 5. 监控和告警

### 5.1 系统监控

1. **资源使用监控**
   ```bash
   # 查看容器资源使用情况
   docker stats
   
   # 查看磁盘使用情况
   df -h
   
   # 查看内存使用情况
   free -h
   ```

2. **服务健康检查**
   ```bash
   # 创建健康检查脚本
   cat > health-check.sh << 'EOF'
   #!/bin/bash
   # 检查OpenObserve服务
   curl -f http://localhost:5080/health || exit 1
   
   # 检查应用服务
   curl -f http://localhost:3000/health || exit 1
   
   echo "All services are healthy"
   EOF
   ```

### 5.2 日志监控

1. **查看应用日志**
   ```bash
   # 查看应用日志
   docker-compose -f docker-compose.openobserve.yml logs -f app
   
   # 查看OpenObserve日志
   docker-compose -f docker-compose.openobserve.yml logs -f openobserve
   ```

2. **日志分析**
   - 在OpenObserve界面中创建仪表板
   - 设置关键指标监控
   - 配置异常告警

### 5.3 告警配置

1. **OpenObserve告警设置**
   ```sql
   -- 创建告警规则示例
   SELECT 
     level,
     category,
     COUNT(*) as error_count
   FROM business-events 
   WHERE timestamp >= now() - interval '1 hour'
     AND level = 'ERROR'
   GROUP BY level, category
   HAVING error_count > 10
   ```

2. **配置通知渠道**
   - 配置邮件通知
   - 配置Webhook通知
   - 配置Slack通知

## 6. 故障排除

### 6.1 常见问题

1. **服务无法启动**
   ```bash
   # 检查端口占用
   netstat -tulpn | grep :5080
   
   # 检查Docker状态
   systemctl status docker
   
   # 检查磁盘空间
   df -h
   ```

2. **日志无法发送**
   ```bash
   # 检查网络连接
   curl -I http://localhost:5080
   
   # 检查认证令牌
   curl -H "Authorization: Bearer your-token" \
        http://localhost:5080/api/default/streams
   
   # 检查应用日志
   docker-compose -f docker-compose.openobserve.yml logs app | grep -i error
   ```

3. **性能问题**
   ```bash
   # 检查资源使用
   docker stats
   
   # 调整批处理大小和刷新间隔
   # 编辑 backend/.env
   OPENOBSERVE_BATCH_SIZE=50
   OPENOBSERVE_FLUSH_INTERVAL=3000
   ```

### 6.2 日志分析

1. **应用日志**
   - 位置: `./logs/app.log`
   - 包含: 业务事件、用户行为、系统事件

2. **OpenObserve日志**
   - 位置: Docker容器内 `/data/logs`
   - 包含: 系统日志、访问日志、错误日志

3. **Docker日志**
   - 位置: Docker日志驱动
   - 命令: `docker-compose logs`

## 7. 性能优化

### 7.1 应用优化

1. **批处理优化**
   ```bash
   # 调整批处理大小
   OPENOBSERVE_BATCH_SIZE=200
   
   # 调整刷新间隔
   OPENOBSERVE_FLUSH_INTERVAL=3000
   ```

2. **缓存优化**
   ```bash
   # 启用Redis缓存
   REDIS_HOST=redis
   REDIS_PORT=6379
   ```

3. **连接池优化**
   ```bash
   # 调整连接池大小
   OPENOBSERVE_MAX_RETRIES=5
   OPENOBSERVE_TIMEOUT=60000
   ```

### 7.2 数据库优化

1. **索引优化**
   ```sql
   -- 在OpenObserve中创建索引
   CREATE INDEX idx_timestamp ON business-events (timestamp);
   CREATE INDEX idx_user_id ON business-events (userId);
   ```

2. **分区优化**
   ```sql
   -- 按时间分区
   CREATE PARTITION TABLE business-events_y2023m01
   PARTITION OF business-events
   FOR VALUES FROM ('2023-01-01') TO ('2023-02-01');
   ```

## 8. 扩展和升级

### 8.1 水平扩展

1. **多实例部署**
   ```yaml
   # 在docker-compose.yml中配置多个应用实例
   app:
     # ...其他配置
     deploy:
       replicas: 3
   ```

2. **负载均衡**
   ```yaml
   # 添加Nginx负载均衡器
   nginx:
     image: nginx:alpine
     ports:
       - "80:80"
     volumes:
       - ./nginx.conf:/etc/nginx/nginx.conf
   ```

### 8.2 版本升级

1. **OpenObserve升级**
   ```bash
   # 拉取最新镜像
   docker pull public.ecr.aws/zinclabs/openobserve:latest
   
   # 重新创建容器
   docker-compose -f docker-compose.openobserve.yml up -d
   ```

2. **应用升级**
   ```bash
   # 构建新镜像
   docker build -t caddy-shopping-backend:latest .
   
   # 更新服务
   docker-compose -f docker-compose.openobserve.yml up -d
   ```

## 9. 安全最佳实践

### 9.1 访问控制

1. **用户权限管理**
   - 创建不同的用户角色
   - 分配最小必要权限
   - 定期审查用户权限

2. **网络安全**
   - 使用HTTPS加密通信
   - 配置防火墙规则
   - 限制内部服务访问

### 9.2 数据保护

1. **数据加密**
   - 启用传输加密
   - 启用存储加密
   - 定期更换加密密钥

2. **敏感信息处理**
   - 不记录敏感信息
   - 使用环境变量存储密钥
   - 定期轮换认证令牌

## 10. 总结

通过遵循本指南，您可以成功部署和监控一个完整的OpenObserve集成的电商网站日志收集和分析系统。定期检查系统状态，优化性能配置，并及时处理告警，可以确保系统的稳定运行。

如果您遇到任何问题，请参考故障排除部分或查看日志获取更多信息。