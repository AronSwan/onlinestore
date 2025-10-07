# 故障排除手册

## 📋 概述

本文档提供后端系统常见问题的诊断和解决方案，帮助运维人员快速定位和解决问题。

## 🔍 问题分类

### 紧急问题（P0）
- 服务完全不可用
- 数据库连接失败
- 关键功能异常

### 重要问题（P1）
- 性能严重下降
- 部分功能异常
- 数据不一致

### 一般问题（P2）
- 日志告警
- 性能轻微下降
- 功能小问题

## 🚨 紧急问题处理

### 服务完全不可用

#### 症状
- 所有API请求返回5xx错误
- 健康检查端点无响应
- 进程崩溃或退出

#### 诊断步骤
1. **检查进程状态**
```bash
# 检查PM2进程状态
pm2 status

# 检查系统进程
ps aux | grep node

# 检查端口占用
netstat -tulpn | grep 3000
```

2. **检查系统资源**
```bash
# 检查内存使用
free -h

# 检查CPU使用
top

# 检查磁盘空间
df -h
```

3. **查看错误日志**
```bash
# 查看应用日志
tail -100 /path/to/logs/error.log

# 查看系统日志
tail -100 /var/log/syslog

# 查看PM2日志
pm2 logs caddy-backend --lines 100
```

#### 解决方案
```bash
# 重启服务
pm2 restart caddy-backend

# 如果PM2不可用，直接重启
npm run start:prod

# 紧急情况下重启服务器
sudo reboot
```

### 数据库连接失败

#### 症状
- 日志中出现数据库连接错误
- API返回数据库相关错误
- 健康检查显示数据库连接失败

#### 诊断步骤
1. **检查数据库服务状态**
```bash
# TiDB集群状态检查
tiup cluster display caddy-cluster

# Redis状态检查
sudo systemctl status redis-server
```

2. **测试数据库连接**
```bash
# 测试TiDB连接
mysql -h tidb-cluster -P 4000 -u root -e "SHOW STATUS LIKE 'Uptime';"

# 测试Redis连接
redis-cli ping
```

3. **检查连接配置**
```bash
# 检查环境变量
cat .env | grep DB_
cat .env | grep REDIS_

# 检查网络连接
telnet tidb-cluster 4000
telnet localhost 6379
```

#### 解决方案
```bash
# 重启数据库服务
tiup cluster restart caddy-cluster

# 检查防火墙设置
sudo ufw status
sudo ufw allow 4000
sudo ufw allow 6379
```

## ⚡ 性能问题处理

### API响应缓慢

#### 症状
- API平均响应时间超过500ms
- 用户投诉页面加载慢
- 监控系统告警

#### 诊断步骤
1. **检查系统资源**
```bash
# 实时监控系统资源
htop

# 检查IO性能
iostat -x 1

# 检查网络延迟
ping database-host
```

2. **分析慢查询**
```bash
# 启用TiDB慢查询日志
mysql -h tidb-cluster -P 4000 -u root -e "SET GLOBAL tidb_slow_log_threshold = 300;"

# 分析慢查询
cat /tidb-data/slow.log | pt-query-digest
```

3. **检查应用性能**
```bash
# 使用性能分析工具
node --prof dist/main.js

# 分析性能报告
node --prof-process isolate-*.log
```

#### 解决方案
```bash
# 优化数据库查询
# 添加缺失索引
mysql -h tidb-cluster -P 4000 -u root -e "USE caddy_shopping; EXPLAIN SELECT * FROM products WHERE category = 'clothing';"

# 调整连接池大小
# 修改.env文件中的DB_POOL_SIZE和REDIS_POOL_SIZE

# 启用缓存优化
# 检查缓存命中率
redis-cli info stats | grep keyspace_hits
```

### 内存泄漏

#### 症状
- 内存使用持续增长
- 频繁GC导致性能下降
- 最终进程崩溃

#### 诊断步骤
1. **监控内存使用**
```bash
# 实时监控内存
watch -n 1 'ps -o pid,user,%mem,command ax | grep node'

# 生成内存快照
curl -X POST http://localhost:3000/debug/memory-dump
```

2. **分析内存使用**
```bash
# 使用Chrome DevTools分析
node --inspect dist/main.js
```

#### 解决方案
```bash
# 增加内存限制
export NODE_OPTIONS="--max-old-space-size=4096"

# 定期重启服务（临时方案）
# 在PM2配置中添加自动重启
pm2 restart caddy-backend --cron-restart="0 3 * * *"
```

## 🔧 功能问题处理

### 用户认证失败

#### 症状
- 用户无法登录
- JWT令牌验证失败
- 权限检查异常

#### 诊断步骤
1. **检查JWT配置**
```bash
# 验证JWT_SECRET配置
echo $JWT_SECRET

# 检查令牌过期时间
cat .env | grep JWT_EXPIRES
```

2. **测试认证流程**
```bash
# 测试登录接口
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

3. **检查数据库数据**
```bash
# 检查用户表
mysql -h tidb-cluster -P 4000 -u root -e "USE caddy_shopping; SELECT id,email FROM users LIMIT 5;"
```

#### 解决方案
```bash
# 重置JWT密钥（所有用户需要重新登录）
# 生成新的JWT_SECRET
openssl rand -base64 64

# 更新.env文件
sed -i 's/JWT_SECRET=.*/JWT_SECRET=new_secret_here/' .env

# 重启服务
pm2 restart caddy-backend
```

### 文件上传失败

#### 症状
- 文件上传接口返回错误
- 大文件上传失败
- 上传后文件无法访问

#### 诊断步骤
1. **检查上传配置**
```bash
# 检查文件大小限制
cat .env | grep UPLOAD_MAX_SIZE

# 检查存储路径权限
ls -la /path/to/uploads
df -h /path/to/uploads
```

2. **测试上传功能**
```bash
# 测试小文件上传
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer {token}" \
  -F "file=@small-image.jpg"
```

#### 解决方案
```bash
# 调整上传大小限制
# 修改.env中的UPLOAD_MAX_SIZE

# 修复目录权限
sudo chown -R www-data:www-data /path/to/uploads
sudo chmod -R 755 /path/to/uploads

# 清理磁盘空间
sudo find /path/to/uploads -type f -mtime +30 -delete
```

## 📊 监控和告警

### 关键监控指标

#### 应用层指标
- **响应时间**: API平均响应时间应 < 200ms
- **错误率**: HTTP错误率应 < 0.1%
- **吞吐量**: 每秒请求数监控
- **内存使用**: 内存使用率应 < 80%

#### 系统层指标
- **CPU使用率**: 应 < 70%
- **内存使用率**: 应 < 80%
- **磁盘使用率**: 应 < 85%
- **网络带宽**: 监控入站和出站流量

### 告警配置示例
```bash
#!/bin/bash
# alert-check.sh

# 检查响应时间
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' http://localhost:3000/health)
if (( $(echo "$RESPONSE_TIME > 1.0" | bc -l) )); then
    send_alert "高响应时间警报: ${RESPONSE_TIME}s"
fi

# 检查错误率
ERROR_COUNT=$(tail -1000 /path/to/logs/access.log | grep " 5[0-9][0-9] " | wc -l)
if [ $ERROR_COUNT -gt 10 ]; then
    send_alert "高错误率警报: ${ERROR_COUNT}个5xx错误"
fi
```

## 🔄 数据一致性检查

### 订单数据检查
```sql
-- 检查订单状态一致性
SELECT 
    status,
    COUNT(*) as count
FROM orders 
GROUP BY status;

-- 检查库存一致性
SELECT 
    p.id,
    p.name,
    p.stock as product_stock,
    SUM(oi.quantity) as ordered_quantity
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status NOT IN ('cancelled', 'refunded')
GROUP BY p.id, p.name, p.stock
HAVING p.stock < ordered_quantity;
```

### 用户数据检查
```sql
-- 检查重复邮箱
SELECT email, COUNT(*) as count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- 检查无效数据
SELECT *
FROM users
WHERE email IS NULL OR username IS NULL;
```

## 🛠️ 常用工具和命令

### 系统诊断工具
```bash
# 实时系统监控
top
htop
iotop

# 网络诊断
netstat
ss
tcpdump

# 性能分析
perf
strace
lsof
```

### 应用诊断工具
```bash
# Node.js进程检查
pm2 monit
pm2 logs

# 内存分析
node --inspect-brk dist/main.js

# CPU分析
node --prof dist/main.js
```

### 数据库工具
```bash
# MySQL性能分析
mysqlslap
mytop
percona-toolkit

# Redis分析
redis-cli monitor
redis-cli --stat
```

## 📞 紧急联系方式

### 技术支持团队
- **主要联系人**: 张三 (13800138000)
- **备用联系人**: 李四 (13900139000)
- **值班电话**: 400-123-4567

### 问题上报模板
```
【问题标题】：[紧急/重要/一般] 问题描述

【问题现象】：
- 具体表现和错误信息

【影响范围】：
- 影响的用户或功能

【已采取措施】：
- 已经尝试的解决方案

【需要支持】：
- 需要协助的具体内容

【联系方式】：
- 姓名和电话
```

---

**最后更新**: 2025-09-30  
**文档版本**: v1.0.0