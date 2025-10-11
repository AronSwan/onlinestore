import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { MonitoringService } from './monitoring.service';
import { MetricsService } from './metrics.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

/**
 * 监控控制器
 * 提供监控指标和健康检查的API端点
 */
@ApiTags('monitoring')
@Controller('api/monitoring')
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: '健康检查' })
  @ApiResponse({ status: 200, description: '健康状态' })
  async healthCheck(@Res() res: Response) {
    const health = await this.monitoringService.healthCheck();

    // 根据健康状态设置HTTP状态码
    let statusCode = HttpStatus.OK;
    if (health.status === 'degraded') {
      statusCode = HttpStatus.OK; // 200，但状态为degraded
    } else if (health.status === 'critical') {
      statusCode = HttpStatus.SERVICE_UNAVAILABLE; // 503
    }

    res.status(statusCode).json(health);
  }

  @Get('metrics')
  @ApiOperation({ summary: '获取当前指标' })
  @ApiResponse({ status: 200, description: '当前指标数据' })
  getMetrics() {
    return this.monitoringService.getMetrics();
  }

  @Get('metrics/summary')
  @ApiOperation({ summary: '获取指标摘要' })
  @ApiResponse({ status: 200, description: '指标摘要数据' })
  getMetricsSummary() {
    return this.metricsService.getMetricsSummary();
  }

  @Get('metrics/category')
  @ApiOperation({ summary: '按类别获取指标' })
  @ApiQuery({
    name: 'category',
    enum: ['http', 'database', 'cache', 'connections'],
    required: true,
  })
  @ApiResponse({ status: 200, description: '指定类别的指标数据' })
  getMetricsByCategory(@Query('category') category: 'http' | 'database' | 'cache' | 'connections') {
    return this.metricsService.getMetricsByCategory(category);
  }

  @Get('metrics/history')
  @ApiOperation({ summary: '获取历史指标' })
  @ApiQuery({ name: 'period', enum: ['hour', 'day', 'week'], required: false })
  @ApiResponse({ status: 200, description: '历史指标数据' })
  async getMetricsHistory(@Query('period') period: 'hour' | 'day' | 'week' = 'day') {
    return this.monitoringService.getMetricsHistory(period);
  }

  @Get('performance/report')
  @ApiOperation({ summary: '生成性能报告' })
  @ApiResponse({ status: 200, description: '性能报告数据' })
  async generatePerformanceReport() {
    return this.monitoringService.generatePerformanceReport();
  }

  @Get('application/status')
  @ApiOperation({ summary: '获取应用状态' })
  @ApiResponse({ status: 200, description: '应用状态数据' })
  getApplicationStatus() {
    return this.monitoringService.getApplicationStatus();
  }

  @Get('system/info')
  @ApiOperation({ summary: '获取系统信息' })
  @ApiResponse({ status: 200, description: '系统信息数据' })
  getSystemInfo() {
    const metrics = this.monitoringService.getMetrics();
    return metrics.systemInfo;
  }

  @Get('audit/logs')
  @ApiOperation({ summary: '获取审计日志' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'eventType', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: '审计日志数据' })
  getAuditLogs(@Query() filter: any) {
    return this.monitoringService.getAuditLogs(filter);
  }

  @Get('security/events')
  @ApiOperation({ summary: '获取安全事件' })
  @ApiQuery({ name: 'eventType', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: '安全事件数据' })
  getSecurityEvents(@Query() filter: any) {
    return this.monitoringService.getSecurityEvents(filter);
  }

  @Get('prometheus')
  @ApiOperation({ summary: '获取Prometheus格式的指标' })
  @ApiResponse({ status: 200, description: 'Prometheus格式的指标数据' })
  getPrometheusMetrics(@Res() res?: Response) {
    const metrics = this.metricsService.getMetrics();

    // 转换为Prometheus格式
    let prometheusMetrics = '';

    // HTTP请求总数
    prometheusMetrics += `# HELP http_requests_total Total number of HTTP requests\n`;
    prometheusMetrics += `# TYPE http_requests_total counter\n`;
    prometheusMetrics += `http_requests_total ${metrics.httpRequests.total}\n\n`;

    // HTTP请求错误数
    prometheusMetrics += `# HELP http_requests_errors_total Total number of HTTP errors\n`;
    prometheusMetrics += `# TYPE http_requests_errors_total counter\n`;
    prometheusMetrics += `http_requests_errors_total ${metrics.httpRequestErrors.total}\n\n`;

    // 平均响应时间
    prometheusMetrics += `# HELP http_request_duration_avg Average HTTP request duration in milliseconds\n`;
    prometheusMetrics += `# TYPE http_request_duration_avg gauge\n`;
    prometheusMetrics += `http_request_duration_avg ${metrics.derived.httpRequestDurationAvg}\n\n`;

    // 错误率
    prometheusMetrics += `# HELP http_request_error_rate HTTP request error rate in percentage\n`;
    prometheusMetrics += `# TYPE http_request_error_rate gauge\n`;
    prometheusMetrics += `http_request_error_rate ${metrics.derived.errorRate}\n\n`;

    // 数据库查询总数
    prometheusMetrics += `# HELP database_queries_total Total number of database queries\n`;
    prometheusMetrics += `# TYPE database_queries_total counter\n`;
    prometheusMetrics += `database_queries_total ${metrics.databaseQueries.total}\n\n`;

    // 平均数据库查询时间
    prometheusMetrics += `# HELP database_query_duration_avg Average database query duration in milliseconds\n`;
    prometheusMetrics += `# TYPE database_query_duration_avg gauge\n`;
    prometheusMetrics += `database_query_duration_avg ${metrics.derived.databaseQueryDurationAvg}\n\n`;

    // 缓存命中率
    prometheusMetrics += `# HELP cache_hit_rate Cache hit rate in percentage\n`;
    prometheusMetrics += `# TYPE cache_hit_rate gauge\n`;
    prometheusMetrics += `cache_hit_rate ${metrics.derived.cacheHitRate}\n\n`;

    // 活跃连接数
    prometheusMetrics += `# HELP active_connections Number of active connections\n`;
    prometheusMetrics += `# TYPE active_connections gauge\n`;
    prometheusMetrics += `active_connections ${metrics.activeConnections}\n\n`;

    if (res && typeof (res as any).send === 'function') {
      res.set?.('Content-Type', 'text/plain');
      (res as any).send(prometheusMetrics);
      return;
    }
    return prometheusMetrics;
  }
}
