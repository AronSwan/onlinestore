import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisCacheService } from '../cache/redis-cache.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 漏洞严重度枚举
 */
export enum VulnerabilitySeverity {
  CRITICAL = '严重',
  HIGH = '高',
  MEDIUM = '中',
  LOW = '低',
}

/**
 * 漏洞状态枚举
 */
export enum VulnerabilityStatus {
  DISCOVERED = '发现',
  CONFIRMED = '确认',
  PENDING_FIX = '待修复',
  IN_PROGRESS = '进行中',
  PENDING_RETEST = '待复测',
  COMPLETED = '已完成',
  RISK_ACCEPTED = '风险接受',
}

/**
 * 漏洞数据接口
 */
export interface Vulnerability {
  id: string;
  title: string;
  ruleId: string;
  cvss: number;
  severity: VulnerabilitySeverity;
  status: VulnerabilityStatus;
  owner: string;
  firstFound: string;
  slaThreshold: string;
  escalationStatus: string;
  targetDate: string;
  relatedCommit: string;
  relatedTicket: string;
  priority: string;
  businessImpact: string;
  falsePositive: boolean;
  evidenceLinks: Array<{
    type: string;
    url: string;
    description: string;
  }>;
  entryExitCriteria: string;
}

/**
 * 漏洞数据元数据
 */
export interface VulnerabilityMetadata {
  version: string;
  lastUpdated: string;
  maintainer: string;
  effectiveDate: string;
  auditDate: string;
  codeBranch: string;
  commitHash: string;
  environment: string;
  configSnapshot: string;
}

/**
 * 漏洞数据集合
 */
export interface VulnerabilityData {
  metadata: VulnerabilityMetadata;
  workflow: Record<string, string>;
  statusDictionary: Array<{
    status: string;
    description: string;
    entryCondition: string;
    exitCondition: string;
    requiredEvidence: string;
  }>;
  vulnerabilities: Vulnerability[];
  evidenceLinkStandards: any[];
  slaAndEscalationPath: any[];
  documentReferences: any[];
  updateHistory: any[];
}

/**
 * 漏洞统计信息
 */
export interface VulnerabilityStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byStatus: Record<VulnerabilityStatus, number>;
  bySystem: Record<string, Record<VulnerabilitySeverity, number>>;
  recentlyUpdated: Vulnerability[];
  overdue: Vulnerability[];
}

/**
 * 漏洞趋势数据
 */
export interface VulnerabilityTrend {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

/**
 * 安全监控配置
 */
export interface SecurityMonitoringConfig {
  enabled: boolean;
  dataFilePath: string;
  cacheKeyPrefix: string;
  cacheTTL: number;
  refreshInterval: number;
  trendDays: number;
}

/**
 * 安全监控服务
 */
@Injectable()
export class SecurityMonitoringService {
  private readonly logger = new Logger(SecurityMonitoringService.name);
  private readonly config: SecurityMonitoringConfig;
  private vulnerabilityData: VulnerabilityData | null = null;
  private lastDataUpdate: Date | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: RedisCacheService,
  ) {
    this.config = {
      enabled: this.configService.get('SECURITY_MONITORING_ENABLED', true),
      dataFilePath: this.configService.get(
        'SECURITY_VULNERABILITIES_PATH',
        'data/security-vulnerabilities.json',
      ),
      cacheKeyPrefix: this.configService.get('SECURITY_CACHE_PREFIX', 'security:'),
      cacheTTL: this.configService.get('SECURITY_CACHE_TTL', 300), // 5分钟
      refreshInterval: this.configService.get('SECURITY_REFRESH_INTERVAL', 60), // 1分钟
      trendDays: this.configService.get('SECURITY_TREND_DAYS', 30), // 30天
    };
  }

  /**
   * 获取漏洞数据
   */
  async getVulnerabilityData(): Promise<VulnerabilityData | null> {
    try {
      // 尝试从缓存获取
      const cacheKey = `${this.config.cacheKeyPrefix}vulnerability-data`;
      const cachedData = await this.cacheService.get<string>(cacheKey);

      if (cachedData) {
        this.logger.debug('从缓存获取漏洞数据');
        return JSON.parse(cachedData);
      }

      // 从文件读取
      const filePath = path.join(process.cwd(), this.config.dataFilePath);

      if (!fs.existsSync(filePath)) {
        this.logger.warn(`漏洞数据文件不存在: ${filePath}`);
        return null;
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data: VulnerabilityData = JSON.parse(fileContent);

      // 缓存数据
      await this.cacheService.set(cacheKey, JSON.stringify(data), { ttl: this.config.cacheTTL });

      this.vulnerabilityData = data;
      this.lastDataUpdate = new Date();

      this.logger.log(`成功加载漏洞数据，共 ${data.vulnerabilities.length} 个漏洞`);
      return data;
    } catch (error) {
      this.logger.error('获取漏洞数据失败', error);
      return null;
    }
  }

  /**
   * 获取漏洞统计信息
   */
  async getVulnerabilityStats(): Promise<VulnerabilityStats | null> {
    try {
      const data = await this.getVulnerabilityData();

      if (!data) {
        return null;
      }

      const stats: VulnerabilityStats = {
        total: data.vulnerabilities.length,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        byStatus: {} as Record<VulnerabilityStatus, number>,
        bySystem: {},
        recentlyUpdated: [],
        overdue: [],
      };

      // 初始化状态统计
      Object.values(VulnerabilityStatus).forEach(status => {
        stats.byStatus[status] = 0;
      });

      const now = new Date();
      const recentDays = 7; // 最近7天
      const recentDate = new Date(now.getTime() - recentDays * 24 * 60 * 60 * 1000);

      data.vulnerabilities.forEach(vuln => {
        // 按严重度统计
        switch (vuln.severity) {
          case VulnerabilitySeverity.CRITICAL:
            stats.critical++;
            break;
          case VulnerabilitySeverity.HIGH:
            stats.high++;
            break;
          case VulnerabilitySeverity.MEDIUM:
            stats.medium++;
            break;
          case VulnerabilitySeverity.LOW:
            stats.low++;
            break;
        }

        // 按状态统计
        stats.byStatus[vuln.status]++;

        // 按系统统计（从规则ID推断系统）
        const system = this.getSystemFromRuleId(vuln.ruleId);
        if (!stats.bySystem[system]) {
          stats.bySystem[system] = {
            [VulnerabilitySeverity.CRITICAL]: 0,
            [VulnerabilitySeverity.HIGH]: 0,
            [VulnerabilitySeverity.MEDIUM]: 0,
            [VulnerabilitySeverity.LOW]: 0,
          };
        }
        stats.bySystem[system][vuln.severity]++;

        // 最近更新的漏洞
        const firstFoundDate = new Date(vuln.firstFound);
        if (firstFoundDate >= recentDate) {
          stats.recentlyUpdated.push(vuln);
        }

        // 逾期漏洞
        const targetDate = new Date(vuln.targetDate);
        if (targetDate < now && vuln.status !== VulnerabilityStatus.COMPLETED) {
          stats.overdue.push(vuln);
        }
      });

      // 按发现日期排序最近更新的漏洞
      stats.recentlyUpdated.sort(
        (a, b) => new Date(b.firstFound).getTime() - new Date(a.firstFound).getTime(),
      );

      // 按目标日期排序逾期漏洞
      stats.overdue.sort(
        (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
      );

      return stats;
    } catch (error) {
      this.logger.error('获取漏洞统计信息失败', error);
      return null;
    }
  }

  /**
   * 获取漏洞趋势数据
   */
  async getVulnerabilityTrend(): Promise<VulnerabilityTrend[]> {
    try {
      const data = await this.getVulnerabilityData();

      if (!data) {
        return [];
      }

      const trends: VulnerabilityTrend[] = [];
      const now = new Date();

      // 生成过去30天的趋势数据
      for (let i = this.config.trendDays - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];

        // 统计该日期发现的漏洞
        const dayVulnerabilities = data.vulnerabilities.filter(vuln => vuln.firstFound === dateStr);

        const trend: VulnerabilityTrend = {
          date: dateStr,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          total: dayVulnerabilities.length,
        };

        dayVulnerabilities.forEach(vuln => {
          switch (vuln.severity) {
            case VulnerabilitySeverity.CRITICAL:
              trend.critical++;
              break;
            case VulnerabilitySeverity.HIGH:
              trend.high++;
              break;
            case VulnerabilitySeverity.MEDIUM:
              trend.medium++;
              break;
            case VulnerabilitySeverity.LOW:
              trend.low++;
              break;
          }
        });

        trends.push(trend);
      }

      return trends;
    } catch (error) {
      this.logger.error('获取漏洞趋势数据失败', error);
      return [];
    }
  }

  /**
   * 获取系统风险热力图数据
   */
  async getSystemRiskHeatmap(): Promise<
    Array<{ system: string; severity: VulnerabilitySeverity; count: number }>
  > {
    try {
      const stats = await this.getVulnerabilityStats();

      if (!stats) {
        return [];
      }

      const heatmapData: Array<{ system: string; severity: VulnerabilitySeverity; count: number }> =
        [];

      Object.entries(stats.bySystem).forEach(([system, severities]) => {
        Object.entries(severities).forEach(([severity, count]) => {
          if (count > 0) {
            heatmapData.push({
              system,
              severity: severity as VulnerabilitySeverity,
              count,
            });
          }
        });
      });

      return heatmapData;
    } catch (error) {
      this.logger.error('获取系统风险热力图数据失败', error);
      return [];
    }
  }

  /**
   * 更新漏洞状态
   */
  async updateVulnerabilityStatus(
    vulnerabilityId: string,
    newStatus: VulnerabilityStatus,
  ): Promise<boolean> {
    try {
      const data = await this.getVulnerabilityData();

      if (!data) {
        return false;
      }

      const vulnerability = data.vulnerabilities.find(v => v.id === vulnerabilityId);

      if (!vulnerability) {
        this.logger.warn(`未找到漏洞: ${vulnerabilityId}`);
        return false;
      }

      // 更新状态
      vulnerability.status = newStatus;

      // 更新文件
      const filePath = path.join(process.cwd(), this.config.dataFilePath);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

      // 清除缓存
      const cacheKey = `${this.config.cacheKeyPrefix}vulnerability-data`;
      await this.cacheService.delete(cacheKey);

      this.logger.log(`漏洞 ${vulnerabilityId} 状态已更新为: ${newStatus}`);
      return true;
    } catch (error) {
      this.logger.error(`更新漏洞状态失败: ${vulnerabilityId}`, error);
      return false;
    }
  }

  /**
   * 定时刷新数据
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async refreshData(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      await this.getVulnerabilityData();
    } catch (error) {
      this.logger.error('定时刷新漏洞数据失败', error);
    }
  }

  /**
   * 从规则ID推断系统名称
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
   * 获取最后更新时间
   */
  getLastDataUpdate(): Date | null {
    return this.lastDataUpdate;
  }

  /**
   * 检查服务是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}
