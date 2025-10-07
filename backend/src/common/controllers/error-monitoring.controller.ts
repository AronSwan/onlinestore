import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ErrorReporterService } from '../services/error-reporter.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../auth/enums/role.enum';

/**
 * 错误监控控制器
 * 提供错误统计、趋势分析和监控数据的API接口
 */
@ApiTags('错误监控')
@Controller('api/monitoring/errors')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ErrorMonitoringController {
  constructor(private readonly errorReporter: ErrorReporterService) {}

  /**
   * 获取错误统计信息
   */
  @Get('stats')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '获取错误统计信息' })
  @ApiResponse({
    status: 200,
    description: '错误统计信息',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            totalErrors: { type: 'number', description: '总错误数' },
            uniqueErrors: { type: 'number', description: '唯一错误数' },
            criticalErrors: { type: 'number', description: '严重错误数' },
            recentErrors: { type: 'number', description: '最近错误数' },
            errorsByCategory: {
              type: 'object',
              additionalProperties: { type: 'number' },
              description: '按分类统计的错误数',
            },
            topErrors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  errorCode: { type: 'string' },
                  category: { type: 'string' },
                  count: { type: 'number' },
                  affectedUsers: { type: 'number' },
                  affectedEndpoints: { type: 'number' },
                  lastOccurrence: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
  })
  async getErrorStats() {
    const stats = this.errorReporter.getErrorStats();
    const report = this.errorReporter.getDetailedReport();

    // 按分类统计错误
    const errorsByCategory = new Map<string, number>();
    stats.forEach(stat => {
      const current = errorsByCategory.get(stat.category) || 0;
      errorsByCategory.set(stat.category, current + stat.count);
    });

    return {
      success: true,
      data: {
        ...report.summary,
        errorsByCategory: Object.fromEntries(errorsByCategory),
        topErrors: report.topErrors,
      },
    };
  }

  /**
   * 获取错误趋势
   */
  @Get('trends')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '获取错误趋势' })
  @ApiQuery({
    name: 'timeWindow',
    required: false,
    description: '时间窗口（秒），默认3600（1小时）',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: '错误趋势信息',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            timeWindow: { type: 'string' },
            errorCount: { type: 'number' },
            uniqueErrors: { type: 'number' },
            affectedEndpoints: { type: 'number' },
            topErrors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  errorCode: { type: 'string' },
                  count: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  })
  async getErrorTrends(@Query('timeWindow') timeWindow?: number) {
    const windowMs = timeWindow ? timeWindow * 1000 : 3600000; // 默认1小时
    const trend = this.errorReporter.getErrorTrend(windowMs);

    return {
      success: true,
      data: trend,
    };
  }

  /**
   * 获取详细错误报告
   */
  @Get('report')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '获取详细错误报告' })
  @ApiResponse({
    status: 200,
    description: '详细错误报告',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            summary: {
              type: 'object',
              properties: {
                totalErrors: { type: 'number' },
                uniqueErrors: { type: 'number' },
                criticalErrors: { type: 'number' },
                recentErrors: { type: 'number' },
              },
            },
            topErrors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  errorCode: { type: 'string' },
                  category: { type: 'string' },
                  count: { type: 'number' },
                  affectedUsers: { type: 'number' },
                  affectedEndpoints: { type: 'number' },
                  lastOccurrence: { type: 'string', format: 'date-time' },
                },
              },
            },
            trends: {
              type: 'object',
              properties: {
                last1Hour: { type: 'object' },
                last24Hours: { type: 'object' },
              },
            },
          },
        },
      },
    },
  })
  async getDetailedReport() {
    const report = this.errorReporter.getDetailedReport();

    return {
      success: true,
      data: report,
    };
  }

  /**
   * 获取错误健康状态
   */
  @Get('health')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '获取错误健康状态' })
  @ApiResponse({
    status: 200,
    description: '错误健康状态',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'warning', 'critical'],
              description: '健康状态',
            },
            score: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: '健康评分（0-100）',
            },
            issues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  severity: { type: 'string' },
                  message: { type: 'string' },
                  count: { type: 'number' },
                },
              },
            },
            recommendations: {
              type: 'array',
              items: { type: 'string' },
              description: '改进建议',
            },
          },
        },
      },
    },
  })
  async getErrorHealth() {
    const report = this.errorReporter.getDetailedReport();
    const trend1h = report.trends.last1Hour;
    const trend24h = report.trends.last24Hours;

    // 计算健康评分
    let score = 100;
    const issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      count: number;
    }> = [];
    const recommendations: string[] = [];

    // 检查严重错误
    if (report.summary.criticalErrors > 0) {
      const severity = report.summary.criticalErrors > 10 ? 'critical' : 'high';
      score -= report.summary.criticalErrors > 10 ? 30 : 15;
      issues.push({
        type: 'critical_errors',
        severity,
        message: '存在严重错误',
        count: report.summary.criticalErrors,
      });
      recommendations.push('立即检查并修复严重错误');
    }

    // 检查错误增长趋势
    if (trend1h.errorCount > (trend24h.errorCount / 24) * 2) {
      score -= 20;
      issues.push({
        type: 'error_spike',
        severity: 'high',
        message: '错误数量激增',
        count: trend1h.errorCount,
      });
      recommendations.push('调查最近的错误激增原因');
    }

    // 检查错误多样性
    if (trend1h.uniqueErrors > 10) {
      score -= 10;
      issues.push({
        type: 'error_diversity',
        severity: 'medium',
        message: '错误类型过多',
        count: trend1h.uniqueErrors,
      });
      recommendations.push('分析并归类错误类型，找出共同原因');
    }

    // 检查影响范围
    if (trend1h.affectedEndpoints > 5) {
      score -= 15;
      issues.push({
        type: 'wide_impact',
        severity: 'medium',
        message: '错误影响范围广泛',
        count: trend1h.affectedEndpoints,
      });
      recommendations.push('检查基础设施和共享组件');
    }

    // 确定健康状态
    let status: 'healthy' | 'warning' | 'critical';
    if (score >= 80) {
      status = 'healthy';
    } else if (score >= 60) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    // 添加通用建议
    if (status !== 'healthy') {
      recommendations.push('增强错误监控和告警机制');
      recommendations.push('建立错误处理最佳实践');
    }

    return {
      success: true,
      data: {
        status,
        score: Math.max(0, score),
        issues,
        recommendations,
      },
    };
  }

  /**
   * 清理错误历史数据
   */
  @Get('cleanup')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '清理错误历史数据' })
  @ApiQuery({
    name: 'olderThan',
    required: false,
    description: '清理多少秒前的数据，默认86400（24小时）',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: '清理结果',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async cleanupErrorData(@Query('olderThan') olderThan?: number) {
    const olderThanMs = olderThan ? olderThan * 1000 : 86400000; // 默认24小时
    this.errorReporter.cleanup(olderThanMs);

    return {
      success: true,
      message: `已清理${olderThanMs / 1000}秒前的错误数据`,
    };
  }
}
