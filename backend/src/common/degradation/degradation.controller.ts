import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DegradationService } from './degradation.service';

/**
 * 降级控制器
 */
@ApiTags('degradation')
@Controller('degradation')
export class DegradationController {
  constructor(private readonly degradationService: DegradationService) {}

  /**
   * 获取降级状态
   */
  @Get('status')
  @ApiOperation({ summary: '获取降级状态' })
  @ApiResponse({ status: 200, description: '降级状态信息' })
  async getStatus() {
    return await this.degradationService.getStatus();
  }

  /**
   * 启用降级
   */
  @Post('enable/:service')
  @ApiOperation({ summary: '启用服务降级' })
  @ApiParam({ name: 'service', description: '服务名称' })
  @ApiResponse({ status: 200, description: '降级启用成功' })
  async enableDegradation(@Param('service') service: string) {
    return await this.degradationService.enableDegradation(service);
  }

  /**
   * 禁用降级
   */
  @Delete('disable/:service')
  @ApiOperation({ summary: '禁用服务降级' })
  @ApiParam({ name: 'service', description: '服务名称' })
  @ApiResponse({ status: 200, description: '降级禁用成功' })
  async disableDegradation(@Param('service') service: string) {
    return await this.degradationService.disableDegradation(service);
  }

  /**
   * 获取降级配置
   */
  @Get('config')
  @ApiOperation({ summary: '获取降级配置' })
  @ApiResponse({ status: 200, description: '降级配置信息' })
  async getConfig() {
    return await this.degradationService.getConfig();
  }

  /**
   * 更新降级配置
   */
  @Put('config')
  @ApiOperation({ summary: '更新降级配置' })
  @ApiResponse({ status: 200, description: '配置更新成功' })
  async updateConfig(@Body() config: any) {
    return await this.degradationService.updateConfig(config);
  }
}
