
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
