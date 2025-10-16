import { Logger } from '@nestjs/common';

/**
 * 参数化查询构建器
 * 使用参数化查询替代字符串拼接，进一步降低SQL注入风险
 */
export class ParameterizedQueryBuilder {
  private static readonly logger = new Logger(ParameterizedQueryBuilder.name);

  /**
   * 构建参数化查询
   * @param query 查询模板，使用 :param 格式的参数占位符
   * @param params 参数对象
   * @returns 包含查询和参数的对象
   */
  static buildParameterizedQuery(query: string, params: Record<string, any>): {
    query: string;
    params: any[];
  } {
    const paramList: any[] = [];
    let paramIndex = 1;
    
    // 替换命名参数为位置参数
    const parameterizedQuery = query.replace(/:(\w+)/g, (match, paramName) => {
      if (params[paramName] === undefined) {
        throw new Error(`Parameter '${paramName}' not found in params object`);
      }
      
      paramList.push(params[paramName]);
      return `$${paramIndex++}`;
    });
    
    return {
      query: parameterizedQuery,
      params: paramList,
    };
  }

  /**
   * 构建安全的LIKE查询
   * @param field 字段名
   * @param value 搜索值
   * @param escapeWildcards 是否转义通配符
   * @returns 包含查询和参数的对象
   */
  static buildLikeQuery(
    field: string, 
    value: string, 
    escapeWildcards: boolean = true
  ): { query: string; params: any[] } {
    if (!this.validateField(field)) {
      throw new Error(`Invalid field name: ${field}`);
    }
    
    // 转义通配符
    let escapedValue = value;
    if (escapeWildcards) {
      escapedValue = value
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
    }
    
    return {
      query: `${field} LIKE $1`,
      params: [`%${escapedValue}%`],
    };
  }

  /**
   * 构建IN查询
   * @param field 字段名
   * @param values 值数组
   * @returns 包含查询和参数的对象
   */
  static buildInQuery(field: string, values: any[]): { query: string; params: any[] } {
    if (!this.validateField(field)) {
      throw new Error(`Invalid field name: ${field}`);
    }
    
    if (!values || values.length === 0) {
      throw new Error('IN query requires at least one value');
    }
    
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    return {
      query: `${field} IN (${placeholders})`,
      params: values,
    };
  }

  /**
   * 构建时间范围查询
   * @param field 字段名
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 包含查询和参数的对象
   */
  static buildTimeRangeQuery(
    field: string, 
    startTime?: string, 
    endTime?: string
  ): { query: string; params: any[] } {
    if (!this.validateField(field)) {
      throw new Error(`Invalid field name: ${field}`);
    }
    
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (startTime) {
      conditions.push(`${field} >= $${paramIndex++}`);
      params.push(startTime);
    }
    
    if (endTime) {
      conditions.push(`${field} <= $${paramIndex++}`);
      params.push(endTime);
    }
    
    const query = conditions.length > 0 ? conditions.join(' AND ') : '1=1';
    
    return { query, params };
  }

  /**
   * 构建用户行为分析查询
   * @param userId 用户ID
   * @param timeRange 时间范围
   * @returns 包含查询和参数的对象
   */
  static buildUserBehaviorQuery(userId?: string, timeRange: string = '7d'): {
    query: string;
    params: any[];
  } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    // 时间范围条件
    const timeCondition = this.buildTimeRangeQuery('u.timestamp', `now-${timeRange}`, 'now');
    conditions.push(timeCondition.query);
    params.push(...timeCondition.params);
    paramIndex += timeCondition.params.length;
    
    // 用户ID条件
    if (userId) {
      conditions.push(`u.user_id = $${paramIndex++}`);
      params.push(userId);
    }
    
    const query = `
      SELECT 
        u.user_id,
        u.action,
        u.timestamp,
        p.product_name,
        o.order_status,
        s.session_duration
      FROM user_actions u
      LEFT JOIN products p ON u.product_id = p.product_id
      LEFT JOIN orders o ON u.order_id = o.order_id
      LEFT JOIN user_sessions s ON u.session_id = s.session_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY u.timestamp DESC
      LIMIT 1000
    `;
    
    return { query, params };
  }

  /**
   * 构建系统性能查询
   * @param timeRange 时间范围
   * @returns 包含查询和参数的对象
   */
  static buildSystemPerformanceQuery(timeRange: string = '1h'): {
    query: string;
    params: any[];
  } {
    const timeCondition = this.buildTimeRangeQuery('timestamp', `now-${timeRange}`, 'now');
    
    const query = `
      SELECT 
        service_name,
        AVG(response_time) as avg_response_time,
        COUNT(*) as request_count,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) as p95_response_time,
        MAX(response_time) as max_response_time
      FROM http_requests
      WHERE ${timeCondition.query}
      GROUP BY service_name
      ORDER BY avg_response_time DESC
    `;
    
    return {
      query,
      params: timeCondition.params,
    };
  }

  /**
   * 构建安全事件查询
   * @param severity 严重程度
   * @param timeRange 时间范围
   * @returns 包含查询和参数的对象
   */
  static buildSecurityEventsQuery(severity?: string, timeRange: string = '24h'): {
    query: string;
    params: any[];
  } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    // 时间范围条件
    const timeCondition = this.buildTimeRangeQuery('timestamp', `now-${timeRange}`, 'now');
    conditions.push(timeCondition.query);
    params.push(...timeCondition.params);
    paramIndex += timeCondition.params.length;
    
    // 严重程度条件
    if (severity) {
      conditions.push(`severity = $${paramIndex++}`);
      params.push(severity);
    }
    
    const query = `
      SELECT 
        event_type,
        severity,
        COUNT(*) as event_count,
        COUNT(DISTINCT user_id) as affected_users,
        MIN(timestamp) as first_occurrence,
        MAX(timestamp) as last_occurrence
      FROM security_events
      WHERE ${conditions.join(' AND ')}
      GROUP BY event_type, severity
      ORDER BY event_count DESC
    `;
    
    return { query, params };
  }

  /**
   * 构建业务指标查询
   * @param timeRange 时间范围
   * @returns 包含查询和参数的对象
   */
  static buildBusinessMetricsQuery(timeRange: string = '30d'): {
    query: string;
    params: any[];
  } {
    const timeCondition = this.buildTimeRangeQuery('timestamp', `now-${timeRange}`, 'now');
    
    const query = `
      SELECT 
        DATE(timestamp) as date,
        COUNT(DISTINCT user_id) as daily_active_users,
        SUM(order_amount) as total_revenue,
        COUNT(order_id) as total_orders,
        AVG(order_amount) as average_order_value,
        COUNT(DISTINCT product_id) as unique_products_sold
      FROM business_events
      WHERE ${timeCondition.query}
        AND event_type IN ($1, $2)
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `;
    
    return {
      query,
      params: [...timeCondition.params, 'purchase', 'order_completed'],
    };
  }

  /**
   * 验证字段名是否安全
   * @param field 字段名
   * @returns 是否安全
   */
  private static validateField(field: string): boolean {
    // 只允许字母、数字、下划点和点
    const fieldRegex = /^[a-zA-Z0-9_.]+$/;
    return fieldRegex.test(field);
  }

  /**
   * 构建OpenObserve API请求体
   * @param parameterizedQuery 参数化查询
   * @returns OpenObserve API请求体
   */
  static buildOpenObserveRequest(parameterizedQuery: {
    query: string;
    params: any[];
  }): {
    query: string;
    sql_mode: boolean;
    start_time?: string;
    end_time?: string;
    limit?: number;
  } {
    return {
      query: parameterizedQuery.query,
      sql_mode: true,
    };
  }
}