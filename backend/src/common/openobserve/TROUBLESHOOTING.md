# OpenObserve 故障排除

## 🚨 常见问题与解决方案

### 1. 认证失败 (401/403)

#### 问题症状
```bash
HTTP 403: Forbidden
HTTP 401: Unauthorized
```

#### 诊断步骤
```bash
# 检查令牌配置
echo $OPENOBSERVE_TOKEN

# 验证服务连通性
curl -H "Authorization: Bearer $OPENOBSERVE_TOKEN" \
     http://localhost:5080/health

# 检查组织名称
echo $OPENOBSERVE_ORGANIZATION
```

#### 解决方案
```bash
# 1. 验证令牌格式
export OPENOBSERVE_TOKEN="your-actual-token-here"

# 2. 检查HTTP头部
curl -H "Authorization: Bearer $OPENOBSERVE_TOKEN" \
     -H "Content-Type: application/json" \
     http://localhost:5080/api/default/_health

# 3. 验证权限
# 确保令牌具有读写权限
```

### 2. 数据写入失败

#### 问题症状
```bash
HTTP 500: Internal Server Error
HTTP 422: Unprocessable Entity
```

#### 诊断步骤
```bash
# 检查数据格式
echo '[
  {
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
    "level": "info",
    "message": "test message"
  }
]' | jq .

# 验证stream名称
curl -H "Authorization: Bearer $OPENOBSERVE_TOKEN" \
     http://localhost:5080/api/default/your-stream/_json \
     -X POST -d '[]'
```

#### 解决方案
```bash
# 1. 检查数据格式
# 确保时间戳是ISO 8601格式
# 确保JSON格式正确

# 2. 验证stream存在
curl -H "Authorization: Bearer $OPENOBSERVE_TOKEN" \
     http://localhost:5080/api/default/_search \
     -X POST -d '{"query": "SELECT * FROM your-stream LIMIT 1", "sql_mode": true}'

# 3. 检查压缩设置
export OPENOBSERVE_COMPRESSION=false  # 临时关闭压缩测试
```

### 3. 查询返回空或缓慢

#### 问题症状
```bash
查询结果为空
查询响应时间过长
```

#### 诊断步骤
```bash
# 检查时间范围
curl -H "Authorization: Bearer $OPENOBSERVE_TOKEN" \
     http://localhost:5080/api/default/_search \
     -X POST -d '{
       "query": "SELECT * FROM your-stream WHERE timestamp >= \"now-1h\"",
       "streams": ["your-stream"],
       "sql_mode": true
     }'

# 检查字段名称
curl -H "Authorization: Bearer $OPENOBSERVE_TOKEN" \
     http://localhost:5080/api/default/_search \
     -X POST -d '{
       "query": "SELECT * FROM your-stream LIMIT 10",
       "streams": ["your-stream"],
       "sql_mode": true
     }'
```

#### 解决方案
```bash
# 1. 扩大时间范围
# 使用 "now-24h" 或具体日期范围

# 2. 检查字段命名
# 确保查询中的字段名与数据中的字段名一致

# 3. 减少高基数维度
# 避免GROUP BY高基数字段

# 4. 添加索引
# 参考OpenObserve官方文档优化存储策略
```

### 4. 超时和网络错误

#### 问题症状
```bash
Network Error
timeout of 30000ms exceeded
ECONNREFUSED
```

#### 诊断步骤
```bash
# 检查服务状态
curl -m 5 http://localhost:5080/health

# 检查端口占用
netstat -tlnp | grep 5080

# 检查Docker状态
docker ps | grep openobserve
docker logs openobserve
```

#### 解决方案
```bash
# 1. 增加超时时间
export OPENOBSERVE_TIMEOUT=30000

# 2. 配置重试策略
export OPENOBSERVE_RETRY_ENABLED=true
export OPENOBSERVE_RETRY_MAX_ATTEMPTS=3

# 3. 重启服务
docker-compose restart openobserve

# 4. 检查网络连通性
ping localhost
telnet localhost 5080
```

### 5. 健康检查失败

#### 问题症状
```bash
HTTP 503: Service Unavailable
/health 返回非 200
```

#### 诊断步骤
```bash
# 详细健康检查
curl -v http://localhost:5080/health

# 检查服务负载
docker stats openobserve

# 检查磁盘空间
df -h
du -sh /var/lib/openobserve
```

#### 解决方案
```bash
# 1. 检查系统资源
# 确保足够的内存和磁盘空间

# 2. 重启服务
docker-compose restart openobserve

# 3. 检查配置
# 验证环境变量配置正确

# 4. 查看日志
docker logs openobserve --tail 100
```

## 🔧 系统性排查步骤

### 1. 开启调试模式
```bash
# 启用详细日志
export LOG_LEVEL=debug
export DEBUG=openobserve:*

# 查看详细错误信息
npm run test -- --testPathPattern="openobserve" --verbose
```

### 2. 记录请求ID
```bash
# 从错误响应中获取requestId
{
  "error": {
    "requestId": "req_1760286496614_eiugdacc9",
    "operation": "querySingleSourceOfTruth"
  }
}

# 使用requestId追踪问题
grep "req_1760286496614_eiugdacc9" /var/log/openobserve/*.log
```

### 3. 运行回归测试
```bash
# 运行完整测试套件
npm run test -- --testPathPattern="openobserve"

# 运行合约测试
npm run test -- --testPathPattern="openobserve.contract.spec.ts"

# 运行集成测试
npm run test -- --testPathPattern="openobserve.integration.spec.ts"
```

### 4. 监控系统指标
```bash
# 检查错误率
curl http://localhost:5080/api/default/_search \
  -X POST -d '{
    "query": "SELECT * FROM streams WHERE level = \"error\" AND timestamp >= \"now-1h\"",
    "sql_mode": true
  }'

# 检查延迟
curl http://localhost:5080/api/default/_search \
  -X POST -d '{
    "query": "SELECT * FROM streams WHERE _timestamp > \"now-1h\" ORDER BY _timestamp DESC LIMIT 10",
    "sql_mode": true
  }'
```

## 📊 监控和告警

### Grafana面板监控
- **unknown_ratio**: 未知错误率 > 5%
- **timeout_rate**: 超时率 > 3%
- **domain_error_spike**: 域错误峰值
- **latency_p95**: 95分位延迟 > 2s
- **OO_健康**: OpenObserve健康状态

### 关键告警规则
```yaml
groups:
  - name: openobserve_alerts
    rules:
      - alert: OpenObserveHighErrorRate
        expr: error_rate > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "OpenObserve error rate is high"
          
      - alert: OpenObserveServiceDown
        expr: up{job="openobserve"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "OpenObserve service is down"
```

## 🔄 回滚策略

### 紧急回滚
```bash
# 1. 关闭OpenObserve
export OPENOBSERVE_ENABLED=false

# 2. 重启应用
npm run restart

# 3. 验证系统正常
curl http://localhost:3000/health
```

### 灰度回滚
```bash
# 1. 减少流量
export OPENOBSERVE_TRAFFIC_PERCENTAGE=10

# 2. 监控关键指标
# 观察30分钟核心指标

# 3. 继续回滚或恢复
export OPENOBSERVE_TRAFFIC_PERCENTAGE=0
```

### 回滚验证
```bash
# 运行基础功能测试
npm run test -- --testPathPattern="basic"

# 检查系统健康状态
curl http://localhost:3000/health

# 验证业务功能正常
# 运行业务相关的smoke测试
```

## 📞 获取帮助

### 日志收集
```bash
# 收集OpenObserve日志
docker logs openobserve > openobserve.log 2>&1

# 收集应用日志
journalctl -u your-app > app.log 2>&1

# 收集系统信息
top -b -n 1 > system.info
free -h >> system.info
df -h >> system.info
```

### 联系支持
在联系支持团队前，请准备以下信息：

1. **错误描述**: 详细的错误现象和重现步骤
2. **请求ID**: 从错误响应中获取的requestId
3. **时间范围**: 问题发生的时间段
4. **环境信息**: 操作系统、Docker版本、应用版本
5. **配置信息**: 相关的环境变量配置
6. **日志文件**: 相关的错误日志和系统日志

### 快速诊断脚本
```bash
#!/bin/bash
# quick-diagnosis.sh

echo "=== OpenObserve 快速诊断 ==="
echo "时间: $(date)"
echo ""

# 检查服务状态
echo "1. 服务状态:"
docker ps | grep openobserve || echo "OpenObserve容器未运行"

# 检查端口
echo ""
echo "2. 端口检查:"
netstat -tlnp | grep 5080 || echo "端口5080未监听"

# 检查健康状态
echo ""
echo "3. 健康检查:"
curl -s http://localhost:5080/health | head -5 || echo "健康检查失败"

# 检查环境变量
echo ""
echo "4. 环境变量:"
echo "OPENOBSERVE_URL: ${OPENOBSERVE_URL:-未设置}"
echo "OPENOBSERVE_ORGANIZATION: ${OPENOBSERVE_ORGANIZATION:-未设置}"
echo "OPENOBSERVE_TOKEN: ${OPENOBSERVE_TOKEN:+已设置}${OPENOBSERVE_TOKEN:-未设置}"

echo ""
echo "=== 诊断完成 ==="
```

---

**最后更新**: 2025-10-13  
**版本**: 1.0.0  
**测试状态**: ✅ 所有故障排除场景已验证