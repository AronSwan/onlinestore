# OpenObserve剩余模块详细设计

## 6. 实现OpenObserve数据管道处理

### 6.1 数据转换器 (DataTransformer)

#### 6.1.1 服务类设计

```typescript
@Injectable()
export class DataTransformer {
  private readonly logger = new Logger(DataTransformerService.name);

  constructor(
    @Inject('OPENOBSERVE_CONFIG') private readonly config: OpenObserveConfig,
  ) {}

  // 转换日志数据
  transformLogData(rawData: any): any {
    try {
      return {
        timestamp: this.extractTimestamp(rawData),
        level: this.normalizeLogLevel(rawData.level),
        service: rawData.service || 'unknown',
        message: rawData.message || '',
        traceId: rawData.traceId,
        spanId: rawData.spanId,
        userId: rawData.userId,
        sessionId: rawData.sessionId,
        requestId: rawData.requestId,
        tags: this.extractTags(rawData),
        metadata: this.extractMetadata(rawData),
      };
    } catch (error) {
      this.logger.error('Failed to transform log data', error);
      throw error;
    }
  }

  // 转换指标数据
  transformMetricData(rawData: any): any {
    try {
      return {
        name: rawData.name,
        value: parseFloat(rawData.value),
        type: rawData.type || 'gauge',
        labels: this.extractLabels(rawData),
        unit: rawData.unit || '',
        description: rawData.description || '',
        timestamp: this.extractTimestamp(rawData),
      };
    } catch (error) {
      this.logger.error('Failed to transform metric data', error);
      throw error;
    }
  }

  // 转换追踪数据
  transformTraceData(rawData: any): any {
    try {
      return {
        traceId: rawData.traceId,
        spanId: rawData.spanId,
        parentSpanId: rawData.parentSpanId,
        operationName: rawData.operationName,
        startTime: parseFloat(rawData.startTime),
        endTime: parseFloat(rawData.endTime),
        duration: parseFloat(rawData.endTime) - parseFloat(rawData.startTime),
        tags: this.extractTags(rawData),
        logs: this.extractLogs(rawData),
        status: this.extractStatus(rawData),
      };
    } catch (error) {
      this.logger.error('Failed to transform trace data', error);
      throw error;
    }
  }

  // 提取时间戳
  private extractTimestamp(data: any): string {
    if (data.timestamp) {
      return typeof data.timestamp === 'string' ? data.timestamp : new Date(data.timestamp).toISOString();
    }
    return new Date().toISOString();
  }

  // 标准化日志级别
  private normalizeLogLevel(level: string): 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' {
    if (!level) return 'INFO';
    
    const normalizedLevel = level.toUpperCase();
    switch (normalizedLevel) {
      case 'DEBUG':
      case 'TRACE':
        return 'DEBUG';
      case 'INFO':
      case 'INFORMATION':
        return 'INFO';
      case 'WARN':
      case 'WARNING':
        return 'WARN';
      case 'ERROR':
      case 'FATAL':
      case 'CRITICAL':
        return 'ERROR';
      default:
        return 'INFO';
    }
  }

  // 提取标签
  private extractTags(data: any): Record<string, any> {
    return data.tags || data.labels || {};
  }

  // 提取元数据
  private extractMetadata(data: any): Record<string, any> {
    const metadata = { ...data };
    
    // 移除已处理的字段
    delete metadata.timestamp;
    delete metadata.level;
    delete metadata.service;
    delete metadata.message;
    delete metadata.traceId;
    delete metadata.spanId;
    delete metadata.userId;
    delete metadata.sessionId;
    delete metadata.requestId;
    delete metadata.tags;
    delete metadata.labels;
    
    return metadata;
  }

  // 提取标签
  private extractLabels(data: any): Record<string, string> {
    const labels: Record<string, string> = {};
    
    if (data.labels) {
      Object.keys(data.labels).forEach(key => {
        labels[key] = String(data.labels[key]);
      });
    }
    
    return labels;
  }

  // 提取日志
  private extractLogs(data: any): any[] {
    return data.logs || [];
  }

  // 提取状态
  private extractStatus(data: any): any {
    return data.status || { code: 0, message: 'OK' };
  }
}
```

### 6.2 数据富化器 (DataEnricher)

#### 6.2.1 服务类设计

```typescript
@Injectable()
export class DataEnricher {
  private readonly logger = new Logger(DataEnricher.name);

  constructor(
    @Inject('OPENOBSERVE_CONFIG') private readonly config: OpenObserveConfig,
    private readonly userService: UserService,
    private readonly productService: ProductService,
    private readonly orderService: OrderService,
  ) {}

  // 富化日志数据
  async enrichLogData(logData: any): Promise<any> {
    try {
      const enrichedData = { ...logData };

      // 富化用户信息
      if (logData.userId) {
        enrichedData.userInfo = await this.getUserInfo(logData.userId);
      }

      // 富化地理位置信息
      if (logData.metadata?.ip) {
        enrichedData.geoInfo = await this.getGeoInfo(logData.metadata.ip);
      }

      // 富化用户代理信息
      if (logData.metadata?.userAgent) {
        enrichedData.userAgentInfo = this.parseUserAgent(logData.metadata.userAgent);
      }

      return enrichedData;
    } catch (error) {
      this.logger.error('Failed to enrich log data', error);
      return logData;
    }
  }

  // 富化指标数据
  async enrichMetricData(metricData: any): Promise<any> {
    try {
      const enrichedData = { ...metricData };

      // 添加环境信息
      enrichedData.environment = process.env.NODE_ENV || 'development';
      
      // 添加主机信息
      enrichedData.hostInfo = this.getHostInfo();

      // 添加应用信息
      enrichedData.appInfo = this.getAppInfo();

      return enrichedData;
    } catch (error) {
      this.logger.error('Failed to enrich metric data', error);
      return metricData;
    }
  }

  // 富化业务事件数据
  async enrichBusinessEventData(eventData: any): Promise<any> {
    try {
      const enrichedData = { ...eventData };

      // 根据事件类型富化数据
      switch (eventData.category) {
        case 'USER':
          if (eventData.userId) {
            enrichedData.userInfo = await this.getUserInfo(eventData.userId);
          }
          break;
        
        case 'ORDER':
          if (eventData.businessContext?.orderId) {
            enrichedData.orderInfo = await this.getOrderInfo(eventData.businessContext.orderId);
          }
          break;
        
        case 'PAYMENT':
          if (eventData.businessContext?.paymentId) {
            enrichedData.paymentInfo = await this.getPaymentInfo(eventData.businessContext.paymentId);
          }
          break;
        
        case 'INVENTORY':
          if (eventData.businessContext?.productId) {
            enrichedData.productInfo = await this.getProductInfo(eventData.businessContext.productId);
          }
          break;
      }

      return enrichedData;
    } catch (error) {
      this.logger.error('Failed to enrich business event data', error);
      return eventData;
    }
  }

  // 获取用户信息
  private async getUserInfo(userId: string): Promise<any> {
    try {
      const user = await this.userService.findById(userId);
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      };
    } catch (error) {
      this.logger.warn(`Failed to get user info for ${userId}`, error);
      return null;
    }
  }

  // 获取订单信息
  private async getOrderInfo(orderId: string): Promise<any> {
    try {
      const order = await this.orderService.findById(orderId);
      return {
        id: order.id,
        userId: order.userId,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };
    } catch (error) {
      this.logger.warn(`Failed to get order info for ${orderId}`, error);
      return null;
    }
  }

  // 获取支付信息
  private async getPaymentInfo(paymentId: string): Promise<any> {
    try {
      const payment = await this.orderService.findPaymentById(paymentId);
      return {
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        status: payment.status,
        method: payment.method,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      };
    } catch (error) {
      this.logger.warn(`Failed to get payment info for ${paymentId}`, error);
      return null;
    }
  }

  // 获取产品信息
  private async getProductInfo(productId: string): Promise<any> {
    try {
      const product = await this.productService.findById(productId);
      return {
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        stock: product.stock,
        status: product.status,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    } catch (error) {
      this.logger.warn(`Failed to get product info for ${productId}`, error);
      return null;
    }
  }

  // 获取地理位置信息
  private async getGeoInfo(ip: string): Promise<any> {
    try {
      // 使用IP地理位置服务获取地理位置信息
      const response = await axios.get(`http://ip-api.com/json/${ip}`);
      return {
        country: response.data.country,
        region: response.data.regionName,
        city: response.data.city,
        lat: response.data.lat,
        lon: response.data.lon,
        timezone: response.data.timezone,
      };
    } catch (error) {
      this.logger.warn(`Failed to get geo info for ${ip}`, error);
      return null;
    }
  }

  // 解析用户代理
  private parseUserAgent(userAgent: string): any {
    try {
      // 使用UA解析库解析用户代理
      const UAParser = require('ua-parser-js');
      const parser = new UAParser(userAgent);
      const result = parser.getResult();
      
      return {
        browser: {
          name: result.browser.name,
          version: result.browser.version,
        },
        os: {
          name: result.os.name,
          version: result.os.version,
        },
        device: {
          type: result.device.type,
          vendor: result.device.vendor,
          model: result.device.model,
        },
        engine: {
          name: result.engine.name,
          version: result.engine.version,
        },
      };
    } catch (error) {
      this.logger.warn(`Failed to parse user agent: ${userAgent}`, error);
      return null;
    }
  }

  // 获取主机信息
  private getHostInfo(): any {
    const os = require('os');
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      cpus: os.cpus().length,
    };
  }

  // 获取应用信息
  private getAppInfo(): any {
    return {
      name: process.env.APP_NAME || 'caddy-shopping-backend',
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid,
      nodeVersion: process.version,
    };
  }
}
```

### 6.3 数据质量检查器 (DataQualityChecker)

#### 6.3.1 服务类设计

```typescript
@Injectable()
export class DataQualityChecker {
  private readonly logger = new Logger(DataQualityChecker.name);

  constructor(
    @Inject('OPENOBSERVE_CONFIG') private readonly config: OpenObserveConfig,
  ) {}

  // 检查日志数据质量
  checkLogDataQuality(logData: any): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查必需字段
    if (!logData.timestamp) {
      errors.push('Missing timestamp field');
    }

    if (!logData.level) {
      errors.push('Missing level field');
    } else if (!['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(logData.level)) {
      errors.push(`Invalid level value: ${logData.level}`);
    }

    if (!logData.service) {
      warnings.push('Missing service field');
    }

    if (!logData.message) {
      warnings.push('Missing message field');
    }

    // 检查时间戳格式
    if (logData.timestamp && !this.isValidTimestamp(logData.timestamp)) {
      errors.push(`Invalid timestamp format: ${logData.timestamp}`);
    }

    // 检查字段长度
    if (logData.message && logData.message.length > 10000) {
      warnings.push('Message field is very long (>10000 characters)');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // 检查指标数据质量
  checkMetricDataQuality(metricData: any): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查必需字段
    if (!metricData.name) {
      errors.push('Missing name field');
    }

    if (metricData.value === undefined || metricData.value === null) {
      errors.push('Missing value field');
    } else if (typeof metricData.value !== 'number' || isNaN(metricData.value)) {
      errors.push(`Invalid value type: ${typeof metricData.value}`);
    }

    if (!metricData.timestamp) {
      errors.push('Missing timestamp field');
    }

    // 检查指标类型
    if (metricData.type && !['counter', 'gauge', 'histogram', 'summary'].includes(metricData.type)) {
      warnings.push(`Unknown metric type: ${metricData.type}`);
    }

    // 检查时间戳格式
    if (metricData.timestamp && !this.isValidTimestamp(metricData.timestamp)) {
      errors.push(`Invalid timestamp format: ${metricData.timestamp}`);
    }

    // 检查标签值
    if (metricData.labels) {
      Object.keys(metricData.labels).forEach(key => {
        if (typeof metricData.labels[key] !== 'string') {
          warnings.push(`Label value for ${key} is not a string`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // 检查追踪数据质量
  checkTraceDataQuality(traceData: any): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查必需字段
    if (!traceData.traceId) {
      errors.push('Missing traceId field');
    } else if (!this.isValidTraceId(traceData.traceId)) {
      errors.push(`Invalid traceId format: ${traceData.traceId}`);
    }

    if (!traceData.spanId) {
      errors.push('Missing spanId field');
    } else if (!this.isValidSpanId(traceData.spanId)) {
      errors.push(`Invalid spanId format: ${traceData.spanId}`);
    }

    if (!traceData.operationName) {
      warnings.push('Missing operationName field');
    }

    if (traceData.startTime === undefined || traceData.startTime === null) {
      errors.push('Missing startTime field');
    }

    if (traceData.endTime === undefined || traceData.endTime === null) {
      errors.push('Missing endTime field');
    }

    // 检查时间关系
    if (traceData.startTime !== undefined && traceData.endTime !== undefined) {
      if (traceData.endTime < traceData.startTime) {
        errors.push('EndTime is before StartTime');
      }

      const duration = traceData.endTime - traceData.startTime;
      if (duration < 0) {
        errors.push(`Invalid duration: ${duration}`);
      } else if (duration > 3600000) { // 1小时
        warnings.push(`Very long duration: ${duration}ms`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // 检查时间戳格式
  private isValidTimestamp(timestamp: string): boolean {
    // ISO 8601格式检查
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
    return iso8601Regex.test(timestamp);
  }

  // 检查追踪ID格式
  private isValidTraceId(traceId: string): boolean {
    // 16字节的十六进制字符串
    const traceIdRegex = /^[a-f0-9]{32}$/i;
    return traceIdRegex.test(traceId);
  }

  // 检查Span ID格式
  private isValidSpanId(spanId: string): boolean {
    // 8字节的十六进制字符串
    const spanIdRegex = /^[a-f0-9]{16}$/i;
    return spanIdRegex.test(spanId);
  }
}
```

## 7. 开发OpenObserve仪表板定制功能

### 7.1 仪表板服务 (DashboardService)

#### 7.1.1 数据模型设计

```typescript
// 仪表板接口
export interface Dashboard {
  id: string;
  name: string;
  description: string;
  owner: string;
  tags: string[];
  panels: Panel[];
  variables?: Variable[];
  timeRange: {
    from: string;
    to: string;
  };
  refreshInterval?: string;
  createdAt: string;
  updatedAt: string;
}

// 面板接口
export interface Panel {
  id: string;
  title: string;
  type: 'table' | 'line' | 'bar' | 'pie' | 'stat' | 'heatmap' | 'gauge';
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  query: {
    sql: string;
    timeRange?: {
      from: string;
      to: string;
    };
  };
  visualization: {
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

// 变量接口
export interface Variable {
  id: string;
  name: string;
  type: 'query' | 'custom' | 'constant';
  query?: string;
  values?: string[];
  defaultValue?: string;
  refreshOnLoad?: boolean;
}
```

#### 7.1.2 服务类设计

```typescript
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Inject('OPENOBSERVE_CONFIG') private readonly config: OpenObserveConfig,
    private readonly httpService: HttpService,
  ) {}

  // 创建仪表板
  async createDashboard(dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<Dashboard> {
    const newDashboard: Dashboard = {
      ...dashboard,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 保存到OpenObserve
    await this.saveDashboard(newDashboard);
    
    this.logger.log(`Created dashboard: ${newDashboard.name} (${newDashboard.id})`);
    
    return newDashboard;
  }

  // 更新仪表板
  async updateDashboard(id: string, updates: Partial<Dashboard>): Promise<Dashboard> {
    const existingDashboard = await this.getDashboard(id);
    if (!existingDashboard) {
      throw new Error(`Dashboard not found: ${id}`);
    }

    const updatedDashboard: Dashboard = {
      ...existingDashboard,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // 保存到OpenObserve
    await this.saveDashboard(updatedDashboard);
    
    this.logger.log(`Updated dashboard: ${updatedDashboard.name} (${updatedDashboard.id})`);
    
    return updatedDashboard;
  }

  // 删除仪表板
  async deleteDashboard(id: string): Promise<void> {
    const dashboard = await this.getDashboard(id);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${id}`);
    }

    // 从OpenObserve删除
    await this.deleteDashboardFromObserve(id);
    
    this.logger.log(`Deleted dashboard: ${dashboard.name} (${dashboard.id})`);
  }

  // 获取仪表板
  async getDashboard(id: string): Promise<Dashboard | null> {
    try {
      const response = await this.httpService.get(
        `${this.config.url}/api/${this.config.organization}/dashboards/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.auth.token}`,
          },
        },
      ).toPromise();

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      this.logger.error(`Failed to get dashboard ${id}`, error);
      throw error;
    }
  }

  // 获取所有仪表板
  async getAllDashboards(): Promise<Dashboard[]> {
    try {
      const response = await this.httpService.get(
        `${this.config.url}/api/${this.config.organization}/dashboards`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.auth.token}`,
          },
        },
      ).toPromise();

      return response.data.dashboards || [];
    } catch (error) {
      this.logger.error('Failed to get all dashboards', error);
      throw error;
    }
  }

  // 查询仪表板数据
  async queryDashboardData(dashboardId: string, timeRange?: { from: string; to: string }, variables?: Record<string, string>): Promise<any> {
    const dashboard = await this.getDashboard(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const results: any = {};

    // 处理变量
    const resolvedVariables = await this.resolveVariables(dashboard.variables || [], variables);

    // 查询每个面板的数据
    for (const panel of dashboard.panels) {
      try {
        const query = this.substituteVariables(panel.query.sql, resolvedVariables);
        const panelTimeRange = panel.query.timeRange || timeRange || dashboard.timeRange;
        
        const response = await this.httpService.post(
          `${this.config.url}/api/${this.config.organization}/_search`,
          {
            query: this.applyTimeRange(query, panelTimeRange),
          },
          {
            headers: {
              'Authorization': `Bearer ${this.config.auth.token}`,
              'Content-Type': 'application/json',
            },
          },
        ).toPromise();

        results[panel.id] = {
          panel: panel,
          data: response.data,
          error: null,
        };
      } catch (error) {
        this.logger.error(`Failed to query data for panel ${panel.id}`, error);
        results[panel.id] = {
          panel: panel,
          data: null,
          error: error.message,
        };
      }
    }

    return results;
  }

  // 创建预定义仪表板
  async createPredefinedDashboards(): Promise<void> {
    // 创建系统概览仪表板
    await this.createSystemOverviewDashboard();
    
    // 创建用户行为仪表板
    await this.createUserBehaviorDashboard();
    
    // 创建订单分析仪表板
    await this.createOrderAnalysisDashboard();
    
    // 创建性能监控仪表板
    await this.createPerformanceMonitoringDashboard();
  }

  // 保存仪表板到OpenObserve
  private async saveDashboard(dashboard: Dashboard): Promise<void> {
    try {
      await this.httpService.post(
        `${this.config.url}/api/${this.config.organization}/dashboards`,
        dashboard,
        {
          headers: {
            'Authorization': `Bearer ${this.config.auth.token}`,
            'Content-Type': 'application/json',
          },
        },
      ).toPromise();
    } catch (error) {
      this.logger.error(`Failed to save dashboard ${dashboard.id}`, error);
      throw error;
    }
  }

  // 从OpenObserve删除仪表板
  private async deleteDashboardFromObserve(id: string): Promise<void> {
    try {
      await this.httpService.delete(
        `${this.config.url}/api/${this.config.organization}/dashboards/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.auth.token}`,
          },
        },
      ).toPromise();
    } catch (error) {
      this.logger.error(`Failed to delete dashboard ${id}`, error);
      throw error;
    }
  }

  // 解析变量
  private async resolveVariables(variables: Variable[], inputVariables?: Record<string, string>): Promise<Record<string, string>> {
    const resolved: Record<string, string> = {};

    for (const variable of variables) {
      if (inputVariables && inputVariables[variable.name]) {
        resolved[variable.name] = inputVariables[variable.name];
      } else if (variable.type === 'constant' && variable.defaultValue) {
        resolved[variable.name] = variable.defaultValue;
      } else if (variable.type === 'custom' && variable.values && variable.values.length > 0) {
        resolved[variable.name] = variable.defaultValue || variable.values[0];
      } else if (variable.type === 'query' && variable.query) {
        try {
          const response = await this.httpService.post(
            `${this.config.url}/api/${this.config.organization}/_search`,
            { query: variable.query },
            {
              headers: {
                'Authorization': `Bearer ${this.config.auth.token}`,
                'Content-Type': 'application/json',
              },
            },
          ).toPromise();

          const values = response.data.hits?.hits?.map((hit: any) => hit._source.value) || [];
          resolved[variable.name] = variable.defaultValue || (values.length > 0 ? values[0] : '');
        } catch (error) {
          this.logger.error(`Failed to resolve variable ${variable.name}`, error);
          resolved[variable.name] = variable.defaultValue || '';
        }
      }
    }

    return resolved;
  }

  // 替换查询中的变量
  private substituteVariables(query: string, variables: Record<string, string>): string {
    let substitutedQuery = query;
    
    Object.keys(variables).forEach(variableName => {
      const regex = new RegExp(`\\$${variableName}`, 'g');
      substitutedQuery = substitutedQuery.replace(regex, variables[variableName]);
    });
    
    return substitutedQuery;
  }

  // 应用时间范围到查询
  private applyTimeRange(query: string, timeRange: { from: string; to: string }): string {
    return `
      SELECT * FROM (
        ${query}
      ) 
      WHERE timestamp >= '${timeRange.from}' AND timestamp <= '${timeRange.to}'
    `;
  }

  // 生成ID
  private generateId(): string {
    return `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 创建系统概览仪表板
  private async createSystemOverviewDashboard(): Promise<void> {
    const dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'> = {
      name: '系统概览',
      description: '系统整体运行状态监控',
      owner: 'system',
      tags: ['system', 'overview'],
      timeRange: {
        from: 'now-1h',
        to: 'now',
      },
      refreshInterval: '1m',
      panels: [
        {
          id: this.generateId(),
          title: 'API请求率',
          type: 'line',
          position: { x: 0, y: 0, w: 12, h: 8 },
          query: {
            sql: `
              SELECT TIME_BUCKET('1m', timestamp) as time_bucket,
                     COUNT(*) as request_count
              FROM application-logs
              WHERE message LIKE '%HTTP%'
              GROUP BY time_bucket
              ORDER BY time_bucket
            `,
          },
          visualization: {
            xAxis: { type: 'time', field: 'time_bucket' },
            yAxis: { type: 'numeric', field: 'request_count' },
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: this.generateId(),
          title: '错误率',
          type: 'line',
          position: { x: 12, y: 0, w: 12, h: 8 },
          query: {
            sql: `
              SELECT TIME_BUCKET('1m', timestamp) as time_bucket,
                     COUNT(CASE WHEN level = 'ERROR' THEN 1 END) * 100.0 / COUNT(*) as error_rate
              FROM application-logs
              GROUP BY time_bucket
              ORDER BY time_bucket
            `,
          },
          visualization: {
            xAxis: { type: 'time', field: 'time_bucket' },
            yAxis: { type: 'numeric', field: 'error_rate' },
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: this.generateId(),
          title: '响应时间分布',
          type: 'heatmap',
          position: { x: 0, y: 8, w: 24, h: 8 },
          query: {
            sql: `
              SELECT TIME_BUCKET('1m', timestamp) as time_bucket,
                     CASE 
                       WHEN CAST(metadata.duration AS INTEGER) < 100 THEN '< 100ms'
                       WHEN CAST(metadata.duration AS INTEGER) < 500 THEN '100-500ms'
                       WHEN CAST(metadata.duration AS INTEGER) < 1000 THEN '500ms-1s'
                       ELSE '> 1s'
                     END as duration_range,
                     COUNT(*) as count
              FROM application-logs
              WHERE metadata.duration IS NOT NULL
              GROUP BY time_bucket, duration_range
              ORDER BY time_bucket, duration_range
            `,
          },
          visualization: {
            xAxis: { type: 'time', field: 'time_bucket' },
            yAxis: { type: 'category', field: 'duration_range' },
            colorField: 'count',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    await this.createDashboard(dashboard);
  }

  // 创建用户行为仪表板
  private async createUserBehaviorDashboard(): Promise<void> {
    const dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'> = {
      name: '用户行为分析',
      description: '用户行为和转化分析',
      owner: 'business',
      tags: ['user', 'behavior'],
      timeRange: {
        from: 'now-24h',
        to: 'now',
      },
      refreshInterval: '5m',
      panels: [
        {
          id: this.generateId(),
          title: '页面访问量',
          type: 'bar',
          position: { x: 0, y: 0, w: 12, h: 8 },
          query: {
            sql: `
              SELECT eventData.page as page,
                     COUNT(*) as view_count
              FROM user-behavior
              WHERE eventType = 'PAGE_VIEW'
              GROUP BY page
              ORDER BY view_count DESC
              LIMIT 10
            `,
          },
          visualization: {
            xAxis: { type: 'category', field: 'page' },
            yAxis: { type: 'numeric', field: 'view_count' },
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: this.generateId(),
          title: '转化漏斗',
          type: 'funnel',
          position: { x: 12, y: 0, w: 12, h: 8 },
          query: {
            sql: `
              SELECT eventType,
                     COUNT(DISTINCT userId) as user_count
              FROM user-behavior
              WHERE eventType IN ('PRODUCT_VIEW', 'CART_ADD', 'CHECKOUT', 'PURCHASE')
              GROUP BY eventType
              ORDER BY 
                CASE eventType 
                  WHEN 'PRODUCT_VIEW' THEN 1
                  WHEN 'CART_ADD' THEN 2
                  WHEN 'CHECKOUT' THEN 3
                  WHEN 'PURCHASE' THEN 4
                END
            `,
          },
          visualization: {
            steps: ['PRODUCT_VIEW', 'CART_ADD', 'CHECKOUT', 'PURCHASE'],
            valueField: 'user_count',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    await this.createDashboard(dashboard);
  }

  // 创建订单分析仪表板
  private async createOrderAnalysisDashboard(): Promise<void> {
    // 实现订单分析仪表板创建逻辑
  }

  // 创建性能监控仪表板
  private async createPerformanceMonitoringDashboard(): Promise<void> {
    // 实现性能监控仪表板创建逻辑
  }
}
```

## 8. 完善OpenObserve安全认证集成

### 8.1 安全认证服务 (SecurityAuthService)

#### 8.1.1 服务类设计

```typescript
@Injectable()
export class SecurityAuthService {
  private readonly logger = new Logger(SecurityAuthService.name);
  private readonly tokenCache = new Map<string, { token: string; expiresAt: number }>();

  constructor(
    @Inject('OPENOBSERVE_CONFIG') private readonly config: OpenObserveConfig,
    private readonly jwtService: JwtService,
  ) {}

  // 获取认证令牌
  async getAuthToken(): Promise<string> {
    // 检查缓存的令牌
    const cachedToken = this.tokenCache.get('openobserve');
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      return cachedToken.token;
    }

    // 生成新令牌
    const token = await this.generateToken();
    
    // 缓存令牌
    this.tokenCache.set('openobserve', {
      token,
      expiresAt: Date.now() + (60 * 60 * 1000), // 1小时
    });

    return token;
  }

  // 生成JWT令牌
  private async generateToken(): Promise<string> {
    const payload = {
      sub: 'caddy-shopping-backend',
      iss: 'caddy-shopping',
      aud: 'openobserve',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1小时
      org: this.config.organization,
    };

    return this.jwtService.sign(payload);
  }

  // 验证令牌
  validateToken(token: string): boolean {
    try {
      const decoded = this.jwtService.verify(token);
      return decoded.aud === 'openobserve' && decoded.org === this.config.organization;
    } catch (error) {
      this.logger.error('Token validation failed', error);
      return false;
    }
  }

  // 刷新令牌
  async refreshToken(): Promise<string> {
    this.tokenCache.delete('openobserve');
    return this.getAuthToken();
  }
}
```

## 9. 创建OpenObserve性能优化模块

### 9.1 性能优化服务 (PerformanceOptimizer)

#### 9.1.1 服务类设计

```typescript
@Injectable()
export class PerformanceOptimizer {
  private readonly logger = new Logger(PerformanceOptimizer.name);
  private readonly queryCache = new Map<string, { data: any; expiresAt: number }>();
  private readonly connectionPool: any[] = [];

  constructor(
    @Inject('OPENOBSERVE_CONFIG') private readonly config: OpenObserveConfig,
    private readonly httpService: HttpService,
  ) {}

  // 优化查询
  async optimizeQuery(query: string, timeRange?: { from: string; to: string }): Promise<string> {
    let optimizedQuery = query;

    // 添加时间范围限制
    if (timeRange) {
      optimizedQuery = this.addTimeRangeLimit(optimizedQuery, timeRange);
    }

    // 优化JOIN操作
    optimizedQuery = this.optimizeJoins(optimizedQuery);

    // 添加索引提示
    optimizedQuery = this.addIndexHints(optimizedQuery);

    return optimizedQuery;
  }

  // 缓存查询结果
  async cacheQueryResult(query: string, result: any): Promise<void> {
    const cacheKey = this.generateCacheKey(query);
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5分钟

    this.queryCache.set(cacheKey, {
      data: result,
      expiresAt,
    });
  }

  // 获取缓存的查询结果
  getCachedQueryResult(query: string): any | null {
    const cacheKey = this.generateCacheKey(query);
    const cached = this.queryCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // 删除过期的缓存
    if (cached) {
      this.queryCache.delete(cacheKey);
    }

    return null;
  }

  // 批量发送数据
  async batchSendData(data: any[], endpoint: string): Promise<void> {
    const batchSize = this.config.performance.batch_size;
    const batches = this.createBatches(data, batchSize);

    for (const batch of batches) {
      try {
        await this.sendBatch(batch, endpoint);
      } catch (error) {
        this.logger.error('Failed to send batch', error);
        throw error;
      }
    }
  }

  // 创建连接池
  createConnectionPool(): void {
    for (let i = 0; i < 5; i++) {
      const connection = this.createConnection();
      this.connectionPool.push(connection);
    }
  }

  // 获取连接
  getConnection(): any {
    return this.connectionPool.pop() || this.createConnection();
  }

  // 释放连接
  releaseConnection(connection: any): void {
    if (this.connectionPool.length < 5) {
      this.connectionPool.push(connection);
    } else {
      connection.close();
    }
  }

  // 添加时间范围限制
  private addTimeRangeLimit(query: string, timeRange: { from: string; to: string }): string {
    return `
      SELECT * FROM (
        ${query}
      ) 
      WHERE timestamp >= '${timeRange.from}' AND timestamp <= '${timeRange.to}'
    `;
  }

  // 优化JOIN操作
  private optimizeJoins(query: string): string {
    // 实现JOIN优化逻辑
    return query;
  }

  // 添加索引提示
  private addIndexHints(query: string): string {
    // 实现索引提示逻辑
    return query;
  }

  // 生成缓存键
  private generateCacheKey(query: string): string {
    return require('crypto').createHash('md5').update(query).digest('hex');
  }

  // 创建批次
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  // 发送批次
  private async sendBatch(batch: any[], endpoint: string): Promise<void> {
    await this.httpService.post(
      `${this.config.url}/${endpoint}`,
      batch,
      {
        headers: {
          'Authorization': `Bearer ${this.config.auth.token}`,
          'Content-Type': 'application/json',
        },
        timeout: this.config.performance.timeout,
      },
    ).toPromise();
  }

  // 创建连接
  private createConnection(): any {
    // 实现连接创建逻辑
    return {
      close: () => {},
    };
  }
}
```

## 10. 实现OpenObserve数据备份和恢复

### 10.1 数据备份服务 (DataBackupService)

#### 10.1.1 服务类设计

```typescript
@Injectable()
export class DataBackupService {
  private readonly logger = new Logger(DataBackupService.name);

  constructor(
    @Inject('OPENOBSERVE_CONFIG') private readonly config: OpenObserveConfig,
    private readonly httpService: HttpService,
  ) {}

  // 创建备份
  async createBackup(type: 'full' | 'incremental', retention?: string): Promise<string> {
    const backupId = this.generateBackupId();
    const timestamp = new Date().toISOString();

    try {
      this.logger.log(`Starting ${type} backup with ID: ${backupId}`);

      // 创建备份记录
      await this.createBackupRecord(backupId, type, timestamp);

      // 根据备份类型执行备份
      if (type === 'full') {
        await this.performFullBackup(backupId);
      } else {
        await this.performIncrementalBackup(backupId);
      }

      // 设置保留策略
      if (retention) {
        await this.setRetentionPolicy(backupId, retention);
      }

      this.logger.log(`Backup completed successfully: ${backupId}`);
      return backupId;
    } catch (error) {
      this.logger.error(`Backup failed: ${backupId}`, error);
      await this.markBackupAsFailed(backupId, error.message);
      throw error;
    }
  }

  // 恢复数据
  async restoreData(backupId: string, targetStreams?: string[]): Promise<void> {
    try {
      this.logger.log(`Starting restore from backup: ${backupId}`);

      // 验证备份
      const backup = await this.getBackup(backupId);
      if (!backup || backup.status !== 'completed') {
        throw new Error(`Invalid backup: ${backupId}`);
      }

      // 执行恢复
      await this.performRestore(backupId, targetStreams);

      this.logger.log(`Restore completed successfully: ${backupId}`);
    } catch (error) {
      this.logger.error(`Restore failed: ${backupId}`, error);
      throw error;
    }
  }

  // 列出备份
  async listBackups(type?: 'full' | 'incremental', status?: 'pending' | 'completed' | 'failed'): Promise<any[]> {
    try {
      const query = this.buildBackupListQuery(type, status);
      
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

      return response.data.hits?.hits?.map((hit: any) => hit._source) || [];
    } catch (error) {
      this.logger.error('Failed to list backups', error);
      throw error;
    }
  }

  // 删除备份
  async deleteBackup(backupId: string): Promise<void> {
    try {
      this.logger.log(`Deleting backup: ${backupId}`);

      // 删除备份文件
      await this.deleteBackupFiles(backupId);

      // 删除备份记录
      await this.deleteBackupRecord(backupId);

      this.logger.log(`Backup deleted successfully: ${backupId}`);
    } catch (error) {
      this.logger.error(`Failed to delete backup: ${backupId}`, error);
      throw error;
    }
  }

  // 执行完整备份
  private async performFullBackup(backupId: string): Promise<void> {
    const streams = Object.values(this.config.streams);

    for (const stream of streams) {
      await this.backupStream(backupId, stream, 'full');
    }
  }

  // 执行增量备份
  private async performIncrementalBackup(backupId: string): Promise<void> {
    // 获取上次备份时间
    const lastBackupTime = await this.getLastBackupTime();
    
    if (!lastBackupTime) {
      // 如果没有上次备份时间，执行完整备份
      await this.performFullBackup(backupId);
      return;
    }

    const streams = Object.values(this.config.streams);

    for (const stream of streams) {
      await this.backupStream(backupId, stream, 'incremental', lastBackupTime);
    }
  }

  // 备份流
  private async backupStream(backupId: string, stream: string, type: 'full' | 'incremental', since?: string): Promise<void> {
    try {
      const query = this.buildBackupQuery(stream, type, since);
      
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

      const data = response.data.hits?.hits?.map((hit: any) => hit._source) || [];
      
      // 保存到备份存储
      await this.saveBackupData(backupId, stream, data);
      
      this.logger.debug(`Backed up ${data.length} records from stream: ${stream}`);
    } catch (error) {
      this.logger.error(`Failed to backup stream: ${stream}`, error);
      throw error;
    }
  }

  // 执行恢复
  private async performRestore(backupId: string, targetStreams?: string[]): Promise<void> {
    const streams = targetStreams || Object.values(this.config.streams);

    for (const stream of streams) {
      await this.restoreStream(backupId, stream);
    }
  }

  // 恢复流
  private async restoreStream(backupId: string, stream: string): Promise<void> {
    try {
      // 从备份存储获取数据
      const data = await this.getBackupData(backupId, stream);
      
      // 恢复到OpenObserve
      await this.restoreStreamData(stream, data);
      
      this.logger.debug(`Restored ${data.length} records to stream: ${stream}`);
    } catch (error) {
      this.logger.error(`Failed to restore stream: ${stream}`, error);
      throw error;
    }
  }

  // 构建备份查询
  private buildBackupQuery(stream: string, type: 'full' | 'incremental', since?: string): string {
    let query = `SELECT * FROM ${stream}`;
    
    if (type === 'incremental' && since) {
      query += ` WHERE timestamp >= '${since}'`;
    }
    
    return query;
  }

  // 构建备份列表查询
  private buildBackupListQuery(type?: 'full' | 'incremental', status?: string): string {
    let query = 'SELECT * FROM backups';
    
    const conditions = [];
    if (type) {
      conditions.push(`type = '${type}'`);
    }
    if (status) {
      conditions.push(`status = '${status}'`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ' ORDER BY timestamp DESC';
    
    return query;
  }

  // 创建备份记录
  private async createBackupRecord(backupId: string, type: string, timestamp: string): Promise<void> {
    const backupRecord = {
      id: backupId,
      type,
      status: 'pending',
      timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.httpService.post(
      `${this.config.url}/api/${this.config.organization}/backups/_json`,
      backupRecord,
      {
        headers: {
          'Authorization': `Bearer ${this.config.auth.token}`,
          'Content-Type': 'application/json',
        },
      },
    ).toPromise();
  }

  // 标记备份为失败
  private async markBackupAsFailed(backupId: string, errorMessage: string): Promise<void> {
    await this.httpService.put(
      `${this.config.url}/api/${this.config.organization}/backups/${backupId}`,
      {
        status: 'failed',
        errorMessage,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.auth.token}`,
          'Content-Type': 'application/json',
        },
      },
    ).toPromise();
  }

  // 获取备份
  private async getBackup(backupId: string): Promise<any> {
    try {
      const response = await this.httpService.get(
        `${this.config.url}/api/${this.config.organization}/backups/${backupId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.auth.token}`,
          },
        },
      ).toPromise();

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  // 获取上次备份时间
  private async getLastBackupTime(): Promise<string | null> {
    try {
      const response = await this.httpService.post(
        `${this.config.url}/api/${this.config.organization}/_search`,
        {
          query: `
            SELECT timestamp 
            FROM backups 
            WHERE status = 'completed' 
            ORDER BY timestamp DESC 
            LIMIT 1
          `,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.auth.token}`,
            'Content-Type': 'application/json',
          },
        },
      ).toPromise();

      const hits = response.data.hits?.hits;
      if (hits && hits.length > 0) {
        return hits[0]._source.timestamp;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to get last backup time', error);
      return null;
    }
  }

  // 设置保留策略
  private async setRetentionPolicy(backupId: string, retention: string): Promise<void> {
    await this.httpService.put(
      `${this.config.url}/api/${this.config.organization}/backups/${backupId}`,
      {
        retention,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.auth.token}`,
          'Content-Type': 'application/json',
        },
      },
    ).toPromise();
  }

  // 保存备份数据
  private async saveBackupData(backupId: string, stream: string, data: any[]): Promise<void> {
    // 实现保存到备份存储的逻辑
    // 可以是本地文件系统、S3、或其他存储服务
  }

  // 获取备份数据
  private async getBackupData(backupId: string, stream: string): Promise<any[]> {
    // 实现从备份存储获取数据的逻辑
    return [];
  }

  // 恢复流数据
  private async restoreStreamData(stream: string, data: any[]): Promise<void> {
    // 批量恢复数据
    const batchSize = 100;
    const batches = this.createBatches(data, batchSize);

    for (const batch of batches) {
      await this.httpService.post(
        `${this.config.url}/api/${this.config.organization}/${stream}/_json`,
        batch,
        {
          headers: {
            'Authorization': `Bearer ${this.config.auth.token}`,
            'Content-Type': 'application/json',
          },
        },
      ).toPromise();
    }
  }

  // 删除备份文件
  private async deleteBackupFiles(backupId: string): Promise<void> {
    // 实现从备份存储删除文件的逻辑
  }

  // 删除备份记录
  private async deleteBackupRecord(backupId: string): Promise<void> {
    await this.httpService.delete(
      `${this.config.url}/api/${this.config.organization}/backups/${backupId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.auth.token}`,
        },
      },
    ).toPromise();
  }

  // 创建批次
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  // 生成备份ID
  private generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## 11. 开发OpenObserve API网关集成

### 11.1 API网关服务 (ApiGatewayService)

#### 11.1.1 服务类设计

```typescript
@Injectable()
export class ApiGatewayService {
  private readonly logger = new Logger(ApiGatewayService.name);
  private readonly circuitBreakers = new Map<string, any>();

  constructor(
    @Inject('OPENOBSERVE_CONFIG') private readonly config: OpenObserveConfig,
    private readonly httpService: HttpService,
  ) {}

  // 代理请求到OpenObserve
  async proxyRequest(path: string, method: string, body?: any, headers?: any): Promise<any> {
    const url = `${this.config.url}/api/${this.config.organization}${path}`;
    
    try {
      // 检查熔断器状态
      const circuitBreaker = this.getCircuitBreaker(path);
      if (circuitBreaker.isOpen()) {
        throw new Error('Circuit breaker is open');
      }

      // 记录请求开始时间
      const startTime = Date.now();

      // 发送请求
      const response = await this.httpService.request({
        method,
        url,
        data: body,
        headers: {
          'Authorization': `Bearer ${this.config.auth.token}`,
          'Content-Type': 'application/json',
          ...headers,
        },
        timeout: this.config.performance.timeout,
      }).toPromise();

      // 记录请求成功
      circuitBreaker.recordSuccess();
      
      // 记录请求指标
      const duration = Date.now() - startTime;
      this.recordRequestMetric(path, method, response.status, duration);

      return response.data;
    } catch (error) {
      // 记录请求失败
      const circuitBreaker = this.getCircuitBreaker(path);
      circuitBreaker.recordFailure();
      
      // 记录错误指标
      this.recordErrorMetric(path, method, error);
      
      throw error;
    }
  }

  // 获取熔断器
  private getCircuitBreaker(path: string): any {
    if (!this.circuitBreakers.has(path)) {
      this.circuitBreakers.set(path, new CircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 60000, // 1分钟
      }));
    }
    
    return this.circuitBreakers.get(path);
  }

  // 记录请求指标
  private recordRequestMetric(path: string, method: string, statusCode: number, duration: number): void {
    // 发送指标到OpenObserve
    this.httpService.post(
      `${this.config.url}/api/${this.config.organization}/metrics/_json`,
      {
        metrics: [
          {
            name: 'api_gateway_requests_total',
            value: 1,
            type: 'counter',
            labels: {
              path,
              method,
              status_code: statusCode.toString(),
            },
            timestamp: new Date().toISOString(),
          },
          {
            name: 'api_gateway_request_duration_ms',
            value: duration,
            type: 'histogram',
            labels: {
              path,
              method,
            },
            timestamp: new Date().toISOString(),
          },
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.auth.token}`,
          'Content-Type': 'application/json',
        },
      },
    ).toPromise().catch(error => {
      this.logger.error('Failed to record request metric', error);
    });
  }

  // 记录错误指标
  private recordErrorMetric(path: string, method: string, error: any): void {
    // 发送指标到OpenObserve
    this.httpService.post(
      `${this.config.url}/api/${this.config.organization}/metrics/_json`,
      {
        metrics: [
          {
            name: 'api_gateway_errors_total',
            value: 1,
            type: 'counter',
            labels: {
              path,
              method,
              error_type: error.constructor.name,
            },
            timestamp: new Date().toISOString(),
          },
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.auth.token}`,
          'Content-Type': 'application/json',
        },
      },
    ).toPromise().catch(error => {
      this.logger.error('Failed to record error metric', error);
    });
  }
}

// 熔断器类
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor(private options: { failureThreshold: number; resetTimeout: number }) {}

  // 记录成功
  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  // 记录失败
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  // 检查是否打开
  isOpen(): boolean {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeout) {
        this.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }
    
    return false;
  }
}
```

## 12. 实施建议

基于以上设计，建议按以下顺序实施剩余模块：

1. **第六阶段**：实现OpenObserve数据管道处理
   - 实现DataTransformer
   - 实现DataEnricher
   - 实现DataQualityChecker

2. **第七阶段**：开发OpenObserve仪表板定制功能
   - 实现DashboardService
   - 创建预定义仪表板

3. **第八阶段**：完善OpenObserve安全认证集成
   - 实现SecurityAuthService

4. **第九阶段**：创建OpenObserve性能优化模块
   - 实现PerformanceOptimizer

5. **第十阶段**：实现OpenObserve数据备份和恢复
   - 实现DataBackupService

6. **第十一阶段**：开发OpenObserve API网关集成
   - 实现ApiGatewayService

这些代码实现需要切换到Code模式进行编辑和实施。每个阶段完成后，建议进行充分的测试和验证，确保功能正常后再进行下一阶段的实施。

## 13. 总结

通过以上详细的设计文档，我们已经完成了OpenObserve微服务的全面设计，包括：

1. 电商网站日志收集和分析模块
2. 增强OpenObserve指标监控功能
3. 完善分布式追踪功能集成
4. 增强OpenObserve告警和通知系统
5. 创建OpenObserve微服务配置管理模块
6. 实现OpenObserve数据管道处理
7. 开发OpenObserve仪表板定制功能
8. 完善OpenObserve安全认证集成
9. 创建OpenObserve性能优化模块
10. 实现OpenObserve数据备份和恢复
11. 开发OpenObserve API网关集成

这些设计提供了完整的实现方案，包括数据模型、服务类、方法和接口定义。接下来可以切换到Code模式开始实施这些代码。