import { Injectable } from '@nestjs/common';

export interface UserData {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  userRetentionRate: number;
  averageSessionDuration: number;
}

export interface UserGrowthTrend {
  date: string;
  newUsers: number;
  activeUsers: number;
  totalUsers: number;
}

@Injectable()
export class UserAnalyticsService {
  /**
   * 获取用户概览
   */
  async getUserOverview(timeRange: string): Promise<UserData> {
    // TODO: 从数据库查询真实用户数据
    const totalUsers = Math.floor(Math.random() * 10000) + 5000;
    const activeUsers = Math.floor(totalUsers * 0.3);
    const newUsers = this.generateNewUsers(timeRange);

    return {
      totalUsers,
      activeUsers,
      newUsers,
      userRetentionRate: Math.random() * 30 + 60, // 60-90%
      averageSessionDuration: Math.random() * 600 + 300, // 5-15分钟
    };
  }

  /**
   * 获取在线用户数
   */
  async getOnlineUserCount(): Promise<number> {
    // TODO: 从Redis或实时数据源获取
    return Math.floor(Math.random() * 500) + 50; // 模拟50-550在线用户
  }

  /**
   * 获取用户增长趋势
   */
  async getUserGrowthTrend(timeRange: string): Promise<UserGrowthTrend[]> {
    const days = this.getTimeRangeDays(timeRange);
    const trend: UserGrowthTrend[] = [];
    let totalUsers = Math.floor(Math.random() * 5000) + 3000;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const newUsers = Math.floor(Math.random() * 100) + 10;
      const activeUsers = Math.floor(totalUsers * (0.2 + Math.random() * 0.2));
      totalUsers += newUsers;

      trend.push({
        date: date.toISOString().split('T')[0],
        newUsers,
        activeUsers,
        totalUsers,
      });
    }

    return trend;
  }

  /**
   * 获取用户行为分析
   */
  async getUserBehaviorAnalysis(): Promise<{
    pageViews: number;
    sessionDuration: number;
    bounceRate: number;
    topPages: Array<{ page: string; views: number; duration: number }>;
  }> {
    return {
      pageViews: Math.floor(Math.random() * 50000) + 20000,
      sessionDuration: Math.random() * 600 + 300, // 5-15分钟
      bounceRate: Math.random() * 30 + 20, // 20-50%
      topPages: [
        { page: '/products', views: Math.floor(Math.random() * 5000) + 2000, duration: 180 },
        { page: '/cart', views: Math.floor(Math.random() * 3000) + 1000, duration: 120 },
        { page: '/checkout', views: Math.floor(Math.random() * 1000) + 500, duration: 300 },
        { page: '/profile', views: Math.floor(Math.random() * 2000) + 800, duration: 150 },
        { page: '/orders', views: Math.floor(Math.random() * 1500) + 600, duration: 200 },
      ],
    };
  }

  /**
   * 获取用户留存分析
   */
  async getUserRetentionAnalysis(): Promise<{
    day1: number;
    day7: number;
    day30: number;
    cohortAnalysis: Array<{
      cohort: string;
      day0: number;
      day1: number;
      day7: number;
      day30: number;
    }>;
  }> {
    return {
      day1: Math.random() * 20 + 70, // 70-90%
      day7: Math.random() * 15 + 50, // 50-65%
      day30: Math.random() * 10 + 30, // 30-40%
      cohortAnalysis: this.generateCohortData(),
    };
  }

  /**
   * 获取用户地理分布
   */
  async getUserGeographicDistribution(): Promise<Record<string, number>> {
    const totalUsers = Math.floor(Math.random() * 10000) + 5000;

    return {
      北京: Math.floor(totalUsers * 0.15),
      上海: Math.floor(totalUsers * 0.18),
      广州: Math.floor(totalUsers * 0.12),
      深圳: Math.floor(totalUsers * 0.14),
      杭州: Math.floor(totalUsers * 0.08),
      成都: Math.floor(totalUsers * 0.07),
      武汉: Math.floor(totalUsers * 0.06),
      西安: Math.floor(totalUsers * 0.05),
      其他: Math.floor(totalUsers * 0.15),
    };
  }

  /**
   * 获取用户设备分析
   */
  async getUserDeviceAnalysis(): Promise<{
    desktop: number;
    mobile: number;
    tablet: number;
    browsers: Record<string, number>;
    operatingSystems: Record<string, number>;
  }> {
    const totalSessions = Math.floor(Math.random() * 20000) + 10000;

    return {
      desktop: Math.floor(totalSessions * 0.4),
      mobile: Math.floor(totalSessions * 0.55),
      tablet: Math.floor(totalSessions * 0.05),
      browsers: {
        Chrome: Math.floor(totalSessions * 0.65),
        Safari: Math.floor(totalSessions * 0.2),
        Firefox: Math.floor(totalSessions * 0.08),
        Edge: Math.floor(totalSessions * 0.05),
        Other: Math.floor(totalSessions * 0.02),
      },
      operatingSystems: {
        Windows: Math.floor(totalSessions * 0.45),
        iOS: Math.floor(totalSessions * 0.25),
        Android: Math.floor(totalSessions * 0.2),
        macOS: Math.floor(totalSessions * 0.08),
        Other: Math.floor(totalSessions * 0.02),
      },
    };
  }

  /**
   * 生成新用户数据
   */
  private generateNewUsers(timeRange: string): number {
    const multiplier = this.getTimeRangeDays(timeRange);
    return Math.floor(Math.random() * 50 * multiplier) + 10 * multiplier;
  }

  /**
   * 生成队列分析数据
   */
  private generateCohortData() {
    const cohorts = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const cohortName = date.toISOString().substring(0, 7); // YYYY-MM

      const day0 = 100;
      const day1 = Math.random() * 20 + 70;
      const day7 = Math.random() * 15 + 50;
      const day30 = Math.random() * 10 + 30;

      cohorts.push({
        cohort: cohortName,
        day0,
        day1,
        day7,
        day30,
      });
    }

    return cohorts;
  }

  /**
   * 根据时间范围获取天数
   */
  private getTimeRangeDays(timeRange: string): number {
    switch (timeRange) {
      case '1d':
        return 1;
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
      default:
        return 7;
    }
  }
}
