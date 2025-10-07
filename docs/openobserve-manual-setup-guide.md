# OpenObserve手动设置指南

## 问题说明

当前OpenObserve容器需要通过Web界面进行初始设置才能使用API。环境变量配置似乎没有完全禁用认证。

## 手动设置步骤

### 1. 访问Web界面

打开浏览器访问：http://localhost:5080/web/

### 2. 完成初始设置

1. **创建管理员账户**
   - 邮箱：admin@example.com
   - 密码：ComplexPass#123
   - 确认密码：ComplexPass#123

2. **登录系统**
   - 使用上述管理员账户登录

3. **创建组织**
   - 组织标识符：caddy-shopping
   - 组织名称：Caddy Shopping Site

### 3. 设置完成后验证

设置完成后，运行以下脚本验证配置：

```bash
cd scripts
node test-openobserve-status.js
```

### 4. 创建数据流

设置完成后，运行数据流创建脚本：

```bash
cd scripts
node init-openobserve-streams.js
```

## 临时解决方案

如果无法通过Web界面设置，可以考虑以下替代方案：

### 方案1：使用Elasticsearch兼容模式

修改docker-compose配置，启用Elasticsearch兼容API：

```yaml
environment:
  - ZO_ELASTICSEARCH_ENABLED=true
  - ZO_ELASTICSEARCH_PORT=9200
```

### 方案2：使用不同的监控栈

考虑使用其他监控解决方案：
- Grafana + Prometheus
- ELK Stack (Elasticsearch + Logstash + Kibana)
- Loki + Promtail + Grafana

## 自动化脚本

一旦手动设置完成，可以使用以下脚本自动化后续配置：

1. `scripts/init-openobserve-streams.js` - 创建数据流
2. `scripts/setup-dashboards.js` - 创建仪表板（待实现）
3. `scripts/configure-alerts.js` - 配置告警（待实现）

## 验证清单

- [ ] 管理员账户创建成功
- [ ] 可以登录Web界面
- [ ] 组织创建成功
- [ ] API访问正常
- [ ] 数据流创建成功
- [ ] 数据可以正常发送和查询

## 故障排除

### 认证失败
确保已完成初始设置并创建了管理员账户。

### 数据流创建失败
检查组织权限和API访问权限。

### 数据无法查询
验证数据流是否正确创建，以及数据格式是否符合预期。

## 下一步

完成初始设置后，继续执行阶段二的其他任务：
1. 日志系统集成
2. 指标数据迁移
3. 基础仪表板创建
4. 告警系统配置