# OpenObserve微服务实现设计

## 1. 电商网站日志收集和分析模块

### 1.1 业务日志服务 (BusinessLoggerService)

#### 1.1.1 数据模型设计

```typescript
// 业务日志条目接口
export interface BusinessLogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  service: string;
  category: 'USER' | 'ORDER' | 'PAYMENT' | 'INVENTORY' | 'SYSTEM';
  action: string;
  message: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  tags?: Record<string, any>;
  metadata?: Record<string, any>;
  businessContext?: {
    orderId?: string;
    productId?: string;
    cartId?: string;
    paymentId?: string;
    amount?: number;
    currency?: string;
    status?: string;
  };
}

// 用户行为日志接口
export interface UserBehaviorLog {
  timestamp: string;
  userId?: string;
  sessionId: string;
  eventType: 'PAGE_VIEW' | 'PRODUCT_VIEW' | 'SEARCH' | 'CART_ADD' | 'CART_REMOVE' | 'CHECKOUT' | 'PURCHASE';
  eventData: {
    page?: string;
    productId?: string;
    searchQuery?: string;
    categoryId?: string;
    cartId?: string;
    orderId?: string;
    price?: number;
    quantity?: number;
  };
  deviceInfo?: {
    userAgent: string;
    ip: string;
    platform: string;
    screenResolution?: string;
  };
  referrer?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}
```

#### 1.1.2 服务类设计

```typescript
@Injectable()
export class BusinessLoggerService {
  private readonly logger = new Logger(BusinessLoggerService.name);
  private readonly openObserveTransport: OpenObserveTransport;

  constructor(
    @Inject('OPENOBSERVE_CONFIG') private readonly config: OpenObserveConfig,
  ) {
    this.openObserveTransport = new OpenObserveTransport({
      endpoint: `${config.url}/api/${config.organization}/business-events/_json`,
      token: config.auth.token,
      batchSize: config.performance.batchSize,
      flushInterval: config.performance.flushInterval,
      service: 'caddy-shopping-backend',
    });
  }

  // 记录用户操作日志
  logUserAction(action: string, userId: string, metadata: any = {}) {
    const logEntry: BusinessLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      service: 'caddy-shopping-backend',
      category: 'USER',
      action,
      message: `User action: ${action}`,
      userId,
      ...metadata,
    };

    this.sendLog(logEntry);
  }

  // 记录订单处理日志
  logOrderEvent(orderId: string, event: string, metadata: any = {}) {
    const logEntry: BusinessLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      service: 'caddy-shopping-backend',
      category: 'ORDER',
      action: event,
      message: `Order event: ${event} for order ${orderId}`,
      businessContext: {
        orderId,
        ...metadata,
      },
    };

    this.sendLog(logEntry);
  }

  // 记录支付交易日志
  logPaymentEvent(paymentId: string, event: string, amount: number, status: string, metadata: any = {}) {
    const logEntry: BusinessLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      service: 'caddy-shopping-backend',
      category: 'PAYMENT',
      action: event,
      message: `Payment event: ${event} for payment ${paymentId}`,
      businessContext: {
        paymentId,
        amount,
        currency: 'CNY',
        status,
        ...metadata,
      },
    };

    this.sendLog(logEntry);
  }

  // 记录库存管理日志
  logInventoryEvent(productId: string, event: string, quantity: number, metadata: any = {}) {
    const logEntry: BusinessLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      service: 'caddy-shopping-backend',
      category: 'INVENTORY',
      action: event,
      message: `Inventory event: ${event} for product ${productId}`,
      businessContext: {
        productId,
        quantity,
        ...metadata,
      },
    };

    this.sendLog(logEntry);
  }

  // 记录系统事件日志
  logSystemEvent(event: string, level: 'INFO' | 'WARN' | 'ERROR', metadata: any = {}) {
    const logEntry: BusinessLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'caddy-shopping-backend',
      category: 'SYSTEM',
      action: event,
      message: `System event: ${event}`,
      ...metadata,
    };

    this.sendLog(logEntry);
  }

  // 发送日志到OpenObserve
  private async sendLog(logEntry: BusinessLogEntry) {
    try {
      // 添加追踪信息
      if (this.config.tracing.enabled) {
        const trace = require('@opentelemetry/api');
        const activeSpan = trace.trace.getActiveSpan();
        if (activeSpan) {
          logEntry.traceId = activeSpan.spanContext().traceId;
          logEntry.spanId = activeSpan.spanContext().spanId;
        }
      }

      this.openObserveTransport.log(logEntry, () => {});
    } catch (error) {
      this.logger.error('Failed to send business log to OpenObserve', error);
    }
  }
}
```

### 1.2 用户行为追踪服务 (UserBehaviorTracker)

#### 1.2.1 服务类设计

```typescript
@Injectable()
export class UserBehaviorTracker {
  private readonly logger = new Logger(UserBehaviorTracker.name);
  private readonly openObserveTransport: OpenObserveTransport;

  constructor(
    @Inject('OPENOBSERVE_CONFIG') private readonly config: OpenObserveConfig,
  ) {
    this.openObserveTransport = new OpenObserveTransport({
      endpoint: `${config.url}/api/${config.organization}/user-behavior/_json`,
      token: config.auth.token,
      batchSize: config.performance.batchSize,
      flushInterval: config.performance.flushInterval,
      service: 'caddy-shopping-frontend',
    });
  }

  // 记录页面访问
  trackPageView(sessionId: string, page: string, userId?: string, metadata: any = {}) {
    const behaviorLog: UserBehaviorLog = {
      timestamp: new Date().toISOString(),
      sessionId,
      userId,
      eventType: 'PAGE_VIEW',
      eventData: { page },
      deviceInfo: this.extractDeviceInfo(metadata.req),
      referrer: metadata.req?.headers?.referer,
    };

    this.sendBehaviorLog(behaviorLog);
  }

  // 记录商品浏览
  trackProductView(sessionId: string, productId: string, userId?: string, metadata: any = {}) {
    const behaviorLog: UserBehaviorLog = {
      timestamp: new Date().toISOString(),
      sessionId,
      userId,
      eventType: 'PRODUCT_VIEW',
      eventData: { productId },
      deviceInfo: this.extractDeviceInfo(metadata.req),
    };

    this.sendBehaviorLog(behaviorLog);
  }

  // 记录搜索行为
  trackSearch(sessionId: string, searchQuery: string, userId?: string, metadata: any = {}) {
    const behaviorLog: UserBehaviorLog = {
      timestamp: new Date().toISOString(),
      sessionId,
      userId,
      eventType: 'SEARCH',
      eventData: { searchQuery },
      deviceInfo: this.extractDeviceInfo(metadata.req),
    };

    this.sendBehaviorLog(behaviorLog);
  }

  // 记录购物车操作
  trackCartOperation(sessionId: string, operation: 'CART_ADD' | 'CART_REMOVE', productId: string, quantity: number, price: number, userId?: string, metadata: any = {}) {
    const behaviorLog: UserBehaviorLog = {
      timestamp: new Date().toISOString(),
      sessionId,
      userId,
      eventType: operation,
      eventData: { 
        productId, 
        quantity, 
        price,
        cartId: metadata.cartId 
      },
      deviceInfo: this.extractDeviceInfo(metadata.req),
    };

    this.sendBehaviorLog(behaviorLog);
  }

  // 记录结账行为
  trackCheckout(sessionId: string, orderId: string, totalAmount: number, userId?: string, metadata: any = {}) {
    const behaviorLog: UserBehaviorLog = {
      timestamp: new Date().toISOString(),
      sessionId,
      userId,
      eventType: 'CHECKOUT',
      eventData: { 
        orderId, 
        totalAmount 
      },
      deviceInfo: this.extractDeviceInfo(metadata.req),
    };

    this.sendBehaviorLog(behaviorLog);
  }

  // 记录购买行为
  trackPurchase(sessionId: string, orderId: string, totalAmount: number, userId?: string, metadata: any = {}) {
    const behaviorLog: UserBehaviorLog = {
      timestamp: new Date().toISOString(),
      sessionId,
      userId,
      eventType: 'PURCHASE',
      eventData: { 
        orderId, 
        totalAmount 
      },
      deviceInfo: this.extractDeviceInfo(metadata.req),
    };

    this.sendBehaviorLog(behaviorLog);
  }

  // 提取设备信息
  private extractDeviceInfo(req: any) {
    if (!req) return null;

    return {
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      platform: req.headers['sec-ch-ua-platform'] || 'unknown',
    };
  }

  // 发送行为日志到OpenObserve
  private async sendBehaviorLog(behaviorLog: UserBehaviorLog) {
    try {
      this.openObserveTransport.log(behaviorLog, () => {});
    } catch (error) {
      this.logger.error('Failed to send user behavior log to OpenObserve', error);
    }
  }
}
```

### 1.3 日志聚合分析服务 (LogAnalyticsService)

#### 1.3.1 服务类设计

```typescript
@Injectable()
export class LogAnalyticsService {
  private readonly logger = new Logger(LogAnalyticsService.name);

  constructor(
    @Inject('OPENOBSERVE_CONFIG') private readonly config: OpenObserveConfig,
    private readonly httpService: HttpService,
  ) {}

  // 获取日志统计
  async getLogStats(timeRange: { start: string; end: string }, filters?: any) {
    const query = this.buildStatsQuery(timeRange, filters);
    
    try {
      const response = await this.httpService.post(
        `${this.config.url}/api/${this.config.organization}/_search`,
        { query },
        {
          headers: {
            'Authorization': `Bearer ${this.config.auth.token}`,
            'Content-Type': 'application/json',
          },
        },
      ).toPromise();

      return this.formatStatsResult(response.data);
    } catch (error) {
      this.logger.error('Failed to get log stats', error);
      throw error;
    }
  }

  // 获取用户行为分析
  async getUserBehaviorAnalytics(timeRange: { start: string; end: string }, userId?: string) {
    const query = this.buildBehaviorAnalyticsQuery(timeRange, userId);
    
    try {
      const response = await this.httpService.post(
        `${this.config.url}/api/${this.config.organization}/_search`,
        { query },
        {
          headers: {
            'Authorization': `Bearer ${this.config.auth.token}`,
            'Content-Type': 'application/json',
          },
        },
      ).toPromise();

      return this.formatBehaviorAnalyticsResult(response.data);
    } catch (error) {
      this.logger.error('Failed to get user behavior analytics', error);
      throw error;
    }
  }

  // 检测异常日志模式
  async detectAnomalousPatterns(timeRange: { start: string; end: string }) {
    const query = this.buildAnomalyDetectionQuery(timeRange);
    
    try {
      const response = await this.httpService.post(
        `${this.config.url}/api/${this.config.organization}/_search`,
        { query },
        {
          headers: {
            'Authorization': `Bearer ${this.config.auth.token}`,
            'Content-Type': 'application/json',
          },
        },
      ).toPromise();

      return this.formatAnomalyDetectionResult(response.data);
    } catch (error) {
      this.logger.error('Failed to detect anomalous patterns', error);
      throw error;
    }
  }

  // 构建统计查询
  private buildStatsQuery(timeRange: { start: string; end: string }, filters?: any) {
    let whereClause = `timestamp >= '${timeRange.start}' AND timestamp <= '${timeRange.end}'`;
    
    if (filters) {
      if (filters.level) {
        whereClause += ` AND level = '${filters.level}'`;
      }
      if (filters.category) {
        whereClause += ` AND category = '${filters.category}'`;
      }
      if (filters.service) {
        whereClause += ` AND service = '${filters.service}'`;
      }
    }

    return `
      SELECT 
        level,
        category,
        COUNT(*) as count,
        COUNT(DISTINCT userId) as unique_users
      FROM business-events 
      WHERE ${whereClause}
      GROUP BY level, category
      ORDER BY count DESC
    `;
  }

  // 构建行为分析查询
  private buildBehaviorAnalyticsQuery(timeRange: { start: string; end: string }, userId?: string) {
    let whereClause = `timestamp >= '${timeRange.start}' AND timestamp <= '${timeRange.end}'`;
    
    if (userId) {
      whereClause += ` AND userId = '${userId}'`;
    }

    return `
      SELECT 
        eventType,
        COUNT(*) as count,
        COUNT(DISTINCT sessionId) as unique_sessions,
        COUNT(DISTINCT userId) as unique_users
      FROM user-behavior 
      WHERE ${whereClause}
      GROUP BY eventType
      ORDER BY count DESC
    `;
  }

  // 构建异常检测查询
  private buildAnomalyDetectionQuery(timeRange: { start: string; end: string }) {
    return `
      SELECT 
        level,
        category,
        action,
        COUNT(*) as count,
        COUNT(*) / (SELECT COUNT(*) FROM business-events WHERE timestamp >= '${timeRange.start}' AND timestamp <= '${timeRange.end}') as percentage
      FROM business-events 
      WHERE timestamp >= '${timeRange.start}' AND timestamp <= '${timeRange.end}' AND level = 'ERROR'
      GROUP BY level, category, action
      HAVING percentage > 0.05  -- 超过5%的错误率视为异常
      ORDER BY percentage DESC
    `;
  }

  // 格式化统计结果
  private formatStatsResult(data: any) {
    return {
      total: data.hits?.total?.value || 0,
      stats: data.hits?.hits?.map((hit: any) => hit._source) || [],
      aggregations: data.aggregations || {},
    };
  }

  // 格式化行为分析结果
  private formatBehaviorAnalyticsResult(data: any) {
    return {
      total: data.hits?.total?.value || 0,
      analytics: data.hits?.hits?.map((hit: any) => hit._source) || [],
      aggregations: data.aggregations || {},
    };
  }

  // 格式化异常检测结果
  private formatAnomalyDetectionResult(data: any) {
    return {
      total: data.hits?.total?.value || 0,
      anomalies: data.hits?.hits?.map((hit: any) => ({
        ...hit._source,
        severity: this.calculateSeverity(hit._source.percentage),
      })) || [],
    };
  }

  // 计算异常严重程度
  private calculateSeverity(percentage: number): 'low' | 'medium' | 'high' | 'critical' {
    if (percentage < 0.1) return 'low';
    if (percentage < 0.2) return 'medium';
    if (percentage < 0.5) return 'high';
    return 'critical';
  }
}
```

## 2. 增强OpenObserve指标监控功能

### 2.1 业务指标收集器 (BusinessMetricsCollector)

#### 2.1.1 数据模型设计

```typescript
// 业务指标接口
export interface BusinessMetric {
  name: string;
  value: number;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  labels?: Record<string, string>;
  unit?: string;
  description?: string;
  timestamp: string;
}

// 用户活跃度指标
export interface UserActivityMetric {
  timestamp: string;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  averageSessionDuration: number;
  bounceRate: number;
  pageViews: number;
  uniquePageViews: number;
}

// 转化率指标
export interface ConversionMetric {
  timestamp: string;
  cartAdditions: number;
  checkouts: number;
  purchases: number;
  cartToCheckoutRate: number;
  checkoutToPurchaseRate: number;
  overallConversionRate: number;
  averageOrderValue: number;
}

// 订单处理效率指标
export interface OrderProcessingMetric {
  timestamp: string;
  ordersReceived: number;
  ordersProcessed: number;
  ordersCancelled: number;
  averageProcessingTime: number;
  processingTimeP50: number;
  processingTimeP95: number;
  processingTimeP99: number;
}
```

#### 2.1.2 服务类设计

```typescript
@Injectable()
export class BusinessMetricsCollector {
  private readonly logger = new Logger(BusinessMetricsCollector.name);
  private readonly metrics = new Map<string, any>();

  constructor(
    @Inject('OPENOBSERVE_CONFIG') private readonly config: OpenObserveConfig,
    private readonly httpService: HttpService,
  ) {}

  // 记录用户活跃度指标
  async recordUserActivityMetric(metric: UserActivityMetric) {
    const businessMetrics: BusinessMetric[] = [
      {
        name: 'active_users',
        value: metric.activeUsers,
        type: 'gauge',
        unit: 'count',
        description: 'Number of active users',
        timestamp: metric.timestamp,
      },
      {
        name: 'new_users',
        value: metric.newUsers,
        type: 'counter',
        unit: 'count',
        description: 'Number of new users',
        timestamp: metric.timestamp,
      },
      {
        name: 'returning_users',
        value: metric.returningUsers,
        type: 'counter',
        unit: 'count',
        description: 'Number of returning users',
        timestamp: metric.timestamp,
      },
      {
        name: 'average_session_duration',
        value: metric.averageSessionDuration,
        type: 'gauge',
        unit: 'seconds',
        description: 'Average session duration',
        timestamp: metric.timestamp,
      },
      {
        name: 'bounce_rate',
        value: metric.bounceRate,
        type: 'gauge',
        unit: 'percent',
        description: 'Bounce rate',
        timestamp: metric.timestamp,
      },
      {
        name: 'page_views',
        value: metric.pageViews,
        type: 'counter',
        unit: 'count',
        description: 'Total page views',
        timestamp: metric.timestamp,
      },
      {
        name: 'unique_page_views',
        value: metric.uniquePageViews,
        type: 'counter',
        unit: 'count',
        description: 'Unique page views',
        timestamp: metric.timestamp,
      },
    ];

    await this.sendMetrics(businessMetrics);
  }

  // 记录转化率指标
  async recordConversionMetric(metric: ConversionMetric) {
    const businessMetrics: BusinessMetric[] = [
      {
        name: 'cart_additions',
        value: metric.cartAdditions,
        type: 'counter',
        unit: 'count',
        description: 'Number of cart additions',
        timestamp: metric.timestamp,
      },
      {
        name: 'checkouts',
        value: metric.checkouts,
        type: 'counter',
        unit: 'count',
        description: 'Number of checkouts',
        timestamp: metric.timestamp,
      },
      {
        name: 'purchases',
        value: metric.purchases,
        type: 'counter',
        unit: 'count',
        description: 'Number of purchases',
        timestamp: metric.timestamp,
      },
      {
        name: 'cart_to_checkout_rate',
        value: metric.cartToCheckoutRate,
        type: 'gauge',
        unit: 'percent',
        description: 'Cart to checkout conversion rate',
        timestamp: metric.timestamp,
      },
      {
        name: 'checkout_to_purchase_rate',
        value: metric.checkoutToPurchaseRate,
        type: 'gauge',
        unit: 'percent',
        description: 'Checkout to purchase conversion rate',
        timestamp: metric.timestamp,
      },
      {
        name: 'overall_conversion_rate',
        value: metric.overallConversionRate,
        type: 'gauge',
        unit: 'percent',
        description: 'Overall conversion rate',
        timestamp: metric.timestamp,
      },
      {
        name: 'average_order_value',
        value: metric.averageOrderValue,
        type: 'gauge',
        unit: 'currency',
        description: 'Average order value',
        timestamp: metric.timestamp,
      },
    ];

    await this.sendMetrics(businessMetrics);
  }

  // 记录订单处理效率指标
  async recordOrderProcessingMetric(metric: OrderProcessingMetric) {
    const businessMetrics: BusinessMetric[] = [
      {
        name: 'orders_received',
        value: metric.ordersReceived,
        type: 'counter',
        unit: 'count',
        description: 'Number of orders received',
        timestamp: metric.timestamp,
      },
      {
        name: 'orders_processed',
        value: metric.ordersProcessed,
        type: 'counter',
        unit: 'count',
        description: 'Number of orders processed',
        timestamp: metric.timestamp,
      },
      {
        name: 'orders_cancelled',
        value: metric.ordersCancelled,
        type: 'counter',
        unit: 'count',
        description: 'Number of orders cancelled',
        timestamp: metric.timestamp,
      },
      {
        name: 'average_processing_time',
        value: metric.averageProcessingTime,
        type: 'gauge',
        unit: 'seconds',
        description: 'Average order processing time',
        timestamp: metric.timestamp,
      },
      {
        name: 'processing_time_p50',
        value: metric.processingTimeP50,
        type: 'gauge',
        unit: 'seconds',
        description: 'Order processing time P50',
        timestamp: metric.timestamp,
      },
      {
        name: 'processing_time_p95',
        value: metric.processingTimeP95,
        type: 'gauge',
        unit: 'seconds',
        description: 'Order processing time P95',
        timestamp: metric.timestamp,
      },
      {
        name: 'processing_time_p99',
        value: metric.processingTimeP99,
        type: 'gauge',
        unit: 'seconds',
        description: 'Order processing time P99',
        timestamp: metric.timestamp,
      },
    ];

    await this.sendMetrics(businessMetrics);
  }

  // 发送指标到OpenObserve
  private async sendMetrics(metrics: BusinessMetric[]) {
    try {
      const payload = {
        metrics: metrics.map(metric => ({
          name: metric.name,
          value: metric.value,
          type: metric.type,
          labels: metric.labels || {},
          unit: metric.unit || '',
          description: metric.description || '',
          timestamp: metric.timestamp,
        })),
      };

      await this.httpService.post(
        `${this.config.url}/api/${this.config.organization}/metrics/_json`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.config.auth.token}`,
            'Content-Type': 'application/json',
          },
        },
      ).toPromise();

      this.logger.debug(`Sent ${metrics.length} business metrics to OpenObserve`);
    } catch (error) {
      this.logger.error('Failed to send business metrics to OpenObserve', error);
    }
  }
}
```

### 2.2 自定义指标注册器 (CustomMetricsRegistry)

#### 2.2.1 服务类设计

```typescript
@Injectable()
export class CustomMetricsRegistry {
  private readonly logger = new Logger(CustomMetricsRegistry.name);
  private readonly metrics = new Map<string, any>();

  constructor(
    @Inject('OPENOBSERVE_CONFIG') private readonly config: OpenObserveConfig,
    private readonly httpService: HttpService,
  ) {}

  // 注册计数器指标
  registerCounter(name: string, description: string, labels?: Record<string, string>) {
    if (this.metrics.has(name)) {
      throw new Error(`Metric ${name} already registered`);
    }

    const counter = {
      type: 'counter',
      name,
      description,
      labels: labels || {},
      value: 0,
    };

    this.metrics.set(name, counter);
    this.logger.debug(`Registered counter metric: ${name}`);
    
    return {
      inc: (value: number = 1, additionalLabels?: Record<string, string>) => {
        this.incrementCounter(name, value, additionalLabels);
      },
      get: () => counter.value,
    };
  }

  // 注册仪表指标
  registerGauge(name: string, description: string, labels?: Record<string, string>) {
    if (this.metrics.has(name)) {
      throw new Error(`Metric ${name} already registered`);
    }

    const gauge = {
      type: 'gauge',
      name,
      description,
      labels: labels || {},
      value: 0,
    };

    this.metrics.set(name, gauge);
    this.logger.debug(`Registered gauge metric: ${name}`);
    
    return {
      set: (value: number, additionalLabels?: Record<string, string>) => {
        this.setGauge(name, value, additionalLabels);
      },
      inc: (value: number = 1, additionalLabels?: Record<string, string>) => {
        this.incrementGauge(name, value, additionalLabels);
      },
      dec: (value: number = 1, additionalLabels?: Record<string, string>) => {
        this.decrementGauge(name, value, additionalLabels);
      },
      get: () => gauge.value,
    };
  }

  // 注册直方图指标
  registerHistogram(name: string, description: string, buckets: number[], labels?: Record<string, string>) {
    if (this.metrics.has(name)) {
      throw new Error(`Metric ${name} already registered`);
    }

    const histogram = {
      type: 'histogram',
      name,
      description,
      labels: labels || {},
      buckets: buckets.sort((a, b) => a - b),
      counts: new Array(buckets.length + 1).fill(0),
      sum: 0,
      count: 0,
    };

    this.metrics.set(name, histogram);
    this.logger.debug(`Registered histogram metric: ${name}`);
    
    return {
      observe: (value: number, additionalLabels?: Record<string, string>) => {
        this.observeHistogram(name, value, additionalLabels);
      },
      getBuckets: () => histogram.buckets,
      getCounts: () => histogram.counts,
    };
  }

  // 增加计数器
  private incrementCounter(name: string, value: number, additionalLabels?: Record<string, string>) {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'counter') {
      throw new Error(`Counter metric ${name} not found`);
    }

    metric.value += value;
    const labels = { ...metric.labels, ...additionalLabels };
    
    this.sendMetricUpdate(name, metric.value, labels);
  }

  // 设置仪表值
  private setGauge(name: string, value: number, additionalLabels?: Record<string, string>) {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'gauge') {
      throw new Error(`Gauge metric ${name} not found`);
    }

    metric.value = value;
    const labels = { ...metric.labels, ...additionalLabels };
    
    this.sendMetricUpdate(name, metric.value, labels);
  }

  // 增加仪表值
  private incrementGauge(name: string, value: number, additionalLabels?: Record<string, string>) {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'gauge') {
      throw new Error(`Gauge metric ${name} not found`);
    }

    metric.value += value;
    const labels = { ...metric.labels, ...additionalLabels };
    
    this.sendMetricUpdate(name, metric.value, labels);
  }

  // 减少仪表值
  private decrementGauge(name: string, value: number, additionalLabels?: Record<string, string>) {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'gauge') {
      throw new Error(`Gauge metric ${name} not found`);
    }

    metric.value -= value;
    const labels = { ...metric.labels, ...additionalLabels };
    
    this.sendMetricUpdate(name, metric.value, labels);
  }

  // 观察直方图
  private observeHistogram(name: string, value: number, additionalLabels?: Record<string, string>) {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'histogram') {
      throw new Error(`Histogram metric ${name} not found`);
    }

    metric.sum += value;
    metric.count += 1;
    
    // 找到合适的桶
    let bucketIndex = metric.buckets.length;
    for (let i = 0; i < metric.buckets.length; i++) {
      if (value <= metric.buckets[i]) {
        bucketIndex = i;
        break;
      }
    }
    
    // 增加桶计数
    for (let i = bucketIndex; i < metric.counts.length; i++) {
      metric.counts[i]++;
    }
    
    const labels = { ...metric.labels, ...additionalLabels };
    
    this.sendHistogramUpdate(name, metric, labels);
  }

  // 发送指标更新
  private async sendMetricUpdate(name: string, value: number, labels: Record<string, string>) {
    try {
      const payload = {
        name,
        value,
        labels,
        timestamp: new Date().toISOString(),
      };

      await this.httpService.post(
        `${this.config.url}/api/${this.config.organization}/metrics/_json`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.config.auth.token}`,
            'Content-Type': 'application/json',
          },
        },
      ).toPromise();
    } catch (error) {
      this.logger.error(`Failed to send metric update for ${name}`, error);
    }
  }

  // 发送直方图更新
  private async sendHistogramUpdate(name: string, histogram: any, labels: Record<string, string>) {
    try {
      const payload = {
        name,
        type: 'histogram',
        labels,
        buckets: histogram.buckets,
        counts: histogram.counts,
        sum: histogram.sum,
        count: histogram.count,
        timestamp: new Date().toISOString(),
      };

      await this.httpService.post(
        `${this.config.url}/api/${this.config.organization}/metrics/_json`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.config.auth.token}`,
            'Content-Type': 'application/json',
          },
        },
      ).toPromise();
    } catch (error) {
      this.logger.error(`Failed to send histogram update for ${name}`, error);
    }
  }

  // 获取所有指标
  getAllMetrics() {
    const result: any = {};
    
    this.metrics.forEach((metric, name) => {
      result[name] = {
        type: metric.type,
        description: metric.description,
        labels: metric.labels,
      };
      
      if (metric.type === 'counter' || metric.type === 'gauge') {
        result[name].value = metric.value;
      } else if (metric.type === 'histogram') {
        result[name].buckets = metric.buckets;
        result[name].counts = metric.counts;
        result[name].sum = metric.sum;
        result[name].count = metric.count;
      }
    });
    
    return result;
  }
}
```

## 3. 完善分布式追踪功能集成

### 3.1 分布式追踪增强服务 (DistributedTracingService)

#### 3.1.1 服务类设计

```typescript
@Injectable()
export class DistributedTracingService {
  private readonly logger = new Logger(DistributedTracingService.name);
  private readonly tracer: any;

  constructor(
    @Inject('OPENOBSERVE_CONFIG') private readonly config: OpenObserveConfig,
  ) {
    if (this.config.tracing.enabled) {
      const trace = require('@opentelemetry/api');
      this.tracer = trace.trace.getTracer('caddy-shopping-backend');
    }
  }

  // 创建业务操作span
  startBusinessSpan(operationName: string, attributes: Record<string, any> = {}) {
    if (!this.config.tracing.enabled) {
      return this.createNoOpSpan();
    }

    const span = this.tracer.startSpan(operationName, {
      attributes: {
        'service.name': 'caddy-shopping-backend',
        'service.version': '1.0.0',
        'operation.type': 'business',
        ...attributes,
      },
    });

    return span;
  }

  // 创建数据库操作span
  startDatabaseSpan(operationName: string, table: string, operation: string, attributes: Record<string, any> = {}) {
    if (!this.config.tracing.enabled) {
      return this.createNoOpSpan();
    }

    const span = this.tracer.startSpan(operationName, {
      attributes: {
        'service.name': 'caddy-shopping-backend',
        'service.version': '1.0.0',
        'operation.type': 'database',
        'db.table': table,
        'db.operation': operation,
        ...attributes,
      },
    });

    return span;
  }

  // 创建HTTP请求span
  startHttpSpan(method: string, url: string, attributes: Record<string, any> = {}) {
    if (!this.config.tracing.enabled) {
      return this.createNoOpSpan();
    }

    const span = this.tracer.startSpan(`HTTP ${method}`, {
      attributes: {
        'service.name': 'caddy-shopping-backend',
        'service.version': '1.0.0',
        'operation.type': 'http',
        'http.method': method,
        'http.url': url,
        ...attributes,
      },
    });

    return span;
  }

  // 创建缓存操作span
  startCacheSpan(operationName: string, key: string, operation: string, attributes: Record<string, any> = {}) {
    if (!this.config.tracing.enabled) {
      return this.createNoOpSpan();
    }

    const span = this.tracer.startSpan(operationName, {
      attributes: {
        'service.name': 'caddy-shopping-backend',
        'service.version': '1.0.0',
        'operation.type': 'cache',
        'cache.key': key,
        'cache.operation': operation,
        ...attributes,
      },
    });

    return span;
  }

  // 创建消息队列操作span
  startMessageSpan(operationName: string, topic: string, operation: string, attributes: Record<string, any> = {}) {
    if (!this.config.tracing.enabled) {
      return this.createNoOpSpan();
    }

    const span = this.tracer.startSpan(operationName, {
      attributes: {
        'service.name': 'caddy-shopping-backend',
        'service.version': '1.0.0',
        'operation.type': 'messaging',
        'messaging.topic': topic,
        'messaging.operation': operation,
        ...attributes,
      },
    });

    return span;
  }

  // 记录异常
  recordException(span: any, error: Error, attributes: Record<string, any> = {}) {
    if (!this.config.tracing.enabled || !span) {
      return;
    }

    span.recordException(error);
    span.setStatus({
      code: require('@opentelemetry/api').SpanStatusCode.ERROR,
      message: error.message,
    });

    // 添加错误属性
    span.setAttributes({
      'error.name': error.name,
      'error.message': error.message,
      'error.stack': error.stack,
      ...attributes,
    });
  }

  // 添加事件
  addEvent(span: any, eventName: string, attributes: Record<string, any> = {}) {
    if (!this.config.tracing.enabled || !span) {
      return;
    }

    span.addEvent(eventName, {
      timestamp: Date.now(),
      ...attributes,
    });
  }

  // 设置属性
  setAttributes(span: any, attributes: Record<string, any>) {
    if (!this.config.tracing.enabled || !span) {
      return;
    }

    span.setAttributes(attributes);
  }

  // 创建无操作span
  private createNoOpSpan() {
    return {
      setAttribute: () => {},
      setAttributes: () => {},
      addEvent: () => {},
      recordException: () => {},
      setStatus: () => {},
      end: () => {},
    };
  }
}
```

## 4. 增强OpenObserve告警和通知系统

### 4.1 告警规则引擎 (AlertRuleEngine)

#### 4.1.1 数据模型设计

```typescript
// 告警规则接口
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  timeWindow: string;
  evaluationInterval: string;
  notifications: NotificationConfig[];
  suppressions?: SuppressionRule[];
  escalation?: EscalationRule[];
  tags?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

// 通知配置接口
export interface NotificationConfig {
  type: 'email' | 'webhook' | 'slack' | 'sms';
  enabled: boolean;
  config: Record<string, any>;
  retryPolicy?: {
    maxRetries: number;
    retryInterval: string;
  };
}

// 抑制规则接口
export interface SuppressionRule {
  id: string;
  name: string;
  condition: string;
  timeWindow: string;
  enabled: boolean;
}

// 升级规则接口
export interface EscalationRule {
  id: string;
  name: string;
  condition: string;
  timeWindow: string;
  targetNotifications: NotificationConfig[];
  enabled: boolean;
}

// 告警实例接口
export interface AlertInstance {
  id: string;
  ruleId: string;
  ruleName: string;
  status: 'firing' | 'resolved' | 'suppressed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, any>;
  startsAt: string;
  endsAt?: string;
  notificationsSent: number;
  lastNotificationSent?: string;
  tags?: Record<string, string>;
}
```

#### 4.1.2 服务类设计

```typescript
@Injectable()
export class AlertRuleEngine {
  private readonly logger = new Logger(AlertRuleEngine.name);
  private readonly rules = new Map<string, AlertRule>();
  private readonly activeAlerts = new Map<string, AlertInstance>();
  private evaluationTimer: any;

  constructor(
    @Inject('OPENOBSERVE_CONFIG') private readonly config: OpenObserveConfig,
    private readonly httpService: HttpService,
    private readonly notificationService: NotificationService,
  ) {}

  // 启动告警引擎
  async start() {
    this.logger.log('Starting alert rule engine');
    
    // 加载现有规则
    await this.loadRules();
    
    // 启动定期评估
    this.startEvaluationTimer();
    
    this.logger.log('Alert rule engine started');
  }

  // 停止告警引擎
  async stop() {
    this.logger.log('Stopping alert rule engine');
    
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = null;
    }
    
    this.logger.log('Alert rule engine stopped');
  }

  // 创建告警规则
  async createRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertRule> {
    const newRule: AlertRule = {
      ...rule,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.rules.set(newRule.id, newRule);
    
    // 保存到数据库
    await this.saveRule(newRule);
    
    this.logger.log(`Created alert rule: ${newRule.name} (${newRule.id})`);
    
    return newRule;
  }

  // 更新告警规则
  async updateRule(id: string, updates: Partial<AlertRule>): Promise<AlertRule> {
    const rule = this.rules.get(id);
    if (!rule) {
      throw new Error(`Alert rule not found: ${id}`);
    }

    const updatedRule: AlertRule = {
      ...rule,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.rules.set(id, updatedRule);
    
    // 保存到数据库
    await this.saveRule(updatedRule);
    
    this.logger.log(`Updated alert rule: ${updatedRule.name} (${updatedRule.id})`);
    
    return updatedRule;
  }

  // 删除告警规则
  async deleteRule(id: string): Promise<void> {
    const rule = this.rules.get(id);
    if (!rule) {
      throw new Error(`Alert rule not found: ${id}`);
    }

    this.rules.delete(id);
    
    // 从数据库删除
    await this.deleteRuleFromDb(id);
    
    this.logger.log(`Deleted alert rule: ${rule.name} (${rule.id})`);
  }

  // 获取所有规则
  getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  // 获取规则
  getRule(id: string): AlertRule | undefined {
    return this.rules.get(id);
  }

  // 启用/禁用规则
  async toggleRule(id: string, enabled: boolean): Promise<AlertRule> {
    return this.updateRule(id, { enabled });
  }

  // 手动评估规则
  async evaluateRule(id: string): Promise<void> {
    const rule = this.rules.get(id);
    if (!rule || !rule.enabled) {
      return;
    }

    await this.evaluateSingleRule(rule);
  }

  // 启动评估定时器
  private startEvaluationTimer() {
    // 每分钟评估一次规则
    this.evaluationTimer = setInterval(async () => {
      await this.evaluateAllRules();
    }, 60000);
  }

  // 评估所有规则
  private async evaluateAllRules() {
    const enabledRules = Array.from(this.rules.values()).filter(rule => rule.enabled);
    
    await Promise.all(enabledRules.map(rule => this.evaluateSingleRule(rule)));
  }

  // 评估单个规则
  private async evaluateSingleRule(rule: AlertRule) {
    try {
      // 检查抑制规则
      if (await this.isSuppressed(rule)) {
        return;
      }

      // 查询指标数据
      const value = await this.queryMetric(rule);
      
      // 评估条件
      const conditionMet = this.evaluateCondition(value, rule);
      
      // 查找现有告警
      const existingAlert = Array.from(this.activeAlerts.values())
        .find(alert => alert.ruleId === rule.id && alert.status === 'firing');
      
      if (conditionMet && !existingAlert) {
        // 创建新告警
        await this.createAlert(rule, value);
      } else if (!conditionMet && existingAlert) {
        // 解决告警
        await this.resolveAlert(existingAlert.id);
      } else if (conditionMet && existingAlert) {
        // 更新告警
        await this.updateAlert(existingAlert.id, value);
      }
    } catch (error) {
      this.logger.error(`Failed to evaluate rule ${rule.name}`, error);
    }
  }

  // 查询指标
  private async queryMetric(rule: AlertRule): Promise<number> {
    const query = this.buildMetricQuery(rule);
    
    try {
      const response = await this.httpService.post(
        `${this.config.url}/api/${this.config.organization}/_search`,
        { query },
        {
          headers: {
            'Authorization': `Bearer ${this.config.auth.token}`,
            'Content-Type': 'application/json',
          },
        },
      ).toPromise();

      return this.extractMetricValue(response.data, rule);
    } catch (error) {
      this.logger.error(`Failed to query metric for rule ${rule.name}`, error);
      throw error;
    }
  }

  // 构建指标查询
  private buildMetricQuery(rule: AlertRule): string {
    const timeWindow = this.parseTimeWindow(rule.timeWindow);
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeWindow);

    return `
      SELECT AVG(value) as avg_value
      FROM metrics 
      WHERE name = '${rule.condition}' 
        AND timestamp >= '${startTime.toISOString()}' 
        AND timestamp <= '${endTime.toISOString()}'
    `;
  }

  // 解析时间窗口
  private parseTimeWindow(timeWindow: string): number {
    const match = timeWindow.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid time window format: ${timeWindow}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: throw new Error(`Unknown time unit: ${unit}`);
    }
  }

  // 提取指标值
  private extractMetricValue(data: any, rule: AlertRule): number {
    if (!data.hits || !data.hits.hits || data.hits.hits.length === 0) {
      return 0;
    }

    const hit = data.hits.hits[0];
    const fields = hit.fields || hit._source;

    if (fields && fields.avg_value && fields.avg_value.length > 0) {
      return fields.avg_value[0];
    }

    return 0;
  }

  // 评估条件
  private evaluateCondition(value: number, rule: AlertRule): boolean {
    switch (rule.operator) {
      case '>': return value > rule.threshold;
      case '<': return value < rule.threshold;
      case '>=': return value >= rule.threshold;
      case '<=': return value <= rule.threshold;
      case '==': return value === rule.threshold;
      case '!=': return value !== rule.threshold;
      default: return false;
    }
  }

  // 检查是否被抑制
  private async isSuppressed(rule: AlertRule): Promise<boolean> {
    if (!rule.suppressions || rule.suppressions.length === 0) {
      return false;
    }

    for (const suppression of rule.suppressions) {
      if (suppression.enabled && await this.evaluateSuppression(suppression)) {
        return true;
      }
    }

    return false;
  }

  // 评估抑制规则
  private async evaluateSuppression(suppression: SuppressionRule): Promise<boolean> {
    const query = this.buildSuppressionQuery(suppression);
    
    try {
      const response = await this.httpService.post(
        `${this.config.url}/api/${this.config.organization}/_search`,
        { query },
        {
          headers: {
            'Authorization': `Bearer ${this.config.auth.token}`,
            'Content-Type': 'application/json',
          },
        },
      ).toPromise();

      return response.data.hits?.total?.value > 0;
    } catch (error) {
      this.logger.error(`Failed to evaluate suppression rule ${suppression.name}`, error);
      return false;
    }
  }

  // 构建抑制查询
  private buildSuppressionQuery(suppression: SuppressionRule): string {
    const timeWindow = this.parseTimeWindow(suppression.timeWindow);
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeWindow);

    return `
      SELECT COUNT(*) as count
      FROM alerts 
      WHERE ${suppression.condition} 
        AND timestamp >= '${startTime.toISOString()}' 
        AND timestamp <= '${endTime.toISOString()}'
    `;
  }

  // 创建告警
  private async createAlert(rule: AlertRule, value: number): Promise<void> {
    const alert: AlertInstance = {
      id: this.generateId(),
      ruleId: rule.id,
      ruleName: rule.name,
      status: 'firing',
      severity: rule.severity,
      message: this.buildAlertMessage(rule, value),
      details: {
        rule: rule,
        currentValue: value,
        threshold: rule.threshold,
        operator: rule.operator,
      },
      startsAt: new Date().toISOString(),
      notificationsSent: 0,
      tags: rule.tags,
    };

    this.activeAlerts.set(alert.id, alert);
    
    // 保存到数据库
    await this.saveAlert(alert);
    
    // 发送通知
    await this.sendNotifications(alert, rule.notifications);
    
    this.logger.warn(`Alert fired: ${alert.message} (${alert.id})`);
  }

  // 解决告警
  private async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return;
    }

    alert.status = 'resolved';
    alert.endsAt = new Date().toISOString();
    
    // 保存到数据库
    await this.saveAlert(alert);
    
    // 从活动告警中移除
    this.activeAlerts.delete(alertId);
    
    this.logger.log(`Alert resolved: ${alert.message} (${alert.id})`);
  }

  // 更新告警
  private async updateAlert(alertId: string, value: number): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return;
    }

    alert.details.currentValue = value;
    alert.message = this.buildAlertMessage(alert.details.rule, value);
    
    // 保存到数据库
    await this.saveAlert(alert);
    
    // 检查是否需要升级
    await this.checkEscalation(alert);
  }

  // 检查升级
  private async checkEscalation(alert: AlertInstance): Promise<void> {
    const rule = this.rules.get(alert.ruleId);
    if (!rule || !rule.escalation || !rule.escalation.enabled) {
      return;
    }

    const escalation = rule.escalation;
    const timeSinceStart = Date.now() - new Date(alert.startsAt).getTime();
    const escalationTimeWindow = this.parseTimeWindow(escalation.timeWindow);

    if (timeSinceStart >= escalationTimeWindow) {
      // 升级告警
      await this.escalateAlert(alert, escalation);
    }
  }

  // 升级告警
  private async escalateAlert(alert: AlertInstance, escalation: EscalationRule): Promise<void> {
    alert.severity = 'critical' as const;
    alert.message += ` [ESCALATED]`;
    
    // 保存到数据库
    await this.saveAlert(alert);
    
    // 发送升级通知
    await this.sendNotifications(alert, escalation.targetNotifications);
    
    this.logger.warn(`Alert escalated: ${alert.message} (${alert.id})`);
  }

  // 发送通知
  private async sendNotifications(alert: AlertInstance, notifications: NotificationConfig[]): Promise<void> {
    for (const notification of notifications) {
      if (!notification.enabled) {
        continue;
      }

      try {
        await this.notificationService.sendNotification(alert, notification);
        alert.notificationsSent++;
        alert.lastNotificationSent = new Date().toISOString();
      } catch (error) {
        this.logger.error(`Failed to send ${notification.type} notification for alert ${alert.id}`, error);
      }
    }
  }

  // 构建告警消息
  private buildAlertMessage(rule: AlertRule, value: number): string {
    return `${rule.name}: ${rule.description} (Current: ${value}, Threshold: ${rule.threshold})`;
  }

  // 生成ID
  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 加载规则
  private async loadRules(): Promise<void> {
    try {
      // 从数据库加载规则
      const rules = await this.loadRulesFromDb();
      
      rules.forEach(rule => {
        this.rules.set(rule.id, rule);
      });
      
      this.logger.log(`Loaded ${rules.length} alert rules`);
    } catch (error) {
      this.logger.error('Failed to load alert rules', error);
    }
  }

  // 从数据库加载规则
  private async loadRulesFromDb(): Promise<AlertRule[]> {
    // 实现数据库加载逻辑
    return [];
  }

  // 保存规则
  private async saveRule(rule: AlertRule): Promise<void> {
    // 实现数据库保存逻辑
  }

  // 从数据库删除规则
  private async deleteRuleFromDb(id: string): Promise<void> {
    // 实现数据库删除逻辑
  }

  // 保存告警
  private async saveAlert(alert: AlertInstance): Promise<void> {
    // 实现数据库保存逻辑
  }
}
```

## 5. 创建OpenObserve微服务配置管理模块

### 5.1 OpenObserve配置服务 (OpenObserveConfigService)

#### 5.1.1 配置接口设计

```typescript
// OpenObserve配置接口
export interface OpenObserveConfig {
  url: string;
  organization: string;
  auth: {
    type: 'bearer' | 'basic';
    token?: string;
    username?: string;
    password?: string;
  };
  streams: {
    application_logs: string;
    business_events: string;
    user_behavior: string;
    metrics: string;
    traces: string;
  };
  retention: {
    logs: string;
    metrics: string;
    traces: string;
    business_events: string;
  };
  performance: {
    batch_size: number;
    flush_interval: number;
    max_retries: number;
    timeout: number;
  };
  tracing: {
    enabled: boolean;
    sampling_rate: number;
  };
  alerts: {
    enabled: boolean;
    evaluation_interval: number;
  };
}
```

#### 5.1.2 服务类设计

```typescript
@Injectable()
export class OpenObserveConfigService {
  private readonly logger = new Logger(OpenObserveConfigService.name);
  private config: OpenObserveConfig;

  constructor(
    @Inject('CONFIG_OPTIONS') private readonly options: any,
  ) {
    this.config = this.buildConfig();
  }

  // 获取配置
  getConfig(): OpenObserveConfig {
    return this.config;
  }

  // 更新配置
  updateConfig(updates: Partial<OpenObserveConfig>): void {
    this.config = { ...this.config, ...updates };
    this.logger.log('OpenObserve configuration updated');
  }

  // 构建配置
  private buildConfig(): OpenObserveConfig {
    return {
      url: process.env.OPENOBSERVE_URL || 'http://localhost:5080',
      organization: process.env.OPENOBSERVE_ORGANIZATION || 'default',
      auth: {
        type: 'bearer',
        token: process.env.OPENOBSERVE_TOKEN || '',
      },
      streams: {
        application_logs: process.env.OPENOBSERVE_STREAM_APPLICATION_LOGS || 'application-logs',
        business_events: process.env.OPENOBSERVE_STREAM_BUSINESS_EVENTS || 'business-events',
        user_behavior: process.env.OPENOBSERVE_STREAM_USER_BEHAVIOR || 'user-behavior',
        metrics: process.env.OPENOBSERVE_STREAM_METRICS || 'metrics',
        traces: process.env.OPENOBSERVE_STREAM_TRACES || 'traces',
      },
      retention: {
        logs: process.env.OPENOBSERVE_RETENTION_LOGS || '30d',
        metrics: process.env.OPENOBSERVE_RETENTION_METRICS || '90d',
        traces: process.env.OPENOBSERVE_RETENTION_TRACES || '7d',
        business_events: process.env.OPENOBSERVE_RETENTION_BUSINESS_EVENTS || '365d',
      },
      performance: {
        batch_size: parseInt(process.env.OPENOBSERVE_BATCH_SIZE || '100', 10),
        flush_interval: parseInt(process.env.OPENOBSERVE_FLUSH_INTERVAL || '5000', 10),
        max_retries: parseInt(process.env.OPENOBSERVE_MAX_RETRIES || '3', 10),
        timeout: parseInt(process.env.OPENOBSERVE_TIMEOUT || '30000', 10),
      },
      tracing: {
        enabled: process.env.OPENOBSERVE_TRACING_ENABLED === 'true',
        sampling_rate: parseFloat(process.env.OPENOBSERVE_TRACING_SAMPLING_RATE || '0.1'),
      },
      alerts: {
        enabled: process.env.OPENOBSERVE_ALERTS_ENABLED === 'true',
        evaluation_interval: parseInt(process.env.OPENOBSERVE_ALERTS_EVALUATION_INTERVAL || '60', 10),
      },
    };
  }
}
```

## 6. 实施建议

基于以上设计，建议按以下顺序实施：

1. **第一阶段**：完善电商网站日志收集和分析模块
   - 实现BusinessLoggerService
   - 实现UserBehaviorTracker
   - 实现LogAnalyticsService

2. **第二阶段**：增强OpenObserve指标监控功能
   - 实现BusinessMetricsCollector
   - 实现CustomMetricsRegistry

3. **第三阶段**：完善分布式追踪功能集成
   - 实现DistributedTracingService

4. **第四阶段**：增强OpenObserve告警和通知系统
   - 实现AlertRuleEngine
   - 实现NotificationService

5. **第五阶段**：创建OpenObserve微服务配置管理模块
   - 实现OpenObserveConfigService

每个阶段完成后，建议进行充分的测试和验证，确保功能正常后再进行下一阶段的实施。

这些代码实现需要切换到Code模式进行编辑和实施。