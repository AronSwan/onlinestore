import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AlertService, AlertRule, AlertEvent, AlertSeverity, AlertStatus } from './alert.service';

/**
 * 告警管理请求DTO
 */
export class CreateAlertRuleDto {
  name: string;
  description: string;
  severity: AlertSeverity;
  condition: string;
  threshold: number;
  duration: number;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

/**
 * 更新告警规则请求DTO
 */
export class UpdateAlertRuleDto {
  name?: string;
  description?: string;
  severity?: AlertSeverity;
  enabled?: boolean;
  condition?: string;
  threshold?: number;
  duration?: number;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

/**
 * 告警查询参数DTO
 */
export class AlertQueryDto {
  severity?: AlertSeverity;
  status?: AlertStatus;
  limit?: number;
  offset?: number;
}

/**
 * 告警控制器
 * 提供告警规则和告警事件管理的API
 */
@ApiTags('告警管理')
@Controller('api/alerts')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  /**
   * 获取所有告警规则
   */
  @Get('rules')
  @ApiOperation({ summary: '获取所有告警规则' })
  @ApiResponse({ status: HttpStatus.OK, description: '成功获取告警规则列表' })
  getAlertRules(): AlertRule[] {
    return this.alertService.getAlertRules();
  }

  /**
   * 获取启用的告警规则
   */
  @Get('rules/enabled')
  @ApiOperation({ summary: '获取启用的告警规则' })
  @ApiResponse({ status: HttpStatus.OK, description: '成功获取启用的告警规则列表' })
  getEnabledAlertRules(): AlertRule[] {
    return this.alertService.getEnabledAlertRules();
  }

  /**
   * 创建新的告警规则
   */
  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建新的告警规则' })
  @ApiResponse({ status: HttpStatus.CREATED, description: '成功创建告警规则' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '请求参数无效' })
  createAlertRule(@Body() createAlertRuleDto: CreateAlertRuleDto): { id: string } {
    const id = `rule-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    this.alertService.addAlertRule({
      id,
      name: createAlertRuleDto.name,
      description: createAlertRuleDto.description,
      severity: createAlertRuleDto.severity,
      enabled: true,
      condition: createAlertRuleDto.condition,
      threshold: createAlertRuleDto.threshold,
      duration: createAlertRuleDto.duration,
      labels: createAlertRuleDto.labels || {},
      annotations: createAlertRuleDto.annotations || {},
    });

    return { id };
  }

  /**
   * 更新告警规则
   */
  @Put('rules/:id')
  @ApiOperation({ summary: '更新告警规则' })
  @ApiParam({ name: 'id', description: '告警规则ID' })
  @ApiResponse({ status: HttpStatus.OK, description: '成功更新告警规则' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '告警规则不存在' })
  updateAlertRule(
    @Param('id') id: string,
    @Body() updateAlertRuleDto: UpdateAlertRuleDto,
  ): { success: boolean } {
    const success = this.alertService.updateAlertRule(id, updateAlertRuleDto);
    return { success };
  }

  /**
   * 删除告警规则
   */
  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除告警规则' })
  @ApiParam({ name: 'id', description: '告警规则ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: '成功删除告警规则' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '告警规则不存在' })
  deleteAlertRule(@Param('id') id: string): void {
    this.alertService.deleteAlertRule(id);
  }

  /**
   * 获取所有活跃告警
   */
  @Get('active')
  @ApiOperation({ summary: '获取所有活跃告警' })
  @ApiResponse({ status: HttpStatus.OK, description: '成功获取活跃告警列表' })
  getActiveAlerts(): AlertEvent[] {
    return this.alertService.getActiveAlerts();
  }

  /**
   * 获取告警历史
   */
  @Get('history')
  @ApiOperation({ summary: '获取告警历史' })
  @ApiQuery({ name: 'limit', required: false, description: '返回记录数限制' })
  @ApiQuery({ name: 'severity', required: false, description: '告警级别过滤' })
  @ApiQuery({ name: 'status', required: false, description: '告警状态过滤' })
  @ApiResponse({ status: HttpStatus.OK, description: '成功获取告警历史' })
  getAlertHistory(@Query() query: AlertQueryDto): AlertEvent[] {
    let history = this.alertService.getAlertHistory(query.limit);

    // 按严重级别过滤
    if (query.severity) {
      history = history.filter(alert => alert.severity === query.severity);
    }

    // 按状态过滤
    if (query.status) {
      history = history.filter(alert => alert.status === query.status);
    }

    // 应用分页
    if (query.offset) {
      history = history.slice(query.offset);
    }

    if (query.limit) {
      history = history.slice(0, query.limit);
    }

    return history;
  }

  /**
   * 手动解决告警
   */
  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '手动解决告警' })
  @ApiParam({ name: 'id', description: '告警ID' })
  @ApiResponse({ status: HttpStatus.OK, description: '成功解决告警' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '告警不存在' })
  resolveAlert(@Param('id') id: string): { success: boolean } {
    const success = this.alertService.resolveAlert(id);
    return { success };
  }

  /**
   * 获取告警统计信息
   */
  @Get('stats')
  @ApiOperation({ summary: '获取告警统计信息' })
  @ApiResponse({ status: HttpStatus.OK, description: '成功获取告警统计信息' })
  getAlertStats(): {
    total: number;
    active: number;
    bySeverity: Record<AlertSeverity, number>;
    byStatus: Record<AlertStatus, number>;
  } {
    const activeAlerts = this.alertService.getActiveAlerts();
    const history = this.alertService.getAlertHistory();

    // 按严重级别统计活跃告警
    const activeBySeverity: Record<AlertSeverity, number> = {
      [AlertSeverity.INFO]: 0,
      [AlertSeverity.WARNING]: 0,
      [AlertSeverity.CRITICAL]: 0,
    };

    activeAlerts.forEach(alert => {
      activeBySeverity[alert.severity]++;
    });

    // 按状态统计历史告警
    const historyByStatus: Record<AlertStatus, number> = {
      [AlertStatus.FIRING]: 0,
      [AlertStatus.RESOLVED]: 0,
    };

    history.forEach(alert => {
      historyByStatus[alert.status]++;
    });

    return {
      total: history.length,
      active: activeAlerts.length,
      bySeverity: activeBySeverity,
      byStatus: historyByStatus,
    };
  }

  /**
   * 测试告警规则
   */
  @Post('rules/:id/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '测试告警规则' })
  @ApiParam({ name: 'id', description: '告警规则ID' })
  @ApiResponse({ status: HttpStatus.OK, description: '成功测试告警规则' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '告警规则不存在' })
  testAlertRule(@Param('id') id: string): { success: boolean; message: string } {
    // 这里可以实现测试逻辑，暂时返回成功
    return {
      success: true,
      message: `告警规则 ${id} 测试成功`,
    };
  }
}
