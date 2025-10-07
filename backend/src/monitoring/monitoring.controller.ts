import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { ApiKeyGuard } from '../common/guards/security.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('monitoring')
@Controller('monitoring')
@UseGuards(ApiKeyGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('health')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  async getHealthStatus() {
    return this.monitoringService.healthCheck();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get current metrics' })
  @ApiResponse({ status: 200, description: 'Current metrics retrieved successfully' })
  async getCurrentMetrics() {
    return this.monitoringService.getMetrics();
  }

  @Get('metrics/history')
  @ApiOperation({ summary: 'Get metrics history' })
  @ApiQuery({ name: 'period', enum: ['hour', 'day', 'week'], required: false })
  @ApiResponse({ status: 200, description: 'Metrics history retrieved successfully' })
  async getMetricsHistory(@Query('period') period: 'hour' | 'day' | 'week' = 'day') {
    return this.monitoringService.getMetricsHistory(period);
  }

  @Get('report')
  @ApiOperation({ summary: 'Generate performance report' })
  @ApiResponse({ status: 200, description: 'Performance report generated successfully' })
  async generatePerformanceReport() {
    return this.monitoringService.generatePerformanceReport();
  }
}
