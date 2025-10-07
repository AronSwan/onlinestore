import { Injectable } from '@nestjs/common';
import { SalesAnalyticsService } from './services/sales-analytics.service';
import { UserAnalyticsService } from './services/user-analytics.service';
import { ProductAnalyticsService } from './services/product-analytics.service';
import { ReportService } from './services/report.service';

@Injectable()
export class AggregationService {
  constructor(
    private salesAnalyticsService: SalesAnalyticsService,
    private userAnalyticsService: UserAnalyticsService,
    private productAnalyticsService: ProductAnalyticsService,
    private reportService: ReportService,
  ) {}

  /**
   * 获取综合仪表板数据
   */
  async getDashboardData(timeRange: string = '7d') {
    const [salesData, userData, productData] = await Promise.all([
      this.salesAnalyticsService.getSalesOverview(timeRange),
      this.userAnalyticsService.getUserOverview(timeRange),
      this.productAnalyticsService.getProductOverview(timeRange),
    ]);

    return {
      sales: salesData,
      users: userData,
      products: productData,
      timestamp: new Date(),
    };
  }

  /**
   * 获取实时统计数据
   */
  async getRealTimeStats() {
    return {
      onlineUsers: await this.userAnalyticsService.getOnlineUserCount(),
      todaySales: await this.salesAnalyticsService.getTodaySales(),
      pendingOrders: await this.salesAnalyticsService.getPendingOrderCount(),
      lowStockProducts: await this.productAnalyticsService.getLowStockProducts(),
    };
  }

  /**
   * 生成业务报告
   */
  async generateReport(type: 'daily' | 'weekly' | 'monthly', date: Date) {
    return await this.reportService.generateReport(type, date);
  }

  /**
   * 获取趋势分析
   */
  async getTrendAnalysis(metric: string, timeRange: string) {
    switch (metric) {
      case 'sales':
        return await this.salesAnalyticsService.getSalesTrend(timeRange);
      case 'users':
        return await this.userAnalyticsService.getUserGrowthTrend(timeRange);
      case 'products':
        return await this.productAnalyticsService.getProductPerformanceTrend(timeRange);
      default:
        throw new Error(`Unknown metric: ${metric}`);
    }
  }
}
