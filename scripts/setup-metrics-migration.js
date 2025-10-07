#!/usr/bin/env node

/**
 * 指标数据迁移脚本
 * 配置Prometheus指标数据发送到OpenObserve
 */

const fs = require('fs');
const path = require('path');

function updatePrometheusConfig() {
  console.log('📊 更新Prometheus配置...');
  
  const prometheusConfig = `
# Prometheus配置用于OpenObserve指标收集
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'caddy-shopping'
    replica: 'prometheus-1'

# OpenObserve远程写入配置
remote_write:
  - url: "http://localhost:5080/api/caddy-shopping/system-metrics/_json"
    queue_config:
      max_samples_per_send: 1000
      max_shards: 200
      capacity: 2500
    write_relabel_configs:
      - source_labels: [__name__]
        regex: 'go_.*|process_.*|prometheus_.*'
        action: drop
      - source_labels: [__name__]
        regex: '(.*)'
        target_label: __name__
        replacement: 'metrics_\${1}'
    headers:
      Content-Type: "application/json"
      Authorization: "Bearer \${OPENOBSERVE_TOKEN}"

# 告警管理器配置
alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

# 规则文件
rule_files:
  - "alert_rules.yml"

# 数据收集配置
scrape_configs:
  # Prometheus自身指标
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 5s
    metrics_path: /metrics

  # 系统指标
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 10s
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'localhost'

  # 应用指标
  - job_name: 'caddy-shopping-app'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: /metrics
    scrape_interval: 30s
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'caddy-shopping-app'
      - source_labels: [__name__]
        regex: 'http_.*'
        target_label: __name__
        replacement: 'app_\${1}'

  # Docker容器指标
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
    scrape_interval: 15s
    metrics_path: /metrics
    relabel_configs:
      - source_labels: [__name__]
        regex: 'container_.*'
        target_label: __name__
        replacement: 'docker_\${1}'
`;

  const configPath = path.join(__dirname, '../docker/prometheus/prometheus-openobserve.yml');
  fs.writeFileSync(configPath, prometheusConfig);
  console.log('✓ Prometheus配置已更新');
}

function createAlertRules() {
  console.log('\n🚨 创建告警规则...');
  
  const alertRules = `
groups:
  - name: system_alerts
    rules:
      # CPU使用率告警
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 2m
        labels:
          severity: warning
          service: system
        annotations:
          summary: "高CPU使用率告警"
          description: "实例 {{ $labels.instance }} CPU使用率超过80%，当前值: {{ $value }}%"

      # 内存使用率告警
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 2m
        labels:
          severity: warning
          service: system
        annotations:
          summary: "高内存使用率告警"
          description: "实例 {{ $labels.instance }} 内存使用率超过85%，当前值: {{ $value }}%"

      # 磁盘使用率告警
      - alert: HighDiskUsage
        expr: (1 - (node_filesystem_avail_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes{fstype!="tmpfs"})) * 100 > 90
        for: 1m
        labels:
          severity: critical
          service: system
        annotations:
          summary: "高磁盘使用率告警"
          description: "实例 {{ $labels.instance }} 磁盘使用率超过90%，当前值: {{ $value }}%"

  - name: application_alerts
    rules:
      # HTTP错误率告警
      - alert: HighErrorRate
        expr: rate(app_http_requests_total{status=~"5.."}[5m]) / rate(app_http_requests_total[5m]) * 100 > 5
        for: 3m
        labels:
          severity: warning
          service: application
        annotations:
          summary: "高HTTP错误率告警"
          description: "应用HTTP 5xx错误率超过5%，当前值: {{ $value }}%"

      # 响应时间告警
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(app_http_request_duration_seconds_bucket[5m])) > 1
        for: 2m
        labels:
          severity: warning
          service: application
        annotations:
          summary: "高响应时间告警"
          description: "应用95%分位响应时间超过1秒，当前值: {{ $value }}秒"

      # 应用宕机告警
      - alert: ApplicationDown
        expr: up{job="caddy-shopping-app"} == 0
        for: 1m
        labels:
          severity: critical
          service: application
        annotations:
          summary: "应用宕机告警"
          description: "应用实例 {{ $labels.instance }} 无法访问"

  - name: business_alerts
    rules:
      # 用户登录失败率告警
      - alert: HighLoginFailureRate
        expr: rate(app_user_login_failures_total[5m]) / rate(app_user_login_attempts_total[5m]) * 100 > 20
        for: 5m
        labels:
          severity: warning
          service: business
        annotations:
          summary: "高登录失败率告警"
          description: "用户登录失败率超过20%，可能存在攻击或系统问题"

      # 订单量异常告警
      - alert: UnusualOrderVolume
        expr: rate(app_orders_total[1h]) < 10
        for: 30m
        labels:
          severity: warning
          service: business
        annotations:
          summary: "订单量异常告警"
          description: "过去1小时订单量异常低，当前: {{ $value }} 订单/小时"
`;

  const rulesPath = path.join(__dirname, '../docker/prometheus/alert_rules.yml');
  fs.writeFileSync(rulesPath, alertRules);
  console.log('✓ 告警规则已创建');
}

function createMetricsMiddleware() {
  console.log('\n📈 创建应用指标中间件...');
  
  const middlewareCode = `
const prometheus = require('prom-client');

// 创建默认指标
const collectDefaultMetrics = prometheus.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

// 自定义指标
const httpRequestDuration = new prometheus.Histogram({
  name: 'app_http_request_duration_seconds',
  help: 'HTTP请求持续时间',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new prometheus.Counter({
  name: 'app_http_requests_total',
  help: 'HTTP请求总数',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new prometheus.Gauge({
  name: 'app_active_connections',
  help: '当前活跃连接数'
});

const userLoginAttempts = new prometheus.Counter({
  name: 'app_user_login_attempts_total',
  help: '用户登录尝试次数',
  labelNames: ['success', 'user_id']
});

const orderTotal = new prometheus.Counter({
  name: 'app_orders_total',
  help: '订单总数',
  labelNames: ['status', 'payment_method']
});

const cartOperations = new prometheus.Counter({
  name: 'app_cart_operations_total',
  help: '购物车操作次数',
  labelNames: ['operation', 'user_id']
});

// 指标中间件
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // 增加活跃连接数
  activeConnections.inc();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    // 记录请求指标
    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    httpRequestTotal
      .labels(req.method, route, res.statusCode)
      .inc();
    
    // 减少活跃连接数
    activeConnections.dec();
  });
  
  next();
};

// 业务指标记录函数
const recordLoginAttempt = (success, userId) => {
  userLoginAttempts.labels(success ? 'true' : 'false', userId || 'anonymous').inc();
};

const recordOrder = (status, paymentMethod) => {
  orderTotal.labels(status, paymentMethod).inc();
};

const recordCartOperation = (operation, userId) => {
  cartOperations.labels(operation, userId || 'anonymous').inc();
};

// 获取指标数据
const getMetrics = () => {
  return prometheus.register.metrics();
};

module.exports = {
  metricsMiddleware,
  recordLoginAttempt,
  recordOrder,
  recordCartOperation,
  getMetrics,
  register: prometheus.register
};
`;

  const middlewarePath = path.join(__dirname, '../backend/src/middleware/metrics.js');
  fs.writeFileSync(middlewarePath, middlewareCode);
  console.log('✓ 指标中间件已创建');
}

function createMetricsEndpoint() {
  console.log('\n🔗 创建指标暴露端点...');
  
  const endpointCode = `
const express = require('express');
const { getMetrics } = require('../middleware/metrics');

const router = express.Router();

// 指标暴露端点
router.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(getMetrics());
});

// 健康检查端点（包含指标状态）
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    metrics: 'enabled'
  });
});

module.exports = router;
`;

  const endpointPath = path.join(__dirname, '../backend/src/routes/metrics.js');
  fs.writeFileSync(endpointPath, endpointCode);
  console.log('✓ 指标端点已创建');
}

function updateDockerCompose() {
  console.log('\n🐳 更新Docker Compose配置...');
  
  const dockerComposePath = path.join(__dirname, '../docker-compose.openobserve.yml');
  
  if (fs.existsSync(dockerComposePath)) {
    let dockerCompose = fs.readFileSync(dockerComposePath, 'utf8');
    
    // 更新Prometheus配置文件路径
    dockerCompose = dockerCompose.replace(
      './docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro',
      './docker/prometheus/prometheus-openobserve.yml:/etc/prometheus/prometheus.yml:ro'
    );
    
    // 添加alert_rules.yml卷映射
    if (!dockerCompose.includes('alert_rules.yml')) {
      dockerCompose = dockerCompose.replace(
        './docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro',
        './docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro\n      - ./docker/prometheus/alert_rules.yml:/etc/prometheus/alert_rules.yml:ro'
      );
    }
    
    fs.writeFileSync(dockerComposePath, dockerCompose);
    console.log('✓ Docker Compose配置已更新');
  }
}

function createTestScript() {
  console.log('\n🧪 创建指标测试脚本...');
  
  const testScript = `
const { recordLoginAttempt, recordOrder, recordCartOperation } = require('../backend/src/middleware/metrics');

async function testMetrics() {
  console.log('🧪 测试指标系统...');
  
  // 测试用户登录指标
  recordLoginAttempt(true, 'test-user-123');
  recordLoginAttempt(false, 'test-user-456');
  recordLoginAttempt(true, 'test-user-789');
  
  // 测试订单指标
  recordOrder('completed', 'credit_card');
  recordOrder('pending', 'paypal');
  recordOrder('failed', 'bank_transfer');
  
  // 测试购物车指标
  recordCartOperation('add', 'test-user-123');
  recordCartOperation('remove', 'test-user-456');
  recordCartOperation('update', 'test-user-789');
  recordCartOperation('clear', 'test-user-123');
  
  console.log('✓ 指标测试完成');
  console.log('📊 请访问 http://localhost:3000/metrics 查看指标数据');
  console.log('📈 请在OpenObserve中查看system-metrics数据流');
}

if (require.main === module) {
  testMetrics().catch(console.error);
}

module.exports = { testMetrics };
`;

  const testPath = path.join(__dirname, 'test-metrics.js');
  fs.writeFileSync(testPath, testScript);
  console.log('✓ 指标测试脚本已创建');
}

function main() {
  console.log('🚀 开始设置指标数据迁移...');
  
  updatePrometheusConfig();
  createAlertRules();
  createMetricsMiddleware();
  createMetricsEndpoint();
  updateDockerCompose();
  createTestScript();
  
  console.log('\n🎉 指标数据迁移设置完成！');
  console.log('\n📋 已完成的配置:');
  console.log('  - Prometheus配置更新');
  console.log('  - 告警规则创建');
  console.log('  - 应用指标中间件');
  console.log('  - 指标暴露端点');
  console.log('  - Docker Compose更新');
  console.log('  - 指标测试脚本');
  
  console.log('\n📝 下一步操作:');
  console.log('  1. 安装依赖: npm install prom-client');
  console.log('  2. 重启Prometheus服务');
  console.log('  3. 在Express应用中集成指标中间件');
  console.log('  4. 运行测试脚本: node scripts/test-metrics.js');
  
  console.log('\n🔧 集成示例:');
  console.log('  const { metricsMiddleware } = require("./middleware/metrics");');
  console.log('  app.use(metricsMiddleware);');
  console.log('  app.use("/metrics", require("./routes/metrics"));');
}

if (require.main === module) {
  main();
}

module.exports = {
  updatePrometheusConfig,
  createAlertRules,
  createMetricsMiddleware,
  createMetricsEndpoint,
  updateDockerCompose,
  createTestScript
};