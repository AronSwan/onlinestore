# OpenObserve 功能特性与 API 深度分析

## 核心功能特性

### 1. 多数据类型支持

#### 日志数据 (Logs)
- **结构化日志**：JSON、Key-Value 格式支持
- **非结构化日志**：纯文本日志处理
- **日志解析**：自动字段提取和解析

#### 指标数据 (Metrics)
- **Prometheus 兼容**：支持 Prometheus 指标格式
- **自定义指标**：支持自定义指标类型
- **时序数据**：高效时序数据存储和查询

#### 追踪数据 (Traces)
- **OpenTelemetry**：完整 OTLP 协议支持
- **分布式追踪**：端到端请求追踪
- **性能分析**：调用链性能分析

#### RUM 数据 (Real User Monitoring)
- **用户体验监控**：页面加载性能、用户交互
- **错误追踪**：前端错误捕获和分析
- **会话回放**：用户操作会话记录

### 2. 数据处理管道

#### 管道功能特性
```rust
// 管道配置示例
pub struct PipelineConfig {
    pub name: String,
    pub nodes: Vec<NodeConfig>,
    pub enabled: bool,
}

pub enum NodeType {
    ParseJson,      // JSON 解析
    ExtractFields, // 字段提取
    EnrichData,    // 数据富化
    FilterData,    // 数据过滤
    Transform,     // 数据转换
}
```

#### 数据处理能力
- **数据解析**：JSON、Key-Value、正则表达式解析
- **字段操作**：字段重命名、类型转换、值映射
- **数据富化**：IP 地理位置、用户代理解析
- **数据过滤**：条件过滤、采样、去重
- **数据转换**：格式转换、数据聚合

### 3. 查询和可视化

#### 查询语言支持
- **SQL 查询**：完整的 SQL 语法支持
- **PromQL 查询**：Prometheus 查询语言兼容
- **自定义查询**：高级查询功能支持

#### 可视化能力
- **仪表板**：可配置的数据仪表板
- **图表类型**：18+ 种图表类型支持
- **实时更新**：数据实时刷新和更新
- **交互操作**：图表交互和钻取分析

## API 接口详解

### 1. 数据摄取 API

#### HTTP JSON API
```http
POST /api/{org_id}/{stream_name}/_json
Authorization: Bearer {token}
Content-Type: application/json

[
  {
    "timestamp": "2023-01-01T00:00:00Z",
    "level": "info",
    "message": "User login successful",
    "user_id": "12345"
  }
]
```

#### OTLP 协议 API
```http
POST /otlp/v1/logs
POST /otlp/v1/metrics  
POST /otlp/v1/traces

Headers:
Content-Type: application/x-protobuf
Authorization: Bearer {token}
```

### 2. 查询 API

#### SQL 查询 API
```http
POST /api/{org_id}/_search
Authorization: Bearer {token}

{
  "query": "SELECT * FROM logs WHERE level = 'error' LIMIT 100",
  "start_time": "2023-01-01T00:00:00Z",
  "end_time": "2023-01-02T00:00:00Z"
}
```

#### PromQL 查询 API
```http
POST /api/{org_id}/prometheus/api/v1/query
Authorization: Bearer {token}

{
  "query": "up{job='web'}",
  "time": "2023-01-01T00:00:00Z"
}
```

### 3. 管理 API

#### 组织管理
```http
# 创建组织
POST /api/organizations
{
  "name": "my-org",
  "description": "My organization"
}

# 获取组织列表
GET /api/organizations
```

#### 流管理
```http
# 创建数据流
POST /api/{org_id}/streams
{
  "name": "app-logs",
  "type": "logs",
  "settings": {
    "retention_period": "30d"
  }
}

# 获取流列表
GET /api/{org_id}/streams
```

#### 用户和权限管理
```http
# 创建用户
POST /api/{org_id}/users
{
  "email": "user@example.com",
  "password": "securepassword",
  "role": "admin"
}

# 创建访问令牌
POST /api/{org_id}/tokens
{
  "name": "ingest-token",
  "permissions": ["ingest", "query"]
}
```

## 高级功能特性

### 1. 告警和通知

#### 告警规则配置
```yaml
alert:
  name: "High Error Rate"
  condition: "error_count > 100"
  duration: "5m"
  severity: "critical"
  notifications:
    - email: "team@example.com"
    - slack: "#alerts"
```

#### 通知渠道支持
- **Email**：邮件通知
- **Slack**：Slack 消息
- **Webhook**：自定义 Webhook
- **PagerDuty**：事件管理集成

### 2. 数据导出和集成

#### 数据导出格式
- **JSON**：结构化数据导出
- **CSV**：表格数据导出
- **Parquet**：列式格式导出
- **Prometheus**：指标格式导出

#### 系统集成支持
- **Grafana**：数据源集成
- **Elasticsearch**：数据同步
- **Kafka**：流式数据集成
- **Webhook**：事件推送

### 3. 多租户和隔离

#### 组织级隔离
- **数据隔离**：组织间数据完全隔离
- **资源配额**：CPU、内存、存储配额限制
- **访问控制**：组织级权限管理

#### 用户权限模型
```rust
pub enum Permission {
    Ingest,     // 数据写入权限
    Query,      // 数据查询权限
    Manage,     // 管理权限
    Admin,      // 管理员权限
}
```

## 配置和定制化

### 1. 环境配置
```bash
# 基础配置
O2_WORKER_THREADS=4
O2_HTTP_PORT=5080
O2_NODE_NAME=node-1

# 存储配置
O2_STORAGE_TYPE=local
O2_STORAGE_PATH=/data/openobserve

# 认证配置
O2_AUTH_TYPE=jwt
O2_JWT_SECRET=your-secret-key
```

### 2. 管道配置示例
```yaml
# 日志处理管道
name: log-processing
nodes:
  - type: parse_json
    config:
      field: message
      
  - type: extract_fields
    config:
      pattern: 'user_id=(\d+)'
      field: user_id
      
  - type: enrich_geoip
    config:
      ip_field: client_ip
      output_fields: [country, city, asn]
      
  - type: filter
    config:
      condition: "level == 'error'"
```

### 3. 查询配置
```sql
-- 复杂查询示例
SELECT 
  timestamp,
  level,
  message,
  COUNT(*) as error_count
FROM logs 
WHERE level = 'error' 
  AND timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY timestamp, level, message
ORDER BY error_count DESC
LIMIT 10
```

## 性能特性

### 1. 数据摄取性能
- **高吞吐**：支持每秒百万级事件处理
- **低延迟**：亚秒级数据处理延迟
- **批量优化**：智能批量处理减少 I/O

### 2. 查询性能
- **快速响应**：亚秒级查询响应时间
- **并发查询**：支持高并发查询请求
- **缓存优化**：多级查询缓存提升性能

### 3. 存储效率
- **高压缩比**：10x+ 数据压缩比率
- **低成本**：相比传统方案存储成本降低 140x
- **快速检索**：优化的索引和扫描性能

## 生态系统集成

### 1. 数据收集器集成
- **Fluent Bit**：日志收集和转发
- **Vector**：高性能数据收集
- **OpenTelemetry**：标准可观测性数据
- **Prometheus**：指标数据收集

### 2. 可视化工具集成
- **Grafana**：仪表板可视化
- **Kibana**：日志分析界面（兼容）
- **自定义 UI**：基于 API 的自定义界面

### 3. 运维工具集成
- **Kubernetes**：原生容器编排支持
- **Docker**：容器化部署
- **Terraform**：基础设施即代码
- **Ansible**：自动化部署配置

## 功能对比优势

### 与传统方案对比
| 特性 | OpenObserve | Elasticsearch | 优势 |
|------|-------------|---------------|------|
| 存储成本 | 极低 | 高 | 140x 成本优势 |
| 查询性能 | 快速 | 中等 | 2-5x 性能提升 |
| 资源消耗 | 低 | 高 | 内存使用优化 |
| 部署复杂度 | 简单 | 复杂 | 单二进制部署 |

### 与云服务对比
| 特性 | OpenObserve | 云服务 | 优势 |
|------|-------------|--------|------|
| 成本控制 | 固定成本 | 按量计费 | 成本可预测 |
| 数据主权 | 自托管 | 云厂商 | 数据完全控制 |
| 定制化 | 高度可定制 | 有限定制 | 灵活适应需求 |
| 集成能力 | 开放集成 | 厂商锁定 | 避免供应商锁定 |

## 使用场景示例

### 1. 应用日志分析
```sql
-- 分析应用错误模式
SELECT 
  error_type,
  COUNT(*) as count,
  AVG(response_time) as avg_response_time
FROM app_logs 
WHERE level = 'error'
GROUP BY error_type
ORDER BY count DESC
```

### 2. 系统监控告警
```sql
-- 系统资源监控
SELECT 
  hostname,
  AVG(cpu_usage) as avg_cpu,
  AVG(memory_usage) as avg_memory,
  MAX(disk_usage) as max_disk
FROM system_metrics
WHERE timestamp >= NOW() - INTERVAL '5 minutes'
GROUP BY hostname
```

### 3. 用户体验分析
```sql
-- 页面性能分析
SELECT 
  page_url,
  COUNT(*) as page_views,
  AVG(load_time) as avg_load_time,
  PERCENTILE(load_time, 0.95) as p95_load_time
FROM rum_events
WHERE event_type = 'page_view'
GROUP BY page_url