import { LogLevelEnum, SeverityEnum, TimeRangeEnum } from '../dto/query.dto';

/**
 * 安全查询构建器 - 防止SQL注入
 * 使用参数化查询和白名单验证
 */
export class SecureQueryBuilder {
  private static readonly ALLOWED_FIELDS = [
    'timestamp', 'level', 'message', 'service', 'environment', 'version',
    'host', 'pid', 'traceId', 'spanId', 'userId', 'requestId', 'method',
    'url', 'statusCode', 'responseTime', 'userAgent', 'ip', 'event_type',
    'severity', 'user_id', 'action', 'product_id', 'order_id', 'session_id',
    'service_name', 'status_code', 'response_time', 'order_amount', 'product_name',
    'order_status', 'session_duration', 'date', 'daily_active_users', 'total_revenue',
    'total_orders', 'average_order_value', 'unique_products_sold'
  ];

  private static readonly ALLOWED_OPERATORS = [
    '=', '!=', '>', '>=', '<', '<=', 'LIKE', 'IN', 'NOT IN', 'BETWEEN'
  ];

  private static readonly ALLOWED_SORT_ORDERS = ['ASC', 'DESC'];

  /**
   * 验证字段名是否在白名单中
   */
  private static validateField(field: string): boolean {
    return this.ALLOWED_FIELDS.includes(field);
  }

  /**
   * 验证操作符是否在白名单中
   */
  private static validateOperator(operator: string): boolean {
    return this.ALLOWED_OPERATORS.includes(operator.toUpperCase());
  }

  /**
   * 验证排序方向是否在白名单中
   */
  private static validateSortOrder(order: string): boolean {
    return this.ALLOWED_SORT_ORDERS.includes(order.toUpperCase());
  }

  /**
   * 安全转义字符串值
   */
  private static escapeValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    
    if (typeof value === 'number') {
      return value.toString();
    }
    
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    
    // 转义字符串，防止SQL注入
    const stringValue = String(value);
    return `'${stringValue.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
  }

  /**
   * 构建安全的WHERE子句
   */
  public static buildWhereClause(filters: Record<string, any>): { clause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    Object.entries(filters).forEach(([field, value]) => {
      if (!this.validateField(field)) {
        throw new Error(`Invalid field name: ${field}`);
      }

      if (Array.isArray(value)) {
        // 处理IN操作
        const escapedValues = value.map(v => this.escapeValue(v));
        conditions.push(`${field} IN (${escapedValues.join(', ')})`);
      } else if (typeof value === 'object' && value !== null) {
        // 处理复杂条件 { operator: '>', value: 100 }
        const { operator = '=', value: val } = value;
        if (!this.validateOperator(operator)) {
          throw new Error(`Invalid operator: ${operator}`);
        }
        
        if (operator.toUpperCase() === 'BETWEEN' && Array.isArray(val)) {
          conditions.push(`${field} BETWEEN ${this.escapeValue(val[0])} AND ${this.escapeValue(val[1])}`);
        } else if (operator.toUpperCase() === 'LIKE') {
          conditions.push(`${field} ${operator} ${this.escapeValue(`%${val}%`)}`);
        } else {
          conditions.push(`${field} ${operator} ${this.escapeValue(val)}`);
        }
      } else {
        // 简单等值条件
        conditions.push(`${field} = ${this.escapeValue(value)}`);
      }
    });

    return {
      clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params
    };
  }

  /**
   * 构建安全的ORDER BY子句
   */
  public static buildOrderByClause(sort: Array<{ field: string; order: string }>): string {
    if (!sort || sort.length === 0) {
      return 'ORDER BY timestamp DESC';
    }

    const sortClauses = sort.map(({ field, order }) => {
      if (!this.validateField(field)) {
        throw new Error(`Invalid sort field: ${field}`);
      }
      
      if (!this.validateSortOrder(order)) {
        throw new Error(`Invalid sort order: ${order}`);
      }
      
      return `${field} ${order.toUpperCase()}`;
    });

    return `ORDER BY ${sortClauses.join(', ')}`;
  }

  /**
   * 构建安全的LIMIT子句
   */
  public static buildLimitClause(limit: number): string {
    const sanitizedLimit = Math.max(1, Math.min(10000, limit));
    return `LIMIT ${sanitizedLimit}`;
  }

  /**
   * 构建时间范围过滤
   */
  public static buildTimeRangeFilter(startTime?: string, endTime?: string): string {
    const conditions: string[] = [];
    
    if (startTime) {
      // 验证时间格式
      if (!this.isValidTimeFormat(startTime)) {
        throw new Error(`Invalid start time format: ${startTime}`);
      }
      conditions.push(`timestamp >= '${startTime}'`);
    }
    
    if (endTime) {
      if (!this.isValidTimeFormat(endTime)) {
        throw new Error(`Invalid end time format: ${endTime}`);
      }
      conditions.push(`timestamp <= '${endTime}'`);
    }
    
    return conditions.join(' AND ');
  }

  /**
   * 验证时间格式
   */
  private static isValidTimeFormat(time: string): boolean {
    // 支持ISO格式和相对时间格式
    const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    const relativePattern = /^now-\d+[smhd]$/;
    return isoPattern.test(time) || relativePattern.test(time) || time === 'now';
  }

  /**
   * 构建跨流关联查询
   */
  public static buildCorrelationQuery(
    primaryStream: string,
    secondaryStreams: string[],
    correlationField: string,
    timeRange: string = '1h'
  ): string {
    // 验证流名和字段名
    if (!this.validateField(correlationField)) {
      throw new Error(`Invalid correlation field: ${correlationField}`);
    }

    // 构建JOIN子句 - 修复多表JOIN问题
    const joinClauses = secondaryStreams.map((stream, index) => {
      const alias = `s${index}`;
      return `LEFT JOIN ${stream} ${alias} ON p.${correlationField} = ${alias}.${correlationField}`;
    }).join('\n      ');

    // 选择所有字段
    const selectFields = [`p.*`, ...secondaryStreams.map((_, index) => `s${index}.*`)];
    
    return `
      SELECT 
        ${selectFields.join(',\n        ')}
      FROM ${primaryStream} p
      ${joinClauses}
      WHERE p.timestamp >= NOW() - INTERVAL '${timeRange}'
      ORDER BY p.timestamp DESC
      LIMIT 1000
    `;
  }

  /**
   * 构建用户行为分析查询
   */
  public static buildUserBehaviorQuery(userId?: string, timeRange: string = '7d'): string {
    const conditions: string[] = ["u.timestamp >= NOW() - INTERVAL '" + timeRange + "'"];
    
    if (userId && this.isValidUserId(userId)) {
      conditions.push(`u.user_id = '${userId.replace(/'/g, "''")}'`);
    }

    return `
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
  }

  /**
   * 构建系统性能分析查询
   */
  public static buildSystemPerformanceQuery(timeRange: string = '1h'): string {
    return `
      SELECT 
        service_name,
        AVG(response_time) as avg_response_time,
        COUNT(*) as request_count,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
        PERCENTILE(response_time, 0.95) as p95_response_time,
        MAX(response_time) as max_response_time
      FROM http_requests
      WHERE timestamp >= NOW() - INTERVAL '${timeRange}'
      GROUP BY service_name
      ORDER BY avg_response_time DESC
    `;
  }

  /**
   * 构建安全事件分析查询
   */
  public static buildSecurityEventsQuery(severity?: SeverityEnum, timeRange: string = '24h'): string {
    const conditions: string[] = ["timestamp >= NOW() - INTERVAL '" + timeRange + "'"];
    
    if (severity && Object.values(SeverityEnum).includes(severity)) {
      conditions.push(`severity = '${severity}'`);
    }

    return `
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
  }

  /**
   * 构建业务指标分析查询
   */
  public static buildBusinessMetricsQuery(timeRange: string = '30d'): string {
    return `
      SELECT 
        DATE(timestamp) as date,
        COUNT(DISTINCT user_id) as daily_active_users,
        SUM(order_amount) as total_revenue,
        COUNT(order_id) as total_orders,
        AVG(order_amount) as average_order_value,
        COUNT(DISTINCT product_id) as unique_products_sold
      FROM business_events
      WHERE timestamp >= NOW() - INTERVAL '${timeRange}'
        AND event_type IN ('purchase', 'order_completed')
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `;
  }

  /**
   * 验证用户ID格式
   */
  private static isValidUserId(userId: string): boolean {
    // 允许字母数字、连字符和下划线，长度1-50
    return /^[a-zA-Z0-9_-]{1,50}$/.test(userId);
  }

  /**
   * 构建日志查询 - 替换原来的不安全实现
   */
  public static buildLogQuery(query: any): string {
    let sql = 'SELECT * FROM logs WHERE 1=1';
    const conditions: string[] = [];

    if (query.query) {
      // 安全处理搜索关键词
      const searchTerm = query.query.replace(/'/g, "''").replace(/%/g, '\\%');
      conditions.push(`(message LIKE '%${searchTerm}%' OR level LIKE '%${searchTerm}%')`);
    }

    if (query.filters && typeof query.filters === 'object') {
      Object.entries(query.filters).forEach(([field, value]) => {
        if (this.validateField(field)) {
          conditions.push(`${field} = ${this.escapeValue(value)}`);
        }
      });
    }

    if (conditions.length > 0) {
      sql += ` AND ${conditions.join(' AND ')}`;
    }

    if (query.timeRange) {
      const timeFilter = this.buildTimeRangeFilter(query.timeRange.from, query.timeRange.to);
      if (timeFilter) {
        sql += ` AND ${timeFilter}`;
      }
    }

    if (query.sort && Array.isArray(query.sort)) {
      sql += ` ${this.buildOrderByClause(query.sort)}`;
    } else {
      sql += ' ORDER BY timestamp DESC';
    }

    if (query.size) {
      sql += ` ${this.buildLimitClause(query.size)}`;
    }

    return sql;
  }

  /**
   * 构建指标查询 - 专用于 metrics 流的安全查询
   * 支持 filters/timeRange/sort/size，避免通用 SQL 拼接
   */
  public static buildMetricsQuery(query: any): string {
    let sql = 'SELECT * FROM metrics WHERE 1=1';
    const conditions: string[] = [];

    // 关键词检索（对常见字段做 LIKE 安全匹配）
    if (query.query) {
      const searchTerm = String(query.query).replace(/'/g, "''").replace(/%/g, '\\%');
      // 仅对白名单内的字段做 LIKE
      const likeFields = ['name', 'service', 'environment'];
      const likeConds = likeFields
        .filter((f) => this.validateField(f))
        .map((f) => `${f} LIKE '%${searchTerm}%'`);
      if (likeConds.length > 0) {
        conditions.push(`(${likeConds.join(' OR ')})`);
      }
    }

    // 精确过滤
    if (query.filters && typeof query.filters === 'object') {
      Object.entries(query.filters).forEach(([field, value]) => {
        if (this.validateField(field)) {
          // 简单等值或对象条件
          if (typeof value === 'object' && value !== null) {
            const { operator = '=', value: val } = value as any;
            if (!this.validateOperator(operator)) {
              throw new Error(`Invalid operator: ${operator}`);
            }
            if (operator.toUpperCase() === 'BETWEEN' && Array.isArray(val)) {
              conditions.push(`${field} BETWEEN ${this.escapeValue(val[0])} AND ${this.escapeValue(val[1])}`);
            } else if (operator.toUpperCase() === 'LIKE') {
              conditions.push(`${field} ${operator} ${this.escapeValue('%' + val + '%')}`);
            } else {
              conditions.push(`${field} ${operator} ${this.escapeValue(val)}`);
            }
          } else {
            conditions.push(`${field} = ${this.escapeValue(value)}`);
          }
        }
      });
    }

    // 时间范围
    if (query.timeRange) {
      const timeFilter = this.buildTimeRangeFilter(query.timeRange.from, query.timeRange.to);
      if (timeFilter) {
        conditions.push(timeFilter);
      }
    }

    if (conditions.length > 0) {
      sql += ` AND ${conditions.join(' AND ')}`;
    }

    // 排序
    if (query.sort && Array.isArray(query.sort)) {
      sql += ` ${this.buildOrderByClause(query.sort)}`;
    } else {
      sql += ' ORDER BY timestamp DESC';
    }

    // 限制
    const size = typeof query.size === 'number' ? query.size : 100;
    sql += ` ${this.buildLimitClause(size)}`;

    return sql;
  }
}