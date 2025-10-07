import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  HttpStatus,
  HttpException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheckType,
  HealthStatus,
  SystemHealth,
  HealthCheckResult,
  HealthCheckStats,
  HealthChecker,
} from './health-check.service';
import { DependencyCheckersService, ExternalApiConfig } from './dependency-checkers.service';

// 健康检查响应DTO
export class HealthCheckResponseDto {
  status: HealthStatus;
  timestamp: Date;
  uptime: number;
  version: string;
  environment: string;
  checks?: HealthCheckResult[];
  summary?: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
    unknown: number;
  };
  system?: any;
}

// 简化的健康检查响应
export class SimpleHealthResponseDto {
  status: HealthStatus;
  timestamp: Date;
  message: string;
}

// 健康检查统计响应
export class HealthStatsResponseDto {
  checker: string;
  stats: HealthCheckStats;
}

// 添加外部API检查器请求DTO
export class AddExternalApiCheckerDto {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'HEAD';
  timeout: number;
  expectedStatus: number[];
  headers?: Record<string, string>;
  body?: string;
  critical: boolean;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly dependencyCheckersService: DependencyCheckersService,
  ) {}

  /**
   * 综合健康检查端点
   * 返回完整的系统健康状态，包括所有检查器的结果
   */
  @Get()
  @ApiOperation({
    summary: '获取系统健康状态',
    description: '返回完整的系统健康状态，包括所有健康检查器的结果和系统信息',
  })
  @ApiResponse({
    status: 200,
    description: '系统健康状态',
    type: HealthCheckResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: '系统不健康',
  })
  async getHealth(): Promise<HealthCheckResponseDto> {
    try {
      const systemHealth: SystemHealth = await this.healthCheckService.getSystemHealth();

      // 根据健康状态设置HTTP状态码
      if (systemHealth.status === HealthStatus.UNHEALTHY) {
        throw new HttpException(systemHealth, HttpStatus.SERVICE_UNAVAILABLE);
      }

      return systemHealth;
    } catch (error) {
      this.logger.error('Health check failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          status: HealthStatus.UNKNOWN,
          timestamp: new Date(),
          message: 'Health check failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 存活检查端点 (Liveness Probe)
   * 用于Kubernetes等容器编排系统检查应用是否存活
   */
  @Get('liveness')
  @ApiOperation({
    summary: '存活检查',
    description: '检查应用是否存活，用于Kubernetes liveness probe',
  })
  @ApiResponse({
    status: 200,
    description: '应用存活',
    type: SimpleHealthResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: '应用不存活',
  })
  async getLiveness(): Promise<SimpleHealthResponseDto> {
    try {
      const results = await this.healthCheckService.getHealthByType(HealthCheckType.LIVENESS);
      const isHealthy = results.every(r => r.status === HealthStatus.HEALTHY);

      const response: SimpleHealthResponseDto = {
        status: isHealthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        message: isHealthy ? 'Application is alive' : 'Application is not alive',
      };

      if (!isHealthy) {
        throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
      }

      return response;
    } catch (error) {
      this.logger.error('Liveness check failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date(),
          message: 'Liveness check failed',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * 就绪检查端点 (Readiness Probe)
   * 用于Kubernetes等容器编排系统检查应用是否就绪
   */
  @Get('readiness')
  @ApiOperation({
    summary: '就绪检查',
    description: '检查应用是否就绪，用于Kubernetes readiness probe',
  })
  @ApiResponse({
    status: 200,
    description: '应用就绪',
    type: SimpleHealthResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: '应用未就绪',
  })
  async getReadiness(): Promise<SimpleHealthResponseDto> {
    try {
      const results = await this.healthCheckService.getHealthByType(HealthCheckType.READINESS);
      const dependencyResults = await this.healthCheckService.getHealthByType(
        HealthCheckType.DEPENDENCY,
      );

      // 检查就绪状态和关键依赖
      const readinessHealthy = results.every(r => r.status === HealthStatus.HEALTHY);
      const criticalDependenciesHealthy = dependencyResults
        .filter(r => r.severity === 'critical')
        .every(r => r.status === HealthStatus.HEALTHY);

      const isReady = readinessHealthy && criticalDependenciesHealthy;

      const response: SimpleHealthResponseDto = {
        status: isReady ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        message: isReady ? 'Application is ready' : 'Application is not ready',
      };

      if (!isReady) {
        throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
      }

      return response;
    } catch (error) {
      this.logger.error('Readiness check failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date(),
          message: 'Readiness check failed',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * 启动检查端点 (Startup Probe)
   * 用于Kubernetes等容器编排系统检查应用是否启动完成
   */
  @Get('startup')
  @ApiOperation({
    summary: '启动检查',
    description: '检查应用是否启动完成，用于Kubernetes startup probe',
  })
  @ApiResponse({
    status: 200,
    description: '应用启动完成',
    type: SimpleHealthResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: '应用启动中',
  })
  async getStartup(): Promise<SimpleHealthResponseDto> {
    try {
      const results = await this.healthCheckService.getHealthByType(HealthCheckType.STARTUP);
      const isStarted = results.every(r => r.status === HealthStatus.HEALTHY);

      const response: SimpleHealthResponseDto = {
        status: isStarted ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        message: isStarted ? 'Application startup completed' : 'Application is starting',
      };

      if (!isStarted) {
        throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
      }

      return response;
    } catch (error) {
      this.logger.error('Startup check failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date(),
          message: 'Startup check failed',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * 依赖服务健康检查
   */
  @Get('dependencies')
  @ApiOperation({
    summary: '依赖服务健康检查',
    description: '检查所有依赖服务的健康状态',
  })
  @ApiResponse({
    status: 200,
    description: '依赖服务健康状态',
    type: 'array',
  })
  async getDependencies(): Promise<HealthCheckResult[]> {
    try {
      return await this.dependencyCheckersService.getDependencyStatus();
    } catch (error) {
      this.logger.error('Dependencies check failed:', error);
      throw new HttpException(
        {
          message: 'Dependencies check failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 特定类型的健康检查
   */
  @Get('type/:type')
  @ApiOperation({
    summary: '特定类型健康检查',
    description: '获取特定类型的健康检查结果',
  })
  @ApiParam({
    name: 'type',
    enum: HealthCheckType,
    description: '健康检查类型',
  })
  @ApiResponse({
    status: 200,
    description: '特定类型健康检查结果',
    type: 'array',
  })
  async getHealthByType(@Param('type') type: HealthCheckType): Promise<HealthCheckResult[]> {
    try {
      return await this.healthCheckService.getHealthByType(type);
    } catch (error) {
      this.logger.error(`Health check by type ${type} failed:`, error);
      throw new HttpException(
        {
          message: `Health check by type ${type} failed`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 执行特定健康检查器
   */
  @Post('check/:name')
  @ApiOperation({
    summary: '执行特定健康检查',
    description: '手动执行特定的健康检查器',
  })
  @ApiParam({
    name: 'name',
    description: '健康检查器名称',
  })
  @ApiResponse({
    status: 200,
    description: '健康检查结果',
    type: 'object',
  })
  async executeCheck(@Param('name') name: string): Promise<HealthCheckResult> {
    try {
      return await this.healthCheckService.executeCheck(name);
    } catch (error) {
      this.logger.error(`Execute check ${name} failed:`, error);
      throw new HttpException(
        {
          message: `Execute check ${name} failed`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取健康检查统计
   */
  @Get('stats')
  @ApiOperation({
    summary: '获取健康检查统计',
    description: '获取所有健康检查器的统计信息',
  })
  @ApiQuery({
    name: 'checker',
    required: false,
    description: '特定检查器名称（可选）',
  })
  @ApiResponse({
    status: 200,
    description: '健康检查统计',
    type: [HealthStatsResponseDto],
  })
  async getHealthStats(@Query('checker') checker?: string): Promise<HealthStatsResponseDto[]> {
    try {
      const stats = this.healthCheckService.getHealthStats(checker);

      if (checker && stats) {
        return [
          {
            checker,
            stats: stats as HealthCheckStats,
          },
        ];
      }

      if (stats instanceof Map) {
        return Array.from(stats.entries()).map(([name, stat]) => ({
          checker: name,
          stats: stat,
        }));
      }

      return [];
    } catch (error) {
      this.logger.error('Get health stats failed:', error);
      throw new HttpException(
        {
          message: 'Get health stats failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 启用/禁用健康检查器
   */
  @Post('checker/:name/:action')
  @ApiOperation({
    summary: '启用/禁用健康检查器',
    description: '启用或禁用特定的健康检查器',
  })
  @ApiParam({
    name: 'name',
    description: '健康检查器名称',
  })
  @ApiParam({
    name: 'action',
    enum: ['enable', 'disable'],
    description: '操作类型',
  })
  @ApiResponse({
    status: 200,
    description: '操作成功',
  })
  async setCheckerEnabled(
    @Param('name') name: string,
    @Param('action') action: 'enable' | 'disable',
  ): Promise<{ message: string }> {
    try {
      const enabled = action === 'enable';
      this.healthCheckService.setCheckerEnabled(name, enabled);

      return {
        message: `Health checker '${name}' ${enabled ? 'enabled' : 'disabled'} successfully`,
      };
    } catch (error) {
      this.logger.error(`Set checker ${name} ${action} failed:`, error);
      throw new HttpException(
        {
          message: `Set checker ${name} ${action} failed`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 添加外部API健康检查器
   */
  @Post('external-api')
  @ApiOperation({
    summary: '添加外部API健康检查器',
    description: '动态添加外部API健康检查器',
  })
  @ApiResponse({
    status: 201,
    description: '外部API检查器添加成功',
  })
  async addExternalApiChecker(
    @Body() config: AddExternalApiCheckerDto,
  ): Promise<{ message: string }> {
    try {
      const apiConfig: ExternalApiConfig = {
        name: config.name,
        url: config.url,
        method: config.method,
        timeout: config.timeout,
        expectedStatus: config.expectedStatus,
        headers: config.headers,
        body: config.body,
        critical: config.critical,
      };

      this.dependencyCheckersService.addExternalApiChecker(apiConfig);

      return {
        message: `External API checker '${config.name}' added successfully`,
      };
    } catch (error) {
      this.logger.error(`Add external API checker ${config.name} failed:`, error);
      throw new HttpException(
        {
          message: `Add external API checker ${config.name} failed`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 移除外部API健康检查器
   */
  @Delete('external-api/:name')
  @ApiOperation({
    summary: '移除外部API健康检查器',
    description: '移除指定的外部API健康检查器',
  })
  @ApiParam({
    name: 'name',
    description: '外部API检查器名称',
  })
  @ApiResponse({
    status: 200,
    description: '外部API检查器移除成功',
  })
  async removeExternalApiChecker(@Param('name') name: string): Promise<{ message: string }> {
    try {
      this.dependencyCheckersService.removeExternalApiChecker(name);

      return {
        message: `External API checker '${name}' removed successfully`,
      };
    } catch (error) {
      this.logger.error(`Remove external API checker ${name} failed:`, error);
      throw new HttpException(
        {
          message: `Remove external API checker ${name} failed`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 健康检查详细信息（用于调试）
   */
  @Get('debug')
  @ApiOperation({
    summary: '健康检查调试信息',
    description: '获取详细的健康检查调试信息',
  })
  @ApiResponse({
    status: 200,
    description: '健康检查调试信息',
  })
  async getDebugInfo(): Promise<any> {
    try {
      const systemHealth = await this.healthCheckService.getSystemHealth();
      const stats = this.healthCheckService.getHealthStats();

      return {
        systemHealth,
        stats: stats instanceof Map ? Object.fromEntries(stats) : stats,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Get debug info failed:', error);
      throw new HttpException(
        {
          message: 'Get debug info failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
