import { Controller, Get, Query } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all metrics' })
  @ApiResponse({ status: 200, description: 'All metrics retrieved successfully' })
  async getAllMetrics() {
    return this.metricsService.getMetrics();
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get metrics summary' })
  @ApiResponse({ status: 200, description: 'Metrics summary retrieved successfully' })
  async getMetricsSummary() {
    return this.metricsService.getMetricsSummary();
  }

  @Get('category')
  @ApiOperation({ summary: 'Get metrics by category' })
  @ApiQuery({
    name: 'category',
    enum: ['http', 'database', 'cache', 'connections'],
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Category metrics retrieved successfully' })
  async getMetricsByCategory(
    @Query('category') category: 'http' | 'database' | 'cache' | 'connections',
  ) {
    return this.metricsService.getMetricsByCategory(category);
  }

  @Get('reset')
  @ApiOperation({ summary: 'Reset all metrics' })
  @ApiResponse({ status: 200, description: 'All metrics reset successfully' })
  async resetMetrics() {
    this.metricsService.resetMetrics();
    return { message: 'Metrics reset successfully' };
  }
}
