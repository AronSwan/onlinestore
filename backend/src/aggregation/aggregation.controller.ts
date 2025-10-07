import { Controller, Get, Post, Query, Param, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiDocs,
  ApiGetResource,
  ApiCreateResource,
} from '../common/decorators/api-docs.decorator';
import { AggregationService } from './aggregation.service';

@ApiTags('数据聚合')
@Controller('aggregation')
export class AggregationController {
  constructor(private readonly aggregationService: AggregationService) {}

  @Get('dashboard')
  @ApiGetResource(Object, '获取综合仪表板数据')
  async getDashboardData(@Query('timeRange') timeRange: string = '7d') {
    return await this.aggregationService.getDashboardData(timeRange);
  }

  @Get('realtime')
  @ApiGetResource(Object, '获取实时统计数据')
  async getRealTimeStats() {
    return await this.aggregationService.getRealTimeStats();
  }

  @Get('trends/:metric')
  @ApiGetResource(Object, '获取趋势分析')
  async getTrendAnalysis(
    @Param('metric') metric: string,
    @Query('timeRange') timeRange: string = '30d',
  ) {
    return await this.aggregationService.getTrendAnalysis(metric, timeRange);
  }

  @Post('reports/generate')
  @ApiCreateResource(Object, Object, '生成业务报告')
  async generateReport(
    @Body() generateReportDto: { type: 'daily' | 'weekly' | 'monthly'; date: string },
  ) {
    const date = new Date(generateReportDto.date);
    return await this.aggregationService.generateReport(generateReportDto.type, date);
  }
}
