# OpenObserve故障排除和维护指南

## 1. 概述

本文档提供了OpenObserve监控系统的故障排除方法和维护流程，帮助运维人员快速诊断和解决常见问题，确保系统的稳定运行。

### 1.1 故障分类

- **系统故障**: 服务不可用、性能下降
- **数据故障**: 数据丢失、写入失败、查询异常
- **网络故障**: 连接问题、通信超时
- **配置故障**: 配置错误、权限问题

### 1.2 维护级别

- **日常维护**: 每日检查和监控
- **定期维护**: 每周和每月的维护任务
- **应急维护**: 突发问题的紧急处理

## 2. 故障诊断流程

### 2.1 问题识别

#### 2.1.1 监控指标检查

```bash
# 检查OpenObserve服务状态
docker ps | grep shopping-openobserve

# 检查服务健康状态
curl -f http://localhost:5080/health

# 检查系统资源使用
docker stats shopping-openobserve --no-stream
```

#### 2.1.2 日志分析

```bash
# 查看OpenObserve容器日志
docker logs shopping-openobserve --tail 100

# 查看系统日志
tail -f ./logs/openobserve/openobserve.log

# 查看错误日志
grep "ERROR" ./logs/openobserve/openobserve.log | tail -20
```

### 2.2 故障诊断检查清单

#### 2.2.1 基础检查

- [ ] OpenObserve容器是否正常运行
- [ ] 健康检查是否通过
- [ ] 端口5080是否可访问
- [ ] 磁盘空间是否充足
- [ ] 内存使用是否正常
- [ ] CPU使用是否正常

#### 2.2.2 网络检查

- [ ] 网络连接是否正常
- [ ] 防火墙规则是否正确
- [ ] DNS解析是否正常
- [ ] 负载均衡是否正常

#### 2.2.3 数据检查

- [ ] 数据写入是否正常
- [ ] 查询是否正常工作
- [ ] 数据索引是否正常
- [ ] 数据压缩是否正常

## 3. 常见故障及解决方案

### 3.1 服务启动失败

#### 3.1.1 问题现象

```bash
# 容器无法启动或立即退出
docker ps -a | grep shopping-openobserve
# 显示为 Exited 状态
```

#### 3.1.2 诊断步骤

```bash
# 1. 查看容器日志
docker logs shopping-openobserve

# 2. 检查配置文件
docker exec shopping-openobserve cat /etc/openobserve/config.yaml

# 3. 检查数据目录权限
docker exec shopping-openobserve ls -la /data

# 4. 检查端口占用
netstat -tulpn | grep 5080
```

#### 3.1.3 解决方案

**配置文件错误**:
```bash
# 重新生成配置文件
docker-compose -f docker-compose.openobserve.yml down
docker-compose -f docker-compose.openobserve.yml up -d
```

**权限问题**:
```bash
# 修复数据目录权限
sudo chown -R 1000:1000 ./data/openobserve
sudo chmod -R 755 ./data/openobserve
```

**端口冲突**:
```bash
# 修改端口配置
# 编辑 docker-compose.openobserve.yml
# 将 5080:5080 改为其他端口
```

### 3.2 查询性能问题

#### 3.2.1 问题现象

- 查询响应时间过长
- 查询超时
- 系统负载过高

#### 3.2.2 诊断步骤

```sql
-- 1. 检查慢查询
SELECT * FROM application_logs 
WHERE timestamp >= now() - INTERVAL '1 hour'
ORDER BY timestamp DESC 
LIMIT 10000;

-- 2. 检查查询计划
EXPLAIN SELECT * FROM application_logs 
WHERE level = 'ERROR' 
AND timestamp >= now() - INTERVAL '1 day';

-- 3. 检查索引使用情况
SHOW INDEX FROM application_logs;
```

#### 3.2.3 优化方案

**查询优化**:
```sql
-- 优化前：全表扫描
SELECT * FROM application_logs WHERE message LIKE '%error%';

-- 优化后：使用时间限制和索引
SELECT * FROM application_logs 
WHERE level = 'ERROR' 
AND timestamp >= now() - INTERVAL '1 hour'
ORDER BY timestamp DESC 
LIMIT 1000;
```

**索引优化**:
```sql
-- 创建复合索引
CREATE INDEX idx_logs_level_time ON application_logs(level, timestamp);

-- 创建服务索引
CREATE INDEX idx_logs_service_time ON application_logs(service, timestamp);
```

**系统优化**:
```yaml
# 增加缓存大小
memory:
  cache_enabled: true
  max_size: "4GB"
  cache_latest_files: true

# 优化查询配置
query:
  max_query_time: "5m"
  max_result_size: "500MB"
  max_concurrent_queries: 20
```

### 3.3 数据写入失败

#### 3.3.1 问题现象

- 数据无法写入OpenObserve
- 写入错误或超时
- 数据丢失

#### 3.3.2 诊断步骤

```bash
# 1. 检查数据流是否存在
curl -X GET http://localhost:5080/api/default/streams

# 2. 测试数据写入
curl -X POST http://localhost:5080/api/default/application-logs/_json \
  -H "Content-Type: application/json" \
  -d '{"logs": [{"timestamp": "2025-10-06T19:00:00Z", "level": "INFO", "message": "test"}]}'

# 3. 检查磁盘空间
df -h

# 4. 检查写入权限
docker exec shopping-openobserve ls -la /data
```

#### 3.3.3 解决方案

**数据流不存在**:
```bash
# 创建数据流
curl -X POST http://localhost:5080/api/default/streams \
  -H "Content-Type: application/json" \
  -d '{
    "name": "application-logs",
    "type": "logs",
    "retention": "30d"
  }'
```

**磁盘空间不足**:
```bash
# 清理过期数据
curl -X DELETE http://localhost:5080/api/default/application-logs/_delete \
  -H "Content-Type: application/json" \
  -d '{
    "start_time": "2023-01-01T00:00:00Z",
    "end_time": "2023-12-31T23:59:59Z"
  }'

# 扩展存储空间
# 增加Docker卷大小或清理其他数据
```

**写入权限问题**:
```bash
# 修复权限
sudo chown -R 1000:1000 ./data/openobserve
sudo chmod -R 755 ./data/openobserve
```

### 3.4 告警不触发

#### 3.4.1 问题现象

- 告警规则配置正确但不触发
- 通知发送失败
- 告警状态异常

#### 3.4.2 诊断步骤

```bash
# 1. 检查告警规则
curl -X GET http://localhost:5080/api/default/alerts

# 2. 检查告警状态
curl -X GET http://localhost:5080/api/default/alerts/{alert_id}/status

# 3. 测试告警条件
curl -X POST http://localhost:5080/api/default/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "sql": "SELECT count(*) FROM application-logs WHERE level = \"ERROR\" AND timestamp >= now() - INTERVAL \"5 minutes\""
    }
  }'

# 4. 检查通知配置
curl -X GET http://localhost:5080/api/default/notifications
```

#### 3.4.3 解决方案

**告警条件错误**:
```yaml
# 修正告警条件
name: "HighErrorRate"
condition: |
  SELECT count(*) as error_count 
  FROM application-logs 
  WHERE level='ERROR' 
  AND timestamp >= now() - INTERVAL '5 minutes' 
  GROUP BY time_bucket('1 minute', timestamp) 
  HAVING error_count > 10
```

**通知配置错误**:
```yaml
# 修正通知配置
name: "email"
type: "email"
enabled: true
config:
  smtp_host: "smtp.gmail.com"
  smtp_port: 587
  smtp_username: "your-email@gmail.com"
  smtp_password: "your-app-password"
  from: "alerts@yourdomain.com"
  to: ["admin@yourdomain.com"]
```

### 3.5 内存泄漏问题

#### 3.5.1 问题现象

- 内存使用持续增长
- 系统响应变慢
- 容器被OOM杀死

#### 3.5.2 诊断步骤

```bash
# 1. 监控内存使用
docker stats shopping-openobserve --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# 2. 检查内存映射
docker exec shopping-openobserve cat /proc/meminfo

# 3. 分析内存使用模式
docker exec shopping-openobserve pmap -x 1
```

#### 3.5.3 解决方案

**配置优化**:
```yaml
# 限制内存使用
environment:
  - ZO_MEMORY_CACHE_MAX_SIZE=1024
  - ZO_WAL_MEMORY_MAX_SIZE=512
  - ZO_MEMORY_MERGE_INTERVAL=300

# 启用垃圾回收
  - ZO_GC_ENABLED=true
  - ZO_GC_INTERVAL=300
```

**定期重启**:
```bash
# 设置定期重启策略
docker update --restart=unless-stopped shopping-openobserve

# 创建定期重启任务
echo "0 2 * * 0 docker restart shopping-openobserve" | crontab -
```

## 4. 预防性维护

### 4.1 日常维护任务

#### 4.1.1 每日检查清单

```bash
#!/bin/bash
# daily-check.sh - 每日检查脚本

echo "=== 每日系统检查 $(date) ==="

# 1. 检查服务状态
echo "1. 检查OpenObserve服务状态..."
if docker ps | grep -q shopping-openobserve; then
    echo "✓ OpenObserve服务正常"
else
    echo "❌ OpenObserve服务异常"
    # 发送告警
fi

# 2. 检查健康状态
echo "2. 检查健康状态..."
if curl -f http://localhost:5080/health > /dev/null 2>&1; then
    echo "✓ 健康检查通过"
else
    echo "❌ 健康检查失败"
fi

# 3. 检查磁盘空间
echo "3. 检查磁盘空间..."
disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -lt 80 ]; then
    echo "✓ 磁盘使用率: $disk_usage%"
else
    echo "❌ 磁盘使用率过高: $disk_usage%"
fi

# 4. 检查内存使用
echo "4. 检查内存使用..."
memory_usage=$(docker stats shopping-openobserve --no-stream --format "{{.MemPerc}}" | sed 's/%//')
if (( $(echo "$memory_usage < 85" | bc -l) )); then
    echo "✓ 内存使用率: $memory_usage%"
else
    echo "❌ 内存使用率过高: $memory_usage%"
fi

# 5. 检查数据写入
echo "5. 检查数据写入..."
recent_logs=$(curl -s -X POST http://localhost:5080/api/default/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "sql": "SELECT count(*) FROM application-logs WHERE timestamp >= now() - INTERVAL \"1 hour\""
    }
  }' | jq -r '.hits[0].count // 0')

if [ "$recent_logs" -gt 0 ]; then
    echo "✓ 最近1小时日志数量: $recent_logs"
else
    echo "❌ 最近1小时无日志数据"
fi

echo "=== 每日检查完成 ==="
```

#### 4.1.2 日志监控

```bash
# 监控错误日志
tail -f ./logs/openobserve/openobserve.log | grep --line-buffered "ERROR" | while read line; do
    echo "$(date): $line"
    # 发送告警通知
done

# 监控慢查询
tail -f ./logs/openobserve/openobserve.log | grep --line-buffered "slow query" | while read line; do
    echo "$(date): $line"
    # 记录到慢查询日志
done
```

### 4.2 每周维护任务

#### 4.2.1 性能优化

```bash
#!/bin/bash
# weekly-maintenance.sh - 每周维护脚本

echo "=== 每周维护任务 $(date) ==="

# 1. 清理过期数据
echo "1. 清理过期数据..."
# 清理超过保留期的数据
curl -X DELETE http://localhost:5080/api/default/application-logs/_delete \
  -H "Content-Type: application/json" \
  -d '{
    "end_time": "'$(date -d '30 days ago' -Iseconds)'"
  }'

# 2. 优化索引
echo "2. 优化索引..."
# 重建索引以提高查询性能
curl -X POST http://localhost:5080/api/default/application-logs/_optimize

# 3. 检查告警规则
echo "3. 检查告警规则..."
# 验证告警规则是否正常工作
curl -X GET http://localhost:5080/api/default/alerts | jq '.[] | select(.enabled == true)'

# 4. 更新仪表板
echo "4. 更新仪表板..."
# 刷新仪表板缓存
curl -X POST http://localhost:5080/api/default/dashboards/_refresh

# 5. 备份配置
echo "5. 备份配置..."
mkdir -p ./backups/$(date +%Y%m%d)
docker exec shopping-openobserve tar czf /tmp/config-backup.tar.gz /etc/openobserve
docker cp shopping-openobserve:/tmp/config-backup.tar.gz ./backups/$(date +%Y%m%d)/

echo "=== 每周维护完成 ==="
```

#### 4.2.2 容量规划

```bash
# 容量规划检查
echo "=== 容量规划分析 ==="

# 检查数据增长趋势
echo "1. 数据增长趋势..."
curl -s -X POST http://localhost:5080/api/default/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "sql": "SELECT time_bucket(\"1 day\", timestamp) as day, COUNT(*) as count FROM application-logs WHERE timestamp >= now() - INTERVAL \"7 days\" GROUP BY day ORDER BY day DESC"
    }
  }' | jq -r '.hits[] | "\(.day): \(.count) 条记录"'

# 估算存储需求
echo "2. 存储需求估算..."
current_size=$(docker exec shopping-openobserve du -sh /data | cut -f1)
echo "当前存储使用: $current_size"

# 预测未来30天需求
daily_growth=$(curl -s -X POST http://localhost:5080/api/default/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "sql": "SELECT COUNT(*) FROM application-logs WHERE timestamp >= now() - INTERVAL \"1 day\""
    }
  }' | jq -r '.hits[0].count')

echo "每日新增记录: $daily_growth"
echo "预计30天后存储需求: $(echo "$current_size * 1.3" | bc)"
```

### 4.3 每月维护任务

#### 4.3.1 系统健康评估

```bash
#!/bin/bash
# monthly-health-check.sh - 每月健康检查

echo "=== 每月系统健康评估 $(date) ==="

# 1. 性能基准测试
echo "1. 性能基准测试..."
start_time=$(date +%s.%N)
curl -s -X POST http://localhost:5080/api/default/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "sql": "SELECT * FROM application-logs WHERE timestamp >= now() - INTERVAL \"1 hour\" LIMIT 1000"
    }
  }' > /dev/null
end_time=$(date +%s.%N)
query_time=$(echo "$end_time - $start_time" | bc)
echo "查询响应时间: ${query_time}秒"

# 2. 数据完整性检查
echo "2. 数据完整性检查..."
# 检查是否有数据丢失
total_records=$(curl -s -X POST http://localhost:5080/api/default/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "sql": "SELECT COUNT(*) FROM application-logs WHERE timestamp >= now() - INTERVAL \"1 day\""
    }
  }' | jq -r '.hits[0].count')

echo "24小时记录总数: $total_records"

# 3. 安全审计
echo "3. 安全审计..."
# 检查异常登录
docker logs shopping-openobserve --since="30d" | grep "authentication" | tail -10

# 4. 备份验证
echo "4. 备份验证..."
if [ -f "./backups/$(date +%Y%m%d)/config-backup.tar.gz" ]; then
    echo "✓ 配置备份存在"
else
    echo "❌ 配置备份缺失"
fi

echo "=== 每月健康评估完成 ==="
```

## 5. 应急响应流程

### 5.1 故障等级定义

| 等级 | 描述 | 响应时间 | 解决时间 |
|------|------|----------|----------|
| P0 | 系统完全不可用 | 5分钟 | 1小时 |
| P1 | 核心功能严重受损 | 15分钟 | 4小时 |
| P2 | 部分功能异常 | 1小时 | 24小时 |
| P3 | 性能下降 | 4小时 | 72小时 |

### 5.2 应急响应检查清单

#### 5.2.1 P0级故障（系统完全不可用）

**立即行动（5分钟内）**:
- [ ] 确认故障范围和影响
- [ ] 通知应急响应团队
- [ ] 启动应急响应流程

**初步诊断（15分钟内）**:
- [ ] 检查容器状态
- [ ] 检查网络连接
- [ ] 检查系统资源
- [ ] 查看最近的错误日志

**紧急处理（30分钟内）**:
- [ ] 尝试重启服务
- [ ] 切换到备用系统（如果有）
- [ ] 执行回滚操作（如果需要）

#### 5.2.2 P1级故障（核心功能严重受损）

**快速响应（15分钟内）**:
- [ ] 确认故障现象
- [ ] 评估业务影响
- [ ] 通知相关团队

**问题诊断（1小时内）**:
- [ ] 分析错误日志
- [ ] 检查配置变更
- [ ] 测试相关功能

**临时处理（4小时内）**:
- [ ] 实施临时解决方案
- [ ] 监控系统状态
- [ ] 准备永久修复方案

### 5.3 应急脚本

#### 5.3.1 快速重启脚本

```bash
#!/bin/bash
# emergency-restart.sh - 紧急重启脚本

echo "=== 紧急重启OpenObserve $(date) ==="

# 1. 备份当前状态
echo "1. 备份当前状态..."
docker exec shopping-openobserve tar czf /tmp/emergency-backup.tar.gz /data
docker cp shopping-openobserve:/tmp/emergency-backup.tar.gz ./emergency-backup-$(date +%Y%m%d-%H%M%S).tar.gz

# 2. 停止服务
echo "2. 停止OpenObserve服务..."
docker-compose -f docker-compose.openobserve.yml stop openobserve

# 3. 清理临时文件
echo "3. 清理临时文件..."
docker exec shopping-openobserve rm -rf /tmp/* 2>/dev/null || true

# 4. 重启服务
echo "4. 重启OpenObserve服务..."
docker-compose -f docker-compose.openobserve.yml start openobserve

# 5. 等待服务启动
echo "5. 等待服务启动..."
sleep 30

# 6. 验证服务状态
echo "6. 验证服务状态..."
if curl -f http://localhost:5080/health > /dev/null 2>&1; then
    echo "✓ OpenObserve服务恢复正常"
else
    echo "❌ OpenObserve服务仍异常，需要进一步处理"
fi

echo "=== 紧急重启完成 ==="
```

#### 5.3.2 故障收集脚本

```bash
#!/bin/bash
#故障收集脚本
# collect-diagnostic-info.sh - 故障信息收集

echo "=== 收集故障诊断信息 $(date) ==="

# 创建诊断目录
diag_dir="./diagnostic-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$diag_dir"

# 1. 收集系统信息
echo "1. 收集系统信息..."
echo "=== 系统信息 ===" > "$diag_dir/system-info.txt"
uname -a >> "$diag_dir/system-info.txt"
df -h >> "$diag_dir/system-info.txt"
free -h >> "$diag_dir/system-info.txt"
docker version >> "$diag_dir/system-info.txt"

# 2. 收集容器信息
echo "2. 收集容器信息..."
echo "=== 容器信息 ===" > "$diag_dir/container-info.txt"
docker ps -a >> "$diag_dir/container-info.txt"
docker stats --no-stream >> "$diag_dir/container-info.txt"

# 3. 收集OpenObserve日志
echo "3. 收集OpenObserve日志..."
docker logs shopping-openobserve --tail 1000 > "$diag_dir/openobserve.log"

# 4. 收集配置信息
echo "4. 收集配置信息..."
docker exec shopping-openobserve cat /etc/openobserve/config.yaml > "$diag_dir/config.yaml"

# 5. 收集网络信息
echo "5. 收集网络信息..."
netstat -tulpn | grep 5080 > "$diag_dir/network-info.txt"

# 6. 收集性能数据
echo "6. 收集性能数据..."
echo "=== 性能数据 ===" > "$diag_dir/performance-info.txt"
top -b -n 1 | head -20 >> "$diag_dir/performance-info.txt"
iostat -x 1 3 >> "$diag_dir/performance-info.txt"

echo "=== 诊断信息收集完成 ==="
echo "信息保存到: $diag_dir"

# 打包诊断信息
tar czf "$diag_dir.tar.gz" "$diag_dir"
echo "诊断信息已打包: $diag_dir.tar.gz"
```

## 6. 监控和告警

### 6.1 关键监控指标

#### 6.1.1 系统指标

- **CPU使用率**: < 80%
- **内存使用率**: < 85%
- **磁盘使用率**: < 90%
- **网络延迟**: < 100ms
- **磁盘I/O**: < 80%

#### 6.1.2 应用指标

- **查询响应时间**: P95 < 2秒
- **写入吞吐量**: > 1000条/秒
- **错误率**: < 0.1%
- **可用性**: > 99.9%
- **队列长度**: < 1000

### 6.2 告警规则配置

#### 6.2.1 系统告警

```yaml
# CPU使用率告警
name: "HighCPUUsage"
condition: |
  SELECT value FROM system-metrics 
  WHERE metric_name='cpu_usage_percent' 
  AND timestamp >= now() - INTERVAL '5 minutes' 
  ORDER BY timestamp DESC 
  LIMIT 1 
  HAVING value > 80
severity: "warning"
for: "5m"

# 内存使用率告警
name: "HighMemoryUsage"
condition: |
  SELECT value FROM system-metrics 
  WHERE metric_name='memory_usage_percent' 
  AND timestamp >= now() - INTERVAL '5 minutes' 
  ORDER BY timestamp DESC 
  LIMIT 1 
  HAVING value > 85
severity: "critical"
for: "5m"
```

#### 6.2.2 应用告警

```yaml
# 查询响应时间告警
name: "SlowQuery"
condition: |
  SELECT avg(duration) as avg_duration 
  FROM openobserve_metrics 
  WHERE metric_name='query_duration_ms' 
  AND timestamp >= now() - INTERVAL '5 minutes' 
  HAVING avg_duration > 2000
severity: "warning"
for: "5m"

# 错误率告警
name: "HighErrorRate"
condition: |
  SELECT count(*) as error_count 
  FROM openobserve_logs 
  WHERE level='ERROR' 
  AND timestamp >= now() - INTERVAL '5 minutes' 
  HAVING error_count > 10
severity: "critical"
for: "5m"
```

## 7. 总结

通过实施本故障排除和维护指南，您可以：

1. **快速诊断问题**: 使用标准化的诊断流程
2. **预防故障发生**: 实施定期维护任务
3. **提高系统可用性**: 建立完善的监控和告警体系
4. **减少故障影响**: 制定有效的应急响应流程
5. **持续改进系统**: 定期进行健康评估和优化

定期审查和更新维护流程，确保它们能够适应不断变化的系统需求和业务要求。