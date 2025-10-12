import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { OpenObserveService } from './openobserve.service';

@Controller('openobserve')
export class OpenObserveController {
  constructor(private readonly openObserveService: OpenObserveService) {
    // 添加安全警告和弃用警告
    console.error(
      '[SECURITY WARNING] OpenObserveController contains critical security vulnerabilities (SQL injection, unsafe string interpolation). ' +
      'This controller is deprecated and will be removed in a future version. ' +
      'IMMEDIATELY migrate to OpenObserveControllerV2 for better security and features. ' +
      'See MIGRATION_GUIDE.md for detailed migration steps.'
    );
  }

  /**
   * 单一真相源查询接口
   * 统一查询所有数据流
   */
  @Get('query')
  async querySingleSourceOfTruth(
    @Query('streams') streams: string,
    @Query('query') query: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('limit') limit?: number,
  ) {
    const streamList = streams.split(',');
    return this.openObserveService.querySingleSourceOfTruth(
      streamList,
      query,
      startTime,
      endTime,
      limit,
    );
  }

  /**
   * 跨流关联查询
   * 实现真正的单一真相视图
   */
  @Get('correlation')
  async crossStreamCorrelation(
    @Query('primaryStream') primaryStream: string,
    @Query('secondaryStreams') secondaryStreams: string,
    @Query('correlationField') correlationField: string,
    @Query('timeRange') timeRange?: string,
  ) {
    const secondaryStreamList = secondaryStreams.split(',');
    return this.openObserveService.crossStreamCorrelation(
      primaryStream,
      secondaryStreamList,
      correlationField,
      timeRange,
    );
  }

  /**
   * 数据统计概览
   * 单一真相源的整体视图
   */
  @Get('statistics')
  async getDataStatistics(@Query('streams') streams?: string) {
    const streamList = streams ? streams.split(',') : undefined;
    return this.openObserveService.getDataStatistics(streamList);
  }

  /**
   * 系统健康检查
   * 单一真相源的可用性检查
   */
  @Get('health')
  async getSystemHealth() {
    return this.openObserveService.getSystemHealth();
  }

  /**
   * 数据完整性验证
   * 确保单一真相源的数据质量
   */
  @Get('integrity')
  async validateDataIntegrity(@Query('stream') stream: string) {
    return this.openObserveService.validateDataIntegrity(stream);
  }

  /**
   * 数据写入接口
   * 统一数据入口
   */
  @Post('ingest')
  async ingestData(
    @Body('stream') stream: string,
    @Body('data') data: any[],
    @Body('compression') compression?: boolean,
  ) {
    return this.openObserveService.ingestData(stream, data, compression);
  }

  /**
   * 数据清理和归档
   * 维护单一真相源的数据质量
   */
  @Post('cleanup')
  async cleanupData(@Body('stream') stream: string, @Body('retentionDays') retentionDays?: number) {
    return this.openObserveService.cleanupData(stream, retentionDays);
  }

  /**
   * 业务场景示例：用户行为分析
   * 单一真相源的实际应用
   */
  @Get('analytics/user-behavior')
  async getUserBehaviorAnalytics(
    @Query('userId') userId?: string,
    @Query('timeRange') timeRange: string = '7d',
  ) {
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
      WHERE u.timestamp >= NOW() - INTERVAL '${timeRange}'
      ${userId ? `AND u.user_id = '${userId}'` : ''}
      ORDER BY u.timestamp DESC
      LIMIT 1000
    `;

    return this.openObserveService.querySingleSourceOfTruth(
      ['user_actions', 'products', 'orders', 'user_sessions'],
      query,
      `now-${timeRange}`,
      'now',
    );
  }

  /**
   * 业务场景示例：系统性能监控
   */
  @Get('analytics/system-performance')
  async getSystemPerformanceAnalytics(@Query('timeRange') timeRange: string = '1h') {
    const query = `
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

    return this.openObserveService.querySingleSourceOfTruth(
      ['http_requests'],
      query,
      `now-${timeRange}`,
      'now',
    );
  }

  /**
   * 业务场景示例：安全事件分析
   */
  @Get('analytics/security-events')
  async getSecurityEventsAnalytics(
    @Query('severity') severity?: string,
    @Query('timeRange') timeRange: string = '24h',
  ) {
    let severityFilter = '';
    if (severity) {
      severityFilter = `AND severity = '${severity}'`;
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
      WHERE timestamp >= NOW() - INTERVAL '${timeRange}'
      ${severityFilter}
      GROUP BY event_type, severity
      ORDER BY event_count DESC
    `;

    return this.openObserveService.querySingleSourceOfTruth(
      ['security_events'],
      query,
      `now-${timeRange}`,
      'now',
    );
  }

  /**
   * 业务场景示例：业务指标聚合
   */
  @Get('analytics/business-metrics')
  async getBusinessMetricsAnalytics(@Query('timeRange') timeRange: string = '30d') {
    const query = `
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

    return this.openObserveService.querySingleSourceOfTruth(
      ['business_events'],
      query,
      `now-${timeRange}`,
      'now',
    );
  }
}