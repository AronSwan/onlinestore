import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import {
  SecurityMonitoringService,
  VulnerabilityStats,
  VulnerabilityTrend,
  VulnerabilitySeverity,
  VulnerabilityStatus,
} from './security-monitoring.service';

/**
 * 安全监控控制器
 * 提供安全漏洞数据的API接口
 */
@Controller('api/security')
export class SecurityMonitoringController {
  constructor(private readonly securityMonitoringService: SecurityMonitoringService) {}

  /**
   * 获取漏洞统计信息
   */
  @Get('stats')
  async getStats() {
    try {
      const stats = await this.securityMonitoringService.getVulnerabilityStats();

      if (!stats) {
        return {
          success: false,
          message: '无法获取漏洞统计数据',
        };
      }

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: '获取漏洞统计数据失败',
        error: error.message,
      };
    }
  }

  /**
   * 获取漏洞趋势数据
   */
  @Get('trend')
  async getTrend(@Query('days') days?: string) {
    try {
      const trend = await this.securityMonitoringService.getVulnerabilityTrend();

      return {
        success: true,
        data: trend,
      };
    } catch (error) {
      return {
        success: false,
        message: '获取漏洞趋势数据失败',
        error: error.message,
      };
    }
  }

  /**
   * 获取系统风险热力图数据
   */
  @Get('heatmap')
  async getHeatmap() {
    try {
      const heatmapData = await this.securityMonitoringService.getSystemRiskHeatmap();

      return {
        success: true,
        data: heatmapData,
      };
    } catch (error) {
      return {
        success: false,
        message: '获取系统风险热力图数据失败',
        error: error.message,
      };
    }
  }

  /**
   * 获取完整的漏洞数据
   */
  @Get('vulnerabilities')
  async getVulnerabilities() {
    try {
      const data = await this.securityMonitoringService.getVulnerabilityData();

      if (!data) {
        return {
          success: false,
          message: '无法获取漏洞数据',
        };
      }

      return {
        success: true,
        data: {
          metadata: data.metadata,
          vulnerabilities: data.vulnerabilities,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: '获取漏洞数据失败',
        error: error.message,
      };
    }
  }

  /**
   * 更新漏洞状态
   */
  @Get('update-status')
  async updateStatus(@Query('id') vulnerabilityId: string, @Query('status') newStatus: string) {
    try {
      if (!vulnerabilityId || !newStatus) {
        return {
          success: false,
          message: '缺少必要参数: id 和 status',
        };
      }

      // 验证状态值
      if (!Object.values(VulnerabilityStatus).includes(newStatus as VulnerabilityStatus)) {
        return {
          success: false,
          message: '无效的状态值',
        };
      }

      const success = await this.securityMonitoringService.updateVulnerabilityStatus(
        vulnerabilityId,
        newStatus as VulnerabilityStatus,
      );

      return {
        success,
        message: success ? '漏洞状态更新成功' : '漏洞状态更新失败',
      };
    } catch (error) {
      return {
        success: false,
        message: '更新漏洞状态失败',
        error: error.message,
      };
    }
  }

  /**
   * 获取安全仪表板数据（综合接口）
   */
  @Get('dashboard')
  async getDashboardData() {
    try {
      const [stats, trend, heatmap, vulnerabilities] = await Promise.all([
        this.securityMonitoringService.getVulnerabilityStats(),
        this.securityMonitoringService.getVulnerabilityTrend(),
        this.securityMonitoringService.getSystemRiskHeatmap(),
        this.securityMonitoringService.getVulnerabilityData(),
      ]);

      if (!stats || !vulnerabilities) {
        return {
          success: false,
          message: '无法获取安全数据',
        };
      }

      // 转换数据格式以匹配前端期望的结构
      const dashboardData = {
        stats: {
          critical: stats.critical,
          high: stats.high,
          medium: stats.medium,
          low: stats.low,
          total: stats.total,
          byStatus: stats.byStatus,
          recentlyUpdated: stats.recentlyUpdated,
          overdue: stats.overdue,
        },
        trend: trend || [],
        heatmap: heatmap || [],
        vulnerabilities: vulnerabilities.vulnerabilities.map(vuln => ({
          id: vuln.id,
          title: vuln.title,
          severity: this.convertSeverityToEnglish(vuln.severity),
          system: this.getSystemFromRuleId(vuln.ruleId),
          status: this.convertStatusToEnglish(vuln.status),
          date: vuln.firstFound,
          cvss: vuln.cvss,
          description: vuln.businessImpact,
          remediation: `负责人: ${vuln.owner}, 目标日期: ${vuln.targetDate}`,
          cwe: vuln.ruleId,
        })),
        lastUpdated:
          this.securityMonitoringService.getLastDataUpdate()?.toISOString() ||
          new Date().toISOString(),
      };

      return {
        success: true,
        data: dashboardData,
      };
    } catch (error) {
      return {
        success: false,
        message: '获取仪表板数据失败',
        error: error.message,
      };
    }
  }

  /**
   * 导出安全报告
   */
  @Get('export')
  async exportReport(@Res() res: Response) {
    try {
      const data = await this.securityMonitoringService.getVulnerabilityData();

      if (!data) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: '无法导出安全报告',
        });
      }

      const reportData = {
        generatedAt: new Date().toISOString(),
        metadata: data.metadata,
        vulnerabilities: data.vulnerabilities,
        summary: {
          total: data.vulnerabilities.length,
          bySeverity: {
            critical: data.vulnerabilities.filter(
              v => v.severity === VulnerabilitySeverity.CRITICAL,
            ).length,
            high: data.vulnerabilities.filter(v => v.severity === VulnerabilitySeverity.HIGH)
              .length,
            medium: data.vulnerabilities.filter(v => v.severity === VulnerabilitySeverity.MEDIUM)
              .length,
            low: data.vulnerabilities.filter(v => v.severity === VulnerabilitySeverity.LOW).length,
          },
          byStatus: this.getVulnerabilityCountByStatus(data.vulnerabilities),
        },
      };

      const filename = `security-report-${new Date().toISOString().split('T')[0]}.json`;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(HttpStatus.OK).json(reportData);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '导出安全报告失败',
        error: error.message,
      });
    }
  }

  /**
   * 健康检查
   */
  @Get('health')
  async healthCheck() {
    try {
      const isEnabled = this.securityMonitoringService.isEnabled();
      const lastUpdate = this.securityMonitoringService.getLastDataUpdate();

      return {
        success: true,
        data: {
          enabled: isEnabled,
          lastUpdate: lastUpdate?.toISOString() || null,
          status: isEnabled ? 'healthy' : 'disabled',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: '健康检查失败',
        error: error.message,
      };
    }
  }

  /**
   * 将中文严重度转换为英文
   */
  private convertSeverityToEnglish(severity: VulnerabilitySeverity): string {
    const severityMap = {
      [VulnerabilitySeverity.CRITICAL]: 'critical',
      [VulnerabilitySeverity.HIGH]: 'high',
      [VulnerabilitySeverity.MEDIUM]: 'medium',
      [VulnerabilitySeverity.LOW]: 'low',
    };
    return severityMap[severity] || 'unknown';
  }

  /**
   * 将中文状态转换为英文
   */
  private convertStatusToEnglish(status: VulnerabilityStatus): string {
    const statusMap = {
      [VulnerabilityStatus.DISCOVERED]: 'discovered',
      [VulnerabilityStatus.CONFIRMED]: 'confirmed',
      [VulnerabilityStatus.PENDING_FIX]: 'open',
      [VulnerabilityStatus.IN_PROGRESS]: 'in-progress',
      [VulnerabilityStatus.PENDING_RETEST]: 'pending-retest',
      [VulnerabilityStatus.COMPLETED]: 'resolved',
      [VulnerabilityStatus.RISK_ACCEPTED]: 'risk-accepted',
    };
    return statusMap[status] || 'unknown';
  }

  /**
   * 从规则ID获取系统名称
   */
  private getSystemFromRuleId(ruleId: string): string {
    const systemMapping: Record<string, string> = {
      'jwt-format-validation': '认证授权',
      'roles-guard': '认证授权',
      'input-validation': '支付系统',
      'input-length-validation': '支付系统',
      'password-field-exclusion': '数据安全',
      'database-indexes': '订单系统',
      'transaction-usage': '支付系统',
      'transaction-rollback': '订单系统',
    };
    return systemMapping[ruleId] || '其他系统';
  }

  /**
   * 按状态统计漏洞数量
   */
  private getVulnerabilityCountByStatus(vulnerabilities: any[]): Record<string, number> {
    const statusCount: Record<string, number> = {};

    Object.values(VulnerabilityStatus).forEach(status => {
      statusCount[this.convertStatusToEnglish(status)] = 0;
    });

    vulnerabilities.forEach(vuln => {
      const statusKey = this.convertStatusToEnglish(vuln.status);
      statusCount[statusKey]++;
    });

    return statusCount;
  }
}
