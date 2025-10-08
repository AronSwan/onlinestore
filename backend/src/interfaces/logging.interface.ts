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
    totalAmount?: number;
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

// 日志统计结果接口
export interface LogStatsResult {
  total: number;
  stats: Array<{
    level: string;
    category: string;
    count: number;
    unique_users: number;
  }>;
  aggregations: Record<string, any>;
}

// 用户行为分析结果接口
export interface UserBehaviorAnalyticsResult {
  total: number;
  analytics: Array<{
    eventType: string;
    count: number;
    unique_sessions: number;
    unique_users: number;
  }>;
  aggregations: Record<string, any>;
}

// 异常检测结果接口
export interface AnomalyDetectionResult {
  total: number;
  anomalies: Array<{
    level: string;
    category: string;
    action: string;
    count: number;
    percentage: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

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